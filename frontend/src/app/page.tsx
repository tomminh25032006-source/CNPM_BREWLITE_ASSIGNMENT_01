'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Clock, Coffee, CreditCard, Search, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ProductCard, ProductCardSkeleton } from '@/components/ProductCard';
import { ProductModal } from '@/components/ProductModal';
import { ErrorState } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { formatVnd } from '@/lib/format';
import { useMounted } from '@/lib/hooks';
import type { Product } from '@/lib/types';
import { selectCount, selectSubtotal, useCart } from '@/store/cart';

const ALL = 'Tất cả món';

export default function HomePage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['products'],
    queryFn: () => api<Product[]>('/products'),
  });
  const [category, setCategory] = useState(ALL);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Product | null>(null);

  // Tới từ trang khác qua "Thực đơn" (/#menu-section): cuộn xuống thực đơn rồi xóa hash
  useEffect(() => {
    if (window.location.hash !== '#menu-section') return;
    const t = setTimeout(() => {
      document.getElementById('menu-section')?.scrollIntoView({ behavior: 'smooth' });
      window.history.replaceState(null, '', window.location.pathname);
    }, 200);
    return () => clearTimeout(t);
  }, []);

  const categories = useMemo(() => [ALL, ...new Set((data ?? []).map((p) => p.category))], [data]);
  const visible = useMemo(() => {
    const q = normalize(search.trim());
    return (data ?? []).filter(
      (p) => (category === ALL || p.category === category) && (!q || normalize(`${p.name} ${p.description}`).includes(q)),
    );
  }, [data, category, search]);

  return (
    <>
      <section className="relative overflow-hidden border-b border-amber-100/60 bg-gradient-to-b from-amber-100/60 via-amber-50/40 to-[#FDFBF7] py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 text-center animate-rise">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-amber-800/10 px-3.5 py-1.5 text-xs font-bold text-amber-900">
            <Sparkles className="size-3.5 text-amber-700" />
            <span>Cà Phê Đặc Sản • Rang Mộc 100%</span>
          </div>
          <h1 className="mx-auto max-w-3xl text-3xl font-black leading-tight tracking-tight text-stone-900 sm:text-5xl">
            Cà Phê Pha Chuẩn Vị <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-amber-800 via-amber-700 to-amber-600 bg-clip-text text-transparent">
              Đặt Nhanh Không Tiền Mặt
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm font-medium leading-relaxed text-stone-600 sm:text-base">
            Chọn món, tùy chỉnh size và topping, thanh toán bằng ví điện tử hoặc thẻ – rồi chỉ việc ghé quầy nhận nước.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-stone-700 sm:gap-8">
            {[
              { icon: Coffee, text: 'Hạt Robusta & Arabica Tuyển Chọn' },
              { icon: Clock, text: 'Nhận Nước Nhanh Tại Quầy' },
              { icon: CreditCard, text: 'Thanh Toán Ví Điện Tử, Thẻ' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-1.5 rounded-xl border border-stone-200/60 bg-white/80 px-3.5 py-2 shadow-sm backdrop-blur-sm">
                <Icon className="size-4 text-amber-700" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="menu-section" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-10">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-stone-900">Thực Đơn Đồ Uống</h2>
            <p className="mt-1 text-xs font-medium text-stone-500">Khám phá danh sách đồ uống thủ công được pha chế tươi mỗi ngày</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm món cà phê, trà..."
              aria-label="Tìm món"
              className="w-full rounded-xl border border-stone-200 bg-white py-2 pl-9 pr-4 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-800/40"
            />
          </div>
        </div>

        <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-4 scrollbar-none" role="tablist" aria-label="Danh mục">
          {categories.map((c) => (
            <button
              key={c}
              role="tab"
              aria-selected={c === category}
              onClick={() => setCategory(c)}
              className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold transition ${
                c === category ? 'bg-amber-800 text-white shadow-md' : 'border border-stone-200/80 bg-white text-stone-700 hover:bg-stone-100'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {isError ? (
          <ErrorState title="Không thể tải thực đơn" message={errorMessage(error)} onRetry={() => refetch()} />
        ) : isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="mx-auto my-12 max-w-md rounded-3xl border border-stone-200/80 bg-white p-12 text-center shadow-brew-card">
            <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-amber-50 text-amber-800">
              <Coffee className="size-8" />
            </div>
            <h3 className="mb-1 text-base font-extrabold text-stone-900">
              {data?.length ? 'Chưa tìm thấy món phù hợp' : 'Thực đơn đang được cập nhật'}
            </h3>
            <p className="mb-6 text-xs font-medium text-stone-500">
              {search ? <>Không tìm thấy đồ uống nào với từ khóa &ldquo;{search}&rdquo;.</> : 'Hiện chưa có món nào trong danh mục này.'}
            </p>
            {!!data?.length && (
              <button
                onClick={() => {
                  setCategory(ALL);
                  setSearch('');
                }}
                className="rounded-xl bg-amber-800 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-amber-900"
              >
                Xem tất cả thực đơn
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {visible.map((p) => (
              <ProductCard key={p.id} product={p} onSelect={setSelected} />
            ))}
          </div>
        )}
      </section>

      {selected && <ProductModal product={selected} onClose={() => setSelected(null)} />}
      <MobileCartBar />
    </>
  );
}

/** Bỏ dấu tiếng Việt để tìm "ca phe" vẫn ra "Cà phê". */
function normalize(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}

/** Thanh "Xem giỏ hàng (n)" cố định ở đáy màn hình điện thoại – như wireframe (1). */
function MobileCartBar() {
  const mounted = useMounted();
  const count = useCart(selectCount);
  const subtotal = useCart(selectSubtotal);
  if (!mounted || count === 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 p-3 backdrop-blur sm:hidden">
      <Link href="/cart" className="btn-primary w-full justify-between">
        <span>Xem giỏ hàng ({count})</span>
        <span className="flex items-center gap-2 tabular-nums">
          {formatVnd(subtotal)} <ArrowRight className="size-4" />
        </span>
      </Link>
    </div>
  );
}
