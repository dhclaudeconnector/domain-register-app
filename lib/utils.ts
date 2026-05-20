import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(value: number) {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function maskSecret(value?: string, visibleStart = 6, visibleEnd = 4) {
  if (!value) return '';
  if (value.length <= visibleStart + visibleEnd) return '•'.repeat(Math.max(value.length, 8));
  return `${value.slice(0, visibleStart)}••••${value.slice(-visibleEnd)}`;
}

export function toErrorMessage(error: unknown, fallback = 'Something went wrong') {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return fallback;
}

export function isEmailAllowed(email?: string | null) {
  const allowed = process.env.NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_ALLOWED_EMAILS;
  if (!allowed || allowed.trim() === '') return true;
  const list = allowed.split(/[;,|]+/).map(item => item.trim().toLowerCase()).filter(Boolean);
  if (!email) return false;
  return list.includes(email.toLowerCase());
}
