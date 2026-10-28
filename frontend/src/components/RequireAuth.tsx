'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useMounted } from '@/lib/hooks';
import type { Role } from '@/lib/types';
import { useAuth } from '@/store/auth';
import { EmptyState, Spinner } from './ui';

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
    return (
      <div className="grid min-h-[40vh] place-items-center text-muted">
        <Spinner className="size-6" />
      </div>
    );
  }
  if (role && user?.role !== role) {
    return (
      <EmptyState
        title="Khu vực dành cho nhân viên"
        description="Tài khoản của bạn không có quyền truy cập trang này."
        action={{ label: 'Về thực đơn', href: '/' }}
      />
    );
  }
  return <>{children}</>;
}
