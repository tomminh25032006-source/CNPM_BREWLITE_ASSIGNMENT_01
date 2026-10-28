'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { RequireAuth } from '@/components/RequireAuth';
import { Alert, ErrorState, PageTitle, Spinner } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { formatDateTime, orderCode } from '@/lib/format';
import type { Order, OrderStatus } from '@/lib/types';

/** Bảng điều phối của barista (phần mở rộng ngoài MVP) – minh họa Order State Machine. */
const COLUMNS: { status: OrderStatus; title: string; next?: { to: OrderStatus; label: string } }[] = [
  { status: 'PAID', title: 'Chờ pha', next: { to: 'PREPARING', label: 'Nhận pha' } },
  { status: 'PREPARING', title: 'Đang pha', next: { to: 'READY', label: 'Pha xong' } },
  { status: 'READY', title: 'Chờ khách nhận', next: { to: 'COMPLETED', label: 'Đã giao khách' } },
];

export default function StaffPage() {
  return (
    <RequireAuth role="STAFF">
      <StaffBoard />
    </RequireAuth>
  );
}

function StaffBoard() {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const { data, isLoading, isError, error: loadError, refetch } = useQuery({
    queryKey: ['staff-orders'],
    queryFn: () => api<Order[]>('/orders?status=PAID,PREPARING,READY'),
    refetchInterval: 4000,
  });

  const move = useMutation({
    mutationFn: ({ id, status }: { id: number; status: OrderStatus }) =>
      status === 'CANCELLED'
        ? api<Order>(`/orders/${id}/cancel`, { method: 'POST' })
        : api<Order>(`/orders/${id}/status`, { method: 'PATCH', body: { status } }),
    onMutate: () => setError(null),
    onError: (err) => setError(errorMessage(err)),
    onSettled: () => qc.invalidateQueries({ queryKey: ['staff-orders'] }),
  });

  return (
    <>
      <PageTitle eyebrow="Nhân viên" title="Quầy pha chế">
        <p className="text-sm">Đơn tự cập nhật mỗi 4 giây. Mỗi nút chỉ cho phép bước chuyển hợp lệ tiếp theo.</p>
      </PageTitle>

      {error && <div className="mx-auto mb-6 max-w-xl"><Alert>{error}</Alert></div>}

      {isError ? (
        <ErrorState message={errorMessage(loadError)} onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="grid place-items-center py-20 text-muted"><Spinner className="size-6" /></div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {COLUMNS.map((col) => {
            const orders = (data ?? []).filter((o) => o.status === col.status);
            return (
              <section key={col.status} className="rounded-2xl bg-paper-2/70 p-3">
                <header className="flex items-center justify-between px-2 pb-3 pt-1">
                  <h2 className="font-display text-xl">{col.title}</h2>
                  <span className="grid min-w-7 place-items-center rounded-full bg-card px-2 py-0.5 text-sm font-semibold tabular-nums">{orders.length}</span>
                </header>
                <div className="space-y-3">
                  {orders.length === 0 && <p className="px-2 py-6 text-center text-sm text-muted">Trống</p>}
                  {orders.map((o) => (
                    <article key={o.id} className="panel p-4 animate-rise">
                      <div className="flex items-baseline justify-between">
                        <span className="font-display text-2xl tabular-nums">{orderCode(o.id)}</span>
                        <span className="text-xs text-muted">{formatDateTime(o.createdAt).split(' ')[0]}</span>
                      </div>
                      <p className="text-xs text-ink-soft">{o.user?.fullName}</p>
                      <ul className="mt-3 space-y-1 border-t border-dashed border-line pt-3 text-sm">
                        {o.items.map((it) => (
                          <li key={it.id}>
                            <span className="font-semibold tabular-nums">{it.qty}×</span> {it.productName}{' '}
                            <span className="text-ink-soft">({it.size})</span>
                            {it.toppings.length > 0 && <span className="block pl-5 text-xs text-muted">+ {it.toppings.map((t) => t.name).join(', ')}</span>}
                          </li>
                        ))}
                      </ul>
                      {o.note && <p className="mt-2 text-xs italic text-accent">“{o.note}”</p>}
                      <div className="mt-4 flex gap-2">
                        {col.next && (
                          <button
                            onClick={() => move.mutate({ id: o.id, status: col.next!.to })}
                            disabled={move.isPending}
                            className="btn-primary h-10 flex-1 text-xs"
                          >
                            {col.next.label}
                          </button>
                        )}
                        {col.status === 'PAID' && (
                          <button
                            onClick={() => move.mutate({ id: o.id, status: 'CANCELLED' })}
                            disabled={move.isPending}
                            className="btn-outline h-10 px-4 text-xs"
                          >
                            Hủy
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
