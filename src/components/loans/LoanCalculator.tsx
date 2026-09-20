import { useMemo, useState } from 'react';
import { LOAN_POLICIES } from '../../config/policy';
import { buildAmortizationSchedule, calcMonthlyInstallment } from '../../lib/finance';
import { formatTHB } from '../../lib/format';
import { DemoBadge } from '../common/DemoBadge';
import type { LoanType } from '../../types';

export function LoanCalculator() {
  const [loanType, setLoanType] = useState<LoanType>('ORDINARY');
  const [principal, setPrincipal] = useState(100000);
  const [termMonths, setTermMonths] = useState(24);
  const policy = LOAN_POLICIES[loanType];

  const installment = useMemo(() => calcMonthlyInstallment(principal, policy.interestRatePercent, termMonths), [principal, policy, termMonths]);
  const schedule = useMemo(() => buildAmortizationSchedule(principal, policy.interestRatePercent, termMonths), [principal, policy, termMonths]);
  const totalInterest = schedule.reduce((sum, r) => sum + r.interestPortion, 0);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold text-slate-900">เครื่องคำนวณเงินกู้</h2>
        <DemoBadge label="อัตราตัวอย่างสำหรับสาธิต" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">ประเภทเงินกู้</span>
          <select value={loanType} onChange={(e) => setLoanType(e.target.value as LoanType)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
            {Object.values(LOAN_POLICIES).map((p) => (
              <option key={p.type} value={p.type}>
                {p.label} — {p.interestRatePercent}% ต่อปี
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">จำนวนเงินกู้ (บาท)</span>
          <input
            type="number"
            min={policy.minAmount}
            max={policy.maxAmount}
            value={principal}
            onChange={(e) => setPrincipal(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-right text-sm tabular-nums"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">จำนวนงวด (เดือน)</span>
          <input
            type="number"
            min={1}
            max={policy.maxTermMonths}
            value={termMonths}
            onChange={(e) => setTermMonths(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-right text-sm tabular-nums"
          />
        </label>
      </div>
      <p className="mt-2 text-xs text-slate-400">
        วงเงินสูงสุดตามนโยบายตัวอย่าง {formatTHB(policy.maxAmount)} · ผ่อนได้สูงสุด {policy.maxTermMonths} งวด
      </p>

      {installment.ok ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Result label="ค่างวดต่อเดือน" value={formatTHB(installment.value)} />
          <Result label="ดอกเบี้ยรวมตลอดสัญญา" value={formatTHB(totalInterest)} />
          <Result label="ยอดชำระรวมทั้งสิ้น" value={formatTHB(principal + totalInterest)} />
        </div>
      ) : (
        <p className="mt-4 text-sm text-rose-600">คำนวณไม่ได้ — {installment.reason}</p>
      )}

      {schedule.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium text-emerald-700">ดูตารางผ่อนชำระทั้งหมด</summary>
          <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">งวดที่</th>
                  <th className="px-3 py-2 text-right font-medium">ค่างวด</th>
                  <th className="px-3 py-2 text-right font-medium">เงินต้น</th>
                  <th className="px-3 py-2 text-right font-medium">ดอกเบี้ย</th>
                  <th className="px-3 py-2 text-right font-medium">เงินต้นคงเหลือ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {schedule.map((row) => (
                  <tr key={row.period}>
                    <td className="px-3 py-2">{row.period}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatTHB(row.installment)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatTHB(row.principalPortion)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatTHB(row.interestPortion)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatTHB(row.remainingPrincipal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </section>
  );
}

function Result({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 tabular-nums text-base font-semibold text-slate-800">{value}</p>
    </div>
  );
}
