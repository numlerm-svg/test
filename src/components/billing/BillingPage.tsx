import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { coopService } from '../../services';
import { useCollection } from '../../hooks/useCollection';
import { useAuth } from '../../auth/AuthContext';
import { LoadingState, EmptyState, ErrorState, SuccessToast } from '../common/States';
import { StatusBadge } from '../common/StatusBadge';
import { formatTHB, formatNumber, formatThaiDate } from '../../lib/format';
import { MonthlyBillingGenerator } from './MonthlyBillingGenerator';
import { BillingItemsModal } from './BillingItemsModal';
import type { BillingItem, BillingRun } from '../../types';

export function BillingPage() {
  const { user } = useAuth();
  const membersState = useCollection(() => coopService.listMembers(), (cb) => coopService.subscribeMembers(cb));
  const [runs, setRuns] = useState<BillingRun[]>([]);
  const [runsLoading, setRunsLoading] = useState(true);
  const [showGenerator, setShowGenerator] = useState(false);
  const [selectedRun, setSelectedRun] = useState<BillingRun | null>(null);
  const [ownItems, setOwnItems] = useState<BillingItem[] | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const canManage = user?.role === 'ADMIN' || user?.role === 'STAFF';
  const isMemberViewer = user?.role === 'MEMBER';

  function reloadRuns() {
    setRunsLoading(true);
    coopService.listBillingRuns().then((list) => {
      setRuns([...list].sort((a, b) => b.periodLabel.localeCompare(a.periodLabel)));
      setRunsLoading(false);
    });
  }
  useEffect(reloadRuns, []);

  useEffect(() => {
    if (!isMemberViewer || !user?.memberId) return;
    (async () => {
      const allRuns = await coopService.listBillingRuns();
      const itemLists = await Promise.all(allRuns.map((r) => coopService.listBillingItems(r.id)));
      const mine = itemLists.flat().filter((item) => item.memberId === user.memberId);
      setOwnItems(mine.sort((a, b) => b.dueDate.localeCompare(a.dueDate)));
    })();
  }, [isMemberViewer, user?.memberId]);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  }

  if (membersState.loading) return <LoadingState label="กำลังโหลดข้อมูลการเรียกเก็บ..." />;
  if (membersState.error) return <ErrorState message={membersState.error} onRetry={membersState.reload} />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">เรียกเก็บรายเดือน</h1>
        {canManage && (
          <button
            type="button"
            onClick={() => setShowGenerator(true)}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <Plus size={16} />
            จัดทำรายการเรียกเก็บ
          </button>
        )}
      </div>

      {isMemberViewer ? (
        ownItems === null ? (
          <LoadingState label="กำลังโหลดรายการของท่าน..." />
        ) : ownItems.length === 0 ? (
          <EmptyState title="ยังไม่มีรายการเรียกเก็บ" />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">ครบกำหนด</th>
                  <th className="px-4 py-3 text-right font-medium">ส่งหุ้น</th>
                  <th className="px-4 py-3 text-right font-medium">ค่างวดเงินกู้</th>
                  <th className="px-4 py-3 text-right font-medium">รวม</th>
                  <th className="px-4 py-3 text-left font-medium">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ownItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-slate-600">{formatThaiDate(item.dueDate)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatTHB(item.shareContribution)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatTHB(item.loanInstallment)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">{formatTHB(item.totalDue)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : runsLoading ? (
        <LoadingState label="กำลังโหลดรอบเรียกเก็บ..." />
      ) : runs.length === 0 ? (
        <EmptyState title="ยังไม่มีรอบเรียกเก็บ" description="จัดทำรอบเรียกเก็บงวดแรกเพื่อเริ่มต้น" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">งวด</th>
                <th className="px-4 py-3 text-right font-medium">จำนวนรายการ</th>
                <th className="px-4 py-3 text-right font-medium">ยอดเรียกเก็บรวม</th>
                <th className="px-4 py-3 text-right font-medium">ยอดชำระแล้ว</th>
                <th className="px-4 py-3 text-left font-medium">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {runs.map((r) => (
                <tr key={r.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setSelectedRun(r)}>
                  <td className="px-4 py-3 font-medium text-slate-700">{r.periodLabel}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatNumber(r.totalItems)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatTHB(r.totalAmount)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatTHB(r.totalCollected)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showGenerator && (
        <MonthlyBillingGenerator
          onClose={() => setShowGenerator(false)}
          onSubmit={async (input) => {
            await coopService.generateBillingRun(input);
            reloadRuns();
            showToast('จัดทำรายการเรียกเก็บสำเร็จ');
          }}
        />
      )}

      {selectedRun && user && (
        <BillingItemsModal
          run={selectedRun}
          members={membersState.data}
          canMarkPaid={canManage}
          actorUid={user.uid}
          onClose={() => {
            setSelectedRun(null);
            reloadRuns();
          }}
        />
      )}

      {toast && <SuccessToast message={toast} />}
    </div>
  );
}
