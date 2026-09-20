import { useEffect, useState } from 'react';
import { Modal } from '../common/Modal';
import { LoadingState, EmptyState } from '../common/States';
import { StatusBadge } from '../common/StatusBadge';
import { formatTHB, formatThaiDateTime } from '../../lib/format';
import { coopService } from '../../services';
import type { DepositAccount, DepositTransaction, Member } from '../../types';

export function AccountDetail({ account, member, onClose }: { account: DepositAccount; member: Member | undefined; onClose: () => void }) {
  const [transactions, setTransactions] = useState<DepositTransaction[] | null>(null);

  useEffect(() => {
    let active = true;
    coopService.listAccountTransactions(account.id).then((txns) => {
      if (active) setTransactions([...txns].sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
    });
    return () => {
      active = false;
    };
  }, [account.id]);

  return (
    <Modal title={`บัญชี ${account.accountNo}`} onClose={onClose} widthClassName="max-w-2xl">
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
          <div>
            <p className="text-sm text-slate-500">{member?.fullName ?? account.memberId}</p>
            <p className="tabular-nums text-lg font-semibold text-slate-900">{formatTHB(account.balance)}</p>
          </div>
          <StatusBadge status={account.status} />
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium text-slate-700">ประวัติรายการ / ใบเสร็จ</h3>
          {transactions === null ? (
            <LoadingState label="กำลังโหลดประวัติรายการ..." />
          ) : transactions.length === 0 ? (
            <EmptyState title="ยังไม่มีรายการ" />
          ) : (
            <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">วันที่</th>
                    <th className="px-3 py-2 text-left font-medium">เลขที่ใบเสร็จ</th>
                    <th className="px-3 py-2 text-left font-medium">ประเภท</th>
                    <th className="px-3 py-2 text-right font-medium">จำนวนเงิน</th>
                    <th className="px-3 py-2 text-right font-medium">ยอดคงเหลือ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((t) => (
                    <tr key={t.transactionId}>
                      <td className="px-3 py-2 text-slate-600">{formatThaiDateTime(t.timestamp)}</td>
                      <td className="px-3 py-2 text-slate-600">{t.receiptNo}</td>
                      <td className="px-3 py-2">
                        <span className={t.type === 'DEPOSIT' ? 'text-emerald-700' : 'text-rose-600'}>
                          {t.type === 'DEPOSIT' ? 'ฝากเงิน' : 'ถอนเงิน'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatTHB(t.amount)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatTHB(t.balanceAfter)}</td>
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
