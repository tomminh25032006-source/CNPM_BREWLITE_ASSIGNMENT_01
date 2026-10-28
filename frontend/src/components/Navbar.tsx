'use client';

import { Award, Coffee, LogOut, Menu, ShoppingBag, User as UserIcon, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type MouseEvent } from 'react';
import { useMounted } from '@/lib/hooks';
import { useAuth } from '@/store/auth';
import { useAuthModal } from '@/store/authModal';
import { selectCount, useCart } from '@/store/cart';

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-amber-800 to-amber-950 shadow-md transition duration-200 group-hover:scale-105">
        <Coffee className="size-5 text-amber-200" />
      </span>
      <span>
        <span className="block text-xl font-black leading-none tracking-tight text-stone-900">
          Brew<span className="text-amber-700">Lite</span>
        </span>
        <span className="hidden whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider text-stone-500 sm:block">Specialty Coffee</span>
      </span>
    </span>
  );
}

const linkBase =
  'relative cursor-pointer py-1 text-sm font-semibold transition-colors duration-200 hover:text-amber-800 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:bg-amber-800 after:content-[""]';
const linkClass = (active: boolean) =>
  `${linkBase} ${active ? 'font-bold text-amber-800 after:w-full' : 'text-stone-600 after:w-0 after:transition-all after:duration-200 hover:after:w-full'}`;

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const mounted = useMounted();
  const count = useCart(selectCount);
  const { user, token, logout } = useAuth();
  const openAuth = useAuthModal((s) => s.open);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuInView, setMenuInView] = useState(false);
  const loggedIn = mounted && !!token;

  // Trên trang chủ: gạch chân "Thực đơn" khi phần thực đơn đã cuộn tới đầu màn hình
  useEffect(() => {
    if (pathname !== '/') return setMenuInView(false);
    const update = () => {
      const menu = document.getElementById('menu-section');
      setMenuInView(!!menu && menu.getBoundingClientRect().top <= 120); // 120px = header sticky + khoảng đệm
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, [pathname]);

  useEffect(() => setMobileOpen(false), [pathname]);

  const goTop = (e: MouseEvent) => {
    e.preventDefault();
    setMobileOpen(false);
    if (pathname === '/') window.scrollTo({ top: 0, behavior: 'smooth' });
    else router.push('/');
  };
  const goMenu = (e: MouseEvent) => {
    e.preventDefault();
    setMobileOpen(false);
    if (pathname === '/') document.getElementById('menu-section')?.scrollIntoView({ behavior: 'smooth' });
    else router.push('/#menu-section');
  };

  const links = [
    { label: 'Trang chủ', href: '/', onClick: goTop, active: pathname === '/' && !menuInView },
    { label: 'Thực đơn', href: '/#menu-section', onClick: goMenu, active: pathname === '/' && menuInView },
    { label: 'Lịch sử đơn', href: '/orders', active: pathname.startsWith('/orders') },
    ...(loggedIn && user?.role === 'STAFF' ? [{ label: 'Quầy pha chế', href: '/staff', active: pathname.startsWith('/staff') }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-white/90 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" onClick={goTop} className="group" aria-label="BrewLite – Trang chủ">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Điều hướng chính">
          {links.map((l) => (
            <Link key={l.label} href={l.href} onClick={l.onClick} className={linkClass(l.active)}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {loggedIn && user ? (
            <div className="flex items-center gap-1 rounded-xl border border-amber-200/80 bg-amber-50/80 py-1.5 pl-2.5 pr-1.5 sm:gap-2 sm:pl-3 sm:pr-2">
              <div className="flex flex-col text-right">
                <span className="hidden max-w-[120px] truncate text-xs font-bold text-stone-900 sm:block">{user.fullName}</span>
                <span className="flex items-center justify-end gap-1 text-[10px] font-semibold text-amber-800" title="Điểm thưởng">
                  <Award className="size-3 text-amber-600" />
                  {user.loyaltyPoints} điểm
                </span>
              </div>
              <button
                onClick={() => {
                  logout();
                  router.push('/');
                }}
                title="Đăng xuất"
                aria-label="Đăng xuất"
                className="rounded-lg p-1.5 text-stone-400 transition hover:text-red-600"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => openAuth('login')}
              className="hidden items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-200 sm:inline-flex"
            >
              <UserIcon className="size-3.5" />
              <span>Đăng nhập</span>
            </button>
          )}

          <Link
            href="/cart"
            aria-label={`Giỏ hàng, ${mounted ? count : 0} món`}
            className="relative flex items-center gap-2 rounded-xl bg-amber-800 px-3.5 py-2 text-xs font-semibold text-white shadow-md transition hover:scale-105 hover:bg-amber-900 active:scale-95"
          >
            <ShoppingBag className="size-4 text-amber-200" />
            <span className="hidden sm:inline">Giỏ hàng</span>
            {mounted && count > 0 && (
              <span className="min-w-[20px] rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[11px] font-extrabold text-white shadow-sm">
                {count}
              </span>
            )}
          </Link>

          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="rounded-lg p-2 text-stone-600 hover:text-stone-900 md:hidden"
            aria-label="Mở menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="space-y-1 border-t border-stone-200 bg-white px-4 py-3 md:hidden">
          {links.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              onClick={l.onClick ?? (() => setMobileOpen(false))}
              className={`block py-2 text-sm font-semibold ${l.active ? 'text-amber-800' : 'text-stone-700 hover:text-amber-800'}`}
            >
              {l.label}
            </Link>
          ))}
          {!loggedIn && (
            <button
              onClick={() => {
                setMobileOpen(false);
                openAuth('login');
              }}
              className="w-full border-t border-stone-100 py-2 pt-3 text-left text-sm font-semibold text-amber-800"
            >
              Đăng nhập / Đăng ký
            </button>
          )}
        </div>
      )}
    </header>
  );
}
