// ข้อมูลสาธิตสำหรับ "Financial Health Overview" เท่านั้น — เป็นชุดข้อมูลสังเคราะห์คงที่
// แยกขาดจากข้อมูลจริงใน Firestore เสมอ ไม่ว่าจะอยู่โหมดทดลองหรือโหมด Firebase
// รายละเอียดวิธีสร้างและข้อจำกัด: ดู src/data/README.md
import type { FinancialHealthRecord } from '../types';

const MONTHS_BACK = 12;
const ACCOUNT_COUNT = 84; // 84 บัญชี x 12 เดือน = 1,008 รายการ (~1,000 รายการตามที่กำหนด)

function mulberry32(seed: number) {
  let a = seed;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** สร้างรายการเดือนย้อนหลัง MONTHS_BACK เดือน เรียงจากเก่าไปใหม่ (เดือนสุดท้ายคือเดือนปัจจุบัน) */
export function getFinancialHealthMonths(): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = MONTHS_BACK - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(monthKey(d));
  }
  return months;
}

let cachedRecords: FinancialHealthRecord[] | null = null;

export function generateFinancialHealthRecords(): FinancialHealthRecord[] {
  if (cachedRecords) return cachedRecords;

  const rand = mulberry32(84120260); // seed คงที่ เพื่อให้ข้อมูลสาธิตคงเส้นคงวาในเซสชันเดียวกัน
  const months = getFinancialHealthMonths();
  const records: FinancialHealthRecord[] = [];

  for (let accIdx = 0; accIdx < ACCOUNT_COUNT; accIdx++) {
    const accountId = `fh-acc-${String(accIdx + 1).padStart(3, '0')}`;
    const baseDeposit = 15000 + rand() * 180000;
    const depositMonthlyGrowth = 0.003 + rand() * 0.012; // แนวโน้มเงินฝากเติบโตช้า ๆ
    const hasLoan = rand() < 0.55;
    const baseLoan = hasLoan ? 20000 + rand() * 220000 : 0;
    const loanMonthlyChange = hasLoan ? -0.01 - rand() * 0.015 : 0; // เงินต้นทยอยลดลงตามการผ่อนชำระ
    const overdueRisk = hasLoan && rand() < 0.12; // บัญชีส่วนน้อยมีการค้างชำระ

    let deposit = baseDeposit;
    let loan = baseLoan;

    months.forEach((month, monthIdx) => {
      deposit = deposit * (1 + depositMonthlyGrowth + (rand() - 0.5) * 0.01);
      if (hasLoan) {
        loan = Math.max(0, loan * (1 + loanMonthlyChange + (rand() - 0.5) * 0.006));
      }
      let overdue = 0;
      if (overdueRisk && monthIdx >= months.length - 4) {
        overdue = Math.round(loan * (0.1 + rand() * 0.25));
      }

      records.push({
        recordId: `${accountId}-${month}`,
        accountId,
        month,
        depositBalance: Math.round(deposit),
        loanPrincipalOutstanding: Math.round(loan),
        overduePrincipal: overdue,
      });
    });
  }

  cachedRecords = records;
  return records;
}

export interface MonthlyAggregate {
  month: string;
  totalDeposit: number;
  totalLoanPrincipal: number;
  totalOverduePrincipal: number;
  accountCount: number;
}

export function aggregateFinancialHealthByMonth(records: FinancialHealthRecord[]): MonthlyAggregate[] {
  const byMonth = new Map<string, MonthlyAggregate>();
  for (const r of records) {
    const existing = byMonth.get(r.month);
    if (existing) {
      existing.totalDeposit += r.depositBalance;
      existing.totalLoanPrincipal += r.loanPrincipalOutstanding;
      existing.totalOverduePrincipal += r.overduePrincipal;
      existing.accountCount += 1;
    } else {
      byMonth.set(r.month, {
        month: r.month,
        totalDeposit: r.depositBalance,
        totalLoanPrincipal: r.loanPrincipalOutstanding,
        totalOverduePrincipal: r.overduePrincipal,
        accountCount: 1,
      });
    }
  }
  return getFinancialHealthMonths().map((m) => byMonth.get(m)!).filter(Boolean);
}
