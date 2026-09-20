import { useState } from 'react';
import { Modal } from '../common/Modal';
import { toBuddhistYear } from '../../lib/format';
import type { GenerateBillingRunInput } from '../../services/types';

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

export function MonthlyBillingGenerator({ onClose, onSubmit }: { onClose: () => void; onSubmit: (input: GenerateBillingRunInput) => Promise<void> }) {
  const now = new Date();
  const [periodYearBE, setPeriodYearBE] = useState(toBuddhistYear(now.getFullYear()));
  const [periodMonth, setPeriodMonth] = useState(now.getMonth() + 1);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({ periodYearBE, periodMonth });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'สร้างรอบเรียกเก็บไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title="จัดทำรายการเรียกเก็บรายเดือน"
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
            {submitting ? 'กำลังสร้าง...' : 'สร้างรอบเรียกเก็บ'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {error && <p className="rounded-lg bg-rose-50 p-2.5 text-sm text-rose-700">{error}</p>}
        <p className="text-sm text-slate-500">
          ระบบจะรวมยอดส่งหุ้นรายเดือนและค่างวดเงินกู้ของสมาชิกที่ยังใช้งานอยู่ทุกคนในงวดที่เลือก
        </p>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">เดือน</span>
            <select value={periodMonth} onChange={(e) => setPeriodMonth(Number(e.target.value))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              {THAI_MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">ปี (พ.ศ.)</span>
            <input type="number" value={periodYearBE} onChange={(e) => setPeriodYearBE(Number(e.target.value))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm tabular-nums" />
          </label>
        </div>
      </div>
    </Modal>
  );
}
