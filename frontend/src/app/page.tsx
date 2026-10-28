'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowRightIcon } from '@/components/icons';
import { ProductCard, ProductCardSkeleton } from '@/components/ProductCard';
import { EmptyState, ErrorState, Ornament } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { formatVnd } from '@/lib/format';
import { useMounted } from '@/lib/hooks';
import type { Product } from '@/lib/types';
import { selectCount, selectSubtotal, useCart } from '@/store/cart';

const ALL = 'Tất cả';

export default function MenuPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['products'],
    queryFn: () => api<Product[]>('/products'),
  });
  const [category, setCategory] = useState(ALL);

  const categories = useMemo(() => [ALL, ...new Set((data ?? []).map((p) => p.category))], [data]);
  const visible = useMemo(
    () => (data ?? []).filter((p) => category === ALL || p.category === category),
    [data, category],
  );

  return (
    <>
      <section className="mb-12 text-center animate-rise">
        <p className="label-caps mb-4">Thực đơn hôm nay</p>
        <h1 className="mx-auto max-w-3xl font-display text-5xl font-medium leading-[1.05] tracking-tight sm:text-6xl">
          Một ly ngon, <em className="text-accent">không cần</em> tiền mặt.
        </h1>
        <Ornament className="mt-6" />
        <p className="mx-auto mt-5 max-w-xl text-ink-soft">
          Chọn món, tùy chỉnh size và topping, thanh toán bằng ví hoặc thẻ – rồi chỉ việc ghé quầy nhận nước.
        </p>
      </section>

      <div className="-mx-4 mb-8 flex justify-start gap-2 overflow-x-auto px-4 py-1 sm:justify-center" role="tablist" aria-label="Danh mục">
        {categories.map((c) => (
          <button
            key={c}
            role="tab"
            aria-selected={c === category}
            onClick={() => setCategory(c)}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
              c === category ? 'border-ink bg-ink text-paper' : 'border-line text-ink-soft hover:border-ink/40 hover:text-ink'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {isError ? (
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState title="Thực đơn đang được cập nhật" description="Hiện chưa có món nào trong danh mục này. Bạn quay lại sau nhé!" />
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 lg:grid-cols-4">
          {visible.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      )}

      <MobileCartBar />
    </>
  );
}

/** Thanh "Xem giỏ hàng (n)" cố định ở đáy màn hình điện thoại – như wireframe (1). */
function MobileCartBar() {
  const mounted = useMounted();
  const count = useCart(selectCount);
  const subtotal = useCart(selectSubtotal);
  if (!mounted || count === 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 p-3 backdrop-blur sm:hidden">
      <Link href="/cart" className="btn-primary w-full justify-between">
        <span>Xem giỏ hàng ({count})</span>
        <span className="flex items-center gap-2 tabular-nums">
          {formatVnd(subtotal)} <ArrowRightIcon width={16} height={16} />
        </span>
      </Link>
    </div>
  );
}
