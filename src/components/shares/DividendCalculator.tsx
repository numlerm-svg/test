import { useState } from 'react';
import { DIVIDEND_POLICY } from '../../config/policy';
import { formatThaiDate, toBuddhistYear } from '../../lib/format';
import type { CreateDividendRunInput } from '../../services/types';

export function DividendCalculator({ onCreate }: { onCreate: (input: CreateDividendRunInput) => Promise<void> }) {
  const currentYearBE = toBuddhistYear(new Date().getFullYear());
  const [fiscalYearBE, setFiscalYearBE] = useState(currentYearBE);
  const [dividendRatePercent, setDividendRatePercent] = useState(DIVIDEND_POLICY.defaultDividendRatePercent);
  const [interestRefundRatePercent, setInterestRefundRatePercent] = useState(DIVIDEND_POLICY.defaultInterestRefundRatePercent);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate() {
    if (dividendRatePercent < 0) return setError('อัตราปันผลต้องไม่ติดลบ');
    setError(null);
    setSubmitting(true);
    try {
      await onCreate({ fiscalYearBE, dividendRatePercent, interestRefundRatePercent });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'สร้างรายการปันผลไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">จัดทำรอบปันผลใหม่</h2>
      <p className="mt-1 text-xs text-slate-400">
        อัตราปันผลเป็นค่าตั้งต้นสำหรับสาธิต ({formatThaiDate(new Date().toISOString())}) ผู้ดูแลระบบสามารถปรับก่อนสร้างรอบได้
      </p>
      {error && <p className="mt-3 rounded-lg bg-rose-50 p-2.5 text-sm text-rose-700">{error}</p>}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">ปีบัญชี (พ.ศ.)</span>
          <input type="number" value={fiscalYearBE} onChange={(e) => setFiscalYearBE(Number(e.target.value))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm tabular-nums" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">อัตราปันผลต่อหุ้น (%)</span>
          <input
            type="number"
            step="0.01"
            value={dividendRatePercent}
            onChange={(e) => setDividendRatePercent(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm tabular-nums"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">อัตราเฉลี่ยคืนดอกเบี้ยเงินกู้ (%)</span>
          <input
            type="number"
            step="0.01"
            value={interestRefundRatePercent}
            onChange={(e) => setInterestRefundRatePercent(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm tabular-nums"
          />
        </label>
      </div>
      <button
        type="button"
        onClick={handleCreate}
        disabled={submitting}
        className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {submitting ? 'กำลังสร้าง...' : 'สร้างรอบปันผล (ฉบับร่าง)'}
      </button>
    </section>
  );
}
