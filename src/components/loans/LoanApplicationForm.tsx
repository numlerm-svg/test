import { useState } from 'react';
import { Modal } from '../common/Modal';
import { LOAN_POLICIES } from '../../config/policy';
import { formatTHB } from '../../lib/format';
import type { LoanType, Member } from '../../types';
import type { SubmitLoanApplicationInput } from '../../services/types';

export function LoanApplicationForm({
  member,
  onClose,
  onSubmit,
}: {
  member: Member;
  onClose: () => void;
  onSubmit: (input: SubmitLoanApplicationInput) => Promise<void>;
}) {
  const [loanType, setLoanType] = useState<LoanType>('EMERGENCY');
  const [requestedAmount, setRequestedAmount] = useState(20000);
  const [termMonths, setTermMonths] = useState(12);
  const [purpose, setPurpose] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const policy = LOAN_POLICIES[loanType];
  const maxAmount = Math.min(policy.maxAmount, policy.computeMaxAmount({ salary: member.salary, shareValue: member.shareValue }));

  async function handleSubmit() {
    if (!purpose.trim()) return setError('กรุณาระบุวัตถุประสงค์การกู้');
    if (requestedAmount <= 0) return setError('จำนวนเงินกู้ต้องมากกว่า 0');
    if (requestedAmount > maxAmount) return setError(`วงเงินกู้สูงสุดสำหรับท่านคือ ${formatTHB(maxAmount)}`);
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({ memberId: member.id, loanType, requestedAmount, termMonths, purpose: purpose.trim() });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ยื่นคำขอไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title="ยื่นคำขอกู้เงิน"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {submitting ? 'กำลังส่งคำขอ...' : 'ยื่นคำขอ'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {error && <p className="rounded-lg bg-rose-50 p-2.5 text-sm text-rose-700">{error}</p>}
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">ประเภทเงินกู้</span>
          <select value={loanType} onChange={(e) => setLoanType(e.target.value as LoanType)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
            {Object.values(LOAN_POLICIES).map((p) => (
              <option key={p.type} value={p.type}>
                {p.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-400">วงเงินสูงสุดสำหรับท่าน (ตัวอย่าง): {formatTHB(maxAmount)}</p>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">จำนวนเงินที่ขอกู้ (บาท)</span>
          <input
            type="number"
            min={policy.minAmount}
            max={maxAmount}
            value={requestedAmount}
            onChange={(e) => setRequestedAmount(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-right text-sm tabular-nums"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">จำนวนงวดผ่อนชำระ (เดือน)</span>
          <input
            type="number"
            min={1}
            max={policy.maxTermMonths}
            value={termMonths}
            onChange={(e) => setTermMonths(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-right text-sm tabular-nums"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">วัตถุประสงค์</span>
          <textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </label>
      </div>
    </Modal>
  );
}
