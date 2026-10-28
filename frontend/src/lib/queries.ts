'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from './api';
import type { CouponCheck } from './types';

/** Kiểm tra lại mã giảm giá mỗi khi tạm tính thay đổi (điều kiện đơn tối thiểu). */
export function useCouponCheck(code: string | null, subtotal: number) {
  return useQuery({
    queryKey: ['coupon', code, subtotal],
    queryFn: () => api<CouponCheck>(`/promotions/validate?code=${encodeURIComponent(code!)}&subtotal=${subtotal}`),
    enabled: !!code && subtotal > 0,
    placeholderData: keepPreviousData,
  });
}
