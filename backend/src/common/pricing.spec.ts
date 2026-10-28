import { loyaltyPointsFor, unitPrice } from './pricing';

describe('pricing', () => {
  it('tính giá theo size và topping', () => {
    expect(unitPrice(45_000, 'S', [])).toBe(45_000);
    expect(unitPrice(45_000, 'M', [])).toBe(50_000);
    expect(unitPrice(45_000, 'L', [8_000, 10_000])).toBe(73_000);
  });

  it('quy đổi điểm thưởng 1 điểm / 1.000đ, làm tròn xuống', () => {
    expect(loyaltyPointsFor(123_000)).toBe(123);
    expect(loyaltyPointsFor(999)).toBe(0);
    expect(loyaltyPointsFor(45_500)).toBe(45);
  });
});
