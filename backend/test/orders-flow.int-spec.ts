import { bearer, createTestApp, newKey, registerUser, resetData, TestContext } from './helpers';

/** Luồng MVP end-to-end ở tầng API: menu → đăng ký → đặt đơn (có mã giảm giá) → thanh toán → lịch sử. */
describe('Luồng đặt hàng end-to-end', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(() => ctx.app.close());
  beforeEach(() => resetData(ctx.prisma));

  it('GET /products trả menu; GET /products/:id có size & topping', async () => {
    const list = await ctx.http().get('/products').expect(200);
    expect(list.body).toHaveLength(2);
    expect(list.body[0]).toEqual(expect.objectContaining({ id: 1, name: 'Cappuccino', price: 45_000 }));

    const detail = await ctx.http().get('/products/1').expect(200);
    expect(detail.body.sizes.map((s: { size: string }) => s.size)).toEqual(['S', 'M', 'L']);
    expect(detail.body.toppings).toHaveLength(1);
    await ctx.http().get('/products/999').expect(404);
  });

  it('chặn đặt đơn khi chưa đăng nhập', async () => {
    await ctx.http().post('/orders').send({ items: [{ productId: 1, size: 'S', qty: 1 }] }).expect(401);
  });

  it('validate dữ liệu đầu vào', async () => {
    const { token } = await registerUser(ctx);
    await ctx.http().post('/orders').set(bearer(token)).send({ items: [] }).expect(400);
    await ctx.http()
      .post('/orders')
      .set(bearer(token))
      .send({ items: [{ productId: 1, size: 'XL', qty: 0 }] })
      .expect(400);
    await ctx.http()
      .post('/auth/register')
      .send({ email: 'khong-phai-email', password: '1', fullName: '' })
      .expect(400);
  });

  it('tính giá ở server, áp mã giảm giá, cộng điểm sau khi PAID, có trong lịch sử', async () => {
    const { token, userId } = await registerUser(ctx);

    // Cappuccino L (45k + 10k) + kem cheese (10k) = 65k x 2 = 130k; CHAOBAN giảm 10% = 13k
    const order = await ctx.http()
      .post('/orders')
      .set(bearer(token))
      .send({
        items: [{ productId: 1, size: 'L', toppingIds: [1], qty: 2 }],
        couponCode: 'chaoban',
      })
      .expect(201);
    expect(order.body).toEqual(
      expect.objectContaining({ status: 'PENDING', subtotal: 130_000, discount: 13_000, total: 117_000 }),
    );
    expect(order.body.id).toBeGreaterThanOrEqual(1001);

    const paid = await ctx.http()
      .post('/payments')
      .set(bearer(token))
      .set('Idempotency-Key', newKey())
      .send({ orderId: order.body.id, method: 'WALLET' })
      .expect(201);
    expect(paid.body.order).toEqual(expect.objectContaining({ status: 'PAID', pointsEarned: 117 }));

    const me = await ctx.http().get('/auth/me').set(bearer(token)).expect(200);
    expect(me.body.loyaltyPoints).toBe(117);
    expect(me.body.passwordHash).toBeUndefined();

    const history = await ctx.http().get('/orders/me').set(bearer(token)).expect(200);
    expect(history.body.map((o: { id: number }) => o.id)).toEqual([order.body.id]);

    const coupon = await ctx.prisma.coupon.findUniqueOrThrow({ where: { code: 'CHAOBAN' } });
    expect(coupon.usedCount).toBe(1);
    expect(userId).toBeDefined();
  });

  it('thẻ bị từ chối → PAYMENT_FAILED, không cộng điểm', async () => {
    const { token, userId } = await registerUser(ctx);
    const order = await ctx.http()
      .post('/orders')
      .set(bearer(token))
      .send({ items: [{ productId: 1, size: 'S', qty: 1 }] })
      .expect(201);

    const res = await ctx.http()
      .post('/payments')
      .set(bearer(token))
      .set('Idempotency-Key', newKey())
      .send({ orderId: order.body.id, method: 'CARD', cardNumber: '4000 0000 0000 0002' })
      .expect(201);
    expect(res.body.payment).toEqual(expect.objectContaining({ status: 'FAILED' }));
    expect(res.body.order.status).toBe('PAYMENT_FAILED');

    const user = await ctx.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.loyaltyPoints).toBe(0);
  });

  it('không xem được đơn của người khác', async () => {
    const a = await registerUser(ctx);
    const b = await registerUser(ctx);
    const order = await ctx.http()
      .post('/orders')
      .set(bearer(a.token))
      .send({ items: [{ productId: 1, size: 'S', qty: 1 }] })
      .expect(201);
    await ctx.http().get(`/orders/${order.body.id}`).set(bearer(b.token)).expect(404);
  });
});
