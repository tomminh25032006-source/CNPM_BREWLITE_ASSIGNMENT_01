import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

export interface TestContext {
  app: INestApplication;
  prisma: PrismaService;
  http: () => ReturnType<typeof request>;
}

export async function createTestApp(): Promise<TestContext> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.listen(0); // cổng ngẫu nhiên, supertest dùng lại server đang chạy
  const server = app.getHttpServer();
  return { app, prisma: app.get(PrismaService), http: () => request(server) };
}

/** Xóa sạch dữ liệu và nạp bộ dữ liệu tối thiểu cho test. */
export async function resetData(prisma: PrismaService) {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "Payment", "OrderItem", "Order", "User", "Coupon", "Topping", "Product" RESTART IDENTITY CASCADE',
  );
  await prisma.$executeRawUnsafe('ALTER SEQUENCE "Order_id_seq" RESTART WITH 1001');
  await prisma.product.createMany({
    data: [
      { name: 'Cappuccino', category: 'Espresso', price: 45_000, imageUrl: '/x.svg', stock: 100 },
      { name: 'Cold brew', category: 'Đặc biệt', price: 55_000, imageUrl: '/x.svg', stock: 5 },
    ],
  });
  await prisma.topping.create({ data: { name: 'Kem cheese', price: 10_000 } });
  await prisma.coupon.create({
    data: { code: 'CHAOBAN', description: 'Giảm 10%', type: 'PERCENT', value: 10, maxDiscount: 20_000 },
  });
}

export async function registerUser(ctx: TestContext, email = `u-${randomUUID()}@test.vn`) {
  const res = await ctx.http()
    .post('/auth/register')
    .send({ email, password: 'secret123', fullName: 'Người Test' })
    .expect(201);
  return { token: res.body.accessToken as string, userId: res.body.user.id as number };
}

export async function createStaff(ctx: TestContext) {
  const email = `staff-${randomUUID()}@test.vn`;
  await ctx.prisma.user.create({
    data: { email, fullName: 'Barista', role: 'STAFF', passwordHash: await bcrypt.hash('secret123', 4) },
  });
  const res = await ctx.http().post('/auth/login').send({ email, password: 'secret123' }).expect(200);
  return res.body.accessToken as string;
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
export const newKey = () => randomUUID();
