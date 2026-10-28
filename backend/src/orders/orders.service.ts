import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { AuthUser } from '../auth/jwt.strategy';
import { unitPrice } from '../common/pricing';
import { InventoryService, sumQuantities } from '../inventory/inventory.service';
import { isUniqueViolation, PrismaService } from '../prisma/prisma.service';
import { PromotionsService } from '../promotions/promotions.service';
import { CreateOrderDto, OrderItemDto } from './dto';
import { transitionOrder } from './order-transitions';

export const ORDER_INCLUDE = {
  items: { orderBy: { id: 'asc' } },
  payments: {
    orderBy: { id: 'desc' },
    select: { id: true, method: true, status: true, amount: true, transactionRef: true, failureReason: true, createdAt: true },
  },
} satisfies Prisma.OrderInclude;

/** Trạng thái barista được phép đặt (phần mở rộng ngoài MVP). */
const STAFF_TARGETS: OrderStatus[] = ['PREPARING', 'READY', 'COMPLETED', 'CANCELLED'];
/** Khách chỉ được tự hủy khi đơn chưa thanh toán. */
const CUSTOMER_CANCELLABLE: OrderStatus[] = ['PENDING', 'PAYMENT_FAILED'];

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
    private readonly promotions: PromotionsService,
  ) {}

  async create(user: AuthUser, dto: CreateOrderDto, idempotencyKey?: string) {
    if (idempotencyKey) {
      const existing = await this.findByIdempotencyKey(user.id, idempotencyKey);
      if (existing) return { order: existing, replayed: true };
    }

    const lines = await this.priceLines(dto.items);
    const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);

    let discount = 0;
    let couponCode: string | null = null;
    if (dto.couponCode?.trim()) {
      const check = await this.promotions.validate(dto.couponCode, subtotal);
      if (!check.valid) throw new BadRequestException(check.message);
      discount = check.discount;
      couponCode = check.code;
    }

    try {
      const order = await this.inventory.withStockTransaction(async (tx) => {
        await this.inventory.reserve(tx, sumQuantities(lines));
        if (couponCode) await this.promotions.reserve(couponCode, tx);
        return tx.order.create({
          data: {
            userId: user.id,
            status: 'PENDING',
            subtotal,
            discount,
            total: subtotal - discount,
            couponCode,
            note: dto.note?.trim() || null,
            idempotencyKey: idempotencyKey ?? null,
            items: { create: lines },
          },
          include: ORDER_INCLUDE,
        });
      });
      return { order, replayed: false };
    } catch (err) {
      // Hai request cùng Idempotency-Key chạy song song: request thua bị rollback
      // (kể cả phần trừ kho) và trả về đơn của request thắng.
      if (idempotencyKey && isUniqueViolation(err)) {
        const existing = await this.findByIdempotencyKey(user.id, idempotencyKey);
        if (existing) return { order: existing, replayed: true };
      }
      throw err;
    }
  }

  findMine(userId: number) {
    return this.prisma.order.findMany({
      where: { userId },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async findOne(user: AuthUser, id: number) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: ORDER_INCLUDE });
    if (!order || (order.userId !== user.id && user.role !== 'STAFF')) {
      throw new NotFoundException(`Không tìm thấy đơn #${id}`);
    }
    return order;
  }

  listForStaff(statuses: OrderStatus[] = ['PAID', 'PREPARING', 'READY']) {
    return this.prisma.order.findMany({
      where: { status: { in: statuses } },
      include: { ...ORDER_INCLUDE, user: { select: { fullName: true } } },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
  }

  async cancel(user: AuthUser, id: number) {
    const order = await this.findOne(user, id);
    if (user.role !== 'STAFF' && !CUSTOMER_CANCELLABLE.includes(order.status)) {
      throw new ForbiddenException('Đơn đã thanh toán, vui lòng liên hệ quầy để hủy');
    }
    if (order.payments.some((p) => p.status === 'PROCESSING')) {
      throw new ConflictException('Đơn đang được thanh toán, vui lòng đợi trong giây lát');
    }
    return this.applyStatus(order.id, order.status, 'CANCELLED');
  }

  async updateStatusByStaff(id: number, to: OrderStatus) {
    if (!STAFF_TARGETS.includes(to)) {
      throw new BadRequestException(`Nhân viên không thể đặt trạng thái ${to}`);
    }
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException(`Không tìm thấy đơn #${id}`);
    return this.applyStatus(order.id, order.status, to);
  }

  private async applyStatus(id: number, from: OrderStatus, to: OrderStatus) {
    return this.prisma.$transaction(async (tx) => {
      await transitionOrder(tx, id, from, to);

      if (to === 'CANCELLED') {
        const order = await tx.order.findUniqueOrThrow({ where: { id }, include: { items: true } });
        await this.inventory.release(tx, sumQuantities(order.items));
        if (order.couponCode) await this.promotions.release(order.couponCode, tx);
        if (from === 'PAID' && order.pointsEarned > 0) {
          // Đơn đã trả tiền bị hủy: thu hồi điểm đã cộng (hoàn tiền do cổng thanh toán xử lý).
          await tx.user.update({
            where: { id: order.userId },
            data: { loyaltyPoints: { decrement: order.pointsEarned } },
          });
          await tx.order.update({ where: { id }, data: { pointsEarned: 0 } });
        }
      }
      return tx.order.findUniqueOrThrow({ where: { id }, include: ORDER_INCLUDE });
    });
  }

  private findByIdempotencyKey(userId: number, idempotencyKey: string) {
    return this.prisma.order.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey } },
      include: ORDER_INCLUDE,
    });
  }

  /** Giá luôn tính ở server từ CSDL, không tin giá client gửi lên. */
  private async priceLines(items: OrderItemDto[]) {
    const productIds = [...new Set(items.map((i) => i.productId))];
    const toppingIds = [...new Set(items.flatMap((i) => i.toppingIds ?? []))];
    const [products, toppings] = await Promise.all([
      this.prisma.product.findMany({ where: { id: { in: productIds }, isActive: true } }),
      this.prisma.topping.findMany({ where: { id: { in: toppingIds } } }),
    ]);
    const productById = new Map(products.map((p) => [p.id, p]));
    const toppingById = new Map(toppings.map((t) => [t.id, t]));

    return items.map((item) => {
      const product = productById.get(item.productId);
      if (!product) throw new BadRequestException(`Sản phẩm #${item.productId} không tồn tại`);
      const chosen = (item.toppingIds ?? []).map((tid) => {
        const t = toppingById.get(tid);
        if (!t) throw new BadRequestException(`Topping #${tid} không tồn tại`);
        return { id: t.id, name: t.name, price: t.price };
      });
      const price = unitPrice(product.price, item.size, chosen.map((t) => t.price));
      return {
        productId: product.id,
        productName: product.name,
        size: item.size,
        toppings: chosen,
        unitPrice: price,
        qty: item.qty,
        lineTotal: price * item.qty,
      };
    });
  }
}
