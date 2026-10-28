import { bearer, createTestApp, newKey, registerUser, resetData, TestContext } from './helpers';

/** Tiêu chí (b): gửi 2 lần cùng Idempotency-Key chỉ tạo 1 đơn / 1 giao dịch. */
describe('(b) Idempotency', () => {
  let ctx: TestContext;
  let token: string;
  let userId: number;

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(() => ctx.app.close());

  beforeEach(async () => {
    await resetData(ctx.prisma);
    ({ token, userId } = await registerUser(ctx));
  });

  const orderBody = { items: [{ productId: 1, size: 'S', qty: 2 }] };

  const createOrder = (key: string) =>
    ctx.http().post('/orders').set(bearer(token)).set('Idempotency-Key', key).send(orderBody);

  const pay = (orderId: number, key: string) =>
    ctx.http()
      .post('/payments')
      .set(bearer(token))
      .set('Idempotency-Key', key)
      .send({ orderId, method: 'CARD', cardNumber: '4242 4242 4242 4242' });

  describe('POST /orders', () => {
    it('gửi tuần tự 2 lần cùng key → chỉ 1 đơn, chỉ trừ kho 1 lần', async () => {
      const key = newKey();
      const first = await createOrder(key).expect(201);
      const second = await createOrder(key).expect(200);

      expect(second.headers['idempotent-replayed']).toBe('true');
      expect(second.body.id).toBe(first.body.id);
      expect(await ctx.prisma.order.count()).toBe(1);
      expect((await ctx.prisma.product.findUniqueOrThrow({ where: { id: 1 } })).stock).toBe(98);
    });

    it('gửi song song 5 lần cùng key → chỉ 1 đơn', async () => {
      const key = newKey();
      const responses = await Promise.all(Array.from({ length: 5 }, () => createOrder(key)));

      const ids = new Set(responses.map((r) => r.body.id));
      expect(responses.every((r) => r.status === 200 || r.status === 201)).toBe(true);
      expect(ids.size).toBe(1);
      expect(await ctx.prisma.order.count()).toBe(1);
      expect((await ctx.prisma.product.findUniqueOrThrow({ where: { id: 1 } })).stock).toBe(98);
    });
  });

  describe('POST /payments', () => {
    it('gửi tuần tự 2 lần cùng key → 1 giao dịch, cộng điểm 1 lần', async () => {
      const order = (await createOrder(newKey()).expect(201)).body;
      const key = newKey();

      const first = await pay(order.id, key).expect(201);
      const second = await pay(order.id, key).expect(200);

      expect(first.body.order.status).toBe('PAID');
      expect(second.body.replayed).toBe(true);
      expect(second.body.payment.id).toBe(first.body.payment.id);
      expect(second.body.payment.transactionRef).toBe(first.body.payment.transactionRef);
      expect(await ctx.prisma.payment.count({ where: { orderId: order.id } })).toBe(1);

      const user = await ctx.prisma.user.findUniqueOrThrow({ where: { id: userId } });
      expect(user.loyaltyPoints).toBe(Math.floor(order.total / 1000));
    });

    it('gửi song song 5 lần cùng key → chỉ 1 giao dịch thành công', async () => {
      const order = (await createOrder(newKey()).expect(201)).body;
      const key = newKey();

      const responses = await Promise.all(Array.from({ length: 5 }, () => pay(order.id, key)));

      // Request thắng: 201; request đến khi giao dịch đang chạy: 409; đến sau: 200 (replay)
      expect(responses.filter((r) => r.status === 201)).toHaveLength(1);
      expect(responses.every((r) => [200, 201, 409].includes(r.status))).toBe(true);

      expect(await ctx.prisma.payment.count()).toBe(1);
      const user = await ctx.prisma.user.findUniqueOrThrow({ where: { id: userId } });
      expect(user.loyaltyPoints).toBe(Math.floor(order.total / 1000));
    });

    it('dùng lại key cho một đơn khác → 422', async () => {
      const a = (await createOrder(newKey()).expect(201)).body;
      const b = (await createOrder(newKey()).expect(201)).body;
      const key = newKey();
      await pay(a.id, key).expect(201);
      await pay(b.id, key).expect(422);
    });

    it('thiếu Idempotency-Key → 400', async () => {
      const order = (await createOrder(newKey()).expect(201)).body;
      await ctx.http()
        .post('/payments')
        .set(bearer(token))
        .send({ orderId: order.id, method: 'WALLET' })
        .expect(400);
    });
  });
});
