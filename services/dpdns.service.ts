import { callWithFallback, parseApiResponse } from '@/services/api-caller';
import type { SlotType } from '@/types';

const DPDNS_BASE_URL = 'https://domain-api.digitalplat.org/api/v1';
const DPDNS_PROXY_PATH = '/api/proxy/dpdns';
let lastCallAt = 0;

async function throttleDpdns() {
  const elapsed = Date.now() - lastCallAt;
  if (elapsed < 500) {
    await new Promise((resolve) => setTimeout(resolve, 500 - elapsed));
  }
  lastCallAt = Date.now();
}

export interface DpdnsEnvelope<T = unknown> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
}

export const DPDNSService = {
  async listDomains(token: string) {
    await throttleDpdns();
    const endpoint = '/api/v1/domains';
    const res = await callWithFallback({
      directUrl: `${DPDNS_BASE_URL}/domains`,
      directHeaders: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      proxyPath: DPDNS_PROXY_PATH,
      proxyBody: { endpoint, method: 'GET', token },
      method: 'GET',
    });
    return parseApiResponse<DpdnsEnvelope<unknown[]>>(res, 'API Token không hợp lệ');
  },

  async getAccountInfo(token: string) {
    await throttleDpdns();
    const endpoint = '/api/v1/profile';
    const res = await callWithFallback({
      directUrl: `${DPDNS_BASE_URL}/profile`,
      directHeaders: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      proxyPath: DPDNS_PROXY_PATH,
      proxyBody: { endpoint, method: 'GET', token },
      method: 'GET',
    });
    return parseApiResponse<DpdnsEnvelope>(res, 'Failed to fetch account info');
  },

  async registerDomain(token: string, domain: string, slotType: SlotType, nameservers: string[]) {
    await throttleDpdns();
    const endpoint = '/api/v1/domains';
    const body = { domain, slot_type: slotType, nameservers };
    const res = await callWithFallback({
      directUrl: `${DPDNS_BASE_URL}/domains`,
      directHeaders: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      proxyPath: DPDNS_PROXY_PATH,
      proxyBody: { endpoint, method: 'POST', body, token },
      method: 'POST',
      body,
    });
    return parseApiResponse<DpdnsEnvelope>(res, 'Domain registration failed');
  },

  async updateNameservers(token: string, domain: string, nameservers: string[]) {
    await throttleDpdns();
    const safeDomain = encodeURIComponent(domain);
    const endpoint = `/api/v1/domains/${safeDomain}/nameservers`;
    const body = { nameservers };
    const res = await callWithFallback({
      directUrl: `${DPDNS_BASE_URL}/domains/${safeDomain}/nameservers`,
      directHeaders: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      proxyPath: DPDNS_PROXY_PATH,
      proxyBody: { endpoint, method: 'PATCH', body, token },
      method: 'PATCH',
      body,
    });
    return parseApiResponse<DpdnsEnvelope>(res, 'Nameserver update failed');
  },

  async deleteDomain(token: string, domain: string) {
    await throttleDpdns();
    const safeDomain = encodeURIComponent(domain);
    const endpoint = `/api/v1/domains/${safeDomain}`;
    const res = await callWithFallback({
      directUrl: `${DPDNS_BASE_URL}/domains/${safeDomain}`,
      directHeaders: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      proxyPath: DPDNS_PROXY_PATH,
      proxyBody: { endpoint, method: 'DELETE', token },
      method: 'DELETE',
    });
    return parseApiResponse<DpdnsEnvelope>(res, 'Domain delete failed');
  },
};
