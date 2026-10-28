'use client';

import { useEffect, useState } from 'react';

/** true sau khi component đã mount ở client – tránh lệch hydration với state lưu trong localStorage. */
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

export function newIdempotencyKey() {
  return crypto.randomUUID();
}
