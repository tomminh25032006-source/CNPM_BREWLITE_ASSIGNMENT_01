'use client';

import { useEffect, type ReactNode } from 'react';

/** Khung popup: nền mờ, đóng bằng Esc hoặc bấm ra ngoài, khóa cuộn trang phía sau. */
export function Modal({
  onClose,
  label,
  className = '',
  children,
}: {
  onClose: () => void;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/60 p-0 backdrop-blur-sm animate-fade-in sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-stone-200 bg-white shadow-2xl animate-pop sm:rounded-3xl ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
