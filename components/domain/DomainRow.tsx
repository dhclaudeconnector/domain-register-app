'use client';

import { Copy, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/layout/StatusBadge';
import { formatDateTime } from '@/lib/utils';
import { useAppStore } from '@/stores/app.store';
import type { DomainRecord } from '@/types';

export function DomainRow({ domain, onEdit, onDelete }: { domain: DomainRecord; onEdit: () => void; onDelete: () => void }) {
  const accounts = useAppStore((state) => state.accounts);
  
  const associatedAccount = accounts.find(acc => acc.id === domain.credentialAccountId);
  
  const copyNameservers = async () => {
    await navigator.clipboard.writeText(domain.cloudflare.nameservers.join('\n'));
  };

  const ageInDays = Math.floor((Date.now() - domain.created_at) / (1000 * 60 * 60 * 24));

  return (
    <div className="asset-row">
      <div className="flex min-w-0 items-start gap-4">
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-strong">
          <StatusBadge status={domain.status} withLabel={false} />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="break-all text-lg font-semibold tracking-tight text-ink">{domain.fqdn}</h3>
            <span className="pill-badge bg-surface-soft text-body">{domain.namespace}</span>
            {associatedAccount && (
              <span className="pill-badge bg-blue-50 text-blue-700 font-medium" title={`Managed by account: ${associatedAccount.name}`}>
                CF: {associatedAccount.cloudflareEmail}
              </span>
            )}
            {ageInDays >= 60 && (
              <span className="pill-badge bg-orange-50 text-orange-700 border border-orange-200 font-medium" title="Domain is eligible for DPDNS renewal (60+ days old)">
                Renewable (60+ days)
              </span>
            )}
            {domain.expiry_date && (
              <span className="pill-badge bg-purple-50 text-purple-700 border border-purple-200 font-medium" title={`Expires on ${domain.expiry_date}`}>
                Expires: {domain.expiry_date}
              </span>
            )}
            <StatusBadge status={domain.status} />
          </div>
          <p className="mt-1 text-sm text-body">
            Created: {formatDateTime(domain.created_at)} · Age: {ageInDays} {ageInDays === 1 ? 'day' : 'days'}
          </p>
          {domain.notes ? <p className="mt-2 max-w-2xl text-sm text-body">{domain.notes}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {domain.cloudflare.nameservers.map((ns) => (
              <code key={ns} className="rounded-pill bg-surface-soft px-3 py-1 font-mono text-xs text-body">
                {ns}
              </code>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end md:self-center">
        <Button variant="ghost" size="icon" onClick={copyNameservers} aria-label="Copy nameservers" title="Copy nameservers">
          <Copy className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Edit domain" title="Edit domain">
          <Pencil className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Delete domain" title="Delete domain">
          <Trash2 className="h-5 w-5 text-semantic-down" />
        </Button>
      </div>
    </div>
  );
}

