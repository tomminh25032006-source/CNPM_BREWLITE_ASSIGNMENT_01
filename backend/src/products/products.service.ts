import { Injectable, NotFoundException } from '@nestjs/common';
import { SIZE_OPTIONS } from '../common/pricing';
import { PrismaService } from '../prisma/prisma.service';

const PUBLIC_FIELDS = {
  id: true,
  name: true,
  description: true,
  category: true,
  price: true,
  imageUrl: true,
  stock: true,
} as const;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(category?: string) {
    return this.prisma.product.findMany({
      where: { isActive: true, ...(category ? { category } : {}) },
      select: PUBLIC_FIELDS,
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findFirst({
      where: { id, isActive: true },
      select: PUBLIC_FIELDS,
    });
    if (!product) throw new NotFoundException(`Không tìm thấy sản phẩm #${id}`);

    const toppings = await this.findToppings();
    const sizes = Object.entries(SIZE_OPTIONS).map(([size, opt]) => ({ size, ...opt }));
    return { ...product, sizes, toppings };
  }

  findToppings() {
    return this.prisma.topping.findMany({ orderBy: { id: 'asc' } });
  }
}
