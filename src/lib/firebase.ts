// เริ่มต้น Firebase App เฉพาะเมื่อมี configuration ครบเท่านั้น (โหมด Firebase)
// โหมดทดลองจะไม่เรียกไฟล์นี้เลย จึงไม่มีการเชื่อมต่อเครือข่ายใด ๆ เกิดขึ้น
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getFirebaseConfig } from '../config/env';

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

function ensureApp(): FirebaseApp {
  if (app) return app;
  const config = getFirebaseConfig();
  if (!config) {
    throw new Error('ยังไม่ได้ตั้งค่า Firebase — ระบบควรทำงานในโหมดทดลองอยู่แล้ว');
  }
  app = initializeApp(config);
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    authInstance = getAuth(ensureApp());
  }
  return authInstance;
}

export function getFirebaseDb(): Firestore {
  if (!dbInstance) {
    dbInstance = getFirestore(ensureApp());
  }
  return dbInstance;
}

export const googleAuthProvider = new GoogleAuthProvider();
