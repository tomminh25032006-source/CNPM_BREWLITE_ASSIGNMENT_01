'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';
import type { User } from '@/lib/types';
import { useAuth } from '@/store/auth';

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );

  // Đồng bộ hồ sơ (điểm thưởng, vai trò) mỗi khi mở app với token đã lưu.
  const token = useAuth((s) => s.token);
  useEffect(() => {
    if (!token) return;
    api<User>('/auth/me')
      .then((u) => useAuth.getState().setUser(u))
      .catch(() => undefined);
  }, [token]);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
