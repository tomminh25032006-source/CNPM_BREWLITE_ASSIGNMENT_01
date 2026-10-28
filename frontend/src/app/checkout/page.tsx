'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';
import { CreditCard, ShieldCheck, Wallet } from 'lucide-react';
import { Receipt, type ReceiptLine } from '@/components/Receipt';
import { RequireAuth } from '@/components/RequireAuth';
import { Alert, BackLink, EmptyState, ErrorState, Page, PageSpinner, PageTitle, Spinner } from '@/components/ui';
import { api, ApiError, errorMessage } from '@/lib/api';
import { formatVnd, orderCode } from '@/lib/format';
import { newIdempotencyKey } from '@/lib/hooks';
import { useCouponCheck } from '@/lib/queries';
import type { Order, PaymentMethod, PayResult, User } from '@/lib/types';
import { useAuth } from '@/store/auth';
import { selectSubtotal, useCart } from '@/store/cart';

export default function CheckoutPage() {
  return (
    <RequireAuth>
      <Suspense>
        <CheckoutRouter />
      </Suspense>
    </RequireAuth>
  );
}

/** /checkout → thanh toán giỏ hàng; /checkout?orderId=… → thanh toán lại một đơn có sẵn. */
function CheckoutRouter() {
  const orderId = Number(useSearchParams().get('orderId')) || null;
  return orderId ? <ExistingOrderCheckout orderId={orderId} /> : <CartCheckout />;
}

function CartCheckout() {
  const { lines, couponCode } = useCart();
  const subtotal = useCart(selectSubtotal);
  const coupon = useCouponCheck(couponCode, subtotal);

  if (lines.length === 0) {
    return (
      <Page>
        <EmptyState title="Giỏ hàng trống" description="Hãy chọn món trước khi thanh toán." action={{ label: 'Xem thực đơn', href: '/' }} />
      </Page>
    );
  }

  const validCoupon = coupon.data?.valid ? coupon.data : null;
  const discount = validCoupon?.discount ?? 0;
  const receiptLines: ReceiptLine[] = lines.map((l) => ({
    key: l.lineId,
    name: l.name,
    detail: [`Size ${l.size}`, ...l.toppings.map((t) => t.name)].join(' · '),
    qty: l.qty,
    amount: l.unitPrice * l.qty,
  }));

  /** Tạo đơn (idempotent theo giỏ hiện tại) – gọi lại nhiều lần vẫn chỉ ra 1 đơn. */
  const ensureOrder = async () => {
    const cart = useCart.getState();
    if (cart.pendingOrderId) return cart.pendingOrderId;
    const orderKey = cart.orderKey ?? newIdempotencyKey();
    cart.setCheckout({ orderKey });
    const order = await api<Order>('/orders', {
      method: 'POST',
      idempotencyKey: orderKey,
      body: {
        items: cart.lines.map((l) => ({
          productId: l.productId,
          size: l.size,
          toppingIds: l.toppings.map((t) => t.id),
          qty: l.qty,
        })),
        couponCode: validCoupon?.code,
      },
    });
    useCart.getState().setCheckout({ pendingOrderId: order.id });
    return order.id;
  };

  return (
    <PaymentScreen
      backHref="/cart"
      backLabel="Giỏ hàng"
      receipt={
        <Receipt
          title="Đơn hàng"
          lines={receiptLines}
          subtotal={subtotal}
          discount={discount}
          discountLabel={validCoupon?.code}
          total={subtotal - discount}
        />
      }
      total={subtotal - discount}
      resolveOrderId={ensureOrder}
      onPaid={() => useCart.getState().clear()}
      onOrderGone={() => useCart.getState().setCheckout({ pendingOrderId: null, orderKey: null })}
    />
  );
}

function ExistingOrderCheckout({ orderId }: { orderId: number }) {
  const { data: order, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => api<Order>(`/orders/${orderId}`),
  });

  if (isLoading) return <PageSpinner />;
  if (isError || !order) {
    return (
      <Page>
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      </Page>
    );
  }
  if (order.status !== 'PENDING' && order.status !== 'PAYMENT_FAILED') {
    return (
      <Page>
        <EmptyState
          title={`Đơn ${orderCode(order.id)} không cần thanh toán`}
          description="Đơn này đã được thanh toán hoặc đã hủy."
          action={{ label: 'Xem chi tiết đơn', href: `/orders/${order.id}` }}
        />
      </Page>
    );
  }

  return (
    <PaymentScreen
      backHref={`/orders/${order.id}`}
      backLabel={`Đơn ${orderCode(order.id)}`}
      receipt={
        <Receipt
          title={`Đơn ${orderCode(order.id)}`}
          lines={order.items.map((i) => ({
            key: i.id,
            name: i.productName,
            detail: [`Size ${i.size}`, ...i.toppings.map((t) => t.name)].join(' · '),
            qty: i.qty,
            amount: i.lineTotal,
          }))}
          subtotal={order.subtotal}
          discount={order.discount}
          discountLabel={order.couponCode ?? undefined}
          total={order.total}
        />
      }
      total={order.total}
      resolveOrderId={async () => order.id}
      initialFailure={order.status === 'PAYMENT_FAILED' ? (order.payments[0]?.failureReason ?? 'Lần thanh toán trước không thành công') : null}
    />
  );
}

function PaymentScreen({
  backHref,
  backLabel,
  receipt,
  total,
  resolveOrderId,
  onPaid,
  onOrderGone,
  initialFailure = null,
}: {
  backHref: string;
  backLabel: string;
  receipt: React.ReactNode;
  total: number;
  resolveOrderId: () => Promise<number>;
  onPaid?: () => void;
  onOrderGone?: () => void;
  initialFailure?: string | null;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const [method, setMethod] = useState<PaymentMethod>('WALLET');
  const [card, setCard] = useState('4242 4242 4242 4242');
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(initialFailure);

  const chooseMethod = (m: PaymentMethod) => {
    setMethod(m);
    useCart.getState().setCheckout({ paymentKey: null }); // đổi phương thức = yêu cầu thanh toán mới
  };

  const finishPaid = async (orderId: number) => {
    onPaid?.();
    qc.invalidateQueries({ queryKey: ['orders'] });
    api<User>('/auth/me').then((u) => useAuth.getState().setUser(u)).catch(() => undefined);
    router.push(`/orders/${orderId}?paid=1`);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFailure(null);
    let orderId: number | null = null;
    try {
      orderId = await resolveOrderId();
      // Giữ cùng một Idempotency-Key cho tới khi có kết quả rõ ràng → bấm lại/mất mạng không bị trừ tiền 2 lần.
      const paymentKey = useCart.getState().paymentKey ?? newIdempotencyKey();
      useCart.getState().setCheckout({ paymentKey });

      const res = await api<PayResult>('/payments', {
        method: 'POST',
        idempotencyKey: paymentKey,
        body: {
          orderId,
          method,
          cardNumber: method === 'CARD' ? card : undefined,
          simulateFailure: simulateFailure || undefined,
        },
      });
      useCart.getState().setCheckout({ paymentKey: null });

      if (res.payment.status === 'SUCCEEDED') return await finishPaid(orderId);
      setFailure(res.payment.failureReason ?? 'Thanh toán không thành công');
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 0)) useCart.getState().setCheckout({ paymentKey: null });
      if (err instanceof ApiError && err.status === 409 && orderId) {
        const order = await api<Order>(`/orders/${orderId}`).catch(() => null);
        if (order && !['PENDING', 'PAYMENT_FAILED', 'CANCELLED'].includes(order.status)) return await finishPaid(order.id);
        if (order?.status === 'CANCELLED') onOrderGone?.();
      }
      setFailure(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <BackLink href={backHref}>{backLabel}</BackLink>
      <PageTitle eyebrow="Thanh toán" title="Thanh toán không tiền mặt">
        Chọn phương thức và xác nhận – đơn sẽ chuyển sang <b>PAID</b> khi giao dịch thành công.
      </PageTitle>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <form onSubmit={submit} className="space-y-6 lg:col-span-7">
          <fieldset className="panel p-5">
            <legend className="sr-only">Phương thức thanh toán</legend>
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-stone-900">Phương thức thanh toán</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <MethodOption
                active={method === 'WALLET'}
                onSelect={() => chooseMethod('WALLET')}
                icon={<Wallet className="size-5" />}
                title="Ví điện tử"
                hint="Mô phỏng MoMo · VNPay"
              />
              <MethodOption
                active={method === 'CARD'}
                onSelect={() => chooseMethod('CARD')}
                icon={<CreditCard className="size-5" />}
                title="Thẻ ngân hàng"
                hint="Visa · Mastercard · ATM nội địa"
              />
            </div>

            {method === 'CARD' && (
              <div className="mt-5 animate-rise">
                <label htmlFor="card" className="mb-1 block text-xs font-bold text-stone-700">Số thẻ</label>
                <input
                  id="card"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  value={card}
                  onChange={(e) => {
                    setCard(formatCard(e.target.value));
                    useCart.getState().setCheckout({ paymentKey: null });
                  }}
                  className="field font-mono tracking-widest"
                  placeholder="0000 0000 0000 0000"
                  required
                  pattern="[0-9 ]{12,23}"
                />
                <p className="mt-2 text-[11px] text-stone-500">
                  Thẻ thử: <code>…4242</code> thành công · <code>…0002</code> bị từ chối · <code>…9995</code> không đủ số dư
                </p>
              </div>
            )}
          </fieldset>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-dashed border-stone-300 bg-white px-4 py-3 text-xs">
            <input
              type="checkbox"
              checked={simulateFailure}
              onChange={(e) => {
                setSimulateFailure(e.target.checked);
                useCart.getState().setCheckout({ paymentKey: null });
              }}
              className="mt-0.5 size-4 accent-amber-800"
            />
            <span>
              <span className="font-bold text-stone-800">Chế độ demo: mô phỏng thanh toán lỗi</span>
              <span className="block text-stone-500">Dùng để trình diễn trạng thái PAYMENT_FAILED và thử lại.</span>
            </span>
          </label>

          {failure && (
            <Alert>
              <p className="font-bold">Thanh toán không thành công</p>
              <p className="mt-0.5">{failure}</p>
              <p className="mt-1 opacity-80">Giỏ hàng của bạn vẫn được giữ nguyên – bạn có thể thử lại hoặc đổi phương thức.</p>
            </Alert>
          )}

          <button type="submit" disabled={busy} className="btn-primary h-13 w-full justify-between text-base shadow-brew-float">
            <span className="flex items-center gap-2">
              {busy && <Spinner />}
              {busy ? 'Đang xử lý giao dịch…' : failure ? 'Thử thanh toán lại' : 'Xác nhận trả'}
            </span>
            <span className="tabular-nums">{formatVnd(total)}</span>
          </button>
          <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-stone-400">
            <ShieldCheck className="size-3.5 shrink-0" />
            Giao dịch được bảo vệ bằng Idempotency-Key – bấm nhiều lần cũng không bị trừ tiền hai lần.
          </p>
        </form>

        <aside className="lg:col-span-5 lg:sticky lg:top-24 lg:self-start">{receipt}</aside>
      </div>
    </Page>
  );
}

function MethodOption({
  active,
  onSelect,
  icon,
  title,
  hint,
}: {
  active: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition ${
        active ? 'border-amber-700 bg-amber-50/70 ring-2 ring-amber-700/20' : 'border-stone-200 bg-white hover:border-stone-300'
      }`}
    >
      <input type="radio" name="method" checked={active} onChange={onSelect} className="sr-only" />
      <span className={`grid size-10 place-items-center rounded-xl ${active ? 'bg-amber-800 text-white' : 'bg-stone-100 text-stone-500'}`}>
        {icon}
      </span>
      <span className="flex-1">
        <span className="block text-sm font-extrabold text-stone-900">{title}</span>
        <span className="block text-[11px] text-stone-500">{hint}</span>
      </span>
      <span
        className={`size-4 rounded-full border-2 ${active ? 'border-amber-800 bg-amber-800 shadow-[inset_0_0_0_3px_white]' : 'border-stone-300'}`}
        aria-hidden
      />
    </label>
  );
}

function formatCard(raw: string) {
  return raw.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim();
}
