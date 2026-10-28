'use client';

import { Check } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/store/toast';

export function Toaster() {
  const { toasts, dismiss } = useToast();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-6" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-brew-float animate-rise"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-600 text-white">
            <Check className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-stone-900">{t.title}</p>
            {t.description && <p className="truncate text-xs text-stone-500">{t.description}</p>}
          </div>
          {t.action && (
            <Link href={t.action.href} onClick={() => dismiss(t.id)} className="text-xs font-bold text-amber-800 hover:underline">
              {t.action.label}
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
