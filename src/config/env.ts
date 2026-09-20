// ตรวจสอบว่าระบบมี Firebase configuration ครบหรือไม่ เพื่อสลับระหว่าง "โหมดทดลอง" กับ "โหมด Firebase"
// ผู้ใช้ทั่วไปไม่ต้องกรอกค่าใด ๆ — ค่าทั้งหมดมาจาก environment ที่เจ้าของเว็บตั้งไว้ตอน build/deploy

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

function readEnv(key: string): string | undefined {
  const value = import.meta.env[key as keyof ImportMetaEnv] as string | undefined;
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

export function getFirebaseConfig(): FirebaseWebConfig | null {
  const apiKey = readEnv('VITE_FIREBASE_API_KEY');
  const authDomain = readEnv('VITE_FIREBASE_AUTH_DOMAIN');
  const projectId = readEnv('VITE_FIREBASE_PROJECT_ID');
  const storageBucket = readEnv('VITE_FIREBASE_STORAGE_BUCKET');
  const messagingSenderId = readEnv('VITE_FIREBASE_MESSAGING_SENDER_ID');
  const appId = readEnv('VITE_FIREBASE_APP_ID');

  if (!apiKey || !authDomain || !projectId || !storageBucket || !messagingSenderId || !appId) {
    return null;
  }

  return { apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId };
}

export const IS_FIREBASE_MODE = getFirebaseConfig() !== null;

export function getApiBaseUrl(): string {
  return readEnv('VITE_API_BASE_URL') ?? '/api';
}
