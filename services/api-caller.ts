import { logger } from '@/lib/logger';

export interface ApiCallerOptions {
  directUrl: string;
  directHeaders: Record<string, string>;
  proxyPath: string;
  proxyBody: any;
  method?: string;
  body?: object;
  timeoutMs?: number;
}

export async function callWithFallback(options: ApiCallerOptions): Promise<Response> {
  const { proxyPath, proxyBody, timeoutMs = 8000 } = options;
  
  // Identify service based on proxyPath
  const caption = proxyPath.includes('cloudflare') ? 'Cloudflare API' : 'DPDNS API';
  const method = proxyBody.method || 'POST';
  const endpoint = proxyBody.endpoint || '';
  
  logger.info(caption, `Request: ${method} ${endpoint}`);
  logger.debug(caption, `Request Payload:`, proxyBody);
  
  try {
    const res = await fetch(proxyPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(proxyBody),
      signal: AbortSignal.timeout(timeoutMs),
    });
    
    const resClone = res.clone();
    
    if (res.ok) {
      logger.info(caption, `Response Success [HTTP ${res.status}]`);
      resClone.json()
        .then(data => {
          logger.debug(caption, `Response Payload:`, data);
        })
        .catch(() => {
          logger.debug(caption, `Response Payload: (Failed to parse JSON)`);
        });
    } else {
      logger.warn(caption, `Response Error [HTTP ${res.status}]`);
      resClone.json()
        .then(data => {
          logger.debug(caption, `Response Payload (Error):`, data);
        })
        .catch(() => {
          logger.debug(caption, `Response Payload (Error): (Failed to parse JSON)`);
        });
    }
    
    return res;
  } catch (error) {
    logger.error(caption, `Connection / Timeout Error: ${error instanceof Error ? error.message : String(error)}`, error);
    throw error;
  }
}

export async function parseApiResponse<T>(res: Response, fallbackMessage: string): Promise<T> {
  const data = await res.json().catch(() => null);
  if (!res.ok || !data || data.success !== true) {
    const apiMessage = data?.errors?.[0]?.message || data?.message || data?.error || fallbackMessage;
    const details = data ? ` ${JSON.stringify(data)}` : '';
    throw new Error(`${apiMessage} [HTTP ${res.status}]${details}`);
  }
  return data as T;
}
