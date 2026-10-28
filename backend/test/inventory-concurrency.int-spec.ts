import { bearer, createTestApp, registerUser, resetData, TestContext } from './helpers';

/** Tiêu chí (c): nhiều khách đặt đồng thời không làm bán vượt tồn kho. */
describe('(c) Kiểm soát tồn kho khi đặt đồng thời', () => {
  let ctx: TestContext;
  let tokens: string[];
  const COLD_BREW = 2; // tồn kho ban đầu = 5

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(() => ctx.app.close());

  beforeEach(async () => {
    await resetData(ctx.prisma);
    tokens = await Promise.all(Array.from({ length: 12 }, async () => (await registerUser(ctx)).token));
  });

  const order = (token: string, qty: number) =>
    ctx.http()
      .post('/orders')
      .set(bearer(token))
      .send({ items: [{ productId: COLD_BREW, size: 'M', qty }] });

  async function soldQty() {
    const agg = await ctx.prisma.orderItem.aggregate({ _sum: { qty: true }, where: { productId: COLD_BREW } });
    return agg._sum.qty ?? 0;
  }

  it('12 khách cùng đặt 1 ly khi chỉ còn 5 → đúng 5 đơn thành công, tồn kho về 0', async () => {
    const responses = await Promise.all(tokens.map((t) => order(t, 1)));

    const ok = responses.filter((r) => r.status === 201);
    const rejected = responses.filter((r) => r.status === 409);
    expect(ok).toHaveLength(5);
    expect(rejected).toHaveLength(7);
    expect(rejected.every((r) => r.body.error === 'OutOfStock')).toBe(true);

    const product = await ctx.prisma.product.findUniqueOrThrow({ where: { id: COLD_BREW } });
    expect(product.stock).toBe(0);
    expect(await soldQty()).toBe(5);
  });

  it('đặt song song nhiều ly mỗi đơn → tổng bán không vượt tồn kho, không âm kho', async () => {
    const responses = await Promise.all(tokens.slice(0, 6).map((t) => order(t, 2)));

    const ok = responses.filter((r) => r.status === 201);
    expect(ok).toHaveLength(2); // 2 + 2 = 4 ≤ 5, đơn thứ 3 cần 2 nhưng chỉ còn 1

    const product = await ctx.prisma.product.findUniqueOrThrow({ where: { id: COLD_BREW } });
    expect(product.stock).toBe(1);
    expect(product.stock).toBeGreaterThanOrEqual(0);
    expect(await soldQty()).toBe(4);
  });

  it('một đơn có nhiều dòng cùng sản phẩm được cộng dồn khi kiểm tra kho', async () => {
    const res = await ctx.http()
      .post('/orders')
      .set(bearer(tokens[0]))
      .send({
        items: [
          { productId: COLD_BREW, size: 'S', qty: 3 },
          { productId: COLD_BREW, size: 'L', qty: 3 },
        ],
      })
      .expect(409);
    expect(res.body.error).toBe('OutOfStock');
    const product = await ctx.prisma.product.findUniqueOrThrow({ where: { id: COLD_BREW } });
    expect(product.stock).toBe(5);
  });
});
