import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_FIREBASE_API_KEY || 'AIzaSyDummyKeyForBuildOnly',
  authDomain: process.env.NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_FIREBASE_AUTH_DOMAIN || 'dummy.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_FIREBASE_PROJECT_ID || 'dummy-project',
  databaseURL: process.env.NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_FIREBASE_DATABASE_URL || 'https://dummy-project.firebaseio.com',
  storageBucket: process.env.NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_FIREBASE_STORAGE_BUCKET || 'dummy-project.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_FIREBASE_MESSAGING_SENDER_ID || '1234567890',
  appId: process.env.NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_FIREBASE_APP_ID || '1:1234567890:web:dummy',
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const googleProvider = new GoogleAuthProvider();
export const db = getDatabase(firebaseApp);
