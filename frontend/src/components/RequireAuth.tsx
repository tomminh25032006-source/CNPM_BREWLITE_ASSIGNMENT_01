'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useMounted } from '@/lib/hooks';
import type { Role } from '@/lib/types';
import { useAuth } from '@/store/auth';
import { EmptyState, Page, PageSpinner } from './ui';

/** Bảo vệ trang cần đăng nhập: chuyển tới /login?next=... nếu chưa có token. */
export function RequireAuth({ children, role }: { children: ReactNode; role?: Role }) {
  const mounted = useMounted();
  const { token, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (mounted && !token) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [mounted, token, pathname, router]);

  if (!mounted || !token) {
    return <PageSpinner />;
  }
  if (role && user?.role !== role) {
    return (
      <Page>
        <EmptyState
          title="Khu vực dành cho nhân viên"
          description="Tài khoản của bạn không có quyền truy cập trang này."
          action={{ label: 'Về trang chủ', href: '/' }}
        />
      </Page>
    );
  }
  return <>{children}</>;
}
