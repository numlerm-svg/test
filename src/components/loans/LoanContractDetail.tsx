import { useEffect, useState } from 'react';
import { Modal } from '../common/Modal';
import { LoadingState, EmptyState } from '../common/States';
import { StatusBadge } from '../common/StatusBadge';
import { formatTHB, formatThaiDate, formatThaiDateTime } from '../../lib/format';
import { generateIdempotencyKey } from '../../lib/id';
import { coopService } from '../../services';
import type { LoanContract, LoanRepayment, Member } from '../../types';

export function LoanContractDetail({
  contract,
  member,
  canRepay,
  actorUid,
  onClose,
}: {
  contract: LoanContract;
  member: Member | undefined;
  canRepay: boolean;
  actorUid: string;
  onClose: () => void;
}) {
  const [repayments, setRepayments] = useState<LoanRepayment[] | null>(null);
  const [amount, setAmount] = useState(contract.monthlyInstallment);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    coopService.listContractRepayments(contract.id).then((list) => setRepayments([...list].sort((a, b) => b.timestamp.localeCompare(a.timestamp))));
  }

  useEffect(reload, [contract.id]);

  async function handleRepay() {
    if (amount <= 0) return setError('จำนวนเงินต้องมากกว่า 0');
    setError(null);
    setSubmitting(true);
    try {
      await coopService.repayLoan({ contractId: contract.id, amount, actorUid, idempotencyKey: generateIdempotencyKey() });
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ชำระเงินไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`สัญญาเงินกู้ ${contract.contractNo}`} onClose={onClose} widthClassName="max-w-2xl">
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
          <div>
            <p className="text-sm text-slate-500">{member?.fullName ?? contract.memberId}</p>
            <p className="tabular-nums text-lg font-semibold text-slate-900">เงินต้นคงเหลือ {formatTHB(contract.principalOutstanding)}</p>
            <p className="text-xs text-slate-400">เริ่มสัญญา {formatThaiDate(contract.startedAt)} · ดอกเบี้ย {contract.interestRatePercent}% ต่อปี</p>
          </div>
          <StatusBadge status={contract.status} />
        </div>

        {canRepay && contract.status === 'ACTIVE' && (
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="text-sm font-medium text-slate-700">บันทึกการชำระเงินกู้</p>
            {error && <p className="mt-2 rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{error}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                type="number"
                min={0}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-40 rounded-lg border border-slate-200 px-3 py-2 text-right text-sm tabular-nums"
              />
              <button
                type="button"
                onClick={handleRepay}
                disabled={submitting}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {submitting ? 'กำลังบันทึก...' : 'บันทึกการชำระ'}
              </button>
            </div>
          </div>
        )}

        <div>
          <h3 className="mb-2 text-sm font-medium text-slate-700">ประวัติการชำระ</h3>
          {repayments === null ? (
            <LoadingState label="กำลังโหลดประวัติการชำระ..." />
          ) : repayments.length === 0 ? (
            <EmptyState title="ยังไม่มีประวัติการชำระ" />
          ) : (
            <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">วันที่</th>
                    <th className="px-3 py-2 text-right font-medium">จำนวนเงิน</th>
                    <th className="px-3 py-2 text-right font-medium">เงินต้น</th>
                    <th className="px-3 py-2 text-right font-medium">ดอกเบี้ย</th>
                    <th className="px-3 py-2 text-right font-medium">เงินต้นคงเหลือ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {repayments.map((r) => (
                    <tr key={r.repaymentId}>
                      <td className="px-3 py-2 text-slate-600">{formatThaiDateTime(r.timestamp)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatTHB(r.amount)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatTHB(r.principalPortion)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatTHB(r.interestPortion)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatTHB(r.principalAfter)}</td>
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
