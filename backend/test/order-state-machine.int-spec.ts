import { bearer, createStaff, createTestApp, newKey, registerUser, resetData, TestContext } from './helpers';

/** Tiêu chí (a): chặn được chuyển trạng thái sai – kiểm tra qua API thật. */
describe('(a) Order State Machine qua API', () => {
  let ctx: TestContext;
  let customer: string;
  let staff: string;

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(() => ctx.app.close());

  beforeEach(async () => {
    await resetData(ctx.prisma);
    customer = (await registerUser(ctx)).token;
    staff = await createStaff(ctx);
  });

  async function placeOrder() {
    const res = await ctx.http()
      .post('/orders')
      .set(bearer(customer))
      .send({ items: [{ productId: 1, size: 'M', qty: 1 }] })
      .expect(201);
    expect(res.body.status).toBe('PENDING');
    return res.body.id as number;
  }

  const pay = (orderId: number, simulateFailure = false) =>
    ctx.http()
      .post('/payments')
      .set(bearer(customer))
      .set('Idempotency-Key', newKey())
      .send({ orderId, method: 'WALLET', simulateFailure });

  const setStatus = (orderId: number, status: string, token = staff) =>
    ctx.http().patch(`/orders/${orderId}/status`).set(bearer(token)).send({ status });

  it('đi hết luồng PENDING → PAID → PREPARING → READY → COMPLETED', async () => {
    const id = await placeOrder();
    expect((await pay(id).expect(201)).body.order.status).toBe('PAID');
    for (const status of ['PREPARING', 'READY', 'COMPLETED']) {
      expect((await setStatus(id, status).expect(200)).body.status).toBe(status);
    }
  });

  it('chặn nhảy cóc trạng thái (PAID → READY, PENDING → PREPARING)', async () => {
    const id = await placeOrder();
    const skip = await setStatus(id, 'PREPARING').expect(409);
    expect(skip.body.error).toBe('InvalidTransition');

    await pay(id).expect(201);
    await setStatus(id, 'READY').expect(409);
    const order = await ctx.prisma.order.findUniqueOrThrow({ where: { id } });
    expect(order.status).toBe('PAID');
  });

  it('chặn đi lùi và thay đổi trạng thái kết thúc', async () => {
    const id = await placeOrder();
    await pay(id).expect(201);
    await setStatus(id, 'PREPARING').expect(200);
    await ctx.http().post(`/orders/${id}/cancel`).set(bearer(staff)).expect(409); // PREPARING → CANCELLED
    await setStatus(id, 'READY').expect(200);
    await setStatus(id, 'COMPLETED').expect(200);
    await setStatus(id, 'CANCELLED').expect(409); // COMPLETED là trạng thái kết thúc
  });

  it('không thanh toán lại đơn đã PAID hoặc đã CANCELLED', async () => {
    const paid = await placeOrder();
    await pay(paid).expect(201);
    await pay(paid).expect(409);

    const cancelled = await placeOrder();
    await ctx.http().post(`/orders/${cancelled}/cancel`).set(bearer(customer)).expect(201);
    await pay(cancelled).expect(409);
  });

  it('thanh toán lỗi → PAYMENT_FAILED, thử lại → PAID', async () => {
    const id = await placeOrder();
    const failed = await pay(id, true).expect(201);
    expect(failed.body.payment.status).toBe('FAILED');
    expect(failed.body.order.status).toBe('PAYMENT_FAILED');

    const retry = await pay(id).expect(201);
    expect(retry.body.order.status).toBe('PAID');
  });

  it('khách không được tự đổi trạng thái pha chế', async () => {
    const id = await placeOrder();
    await pay(id).expect(201);
    await setStatus(id, 'PREPARING', customer).expect(403);
  });

  it('hủy đơn hoàn lại tồn kho', async () => {
    const before = await ctx.prisma.product.findUniqueOrThrow({ where: { id: 1 } });
    const id = await placeOrder();
    await ctx.http().post(`/orders/${id}/cancel`).set(bearer(customer)).expect(201);
    const after = await ctx.prisma.product.findUniqueOrThrow({ where: { id: 1 } });
    expect(after.stock).toBe(before.stock);
  });
});
