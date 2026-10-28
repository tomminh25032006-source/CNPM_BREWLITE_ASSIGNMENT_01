'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Award, Check, CheckCircle2, Clock, CoffeeIcon, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Receipt } from '@/components/Receipt';
import { RequireAuth } from '@/components/RequireAuth';
import { Alert, EmptyState, ErrorState, Page, PageSpinner, Spinner, StatusBadge } from '@/components/ui';
import { api, ApiError, errorMessage } from '@/lib/api';
import { formatDateTime, formatVnd, METHOD_LABEL, orderCode } from '@/lib/format';
import type { Order, OrderStatus } from '@/lib/types';

const ACTIVE: OrderStatus[] = ['PAID', 'PREPARING', 'READY'];
const STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'PAID', label: 'Đã thanh toán' },
  { status: 'PREPARING', label: 'Đang pha' },
  { status: 'READY', label: 'Sẵn sàng' },
  { status: 'COMPLETED', label: 'Đã nhận' },
];

const MESSAGE: Record<OrderStatus, string> = {
  PENDING: 'Đơn đang chờ thanh toán.',
  PAYMENT_FAILED: 'Thanh toán chưa thành công. Bạn có thể thử lại bất cứ lúc nào.',
  PAID: 'Mời bạn tới quầy lấy nước – barista sẽ pha ngay cho bạn.',
  PREPARING: 'Barista đang pha chế đồ uống của bạn…',
  READY: 'Đồ uống đã sẵn sàng! Mời bạn tới quầy nhận nước.',
  COMPLETED: 'Cảm ơn bạn đã ghé BrewLite. Hẹn gặp lại!',
  CANCELLED: 'Đơn hàng đã được hủy.',
};

export default function OrderPage() {
  return (
    <RequireAuth>
      <Suspense>
        <OrderDetail />
      </Suspense>
    </RequireAuth>
  );
}

function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const justPaid = useSearchParams().get('paid') === '1';
  const qc = useQueryClient();

  const { data: order, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['order', Number(id)],
    queryFn: () => api<Order>(`/orders/${id}`),
    refetchInterval: (q) => (q.state.data && ACTIVE.includes(q.state.data.status) ? 5000 : false),
  });

  const cancel = useMutation({
    mutationFn: () => api<Order>(`/orders/${id}/cancel`, { method: 'POST' }),
    onSuccess: (o) => {
      qc.setQueryData(['order', Number(id)], o);
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  if (isLoading) return <PageSpinner />;
  if (isError || !order) {
    return (
      <Page>
        {error instanceof ApiError && error.status === 404 ? (
          <EmptyState title="Không tìm thấy đơn hàng" action={{ label: 'Lịch sử đơn', href: '/orders' }} />
        ) : (
          <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
        )}
      </Page>
    );
  }

  const paid = ['PAID', 'PREPARING', 'READY', 'COMPLETED'].includes(order.status);
  const payment = order.payments.find((p) => p.status === 'SUCCEEDED') ?? order.payments[0];
  const unpaid = order.status === 'PENDING' || order.status === 'PAYMENT_FAILED';
  const HeroIcon = paid ? CheckCircle2 : order.status === 'CANCELLED' || order.status === 'PAYMENT_FAILED' ? XCircle : Clock;
  const heroTone = paid
    ? 'bg-emerald-50 text-emerald-600'
    : order.status === 'PENDING'
      ? 'bg-amber-50 text-amber-700'
      : 'bg-red-50 text-red-600';

  return (
    <Page width="max-w-2xl">
      <section className="rounded-3xl border border-stone-200/90 bg-white p-8 text-center shadow-brew-card animate-rise">
        <div className={`mx-auto mb-4 grid size-16 place-items-center rounded-2xl ${heroTone}`}>
          <HeroIcon className="size-9" />
        </div>
        <p className="text-xs font-bold uppercase tracking-wider text-stone-500">
          {justPaid && paid ? 'Đặt hàng thành công' : 'Chi tiết đơn hàng'}
        </p>
        <h1 className="mt-1 text-4xl font-black tracking-tight text-stone-900 tabular-nums">Mã đơn: {orderCode(order.id)}</h1>
        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-stone-500">
          <span>Trạng thái:</span>
          <StatusBadge status={order.status} />
        </div>
        <p className="mx-auto mt-4 max-w-md text-sm font-medium text-stone-600">{MESSAGE[order.status]}</p>

        {paid && <Timeline status={order.status} />}

        {order.pointsEarned > 0 && (
          <p className="mx-auto mt-6 flex w-fit items-center gap-1.5 rounded-xl border border-amber-200/80 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-800">
            <Award className="size-4 text-amber-600" /> +{order.pointsEarned} điểm thưởng đã được cộng
          </p>
        )}

        {unpaid && (
          <div className="mt-6 space-y-3 text-left">
            {order.status === 'PAYMENT_FAILED' && payment?.failureReason && <Alert>Lý do: {payment.failureReason}</Alert>}
            {cancel.isError && <Alert>{errorMessage(cancel.error)}</Alert>}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href={`/checkout?orderId=${order.id}`} className="btn-primary flex-1">
                Thanh toán {formatVnd(order.total)}
              </Link>
              <button onClick={() => cancel.mutate()} disabled={cancel.isPending} className="btn-outline">
                {cancel.isPending ? <Spinner /> : 'Hủy đơn'}
              </button>
            </div>
          </div>
        )}
      </section>

      <div className="mt-6 animate-rise">
        <Receipt
          title={`Đặt lúc ${formatDateTime(order.createdAt)}`}
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
          footer={
            payment && (
              <dl className="space-y-1.5 border-t border-dashed border-stone-200 pt-4 text-[11px] text-stone-500">
                <div className="flex justify-between">
                  <dt>Phương thức</dt>
                  <dd className="font-semibold text-stone-700">{METHOD_LABEL[payment.method]}</dd>
                </div>
                {payment.transactionRef && (
                  <div className="flex justify-between">
                    <dt>Mã giao dịch</dt>
                    <dd className="font-mono">{payment.transactionRef}</dd>
                  </div>
                )}
              </dl>
            )
          }
        />
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href="/" className="btn-primary">
          <CoffeeIcon className="size-4" /> Về trang chủ
        </Link>
        <Link href="/orders" className="btn-outline">Lịch sử đơn hàng</Link>
      </div>
    </Page>
  );
}

function Timeline({ status }: { status: OrderStatus }) {
  const current = STEPS.findIndex((s) => s.status === status);
  return (
    <ol className="mt-8 grid grid-cols-4" aria-label="Tiến trình đơn hàng">
      {STEPS.map((s, i) => {
        const done = i <= current;
        return (
          <li key={s.status} className="relative flex flex-col items-center text-center">
            {i > 0 && <span className={`absolute right-1/2 top-[13px] h-0.5 w-full ${done ? 'bg-amber-700' : 'bg-stone-200'}`} aria-hidden />}
            <span
              className={`relative z-10 grid size-7 place-items-center rounded-full border-2 text-xs font-bold transition ${
                done ? 'border-amber-800 bg-amber-800 text-white' : 'border-stone-200 bg-white text-stone-400'
              } ${i === current && status !== 'COMPLETED' ? 'ring-4 ring-amber-700/20' : ''}`}
            >
              {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
            </span>
            <span className={`mt-2 text-[11px] ${done ? 'font-bold text-stone-900' : 'text-stone-400'}`}>{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
