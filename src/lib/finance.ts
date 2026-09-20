// สูตรการเงินที่ใช้ร่วมกัน (Financial Health Overview และแดชบอร์ดภาพรวม)
// ต้องไม่คืนค่า NaN หรือ Infinity ให้ UI เด็ดขาด — ให้คืนสถานะ "คำนวณไม่ได้" พร้อมเหตุผลแทน

export type CalcResult =
  | { ok: true; value: number }
  | { ok: false; reason: string };

/** LDR (Loan-to-Deposit Ratio) = เงินต้นสินเชื่อคงเหลือ / เงินฝากรวม × 100 */
export function calcLDR(loanPrincipalOutstanding: number, totalDeposits: number): CalcResult {
  if (!Number.isFinite(totalDeposits) || !Number.isFinite(loanPrincipalOutstanding)) {
    return { ok: false, reason: 'ข้อมูลไม่ครบถ้วน' };
  }
  if (totalDeposits <= 0) {
    return { ok: false, reason: 'ยังไม่มียอดเงินฝากสำหรับคำนวณ' };
  }
  return { ok: true, value: (loanPrincipalOutstanding / totalDeposits) * 100 };
}

/** Growth = (ยอดล่าสุด - ยอดฐาน) / ยอดฐาน × 100 */
export function calcGrowth(latest: number, base: number): CalcResult {
  if (!Number.isFinite(latest) || !Number.isFinite(base)) {
    return { ok: false, reason: 'ข้อมูลไม่ครบถ้วน' };
  }
  if (base === 0) {
    return { ok: false, reason: 'ยอดฐานเป็นศูนย์ ไม่สามารถคำนวณอัตราการเติบโตได้' };
  }
  return { ok: true, value: ((latest - base) / base) * 100 };
}

/** ส่วนต่างเงินฝากกับลูกหนี้เงินกู้ (ไม่ใช่เงินสดพร้อมใช้ — เป็นเพียงส่วนต่างทางบัญชี) */
export function calcDepositLoanGap(totalDeposits: number, loanPrincipalOutstanding: number): CalcResult {
  if (!Number.isFinite(totalDeposits) || !Number.isFinite(loanPrincipalOutstanding)) {
    return { ok: false, reason: 'ข้อมูลไม่ครบถ้วน' };
  }
  return { ok: true, value: totalDeposits - loanPrincipalOutstanding };
}

/** อัตราส่วนเงินต้นค้างชำระต่อเงินต้นคงเหลือทั้งหมด (overdue ratio) — ไม่ใช่ NPL เพราะไม่มีเกณฑ์อายุหนี้รองรับ */
export function calcOverdueRatio(overduePrincipal: number, loanPrincipalOutstanding: number): CalcResult {
  if (!Number.isFinite(overduePrincipal) || !Number.isFinite(loanPrincipalOutstanding)) {
    return { ok: false, reason: 'ข้อมูลไม่ครบถ้วน' };
  }
  if (loanPrincipalOutstanding <= 0) {
    return { ok: false, reason: 'ยังไม่มีเงินต้นคงเหลือสำหรับคำนวณ' };
  }
  return { ok: true, value: (overduePrincipal / loanPrincipalOutstanding) * 100 };
}

/** คำนวณค่างวดแบบลดต้นลดดอก (เทียบเท่า annuity) สำหรับเครื่องคำนวณเงินกู้ */
export function calcMonthlyInstallment(
  principal: number,
  annualRatePercent: number,
  termMonths: number,
): CalcResult {
  if (!Number.isFinite(principal) || principal <= 0) {
    return { ok: false, reason: 'จำนวนเงินกู้ต้องมากกว่า 0' };
  }
  if (!Number.isFinite(termMonths) || termMonths <= 0) {
    return { ok: false, reason: 'จำนวนงวดต้องมากกว่า 0' };
  }
  const monthlyRate = annualRatePercent / 100 / 12;
  if (monthlyRate === 0) {
    return { ok: true, value: principal / termMonths };
  }
  const factor = Math.pow(1 + monthlyRate, termMonths);
  const installment = (principal * monthlyRate * factor) / (factor - 1);
  return { ok: true, value: installment };
}

export interface AmortizationRow {
  period: number;
  installment: number;
  principalPortion: number;
  interestPortion: number;
  remainingPrincipal: number;
}

export function buildAmortizationSchedule(
  principal: number,
  annualRatePercent: number,
  termMonths: number,
): AmortizationRow[] {
  const installmentResult = calcMonthlyInstallment(principal, annualRatePercent, termMonths);
  if (!installmentResult.ok) return [];
  const monthlyRate = annualRatePercent / 100 / 12;
  let remaining = principal;
  const rows: AmortizationRow[] = [];
  for (let period = 1; period <= termMonths; period++) {
    const interestPortion = remaining * monthlyRate;
    let principalPortion = installmentResult.value - interestPortion;
    if (period === termMonths) {
      principalPortion = remaining;
    }
    remaining = Math.max(0, remaining - principalPortion);
    rows.push({
      period,
      installment: period === termMonths ? principalPortion + interestPortion : installmentResult.value,
      principalPortion,
      interestPortion,
      remainingPrincipal: remaining,
    });
  }
  return rows;
}
