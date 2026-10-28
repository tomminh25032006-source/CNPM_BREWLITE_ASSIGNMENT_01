import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/** Nạp .env và trỏ DATABASE_URL sang CSDL test để không đụng dữ liệu dev. */
export function loadTestEnv() {
  const file = join(__dirname, '..', '..', '.env');
  if (existsSync(file)) {
    for (const line of readFileSync(file, 'utf8').replace(/^﻿/, '').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
    }
  }
  const testUrl = process.env.DATABASE_URL_TEST;
  if (!testUrl) throw new Error('Thiếu DATABASE_URL_TEST trong .env');
  process.env.DATABASE_URL = testUrl;
  process.env.JWT_SECRET ??= 'test-secret';
  process.env.MOCK_PAYMENT_DELAY_MS = '30';
}

loadTestEnv();
