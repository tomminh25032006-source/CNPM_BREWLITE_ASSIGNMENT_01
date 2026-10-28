'use client';

import { useQuery } from '@tanstack/react-query';
import { Check, ShoppingBag, X } from 'lucide-react';
import { useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { formatVnd, SIZE_LABEL } from '@/lib/format';
import type { Product, ProductDetail, Size } from '@/lib/types';
import { MAX_QTY, useCart } from '@/store/cart';
import { useToast } from '@/store/toast';
import { Modal } from './Modal';
import { ErrorState, QtyStepper } from './ui';

/** Popup chi tiết món (Task 4): gọi GET /products/:id, chọn size S/M/L và topping, tính giá theo tùy chọn. */
export function ProductModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['product', String(product.id)],
    queryFn: () => api<ProductDetail>(`/products/${product.id}`),
  });

  return (
    <Modal onClose={onClose} label={product.name} className="max-w-lg">
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full bg-white/80 p-2 text-stone-600 shadow-sm backdrop-blur-md transition hover:text-stone-900"
        aria-label="Đóng"
      >
        <X className="size-5" />
      </button>

      <div className="relative h-56 w-full shrink-0 overflow-hidden bg-stone-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={product.imageUrl} alt={product.name} className="size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <div className="absolute bottom-3 left-4 text-white">
          <span className="mb-1 inline-block rounded-full bg-amber-700/80 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md">
            {product.category}
          </span>
          <h2 className="text-xl font-black drop-shadow-sm">{product.name}</h2>
        </div>
      </div>

      {isError ? (
        <div className="p-6">
          <ErrorState title="Không tải được chi tiết món" message={errorMessage(error)} onRetry={() => refetch()} />
        </div>
      ) : isLoading || !data ? (
        <div className="animate-pulse space-y-4 p-6" aria-hidden>
          <div className="h-14 rounded-xl bg-stone-100" />
          <div className="grid grid-cols-3 gap-2.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-stone-100" />
            ))}
          </div>
          <div className="h-32 rounded-xl bg-stone-100" />
        </div>
      ) : (
        <Configurator product={data} onDone={onClose} />
      )}
    </Modal>
  );
}

function Configurator({ product, onDone }: { product: ProductDetail; onDone: () => void }) {
  const add = useCart((s) => s.add);
  const toast = useToast((s) => s.push);
  const [size, setSize] = useState<Size>('S');
  const [toppingIds, setToppingIds] = useState<number[]>([]);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const chosenToppings = product.toppings.filter((t) => toppingIds.includes(t.id));
  const sizeDelta = product.sizes.find((s) => s.size === size)?.priceDelta ?? 0;
  const unitPrice = product.price + sizeDelta + chosenToppings.reduce((n, t) => n + t.price, 0);
  const soldOut = product.stock <= 0;
  const maxQty = Math.min(MAX_QTY, Math.max(1, product.stock));

  const toggleTopping = (tid: number) =>
    setToppingIds((ids) => (ids.includes(tid) ? ids.filter((x) => x !== tid) : [...ids, tid]));

  const addToCart = () => {
    add({ productId: product.id, name: product.name, imageUrl: product.imageUrl, size, toppings: chosenToppings, unitPrice, qty });
    setAdded(true);
    toast({
      title: `Đã thêm ${qty} × ${product.name}`,
      description: [`Size ${size}`, ...chosenToppings.map((t) => t.name)].join(' · '),
      action: { label: 'Xem giỏ', href: '/cart' },
    });
    setTimeout(onDone, 600);
  };

  return (
    <>
      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-sm font-semibold text-stone-500">Giá cơ bản (Size S)</span>
            <span className="text-lg font-extrabold text-amber-900">{formatVnd(product.price)}</span>
          </div>
          <p className="rounded-xl border border-amber-100/60 bg-amber-50/50 p-3 text-xs leading-relaxed text-stone-600">{product.description}</p>
        </div>

        <fieldset>
          <legend className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-900">
            <span>1. Chọn kích cỡ (Size)</span>
            <span className="rounded-full bg-amber-100/70 px-2 py-0.5 text-[10px] font-bold text-amber-700">Bắt buộc</span>
          </legend>
          <div className="grid grid-cols-3 gap-2.5">
            {product.sizes.map((s) => {
              const active = s.size === size;
              return (
                <label
                  key={s.size}
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border p-3 text-center transition ${
                    active
                      ? 'border-amber-700 bg-amber-50/70 text-amber-900 shadow-sm ring-2 ring-amber-700/20'
                      : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                  }`}
                >
                  <input type="radio" name="size" value={s.size} checked={active} onChange={() => setSize(s.size)} className="sr-only" />
                  <span className="text-sm font-extrabold">
                    {SIZE_LABEL[s.size]} ({s.size})
                  </span>
                  <span className="mt-0.5 text-[11px] font-semibold text-stone-500">
                    {s.volumeMl}ml · {s.priceDelta ? `+${formatVnd(s.priceDelta)}` : 'Giá gốc'}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {product.toppings.length > 0 && (
          <fieldset>
            <legend className="mb-2.5 block text-xs font-bold uppercase tracking-wider text-stone-900">2. Thêm Topping</legend>
            <div className="space-y-2">
              {product.toppings.map((t) => {
                const on = toppingIds.includes(t.id);
                return (
                  <label
                    key={t.id}
                    className={`flex cursor-pointer select-none items-center justify-between rounded-xl border p-3 transition ${
                      on ? 'border-amber-700/60 bg-amber-50/60 font-bold text-amber-950' : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                    }`}
                  >
                    <input type="checkbox" checked={on} onChange={() => toggleTopping(t.id)} className="sr-only" />
                    <span className="flex items-center gap-2.5">
                      <span
                        className={`grid size-4 place-items-center rounded-md border transition ${
                          on ? 'border-amber-800 bg-amber-800 text-white' : 'border-stone-300 bg-white'
                        }`}
                        aria-hidden
                      >
                        {on && <Check className="size-3" strokeWidth={3} />}
                      </span>
                      <span className="text-xs font-semibold">{t.name}</span>
                    </span>
                    <span className="text-xs font-bold text-amber-800">+{formatVnd(t.price)}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}

        {!soldOut && product.stock <= 10 && <p className="text-xs font-semibold text-red-600">Chỉ còn {product.stock} ly</p>}
      </div>

      <div className="flex items-center gap-3 border-t border-stone-200 bg-stone-50/80 p-4 backdrop-blur-md">
        <QtyStepper value={qty} onChange={setQty} max={maxQty} />
        <button
          onClick={addToCart}
          disabled={added || soldOut}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white shadow-brew-float transition disabled:cursor-not-allowed ${
            added ? 'scale-[0.98] bg-emerald-600' : 'bg-amber-800 hover:bg-amber-900 active:scale-[0.99] disabled:opacity-50'
          }`}
        >
          {added ? (
            <>
              <Check className="size-4" />
              <span>Đã thêm vào giỏ!</span>
            </>
          ) : (
            <>
              <ShoppingBag className="size-4" />
              <span>{soldOut ? 'Tạm hết hàng' : `Thêm vào giỏ • ${formatVnd(unitPrice * qty)}`}</span>
            </>
          )}
        </button>
      </div>
    </>
  );
}
