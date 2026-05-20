'use client';

import { useState } from 'react';
import { CredentialsForm } from '@/components/credentials/CredentialsForm';
import { ApiPlayground } from '@/components/credentials/ApiPlayground';
import { ProtectedPage } from '@/components/layout/ProtectedPage';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'credentials' | 'diagnostics'>('credentials');

  return (
    <ProtectedPage>
      <div>
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Settings</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-ink">
              {activeTab === 'credentials' ? 'Credentials' : 'API Playground'}
            </h1>
            <p className="mt-2 max-w-2xl text-body">
              {activeTab === 'credentials'
                ? 'Store DPDNS and Cloudflare credentials encrypted in Firebase Realtime Database.'
                : 'Directly execute API requests for DPDNS and Cloudflare, extract tokens, and save diagnostic assets.'}
            </p>
          </div>
        </div>

        {/* Coinbase-style Tabs */}
        <div className="mb-8 flex rounded-xl border border-hairline bg-surface-soft p-1 max-w-md">
          <button
            type="button"
            className={`flex-1 rounded-lg py-2.5 text-center text-sm font-semibold transition-all ${
              activeTab === 'credentials'
                ? 'bg-white text-ink shadow-sm'
                : 'text-body hover:text-ink'
            }`}
            onClick={() => setActiveTab('credentials')}
          >
            Credentials Manager
          </button>
          <button
            type="button"
            className={`flex-1 rounded-lg py-2.5 text-center text-sm font-semibold transition-all ${
              activeTab === 'diagnostics'
                ? 'bg-white text-ink shadow-sm'
                : 'text-body hover:text-ink'
            }`}
            onClick={() => setActiveTab('diagnostics')}
          >
            API Playground
          </button>
        </div>

        {activeTab === 'credentials' ? <CredentialsForm /> : <ApiPlayground />}
      </div>
    </ProtectedPage>
  );
}
