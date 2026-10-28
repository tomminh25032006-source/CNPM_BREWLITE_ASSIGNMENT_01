'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { CheckIcon, StarIcon } from '@/components/icons';
import { Receipt } from '@/components/Receipt';
import { RequireAuth } from '@/components/RequireAuth';
import { Alert, EmptyState, ErrorState, Ornament, Spinner, StatusBadge } from '@/components/ui';
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
  PAID: 'Mời bạn tới quầy – barista sẽ pha ngay cho bạn.',
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

  if (isLoading) return <div className="grid min-h-[40vh] place-items-center text-muted"><Spinner className="size-6" /></div>;
  if (isError || !order) {
    if (error instanceof ApiError && error.status === 404) {
      return <EmptyState title="Không tìm thấy đơn hàng" action={{ label: 'Lịch sử đơn', href: '/orders' }} />;
    }
    return <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />;
  }

  const paid = ['PAID', 'PREPARING', 'READY', 'COMPLETED'].includes(order.status);
  const payment = order.payments.find((p) => p.status === 'SUCCEEDED') ?? order.payments[0];
  const unpaid = order.status === 'PENDING' || order.status === 'PAYMENT_FAILED';

  return (
    <div className="mx-auto max-w-2xl">
      <section className="relative text-center animate-rise">
        {paid ? (
          <div className="mx-auto mb-6 grid size-20 place-items-center rounded-full bg-brand text-brand-ink shadow-lg">
            <CheckIcon width={40} height={40} strokeWidth={2} />
          </div>
        ) : null}
        <p className="label-caps">{justPaid && paid ? 'Đặt hàng thành công' : 'Chi tiết đơn hàng'}</p>
        <h1 className="mt-3 font-display text-6xl font-medium tracking-tight tabular-nums sm:text-7xl">{orderCode(order.id)}</h1>
        <div className="mt-4 flex justify-center">
          <StatusBadge status={order.status} />
        </div>
        <p className="mx-auto mt-5 max-w-md font-display text-xl italic text-ink-soft">{MESSAGE[order.status]}</p>

        {paid && (
          <div
            className="animate-stamp pointer-events-none absolute -right-2 top-0 hidden size-32 place-items-center rounded-full border-4 border-double border-accent text-center text-accent opacity-85 sm:grid"
            aria-hidden
          >
            <span className="font-display text-[0.7rem] font-semibold uppercase leading-tight tracking-[0.2em]">
              Đã<br />thanh toán<br />
              <span className="text-[0.6rem] tracking-[0.1em]">{payment ? METHOD_LABEL[payment.method] : ''}</span>
            </span>
          </div>
        )}
      </section>

      {paid && order.status !== 'CANCELLED' && <Timeline status={order.status} />}

      {unpaid && (
        <div className="mt-8 space-y-4 animate-rise">
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

      {order.pointsEarned > 0 && (
        <p className="mx-auto mt-8 flex w-fit items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-2 text-sm font-semibold text-gold animate-rise">
          <StarIcon width={16} height={16} /> +{order.pointsEarned} điểm thưởng đã được cộng
        </p>
      )}

      <Ornament className="my-10" />

      <Receipt
        title={formatDateTime(order.createdAt)}
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
            <dl className="space-y-1.5 border-t-2 border-dashed border-line pt-4 text-xs text-ink-soft">
              <div className="flex justify-between">
                <dt>Phương thức</dt>
                <dd>{METHOD_LABEL[payment.method]}</dd>
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

      <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href="/" className="btn-primary">Về trang chủ</Link>
        <Link href="/orders" className="btn-outline">Lịch sử đơn hàng</Link>
      </div>
    </div>
  );
}

function Timeline({ status }: { status: OrderStatus }) {
  const current = STEPS.findIndex((s) => s.status === status);
  return (
    <ol className="mt-10 grid grid-cols-4 animate-rise" aria-label="Tiến trình đơn hàng">
      {STEPS.map((s, i) => {
        const done = i <= current;
        return (
          <li key={s.status} className="relative flex flex-col items-center text-center">
            {i > 0 && (
              <span className={`absolute right-1/2 top-[13px] h-0.5 w-full ${i <= current ? 'bg-brand' : 'bg-line'}`} aria-hidden />
            )}
            <span
              className={`relative z-10 grid size-7 place-items-center rounded-full border-2 text-xs font-bold transition ${
                done ? 'border-brand bg-brand text-brand-ink' : 'border-line bg-paper text-muted'
              } ${i === current && status !== 'COMPLETED' ? 'ring-4 ring-brand/20' : ''}`}
            >
              {done ? <CheckIcon width={14} height={14} strokeWidth={2.5} /> : i + 1}
            </span>
            <span className={`mt-2 text-xs ${done ? 'font-semibold text-ink' : 'text-muted'}`}>{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
