import type { DomainStatus } from '@/types';
import { cn } from '@/lib/utils';

const statusCopy: Record<DomainStatus, string> = {
  active: 'Active',
  pending: 'Pending',
  error: 'Error',
  deleted: 'Pending delete',
};

const statusClasses: Record<DomainStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
  error: 'bg-red-50 text-red-700',
  deleted: 'bg-red-50 text-red-700',
};

const dotClasses: Record<DomainStatus, string> = {
  active: 'bg-semantic-up',
  pending: 'bg-amber-500',
  error: 'bg-semantic-down',
  deleted: 'bg-semantic-down',
};

export function StatusBadge({ status, withLabel = true }: { status: DomainStatus; withLabel?: boolean }) {
  return (
    <span
      className={cn('pill-badge gap-2', statusClasses[status])}
      title={status === 'deleted' ? 'DNS stops immediately. Domain release after 7 days.' : undefined}
    >
      <span className={cn('h-2 w-2 rounded-full', dotClasses[status])} />
      {withLabel ? statusCopy[status] : null}
    </span>
  );
}
