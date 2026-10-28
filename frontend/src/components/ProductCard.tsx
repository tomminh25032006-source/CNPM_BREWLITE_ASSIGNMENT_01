'use client';

import Link from 'next/link';
import { formatVnd } from '@/lib/format';
import type { Product } from '@/lib/types';
import { useCart } from '@/store/cart';
import { useToast } from '@/store/toast';
import { PlusIcon } from './icons';

const LOW_STOCK = 10;

export function ProductCard({ product, index }: { product: Product; index: number }) {
  const add = useCart((s) => s.add);
  const toast = useToast((s) => s.push);
  const soldOut = product.stock <= 0;

  const quickAdd = () => {
    add({
      productId: product.id,
      name: product.name,
      imageUrl: product.imageUrl,
      size: 'S',
      toppings: [],
      unitPrice: product.price,
      qty: 1,
    });
    toast({ title: `Đã thêm ${product.name}`, description: 'Size Nhỏ · không topping', action: { label: 'Xem giỏ', href: '/cart' } });
  };

  return (
    <article
      className="group relative flex flex-col animate-rise"
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
    >
      <Link href={`/products/${product.id}`} className="flex flex-1 flex-col rounded-[28px] p-2 transition hover:bg-card">
        <div className="arch relative aspect-[4/4.4] overflow-hidden border border-line bg-print">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.imageUrl}
            alt=""
            className={`absolute inset-0 size-full object-contain p-6 pt-9 transition duration-500 group-hover:-translate-y-1 group-hover:scale-[1.03] ${
              soldOut ? 'opacity-40 grayscale' : ''
            }`}
          />
          <span className="absolute left-1/2 top-3 -translate-x-1/2 font-display text-xs italic text-[#8a7563]">
            No. {String(product.id).padStart(2, '0')}
          </span>
          {soldOut ? (
            <span className="absolute bottom-3 left-3 rounded-full bg-ink px-2.5 py-1 text-[0.68rem] font-semibold text-paper">Hết hàng</span>
          ) : product.stock <= LOW_STOCK ? (
            <span className="absolute bottom-3 left-3 rounded-full bg-accent px-2.5 py-1 text-[0.68rem] font-semibold text-[#f7f1e6]">
              Chỉ còn {product.stock} ly
            </span>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col px-2 pb-1 pt-4">
          <p className="label-caps text-[0.6rem]!">{product.category}</p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <h3 className="font-display text-xl font-medium leading-snug">{product.name}</h3>
            <span className="leader" aria-hidden />
            <span className="font-display text-lg tabular-nums text-accent">{formatVnd(product.price)}</span>
          </div>
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-soft">{product.description}</p>
        </div>
      </Link>

      <button
        type="button"
        onClick={quickAdd}
        disabled={soldOut}
        aria-label={`Thêm nhanh ${product.name} size Nhỏ vào giỏ`}
        className="absolute right-5 top-5 grid size-10 place-items-center rounded-full border border-line bg-card text-ink shadow-sm transition hover:bg-brand hover:text-brand-ink disabled:hidden sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
      >
        <PlusIcon width={18} height={18} />
      </button>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="p-2" aria-hidden>
      <div className="arch skeleton aspect-[4/4.4]" />
      <div className="skeleton mt-5 h-3 w-16 rounded" />
      <div className="skeleton mt-3 h-5 w-3/4 rounded" />
      <div className="skeleton mt-3 h-3 w-full rounded" />
    </div>
  );
}
