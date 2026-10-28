import { ConflictException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';

/**
 * Các chuyển tiếp hợp lệ (Mục 9.1 của đề).
 * Luồng chính: PENDING → PAID → PREPARING → READY → COMPLETED.
 * Ngoại lệ: PENDING ⇄ PAYMENT_FAILED (thanh toán lỗi / thử lại), hủy từ PENDING, PAYMENT_FAILED, PAID.
 * COMPLETED và CANCELLED là trạng thái kết thúc.
 */
export const ORDER_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  PENDING: ['PAID', 'PAYMENT_FAILED', 'CANCELLED'],
  PAYMENT_FAILED: ['PENDING', 'CANCELLED'],
  PAID: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY'],
  READY: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

export const TERMINAL_STATUSES: readonly OrderStatus[] = ['COMPLETED', 'CANCELLED'];

export class InvalidTransitionError extends ConflictException {
  constructor(
    readonly from: OrderStatus,
    readonly to: OrderStatus,
  ) {
    super({
      statusCode: 409,
      error: 'InvalidTransition',
      message: `Không thể chuyển đơn từ ${from} sang ${to}`,
    });
  }
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

/** Ném InvalidTransitionError nếu chuyển tiếp không có trong sơ đồ. */
export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) throw new InvalidTransitionError(from, to);
}
