'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useMounted } from '@/lib/hooks';
import { useAuth } from '@/store/auth';
import { selectCount, useCart } from '@/store/cart';
import { BagIcon, StarIcon, UserIcon } from './icons';

export function Logo() {
  return (
    <Link href="/" className="group flex flex-col items-center leading-none" aria-label="BrewLite – Trang chủ">
      <span className="font-display text-[1.85rem] font-semibold italic tracking-tight text-ink">
        Brew<span className="text-accent">Lite</span>
      </span>
      <span className="mt-1 text-[0.58rem] font-semibold uppercase tracking-[0.38em] text-muted">
        Est. 2026 · Sài Gòn
      </span>
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const mounted = useMounted();
  const count = useCart(selectCount);
  const { user, token } = useAuth();
  const loggedIn = mounted && !!token;

  const nav = [
    { href: '/', label: 'Thực đơn' },
    { href: '/orders', label: 'Đơn của tôi' },
    ...(loggedIn && user?.role === 'STAFF' ? [{ href: '/staff', label: 'Quầy pha chế' }] : []),
  ];
  const isActive = (href: string) => (href === '/' ? pathname === '/' || pathname.startsWith('/products') : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/75">
      <div className="hidden border-b border-line/70 py-1.5 text-center text-[0.7rem] tracking-wide text-ink-soft sm:block">
        Mở cửa 7:00 – 22:00 mỗi ngày · Thanh toán <em className="font-display">không dùng tiền mặt</em> · Nhận nước tại quầy
      </div>
      <div className="mx-auto grid h-[72px] max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 sm:px-6">
        <nav className="hidden items-center gap-1 md:flex" aria-label="Điều hướng chính">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`relative rounded-full px-3 py-2 text-sm font-medium transition ${
                isActive(n.href) ? 'text-ink' : 'text-ink-soft hover:text-ink'
              }`}
            >
              {n.label}
              {isActive(n.href) && <span className="absolute inset-x-3 -bottom-0.5 h-px bg-accent" />}
            </Link>
          ))}
        </nav>
        <div className="md:hidden" />

        <Logo />

        <div className="flex items-center justify-end gap-1.5">
          {loggedIn ? <AccountMenu /> : (
            <Link href={`/login?next=${encodeURIComponent(pathname)}`} className="btn-ghost hidden sm:inline-flex">
              <UserIcon width={18} height={18} /> Đăng nhập
            </Link>
          )}
          <Link
            href="/cart"
            className="relative grid size-11 place-items-center rounded-full border border-line bg-card text-ink transition hover:border-ink/40"
            aria-label={`Giỏ hàng, ${mounted ? count : 0} món`}
          >
            <BagIcon />
            {mounted && count > 0 && (
              <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-accent px-1 text-[0.68rem] font-bold leading-5 text-brand-ink animate-rise">
                {count}
              </span>
            )}
          </Link>
          {!loggedIn && (
            <Link href="/login" className="grid size-11 place-items-center rounded-full text-ink-soft sm:hidden" aria-label="Đăng nhập">
              <UserIcon />
            </Link>
          )}
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-2 md:hidden" aria-label="Điều hướng chính">
        {nav.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm ${
              isActive(n.href) ? 'bg-ink text-paper' : 'text-ink-soft'
            }`}
          >
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

function AccountMenu() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const initials = (user?.fullName ?? '?').split(' ').map((w) => w[0]).slice(-2).join('').toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 items-center gap-2 rounded-full border border-line bg-card pl-1.5 pr-3 text-sm transition hover:border-ink/40"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="grid size-8 place-items-center rounded-full bg-brand font-display text-sm font-semibold text-brand-ink">
          {initials}
        </span>
        <span className="hidden items-center gap-1 tabular-nums text-gold sm:flex" title="Điểm thưởng">
          <StarIcon width={14} height={14} /> {user?.loyaltyPoints ?? 0}
        </span>
      </button>
      {open && (
        <div role="menu" className="panel absolute right-0 top-13 w-64 overflow-hidden p-1.5 shadow-xl animate-rise">
          <div className="px-3 py-3">
            <p className="font-display text-lg leading-tight">{user?.fullName}</p>
            <p className="truncate text-xs text-muted">{user?.email}</p>
            <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-gold/10 px-2.5 py-1 text-xs font-semibold text-gold">
              <StarIcon width={12} height={12} /> {user?.loyaltyPoints ?? 0} điểm tích lũy
            </p>
          </div>
          <div className="rule-double my-1" />
          <Link role="menuitem" href="/orders" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm hover:bg-paper-2">
            Lịch sử đơn hàng
          </Link>
          {user?.role === 'STAFF' && (
            <Link role="menuitem" href="/staff" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm hover:bg-paper-2">
              Quầy pha chế
            </Link>
          )}
          <button
            role="menuitem"
            onClick={() => {
              logout();
              setOpen(false);
              router.push('/');
            }}
            className="block w-full rounded-lg px-3 py-2.5 text-left text-sm text-danger hover:bg-danger-bg"
          >
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}
