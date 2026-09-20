// ประเภทข้อมูลหลักของระบบบริหารจัดการสหกรณ์ออมทรัพย์
// วันที่/เวลาเก็บเป็น ISO timestamp string เสมอ แปลงเป็นปี พ.ศ. เฉพาะตอนแสดงผล

export type Role = 'ADMIN' | 'STAFF' | 'MEMBER';

export interface AppUser {
  uid: string;
  displayName: string;
  email: string | null;
  photoURL: string | null;
  role: Role;
  memberId: string | null; // ผูกกับสมาชิกเมื่อ role เป็น MEMBER
}

export type MemberStatus = 'ACTIVE' | 'SUSPENDED' | 'RESIGNED';

export interface Beneficiary {
  id: string;
  name: string;
  relationship: string;
  sharePercent: number;
}

export interface Member {
  id: string;
  memberNo: string;
  fullName: string;
  nationalId: string; // เก็บเต็ม แสดงแบบปิดบังตามสิทธิ์
  email: string;
  phone: string;
  affiliation: string; // สังกัด
  position: string; // ตำแหน่ง
  salary: number;
  monthlyShareContribution: number;
  shareCount: number;
  shareValue: number; // มูลค่าหุ้นสะสม (คำนวณจาก ledger แต่เก็บ snapshot เพื่อแสดงผลเร็ว)
  totalDeposits: number; // snapshot ยอดเงินฝากรวม
  outstandingLoans: number; // snapshot เงินกู้คงค้าง
  status: MemberStatus;
  joinedAt: string; // ISO timestamp
  beneficiaries: Beneficiary[];
  firebaseUid: string | null;
  createdAt: string;
  updatedAt: string;
}

export type DepositAccountType = 'SAVINGS' | 'SPECIAL' | 'FIXED';
export type DepositAccountStatus = 'ACTIVE' | 'FROZEN' | 'CLOSED';

export interface DepositAccount {
  id: string;
  accountNo: string;
  memberId: string;
  accountType: DepositAccountType;
  accountName: string;
  balance: number;
  interestRatePercent: number;
  openedAt: string;
  status: DepositAccountStatus;
  ownerUid: string | null;
}

export type DepositTransactionType = 'DEPOSIT' | 'WITHDRAW';

export interface DepositTransaction {
  transactionId: string;
  accountId: string;
  memberId: string;
  type: DepositTransactionType;
  amount: number;
  balanceAfter: number;
  description: string;
  timestamp: string;
  receiptNo: string;
  actorUid: string;
  idempotencyKey: string;
}

export type LoanType = 'EMERGENCY' | 'ORDINARY' | 'SPECIAL';
export type LoanApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type LoanContractStatus = 'ACTIVE' | 'CLOSED' | 'DEFAULTED';

export interface LoanApplication {
  id: string;
  applicationNo: string;
  memberId: string;
  loanType: LoanType;
  requestedAmount: number;
  termMonths: number;
  purpose: string;
  status: LoanApplicationStatus;
  submittedAt: string;
  decidedAt: string | null;
  decidedByUid: string | null;
  decisionNote: string | null;
}

export interface LoanContract {
  id: string;
  contractNo: string;
  memberId: string;
  loanType: LoanType;
  applicationId: string | null;
  principal: number;
  interestRatePercent: number; // ต่อปี
  termMonths: number;
  principalOutstanding: number;
  interestAccrued: number;
  monthlyInstallment: number;
  status: LoanContractStatus;
  startedAt: string;
  closedAt: string | null;
}

export type LoanRepaymentType = 'INSTALLMENT' | 'EXTRA' | 'PAYOFF';

export interface LoanRepayment {
  repaymentId: string;
  contractId: string;
  memberId: string;
  amount: number;
  principalPortion: number;
  interestPortion: number;
  principalAfter: number;
  type: LoanRepaymentType;
  timestamp: string;
  receiptNo: string;
  actorUid: string;
  idempotencyKey: string;
}

export type ShareLedgerEntryType = 'MONTHLY_CONTRIBUTION' | 'ADJUSTMENT' | 'WITHDRAWAL_ON_RESIGN';

export interface ShareLedgerEntry {
  id: string;
  memberId: string;
  type: ShareLedgerEntryType;
  shareCountDelta: number;
  amount: number;
  balanceSharesAfter: number;
  balanceValueAfter: number;
  timestamp: string;
  note: string;
}

export type DividendRunStatus = 'DRAFT' | 'APPROVED' | 'PROCESSED';

export interface DividendRun {
  id: string;
  fiscalYearBE: number; // ปี พ.ศ.
  dividendRatePercent: number; // อัตราปันผลสมมติ ต่อหุ้น
  interestRefundRatePercent: number; // อัตราเฉลี่ยคืนดอกเบี้ยเงินกู้ (ถ้ามี)
  status: DividendRunStatus;
  totalDividendAmount: number;
  memberCount: number;
  createdAt: string;
  approvedAt: string | null;
  approvedByUid: string | null;
  processedAt: string | null;
}

export interface DividendAllocation {
  id: string;
  runId: string;
  memberId: string;
  shareCount: number;
  dividendAmount: number;
  interestRefundAmount: number;
}

export type BillingRunStatus = 'DRAFT' | 'ISSUED' | 'CLOSED';

export interface BillingRun {
  id: string;
  periodLabel: string; // เช่น 2569-09
  periodYearBE: number;
  periodMonth: number;
  status: BillingRunStatus;
  totalItems: number;
  totalAmount: number;
  totalCollected: number;
  createdAt: string;
  issuedAt: string | null;
}

export type BillingItemStatus = 'DUE' | 'PAID' | 'OVERDUE' | 'WAIVED';

export interface BillingItem {
  id: string;
  runId: string;
  memberId: string;
  shareContribution: number;
  loanInstallment: number;
  otherFees: number;
  totalDue: number;
  status: BillingItemStatus;
  dueDate: string;
  paidAt: string | null;
}

// ---- ข้อมูลสาธิตสำหรับ Financial Health Overview (D3) ----
export interface FinancialHealthRecord {
  recordId: string;
  accountId: string;
  month: string; // YYYY-MM
  depositBalance: number;
  loanPrincipalOutstanding: number;
  overduePrincipal: number;
}

// ---- COOP-ai ----
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
