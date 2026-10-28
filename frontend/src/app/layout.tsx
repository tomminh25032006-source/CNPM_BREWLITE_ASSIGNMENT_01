import type { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro, Fraunces } from 'next/font/google';
import { Providers } from '@/components/Providers';
import { SiteHeader } from '@/components/SiteHeader';
import { Toaster } from '@/components/Toaster';
import './globals.css';

const fraunces = Fraunces({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-fraunces',
  style: ['normal', 'italic'],
  axes: ['SOFT', 'opsz'],
});

const body = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
});

export const metadata: Metadata = {
  title: { default: 'BrewLite – Đặt cà phê không tiền mặt', template: '%s · BrewLite' },
  description: 'Đặt và thanh toán đồ uống không dùng tiền mặt chỉ trong vài chạm, nhận nước nhanh tại quầy.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4ede1' },
    { media: '(prefers-color-scheme: dark)', color: '#16110d' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${fraunces.variable} ${body.variable}`}>
      <body>
        <Providers>
          <SiteHeader />
          <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-10 sm:px-6 sm:pt-14">{children}</main>
          <footer className="border-t border-line">
            <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 py-10 text-center text-sm text-muted sm:px-6">
              <p className="font-display text-lg italic text-ink-soft">
                “Đặt và thanh toán không tiền mặt chỉ trong vài chạm.”
              </p>
              <p className="label-caps">BrewLite · Đồ án Công nghệ Phần mềm · 2026</p>
            </div>
          </footer>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
