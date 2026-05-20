'use client';

import { signInWithPopup } from 'firebase/auth';
import { Globe2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { auth, googleProvider } from '@/lib/firebase';
import { toErrorMessage, isEmailAllowed } from '@/lib/utils';
import { useAppStore } from '@/stores/app.store';

export default function LoginPage() {
  const router = useRouter();
  const user = useAppStore((state) => state.user);
  const authReady = useAppStore((state) => state.authReady);
  const [message, setMessage] = useState('');
  const next = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('next') || '/' : '/';

  useEffect(() => {
    if (authReady && user) router.replace(next);
  }, [authReady, next, router, user]);

  const signIn = async () => {
    setMessage('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const email = result.user?.email;
      if (!isEmailAllowed(email)) {
        await auth.signOut();
        throw new Error('Email của bạn không được cấp quyền đăng nhập vào ứng dụng này.');
      }
      router.replace(next);
    } catch (error) {
      setMessage(toErrorMessage(error, 'Google Sign-In failed'));
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-dark px-4 py-16 text-white">
      <section className="w-full max-w-lg text-center">
        <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-full bg-primary">
          <Globe2 className="h-8 w-8" />
        </div>
        <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">Domain Register</h1>
        <p className="mx-auto mt-5 max-w-md text-base leading-7 text-[var(--color-on-dark-soft)]">
          Automate Cloudflare Zone creation and DigitalPlat DPDNS registration from one secure dashboard.
        </p>
        <Button type="button" size="lg" className="mt-10 h-14 w-full max-w-sm" onClick={signIn}>
          <span className="mr-3 flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-bold text-ink">G</span>
          Sign in with Google
        </Button>
        {message ? <p className="mt-6 rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-red-200">{message}</p> : null}
      </section>
    </main>
  );
}
