'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Plus, ShoppingBag, Tag, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Receipt } from '@/components/Receipt';
import { BackLink, EmptyState, Page, PageSpinner, PageTitle, QtyStepper, Spinner } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { formatVnd, SIZE_LABEL } from '@/lib/format';
import { useMounted } from '@/lib/hooks';
import { useCouponCheck } from '@/lib/queries';
import type { CouponCheck, CouponSuggestion } from '@/lib/types';
import { useAuth } from '@/store/auth';
import { useAuthModal } from '@/store/authModal';
import { selectCount, selectSubtotal, useCart } from '@/store/cart';

export default function CartPage() {
  const mounted = useMounted();
  const router = useRouter();
  const { lines, setQty, remove, empty, couponCode } = useCart();
  const subtotal = useCart(selectSubtotal);
  const count = useCart(selectCount);
  const token = useAuth((s) => s.token);
  const openAuth = useAuthModal((s) => s.open);
  const coupon = useCouponCheck(couponCode, subtotal);

  if (!mounted) return <PageSpinner />;

  if (lines.length === 0) {
    return (
      <Page>
        <BackLink href="/">Tiếp tục chọn món</BackLink>
        <h1 className="text-3xl font-black tracking-tight text-stone-900">Giỏ hàng</h1>
        <EmptyState
          icon={ShoppingBag}
          title="Giỏ hàng đang trống"
          description="Ghé thực đơn và chọn cho mình một ly cà phê thơm ngon nhé."
          action={{ label: 'Khám phá thực đơn', href: '/' }}
        />
      </Page>
    );
  }

  const discount = coupon.data?.valid ? coupon.data.discount : 0;
  const total = subtotal - discount;
  const goCheckout = () => (token ? router.push('/checkout') : openAuth('login', '/checkout'));

  return (
    <Page>
      <BackLink href="/">Tiếp tục chọn món</BackLink>
      <PageTitle
        title={`Giỏ hàng (${count})`}
        aside={
          <button onClick={empty} className="flex items-center gap-1 text-xs font-semibold text-stone-400 transition hover:text-red-600">
            <Trash2 className="size-3.5" /> Xóa tất cả
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <ul className="space-y-4 lg:col-span-7">
          {lines.map((l) => (
            <li key={l.lineId} className="flex items-start gap-4 rounded-2xl border border-stone-200/90 bg-white p-4 shadow-sm animate-rise">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={l.imageUrl} alt="" className="size-20 shrink-0 rounded-xl border border-stone-100 object-cover" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="truncate text-sm font-extrabold text-stone-900">{l.name}</h2>
                  <button onClick={() => remove(l.lineId)} className="p-1 text-stone-300 transition hover:text-red-600" aria-label={`Xóa ${l.name}`}>
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="mt-1 flex min-w-0 items-center gap-2">
                  <span className="shrink-0 rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-bold text-stone-700">
                    Size {l.size} · {SIZE_LABEL[l.size]}
                  </span>
                  {l.toppings.length > 0 && (
                    <span className="truncate text-[11px] font-medium text-amber-800">+ {l.toppings.map((t) => t.name).join(', ')}</span>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-black text-amber-900">{formatVnd(l.unitPrice * l.qty)}</span>
                    <span className="ml-1.5 text-[11px] text-stone-400">{formatVnd(l.unitPrice)}/ly</span>
                  </div>
                  <QtyStepper size="sm" value={l.qty} onChange={(q) => setQty(l.lineId, q)} />
                </div>
              </div>
            </li>
          ))}
          <li>
            <Link
              href="/"
              className="flex items-center justify-center gap-1.5 rounded-2xl border border-dashed border-stone-300 p-3 text-xs font-bold text-stone-500 transition hover:border-amber-700 hover:text-amber-800"
            >
              <Plus className="size-4" /> Thêm sản phẩm khác
            </Link>
          </li>
        </ul>

        <aside className="lg:col-span-5 lg:sticky lg:top-24 lg:self-start">
          <Receipt
            subtotal={subtotal}
            discount={discount}
            discountLabel={coupon.data?.valid ? coupon.data.code : undefined}
            total={total}
            footer={
              <>
                <button onClick={goCheckout} className="btn-primary h-12 w-full justify-between shadow-brew-float">
                  <span>Thanh toán</span>
                  <span className="flex items-center gap-2 tabular-nums">
                    {formatVnd(total)} <ArrowRight className="size-4" />
                  </span>
                </button>
                {!token && <p className="mt-3 text-center text-[11px] text-stone-400">Bạn cần đăng nhập trước khi thanh toán.</p>}
              </>
            }
          >
            <CouponBox subtotal={subtotal} check={coupon.data} checking={coupon.isFetching} />
          </Receipt>
        </aside>
      </div>
    </Page>
  );
}

function CouponBox({ subtotal, check, checking }: { subtotal: number; check?: CouponCheck; checking: boolean }) {
  const { couponCode, setCoupon } = useCart();
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { data: suggestions } = useQuery({
    queryKey: ['promotions'],
    queryFn: () => api<CouponSuggestion[]>('/promotions'),
  });

  const apply = async (code: string) => {
    if (!code.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api<CouponCheck>(`/promotions/validate?code=${encodeURIComponent(code.trim())}&subtotal=${subtotal}`);
      if (res.valid) {
        setCoupon(res.code);
        setInput('');
      } else setError(res.message);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    apply(input);
  };

  if (couponCode) {
    return (
      <div className="mb-4 rounded-xl border border-dashed border-amber-300 bg-amber-50/60 px-3 py-2.5 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 font-mono font-bold tracking-wider text-amber-900">
            <Tag className="size-3.5" /> {couponCode}
          </span>
          <button onClick={() => setCoupon(null)} className="font-semibold text-stone-400 hover:text-red-600">
            Bỏ mã
          </button>
        </div>
        <p className={`mt-1 ${check && !check.valid ? 'text-red-600' : 'text-emerald-700'}`}>{checking && !check ? 'Đang kiểm tra…' : check?.message}</p>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <form onSubmit={onSubmit} className="flex gap-2">
        <label htmlFor="coupon" className="sr-only">Mã giảm giá</label>
        <input
          id="coupon"
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          placeholder="Nhập mã giảm giá"
          className="field h-10 font-mono text-xs uppercase tracking-wider"
          autoComplete="off"
        />
        <button type="submit" disabled={busy || !input.trim()} className="btn-outline h-10 shrink-0 px-4 text-xs">
          {busy ? <Spinner /> : 'Áp dụng'}
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {suggestions && suggestions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s.code}
              type="button"
              onClick={() => apply(s.code)}
              title={s.description}
              className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-2.5 py-1 font-mono text-[11px] font-bold tracking-wider text-amber-800 transition hover:bg-amber-100"
            >
              {s.code}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
