import { IS_FIREBASE_MODE } from '../config/env';
import { demoService } from './demo/demoService';
import { firebaseService } from './firebase/firebaseService';
import type { CoopDataService } from './types';

// การ import แบบ static ที่นี่ไม่ได้เชื่อมต่อเครือข่ายใด ๆ ทันที — firebaseService เรียก getFirebaseDb()
// แบบ lazy เฉพาะตอนถูกเรียกใช้งานจริงเท่านั้น (ดู src/lib/firebase.ts) จึงปลอดภัยแม้อยู่ในโหมดทดลอง
export const coopService: CoopDataService = IS_FIREBASE_MODE ? firebaseService : demoService;
export const IS_DEMO_MODE = !IS_FIREBASE_MODE;
export type * from './types';
