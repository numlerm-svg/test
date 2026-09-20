import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { IS_FIREBASE_MODE } from '../config/env';
import type { AppUser, Role } from '../types';

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  isDemoMode: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  /** ใช้ในโหมดทดลองเท่านั้น เพื่อสลับดูมุมมองของผู้ใช้แต่ละบทบาท */
  setDemoRole: (role: Role) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const DEMO_USER_BASE: AppUser = {
  uid: 'demo-user',
  displayName: 'ผู้ใช้งานโหมดทดลอง',
  email: null,
  photoURL: null,
  role: 'ADMIN',
  memberId: 'mem-1',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(IS_FIREBASE_MODE ? null : DEMO_USER_BASE);
  const [loading, setLoading] = useState(IS_FIREBASE_MODE);

  useEffect(() => {
    if (!IS_FIREBASE_MODE) return;
    let unsubscribeAuth: (() => void) | undefined;

    (async () => {
      const [{ onAuthStateChanged }, { getFirebaseAuth }] = await Promise.all([
        import('firebase/auth'),
        import('../lib/firebase'),
      ]);
      unsubscribeAuth = onAuthStateChanged(getFirebaseAuth(), async (fbUser) => {
        if (!fbUser) {
          setUser(null);
          setLoading(false);
          return;
        }
        const role = await resolveRole(fbUser.uid);
        setUser({
          uid: fbUser.uid,
          displayName: fbUser.displayName ?? fbUser.email ?? 'ผู้ใช้งาน',
          email: fbUser.email,
          photoURL: fbUser.photoURL,
          role: role.role,
          memberId: role.memberId,
        });
        setLoading(false);
      });
    })();

    return () => unsubscribeAuth?.();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isDemoMode: !IS_FIREBASE_MODE,
      async signInWithGoogle() {
        if (!IS_FIREBASE_MODE) return;
        const [{ signInWithPopup }, { getFirebaseAuth, googleAuthProvider }] = await Promise.all([
          import('firebase/auth'),
          import('../lib/firebase'),
        ]);
        await signInWithPopup(getFirebaseAuth(), googleAuthProvider);
      },
      async signOutUser() {
        if (!IS_FIREBASE_MODE) return;
        const [{ signOut }, { getFirebaseAuth }] = await Promise.all([import('firebase/auth'), import('../lib/firebase')]);
        await signOut(getFirebaseAuth());
      },
      setDemoRole(role: Role) {
        if (IS_FIREBASE_MODE) return;
        setUser((prev) => ({ ...(prev ?? DEMO_USER_BASE), role }));
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * roles/{uid} คือแหล่งข้อมูลบทบาทเดียวที่เชื่อถือได้ (เขียนได้เฉพาะผ่าน Cloud Function ด้วย Admin SDK)
 * ผู้ดูแลระบบเป็นผู้สร้างเอกสารนี้เมื่อมอบสิทธิ์เจ้าหน้าที่/ผู้ดูแลระบบ หรือผูกบัญชี Google กับสมาชิก
 * ผู้ใช้ที่ยังไม่ถูกผูกจะเห็นเป็นบทบาทสมาชิกที่ยังไม่มีข้อมูลผูกบัญชี (memberId เป็น null)
 */
async function resolveRole(uid: string): Promise<{ role: Role; memberId: string | null }> {
  const [{ doc, getDoc }, { getFirebaseDb }] = await Promise.all([import('firebase/firestore'), import('../lib/firebase')]);
  const db = getFirebaseDb();
  const roleSnap = await getDoc(doc(db, 'roles', uid));
  if (roleSnap.exists()) {
    const data = roleSnap.data() as { role: Role; memberId?: string | null };
    return { role: data.role, memberId: data.memberId ?? null };
  }
  return { role: 'MEMBER', memberId: null };
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth ต้องถูกเรียกภายใน AuthProvider');
  return ctx;
}
