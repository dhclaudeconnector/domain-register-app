import type { User } from 'firebase/auth';
import { create } from 'zustand';
import type { DecryptedCredentialAccount, DomainRecord } from '@/types';

interface AppStore {
  user: User | null;
  authReady: boolean;
  setUser: (user: User | null) => void;
  setAuthReady: (ready: boolean) => void;

  accounts: DecryptedCredentialAccount[];
  setAccounts: (accounts: DecryptedCredentialAccount[]) => void;
  clearCredentials: () => void;

  domains: DomainRecord[];
  setDomains: (domains: DomainRecord[]) => void;

  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  user: null,
  authReady: false,
  setUser: (user) => set({ user }),
  setAuthReady: (authReady) => set({ authReady }),

  accounts: [],
  setAccounts: (accounts) => set({ accounts }),
  clearCredentials: () => set({ accounts: [] }),

  domains: [],
  setDomains: (domains) => set({ domains }),

  sidebarOpen: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  sidebarCollapsed: false,
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
}));

