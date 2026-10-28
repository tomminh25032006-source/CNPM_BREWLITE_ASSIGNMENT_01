import { Coupon } from '@prisma/client';
import { evaluateCoupon } from './discount';

const base: Coupon = {
  id: 1,
  code: 'TEST',
  description: 'Mã thử',
  type: 'PERCENT',
  value: 10,
  minSubtotal: 0,
  maxDiscount: null,
  usageLimit: null,
  usedCount: 0,
  expiresAt: null,
  isActive: true,
};

describe('evaluateCoupon', () => {
  it('giảm theo phần trăm, có trần tối đa', () => {
    expect(evaluateCoupon(base, 100_000).discount).toBe(10_000);
    expect(evaluateCoupon({ ...base, maxDiscount: 5_000 }, 100_000).discount).toBe(5_000);
  });

  it('giảm số tiền cố định nhưng không vượt quá tạm tính', () => {
    const fixed = { ...base, type: 'FIXED' as const, value: 20_000 };
    expect(evaluateCoupon(fixed, 100_000).discount).toBe(20_000);
    expect(evaluateCoupon(fixed, 15_000).discount).toBe(15_000);
  });

  it('từ chối mã không tồn tại, hết hạn, hết lượt, chưa đủ giá trị tối thiểu', () => {
    expect(evaluateCoupon(null, 100_000).valid).toBe(false);
    expect(evaluateCoupon({ ...base, isActive: false }, 100_000).valid).toBe(false);
    expect(evaluateCoupon({ ...base, expiresAt: new Date('2000-01-01') }, 100_000).valid).toBe(false);
    expect(evaluateCoupon({ ...base, usageLimit: 3, usedCount: 3 }, 100_000).valid).toBe(false);
    expect(evaluateCoupon({ ...base, minSubtotal: 200_000 }, 100_000).valid).toBe(false);
  });
});
