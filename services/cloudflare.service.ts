import { callWithFallback, parseApiResponse } from '@/services/api-caller';

const CF_BASE_URL = 'https://api.cloudflare.com/client/v4';
const CF_PROXY_PATH = '/api/proxy/cloudflare';

export interface CloudflareEnvelope<T = unknown> {
  success: boolean;
  result: T;
  errors?: Array<{ code?: number; message: string }>;
  messages?: unknown[];
}

export interface CloudflareUserResult {
  id: string;
  email: string;
  username?: string;
}

export interface CloudflareZoneResult {
  id: string;
  name: string;
  name_servers: string[];
  status: string;
}

export interface CloudflareAccountResult {
  id: string;
  name: string;
}

function headers(email: string, apiKey: string) {
  return {
    'X-Auth-Email': email,
    'X-Auth-Key': apiKey,
    'Content-Type': 'application/json',
  };
}

async function callCloudflare<T>({
  endpoint,
  method,
  body,
  email,
  apiKey,
  fallbackMessage,
}: {
  endpoint: string;
  method: string;
  body?: object;
  email: string;
  apiKey: string;
  fallbackMessage: string;
}) {
  const res = await callWithFallback({
    directUrl: `${CF_BASE_URL}${endpoint}`,
    directHeaders: headers(email, apiKey),
    proxyPath: CF_PROXY_PATH,
    proxyBody: { endpoint, method, body, email, apiKey },
    method,
    body,
  });
  return parseApiResponse<CloudflareEnvelope<T>>(res, fallbackMessage);
}

async function withRateLimitRetry<T>(operation: () => Promise<T>, retries = 2): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (retries > 0 && /rate|429/i.test(message)) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return withRateLimitRetry(operation, retries - 1);
    }
    throw error;
  }
}

export const CloudflareService = {
  async verifyCredentials(email: string, apiKey: string) {
    return callCloudflare<CloudflareUserResult>({
      endpoint: '/user',
      method: 'GET',
      email,
      apiKey,
      fallbackMessage: 'Cloudflare credentials are invalid',
    });
  },

  async getAccountId(email: string, apiKey: string) {
    const accounts = await callCloudflare<CloudflareAccountResult[]>({
      endpoint: '/accounts',
      method: 'GET',
      email,
      apiKey,
      fallbackMessage: 'Unable to fetch Cloudflare accounts',
    });
    const account = accounts.result?.[0];
    if (!account?.id) throw new Error('No Cloudflare accounts found for these credentials');
    return account.id;
  },

  async resolveAccountId(email: string, apiKey: string, accountId?: string) {
    const trimmed = accountId?.trim();
    return trimmed || this.getAccountId(email, apiKey);
  },

  async getZones(email: string, apiKey: string) {
    return callCloudflare<CloudflareZoneResult[]>({
      endpoint: '/zones',
      method: 'GET',
      email,
      apiKey,
      fallbackMessage: 'Unable to fetch Cloudflare zones',
    });
  },

  async findZone(email: string, apiKey: string, domain: string) {
    const params = new URLSearchParams({ name: domain, per_page: '1' });
    return callCloudflare<CloudflareZoneResult[]>({
      endpoint: `/zones?${params.toString()}`,
      method: 'GET',
      email,
      apiKey,
      fallbackMessage: 'Unable to look up Cloudflare zone',
    });
  },

  async createZone(email: string, apiKey: string, accountId: string, domain: string) {
    const resolvedAccountId = await this.resolveAccountId(email, apiKey, accountId);
    const body = {
      name: domain,
      account: { id: resolvedAccountId },
      type: 'full',
    };

    return withRateLimitRetry(async () => {
      try {
        const created = await callCloudflare<CloudflareZoneResult>({
          endpoint: '/zones',
          method: 'POST',
          body,
          email,
          apiKey,
          fallbackMessage: 'Unable to create Cloudflare zone',
        });
        return created.result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (/already exists|exists|zone/i.test(message)) {
          const existing = await this.findZone(email, apiKey, domain);
          const zone = existing.result?.[0];
          if (zone) return zone;
        }
        throw error;
      }
    });
  },

  async deleteZone(email: string, apiKey: string, zoneId: string) {
    return callCloudflare<{ id: string }>({
      endpoint: `/zones/${zoneId}`,
      method: 'DELETE',
      email,
      apiKey,
      fallbackMessage: 'Unable to delete Cloudflare zone',
    });
  },

  async getDnsRecords(email: string, apiKey: string, zoneId: string) {
    return callCloudflare<any[]>({
      endpoint: `/zones/${zoneId}/dns_records`,
      method: 'GET',
      email,
      apiKey,
      fallbackMessage: 'Unable to fetch DNS records',
    });
  },

  async createDnsRecord(email: string, apiKey: string, zoneId: string, record: { type: string; name: string; content: string; ttl?: number; proxied?: boolean }) {
    return callCloudflare<any>({
      endpoint: `/zones/${zoneId}/dns_records`,
      method: 'POST',
      body: record,
      email,
      apiKey,
      fallbackMessage: 'Unable to create DNS record',
    });
  },

  async deleteDnsRecord(email: string, apiKey: string, zoneId: string, recordId: string) {
    return callCloudflare<any>({
      endpoint: `/zones/${zoneId}/dns_records/${recordId}`,
      method: 'DELETE',
      email,
      apiKey,
      fallbackMessage: 'Unable to delete DNS record',
    });
  },

  async getTunnels(email: string, apiKey: string, accountId: string) {
    return callCloudflare<any[]>({
      endpoint: `/accounts/${accountId}/tunnels`,
      method: 'GET',
      email,
      apiKey,
      fallbackMessage: 'Unable to fetch Cloudflare tunnels',
    });
  },

  async createTunnel(email: string, apiKey: string, accountId: string, name: string) {
    return callCloudflare<any>({
      endpoint: `/accounts/${accountId}/tunnels`,
      method: 'POST',
      body: { name, config_src: 'local' },
      email,
      apiKey,
      fallbackMessage: 'Unable to create Cloudflare tunnel',
    });
  },
};
