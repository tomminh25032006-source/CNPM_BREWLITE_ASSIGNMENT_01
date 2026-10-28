import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { join } from 'path';
import { loadTestEnv } from './env';

/**
 * Chuẩn bị CSDL test: tạo database nếu chưa có rồi áp migration (migrate deploy).
 * Mỗi test tự TRUNCATE dữ liệu của mình nên không cần reset cả database.
 */
export default async function globalSetup() {
  loadTestEnv();
  const testUrl = new URL(process.env.DATABASE_URL!);
  const dbName = testUrl.pathname.slice(1);
  if (!/^[a-z0-9_]+$/i.test(dbName)) throw new Error(`Tên CSDL test không hợp lệ: ${dbName}`);

  const adminUrl = new URL(testUrl);
  adminUrl.pathname = '/postgres';
  const admin = new PrismaClient({ datasourceUrl: adminUrl.toString() });
  try {
    const rows = await admin.$queryRaw<unknown[]>`SELECT 1 FROM pg_database WHERE datname = ${dbName}`;
    if (rows.length === 0) await admin.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`);
  } finally {
    await admin.$disconnect();
  }

  execSync('npx prisma migrate deploy', {
    cwd: join(__dirname, '..', '..'),
    env: process.env,
    stdio: 'pipe',
  });
}
