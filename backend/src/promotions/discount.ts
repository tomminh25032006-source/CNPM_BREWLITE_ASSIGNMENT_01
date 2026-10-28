import { Coupon } from '@prisma/client';

export type CouponCheck =
  | { valid: true; discount: number; message: string }
  | { valid: false; discount: 0; message: string };

/** Kiểm tra điều kiện mã giảm giá và tính số tiền giảm (hàm thuần, dễ unit test). */
export function evaluateCoupon(coupon: Coupon | null, subtotal: number, now = new Date()): CouponCheck {
  if (!coupon || !coupon.isActive) return invalid('Mã giảm giá không tồn tại');
  if (coupon.expiresAt && coupon.expiresAt < now) return invalid('Mã giảm giá đã hết hạn');
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    return invalid('Mã giảm giá đã hết lượt sử dụng');
  }
  if (subtotal < coupon.minSubtotal) {
    return invalid(`Đơn tối thiểu ${coupon.minSubtotal.toLocaleString('vi-VN')}đ để dùng mã này`);
  }

  let discount = coupon.type === 'PERCENT' ? Math.floor((subtotal * coupon.value) / 100) : coupon.value;
  if (coupon.maxDiscount !== null) discount = Math.min(discount, coupon.maxDiscount);
  discount = Math.min(discount, subtotal);

  return { valid: true, discount, message: coupon.description };
}

function invalid(message: string): CouponCheck {
  return { valid: false, discount: 0, message };
}
