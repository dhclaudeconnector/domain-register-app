'use client';

import { CheckCircle2, Copy, X, XCircle } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toErrorMessage } from '@/lib/utils';

type FloatMessageType = 'success' | 'error';

interface FloatMessageInput {
  type: FloatMessageType;
  title: string;
  message: string;
  action: string;
  details?: unknown;
  secrets?: Array<string | undefined>;
  sticky?: boolean;
}

interface FloatMessage extends FloatMessageInput {
  id: number;
  log: string;
}

interface FloatMessageContextValue {
  notify: (input: FloatMessageInput) => void;
  notifyError: (action: string, error: unknown, secrets?: Array<string | undefined>) => void;
  notifySuccess: (action: string, message?: string) => void;
}

const FloatMessageContext = createContext<FloatMessageContextValue | null>(null);

function maskKnownSecrets(value: string, secrets: Array<string | undefined> = []) {
  let output = value;
  for (const secret of secrets) {
    if (!secret || secret.length < 4) continue;
    output = output.split(secret).join(`${secret.slice(0, 4)}••••${secret.slice(-4)}`);
  }
  output = output.replace(/(X-Auth-Key|Authorization|apiKey|token|password|private_key|secret)["'\s:=]+([^"'\s,}]+)/gi, '$1=••••');
  output = output.replace(/Bearer\s+[A-Za-z0-9._~+/-]+/gi, 'Bearer ••••');
  return output;
}

function buildLog(input: FloatMessageInput) {
  const raw = JSON.stringify({
    action: input.action,
    status: input.type,
    title: input.title,
    message: input.message,
    details: input.details instanceof Error ? { name: input.details.name, message: input.details.message, stack: input.details.stack } : input.details,
    timestamp: new Date().toISOString(),
  }, null, 2);
  return maskKnownSecrets(raw, input.secrets);
}

export function FloatMessageProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<FloatMessage[]>([]);

  const dismiss = useCallback((id: number) => {
    setMessages((current) => current.filter((message) => message.id !== id));
  }, []);

  const notify = useCallback((input: FloatMessageInput) => {
    const id = Date.now() + Math.random();
    const next = { ...input, id, log: buildLog(input) };
    setMessages((current) => [next, ...current].slice(0, 4));
    if (!input.sticky && input.type === 'success') {
      window.setTimeout(() => dismiss(id), 4500);
    }
  }, [dismiss]);

  const notifyError = useCallback((action: string, error: unknown, secrets?: Array<string | undefined>) => {
    notify({
      type: 'error',
      title: 'Backend request failed',
      message: toErrorMessage(error),
      action,
      details: error,
      secrets,
      sticky: true,
    });
  }, [notify]);

  const notifySuccess = useCallback((action: string, message = 'Done') => {
    notify({ type: 'success', title: 'Success', message, action });
  }, [notify]);

  const value = useMemo(() => ({ notify, notifyError, notifySuccess }), [notify, notifyError, notifySuccess]);

  return (
    <FloatMessageContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex w-[min(420px,calc(100vw-2rem))] flex-col gap-3">
        {messages.map((message) => (
          <article key={message.id} className={`rounded-xl border bg-white p-4 shadow-card ${message.type === 'error' ? 'border-red-200' : 'border-emerald-200'}`}>
            <div className="flex items-start gap-3">
              {message.type === 'error' ? <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" /> : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">{message.title}</p>
                <p className="mt-1 text-sm text-body">{message.message}</p>
                <p className="mt-2 break-all text-xs text-muted">Action: {message.action}</p>
              </div>
              <button type="button" className="text-muted hover:text-ink" onClick={() => dismiss(message.id)} aria-label="Dismiss message">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 flex justify-end">
              <Button type="button" size="sm" variant="secondary" onClick={() => navigator.clipboard.writeText(message.log)}>
                <Copy className="mr-2 h-4 w-4" /> Copy log
              </Button>
            </div>
          </article>
        ))}
      </div>
    </FloatMessageContext.Provider>
  );
}

export function useFloatMessage() {
  const context = useContext(FloatMessageContext);
  if (!context) throw new Error('useFloatMessage must be used inside FloatMessageProvider');
  return context;
}
