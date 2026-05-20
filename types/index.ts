import type { User } from 'firebase/auth';

export interface DomainRecord {
  name: string;
  namespace: Namespace;
  fqdn: string;
  cloudflare: {
    zone_id: string;
    nameservers: string[];
  };
  dpdns: {
    registered: boolean;
    registration_response?: string;
  };
  status: DomainStatus;
  notes?: string;
  created_at: number;
  updated_at: number;
  _key?: string;
  credentialAccountId?: string;
  expiry_date?: string;
}

export type DiagnosticAssetType = 'tunnel' | 'dns_record' | 'other';

export interface DiagnosticAsset {
  id: string;
  name: string;
  asset_type: DiagnosticAssetType;
  associated_account_id: string;
  associated_account_name: string;
  saved_at: number;
  data: Record<string, any>;
  _key?: string;
}

export interface EncryptedCredentialAccount {
  id: string;
  name: string;
  dpdns: {
    token: string;
    verified: boolean;
    verified_at: number;
  };
  cloudflare: {
    email: string;
    api_key: string;
    account_id: string;
    verified: boolean;
    verified_at: number;
  };
  created_at: number;
  updated_at: number;
}

export interface DecryptedCredentialAccount {
  id: string;
  name: string;
  dpdnsToken: string;
  cloudflareEmail: string;
  cloudflareApiKey: string;
  cloudflareAccountId: string;
  dpdnsVerified: boolean;
  cloudflareVerified: boolean;
  created_at: number;
  updated_at: number;
}

export interface EncryptedCredentials {
  dpdns: {
    token: string;
    verified: boolean;
    verified_at: number;
  };
  cloudflare: {
    email: string;
    api_key: string;
    account_id: string;
    verified: boolean;
    verified_at: number;
  };
  updated_at: number;
}

export interface DecryptedCredentials {
  dpdnsToken: string;
  cloudflareEmail: string;
  cloudflareApiKey: string;
  cloudflareAccountId: string;
}

export type Namespace = '.dpdns.org' | '.us.kg' | '.qzz.io' | '.xx.kg';
export type SlotType = 'free' | 'paid';
export type DomainStatus = 'active' | 'pending' | 'error' | 'deleted';
export type StepStatus = 'idle' | 'loading' | 'success' | 'error';

export interface Step {
  label: string;
  status: StepStatus;
  detail?: string;
}

export interface AppUser extends User {}

