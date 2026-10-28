'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api';
import type { Size, Topping } from '@/lib/types';

export interface CartLine {
  lineId: string;
  productId: number;
  name: string;
  imageUrl: string;
  size: Size;
  toppings: Topping[];
  unitPrice: number;
  qty: number;
}

export const MAX_QTY = 20;

interface CartState {
  lines: CartLine[];
  couponCode: string | null;
  /** Đơn đã tạo từ giỏ hiện tại (để thanh toán lại không tạo đơn mới). */
  pendingOrderId: number | null;
  /** Idempotency-Key cho POST /orders của giỏ hiện tại. */
  orderKey: string | null;
  /** Idempotency-Key của lần thanh toán đang dở (giữ lại nếu mất mạng để gửi lại an toàn). */
  paymentKey: string | null;

  add: (line: Omit<CartLine, 'lineId'>) => void;
  setQty: (lineId: string, qty: number) => void;
  remove: (lineId: string) => void;
  setCoupon: (code: string | null) => void;
  clear: () => void;
  /** Người dùng xóa hết giỏ: hủy luôn đơn chờ thanh toán (nếu có) để trả lại tồn kho. */
  empty: () => void;
  setCheckout: (patch: Partial<Pick<CartState, 'pendingOrderId' | 'orderKey' | 'paymentKey'>>) => void;
}

export const lineIdOf = (productId: number, size: Size, toppings: Topping[]) =>
  `${productId}-${size}-${toppings.map((t) => t.id).sort((a, b) => a - b).join('.')}`;

/** Giỏ thay đổi → đơn đã tạo trước đó không còn khớp: hủy nó để trả lại tồn kho. */
function invalidateOrder(state: CartState): Partial<CartState> {
  if (state.pendingOrderId) {
    api(`/orders/${state.pendingOrderId}/cancel`, { method: 'POST' }).catch(() => undefined);
  }
  return { pendingOrderId: null, orderKey: null, paymentKey: null };
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      couponCode: null,
      pendingOrderId: null,
      orderKey: null,
      paymentKey: null,

      add: (line) =>
        set((s) => {
          const lineId = lineIdOf(line.productId, line.size, line.toppings);
          const existing = s.lines.find((l) => l.lineId === lineId);
          const lines = existing
            ? s.lines.map((l) => (l.lineId === lineId ? { ...l, qty: Math.min(MAX_QTY, l.qty + line.qty) } : l))
            : [...s.lines, { ...line, lineId }];
          return { lines, ...invalidateOrder(s) };
        }),

      setQty: (lineId, qty) =>
        set((s) => ({
          lines: s.lines.map((l) => (l.lineId === lineId ? { ...l, qty: Math.max(1, Math.min(MAX_QTY, qty)) } : l)),
          ...invalidateOrder(s),
        })),

      remove: (lineId) => set((s) => ({ lines: s.lines.filter((l) => l.lineId !== lineId), ...invalidateOrder(s) })),

      setCoupon: (couponCode) => set((s) => ({ couponCode, ...invalidateOrder(s) })),

      clear: () => set({ lines: [], couponCode: null, pendingOrderId: null, orderKey: null, paymentKey: null }),

      empty: () => set((s) => ({ lines: [], couponCode: null, ...invalidateOrder(s) })),

      setCheckout: (patch) => set(patch),
    }),
    { name: 'brewlite-cart' },
  ),
);

export const selectCount = (s: CartState) => s.lines.reduce((n, l) => n + l.qty, 0);
export const selectSubtotal = (s: CartState) => s.lines.reduce((n, l) => n + l.unitPrice * l.qty, 0);
