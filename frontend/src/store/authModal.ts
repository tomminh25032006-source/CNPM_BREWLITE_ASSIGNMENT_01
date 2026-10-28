'use client';

import { create } from 'zustand';

export type AuthMode = 'login' | 'register';

interface AuthModalState {
  mode: AuthMode | null;
  /** Đường dẫn chuyển tới sau khi đăng nhập thành công (vd. /checkout). */
  next: string | null;
  open: (mode?: AuthMode, next?: string) => void;
  close: () => void;
}

export const useAuthModal = create<AuthModalState>()((set) => ({
  mode: null,
  next: null,
  open: (mode = 'login', next) => set({ mode, next: next ?? null }),
  close: () => set({ mode: null, next: null }),
}));
