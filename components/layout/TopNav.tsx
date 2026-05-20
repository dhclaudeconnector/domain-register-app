'use client';

import { Menu, LogOut, UserRound } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { auth } from '@/lib/firebase';
import { useAppStore } from '@/stores/app.store';

export function TopNav() {
  const router = useRouter();
  const user = useAppStore((state) => state.user);
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen);
  const clearCredentials = useAppStore((state) => state.clearCredentials);

  const logout = async () => {
    clearCredentials();
    await signOut(auth);
    router.replace('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-hairline-soft bg-canvas/95 px-4 backdrop-blur md:px-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white">D</span>
          <span className="hidden sm:inline">Domain Register</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-pill border border-hairline px-3 py-2 text-sm text-body sm:flex">
          <UserRound className="h-4 w-4" />
          <span>{user?.displayName || user?.email || 'User'}</span>
        </div>
        <Button variant="ghost" size="icon" onClick={logout} aria-label="Logout">
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
