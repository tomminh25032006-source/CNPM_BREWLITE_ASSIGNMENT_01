import { Injectable } from '@nestjs/common';
import { PrismaService, Tx } from '../prisma/prisma.service';
import { evaluateCoupon } from './discount';

@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Các mã đang hoạt động để gợi ý trên giao diện giỏ hàng. */
  listActive() {
    return this.prisma.coupon.findMany({
      where: {
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { code: true, description: true, minSubtotal: true },
      orderBy: { id: 'asc' },
    });
  }

  async validate(code: string, subtotal: number, db: Tx = this.prisma) {
    const normalized = code.trim().toUpperCase();
    const coupon = await db.coupon.findUnique({ where: { code: normalized } });
    return { code: normalized, ...evaluateCoupon(coupon, subtotal) };
  }

  /** Ghi nhận 1 lượt dùng khi đơn đã PAID. */
  async markUsed(code: string, tx: Tx) {
    await tx.coupon.update({ where: { code }, data: { usedCount: { increment: 1 } } });
  }
}
