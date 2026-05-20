'use client';

import { Globe2, Plus, Search, RefreshCw } from 'lucide-react';
import { ProtectedPage } from '@/components/layout/ProtectedPage';
import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDeleteDialog } from '@/components/domain/ConfirmDeleteDialog';
import { DomainRow } from '@/components/domain/DomainRow';
import { EditDomainModal } from '@/components/domain/EditDomainModal';
import { RegisterModal } from '@/components/domain/RegisterModal';
import { FirebaseService } from '@/services/firebase.service';
import { DPDNSService } from '@/services/dpdns.service';
import { useFloatMessage } from '@/components/feedback/FloatMessageProvider';
import { useAppStore } from '@/stores/app.store';
import type { DomainRecord } from '@/types';

export default function DashboardPage() {
  const user = useAppStore((state) => state.user);
  const domains = useAppStore((state) => state.domains);
  const accounts = useAppStore((state) => state.accounts);
  const setDomains = useAppStore((state) => state.setDomains);
  
  const { notifySuccess, notifyError } = useFloatMessage();
  const [registerOpen, setRegisterOpen] = useState(false);
  const [editDomain, setEditDomain] = useState<DomainRecord | null>(null);
  const [deleteDomain, setDeleteDomain] = useState<DomainRecord | null>(null);

  // Filters State
  const [search, setSearch] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedNamespace, setSelectedNamespace] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (!user) return;
    return FirebaseService.subscribeDomains(user.uid, setDomains);
  }, [setDomains, user]);

  // Compute Filtered Domains
  const filteredDomains = useMemo(() => {
    return domains.filter((domain) => {
      const matchSearch = domain.fqdn.toLowerCase().includes(search.toLowerCase());
      const matchAccount = selectedAccountId ? domain.credentialAccountId === selectedAccountId : true;
      const matchNamespace = selectedNamespace ? domain.namespace === selectedNamespace : true;
      return matchSearch && matchAccount && matchNamespace;
    });
  }, [domains, search, selectedAccountId, selectedNamespace]);

  // Sync Expiry Dates Logic
  const syncAllExpiryDates = async (force = false) => {
    if (!user || accounts.length === 0 || isSyncing) return;
    setIsSyncing(true);
    let updatedCount = 0;
    
    try {
      for (const account of accounts) {
        if (!account.dpdnsToken) continue;
        try {
          const res = await DPDNSService.listDomains(account.dpdnsToken);
          if (res.success && Array.isArray(res.data)) {
            for (const apiDomain of (res.data as any[])) {
              if (apiDomain.name && apiDomain.expiry_date) {
                // Find matching domain record in firebase
                const localDomain = domains.find((d) => d.fqdn === apiDomain.name);
                if (localDomain && localDomain.expiry_date !== apiDomain.expiry_date) {
                  await FirebaseService.updateDomain(user.uid, localDomain.fqdn, {
                    expiry_date: apiDomain.expiry_date,
                  });
                  updatedCount++;
                }
              }
            }
          }
        } catch (err) {
          console.error(`Failed to sync expiry for account ${account.name}`, err);
        }
      }
      localStorage.setItem(`last_expiry_sync_${user.uid}`, Date.now().toString());
      if (force) {
        notifySuccess('Sync Expiry Dates', `Synchronized successfully. Updated ${updatedCount} domains.`);
      }
    } catch (error) {
      console.error('Error syncing domains expiry:', error);
      if (force) {
        notifyError('Sync Expiry Dates', error);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Hourly background sync triggering on mount
  useEffect(() => {
    if (!user || accounts.length === 0 || domains.length === 0) return;
    
    const lastSync = localStorage.getItem(`last_expiry_sync_${user.uid}`);
    const oneHour = 60 * 60 * 1000;
    
    if (!lastSync || Date.now() - parseInt(lastSync, 10) > oneHour) {
      syncAllExpiryDates(false);
    }
  }, [user, accounts, domains.length]);

  return (
    <ProtectedPage>
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Dashboard</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-ink">Your Domains</h1>
          <p className="mt-2 text-body">Realtime list sorted by newest registration first.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => syncAllExpiryDates(true)} disabled={isSyncing || !accounts.length}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Expiry'}
          </Button>
          <Button onClick={() => setRegisterOpen(true)}>
            <Plus className="mr-2 h-5 w-5" /> Register New Domain
          </Button>
        </div>
      </div>

      {/* Filters Toolbar */}
      {domains.length > 0 && (
        <div className="mb-6 flex flex-col gap-4 rounded-xl border border-hairline bg-white p-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-body" />
            <input
              type="text"
              placeholder="Search by domain name (e.g. app.dpdns.org)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-hairline bg-canvas py-2.5 pl-11 pr-4 text-sm text-ink placeholder:text-body focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="rounded-lg border border-hairline bg-canvas px-4 py-2.5 text-sm font-medium text-ink focus:border-primary focus:outline-none"
            >
              <option value="">All Accounts</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.cloudflareEmail})
                </option>
              ))}
            </select>

            <select
              value={selectedNamespace}
              onChange={(e) => setSelectedNamespace(e.target.value)}
              className="rounded-lg border border-hairline bg-canvas px-4 py-2.5 text-sm font-medium text-ink focus:border-primary focus:outline-none"
            >
              <option value="">All Namespaces</option>
              <option value=".dpdns.org">.dpdns.org</option>
              <option value=".us.kg">.us.kg</option>
              <option value=".qzz.io">.qzz.io</option>
              <option value=".xx.kg">.xx.kg</option>
            </select>
          </div>
        </div>
      )}

      <section className="feature-card">
        {domains.length ? (
          filteredDomains.length ? (
            <div className="divide-y-0">
              {filteredDomains.map((domain) => (
                <DomainRow key={domain.fqdn} domain={domain} onEdit={() => setEditDomain(domain)} onDelete={() => setDeleteDomain(domain)} />
              ))}
            </div>
          ) : (
            <div className="py-16 text-center">
              <p className="text-base text-body">No domains match your search filters.</p>
              <Button variant="ghost" className="mt-4" onClick={() => { setSearch(''); setSelectedAccountId(''); setSelectedNamespace(''); }}>Clear Filters</Button>
            </div>
          )
        ) : (
          <div className="py-16 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-surface-soft text-primary">
              <Globe2 className="h-7 w-7" />
            </div>
            <h2 className="text-2xl font-semibold text-ink">No domains yet</h2>
            <p className="mx-auto mt-2 max-w-md text-body">Save credentials in Settings, then register your first DPDNS domain with Cloudflare nameservers.</p>
            <Button className="mt-6" onClick={() => setRegisterOpen(true)}>Register New Domain</Button>
          </div>
        )}
      </section>

      <RegisterModal open={registerOpen} onOpenChange={setRegisterOpen} />
      <EditDomainModal domain={editDomain} open={!!editDomain} onOpenChange={(open) => !open && setEditDomain(null)} />
      <ConfirmDeleteDialog domain={deleteDomain} open={!!deleteDomain} onOpenChange={(open) => !open && setDeleteDomain(null)} />
    </ProtectedPage>
  );
}
