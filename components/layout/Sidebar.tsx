'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Globe, LogOut, PanelLeftClose, PanelLeftOpen, Settings, X } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { auth } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/app.store';

const navItems = [
  { href: '/', label: 'Dashboard', icon: Globe },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAppStore((state) => state.user);
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen);
  const sidebarCollapsed = useAppStore((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = useAppStore((state) => state.setSidebarCollapsed);
  const clearCredentials = useAppStore((state) => state.clearCredentials);

  const logout = async () => {
    clearCredentials();
    await signOut(auth);
    router.replace('/login');
  };

  return (
    <>
      <div
        className={cn('fixed inset-0 z-40 bg-black/30 transition lg:hidden', sidebarOpen ? 'block' : 'hidden')}
        onClick={() => setSidebarOpen(false)}
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-hairline-soft bg-white transition-transform duration-200 lg:sticky lg:top-0 lg:z-20 lg:h-screen lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          sidebarCollapsed && 'lg:w-16',
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-hairline-soft px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold" onClick={() => setSidebarOpen(false)}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white">D</span>
            {!sidebarCollapsed ? <span>Domain Register</span> : null}
          </Link>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={sidebarCollapsed ? item.label : undefined}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex h-11 items-center gap-3 rounded-pill px-3 text-sm font-semibold transition',
                  active ? 'bg-primary text-white' : 'text-body hover:bg-surface-soft hover:text-ink',
                  sidebarCollapsed && 'lg:justify-center lg:px-0',
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!sidebarCollapsed ? <span>{item.label}</span> : null}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-hairline-soft p-3">
          <Button
            variant="ghost"
            className={cn('mb-3 hidden w-full lg:flex', sidebarCollapsed && 'justify-center px-0')}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <><PanelLeftClose className="mr-2 h-5 w-5" /> Collapse</>}
          </Button>

          <div className={cn('mb-3 rounded-lg bg-surface-soft p-3 text-sm', sidebarCollapsed && 'lg:hidden')}>
            <p className="truncate font-semibold text-ink">{user?.displayName || 'Signed in'}</p>
            <p className="truncate text-xs text-muted">{user?.email}</p>
          </div>
          <Button variant="ghost" className={cn('w-full justify-start', sidebarCollapsed && 'lg:justify-center lg:px-0')} onClick={logout}>
            <LogOut className={cn('h-5 w-5', !sidebarCollapsed && 'mr-2')} />
            {!sidebarCollapsed ? 'Logout' : null}
          </Button>
        </div>
      </aside>
    </>
  );
}
