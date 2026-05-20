import { z } from 'zod';

export const subdomainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/, 'Invalid subdomain format')
  .max(63);

export const namespaceSchema = z.enum(['.dpdns.org', '.us.kg', '.qzz.io', '.xx.kg']);

export const credentialsSchema = z.object({
  name: z.string().min(1, 'Account name is required').trim(),
  dpdnsToken: z.string().min(1, 'DPDNS token is required').trim(),
  cloudflareEmail: z.string().email('Invalid Cloudflare email'),
  cloudflareApiKey: z.string().min(1, 'Cloudflare API Key is required').trim(),
  cloudflareAccountId: z.string().trim().optional().or(z.literal('')),
});


export const registerDomainSchema = z.object({
  subdomain: subdomainSchema,
  namespace: namespaceSchema,
  accountId: z.string().min(1, 'Please select an account'),
});

export const editDomainSchema = z.object({
  notes: z.string().max(500).optional(),
  status: z.enum(['active', 'pending', 'error', 'deleted']),
});

export type CredentialsFormValues = z.infer<typeof credentialsSchema>;
export type RegisterDomainValues = z.infer<typeof registerDomainSchema>;
export type EditDomainValues = z.infer<typeof editDomainSchema>;

