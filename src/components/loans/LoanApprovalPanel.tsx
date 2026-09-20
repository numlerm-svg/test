import { useState } from 'react';
import { Modal } from '../common/Modal';
import { formatTHB, formatThaiDate } from '../../lib/format';
import { LOAN_POLICIES } from '../../config/policy';
import type { LoanApplication, Member } from '../../types';

export function LoanApprovalPanel({
  application,
  member,
  actorUid,
  onClose,
  onDecide,
}: {
  application: LoanApplication;
  member: Member | undefined;
  actorUid: string;
  onClose: () => void;
  onDecide: (approve: boolean, note: string) => Promise<void>;
}) {
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const policy = LOAN_POLICIES[application.loanType];

  async function decide(approve: boolean) {
    setSubmitting(approve ? 'APPROVE' : 'REJECT');
    setError(null);
    try {
      await onDecide(approve, note);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ดำเนินการไม่สำเร็จ');
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <Modal title={`พิจารณาคำขอกู้ ${application.applicationNo}`} onClose={onClose} widthClassName="max-w-lg">
      <div className="space-y-4">
        {error && <p className="rounded-lg bg-rose-50 p-2.5 text-sm text-rose-700">{error}</p>}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Item label="สมาชิก" value={member ? `${member.memberNo} — ${member.fullName}` : application.memberId} />
          <Item label="ประเภทเงินกู้" value={policy.label} />
          <Item label="จำนวนที่ขอกู้" value={formatTHB(application.requestedAmount)} />
          <Item label="จำนวนงวด" value={`${application.termMonths} เดือน`} />
          <Item label="วันที่ยื่น" value={formatThaiDate(application.submittedAt)} />
          <Item label="อัตราดอกเบี้ยตามนโยบาย" value={`${policy.interestRatePercent}% ต่อปี`} />
        </div>
        <div>
          <p className="text-xs text-slate-400">วัตถุประสงค์</p>
          <p className="mt-0.5 text-sm text-slate-700">{application.purpose}</p>
        </div>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">บันทึกความเห็น (ไม่บังคับ)</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </label>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            disabled={submitting !== null}
            onClick={() => decide(false)}
            className="rounded-lg border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-60"
          >
            {submitting === 'REJECT' ? 'กำลังบันทึก...' : 'ไม่อนุมัติ'}
          </button>
          <button
            type="button"
            disabled={submitting !== null}
            onClick={() => decide(true)}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {submitting === 'APPROVE' ? 'กำลังบันทึก...' : 'อนุมัติ'}
          </button>
        </div>
        <p className="text-xs text-slate-400">ผู้พิจารณา: {actorUid}</p>
      </div>
    </Modal>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-0.5 text-slate-800">{value}</p>
    </div>
  );
}
