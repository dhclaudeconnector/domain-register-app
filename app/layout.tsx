import type { Metadata, Viewport } from 'next';
import './globals.css';
import { FloatMessageProvider } from '@/components/feedback/FloatMessageProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { PWARegistration } from '@/components/providers/PWARegistration';

export const metadata: Metadata = {
  title: 'Domain Register App',
  description: 'Register DPDNS domains through Cloudflare and Firebase automation.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Domain Manager',
  },
  icons: {
    icon: '/favicon.png',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0052ff',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>
        <FloatMessageProvider>
          <AuthProvider>
            <PWARegistration />
            {children}
          </AuthProvider>
        </FloatMessageProvider>
      </body>
    </html>
  );
}
