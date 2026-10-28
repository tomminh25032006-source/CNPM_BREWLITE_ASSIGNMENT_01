'use client';

import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthModal } from '@/store/authModal';
import { AuthFields, AuthTabs } from './AuthForm';
import { Modal } from './Modal';

/** Popup đăng nhập / đăng ký mở từ thanh điều hướng hoặc từ giỏ hàng. */
export function AuthModal() {
  const router = useRouter();
  const { mode, next, open, close } = useAuthModal();
  if (!mode) return null;
  const isLogin = mode === 'login';

  return (
    <Modal onClose={close} label={isLogin ? 'Đăng nhập' : 'Đăng ký'} className="max-w-md">
      <button
        onClick={close}
        className="absolute right-4 top-4 rounded-full p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
        aria-label="Đóng"
      >
        <X className="size-5" />
      </button>
      <div className="border-b border-stone-100 p-6 pb-5 text-center">
        <h2 className="text-xl font-extrabold text-stone-900">{isLogin ? 'Chào mừng trở lại!' : 'Tạo tài khoản BrewLite'}</h2>
        <p className="mt-1 text-xs text-stone-500">
          {isLogin ? 'Đăng nhập để đặt món và tích điểm thưởng' : 'Mỗi 1.000đ thanh toán = 1 điểm thưởng'}
        </p>
        <AuthTabs
          mode={mode}
          renderTab={(m, cls, label) => (
            <button key={m} type="button" onClick={() => open(m, next ?? undefined)} className={cls}>
              {label}
            </button>
          )}
        />
      </div>
      <div className="p-6">
        <AuthFields
          key={mode}
          mode={mode}
          onSuccess={() => {
            close();
            if (next) router.push(next);
          }}
        />
      </div>
    </Modal>
  );
}
