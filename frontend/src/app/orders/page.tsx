'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowRightIcon, StarIcon } from '@/components/icons';
import { RequireAuth } from '@/components/RequireAuth';
import { EmptyState, ErrorState, PageTitle, StatusBadge } from '@/components/ui';
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
    <>
      <PageTitle eyebrow="Tài khoản" title="Lịch sử đơn hàng">
        {user && (
          <p className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-sm font-semibold text-gold">
            <StarIcon width={16} height={16} /> {user.loyaltyPoints} điểm tích lũy
          </p>
        )}
      </PageTitle>

      {isError ? (
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="mx-auto max-w-3xl space-y-3" aria-hidden>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="skeleton h-24 rounded-2xl" />
          ))}
        </div>
      ) : !data?.length ? (
        <EmptyState title="Bạn chưa có đơn nào" description="Đơn đầu tiên luôn là ly ngon nhất." action={{ label: 'Đặt món ngay', href: '/' }} />
      ) : (
        <ul className="mx-auto max-w-3xl space-y-3">
          {data.map((o, i) => (
            <li key={o.id} className="animate-rise" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
              <Link
                href={`/orders/${o.id}`}
                className="panel group flex items-center gap-4 px-5 py-4 transition hover:border-ink/30 sm:gap-6"
              >
                <span className="font-display text-2xl tabular-nums">{orderCode(o.id)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">
                    {o.items.map((it) => `${it.qty}× ${it.productName}`).join(', ')}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">{formatDateTime(o.createdAt)}</span>
                </span>
                <span className="hidden sm:block">
                  <StatusBadge status={o.status} />
                </span>
                <span className="text-right">
                  <span className="block font-display text-lg tabular-nums">{formatVnd(o.total)}</span>
                  <span className="sm:hidden">
                    <StatusBadge status={o.status} />
                  </span>
                </span>
                <ArrowRightIcon width={18} height={18} className="hidden text-muted transition group-hover:translate-x-1 group-hover:text-ink sm:block" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
