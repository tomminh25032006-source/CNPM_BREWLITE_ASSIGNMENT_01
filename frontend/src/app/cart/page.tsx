'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ArrowRightIcon, TrashIcon } from '@/components/icons';
import { Receipt } from '@/components/Receipt';
import { EmptyState, PageTitle, QtyStepper, Spinner } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { formatVnd, SIZE_LABEL } from '@/lib/format';
import { useMounted } from '@/lib/hooks';
import { useCouponCheck } from '@/lib/queries';
import type { CouponCheck, CouponSuggestion } from '@/lib/types';
import { useAuth } from '@/store/auth';
import { selectSubtotal, useCart } from '@/store/cart';

export default function CartPage() {
  const mounted = useMounted();
  const router = useRouter();
  const { lines, setQty, remove, couponCode } = useCart();
  const subtotal = useCart(selectSubtotal);
  const token = useAuth((s) => s.token);
  const coupon = useCouponCheck(couponCode, subtotal);

  if (!mounted) return <div className="grid min-h-[40vh] place-items-center text-muted"><Spinner className="size-6" /></div>;

  if (lines.length === 0) {
    return (
      <>
        <PageTitle eyebrow="Giỏ hàng" title="Giỏ hàng trống" />
        <EmptyState
          title="Chưa có món nào"
          description="Ghé thực đơn và chọn cho mình một ly nhé."
          action={{ label: 'Xem thực đơn', href: '/' }}
        />
      </>
    );
  }

  const discount = coupon.data?.valid ? coupon.data.discount : 0;
  const total = subtotal - discount;
  const goCheckout = () => router.push(token ? '/checkout' : '/login?next=/checkout');

  return (
    <>
      <PageTitle eyebrow="Giỏ hàng" title="Món bạn đã chọn" />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <ul className="divide-y divide-line border-y border-line">
          {lines.map((l) => (
            <li key={l.lineId} className="flex gap-4 py-5 animate-rise sm:gap-6">
              <Link href={`/products/${l.productId}`} className="arch relative h-28 w-24 shrink-0 overflow-hidden border border-line bg-print">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={l.imageUrl} alt="" className="absolute inset-0 size-full object-contain p-2.5 pt-4" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-display text-xl leading-tight">{l.name}</h2>
                    <p className="mt-1 text-sm text-ink-soft">
                      Size {l.size} · {SIZE_LABEL[l.size]}
                      {l.toppings.length > 0 && ` · ${l.toppings.map((t) => t.name).join(', ')}`}
                    </p>
                    <p className="mt-0.5 text-xs text-muted tabular-nums">{formatVnd(l.unitPrice)} / ly</p>
                  </div>
                  <p className="font-display text-lg tabular-nums">{formatVnd(l.unitPrice * l.qty)}</p>
                </div>
                <div className="mt-auto flex items-center justify-between pt-3">
                  <QtyStepper size="sm" value={l.qty} onChange={(q) => setQty(l.lineId, q)} />
                  <button onClick={() => remove(l.lineId)} className="btn-ghost h-9 px-3 text-xs" aria-label={`Xóa ${l.name}`}>
                    <TrashIcon width={16} height={16} /> Xóa
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="lg:sticky lg:top-32 lg:self-start">
          <Receipt
            title="Tạm tính"
            subtotal={subtotal}
            discount={discount}
            discountLabel={coupon.data?.valid ? coupon.data.code : undefined}
            total={total}
            footer={
              <>
                <button onClick={goCheckout} className="btn-primary w-full justify-between">
                  <span>Thanh toán</span>
                  <span className="flex items-center gap-2 font-display text-base tabular-nums">
                    {formatVnd(total)} <ArrowRightIcon width={16} height={16} />
                  </span>
                </button>
                {!token && <p className="mt-3 text-center text-xs text-muted">Bạn sẽ được yêu cầu đăng nhập trước khi thanh toán.</p>}
                <Link href="/" className="mt-3 block text-center text-sm text-ink-soft underline-offset-4 hover:underline">
                  + Thêm món khác
                </Link>
              </>
            }
          >
            <CouponBox subtotal={subtotal} check={coupon.data} checking={coupon.isFetching} />
          </Receipt>
        </aside>
      </div>
    </>
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
      <div className="mb-5 rounded-xl border border-dashed border-line px-4 py-3 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono font-semibold tracking-wider">{couponCode}</span>
          <button onClick={() => setCoupon(null)} className="text-xs text-muted underline-offset-4 hover:text-danger hover:underline">
            Bỏ mã
          </button>
        </div>
        <p className={`mt-1 text-xs ${check && !check.valid ? 'text-danger' : 'text-success'}`}>
          {checking && !check ? 'Đang kiểm tra…' : check?.message}
        </p>
      </div>
    );
  }

  return (
    <div className="mb-5">
      <form onSubmit={onSubmit} className="flex gap-2">
        <label htmlFor="coupon" className="sr-only">Mã giảm giá</label>
        <input
          id="coupon"
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          placeholder="Mã giảm giá"
          className="field h-11 font-mono text-sm uppercase tracking-wider"
          autoComplete="off"
        />
        <button type="submit" disabled={busy || !input.trim()} className="btn-outline h-11 shrink-0 px-4">
          {busy ? <Spinner /> : 'Áp dụng'}
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      {suggestions && suggestions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s.code}
              type="button"
              onClick={() => apply(s.code)}
              title={s.description}
              className="rounded-full border border-dashed border-gold/60 px-2.5 py-1 font-mono text-[0.68rem] font-semibold tracking-wider text-gold transition hover:bg-gold/10"
            >
              {s.code}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
