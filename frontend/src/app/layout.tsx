import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { AuthModal } from '@/components/AuthModal';
import { Navbar } from '@/components/Navbar';
import { Providers } from '@/components/Providers';
import { Toaster } from '@/components/Toaster';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin', 'vietnamese'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
});

export const metadata: Metadata = {
  title: { default: 'BrewLite | Đặt Cà Phê Không Dùng Tiền Mặt', template: '%s · BrewLite' },
  description:
    'BrewLite giúp khách hàng đặt và thanh toán đồ uống không dùng tiền mặt chỉ trong vài chạm, giảm thời gian xếp hàng và nhận đơn nhanh tại quầy.',
  manifest: '/manifest.json',
  icons: { icon: '/icons/icon-192.png', apple: '/icons/icon-192.png' },
  appleWebApp: { capable: true, title: 'BrewLite', statusBarStyle: 'default' },
};

// Mobile-first
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#92400E',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={jakarta.variable}>
      <body className="flex min-h-dvh flex-col antialiased">
        <Providers>
          <Navbar />
          <main className="w-full flex-1">{children}</main>
          <Footer />
          <AuthModal />
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-stone-200/80 bg-white py-8 text-center text-xs text-stone-500">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row">
        <div className="flex items-center gap-2">
          <div className="grid size-7 place-items-center rounded-lg bg-amber-800 text-xs font-black text-white">B</div>
          <span className="text-sm font-extrabold text-stone-900">BrewLite Coffee Roasters</span>
        </div>
        <p className="font-medium">Trải nghiệm đặt món nhanh chóng &amp; thanh toán không tiền mặt tại quầy</p>
        <div className="font-semibold text-stone-400">Hotline: 1900 6868 • 07:00 - 22:00</div>
      </div>
    </footer>
  );
}
