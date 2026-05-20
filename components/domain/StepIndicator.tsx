import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';
import type { Step } from '@/types';
import { cn } from '@/lib/utils';

export function StepIndicator({ steps }: { steps: Step[] }) {
  return (
    <ol className="space-y-3">
      {steps.map((step, index) => (
        <li key={step.label} className="flex gap-3 rounded-lg border border-hairline-soft p-4">
          <span className="mt-0.5">
            {step.status === 'loading' ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : null}
            {step.status === 'success' ? <CheckCircle2 className="h-5 w-5 text-semantic-up" /> : null}
            {step.status === 'error' ? <XCircle className="h-5 w-5 text-semantic-down" /> : null}
            {step.status === 'idle' ? <Circle className="h-5 w-5 text-muted-soft" /> : null}
          </span>
          <div>
            <p className={cn('text-sm font-semibold', step.status === 'error' ? 'text-semantic-down' : 'text-ink')}>
              {index + 1}. {step.label}
            </p>
            {step.detail ? <p className="mt-1 break-all text-xs text-body">{step.detail}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
