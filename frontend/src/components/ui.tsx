'use client';

import { AlertCircle, ArrowLeft, Coffee, Minus, Plus, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { STATUS_LABEL } from '@/lib/format';
import type { OrderStatus } from '@/lib/types';

/** Khung nội dung chung cho các trang con (giỏ hàng, thanh toán, đơn hàng...). */
export function Page({ children, width = 'max-w-5xl' }: { children: ReactNode; width?: string }) {
  return <div className={`mx-auto w-full ${width} px-4 py-8`}>{children}</div>;
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="mb-2 inline-flex items-center gap-1 text-xs font-bold text-amber-800 transition hover:text-amber-900">
      <ArrowLeft className="size-3.5" />
      {children}
    </Link>
  );
}

export function PageTitle({
  eyebrow,
  title,
  children,
  aside,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col justify-between gap-4 animate-rise sm:flex-row sm:items-end">
      <div>
        {eyebrow && (
          <span className="rounded-full bg-amber-100/70 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-800">
            {eyebrow}
          </span>
        )}
        <h1 className="mt-2 text-3xl font-black tracking-tight text-stone-900">{title}</h1>
        {children && <div className="mt-1 text-sm text-stone-600">{children}</div>}
      </div>
      {aside}
    </header>
  );
}

const STATUS_STYLE: Record<OrderStatus, string> = {
  PENDING: 'border-amber-200 bg-amber-50 text-amber-800',
  PAID: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  PAYMENT_FAILED: 'border-red-200 bg-red-50 text-red-700',
  PREPARING: 'border-orange-200 bg-orange-50 text-orange-700',
  READY: 'border-sky-200 bg-sky-50 text-sky-700',
  COMPLETED: 'border-stone-200 bg-stone-100 text-stone-600',
  CANCELLED: 'border-stone-200 bg-stone-100 text-stone-400 line-through decoration-1',
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      title={status}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${STATUS_STYLE[status]}`}
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
  const btn = size === 'sm' ? 'p-1.5' : 'p-2.5';
  const icon = size === 'sm' ? 'size-3.5' : 'size-4';
  return (
    <div className={`inline-flex items-center rounded-xl border bg-white shadow-sm ${size === 'sm' ? 'border-stone-200' : 'border-stone-300'}`}>
      <button
        type="button"
        className={`${btn} text-stone-500 transition hover:text-stone-900 disabled:opacity-30`}
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label="Giảm số lượng"
      >
        <Minus className={icon} />
      </button>
      <span className={`text-center font-bold tabular-nums text-stone-900 ${size === 'sm' ? 'w-7 text-xs' : 'w-8 text-sm'}`} aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className={`${btn} text-stone-500 transition hover:text-stone-900 disabled:opacity-30`}
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label="Tăng số lượng"
      >
        <Plus className={icon} />
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

export function PageSpinner() {
  return (
    <div className="grid min-h-[40vh] place-items-center text-amber-800">
      <Spinner className="size-6" />
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Coffee,
}: {
  title: string;
  description?: string;
  action?: { label: string; href: string };
  icon?: LucideIcon;
}) {
  return (
    <div className="mx-auto my-12 max-w-md rounded-3xl border border-stone-200/80 bg-white p-12 text-center shadow-brew-card animate-rise">
      <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-amber-50 text-amber-800">
        <Icon className="size-8" />
      </div>
      <h2 className="mb-1 text-base font-extrabold text-stone-900">{title}</h2>
      {description && <p className="text-xs font-medium leading-relaxed text-stone-500">{description}</p>}
      {action && (
        <Link
          href={action.href}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-amber-800 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-amber-900"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}

export function ErrorState({ message, onRetry, title = 'Không tải được dữ liệu' }: { message: string; onRetry?: () => void; title?: string }) {
  return (
    <div role="alert" className="mx-auto my-12 max-w-md rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-800">
      <AlertCircle className="mx-auto mb-3 size-10 text-red-600" />
      <h3 className="mb-1 text-base font-bold">{title}</h3>
      <p className="text-xs text-red-700">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-700">
          Thử lại kết nối
        </button>
      )}
    </div>
  );
}

export function Alert({ tone = 'danger', children }: { tone?: 'danger' | 'success'; children: ReactNode }) {
  const style = tone === 'danger' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700';
  return (
    <div role="alert" className={`flex items-start gap-2.5 rounded-xl border p-3 text-xs ${style}`}>
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
