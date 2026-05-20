'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, ShieldAlert, XCircle, Plus, Pencil, Trash2, ArrowLeft, Play } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { useFloatMessage } from '@/components/feedback/FloatMessageProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MaskedInput } from '@/components/credentials/MaskedInput';
import { credentialsSchema, type CredentialsFormValues } from '@/lib/validators';
import { toErrorMessage } from '@/lib/utils';
import { CloudflareService } from '@/services/cloudflare.service';
import { CredentialsService } from '@/services/credentials.service';
import { DPDNSService } from '@/services/dpdns.service';
import { useAppStore } from '@/stores/app.store';
import type { DecryptedCredentialAccount } from '@/types';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export function CredentialsForm({
  onOpenPlayground,
}: {
  onOpenPlayground?: (accountId: string) => void;
}) {
  const user = useAppStore((state) => state.user);
  const accounts = useAppStore((state) => state.accounts) || [];
  const setAccounts = useAppStore((state) => state.setAccounts);
  const { notifyError, notifySuccess } = useFloatMessage();

  // Mode state: 'list' | 'add' | 'edit'
  const [mode, setMode] = useState<'list' | 'add' | 'edit'>('list');
  const [editingAccount, setEditingAccount] = useState<DecryptedCredentialAccount | null>(null);

  const [dpdnsStatus, setDpdnsStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [cfStatus, setCfStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  const form = useForm<CredentialsFormValues>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: {
      name: '',
      dpdnsToken: '',
      cloudflareEmail: '',
      cloudflareApiKey: '',
      cloudflareAccountId: '',
    },
  });

  const enterAddMode = () => {
    setMode('add');
    setEditingAccount(null);
    form.reset({
      name: '',
      dpdnsToken: '',
      cloudflareEmail: '',
      cloudflareApiKey: '',
      cloudflareAccountId: '',
    });
    setDpdnsStatus('idle');
    setCfStatus('idle');
    setMessage('');
  };

  const enterEditMode = (account: DecryptedCredentialAccount) => {
    setMode('edit');
    setEditingAccount(account);
    form.reset({
      name: account.name,
      dpdnsToken: account.dpdnsToken,
      cloudflareEmail: account.cloudflareEmail,
      cloudflareApiKey: account.cloudflareApiKey,
      cloudflareAccountId: account.cloudflareAccountId,
    });
    setDpdnsStatus(account.dpdnsVerified ? 'success' : 'idle');
    setCfStatus(account.cloudflareVerified ? 'success' : 'idle');
    setMessage('');
  };

  const exitToListView = async () => {
    setMode('list');
    setEditingAccount(null);
    if (user) {
      // Reload accounts from DB to ensure local sync
      const freshAccounts = await CredentialsService.load(user.uid);
      setAccounts(freshAccounts);
    }
  };

  const testDpdns = async () => {
    setMessage('');
    const token = form.getValues('dpdnsToken');
    if (!token) return setDpdnsStatus('error');
    try {
      await DPDNSService.listDomains(token);
      setDpdnsStatus('success');
      setMessage('DPDNS connected successfully.');
      notifySuccess('Settings · Test DPDNS connection', 'DPDNS connected successfully.');
    } catch (error) {
      setDpdnsStatus('error');
      setMessage(toErrorMessage(error, 'API Token không hợp lệ'));
      notifyError('Settings · Test DPDNS connection', error, [token]);
    }
  };

  const testCloudflare = async () => {
    setMessage('');
    const email = form.getValues('cloudflareEmail');
    const apiKey = form.getValues('cloudflareApiKey');
    if (!email || !apiKey) return setCfStatus('error');
    try {
      await CloudflareService.verifyCredentials(email, apiKey);
      setCfStatus('success');
      setMessage('Cloudflare credentials are valid.');
      notifySuccess('Settings · Test Cloudflare connection', 'Cloudflare credentials are valid.');
    } catch (error) {
      setCfStatus('error');
      setMessage(toErrorMessage(error, 'Cloudflare credentials are invalid'));
      notifyError('Settings · Test Cloudflare connection', error, [apiKey]);
    }
  };

  const onSubmit = async (values: CredentialsFormValues) => {
    if (!user) return;
    setMessage('');
    setDpdnsStatus('idle');
    setCfStatus('idle');
    try {
      // Step 1: Verify DPDNS Token
      await DPDNSService.listDomains(values.dpdnsToken);
      setDpdnsStatus('success');

      // Step 2: Verify Cloudflare
      await CloudflareService.verifyCredentials(values.cloudflareEmail, values.cloudflareApiKey);
      const resolvedAccountId = await CloudflareService.resolveAccountId(
        values.cloudflareEmail,
        values.cloudflareApiKey,
        values.cloudflareAccountId
      );
      setCfStatus('success');

      // Step 3: Encrypt and save account to Firebase
      const accountData: Omit<DecryptedCredentialAccount, 'created_at' | 'updated_at'> & { created_at?: number } = {
        id: editingAccount?.id || '', // Service will generate ID if blank
        name: values.name,
        dpdnsToken: values.dpdnsToken,
        cloudflareEmail: values.cloudflareEmail,
        cloudflareApiKey: values.cloudflareApiKey,
        cloudflareAccountId: resolvedAccountId,
        dpdnsVerified: true,
        cloudflareVerified: true,
        created_at: editingAccount?.created_at,
      };

      await CredentialsService.save(user.uid, accountData, { dpdns: true, cloudflare: true });
      
      notifySuccess('Settings · Save credentials', 'Account credentials saved and verified.');
      await exitToListView();
    } catch (error) {
      setMessage(toErrorMessage(error, 'Verification or save failed'));
      notifyError('Settings · Save credentials', error, [values.dpdnsToken, values.cloudflareApiKey]);
    }
  };

  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean;
    accountId: string;
  }>({ open: false, accountId: '' });

  const deleteAccount = async (accountId: string) => {
    if (!user) return;
    try {
      await CredentialsService.delete(user.uid, accountId);
      const updated = await CredentialsService.load(user.uid);
      setAccounts(updated);
      notifySuccess('Settings · Delete credentials', 'Account configuration deleted.');
    } catch (error) {
      notifyError('Settings · Delete credentials', error);
    }
  };

  const error = form.formState.errors;

  if (mode === 'list') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-ink">Configured Accounts</h2>
          <Button onClick={enterAddMode}>
            <Plus className="mr-2 h-4 w-4" /> Add Account
          </Button>
        </div>

        {user && (
          <div className="flex items-center justify-between rounded-xl border border-hairline bg-surface-soft p-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-ink">Your User ID (UID) for API Testing:</span>
              <code className="rounded bg-canvas px-2 py-1 font-mono text-primary select-all">{user.uid}</code>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(user.uid);
                notifySuccess('Copy UID', 'User ID copied to clipboard.');
              }}
              className="text-[10px] font-semibold uppercase tracking-wider text-primary hover:underline"
            >
              Copy UID
            </button>
          </div>
        )}

        {accounts.length === 0 ? (
          <div className="feature-card py-12 text-center">
            <ShieldAlert className="mx-auto h-12 w-12 text-muted-soft mb-3" />
            <h3 className="text-lg font-medium text-ink">No credential accounts</h3>
            <p className="text-body text-sm mt-1 max-w-sm mx-auto">Configure your first DPDNS token and Cloudflare credentials to start registering domains.</p>
            <Button className="mt-4" onClick={enterAddMode}>Add Account</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {accounts.map((acc) => (
              <div key={acc.id} className="asset-row p-6 bg-canvas border border-hairline rounded-xl hover:shadow-sm transition-all duration-200">
                <div className="flex min-w-0 items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="break-all text-lg font-semibold tracking-tight text-ink">{acc.name}</h3>
                      <span className="pill-badge bg-surface-soft text-body text-xs font-mono">{acc.cloudflareEmail}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className={`pill-badge text-xs gap-1.5 ${acc.dpdnsVerified ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        {acc.dpdnsVerified ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        DPDNS API
                      </span>
                      <span className={`pill-badge text-xs gap-1.5 ${acc.cloudflareVerified ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        {acc.cloudflareVerified ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        Cloudflare API
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {onOpenPlayground && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-xs"
                      onClick={() => onOpenPlayground(acc.id)}
                      title="Open this account in API Playground"
                    >
                      <Play className="h-3.5 w-3.5 mr-1" /> Playground
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => enterEditMode(acc)} aria-label="Edit account" title="Edit account">
                    <Pencil className="h-4 w-4 text-body hover:text-ink" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setConfirmDelete({ open: true, accountId: acc.id })} aria-label="Delete account" title="Delete account">
                    <Trash2 className="h-4 w-4 text-semantic-down" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <ConfirmDialog
          open={confirmDelete.open}
          onOpenChange={(open) => setConfirmDelete((prev) => ({ ...prev, open }))}
          title="Delete Account Credentials"
          description="Are you sure you want to delete this account configuration? This will not affect registered domains, but you will not be able to manage them unless another account is selected."
          variant="danger"
          confirmLabel="Delete"
          onConfirm={() => deleteAccount(confirmDelete.accountId)}
        />
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      <div className="flex items-center gap-4">
        <Button type="button" variant="ghost" size="icon" onClick={exitToListView}>
          <ArrowLeft className="h-5 w-5 text-body hover:text-ink" />
        </Button>
        <div>
          <h2 className="text-xl font-semibold text-ink">
            {mode === 'edit' ? `Edit Account: ${editingAccount?.name}` : 'Add New Credentials Account'}
          </h2>
          <p className="text-sm text-body">Provide connection details for your DPDNS and Cloudflare credentials.</p>
        </div>
      </div>

      <section className="feature-card">
        <h3 className="text-lg font-semibold text-ink mb-4">Account Label</h3>
        <div>
          <label className="block text-sm font-semibold text-ink">Friendly Account Name</label>
          <Input className="mt-2" placeholder="e.g. Personal DPDNS Account" {...form.register('name')} />
          {error.name ? <p className="mt-2 text-sm text-red-600">{error.name.message}</p> : null}
        </div>
      </section>

      <section className="feature-card">
        <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-ink">DigitalPlat DPDNS</h2>
            <p className="text-sm text-body">Bearer API token used to register and manage DPDNS domains.</p>
          </div>
          {dpdnsStatus === 'success' ? <Status ok label="Connected" /> : dpdnsStatus === 'error' ? <Status label="Invalid token" /> : null}
        </div>
        <label className="block text-sm font-semibold text-ink">DPDNS Token</label>
        <div className="mt-2 flex flex-col gap-3 md:flex-row">
          <MaskedInput placeholder="dp_live_xxxxx" {...form.register('dpdnsToken')} />
          <Button type="button" variant="secondary" onClick={testDpdns} disabled={form.formState.isSubmitting}>
            Test Connection
          </Button>
        </div>
        {error.dpdnsToken ? <p className="mt-2 text-sm text-red-600">{error.dpdnsToken.message}</p> : null}
      </section>

      <section className="feature-card">
        <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-ink">Cloudflare</h2>
            <p className="text-sm text-body">Required to create Zones and manage nameservers dynamically.</p>
          </div>
          {cfStatus === 'success' ? <Status ok label="Connected" /> : cfStatus === 'error' ? <Status label="Invalid credentials" /> : null}
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <div className="flex gap-2">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Cloudflare Global API Key grants broad access. Make sure your Firebase project is secure and rotate key if necessary.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-ink">Cloudflare Email</label>
            <Input className="mt-2" placeholder="user@example.com" {...form.register('cloudflareEmail')} />
            {error.cloudflareEmail ? <p className="mt-2 text-sm text-red-600">{error.cloudflareEmail.message}</p> : null}
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink">Cloudflare Account ID</label>
            <Input className="mt-2 font-mono" placeholder="Auto-detect if blank" {...form.register('cloudflareAccountId')} />
            {error.cloudflareAccountId ? <p className="mt-2 text-sm text-red-600">{error.cloudflareAccountId.message}</p> : null}
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-ink">Cloudflare Global API Key</label>
            <div className="mt-2 flex flex-col gap-3 md:flex-row">
              <MaskedInput className="font-mono flex-1" placeholder="37-character global API key" {...form.register('cloudflareApiKey')} />
              <Button type="button" variant="secondary" onClick={testCloudflare} disabled={form.formState.isSubmitting}>
                Test Cloudflare
              </Button>
            </div>
            {error.cloudflareApiKey ? <p className="mt-2 text-sm text-red-600">{error.cloudflareApiKey.message}</p> : null}
          </div>
        </div>
      </section>

      {message ? <p className="rounded-lg border border-hairline bg-surface-soft p-4 text-sm text-body">{message}</p> : null}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={exitToListView} disabled={form.formState.isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Testing…' : 'Save & Test →'}
        </Button>
      </div>
    </form>
  );
}

function Status({ ok = false, label }: { ok?: boolean; label: string }) {
  return (
    <span className={`pill-badge gap-2 ${ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
      {ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
      {label}
    </span>
  );
}

