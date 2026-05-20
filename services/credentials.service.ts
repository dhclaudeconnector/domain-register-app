import { decrypt, encrypt } from '@/lib/crypto';
import { FirebaseService } from '@/services/firebase.service';
import type { DecryptedCredentialAccount, EncryptedCredentialAccount } from '@/types';

export const CredentialsService = {
  async save(
    uid: string,
    account: Omit<DecryptedCredentialAccount, 'created_at' | 'updated_at'> & { created_at?: number },
    verification: { dpdns: boolean; cloudflare: boolean }
  ) {
    const now = Date.now();
    const id = account.id || `acc_${Math.random().toString(36).substring(2, 11)}`;
    
    const encrypted: EncryptedCredentialAccount = {
      id,
      name: account.name || 'Default Account',
      dpdns: {
        token: encrypt(account.dpdnsToken, uid),
        verified: verification.dpdns,
        verified_at: now,
      },
      cloudflare: {
        email: account.cloudflareEmail,
        api_key: encrypt(account.cloudflareApiKey, uid),
        account_id: account.cloudflareAccountId,
        verified: verification.cloudflare,
        verified_at: now,
      },
      created_at: account.created_at || now,
      updated_at: now,
    };
    
    await FirebaseService.saveCredentialAccount(uid, encrypted);
    return id;
  },

  async delete(uid: string, accountId: string) {
    await FirebaseService.deleteCredentialAccount(uid, accountId);
  },

  async load(uid: string): Promise<DecryptedCredentialAccount[]> {
    let encryptedAccounts = await FirebaseService.getCredentialAccounts(uid);
    
    // Auto-migration check: if no accounts but old credentials exist
    if (!encryptedAccounts) {
      const oldCredentials = await FirebaseService.getOldCredentials(uid);
      if (oldCredentials) {
        const id = `acc_default`;
        const now = Date.now();
        
        const newAccount: EncryptedCredentialAccount = {
          id,
          name: 'Default Account',
          dpdns: {
            token: oldCredentials.dpdns.token,
            verified: oldCredentials.dpdns.verified ?? true,
            verified_at: oldCredentials.dpdns.verified_at ?? now,
          },
          cloudflare: {
            email: oldCredentials.cloudflare.email,
            api_key: oldCredentials.cloudflare.api_key,
            account_id: oldCredentials.cloudflare.account_id,
            verified: oldCredentials.cloudflare.verified ?? true,
            verified_at: oldCredentials.cloudflare.verified_at ?? now,
          },
          created_at: now,
          updated_at: now,
        };
        
        await FirebaseService.saveCredentialAccount(uid, newAccount);
        await FirebaseService.deleteOldCredentials(uid);
        
        encryptedAccounts = { [id]: newAccount };
      }
    }
    
    if (!encryptedAccounts) return [];
    
    return Object.values(encryptedAccounts).map((acc) => {
      let dpdnsToken = '';
      let cloudflareApiKey = '';
      
      try {
        dpdnsToken = decrypt(acc.dpdns.token, uid);
      } catch (e) {
        console.error('Failed to decrypt DPDNS token for account', acc.id, e);
      }
      
      try {
        cloudflareApiKey = decrypt(acc.cloudflare.api_key, uid);
      } catch (e) {
        console.error('Failed to decrypt Cloudflare API key for account', acc.id, e);
      }
      
      return {
        id: acc.id,
        name: acc.name || 'Unnamed Account',
        dpdnsToken,
        cloudflareEmail: acc.cloudflare.email,
        cloudflareApiKey,
        cloudflareAccountId: acc.cloudflare.account_id,
        dpdnsVerified: acc.dpdns.verified,
        cloudflareVerified: acc.cloudflare.verified,
        created_at: acc.created_at || Date.now(),
        updated_at: acc.updated_at || Date.now(),
      };
    });
  },
};

