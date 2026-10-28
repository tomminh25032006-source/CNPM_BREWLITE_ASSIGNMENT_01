import type { ReactNode } from 'react';
import { formatVnd } from '@/lib/format';

export interface ReceiptLine {
  key: string | number;
  name: string;
  detail?: string;
  qty: number;
  amount: number;
}

/** Khối tóm tắt đơn hàng: danh sách món, tạm tính, giảm giá, tổng cộng. */
export function Receipt({
  title = 'Tóm tắt đơn hàng',
  lines,
  subtotal,
  discount = 0,
  discountLabel,
  total,
  children,
  footer,
}: {
  title?: string;
  lines?: ReceiptLine[];
  subtotal: number;
  discount?: number;
  discountLabel?: string;
  total: number;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-brew-card">
      <h2 className="mb-4 text-base font-extrabold text-stone-900">{title}</h2>

      {lines && lines.length > 0 && (
        <>
          <ul className="space-y-3 text-xs">
            {lines.map((l) => (
              <li key={l.key} className="flex gap-3">
                <span className="w-6 shrink-0 font-bold tabular-nums text-amber-800">{l.qty}×</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-stone-900">{l.name}</span>
                  {l.detail && <span className="block truncate text-[11px] text-stone-500">{l.detail}</span>}
                </span>
                <span className="font-semibold tabular-nums text-stone-700">{formatVnd(l.amount)}</span>
              </li>
            ))}
          </ul>
          <div className="my-4 border-t border-dashed border-stone-200" />
        </>
      )}

      {children}

      <dl className="space-y-2 text-xs">
        <div className="flex justify-between">
          <dt className="text-stone-500">Tạm tính</dt>
          <dd className="font-semibold tabular-nums text-stone-800">{formatVnd(subtotal)}</dd>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-emerald-700">
            <dt>Giảm giá{discountLabel ? ` (${discountLabel})` : ''}</dt>
            <dd className="font-semibold tabular-nums">−{formatVnd(discount)}</dd>
          </div>
        )}
      </dl>
      <div className="mt-4 flex items-baseline justify-between border-t border-stone-200 pt-4">
        <span className="text-sm font-bold text-stone-900">Tổng cộng</span>
        <span className="text-xl font-black tabular-nums text-amber-900">{formatVnd(total)}</span>
      </div>
      {footer && <div className="mt-5">{footer}</div>}
    </div>
  );
}
