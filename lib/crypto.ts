import CryptoJS from 'crypto-js';

const getKey = (uid: string) => {
  const salt = process.env.NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_ENCRYPT_SALT;
  if (!salt) {
    throw new Error('NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_ENCRYPT_SALT is missing');
  }
  return `${salt}:${uid}`;
};

export const encrypt = (plain: string, uid: string): string => {
  if (!plain) return '';
  return CryptoJS.AES.encrypt(plain, getKey(uid)).toString();
};

export const decrypt = (cipher: string, uid: string): string => {
  if (!cipher) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(cipher, getKey(uid));
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted;
  } catch (err) {
    return '';
  }
};
