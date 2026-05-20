'use client';

import { AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { toErrorMessage } from '@/lib/utils';
import { CloudflareService } from '@/services/cloudflare.service';
import { DPDNSService } from '@/services/dpdns.service';
import { FirebaseService } from '@/services/firebase.service';
import { useAppStore } from '@/stores/app.store';
import type { DomainRecord } from '@/types';

export function ConfirmDeleteDialog({ domain, open, onOpenChange }: { domain: DomainRecord | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const user = useAppStore((state) => state.user);
  const accounts = useAppStore((state) => state.accounts);
  const [deleteCf, setDeleteCf] = useState(false);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  const associatedAccount = domain ? accounts.find(acc => acc.id === domain.credentialAccountId) : null;
  const isAccountMissing = domain && !associatedAccount && accounts.length > 0;

  useEffect(() => {
    if (domain) {
      setSelectedAccountId(domain.credentialAccountId || (accounts.length > 0 ? accounts[0].id : ''));
      setDeleteCf(false);
      setMessage('');
    }
  }, [domain, accounts]);

  const onDelete = async () => {
    if (!user || !domain) return;
    setSubmitting(true);
    setMessage('');
    try {
      const activeAccount = accounts.find(acc => acc.id === selectedAccountId);

      if (activeAccount) {
        if (activeAccount.dpdnsToken) {
          await DPDNSService.deleteDomain(activeAccount.dpdnsToken, domain.fqdn);
        }
        if (deleteCf && activeAccount.cloudflareEmail && activeAccount.cloudflareApiKey && domain.cloudflare.zone_id) {
          await CloudflareService.deleteZone(activeAccount.cloudflareEmail, activeAccount.cloudflareApiKey, domain.cloudflare.zone_id);
        }
      } else if (selectedAccountId !== 'firebase_only') {
        throw new Error('Please select a valid account or select "Delete from app only"');
      }

      await FirebaseService.deleteDomain(user.uid, domain.fqdn);
      onOpenChange(false);
    } catch (error) {
      setMessage(toErrorMessage(error, 'Delete failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open && !!domain} onOpenChange={onOpenChange} title="Delete Domain" description={`Are you sure you want to remove ${domain?.fqdn}?`}>
      <div className="space-y-5">
        {domain?.status === 'active' ? (
          <div className="flex gap-3 rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Deleting from DPDNS will put it in pendingdelete status. DNS stops immediately, domain released after 7 days.</p>
          </div>
        ) : null}

        {isAccountMissing ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 space-y-2">
            <p className="font-semibold">⚠️ Associated account not found</p>
            <p>The account originally used to register this domain is no longer available. Please select another account to execute the API cleanup, or choose to delete the record from this app only.</p>
          </div>
        ) : null}

        {accounts.length === 0 ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            No accounts configured. This will remove the domain from your database record only, as we cannot connect to DPDNS/Cloudflare APIs.
          </p>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-ink">Account for API Cleanup</label>
              <Select className="mt-2" value={selectedAccountId} onChange={(e) => setSelectedAccountId(e.target.value)} disabled={submitting}>
                <option value="firebase_only">Delete from app only (no DPDNS/Cloudflare API calls)</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.cloudflareEmail})
                  </option>
                ))}
              </Select>
            </div>

            {selectedAccountId !== 'firebase_only' && (
              <label className="flex items-center gap-3 rounded-lg border border-hairline p-4 text-sm text-body">
                <input type="checkbox" className="h-4 w-4" checked={deleteCf} onChange={(event) => setDeleteCf(event.target.checked)} disabled={submitting} />
                Also delete Cloudflare Zone
              </label>
            )}
          </div>
        )}

        {message ? <p className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">{message}</p> : null}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button type="button" variant="danger" onClick={onDelete} disabled={submitting}>{submitting ? 'Deleting…' : 'Delete'}</Button>
        </div>
      </div>
    </Dialog>
  );
}
