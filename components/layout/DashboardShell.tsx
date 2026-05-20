'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopNav } from '@/components/layout/TopNav';
import { useAppStore } from '@/stores/app.store';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAppStore((state) => state.user);
  const authReady = useAppStore((state) => state.authReady);

  useEffect(() => {
    if (authReady && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [authReady, pathname, router, user]);

  if (!authReady || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <div className="rounded-xl border border-hairline bg-white p-8 text-center shadow-card">
          <div className="mx-auto mb-4 h-10 w-10 animate-pulse rounded-full bg-primary/20" />
          <p className="text-sm text-body">Loading secure workspace…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas lg:flex">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <TopNav />
        <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-10">{children}</main>
      </div>
    </div>
  );
}
