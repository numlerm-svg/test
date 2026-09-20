import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { coopService } from '../../services';
import { useCollection } from '../../hooks/useCollection';
import { useAuth } from '../../auth/AuthContext';
import { LoadingState, EmptyState, ErrorState, SuccessToast } from '../common/States';
import { StatusBadge } from '../common/StatusBadge';
import { DEPOSIT_PRODUCTS } from '../../config/policy';
import { formatTHB } from '../../lib/format';
import { AccountForm } from './AccountForm';
import { DepositWithdrawModal } from './DepositWithdrawModal';
import { AccountDetail } from './AccountDetail';
import type { DepositAccount, DepositAccountType } from '../../types';

export function DepositsPage() {
  const { user } = useAuth();
  const membersState = useCollection(() => coopService.listMembers(), (cb) => coopService.subscribeMembers(cb));
  const accountsState = useCollection(() => coopService.listDepositAccounts(), (cb) => coopService.subscribeDepositAccounts(cb));

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | DepositAccountType>('ALL');
  const [showOpenForm, setShowOpenForm] = useState(false);
  const [txnModal, setTxnModal] = useState<{ account: DepositAccount; type: 'DEPOSIT' | 'WITHDRAW' } | null>(null);
  const [detailAccount, setDetailAccount] = useState<DepositAccount | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const canOperate = user?.role === 'ADMIN' || user?.role === 'STAFF';
  const isMemberViewer = user?.role === 'MEMBER';

  const memberById = useMemo(() => new Map(membersState.data.map((m) => [m.id, m])), [membersState.data]);

  const visibleAccounts = isMemberViewer ? accountsState.data.filter((a) => a.memberId === user?.memberId) : accountsState.data;

  const filtered = visibleAccounts.filter((a) => {
    const q = search.trim().toLowerCase();
    const ownerName = memberById.get(a.memberId)?.fullName ?? '';
    const matchesSearch = !q || a.accountNo.toLowerCase().includes(q) || ownerName.toLowerCase().includes(q);
    const matchesType = typeFilter === 'ALL' || a.accountType === typeFilter;
    return matchesSearch && matchesType;
  });

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  }

  if (membersState.loading || accountsState.loading) return <LoadingState label="กำลังโหลดบัญชีเงินฝาก..." />;
  if (membersState.error || accountsState.error) return <ErrorState message={membersState.error ?? accountsState.error ?? ''} onRetry={accountsState.reload} />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">เงินฝากสหกรณ์</h1>
        {canOperate && (
          <button
            type="button"
            onClick={() => setShowOpenForm(true)}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <Plus size={16} />
            เปิดบัญชีใหม่
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
              placeholder="ค้นหาเลขบัญชีหรือชื่อเจ้าของบัญชี"
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as 'ALL' | DepositAccountType)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
            <option value="ALL">ทุกประเภทบัญชี</option>
            {Object.values(DEPOSIT_PRODUCTS).map((p) => (
              <option key={p.type} value={p.type}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState title="ไม่พบบัญชีเงินฝาก" description="ลองปรับคำค้นหาหรือตัวกรอง" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">เลขบัญชี</th>
                <th className="px-4 py-3 text-left font-medium">เจ้าของบัญชี</th>
                <th className="px-4 py-3 text-left font-medium">ประเภท</th>
                <th className="px-4 py-3 text-right font-medium">ยอดคงเหลือ</th>
                <th className="px-4 py-3 text-right font-medium">ดอกเบี้ย/ปี</th>
                <th className="px-4 py-3 text-left font-medium">สถานะ</th>
                {canOperate && <th className="px-4 py-3 text-right font-medium">จัดการ</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="cursor-pointer px-4 py-3 font-medium text-slate-700" onClick={() => setDetailAccount(a)}>
                    {a.accountNo}
                  </td>
                  <td className="cursor-pointer px-4 py-3 text-slate-700" onClick={() => setDetailAccount(a)}>
                    {memberById.get(a.memberId)?.fullName ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{DEPOSIT_PRODUCTS[a.accountType].label}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatTHB(a.balance)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{a.interestRatePercent}%</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={a.status} />
                  </td>
                  {canOperate && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={a.status !== 'ACTIVE'}
                          onClick={() => setTxnModal({ account: a, type: 'DEPOSIT' })}
                          className="rounded-lg border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-40"
                        >
                          ฝาก
                        </button>
                        <button
                          type="button"
                          disabled={a.status !== 'ACTIVE'}
                          onClick={() => setTxnModal({ account: a, type: 'WITHDRAW' })}
                          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                        >
                          ถอน
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showOpenForm && user && (
        <AccountForm
          members={membersState.data.filter((m) => m.status === 'ACTIVE')}
          actorUid={user.uid}
          onClose={() => setShowOpenForm(false)}
          onSubmit={async (input) => {
            await coopService.openDepositAccount(input);
            showToast('เปิดบัญชีใหม่สำเร็จ');
          }}
        />
      )}

      {txnModal && user && (
        <DepositWithdrawModal
          account={txnModal.account}
          type={txnModal.type}
          actorUid={user.uid}
          onClose={() => setTxnModal(null)}
          onSubmit={async (input) => {
            if (txnModal.type === 'DEPOSIT') {
              await coopService.deposit(input);
            } else {
              await coopService.withdraw(input);
            }
            showToast(txnModal.type === 'DEPOSIT' ? 'ฝากเงินสำเร็จ' : 'ถอนเงินสำเร็จ');
          }}
        />
      )}

      {detailAccount && <AccountDetail account={detailAccount} member={memberById.get(detailAccount.memberId)} onClose={() => setDetailAccount(null)} />}

      {toast && <SuccessToast message={toast} />}
    </div>
  );
}
