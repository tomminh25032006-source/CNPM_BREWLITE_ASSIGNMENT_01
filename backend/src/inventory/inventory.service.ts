import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService, Tx } from '../prisma/prisma.service';

/** Bản ghi đã bị transaction khác sửa trong lúc ta đang đọc – cần chạy lại. */
export class OptimisticLockError extends Error {
  constructor(readonly productId: number) {
    super(`Optimistic lock conflict on product ${productId}`);
  }
}

export class OutOfStockError extends ConflictException {
  constructor(productName: string, available: number) {
    super({
      statusCode: 409,
      error: 'OutOfStock',
      message:
        available > 0
          ? `"${productName}" chỉ còn ${available} phần`
          : `"${productName}" đã hết hàng`,
    });
  }
}

const MAX_ATTEMPTS = 15;
const TX_OPTIONS = { maxWait: 10_000, timeout: 15_000 };

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Chạy `work` trong một transaction; nếu gặp xung đột optimistic lock thì
   * rollback và thử lại (backoff ngẫu nhiên) – toàn bộ thay đổi của lần trước bị hủy.
   */
  async withStockTransaction<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.prisma.$transaction(work, TX_OPTIONS);
      } catch (err) {
        if (!(err instanceof OptimisticLockError) || attempt >= MAX_ATTEMPTS) {
          if (err instanceof OptimisticLockError) {
            throw new ConflictException('Hệ thống đang bận, vui lòng thử lại');
          }
          throw err;
        }
        await sleep(5 + Math.random() * 20 * attempt);
      }
    }
  }

  /**
   * Trừ tồn kho với optimistic locking: đọc (stock, version) rồi
   * UPDATE ... WHERE id = ? AND version = ?. Nếu không có dòng nào được cập nhật
   * nghĩa là đã có transaction khác chen vào → ném OptimisticLockError để retry.
   */
  async reserve(tx: Tx, quantities: Map<number, number>): Promise<void> {
    const ids = [...quantities.keys()].sort((a, b) => a - b);
    for (const id of ids) {
      const qty = quantities.get(id)!;
      const product = await tx.product.findUnique({
        where: { id },
        select: { name: true, stock: true, version: true, isActive: true },
      });
      if (!product || !product.isActive) throw new NotFoundException(`Không tìm thấy sản phẩm #${id}`);
      if (product.stock < qty) throw new OutOfStockError(product.name, product.stock);

      const { count } = await tx.product.updateMany({
        where: { id, version: product.version },
        data: { stock: { decrement: qty }, version: { increment: 1 } },
      });
      if (count === 0) throw new OptimisticLockError(id);
    }
  }

  /** Hoàn lại tồn kho khi đơn bị hủy. */
  async release(tx: Tx, quantities: Map<number, number>): Promise<void> {
    for (const [id, qty] of quantities) {
      await tx.product.update({
        where: { id },
        data: { stock: { increment: qty }, version: { increment: 1 } },
      });
    }
  }
}

export function sumQuantities(items: { productId: number; qty: number }[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const it of items) map.set(it.productId, (map.get(it.productId) ?? 0) + it.qty);
  return map;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
