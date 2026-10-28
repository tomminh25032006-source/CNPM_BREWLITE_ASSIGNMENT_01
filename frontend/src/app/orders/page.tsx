'use client';

import { useQuery } from '@tanstack/react-query';
import { Award, ChevronRight, Receipt as ReceiptIcon } from 'lucide-react';
import Link from 'next/link';
import { RequireAuth } from '@/components/RequireAuth';
import { EmptyState, ErrorState, Page, PageTitle, StatusBadge } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { formatDateTime, formatVnd, orderCode } from '@/lib/format';
import type { Order } from '@/lib/types';
import { useAuth } from '@/store/auth';

export default function OrdersPage() {
  return (
    <RequireAuth>
      <OrderHistory />
    </RequireAuth>
  );
}

function OrderHistory() {
  const user = useAuth((s) => s.user);
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['orders', 'me'],
    queryFn: () => api<Order[]>('/orders/me'),
  });

  return (
    <Page width="max-w-4xl">
      <PageTitle
        eyebrow="Tài khoản"
        title="Lịch sử đơn hàng"
        aside={
          user && (
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200/80 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-800">
              <Award className="size-4 text-amber-600" /> {user.loyaltyPoints} điểm tích lũy
            </span>
          )
        }
      >
        Theo dõi trạng thái và xem lại các đơn bạn đã đặt.
      </PageTitle>

      {isError ? (
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="space-y-3" aria-hidden>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-stone-200/70" />
          ))}
        </div>
      ) : !data?.length ? (
        <EmptyState
          icon={ReceiptIcon}
          title="Bạn chưa có đơn nào"
          description="Đơn đầu tiên luôn là ly ngon nhất."
          action={{ label: 'Đặt món ngay', href: '/' }}
        />
      ) : (
        <ul className="space-y-3">
          {data.map((o, i) => (
            <li key={o.id} className="animate-rise" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
              <Link
                href={`/orders/${o.id}`}
                className="group flex items-center gap-4 rounded-2xl border border-stone-200/90 bg-white px-5 py-4 shadow-sm transition hover:border-amber-300 hover:shadow-brew-card"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-50 text-sm font-black text-amber-900">
                  {orderCode(o.id)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-stone-900">
                    {o.items.map((it) => `${it.qty}× ${it.productName}`).join(', ')}
                  </span>
                  <span className="mt-0.5 flex items-center gap-2 text-[11px] text-stone-500">
                    {formatDateTime(o.createdAt)}
                    <span className="sm:hidden">
                      <StatusBadge status={o.status} />
                    </span>
                  </span>
                </span>
                <span className="hidden sm:block">
                  <StatusBadge status={o.status} />
                </span>
                <span className="text-sm font-black tabular-nums text-amber-900">{formatVnd(o.total)}</span>
                <ChevronRight className="hidden size-4 text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-amber-800 sm:block" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
