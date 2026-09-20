// ค่าตั้งต้นของนโยบายและอัตราต่าง ๆ สำหรับการสาธิตระบบเท่านั้น
// ไม่ใช่อัตรามาตรฐานตามกฎหมายหรือสิทธิประโยชน์ทางภาษีที่รับรองแล้ว
// แก้ไขค่าที่นี่เพียงจุดเดียว ห้าม hardcode ซ้ำในแต่ละ component
import type { DepositAccountType, LoanType } from '../types';

export const COOP_NAME = 'สหกรณ์ออมทรัพย์เพื่อการพัฒนา จำกัด';
export const SYSTEM_NAME = 'ระบบบริหารจัดการสหกรณ์ออมทรัพย์';
export const AI_ASSISTANT_NAME = 'COOP-ai';

export interface DepositProductPolicy {
  type: DepositAccountType;
  label: string;
  interestRatePercent: number; // ต่อปี
  description: string;
}

export const DEPOSIT_PRODUCTS: Record<DepositAccountType, DepositProductPolicy> = {
  SAVINGS: {
    type: 'SAVINGS',
    label: 'ออมทรัพย์',
    interestRatePercent: 1.75,
    description: 'ฝาก-ถอนได้ทุกวันทำการ ไม่มีระยะเวลาผูกพัน',
  },
  SPECIAL: {
    type: 'SPECIAL',
    label: 'ออมทรัพย์พิเศษ',
    interestRatePercent: 3.0,
    description: 'ดอกเบี้ยสูงกว่าออมทรัพย์ทั่วไป เหมาะกับการออมระยะกลาง',
  },
  FIXED: {
    type: 'FIXED',
    label: 'ฝากประจำ',
    interestRatePercent: 3.75,
    description: 'ฝากประจำระยะเวลาแน่นอน ดอกเบี้ยคงที่ตลอดสัญญา',
  },
};

export interface LoanTypePolicy {
  type: LoanType;
  label: string;
  interestRatePercent: number; // ต่อปี
  maxTermMonths: number;
  minAmount: number;
  maxAmount: number;
  /** วงเงินกู้สูงสุดคำนวณจากฐานเงินเดือนและ/หรือมูลค่าหุ้น */
  computeMaxAmount: (input: { salary: number; shareValue: number }) => number;
}

export const LOAN_POLICIES: Record<LoanType, LoanTypePolicy> = {
  EMERGENCY: {
    type: 'EMERGENCY',
    label: 'ฉุกเฉิน',
    interestRatePercent: 6.5,
    maxTermMonths: 12,
    minAmount: 5000,
    maxAmount: 50000,
    // วงเงิน = clamp(เงินเดือน x 1, 20,000, 50,000) — ตัวอย่างสาธิต
    computeMaxAmount: ({ salary }) => Math.min(50000, Math.max(20000, salary * 1)),
  },
  ORDINARY: {
    type: 'ORDINARY',
    label: 'สามัญ',
    interestRatePercent: 5.75,
    maxTermMonths: 60,
    minAmount: 20000,
    maxAmount: 1000000,
    // วงเงิน = min(เงินเดือน x 20, มูลค่าหุ้น x 5, เพดาน 1,000,000) — ตัวอย่างสาธิต
    computeMaxAmount: ({ salary, shareValue }) =>
      Math.min(1000000, salary * 20, Math.max(shareValue * 5, 30000)),
  },
  SPECIAL: {
    type: 'SPECIAL',
    label: 'พิเศษ',
    interestRatePercent: 5.25,
    maxTermMonths: 120,
    minAmount: 50000,
    maxAmount: 2000000,
    // วงเงิน = min(มูลค่าหุ้น x 10, เพดาน 2,000,000) — ตัวอย่างสาธิต
    computeMaxAmount: ({ shareValue }) => Math.min(2000000, Math.max(shareValue * 10, 50000)),
  },
};

export const DIVIDEND_POLICY = {
  /** อัตราปันผลสมมติต่อหุ้น สำหรับสาธิต ผู้ดูแลระบบปรับได้ในหน้าจัดการปันผล */
  defaultDividendRatePercent: 4.5,
  defaultInterestRefundRatePercent: 2.0,
};

export const BILLING_POLICY = {
  /** จำนวนวันหลังวันครบกำหนดที่ถือว่าค้างชำระ */
  overdueGraceDays: 7,
};

export const NPL_MIN_OVERDUE_DAYS_FOR_CALCULATION = 90;
