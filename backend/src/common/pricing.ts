import { Size } from '@prisma/client';

/** Phụ thu theo size, cộng vào giá gốc (giá size S). */
export const SIZE_OPTIONS: Record<Size, { label: string; volumeMl: number; priceDelta: number }> = {
  S: { label: 'Nhỏ', volumeMl: 360, priceDelta: 0 },
  M: { label: 'Vừa', volumeMl: 480, priceDelta: 5_000 },
  L: { label: 'Lớn', volumeMl: 600, priceDelta: 10_000 },
};

/** 1 điểm thưởng cho mỗi 1.000đ thực trả. */
export const VND_PER_LOYALTY_POINT = 1_000;

export function unitPrice(basePrice: number, size: Size, toppingPrices: number[]): number {
  return basePrice + SIZE_OPTIONS[size].priceDelta + toppingPrices.reduce((sum, p) => sum + p, 0);
}

export function loyaltyPointsFor(total: number): number {
  return Math.floor(total / VND_PER_LOYALTY_POINT);
}
