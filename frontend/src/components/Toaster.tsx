'use client';

import Link from 'next/link';
import { useToast } from '@/store/toast';
import { CheckIcon } from './icons';

export function Toaster() {
  const { toasts, dismiss } = useToast();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-6" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-paper shadow-xl animate-rise"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand text-brand-ink">
            <CheckIcon width={16} height={16} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{t.title}</p>
            {t.description && <p className="truncate text-xs opacity-70">{t.description}</p>}
          </div>
          {t.action && (
            <Link href={t.action.href} onClick={() => dismiss(t.id)} className="text-sm font-semibold text-gold hover:underline">
              {t.action.label}
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
