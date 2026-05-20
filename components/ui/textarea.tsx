import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn('min-h-28 w-full rounded-lg border border-hairline bg-white px-4 py-3 text-sm outline-none transition placeholder:text-muted focus:border-primary focus:ring-4 focus:ring-blue-500/10', className)}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export { Textarea };
