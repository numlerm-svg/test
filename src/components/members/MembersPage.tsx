import { useMemo, useState } from 'react';
import { Search, UserPlus } from 'lucide-react';
import { coopService } from '../../services';
import { useCollection } from '../../hooks/useCollection';
import { useAuth } from '../../auth/AuthContext';
import { LoadingState, EmptyState, ErrorState, SuccessToast } from '../common/States';
import { StatusBadge } from '../common/StatusBadge';
import { maskNationalId } from '../../lib/validate';
import { formatTHB } from '../../lib/format';
import { MemberForm } from './MemberForm';
import { MemberDetail } from './MemberDetail';
import type { Member, MemberStatus } from '../../types';

export function MembersPage() {
  const { user } = useAuth();
  const { data: members, loading, error, reload } = useCollection(
    () => coopService.listMembers(),
    (cb) => coopService.subscribeMembers(cb),
  );

  const [search, setSearch] = useState('');
  const [affiliationFilter, setAffiliationFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | MemberStatus>('ALL');
  const [detailMember, setDetailMember] = useState<Member | null>(null);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const canManage = user?.role === 'ADMIN' || user?.role === 'STAFF';
  const isMemberViewer = user?.role === 'MEMBER';

  const visibleMembers = isMemberViewer ? members.filter((m) => m.id === user?.memberId) : members;

  const affiliations = useMemo(() => Array.from(new Set(members.map((m) => m.affiliation))).sort(), [members]);

  const filtered = visibleMembers.filter((m) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q || m.fullName.toLowerCase().includes(q) || m.memberNo.toLowerCase().includes(q) || m.affiliation.toLowerCase().includes(q);
    const matchesAffiliation = affiliationFilter === 'ALL' || m.affiliation === affiliationFilter;
    const matchesStatus = statusFilter === 'ALL' || m.status === statusFilter;
    return matchesSearch && matchesAffiliation && matchesStatus;
  });

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  }

  if (loading) return <LoadingState label="กำลังโหลดทะเบียนสมาชิก..." />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">ทะเบียนสมาชิก</h1>
        {canManage && (
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <UserPlus size={16} />
            รับสมัครสมาชิกใหม่
          </button>
        )}
      </div>

      {!isMemberViewer && (
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อ เลขสมาชิก หรือสังกัด"
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <select
            value={affiliationFilter}
            onChange={(e) => setAffiliationFilter(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          >
            <option value="ALL">ทุกสังกัด</option>
            {affiliations.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | MemberStatus)}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          >
            <option value="ALL">ทุกสถานะ</option>
            <option value="ACTIVE">ใช้งานอยู่</option>
            <option value="SUSPENDED">ระงับชั่วคราว</option>
            <option value="RESIGNED">ลาออก</option>
          </select>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState title="ไม่พบสมาชิกที่ตรงกับเงื่อนไข" description="ลองปรับคำค้นหาหรือตัวกรอง" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">เลขสมาชิก</th>
                <th className="px-4 py-3 text-left font-medium">ชื่อ-นามสกุล</th>
                <th className="px-4 py-3 text-left font-medium">สังกัด</th>
                <th className="px-4 py-3 text-right font-medium">หุ้นสะสม</th>
                <th className="px-4 py-3 text-right font-medium">เงินฝากรวม</th>
                <th className="px-4 py-3 text-right font-medium">เงินกู้คงค้าง</th>
                <th className="px-4 py-3 text-left font-medium">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((m) => (
                <tr key={m.id} onClick={() => setDetailMember(m)} className="cursor-pointer hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-700">{m.memberNo}</td>
                  <td className="px-4 py-3">
                    <p className="text-slate-800">{m.fullName}</p>
                    <p className="text-xs text-slate-400">{maskNationalId(m.nationalId)}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{m.affiliation}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatTHB(m.shareValue)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatTHB(m.totalDeposits)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatTHB(m.outstandingLoans)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={m.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detailMember && (
        <MemberDetail
          member={detailMember}
          canSeeFullNationalId={canManage || detailMember.id === user?.memberId}
          canEdit={canManage}
          onClose={() => setDetailMember(null)}
          onEdit={() => {
            setEditingMember(detailMember);
            setDetailMember(null);
          }}
        />
      )}

      {showCreateForm && (
        <MemberForm
          onClose={() => setShowCreateForm(false)}
          onSubmit={async (input) => {
            await coopService.createMember(input);
            showToast('รับสมัครสมาชิกใหม่สำเร็จ');
          }}
        />
      )}

      {editingMember && (
        <MemberForm
          initial={editingMember}
          onClose={() => setEditingMember(null)}
          onSubmit={async (input) => {
            await coopService.updateMember(editingMember.id, input);
            showToast('บันทึกการแก้ไขสำเร็จ');
          }}
        />
      )}

      {toast && <SuccessToast message={toast} />}
    </div>
  );
}
