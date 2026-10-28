'use client';

import { Plus } from 'lucide-react';
import { formatVnd } from '@/lib/format';
import type { Product } from '@/lib/types';

const LOW_STOCK = 10;

export function ProductCard({ product, onSelect }: { product: Product; onSelect: (p: Product) => void }) {
  const soldOut = product.stock <= 0;

  return (
    <article
      onClick={() => onSelect(product)}
      className="group flex cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-brew-card transition-all duration-200 hover:-translate-y-1 hover:shadow-brew-float"
    >
      <div>
        <div className="relative h-44 w-full overflow-hidden bg-stone-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            className={`size-full object-cover transition-transform duration-300 group-hover:scale-105 ${soldOut ? 'opacity-50 grayscale' : ''}`}
          />
          <span className="absolute left-2.5 top-2.5 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-900 shadow-sm backdrop-blur-md">
            {product.category}
          </span>
          {soldOut ? (
            <span className="absolute bottom-2.5 left-2.5 rounded-full bg-stone-900/85 px-2 py-0.5 text-[10px] font-bold text-white">Hết hàng</span>
          ) : product.stock <= LOW_STOCK ? (
            <span className="absolute bottom-2.5 left-2.5 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
              Chỉ còn {product.stock} ly
            </span>
          ) : null}
        </div>

        <div className="p-4">
          <h3 className="line-clamp-1 text-sm font-extrabold text-stone-900 transition group-hover:text-amber-800">{product.name}</h3>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-stone-500">{product.description}</p>
        </div>
      </div>

      <div className="flex items-center justify-between px-4 pb-4">
        <div>
          <span className="block text-[10px] font-semibold uppercase text-stone-400">Giá từ</span>
          <span className="text-sm font-black text-amber-900">{formatVnd(product.price)}</span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(product);
          }}
          disabled={soldOut}
          aria-label={`Chọn ${product.name}`}
          className="flex items-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900 transition hover:bg-amber-100 active:scale-95 disabled:opacity-40"
        >
          <Plus className="size-3.5" />
          <span>Chọn</span>
        </button>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="animate-pulse space-y-3 rounded-2xl border border-stone-200/80 bg-white p-4" aria-hidden>
      <div className="h-44 w-full rounded-xl bg-stone-200" />
      <div className="h-4 w-3/4 rounded bg-stone-200" />
      <div className="h-3 w-full rounded bg-stone-100" />
      <div className="flex items-center justify-between pt-2">
        <div className="h-4 w-1/3 rounded bg-stone-200" />
        <div className="h-7 w-16 rounded-lg bg-stone-200" />
      </div>
    </div>
  );
}
