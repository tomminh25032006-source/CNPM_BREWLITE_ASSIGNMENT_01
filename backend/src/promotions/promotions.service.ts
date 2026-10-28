import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService, Tx } from '../prisma/prisma.service';
import { evaluateCoupon } from './discount';

/** Mã vừa hết lượt / hết hạn trong lúc đặt đơn (bị request khác giành mất lượt cuối). */
export class CouponUnavailableError extends ConflictException {
  constructor(code: string) {
    super({
      statusCode: 409,
      error: 'CouponUnavailable',
      message: `Mã ${code} đã hết lượt sử dụng hoặc hết hạn`,
    });
  }
}

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

  /**
   * Giữ 1 lượt dùng mã ngay khi tạo đơn (giống giữ tồn kho).
   * UPDATE có điều kiện chạy nguyên tử trong PostgreSQL: dòng Coupon bị khóa, điều kiện
   * được kiểm tra lại sau khi chờ khóa → nhiều đơn đặt cùng lúc không thể vượt usageLimit.
   */
  async reserve(code: string, tx: Tx) {
    const updated = await tx.$executeRaw`
      UPDATE "Coupon" SET "usedCount" = "usedCount" + 1
      WHERE code = ${code}
        AND "isActive"
        AND ("expiresAt" IS NULL OR "expiresAt" > now())
        AND ("usageLimit" IS NULL OR "usedCount" < "usageLimit")`;
    if (updated === 0) throw new CouponUnavailableError(code);
  }

  /** Trả lại lượt dùng khi đơn bị hủy. */
  async release(code: string, tx: Tx) {
    await tx.coupon.updateMany({
      where: { code, usedCount: { gt: 0 } },
      data: { usedCount: { decrement: 1 } },
    });
  }
}
