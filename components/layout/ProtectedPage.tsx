import { DashboardShell } from '@/components/layout/DashboardShell';

export function ProtectedPage({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
