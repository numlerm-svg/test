import { useEffect, useState } from 'react';
import { Modal } from '../common/Modal';
import { LoadingState, EmptyState } from '../common/States';
import { StatusBadge } from '../common/StatusBadge';
import { formatTHB, formatThaiDate } from '../../lib/format';
import { coopService } from '../../services';
import type { BillingItem, BillingRun, Member } from '../../types';

export function BillingItemsModal({
  run,
  members,
  canMarkPaid,
  actorUid,
  onClose,
}: {
  run: BillingRun;
  members: Member[];
  canMarkPaid: boolean;
  actorUid: string;
  onClose: () => void;
}) {
  const [items, setItems] = useState<BillingItem[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const memberById = new Map(members.map((m) => [m.id, m]));

  function reload() {
    coopService.listBillingItems(run.id).then(setItems);
  }
  useEffect(reload, [run.id]);

  async function markPaid(itemId: string) {
    setBusyId(itemId);
    try {
      await coopService.markBillingItemPaid(itemId, actorUid);
      reload();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Modal title={`รายการเรียกเก็บ งวด ${run.periodLabel}`} onClose={onClose} widthClassName="max-w-3xl">
      {items === null ? (
        <LoadingState label="กำลังโหลดรายการ..." />
      ) : items.length === 0 ? (
        <EmptyState title="ไม่มีรายการในงวดนี้" />
      ) : (
        <div className="max-h-[60vh] overflow-y-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left font-medium">สมาชิก</th>
                <th className="px-3 py-2 text-right font-medium">ส่งหุ้น</th>
                <th className="px-3 py-2 text-right font-medium">ค่างวดเงินกู้</th>
                <th className="px-3 py-2 text-right font-medium">รวม</th>
                <th className="px-3 py-2 text-left font-medium">ครบกำหนด</th>
                <th className="px-3 py-2 text-left font-medium">สถานะ</th>
                {canMarkPaid && <th className="px-3 py-2 text-right font-medium">จัดการ</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-2 text-slate-700">{memberById.get(item.memberId)?.fullName ?? item.memberId}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatTHB(item.shareContribution)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatTHB(item.loanInstallment)}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium">{formatTHB(item.totalDue)}</td>
                  <td className="px-3 py-2 text-slate-600">{formatThaiDate(item.dueDate)}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={item.status} />
                  </td>
                  {canMarkPaid && (
                    <td className="px-3 py-2 text-right">
                      {item.status === 'DUE' && (
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => markPaid(item.id)}
                          className="rounded-lg border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                        >
                          {busyId === item.id ? 'กำลังบันทึก...' : 'บันทึกชำระแล้ว'}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
