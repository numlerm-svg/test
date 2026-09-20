import { useEffect, useState } from 'react';
import { Modal } from '../common/Modal';
import { LoadingState, EmptyState } from '../common/States';
import { StatusBadge } from '../common/StatusBadge';
import { formatTHB, formatNumber } from '../../lib/format';
import { coopService } from '../../services';
import type { DividendAllocation, DividendRun, Member } from '../../types';

export function DividendApprovalPanel({
  run,
  members,
  actorUid,
  onClose,
  onApprove,
  onProcess,
}: {
  run: DividendRun;
  members: Member[];
  actorUid: string;
  onClose: () => void;
  onApprove: () => Promise<void>;
  onProcess: () => Promise<void>;
}) {
  const [allocations, setAllocations] = useState<DividendAllocation[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const memberById = new Map(members.map((m) => [m.id, m]));

  useEffect(() => {
    coopService.listDividendAllocations(run.id).then(setAllocations);
  }, [run.id]);

  async function handle(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ดำเนินการไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`รอบปันผลปี ${run.fiscalYearBE}`} onClose={onClose} widthClassName="max-w-2xl">
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
          <div>
            <p className="text-sm text-slate-500">อัตราปันผล {run.dividendRatePercent}% ต่อหุ้น</p>
            <p className="tabular-nums text-lg font-semibold text-slate-900">รวม {formatTHB(run.totalDividendAmount)}</p>
            <p className="text-xs text-slate-400">สมาชิกที่ได้รับ {formatNumber(run.memberCount)} คน</p>
          </div>
          <StatusBadge status={run.status} />
        </div>

        {error && <p className="rounded-lg bg-rose-50 p-2.5 text-sm text-rose-700">{error}</p>}

        <div className="flex gap-2">
          {run.status === 'DRAFT' && (
            <button
              type="button"
              disabled={busy}
              onClick={() => handle(onApprove)}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {busy ? 'กำลังอนุมัติ...' : 'อนุมัติรอบปันผล'}
            </button>
          )}
          {run.status === 'APPROVED' && (
            <button
              type="button"
              disabled={busy}
              onClick={() => handle(onProcess)}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {busy ? 'กำลังประมวลผล...' : 'ประมวลผลจ่ายปันผล'}
            </button>
          )}
          <p className="self-center text-xs text-slate-400">ผู้ดำเนินการ: {actorUid}</p>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium text-slate-700">รายการจัดสรรปันผลรายสมาชิก</h3>
          {allocations === null ? (
            <LoadingState label="กำลังโหลดรายการ..." />
          ) : allocations.length === 0 ? (
            <EmptyState title="ไม่มีสมาชิกที่ได้รับปันผลในรอบนี้" />
          ) : (
            <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">สมาชิก</th>
                    <th className="px-3 py-2 text-right font-medium">จำนวนหุ้น</th>
                    <th className="px-3 py-2 text-right font-medium">เงินปันผล</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allocations.map((a) => (
                    <tr key={a.id}>
                      <td className="px-3 py-2 text-slate-700">{memberById.get(a.memberId)?.fullName ?? a.memberId}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatNumber(a.shareCount)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatTHB(a.dividendAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
