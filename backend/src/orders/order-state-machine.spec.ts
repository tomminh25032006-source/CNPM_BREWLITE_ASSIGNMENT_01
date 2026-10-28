import { OrderStatus } from '@prisma/client';
import {
  assertTransition,
  canTransition,
  InvalidTransitionError,
  ORDER_TRANSITIONS,
  TERMINAL_STATUSES,
} from './order-state-machine';

const ALL = Object.keys(ORDER_TRANSITIONS) as OrderStatus[];

describe('Order State Machine', () => {
  it('cho phép đi hết luồng thành công PENDING → PAID → PREPARING → READY → COMPLETED', () => {
    const happyPath: OrderStatus[] = ['PENDING', 'PAID', 'PREPARING', 'READY', 'COMPLETED'];
    for (let i = 0; i < happyPath.length - 1; i++) {
      expect(() => assertTransition(happyPath[i], happyPath[i + 1])).not.toThrow();
    }
  });

  it('cho phép nhánh ngoại lệ: thanh toán lỗi, thử lại, hủy', () => {
    expect(canTransition('PENDING', 'PAYMENT_FAILED')).toBe(true);
    expect(canTransition('PAYMENT_FAILED', 'PENDING')).toBe(true);
    expect(canTransition('PAYMENT_FAILED', 'CANCELLED')).toBe(true);
    expect(canTransition('PENDING', 'CANCELLED')).toBe(true);
    expect(canTransition('PAID', 'CANCELLED')).toBe(true);
  });

  it.each<[OrderStatus, OrderStatus]>([
    ['PENDING', 'PREPARING'],
    ['PENDING', 'COMPLETED'],
    ['PAID', 'PENDING'],
    ['PAID', 'READY'],
    ['PREPARING', 'PAID'],
    ['PREPARING', 'CANCELLED'],
    ['READY', 'PREPARING'],
    ['PAYMENT_FAILED', 'PAID'],
    ['COMPLETED', 'CANCELLED'],
    ['CANCELLED', 'PENDING'],
  ])('chặn chuyển trạng thái sai %s → %s', (from, to) => {
    expect(() => assertTransition(from, to)).toThrow(InvalidTransitionError);
  });

  it('không cho đứng yên tại chỗ (A → A)', () => {
    for (const s of ALL) expect(canTransition(s, s)).toBe(false);
  });

  it('COMPLETED và CANCELLED là trạng thái kết thúc', () => {
    for (const s of TERMINAL_STATUSES) {
      for (const to of ALL) expect(canTransition(s, to)).toBe(false);
    }
  });

  it('lỗi trả về HTTP 409 kèm thông tin from/to', () => {
    try {
      assertTransition('COMPLETED', 'PAID');
      fail('phải ném lỗi');
    } catch (e) {
      const err = e as InvalidTransitionError;
      expect(err.getStatus()).toBe(409);
      expect(err.from).toBe('COMPLETED');
      expect(err.to).toBe('PAID');
    }
  });
});
