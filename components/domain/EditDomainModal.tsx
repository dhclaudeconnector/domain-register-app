'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useFloatMessage } from '@/components/feedback/FloatMessageProvider';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { editDomainSchema, type EditDomainValues } from '@/lib/validators';
import { toErrorMessage } from '@/lib/utils';
import { FirebaseService } from '@/services/firebase.service';
import { useAppStore } from '@/stores/app.store';
import type { DomainRecord } from '@/types';

export function EditDomainModal({ domain, open, onOpenChange }: { domain: DomainRecord | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const user = useAppStore((state) => state.user);
  const { notifyError, notifySuccess } = useFloatMessage();
  const [message, setMessage] = useState('');
  const form = useForm<EditDomainValues>({
    resolver: zodResolver(editDomainSchema),
    defaultValues: { notes: '', status: 'active' },
  });

  useEffect(() => {
    if (domain) {
      form.reset({ notes: domain.notes || '', status: domain.status });
      setMessage('');
    }
  }, [domain, form]);

  const onSubmit = async (values: EditDomainValues) => {
    if (!user || !domain) return;
    try {
      await FirebaseService.updateDomain(user.uid, domain.fqdn, values);
      notifySuccess('Update domain', `${domain.fqdn} updated successfully.`);
      onOpenChange(false);
    } catch (error) {
      setMessage(toErrorMessage(error, 'Update failed'));
      notifyError(`Update domain · ${domain.fqdn}`, error);
    }
  };

  return (
    <Dialog open={open && !!domain} onOpenChange={onOpenChange} title="Edit Domain" description={domain?.fqdn}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-ink">Status</label>
          <Select className="mt-2" {...form.register('status')}>
            <option value="active">active</option>
            <option value="pending">pending</option>
            <option value="error">error</option>
            <option value="deleted">deleted</option>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink">Notes</label>
          <Textarea className="mt-2" placeholder="Internal notes" {...form.register('notes')} />
          {form.formState.errors.notes ? <p className="mt-2 text-sm text-red-600">{form.formState.errors.notes.message}</p> : null}
        </div>
        {message ? <p className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">{message}</p> : null}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? 'Saving…' : 'Save'}</Button>
        </div>
      </form>
    </Dialog>
  );
}
