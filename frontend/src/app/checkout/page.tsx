'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';
import { ArrowLeftIcon, CardIcon, WalletIcon } from '@/components/icons';
import { Receipt, type ReceiptLine } from '@/components/Receipt';
import { RequireAuth } from '@/components/RequireAuth';
import { Alert, EmptyState, ErrorState, PageTitle, Spinner } from '@/components/ui';
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
    return <EmptyState title="Giỏ hàng trống" description="Hãy chọn món trước khi thanh toán." action={{ label: 'Xem thực đơn', href: '/' }} />;
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

  if (isLoading) return <div className="grid min-h-[40vh] place-items-center text-muted"><Spinner className="size-6" /></div>;
  if (isError || !order) return <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />;
  if (order.status !== 'PENDING' && order.status !== 'PAYMENT_FAILED') {
    return (
      <EmptyState
        title={`Đơn ${orderCode(order.id)} không cần thanh toán`}
        description="Đơn này đã được thanh toán hoặc đã hủy."
        action={{ label: 'Xem chi tiết đơn', href: `/orders/${order.id}` }}
      />
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
    <>
      <Link href={backHref} className="btn-ghost -ml-4 mb-2">
        <ArrowLeftIcon width={18} height={18} /> {backLabel}
      </Link>
      <PageTitle eyebrow="Thanh toán" title="Không dùng tiền mặt" />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <form onSubmit={submit} className="space-y-8 animate-rise">
          <fieldset>
            <legend className="label-caps mb-3">Phương thức</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <MethodOption
                active={method === 'WALLET'}
                onSelect={() => chooseMethod('WALLET')}
                icon={<WalletIcon />}
                title="Ví điện tử"
                hint="Mô phỏng MoMo · VNPay"
              />
              <MethodOption
                active={method === 'CARD'}
                onSelect={() => chooseMethod('CARD')}
                icon={<CardIcon />}
                title="Thẻ ngân hàng"
                hint="Visa · Mastercard · ATM nội địa"
              />
            </div>
          </fieldset>

          {method === 'CARD' && (
            <div className="animate-rise">
              <label htmlFor="card" className="label-caps mb-2 block">Số thẻ</label>
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
              <p className="mt-2 text-xs text-muted">
                Thẻ thử: <code>…4242</code> thành công · <code>…0002</code> bị từ chối · <code>…9995</code> không đủ số dư
              </p>
            </div>
          )}

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-dashed border-line px-4 py-3 text-sm">
            <input
              type="checkbox"
              checked={simulateFailure}
              onChange={(e) => {
                setSimulateFailure(e.target.checked);
                useCart.getState().setCheckout({ paymentKey: null });
              }}
              className="mt-0.5 size-4 accent-accent"
            />
            <span>
              <span className="font-medium">Chế độ demo: mô phỏng thanh toán lỗi</span>
              <span className="block text-xs text-muted">Dùng để trình diễn trạng thái PAYMENT_FAILED và thử lại.</span>
            </span>
          </label>

          {failure && (
            <Alert>
              <p className="font-semibold">Thanh toán không thành công</p>
              <p className="mt-0.5">{failure}</p>
              <p className="mt-1 opacity-80">Giỏ hàng của bạn vẫn được giữ nguyên – bạn có thể thử lại hoặc đổi phương thức.</p>
            </Alert>
          )}

          <button type="submit" disabled={busy} className="btn-primary h-14 w-full justify-between text-base">
            <span className="flex items-center gap-2">
              {busy && <Spinner />}
              {busy ? 'Đang xử lý giao dịch…' : failure ? 'Thử thanh toán lại' : 'Xác nhận trả'}
            </span>
            <span className="font-display text-lg tabular-nums">{formatVnd(total)}</span>
          </button>
          <p className="text-center text-xs text-muted">
            Giao dịch được bảo vệ bằng Idempotency-Key – bấm nhiều lần cũng không bị trừ tiền hai lần.
          </p>
        </form>

        <aside className="lg:sticky lg:top-32 lg:self-start">{receipt}</aside>
      </div>
    </>
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
      className={`flex cursor-pointer items-center gap-4 rounded-2xl border p-4 transition ${
        active ? 'border-ink bg-card shadow-[inset_0_0_0_1px_var(--ink)]' : 'border-line hover:border-ink/40'
      }`}
    >
      <input type="radio" name="method" checked={active} onChange={onSelect} className="sr-only" />
      <span className={`grid size-11 place-items-center rounded-full ${active ? 'bg-brand text-brand-ink' : 'bg-paper-2 text-ink-soft'}`}>
        {icon}
      </span>
      <span className="flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="block text-xs text-muted">{hint}</span>
      </span>
      <span className={`size-5 rounded-full border-2 ${active ? 'border-brand bg-brand shadow-[inset_0_0_0_3px_var(--card)]' : 'border-ink/30'}`} aria-hidden />
    </label>
  );
}

function formatCard(raw: string) {
  return raw.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim();
}
