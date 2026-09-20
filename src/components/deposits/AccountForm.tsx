import { useState } from 'react';
import { Modal } from '../common/Modal';
import { DEPOSIT_PRODUCTS } from '../../config/policy';
import { isNonNegative } from '../../lib/validate';
import type { DepositAccountType, Member } from '../../types';
import type { OpenAccountInput } from '../../services/types';

export function AccountForm({
  members,
  actorUid,
  onClose,
  onSubmit,
}: {
  members: Member[];
  actorUid: string;
  onClose: () => void;
  onSubmit: (input: OpenAccountInput) => Promise<void>;
}) {
  const [memberId, setMemberId] = useState(members[0]?.id ?? '');
  const [accountType, setAccountType] = useState<DepositAccountType>('SAVINGS');
  const [accountName, setAccountName] = useState('');
  const [openingBalance, setOpeningBalance] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!memberId) return setError('กรุณาเลือกสมาชิก');
    if (!isNonNegative(openingBalance)) return setError('ยอดเปิดบัญชีต้องไม่ติดลบ');
    setError(null);
    setSubmitting(true);
    try {
      const member = members.find((m) => m.id === memberId);
      await onSubmit({
        memberId,
        accountType,
        accountName: accountName.trim() || `${DEPOSIT_PRODUCTS[accountType].label} - ${member?.fullName ?? ''}`,
        openingBalance,
        actorUid,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เปิดบัญชีไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title="เปิดบัญชีเงินฝากใหม่"
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
            {submitting ? 'กำลังเปิดบัญชี...' : 'เปิดบัญชี'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {error && <p className="rounded-lg bg-rose-50 p-2.5 text-sm text-rose-700">{error}</p>}
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">สมาชิกเจ้าของบัญชี</span>
          <select value={memberId} onChange={(e) => setMemberId(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.memberNo} — {m.fullName}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">ประเภทบัญชี</span>
          <select
            value={accountType}
            onChange={(e) => setAccountType(e.target.value as DepositAccountType)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            {Object.values(DEPOSIT_PRODUCTS).map((p) => (
              <option key={p.type} value={p.type}>
                {p.label} — ดอกเบี้ย {p.interestRatePercent}% ต่อปี
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-400">{DEPOSIT_PRODUCTS[accountType].description}</p>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">ชื่อบัญชี (ไม่บังคับ)</span>
          <input value={accountName} onChange={(e) => setAccountName(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">ยอดเปิดบัญชี (บาท)</span>
          <input
            type="number"
            min={0}
            value={openingBalance}
            onChange={(e) => setOpeningBalance(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-right text-sm tabular-nums"
          />
        </label>
      </div>
    </Modal>
  );
}
