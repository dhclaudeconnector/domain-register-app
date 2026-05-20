import CryptoJS from 'crypto-js';

const getKey = (uid: string) => {
  const salt = process.env.NEXT_PUBLIC_ENCRYPT_SALT;
  if (!salt) {
    throw new Error('NEXT_PUBLIC_ENCRYPT_SALT is missing');
  }
  return `${salt}:${uid}`;
};

export const encrypt = (plain: string, uid: string): string => {
  if (!plain) return '';
  return CryptoJS.AES.encrypt(plain, getKey(uid)).toString();
};

export const decrypt = (cipher: string, uid: string): string => {
  if (!cipher) return '';
  const bytes = CryptoJS.AES.decrypt(cipher, getKey(uid));
  return bytes.toString(CryptoJS.enc.Utf8);
};
