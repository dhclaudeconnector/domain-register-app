'use client';

import { onAuthStateChanged } from 'firebase/auth';
import { useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { CredentialsService } from '@/services/credentials.service';
import { useAppStore } from '@/stores/app.store';
import { isEmailAllowed } from '@/lib/utils';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAppStore((state) => state.setUser);
  const setAuthReady = useAppStore((state) => state.setAuthReady);
  const setAccounts = useAppStore((state) => state.setAccounts);
  const clearCredentials = useAppStore((state) => state.clearCredentials);
  const setDomains = useAppStore((state) => state.setDomains);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && !isEmailAllowed(user.email)) {
        console.warn('User email not allowed, signing out...', user.email);
        try {
          await auth.signOut();
        } catch (e) {
          console.error('Sign out failed', e);
        }
        setUser(null);
        clearCredentials();
        setDomains([]);
        setAuthReady(true);
        return;
      }

      setUser(user);
      if (user) {
        try {
          const accounts = await CredentialsService.load(user.uid);
          setAccounts(accounts);
        } catch (error) {
          console.error('Failed to load credentials', error);
          setAccounts([]);
        }
      } else {
        clearCredentials();
        setDomains([]);
      }
      setAuthReady(true);
    });

    return unsubscribe;
  }, [clearCredentials, setAuthReady, setAccounts, setDomains, setUser]);

  return <>{children}</>;
}

