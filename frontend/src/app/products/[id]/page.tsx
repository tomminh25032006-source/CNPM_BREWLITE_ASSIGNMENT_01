'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeftIcon, CheckIcon } from '@/components/icons';
import { EmptyState, ErrorState, QtyStepper } from '@/components/ui';
import { api, ApiError, errorMessage } from '@/lib/api';
import { formatVnd } from '@/lib/format';
import type { ProductDetail, Size } from '@/lib/types';
import { MAX_QTY, useCart } from '@/store/cart';
import { useToast } from '@/store/toast';

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const { data: product, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['product', id],
    queryFn: () => api<ProductDetail>(`/products/${id}`),
  });

  if (isLoading) return <DetailSkeleton />;
  if (isError) {
    if (error instanceof ApiError && error.status === 404) {
      return <EmptyState title="Không tìm thấy món này" description="Món có thể đã ngừng bán." action={{ label: 'Về thực đơn', href: '/' }} />;
    }
    return <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />;
  }
  return product ? <ProductConfigurator product={product} /> : null;
}

function ProductConfigurator({ product }: { product: ProductDetail }) {
  const router = useRouter();
  const add = useCart((s) => s.add);
  const toast = useToast((s) => s.push);
  const [size, setSize] = useState<Size>('M');
  const [toppingIds, setToppingIds] = useState<number[]>([]);
  const [qty, setQty] = useState(1);

  const chosenToppings = product.toppings.filter((t) => toppingIds.includes(t.id));
  const sizeDelta = product.sizes.find((s) => s.size === size)?.priceDelta ?? 0;
  const unitPrice = product.price + sizeDelta + chosenToppings.reduce((n, t) => n + t.price, 0);
  const soldOut = product.stock <= 0;
  const maxQty = Math.min(MAX_QTY, Math.max(1, product.stock));

  const toggleTopping = (tid: number) =>
    setToppingIds((ids) => (ids.includes(tid) ? ids.filter((x) => x !== tid) : [...ids, tid]));

  const addToCart = (goToCart: boolean) => {
    add({
      productId: product.id,
      name: product.name,
      imageUrl: product.imageUrl,
      size,
      toppings: chosenToppings,
      unitPrice,
      qty,
    });
    if (goToCart) return router.push('/cart');
    toast({
      title: `Đã thêm ${qty} × ${product.name}`,
      description: [`Size ${size}`, ...chosenToppings.map((t) => t.name)].join(' · '),
      action: { label: 'Xem giỏ', href: '/cart' },
    });
  };

  return (
    <div className="animate-rise">
      <Link href="/" className="btn-ghost -ml-4 mb-6">
        <ArrowLeftIcon width={18} height={18} /> Thực đơn
      </Link>

      <div className="grid gap-10 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-14">
        <div className="md:sticky md:top-32 md:self-start">
          <div className="arch relative mx-auto aspect-[4/4.6] max-w-md overflow-hidden border border-line bg-print">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={product.imageUrl} alt={product.name} className="absolute inset-0 size-full object-contain p-10 pt-14" />
            <span className="absolute left-1/2 top-5 -translate-x-1/2 font-display text-sm italic text-[#8a7563]">
              No. {String(product.id).padStart(2, '0')}
            </span>
          </div>
        </div>

        <div>
          <p className="label-caps">{product.category}</p>
          <h1 className="mt-2 font-display text-5xl font-medium tracking-tight">{product.name}</h1>
          <p className="mt-4 text-lg leading-relaxed text-ink-soft">{product.description}</p>
          <p className="mt-5 font-display text-2xl text-accent tabular-nums">
            {formatVnd(product.price)} <span className="text-sm text-muted">· giá size S</span>
          </p>

          <div className="rule-double my-8" />

          <fieldset>
            <legend className="label-caps mb-3">Chọn size</legend>
            <div className="grid grid-cols-3 gap-3">
              {product.sizes.map((s) => {
                const active = s.size === size;
                return (
                  <label
                    key={s.size}
                    className={`relative cursor-pointer rounded-2xl border p-4 text-center transition ${
                      active ? 'border-ink bg-card shadow-[inset_0_0_0_1px_var(--ink)]' : 'border-line hover:border-ink/40'
                    }`}
                  >
                    <input type="radio" name="size" value={s.size} checked={active} onChange={() => setSize(s.size)} className="sr-only" />
                    <span className="block font-display text-3xl">{s.size}</span>
                    <span className="mt-1 block text-xs text-ink-soft">
                      {s.label} · {s.volumeMl}ml
                    </span>
                    <span className="mt-1.5 block text-xs font-semibold text-accent">
                      {s.priceDelta ? `+${formatVnd(s.priceDelta)}` : 'Giá gốc'}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="mt-8">
            <legend className="label-caps mb-3">Topping · chọn thêm</legend>
            <div className="divide-y divide-line rounded-2xl border border-line bg-card">
              {product.toppings.map((t) => {
                const on = toppingIds.includes(t.id);
                return (
                  <label key={t.id} className="flex cursor-pointer items-center gap-3 px-4 py-3.5 transition hover:bg-paper-2/60">
                    <input type="checkbox" checked={on} onChange={() => toggleTopping(t.id)} className="sr-only" />
                    <span
                      className={`grid size-5 place-items-center rounded-md border transition ${
                        on ? 'border-brand bg-brand text-brand-ink' : 'border-ink/30'
                      }`}
                      aria-hidden
                    >
                      {on && <CheckIcon width={14} height={14} strokeWidth={2.5} />}
                    </span>
                    <span className="flex-1">{t.name}</span>
                    <span className="text-sm tabular-nums text-ink-soft">+{formatVnd(t.price)}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="mt-8 flex items-center justify-between">
            <span className="label-caps">Số lượng</span>
            <div className="flex items-center gap-3">
              {product.stock <= 10 && !soldOut && <span className="text-xs text-accent">Còn {product.stock} ly</span>}
              <QtyStepper value={qty} onChange={setQty} max={maxQty} />
            </div>
          </div>

          <div className="sticky bottom-0 -mx-4 mt-8 border-t border-line bg-paper/95 px-4 py-4 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
            <div className="flex flex-col gap-3 sm:flex-row">
              <button onClick={() => addToCart(false)} disabled={soldOut} className="btn-primary flex-1 justify-between">
                <span>{soldOut ? 'Tạm hết hàng' : 'Thêm vào giỏ'}</span>
                <span className="font-display text-base tabular-nums">{formatVnd(unitPrice * qty)}</span>
              </button>
              <button onClick={() => addToCart(true)} disabled={soldOut} className="btn-outline hidden sm:inline-flex">
                Mua ngay
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid gap-10 pt-14 md:grid-cols-[5fr_6fr] md:gap-14" aria-hidden>
      <div className="arch skeleton mx-auto aspect-[4/4.6] w-full max-w-md" />
      <div className="space-y-4">
        <div className="skeleton h-3 w-20 rounded" />
        <div className="skeleton h-12 w-2/3 rounded" />
        <div className="skeleton h-4 w-full rounded" />
        <div className="skeleton h-4 w-5/6 rounded" />
        <div className="skeleton mt-8 h-28 w-full rounded-2xl" />
        <div className="skeleton h-40 w-full rounded-2xl" />
      </div>
    </div>
  );
}
