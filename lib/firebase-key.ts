/**
 * Sanitize a string for use as a Firebase Realtime Database key.
 * Firebase keys cannot contain: . $ # [ ] /
 */
export function toFirebaseKey(value: string): string {
  return value
    .replace(/\./g, '_dot_')
    .replace(/\$/g, '_dol_')
    .replace(/\#/g, '_hash_')
    .replace(/\[/g, '_lb_')
    .replace(/\]/g, '_rb_')
    .replace(/\//g, '_sl_');
}

/** Reverse a sanitized Firebase key for display. */
export function fromFirebaseKey(key: string): string {
  return key
    .replace(/_dot_/g, '.')
    .replace(/_dol_/g, '$')
    .replace(/_hash_/g, '#')
    .replace(/_lb_/g, '[')
    .replace(/_rb_/g, ']')
    .replace(/_sl_/g, '/');
}
