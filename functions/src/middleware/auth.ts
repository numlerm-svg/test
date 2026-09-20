import type { NextFunction, Request, Response } from 'express';
import * as admin from 'firebase-admin';

export type Role = 'ADMIN' | 'STAFF' | 'MEMBER';

export interface AuthedUser {
  uid: string;
  role: Role;
  memberId: string | null;
}

declare module 'express-serve-static-core' {
  interface Request {
    authUser?: AuthedUser;
  }
}

async function resolveRole(uid: string): Promise<{ role: Role; memberId: string | null }> {
  const db = admin.firestore();
  const roleDoc = await db.collection('roles').doc(uid).get();
  if (roleDoc.exists) {
    const data = roleDoc.data() as { role: Role };
    return { role: data.role, memberId: null };
  }
  const memberQuery = await db.collection('members').where('firebaseUid', '==', uid).limit(1).get();
  if (!memberQuery.empty) {
    return { role: 'MEMBER', memberId: memberQuery.docs[0].id };
  }
  return { role: 'MEMBER', memberId: null };
}

/** ตรวจสอบ Firebase ID token จาก Authorization header และผูกข้อมูลผู้ใช้ + บทบาทไว้ที่ req.authUser */
export function requireAuth() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
    if (!token) {
      res.status(401).json({ error: 'ไม่พบ Authorization token' });
      return;
    }
    try {
      const decoded = await admin.auth().verifyIdToken(token);
      const { role, memberId } = await resolveRole(decoded.uid);
      req.authUser = { uid: decoded.uid, role, memberId };
      next();
    } catch {
      res.status(401).json({ error: 'Token ไม่ถูกต้องหรือหมดอายุ' });
    }
  };
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.authUser || !roles.includes(req.authUser.role)) {
      res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึงการดำเนินการนี้' });
      return;
    }
    next();
  };
}
