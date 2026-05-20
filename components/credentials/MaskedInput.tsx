'use client';

import { Eye, EyeOff } from 'lucide-react';
import { forwardRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input, type InputProps } from '@/components/ui/input';

export const MaskedInput = forwardRef<HTMLInputElement, InputProps>(({ type = 'password', ...props }, ref) => {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!revealed) return;
    const timer = window.setTimeout(() => setRevealed(false), 10000);
    return () => window.clearTimeout(timer);
  }, [revealed]);

  return (
    <div className="relative">
      <Input ref={ref} type={revealed ? 'text' : type} className="pr-12" {...props} />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2"
        onClick={() => setRevealed((value) => !value)}
        aria-label={revealed ? 'Hide secret' : 'Reveal secret'}
      >
        {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
    </div>
  );
});
MaskedInput.displayName = 'MaskedInput';
