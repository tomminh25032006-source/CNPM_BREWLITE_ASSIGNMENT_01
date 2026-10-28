import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Ảnh minh họa từ Unsplash (cần internet khi chạy demo)
const unsplash = (photo: string) => `https://images.unsplash.com/photo-${photo}?auto=format&fit=crop&w=600&q=80`;

const products = [
  { id: 1, name: 'Cà phê sữa', category: 'Cà phê', price: 35_000, photo: '1461023058943-07fcbe16d735', stock: 120,
    description: 'Robusta Buôn Ma Thuột phin chậm, hòa cùng sữa đặc – vị đậm, béo, rất Sài Gòn.' },
  { id: 2, name: 'Cà phê đen', category: 'Cà phê', price: 29_000, photo: '1514432324607-a09d9b4aefdd', stock: 120,
    description: 'Phin truyền thống, đắng sâu, hậu ngọt. Dành cho người mê vị nguyên bản.' },
  { id: 3, name: 'Bạc xỉu', category: 'Cà phê', price: 39_000, photo: '1509042239860-f550ce710b93', stock: 80,
    description: 'Nhiều sữa, ít cà phê – dịu nhẹ, thơm béo như ly cà phê sáng của người Hoa Chợ Lớn.' },
  { id: 4, name: 'Americano', category: 'Espresso', price: 40_000, photo: '1551030173-122aabc4489c', stock: 100,
    description: 'Hai shot espresso Arabica Cầu Đất pha loãng, thanh và sạch vị.' },
  { id: 5, name: 'Cappuccino', category: 'Espresso', price: 45_000, photo: '1572442388796-11668a67e53d', stock: 100,
    description: 'Espresso, sữa nóng và lớp foam dày mịn theo tỉ lệ cổ điển 1:1:1.' },
  { id: 6, name: 'Latte', category: 'Espresso', price: 49_000, photo: '1541167760496-1628856ab772', stock: 100,
    description: 'Espresso êm mượt trong nhiều sữa tươi đánh nóng, điểm latte art.' },
  { id: 7, name: 'Trà đào', category: 'Trà', price: 39_000, photo: '1556679343-c7306c1976bc', stock: 90,
    description: 'Trà đen ủ lạnh, đào ngâm giòn và sả tươi – mát lành cho buổi trưa.' },
  { id: 8, name: 'Trà vải hoa hồng', category: 'Trà', price: 42_000, photo: '1499638673689-79a0b5115d87', stock: 70,
    description: 'Trà xanh nhài, vải thiều mọng nước và chút hương hồng.' },
  { id: 9, name: 'Trà sữa ô long', category: 'Trà', price: 45_000, photo: '1576092768241-dec231879fc3', stock: 60,
    description: 'Ô long rang Bảo Lộc nấu cùng sữa tươi, thơm khói nhẹ.' },
  { id: 10, name: 'Matcha latte', category: 'Đặc biệt', price: 52_000, photo: '1536256263959-770b48d82b0a', stock: 40,
    description: 'Matcha Uji đánh tay với sữa tươi, xanh đậm và ngọt hậu.' },
  { id: 11, name: 'Cold brew cam sả', category: 'Đặc biệt', price: 55_000, photo: '1517701604599-bb29b565090c', stock: 5,
    description: 'Cold brew ủ 18 giờ, cam vàng và sả – mẻ nhỏ mỗi ngày, số lượng có hạn.' },
  { id: 12, name: 'Cacao đá', category: 'Đặc biệt', price: 39_000, photo: '1542990253-0d0f5be5f0ed', stock: 60,
    description: 'Cacao Bến Tre nguyên chất, đậm đà, ít ngọt.' },
];

const toppings = [
  { id: 1, name: 'Trân châu đen', price: 8_000 },
  { id: 2, name: 'Kem cheese', price: 10_000 },
  { id: 3, name: 'Thạch cà phê', price: 7_000 },
  { id: 4, name: 'Thêm shot espresso', price: 12_000 },
];

const coupons = [
  { code: 'CHAOBAN', description: 'Giảm 10% cho mọi đơn (tối đa 20.000đ)', type: 'PERCENT' as const,
    value: 10, maxDiscount: 20_000, minSubtotal: 0 },
  { code: 'GIAM20K', description: 'Giảm 20.000đ cho đơn từ 100.000đ', type: 'FIXED' as const,
    value: 20_000, minSubtotal: 100_000 },
  { code: 'BREW50', description: 'Giảm 50% tối đa 30.000đ – 100 lượt đầu tiên', type: 'PERCENT' as const,
    value: 50, maxDiscount: 30_000, minSubtotal: 0, usageLimit: 100 },
  { code: 'HETHAN', description: 'Mã khuyến mãi mùa hè 2025', type: 'PERCENT' as const,
    value: 30, minSubtotal: 0, expiresAt: new Date('2025-08-31T23:59:59Z') },
];

async function main() {
  for (const { photo, ...p } of products) {
    const data = { ...p, imageUrl: unsplash(photo) };
    await prisma.product.upsert({ where: { id: p.id }, update: data, create: data });
  }
  for (const t of toppings) {
    await prisma.topping.upsert({ where: { id: t.id }, update: t, create: t });
  }
  for (const c of coupons) {
    await prisma.coupon.upsert({ where: { code: c.code }, update: c, create: c });
  }

  const passwordHash = await bcrypt.hash('123456', 10);
  await prisma.user.upsert({
    where: { email: 'demo@brewlite.vn' },
    update: {},
    create: { email: 'demo@brewlite.vn', fullName: 'Khách Demo', passwordHash },
  });
  await prisma.user.upsert({
    where: { email: 'barista@brewlite.vn' },
    update: { role: 'STAFF' },
    create: { email: 'barista@brewlite.vn', fullName: 'Barista Quầy 1', passwordHash, role: 'STAFF' },
  });

  // Các bảng dùng id cố định ở trên nên cần đẩy sequence lên tránh trùng khóa khi thêm mới.
  await prisma.$executeRawUnsafe(`SELECT setval('"Product_id_seq"', (SELECT MAX(id) FROM "Product"))`);
  await prisma.$executeRawUnsafe(`SELECT setval('"Topping_id_seq"', (SELECT MAX(id) FROM "Topping"))`);

  console.log(`Seeded ${products.length} sản phẩm, ${toppings.length} topping, ${coupons.length} mã giảm giá, 2 tài khoản.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
