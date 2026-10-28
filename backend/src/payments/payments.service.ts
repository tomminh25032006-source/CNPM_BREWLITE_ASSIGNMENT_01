import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Payment } from '@prisma/client';
import { AuthUser } from '../auth/jwt.strategy';
import { loyaltyPointsFor } from '../common/pricing';
import { transitionOrder } from '../orders/order-transitions';
import { ORDER_INCLUDE } from '../orders/orders.service';
import { isUniqueViolation, PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto';
import { MockPaymentGateway } from './mock-payment.gateway';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: MockPaymentGateway,
  ) {}

  /**
   * Thanh toán idempotent:
   *  1. Key đã tồn tại → trả lại kết quả cũ, không gọi cổng thanh toán lần nữa.
   *  2. "Giữ chỗ" key bằng bản ghi Payment(PROCESSING) — ràng buộc UNIQUE đảm bảo
   *     chỉ một request thắng khi gửi trùng song song; khóa dòng Order (FOR UPDATE)
   *     để hai key khác nhau không cùng trả tiền cho một đơn.
   *  3. Gọi cổng thanh toán (ngoài transaction).
   *  4. Ghi kết quả: PAID (+ điểm thưởng) hoặc PAYMENT_FAILED. Lượt dùng mã đã được giữ lúc tạo đơn.
   */
  async pay(user: AuthUser, dto: CreatePaymentDto, idempotencyKey: string) {
    const previous = await this.prisma.payment.findUnique({ where: { idempotencyKey } });
    if (previous) return this.replay(previous, user, dto);

    let payment: Payment;
    try {
      payment = await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${dto.orderId} FOR UPDATE`;
        const order = await tx.order.findUnique({ where: { id: dto.orderId } });
        if (!order || order.userId !== user.id) throw new NotFoundException(`Không tìm thấy đơn #${dto.orderId}`);

        if (order.status === 'PAYMENT_FAILED') {
          await transitionOrder(tx, order.id, 'PAYMENT_FAILED', 'PENDING'); // thử lại
        } else if (order.status !== 'PENDING') {
          throw new ConflictException(
            order.status === 'CANCELLED' ? 'Đơn đã bị hủy' : 'Đơn này đã được thanh toán',
          );
        }

        const inFlight = await tx.payment.findFirst({ where: { orderId: order.id, status: 'PROCESSING' } });
        if (inFlight) throw new ConflictException('Đơn đang được thanh toán, vui lòng đợi');

        return tx.payment.create({
          data: { orderId: order.id, idempotencyKey, amount: order.total, method: dto.method },
        });
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        const winner = await this.prisma.payment.findUniqueOrThrow({ where: { idempotencyKey } });
        return this.replay(winner, user, dto);
      }
      throw err;
    }

    const result = await this.gateway.charge({
      amount: payment.amount,
      method: dto.method,
      cardNumber: dto.cardNumber,
      simulateFailure: dto.simulateFailure,
    });

    return this.prisma.$transaction(async (tx) => {
      let finalPayment: Payment;
      if (result.success) {
        finalPayment = await tx.payment.update({
          where: { id: payment.id },
          data: { status: 'SUCCEEDED', transactionRef: result.transactionRef },
        });
        await transitionOrder(tx, payment.orderId, 'PENDING', 'PAID');

        const order = await tx.order.findUniqueOrThrow({ where: { id: payment.orderId } });
        const points = loyaltyPointsFor(order.total);
        await tx.order.update({ where: { id: order.id }, data: { pointsEarned: points } });
        await tx.user.update({ where: { id: order.userId }, data: { loyaltyPoints: { increment: points } } });
      } else {
        finalPayment = await tx.payment.update({
          where: { id: payment.id },
          data: { status: 'FAILED', failureReason: result.reason },
        });
        await transitionOrder(tx, payment.orderId, 'PENDING', 'PAYMENT_FAILED');
      }

      const order = await tx.order.findUniqueOrThrow({ where: { id: payment.orderId }, include: ORDER_INCLUDE });
      return { payment: toPublic(finalPayment), order, replayed: false };
    });
  }

  private async replay(payment: Payment, user: AuthUser, dto: CreatePaymentDto) {
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id: payment.orderId },
      include: ORDER_INCLUDE,
    });
    if (order.userId !== user.id || payment.orderId !== dto.orderId || payment.method !== dto.method) {
      throw new UnprocessableEntityException('Idempotency-Key này đã được dùng cho một yêu cầu khác');
    }
    if (payment.status === 'PROCESSING') {
      throw new ConflictException('Yêu cầu thanh toán này đang được xử lý');
    }
    return { payment: toPublic(payment), order, replayed: true };
  }
}

function toPublic(p: Payment) {
  const { idempotencyKey: _omit, ...rest } = p;
  return rest;
}
