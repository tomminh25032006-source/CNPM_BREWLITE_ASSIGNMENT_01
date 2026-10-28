import type { ReactNode } from 'react';
import { formatVnd } from '@/lib/format';

export interface ReceiptLine {
  key: string | number;
  name: string;
  detail?: string;
  qty: number;
  amount: number;
}

/** Hóa đơn giấy: mép răng cưa, chữ số căn phải, đường chấm phân cách. */
export function Receipt({
  title = 'Hóa đơn',
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
    <div className="receipt-edge bg-card px-6 py-8 shadow-[0_1px_0_var(--line),0_12px_30px_-18px_rgba(42,30,23,0.35)]">
      <div className="text-center">
        <p className="font-display text-2xl italic">BrewLite</p>
        <p className="label-caps mt-1">{title}</p>
      </div>
      <div className="my-5 border-t-2 border-dashed border-line" />

      {lines && lines.length > 0 && (
        <>
          <ul className="space-y-3 text-sm">
            {lines.map((l) => (
              <li key={l.key} className="flex gap-3">
                <span className="w-7 shrink-0 tabular-nums text-muted">{l.qty}×</span>
                <span className="min-w-0 flex-1">
                  <span className="block">{l.name}</span>
                  {l.detail && <span className="block truncate text-xs text-muted">{l.detail}</span>}
                </span>
                <span className="tabular-nums">{formatVnd(l.amount)}</span>
              </li>
            ))}
          </ul>
          <div className="my-5 border-t-2 border-dashed border-line" />
        </>
      )}

      {children}

      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-ink-soft">Tạm tính</dt>
          <dd className="tabular-nums">{formatVnd(subtotal)}</dd>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-success">
            <dt>Giảm giá{discountLabel ? ` (${discountLabel})` : ''}</dt>
            <dd className="tabular-nums">−{formatVnd(discount)}</dd>
          </div>
        )}
      </dl>
      <div className="mt-4 flex items-baseline justify-between border-t border-ink/80 pt-4">
        <span className="label-caps text-ink!">Tổng cộng</span>
        <span className="font-display text-3xl tabular-nums">{formatVnd(total)}</span>
      </div>
      {footer && <div className="mt-6">{footer}</div>}
    </div>
  );
}
