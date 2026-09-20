import { useState } from 'react';
import { Modal } from '../common/Modal';
import { generateIdempotencyKey } from '../../lib/id';
import { formatTHB } from '../../lib/format';
import type { DepositAccount } from '../../types';
import type { DepositWithdrawInput } from '../../services/types';

export function DepositWithdrawModal({
  account,
  type,
  actorUid,
  onClose,
  onSubmit,
}: {
  account: DepositAccount;
  type: 'DEPOSIT' | 'WITHDRAW';
  actorUid: string;
  onClose: () => void;
  onSubmit: (input: DepositWithdrawInput) => Promise<void>;
}) {
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [idempotencyKey] = useState(generateIdempotencyKey());

  async function handleSubmit() {
    if (amount <= 0) return setError('จำนวนเงินต้องมากกว่า 0');
    if (type === 'WITHDRAW' && amount > account.balance) return setError('ยอดเงินคงเหลือไม่เพียงพอ');
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        accountId: account.id,
        amount,
        description: description.trim() || (type === 'DEPOSIT' ? 'ฝากเงิน' : 'ถอนเงิน'),
        actorUid,
        idempotencyKey,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ทำรายการไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={type === 'DEPOSIT' ? 'ฝากเงิน' : 'ถอนเงิน'}
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
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60 ${
              type === 'DEPOSIT' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-700 hover:bg-slate-800'
            }`}
          >
            {submitting ? 'กำลังบันทึก...' : type === 'DEPOSIT' ? 'ยืนยันฝากเงิน' : 'ยืนยันถอนเงิน'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="rounded-xl bg-slate-50 p-3 text-sm">
          <p className="text-slate-500">บัญชี {account.accountNo}</p>
          <p className="mt-0.5 tabular-nums font-semibold text-slate-800">ยอดคงเหลือปัจจุบัน {formatTHB(account.balance)}</p>
        </div>
        {error && <p className="rounded-lg bg-rose-50 p-2.5 text-sm text-rose-700">{error}</p>}
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">จำนวนเงิน (บาท)</span>
          <input
            type="number"
            min={0}
            autoFocus
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-right text-sm tabular-nums"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">รายละเอียด (ไม่บังคับ)</span>
          <input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </label>
      </div>
    </Modal>
  );
}
