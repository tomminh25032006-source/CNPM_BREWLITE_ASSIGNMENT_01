import { ConflictException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { Tx } from '../prisma/prisma.service';
import { assertTransition } from './order-state-machine';

/**
 * Đổi trạng thái đơn một cách an toàn:
 * 1) kiểm tra chuyển tiếp hợp lệ theo state machine;
 * 2) UPDATE có điều kiện `status = from` để hai request song song không cùng chuyển được.
 */
export async function transitionOrder(tx: Tx, orderId: number, from: OrderStatus, to: OrderStatus) {
  assertTransition(from, to);
  const { count } = await tx.order.updateMany({
    where: { id: orderId, status: from },
    data: { status: to },
  });
  if (count === 0) {
    throw new ConflictException('Trạng thái đơn vừa được cập nhật bởi thao tác khác, vui lòng tải lại');
  }
}
