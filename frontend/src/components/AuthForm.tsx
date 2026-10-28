'use client';

import { AlertCircle, CheckCircle2, Lock, Mail, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent, type ReactNode } from 'react';
import { api, errorMessage } from '@/lib/api';
import type { AuthResponse } from '@/lib/types';
import { useAuth } from '@/store/auth';
import type { AuthMode } from '@/store/authModal';
import { Spinner } from './ui';

const DEMO = { email: 'demo@brewlite.vn', password: '123456' };

/** Form đăng nhập / đăng ký dùng chung cho popup (AuthModal) và trang /login, /register. */
export function AuthFields({ mode, onSuccess }: { mode: AuthMode; onSuccess: () => void }) {
  const setSession = useAuth((s) => s.setSession);
  const isLogin = mode === 'login';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
      onSuccess();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!isLogin && (
        <Field label="Họ và tên" id={`${mode}-fullName`} icon={<UserIcon className="size-4" />}>
          <input
            id={`${mode}-fullName`}
            className="field pl-9"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nguyễn Văn A"
            required
            maxLength={80}
            autoComplete="name"
          />
        </Field>
      )}
      <Field label="Email" id={`${mode}-email`} icon={<Mail className="size-4" />}>
        <input
          id={`${mode}-email`}
          type="email"
          className="field pl-9"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ban@email.com"
          required
          autoComplete="email"
        />
      </Field>
      <Field label="Mật khẩu" id={`${mode}-password`} icon={<Lock className="size-4" />} hint={isLogin ? undefined : 'Tối thiểu 6 ký tự'}>
        <input
          id={`${mode}-password`}
          type="password"
          className="field pl-9"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••"
          required
          minLength={6}
          autoComplete={isLogin ? 'current-password' : 'new-password'}
        />
      </Field>

      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy && <Spinner />}
        {isLogin ? 'Đăng nhập' : 'Tạo tài khoản'}
      </button>

      {isLogin && (
        <div className="border-t border-stone-100 pt-3 text-center">
          <button
            type="button"
            onClick={() => {
              setEmail(DEMO.email);
              setPassword(DEMO.password);
            }}
            className="mx-auto flex items-center justify-center gap-1 text-[11px] font-semibold text-amber-800 underline hover:text-amber-900"
          >
            <CheckCircle2 className="size-3.5 text-amber-700" />
            Điền tài khoản demo ({DEMO.email} / {DEMO.password})
          </button>
          <p className="mt-1.5 text-[11px] text-stone-400">Barista: barista@brewlite.vn · cùng mật khẩu</p>
        </div>
      )}
    </form>
  );
}

/** Trang /login, /register – dùng khi bị chuyển hướng từ trang cần đăng nhập (?next=...). */
export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const next = safeNext(useSearchParams().get('next'));
  const isLogin = mode === 'login';
  const otherHref = `${isLogin ? '/register' : '/login'}${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`;

  return (
    <div className="mx-auto max-w-md animate-rise">
      <div className="panel overflow-hidden">
        <div className="border-b border-stone-100 p-6 pb-5 text-center">
          <h1 className="text-xl font-extrabold text-stone-900">{isLogin ? 'Chào mừng trở lại!' : 'Tạo tài khoản BrewLite'}</h1>
          <p className="mt-1 text-xs text-stone-500">
            {isLogin ? 'Đăng nhập để đặt đơn và tích điểm thưởng.' : 'Mỗi 1.000đ thanh toán = 1 điểm thưởng.'}
          </p>
          <AuthTabs
            mode={mode}
            renderTab={(m, cls, label) =>
              m === mode ? (
                <span key={m} className={cls}>{label}</span>
              ) : (
                <Link key={m} href={otherHref} className={cls}>{label}</Link>
              )
            }
          />
        </div>
        <div className="p-6">
          <AuthFields mode={mode} onSuccess={() => router.replace(next)} />
        </div>
      </div>
    </div>
  );
}

/** Thanh chuyển Đăng nhập / Đăng ký dạng segmented control. */
export function AuthTabs({
  mode,
  renderTab,
}: {
  mode: AuthMode;
  renderTab: (m: AuthMode, className: string, label: string) => ReactNode;
}) {
  const tabs: [AuthMode, string][] = [
    ['login', 'Đăng nhập'],
    ['register', 'Đăng ký'],
  ];
  return (
    <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1">
      {tabs.map(([m, label]) =>
        renderTab(
          m,
          `rounded-lg py-1.5 text-xs font-bold transition ${
            m === mode ? 'bg-white text-amber-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'
          }`,
          label,
        ),
      )}
    </div>
  );
}

function Field({ label, id, icon, hint, children }: { label: string; id: string; icon: ReactNode; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 flex justify-between text-xs font-bold text-stone-700">
        {label}
        {hint && <span className="font-normal text-stone-400">{hint}</span>}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">{icon}</span>
        {children}
      </div>
    </div>
  );
}

/** Chỉ cho phép chuyển hướng nội bộ để tránh open redirect. */
export function safeNext(raw: string | null) {
  return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
}
