import { useEffect, useState } from 'react';
import { coopService } from '../../services';
import { useCollection } from '../../hooks/useCollection';
import { useAuth } from '../../auth/AuthContext';
import { LoadingState, EmptyState, ErrorState, SuccessToast } from '../common/States';
import { StatusBadge } from '../common/StatusBadge';
import { formatTHB, formatThaiDateTime, formatNumber } from '../../lib/format';
import { DividendCalculator } from './DividendCalculator';
import { DividendApprovalPanel } from './DividendApprovalPanel';
import type { DividendRun, ShareLedgerEntry } from '../../types';

export function SharesPage() {
  const { user } = useAuth();
  const membersState = useCollection(() => coopService.listMembers(), (cb) => coopService.subscribeMembers(cb));
  const [dividendRuns, setDividendRuns] = useState<DividendRun[]>([]);
  const [runsLoading, setRunsLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState<DividendRun | null>(null);
  const [ownLedger, setOwnLedger] = useState<ShareLedgerEntry[] | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const isAdmin = user?.role === 'ADMIN';
  const isMemberViewer = user?.role === 'MEMBER';

  function reloadRuns() {
    setRunsLoading(true);
    coopService.listDividendRuns().then((runs) => {
      setDividendRuns([...runs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      setRunsLoading(false);
    });
  }

  useEffect(reloadRuns, []);

  useEffect(() => {
    if (isMemberViewer && user?.memberId) {
      coopService.listShareLedger(user.memberId).then((list) => setOwnLedger([...list].sort((a, b) => b.timestamp.localeCompare(a.timestamp))));
    }
  }, [isMemberViewer, user?.memberId]);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  }

  if (membersState.loading) return <LoadingState label="กำลังโหลดข้อมูลหุ้น..." />;
  if (membersState.error) return <ErrorState message={membersState.error} onRetry={membersState.reload} />;

  const currentMember = user?.memberId ? membersState.data.find((m) => m.id === user.memberId) : undefined;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">หุ้นและเงินปันผล</h1>

      {isMemberViewer && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Summary label="จำนวนหุ้นสะสม" value={formatNumber(currentMember?.shareCount ?? 0)} />
            <Summary label="มูลค่าหุ้นสะสม" value={formatTHB(currentMember?.shareValue ?? 0)} />
            <Summary label="ยอดส่งหุ้นรายเดือน" value={formatTHB(currentMember?.monthlyShareContribution ?? 0)} />
          </div>
          <h2 className="mt-5 text-sm font-medium text-slate-700">ประวัติหุ้นและเงินปันผล</h2>
          {ownLedger === null ? (
            <LoadingState label="กำลังโหลดประวัติ..." />
          ) : ownLedger.length === 0 ? (
            <EmptyState title="ยังไม่มีประวัติ" />
          ) : (
            <div className="mt-2 max-h-72 overflow-y-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">วันที่</th>
                    <th className="px-3 py-2 text-left font-medium">รายการ</th>
                    <th className="px-3 py-2 text-right font-medium">จำนวนเงิน</th>
                    <th className="px-3 py-2 text-right font-medium">มูลค่าสะสม</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ownLedger.map((e) => (
                    <tr key={e.id}>
                      <td className="px-3 py-2 text-slate-600">{formatThaiDateTime(e.timestamp)}</td>
                      <td className="px-3 py-2 text-slate-700">{e.note}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatTHB(e.amount)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatTHB(e.balanceValueAfter)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {!isMemberViewer && (
        <>
          {isAdmin && <DividendCalculator onCreate={async (input) => { await coopService.createDividendRun(input); reloadRuns(); showToast('สร้างรอบปันผลฉบับร่างสำเร็จ'); }} />}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">รอบปันผลทั้งหมด</h2>
            {runsLoading ? (
              <LoadingState label="กำลังโหลดรอบปันผล..." />
            ) : dividendRuns.length === 0 ? (
              <EmptyState title="ยังไม่มีรอบปันผล" />
            ) : (
              <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">ปีบัญชี</th>
                      <th className="px-3 py-2 text-right font-medium">อัตราปันผล</th>
                      <th className="px-3 py-2 text-right font-medium">ยอดรวม</th>
                      <th className="px-3 py-2 text-right font-medium">สมาชิก</th>
                      <th className="px-3 py-2 text-left font-medium">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dividendRuns.map((r) => (
                      <tr key={r.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setSelectedRun(r)}>
                        <td className="px-3 py-2 font-medium text-slate-700">{r.fiscalYearBE}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.dividendRatePercent}%</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatTHB(r.totalDividendAmount)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatNumber(r.memberCount)}</td>
                        <td className="px-3 py-2">
                          <StatusBadge status={r.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {selectedRun && user && (
        <DividendApprovalPanel
          run={selectedRun}
          members={membersState.data}
          actorUid={user.uid}
          onClose={() => setSelectedRun(null)}
          onApprove={async () => {
            const updated = await coopService.approveDividendRun(selectedRun.id, user.uid);
            setSelectedRun(updated);
            reloadRuns();
            showToast('อนุมัติรอบปันผลสำเร็จ');
          }}
          onProcess={async () => {
            const updated = await coopService.processDividendRun(selectedRun.id);
            setSelectedRun(updated);
            reloadRuns();
            showToast('ประมวลผลจ่ายปันผลสำเร็จ');
          }}
        />
      )}

      {toast && <SuccessToast message={toast} />}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 tabular-nums text-lg font-semibold text-slate-800">{value}</p>
    </div>
  );
}
