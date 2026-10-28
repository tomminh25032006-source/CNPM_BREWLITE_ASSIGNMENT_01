import { Suspense } from 'react';
import { AuthForm } from '@/components/AuthForm';

export const metadata = { title: 'Đăng ký' };

export default function RegisterPage() {
  return (
    <div className="px-4 py-12">
      <Suspense>
        <AuthForm mode="register" />
      </Suspense>
    </div>
  );
}
