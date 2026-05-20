import { get, onValue, ref as dbRef, remove, set, update, type Unsubscribe } from 'firebase/database';
import { db } from '@/lib/firebase';
import { toFirebaseKey } from '@/lib/firebase-key';
import type { DomainRecord, EncryptedCredentialAccount } from '@/types';

export const FirebaseService = {
  async saveDomain(uid: string, domain: DomainRecord): Promise<void> {
    const key = toFirebaseKey(domain.fqdn);
    const ref = dbRef(db, `users/${uid}/domains/${key}`);
    await set(ref, domain);
  },

  subscribeDomains(uid: string, callback: (domains: DomainRecord[]) => void): Unsubscribe {
    const ref = dbRef(db, `users/${uid}/domains`);
    return onValue(ref, (snapshot) => {
      const data = snapshot.val() as Record<string, DomainRecord> | null;
      const domains = data
        ? Object.entries(data).map(([key, val]) => ({
            ...val,
            _key: key,
          }))
        : [];
      domains.sort((a, b) => b.created_at - a.created_at);
      callback(domains);
    });
  },

  async deleteDomain(uid: string, fqdn: string): Promise<void> {
    const key = toFirebaseKey(fqdn);
    const ref = dbRef(db, `users/${uid}/domains/${key}`);
    await remove(ref);
  },

  async updateDomain(uid: string, fqdn: string, updates: Partial<DomainRecord>): Promise<void> {
    const key = toFirebaseKey(fqdn);
    const ref = dbRef(db, `users/${uid}/domains/${key}`);
    await update(ref, { ...updates, updated_at: Date.now() });
  },

  async saveCredentialAccount(uid: string, account: EncryptedCredentialAccount): Promise<void> {
    const ref = dbRef(db, `users/${uid}/settings/accounts/${account.id}`);
    await set(ref, account);
    await update(dbRef(db, `users/${uid}/settings`), { updated_at: Date.now() });
  },

  async deleteCredentialAccount(uid: string, accountId: string): Promise<void> {
    const ref = dbRef(db, `users/${uid}/settings/accounts/${accountId}`);
    await remove(ref);
    await update(dbRef(db, `users/${uid}/settings`), { updated_at: Date.now() });
  },

  async getCredentialAccounts(uid: string): Promise<Record<string, EncryptedCredentialAccount> | null> {
    const ref = dbRef(db, `users/${uid}/settings/accounts`);
    const snap = await get(ref);
    return snap.val() as Record<string, EncryptedCredentialAccount> | null;
  },

  async getOldCredentials(uid: string): Promise<any | null> {
    const ref = dbRef(db, `users/${uid}/settings/credentials`);
    const snap = await get(ref);
    return snap.val();
  },

  async deleteOldCredentials(uid: string): Promise<void> {
    const ref = dbRef(db, `users/${uid}/settings/credentials`);
    await remove(ref);
  },

  async saveDiagnosticAsset(uid: string, type: string, asset: Omit<DiagnosticAsset, 'id' | 'saved_at'> & { id?: string }): Promise<string> {
    const id = asset.id || `ast_${Math.random().toString(36).substring(2, 11)}`;
    const ref = dbRef(db, `users/${uid}/diagnostic_assets/${type}/${id}`);
    const data = {
      ...asset,
      id,
      saved_at: Date.now(),
    };
    await set(ref, data);
    return id;
  },

  subscribeDiagnosticAssets(uid: string, callback: (assets: DiagnosticAsset[]) => void): Unsubscribe {
    const ref = dbRef(db, `users/${uid}/diagnostic_assets`);
    return onValue(ref, (snapshot) => {
      const data = snapshot.val() as Record<string, Record<string, DiagnosticAsset>> | null;
      const assets: DiagnosticAsset[] = [];
      if (data) {
        Object.entries(data).forEach(([type, items]) => {
          Object.entries(items).forEach(([id, val]) => {
            assets.push({
              ...val,
              id,
              asset_type: type as any,
              _key: `${type}_${id}`,
            });
          });
        });
      }
      assets.sort((a, b) => b.saved_at - a.saved_at);
      callback(assets);
    });
  },

  async deleteDiagnosticAsset(uid: string, type: string, assetId: string): Promise<void> {
    const ref = dbRef(db, `users/${uid}/diagnostic_assets/${type}/${assetId}`);
    await remove(ref);
  },
};

import { DiagnosticAsset } from '@/types';

