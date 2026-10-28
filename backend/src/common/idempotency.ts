import { BadRequestException } from '@nestjs/common';

export const IDEMPOTENCY_HEADER = 'idempotency-key';
const KEY_PATTERN = /^[A-Za-z0-9_\-:.]{8,100}$/;

/** Kiểm tra định dạng header Idempotency-Key (8–100 ký tự an toàn, thường là UUID). */
export function parseIdempotencyKey(raw: string | undefined, required: boolean): string | undefined {
  const key = raw?.trim();
  if (!key) {
    if (required) throw new BadRequestException('Thiếu header Idempotency-Key');
    return undefined;
  }
  if (!KEY_PATTERN.test(key)) throw new BadRequestException('Idempotency-Key không hợp lệ');
  return key;
}
