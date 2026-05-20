'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useFloatMessage } from '@/components/feedback/FloatMessageProvider';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { StepIndicator } from '@/components/domain/StepIndicator';
import { registerDomainSchema, type RegisterDomainValues } from '@/lib/validators';
import { toErrorMessage } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { CloudflareService } from '@/services/cloudflare.service';
import { DPDNSService } from '@/services/dpdns.service';
import { FirebaseService } from '@/services/firebase.service';
import { useAppStore } from '@/stores/app.store';
import type { Namespace, SlotType, Step } from '@/types';

const initialSteps: Step[] = [
  { label: 'Create Cloudflare Zone', status: 'idle' },
  { label: 'Extract Nameservers', status: 'idle' },
  { label: 'Register on DPDNS', status: 'idle' },
];

export function getSlotType(namespace: Namespace): SlotType {
  return namespace === '.dpdns.org' || namespace === '.qzz.io' ? 'free' : 'paid';
}

export function RegisterModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const user = useAppStore((state) => state.user);
  const accounts = useAppStore((state) => state.accounts);
  const domains = useAppStore((state) => state.domains);
  const { notifySuccess } = useFloatMessage();

  // Tabs state: 'auto' (Standard CF+DPDNS) or 'manual' (Import directly to Firebase)
  const [activeTab, setActiveTab] = useState<'auto' | 'manual'>('auto');

  // Auto Registration State
  const [steps, setSteps] = useState<Step[]>(initialSteps);
  const [errorMessage, setErrorMessage] = useState('');

  // Manual Import State
  const [manualSubdomain, setManualSubdomain] = useState('');
  const [manualNamespace, setManualNamespace] = useState<Namespace>('.dpdns.org');
  const [manualAccountId, setManualAccountId] = useState('');
  const [manualZoneId, setManualZoneId] = useState('');
  const [manualNameservers, setManualNameservers] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [isManualSubmitting, setIsManualSubmitting] = useState(false);
  const [manualError, setManualError] = useState('');

  const form = useForm<RegisterDomainValues>({
    resolver: zodResolver(registerDomainSchema),
    defaultValues: { subdomain: '', namespace: '.dpdns.org', accountId: '' },
    values: {
      subdomain: '',
      namespace: '.dpdns.org',
      accountId: accounts.length === 1 ? accounts[0].id : '',
    }
  });

  const namespace = form.watch('namespace') as Namespace;
  const subdomain = form.watch('subdomain');
  const fqdn = useMemo(() => (subdomain ? `${subdomain.toLowerCase()}${namespace}` : `your-domain${namespace}`), [namespace, subdomain]);
  const slotType = getSlotType(namespace);

  const setStep = (index: number, patch: Partial<Step>) => {
    setSteps((current) => current.map((step, idx) => (idx === index ? { ...step, ...patch } : step)));
  };

  const resetAutoForm = () => {
    setSteps(initialSteps);
    setErrorMessage('');
  };

  const onAutoSubmit = async (values: RegisterDomainValues) => {
    if (!user) return;
    
    const selectedAccount = accounts.find((acc) => acc.id === values.accountId);
    if (!selectedAccount) {
      setErrorMessage('Please select a valid account.');
      return;
    }
    
    if (!selectedAccount.dpdnsToken || !selectedAccount.cloudflareApiKey || !selectedAccount.cloudflareAccountId) {
      onOpenChange(false);
      router.push('/settings');
      return;
    }

    resetAutoForm();
    const domainName = `${values.subdomain.toLowerCase().trim()}${values.namespace}`;
    const resolvedSlotType = getSlotType(values.namespace as Namespace);
    let cloudflareZoneId: string | null = null;
    let currentStep = 0;

    try {
      currentStep = 0;
      setStep(0, { status: 'loading', detail: domainName });
      const cfZone = await CloudflareService.createZone(
        selectedAccount.cloudflareEmail,
        selectedAccount.cloudflareApiKey,
        selectedAccount.cloudflareAccountId,
        domainName,
      );
      cloudflareZoneId = cfZone.id;
      setStep(0, { status: 'success', detail: `Zone ID: ${cfZone.id}` });

      currentStep = 1;
      if (!cfZone.name_servers?.length) {
        throw new Error('Cloudflare did not return nameservers.');
      }
      setStep(1, { status: 'success', detail: cfZone.name_servers.join(', ') });

      currentStep = 2;
      setStep(2, { status: 'loading', detail: `${domainName} · slot_type=${resolvedSlotType}` });
      await DPDNSService.registerDomain(selectedAccount.dpdnsToken, domainName, resolvedSlotType, cfZone.name_servers);
      setStep(2, { status: 'success', detail: 'DPDNS registration completed.' });

      const now = Date.now();
      await FirebaseService.saveDomain(user.uid, {
        name: values.subdomain.toLowerCase().trim(),
        namespace: values.namespace as Namespace,
        fqdn: domainName,
        cloudflare: { zone_id: cfZone.id, nameservers: cfZone.name_servers },
        dpdns: { registered: true, registration_response: 'success' },
        status: 'active',
        notes: '',
        created_at: now,
        updated_at: now,
        credentialAccountId: selectedAccount.id,
      });

      window.setTimeout(() => {
        form.reset();
        onOpenChange(false);
        resetAutoForm();
      }, 700);
    } catch (error) {
      setStep(currentStep, { status: 'error', detail: toErrorMessage(error) });
      if (cloudflareZoneId) {
        try {
          logger.info('Cloudflare API', `Registration failed. Attempting to rollback Cloudflare zone ${cloudflareZoneId}...`);
          await CloudflareService.deleteZone(
            selectedAccount.cloudflareEmail,
            selectedAccount.cloudflareApiKey,
            cloudflareZoneId
          );
          logger.info('Cloudflare API', `Rollback successful: Zone ${cloudflareZoneId} deleted.`);
        } catch (rollbackError) {
          logger.error('Cloudflare API', `Rollback failed: Unable to delete zone ${cloudflareZoneId}`, rollbackError);
        }
      }
      setErrorMessage(toErrorMessage(error, 'Registration failed'));
    }
  };

  const onManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!manualAccountId) {
      setManualError('Please select a credential account.');
      return;
    }
    if (!manualSubdomain) {
      setManualError('Please enter a subdomain.');
      return;
    }

    setIsManualSubmitting(true);
    setManualError('');

    try {
      const fqdnManual = `${manualSubdomain.toLowerCase().trim()}${manualNamespace}`;
      const nameserverList = manualNameservers
        .split(/[\n,]+/)
        .map((ns) => ns.trim())
        .filter((ns) => ns.length > 0);

      await FirebaseService.saveDomain(user.uid, {
        name: manualSubdomain.toLowerCase().trim(),
        namespace: manualNamespace,
        fqdn: fqdnManual,
        cloudflare: {
          zone_id: manualZoneId.trim(),
          nameservers: nameserverList,
        },
        dpdns: {
          registered: true,
          registration_response: 'manual',
        },
        status: 'active',
        notes: manualNotes.trim(),
        created_at: Date.now(),
        updated_at: Date.now(),
        credentialAccountId: manualAccountId,
      });

      notifySuccess('Import Domain', `${fqdnManual} imported manually successfully.`);
      
      // Reset State & Close
      setManualSubdomain('');
      setManualZoneId('');
      setManualNameservers('');
      setManualNotes('');
      onOpenChange(false);
    } catch (err) {
      setManualError(toErrorMessage(err, 'Manual import failed'));
    } finally {
      setIsManualSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Add Domain" description="Register a new domain automatically or import an existing DPDNS domain manually.">
      <div className="mb-6 flex border-b border-hairline">
        <button
          type="button"
          className={`flex-1 pb-3 text-center text-sm font-semibold border-b-2 transition-all ${activeTab === 'auto' ? 'border-primary text-primary' : 'border-transparent text-body hover:text-ink'}`}
          onClick={() => setActiveTab('auto')}
        >
          Auto Register
        </button>
        <button
          type="button"
          className={`flex-1 pb-3 text-center text-sm font-semibold border-b-2 transition-all ${activeTab === 'manual' ? 'border-primary text-primary' : 'border-transparent text-body hover:text-ink'}`}
          onClick={() => setActiveTab('manual')}
        >
          Manual Add
        </button>
      </div>

      {activeTab === 'auto' ? (
        <form onSubmit={form.handleSubmit(onAutoSubmit)} className="space-y-6">
          {accounts.length === 0 ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <p className="font-semibold">No credentials configured</p>
              <p className="mt-1">You must configure at least one DPDNS / Cloudflare account in Settings before you can register domains.</p>
              <Button type="button" variant="secondary" className="mt-3" onClick={() => { onOpenChange(false); router.push('/settings'); }}>
                Go to Settings
              </Button>
            </div>
          ) : null}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-ink">Select Account</label>
              <Select className="mt-2" {...form.register('accountId')} disabled={accounts.length === 0 || form.formState.isSubmitting}>
                <option value="">-- Choose Account --</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.cloudflareEmail})
                  </option>
                ))}
              </Select>
              {form.formState.errors.accountId ? <p className="mt-2 text-sm text-red-600">{form.formState.errors.accountId.message}</p> : null}
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_180px]">
              <div>
                <label className="block text-sm font-semibold text-ink">Subdomain</label>
                <Input className="mt-2" placeholder="myapp" autoComplete="off" {...form.register('subdomain')} disabled={accounts.length === 0 || form.formState.isSubmitting} />
                {form.formState.errors.subdomain ? <p className="mt-2 text-sm text-red-600">{form.formState.errors.subdomain.message}</p> : null}
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink">Namespace</label>
                <Select className="mt-2" {...form.register('namespace')} disabled={accounts.length === 0 || form.formState.isSubmitting}>
                  <option value=".dpdns.org">.dpdns.org</option>
                  <option value=".qzz.io">.qzz.io</option>
                  <option value=".us.kg">.us.kg</option>
                  <option value=".xx.kg">.xx.kg</option>
                </Select>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-hairline bg-surface-soft p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Preview</p>
            <p className="mt-1 break-all font-mono text-lg text-ink">{fqdn}</p>
            <p className="mt-1 text-sm text-body">Auto slot_type: <span className="font-semibold">{slotType}</span></p>
          </div>

          {slotType !== 'free' ? (
            <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>This namespace is mapped to a paid/subscription slot. DPDNS may reject it if your account has no eligible slot.</p>
            </div>
          ) : null}

          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
            Local quota indicator: {domains.length}/3 domains used. DigitalPlat limits may still be enforced by API account state.
          </div>

          {accounts.length > 0 && <StepIndicator steps={steps} />}

          {errorMessage ? <p className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">{errorMessage}</p> : null}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={form.formState.isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={accounts.length === 0 || form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Processing…' : 'Register →'}
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={onManualSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-ink">Select Account</label>
              <Select className="mt-2" value={manualAccountId} onChange={(e) => setManualAccountId(e.target.value)} disabled={accounts.length === 0 || isManualSubmitting}>
                <option value="">-- Choose Account --</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.cloudflareEmail})
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_180px]">
              <div>
                <label className="block text-sm font-semibold text-ink">Subdomain</label>
                <Input className="mt-2" placeholder="myapp" autoComplete="off" value={manualSubdomain} onChange={(e) => setManualSubdomain(e.target.value)} disabled={isManualSubmitting} required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink">Namespace</label>
                <Select className="mt-2" value={manualNamespace} onChange={(e) => setManualNamespace(e.target.value as Namespace)} disabled={isManualSubmitting}>
                  <option value=".dpdns.org">.dpdns.org</option>
                  <option value=".qzz.io">.qzz.io</option>
                  <option value=".us.kg">.us.kg</option>
                  <option value=".xx.kg">.xx.kg</option>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-ink">Cloudflare Zone ID (Optional)</label>
              <Input className="mt-2" placeholder="e.g. 1a2b3c4d..." value={manualZoneId} onChange={(e) => setManualZoneId(e.target.value)} disabled={isManualSubmitting} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-ink">Cloudflare Nameservers (Optional, one per line)</label>
              <textarea
                rows={3}
                placeholder="anna.ns.cloudflare.com&#10;bob.ns.cloudflare.com"
                value={manualNameservers}
                onChange={(e) => setManualNameservers(e.target.value)}
                className="mt-2 w-full rounded-lg border border-hairline bg-canvas p-3 text-sm text-ink placeholder:text-body focus:border-primary focus:outline-none"
                disabled={isManualSubmitting}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-ink">Notes / Description (Optional)</label>
              <Input className="mt-2" placeholder="Internal notes..." value={manualNotes} onChange={(e) => setManualNotes(e.target.value)} disabled={isManualSubmitting} />
            </div>
          </div>

          <div className="rounded-lg border border-hairline bg-surface-soft p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Preview (Manual FQDN)</p>
            <p className="mt-1 break-all font-mono text-lg text-ink">
              {manualSubdomain ? `${manualSubdomain.toLowerCase().trim()}${manualNamespace}` : `your-domain${manualNamespace}`}
            </p>
          </div>

          {manualError ? <p className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">{manualError}</p> : null}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={isManualSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={accounts.length === 0 || isManualSubmitting}>
              {isManualSubmitting ? 'Saving...' : 'Import Domain'}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
