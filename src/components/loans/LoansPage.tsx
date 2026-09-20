import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { coopService } from '../../services';
import { useCollection } from '../../hooks/useCollection';
import { useAuth } from '../../auth/AuthContext';
import { LoadingState, EmptyState, ErrorState, SuccessToast } from '../common/States';
import { StatusBadge } from '../common/StatusBadge';
import { LOAN_POLICIES } from '../../config/policy';
import { formatTHB, formatThaiDate } from '../../lib/format';
import { LoanCalculator } from './LoanCalculator';
import { LoanApplicationForm } from './LoanApplicationForm';
import { LoanApprovalPanel } from './LoanApprovalPanel';
import { LoanContractDetail } from './LoanContractDetail';
import type { LoanApplication, LoanContract } from '../../types';

type Tab = 'CONTRACTS' | 'APPLICATIONS' | 'CALCULATOR';

export function LoansPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>(searchParams.get('apply') ? 'APPLICATIONS' : 'CONTRACTS');
  const [showApplyForm, setShowApplyForm] = useState(searchParams.get('apply') === '1');
  const [reviewing, setReviewing] = useState<LoanApplication | null>(null);
  const [viewingContract, setViewingContract] = useState<LoanContract | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const membersState = useCollection(() => coopService.listMembers(), (cb) => coopService.subscribeMembers(cb));
  const contractsState = useCollection(() => coopService.listLoanContracts(), (cb) => coopService.subscribeLoanContracts(cb));
  const applicationsState = useCollection(() => coopService.listLoanApplications(), (cb) => coopService.subscribeLoanApplications(cb));

  const memberById = useMemo(() => new Map(membersState.data.map((m) => [m.id, m])), [membersState.data]);
  const canDecide = user?.role === 'ADMIN' || user?.role === 'STAFF';
  const isMemberViewer = user?.role === 'MEMBER';
  const currentMember = user?.memberId ? memberById.get(user.memberId) : undefined;

  const visibleContracts = isMemberViewer ? contractsState.data.filter((c) => c.memberId === user?.memberId) : contractsState.data;
  const visibleApplications = isMemberViewer ? applicationsState.data.filter((a) => a.memberId === user?.memberId) : applicationsState.data;
  const pendingApplications = visibleApplications.filter((a) => a.status === 'PENDING');

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  }

  const loading = membersState.loading || contractsState.loading || applicationsState.loading;
  const anyError = membersState.error || contractsState.error || applicationsState.error;

  if (loading) return <LoadingState label="กำลังโหลดข้อมูลสินเชื่อ..." />;
  if (anyError) return <ErrorState message={anyError} onRetry={contractsState.reload} />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">สินเชื่อและเงินกู้</h1>
        {isMemberViewer && currentMember && (
          <button
            type="button"
            onClick={() => setShowApplyForm(true)}
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            ยื่นคำขอกู้เงิน
          </button>
        )}
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1">
        {(
          [
            ['CONTRACTS', 'สัญญาเงินกู้ทั้งหมด'],
            ['APPLICATIONS', `คำขอรอพิจารณา${pendingApplications.length ? ` (${pendingApplications.length})` : ''}`],
            ['CALCULATOR', 'เครื่องคำนวณเงินกู้'],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`shrink-0 rounded-lg px-3.5 py-2 text-sm font-medium ${tab === key ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'CONTRACTS' &&
        (visibleContracts.length === 0 ? (
          <EmptyState title="ยังไม่มีสัญญาเงินกู้" />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">เลขที่สัญญา</th>
                  <th className="px-4 py-3 text-left font-medium">สมาชิก</th>
                  <th className="px-4 py-3 text-left font-medium">ประเภท</th>
                  <th className="px-4 py-3 text-right font-medium">เงินต้นคงเหลือ</th>
                  <th className="px-4 py-3 text-right font-medium">ค่างวด/เดือน</th>
                  <th className="px-4 py-3 text-left font-medium">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleContracts.map((c) => (
                  <tr key={c.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setViewingContract(c)}>
                    <td className="px-4 py-3 font-medium text-slate-700">{c.contractNo}</td>
                    <td className="px-4 py-3 text-slate-700">{memberById.get(c.memberId)?.fullName ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{LOAN_POLICIES[c.loanType].label}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatTHB(c.principalOutstanding)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatTHB(c.monthlyInstallment)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

      {tab === 'APPLICATIONS' &&
        (visibleApplications.length === 0 ? (
          <EmptyState title="ยังไม่มีคำขอกู้" />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">เลขที่คำขอ</th>
                  <th className="px-4 py-3 text-left font-medium">สมาชิก</th>
                  <th className="px-4 py-3 text-left font-medium">ประเภท</th>
                  <th className="px-4 py-3 text-right font-medium">จำนวนที่ขอกู้</th>
                  <th className="px-4 py-3 text-left font-medium">วันที่ยื่น</th>
                  <th className="px-4 py-3 text-left font-medium">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleApplications.map((a) => (
                  <tr
                    key={a.id}
                    className={canDecide && a.status === 'PENDING' ? 'cursor-pointer hover:bg-slate-50' : ''}
                    onClick={() => canDecide && a.status === 'PENDING' && setReviewing(a)}
                  >
                    <td className="px-4 py-3 font-medium text-slate-700">{a.applicationNo}</td>
                    <td className="px-4 py-3 text-slate-700">{memberById.get(a.memberId)?.fullName ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{LOAN_POLICIES[a.loanType].label}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatTHB(a.requestedAmount)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatThaiDate(a.submittedAt)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={a.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

      {tab === 'CALCULATOR' && <LoanCalculator />}

      {showApplyForm && currentMember && (
        <LoanApplicationForm
          member={currentMember}
          onClose={() => {
            setShowApplyForm(false);
            searchParams.delete('apply');
            setSearchParams(searchParams, { replace: true });
          }}
          onSubmit={async (input) => {
            await coopService.submitLoanApplication(input);
            showToast('ยื่นคำขอกู้สำเร็จ รอการพิจารณา');
          }}
        />
      )}

      {reviewing && user && (
        <LoanApprovalPanel
          application={reviewing}
          member={memberById.get(reviewing.memberId)}
          actorUid={user.uid}
          onClose={() => setReviewing(null)}
          onDecide={async (approve, note) => {
            await coopService.decideLoanApplication({ applicationId: reviewing.id, approve, decidedByUid: user.uid, note });
            showToast(approve ? 'อนุมัติคำขอกู้สำเร็จ' : 'บันทึกการไม่อนุมัติสำเร็จ');
          }}
        />
      )}

      {viewingContract && user && (
        <LoanContractDetail
          contract={viewingContract}
          member={memberById.get(viewingContract.memberId)}
          canRepay={canDecide}
          actorUid={user.uid}
          onClose={() => setViewingContract(null)}
        />
      )}

      {toast && <SuccessToast message={toast} />}
    </div>
  );
}
