import { bearer, createStaff, createTestApp, newKey, registerUser, resetData, TestContext } from './helpers';

/** Khuyến mãi: số lượt dùng mã không vượt usageLimit kể cả khi đặt đồng thời; hủy đơn trả lại lượt. */
describe('Giới hạn lượt dùng mã giảm giá', () => {
  let ctx: TestContext;
  const CODE = 'LIMIT3';
  const CAPPUCCINO = 1; // tồn kho ban đầu = 100

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(() => ctx.app.close());

  beforeEach(async () => {
    await resetData(ctx.prisma);
    await ctx.prisma.coupon.create({
      data: { code: CODE, description: 'Giảm 10% – 3 lượt', type: 'PERCENT', value: 10, usageLimit: 3 },
    });
  });

  const order = (token: string) =>
    ctx.http()
      .post('/orders')
      .set(bearer(token))
      .send({ items: [{ productId: CAPPUCCINO, size: 'S', qty: 1 }], couponCode: CODE });

  const usedCount = async () => (await ctx.prisma.coupon.findUniqueOrThrow({ where: { code: CODE } })).usedCount;

  it('8 khách cùng dùng mã chỉ còn 3 lượt → đúng 3 đơn thành công, không trừ kho của đơn bị từ chối', async () => {
    const tokens = await Promise.all(Array.from({ length: 8 }, async () => (await registerUser(ctx)).token));
    const responses = await Promise.all(tokens.map(order));

    const ok = responses.filter((r) => r.status === 201);
    const rejected = responses.filter((r) => r.status !== 201);
    expect(ok).toHaveLength(3);
    expect(rejected).toHaveLength(5);
    // 409 khi thua cuộc đua giữ lượt cuối, 400 khi lúc kiểm tra mã đã hết lượt
    expect(rejected.every((r) => [400, 409].includes(r.status))).toBe(true);

    expect(await usedCount()).toBe(3);
    const product = await ctx.prisma.product.findUniqueOrThrow({ where: { id: CAPPUCCINO } });
    expect(product.stock).toBe(97);
    expect(await ctx.prisma.order.count()).toBe(3);
  });

  it('thanh toán không tính thêm lượt; khách hủy đơn chưa trả tiền → trả lại lượt cho người khác dùng', async () => {
    const a = await registerUser(ctx);
    const created = await order(a.token).expect(201);
    expect(await usedCount()).toBe(1);

    // Thanh toán lỗi rồi thành công: lượt dùng vẫn chỉ là 1
    await ctx.http()
      .post('/payments')
      .set(bearer(a.token))
      .set('Idempotency-Key', newKey())
      .send({ orderId: created.body.id, method: 'WALLET', simulateFailure: true })
      .expect(201);
    expect(await usedCount()).toBe(1);

    await ctx.http().post(`/orders/${created.body.id}/cancel`).set(bearer(a.token)).expect(201);
    expect(await usedCount()).toBe(0);
  });

  it('dùng hết 3 lượt thì đơn thứ 4 bị chặn; barista hủy một đơn đã PAID → đơn thứ 4 đặt được', async () => {
    const users = await Promise.all(Array.from({ length: 4 }, () => registerUser(ctx)));
    const orders = [];
    for (const u of users.slice(0, 3)) orders.push((await order(u.token).expect(201)).body);

    const fourth = await order(users[3].token).expect(400);
    expect(fourth.body.message).toContain('hết lượt');

    await ctx.http()
      .post('/payments')
      .set(bearer(users[0].token))
      .set('Idempotency-Key', newKey())
      .send({ orderId: orders[0].id, method: 'WALLET' })
      .expect(201);
    expect(await usedCount()).toBe(3);

    const staff = await createStaff(ctx);
    await ctx.http().post(`/orders/${orders[0].id}/cancel`).set(bearer(staff)).expect(201);
    expect(await usedCount()).toBe(2);

    await order(users[3].token).expect(201);
    expect(await usedCount()).toBe(3);
  });
});
