'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { STATUS_LABEL } from '@/lib/format';
import type { OrderStatus } from '@/lib/types';
import { AlertIcon, MinusIcon, PlusIcon } from './icons';

/** Hoa văn phân cách kiểu sách in cũ: ——— ✦ ——— */
export function Ornament({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 text-gold ${className}`} aria-hidden>
      <span className="h-px w-10 bg-current opacity-60" />
      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
        <path d="M7 0l1.6 5.4L14 7l-5.4 1.6L7 14l-1.6-5.4L0 7l5.4-1.6z" />
      </svg>
      <span className="h-px w-10 bg-current opacity-60" />
    </div>
  );
}

export function PageTitle({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <header className="mb-8 text-center animate-rise">
      {eyebrow && <p className="label-caps mb-3">{eyebrow}</p>}
      <h1 className="font-display text-4xl sm:text-5xl font-medium tracking-tight text-ink">{title}</h1>
      <Ornament className="mt-4" />
      {children && <div className="mx-auto mt-4 max-w-xl text-ink-soft">{children}</div>}
    </header>
  );
}

const STATUS_STYLE: Record<OrderStatus, string> = {
  PENDING: 'border-gold/50 text-gold bg-gold/10',
  PAID: 'border-success/40 text-success bg-success-bg',
  PAYMENT_FAILED: 'border-danger/40 text-danger bg-danger-bg',
  PREPARING: 'border-accent/40 text-accent bg-accent/10',
  READY: 'border-brand/50 text-brand bg-brand/10',
  COMPLETED: 'border-line text-ink-soft bg-paper-2',
  CANCELLED: 'border-line text-muted bg-paper-2 line-through decoration-1',
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      title={status}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLE[status]}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function QtyStepper({
  value,
  onChange,
  min = 1,
  max = 20,
  size = 'md',
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'md';
}) {
  const btn = size === 'sm' ? 'size-8' : 'size-11';
  return (
    <div className="inline-flex items-center rounded-full border border-line bg-card">
      <button
        type="button"
        className={`${btn} grid place-items-center rounded-full text-ink-soft hover:bg-paper-2 disabled:opacity-30`}
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label="Giảm số lượng"
      >
        <MinusIcon width={16} height={16} />
      </button>
      <span className="min-w-8 text-center font-display text-lg tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className={`${btn} grid place-items-center rounded-full text-ink-soft hover:bg-paper-2 disabled:opacity-30`}
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label="Tăng số lượng"
      >
        <PlusIcon width={16} height={16} />
      </button>
    </div>
  );
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent ${className}`}
      role="status"
      aria-label="Đang tải"
    />
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="panel mx-auto max-w-md px-8 py-14 text-center animate-rise">
      <svg viewBox="0 0 120 90" className="mx-auto mb-5 h-20 text-muted" fill="none" stroke="currentColor" strokeWidth="2">
        <ellipse cx="60" cy="80" rx="44" ry="6" opacity=".4" />
        <path d="M28 40h56v10a24 24 0 0 1-24 24h-8a24 24 0 0 1-24-24z" />
        <path d="M84 46h6a8 8 0 0 1 0 16h-8" />
        <path d="M46 16c-4 5 4 8 0 14M60 10c-4 5 4 8 0 14M74 16c-4 5 4 8 0 14" opacity=".5" />
      </svg>
      <h2 className="font-display text-2xl">{title}</h2>
      {description && <p className="mt-2 text-ink-soft">{description}</p>}
      {action && (
        <Link href={action.href} className="btn-primary mt-6">
          {action.label}
        </Link>
      )}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="mx-auto flex max-w-lg items-start gap-3 rounded-2xl border border-danger/30 bg-danger-bg p-5 text-danger">
      <AlertIcon className="mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="font-semibold">Không tải được dữ liệu</p>
        <p className="mt-1 text-sm opacity-90">{message}</p>
        {onRetry && (
          <button onClick={onRetry} className="mt-3 text-sm font-semibold underline underline-offset-4">
            Thử lại
          </button>
        )}
      </div>
    </div>
  );
}

export function Alert({ tone = 'danger', children }: { tone?: 'danger' | 'success'; children: ReactNode }) {
  const style = tone === 'danger' ? 'border-danger/30 bg-danger-bg text-danger' : 'border-success/30 bg-success-bg text-success';
  return (
    <div role="alert" className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${style}`}>
      <AlertIcon width={18} height={18} className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
