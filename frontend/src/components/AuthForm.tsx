'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { api, errorMessage } from '@/lib/api';
import type { AuthResponse } from '@/lib/types';
import { useAuth } from '@/store/auth';
import { Alert, Ornament, Spinner } from './ui';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const setSession = useAuth((s) => s.setSession);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(mode === 'login' ? 'demo@brewlite.vn' : '');
  const [password, setPassword] = useState(mode === 'login' ? '123456' : '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isLogin = mode === 'login';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api<AuthResponse>(isLogin ? '/auth/login' : '/auth/register', {
        method: 'POST',
        body: isLogin ? { email, password } : { email, password, fullName },
      });
      setSession(res.accessToken, res.user);
      router.replace(next);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const otherHref = `${isLogin ? '/register' : '/login'}${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`;

  return (
    <div className="mx-auto max-w-md animate-rise">
      <div className="panel relative px-6 py-10 sm:px-10">
        <div className="pointer-events-none absolute inset-2 rounded-xl border border-line" aria-hidden />
        <div className="relative text-center">
          <p className="label-caps">{isLogin ? 'Chào mừng trở lại' : 'Thành viên mới'}</p>
          <h1 className="mt-2 font-display text-4xl font-medium">{isLogin ? 'Đăng nhập' : 'Tạo tài khoản'}</h1>
          <Ornament className="mt-4" />
          <p className="mt-4 text-sm text-ink-soft">
            {isLogin ? 'Đăng nhập để đặt đơn và tích điểm thưởng.' : 'Mỗi 1.000đ thanh toán = 1 điểm thưởng.'}
          </p>
        </div>

        <form onSubmit={submit} className="relative mt-8 space-y-4" noValidate={false}>
          {!isLogin && (
            <Field label="Họ và tên" id="fullName">
              <input id="fullName" className="field" value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={80} autoComplete="name" />
            </Field>
          )}
          <Field label="Email" id="email">
            <input id="email" type="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </Field>
          <Field label="Mật khẩu" id="password" hint={isLogin ? undefined : 'Tối thiểu 6 ký tự'}>
            <input
              id="password"
              type="password"
              className="field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
            />
          </Field>

          {error && <Alert>{error}</Alert>}

          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy && <Spinner />}
            {isLogin ? 'Đăng nhập' : 'Đăng ký'}
          </button>
        </form>

        <p className="relative mt-6 text-center text-sm text-ink-soft">
          {isLogin ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
          <Link href={otherHref} className="font-semibold text-accent underline-offset-4 hover:underline">
            {isLogin ? 'Đăng ký ngay' : 'Đăng nhập'}
          </Link>
        </p>
      </div>
      {isLogin && (
        <p className="mt-4 text-center text-xs text-muted">
          Tài khoản demo: <code>demo@brewlite.vn</code> · Barista: <code>barista@brewlite.vn</code> · mật khẩu <code>123456</code>
        </p>
      )}
    </div>
  );
}

function Field({ label, id, hint, children }: { label: string; id: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex justify-between text-sm font-medium">
        {label}
        {hint && <span className="text-xs font-normal text-muted">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

/** Chỉ cho phép chuyển hướng nội bộ để tránh open redirect. */
function safeNext(raw: string | null) {
  return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
}
