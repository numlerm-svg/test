import { useState } from 'react';
import { Building2, LogOut, Sparkles } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { COOP_NAME, SYSTEM_NAME, AI_ASSISTANT_NAME } from '../../config/policy';
import type { Role } from '../../types';

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'ผู้ดูแลระบบ',
  STAFF: 'เจ้าหน้าที่',
  MEMBER: 'สมาชิก',
};

export function Header({ onOpenCoopAi }: { onOpenCoopAi: () => void }) {
  const { user, isDemoMode, signInWithGoogle, signOutUser, setDemoRole } = useAuth();
  const [signingIn, setSigningIn] = useState(false);

  async function handleSignIn() {
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <Building2 size={20} />
          </span>
          <div>
            <p className="text-sm font-semibold leading-tight text-slate-900">{SYSTEM_NAME}</p>
            <p className="text-xs leading-tight text-slate-500">{COOP_NAME}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenCoopAi}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Sparkles size={16} />
            {AI_ASSISTANT_NAME}
          </button>

          {isDemoMode && (
            <label className="hidden items-center gap-1.5 text-xs text-slate-500 sm:flex">
              มุมมอง
              <select
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700"
                value={user?.role ?? 'ADMIN'}
                onChange={(e) => setDemoRole(e.target.value as Role)}
              >
                <option value="ADMIN">ผู้ดูแลระบบ</option>
                <option value="STAFF">เจ้าหน้าที่</option>
                <option value="MEMBER">สมาชิก</option>
              </select>
            </label>
          )}

          {isDemoMode ? (
            <button
              type="button"
              disabled
              title="เข้าสู่ระบบด้วย Google ใช้งานได้เมื่อเจ้าของเว็บตั้งค่า Firebase แล้ว"
              className="cursor-not-allowed rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-400"
            >
              โหมดทดลอง
            </button>
          ) : user ? (
            <div className="flex items-center gap-2">
              <div className="hidden text-right sm:block">
                <p className="text-xs font-medium leading-tight text-slate-700">{user.displayName}</p>
                <p className="text-[11px] leading-tight text-slate-400">{ROLE_LABEL[user.role]}</p>
              </div>
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="h-8 w-8 rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-600">
                  {user.displayName.charAt(0)}
                </span>
              )}
              <button
                type="button"
                onClick={() => signOutUser()}
                aria-label="ออกจากระบบ"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSignIn}
              disabled={signingIn}
              className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {signingIn ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบด้วย Google'}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
