// ตัวสร้างข้อมูลสังเคราะห์สำหรับโหมดทดลอง — สร้างใหม่ทุกครั้งที่โหลดหน้า (รีเฟรชแล้วกลับเป็นค่าเริ่มต้น)
import type {
  Beneficiary,
  BillingItem,
  BillingRun,
  DepositAccount,
  DepositTransaction,
  DividendRun,
  LoanApplication,
  LoanContract,
  LoanRepayment,
  Member,
  ShareLedgerEntry,
} from '../../types';
import { DEPOSIT_PRODUCTS, LOAN_POLICIES } from '../../config/policy';
import { formatAccountNo, formatContractNo, formatMemberNo, formatReceiptNo } from '../../lib/id';
import { calcMonthlyInstallment } from '../../lib/finance';

// mulberry32 — PRNG แบบ seed ได้ เพื่อให้ข้อมูลตัวอย่างดูสมจริงและทดสอบซ้ำได้
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

const rand = mulberry32(20260920);
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const randAmount = (min: number, max: number, step = 100) =>
  Math.round((min + rand() * (max - min)) / step) * step;

const FIRST_NAMES = [
  'สมชาย', 'สมหญิง', 'วิชัย', 'ประภา', 'อนุชา', 'สุดา', 'ธนากร', 'กมลวรรณ', 'ปรีชา', 'รัตนา',
  'ชัยวัฒน์', 'นภาพร', 'ทวีศักดิ์', 'อรุณี', 'สุรชัย', 'วราภรณ์', 'พิชัย', 'เกศินี', 'บุญมี', 'ศิริพร',
  'มานะ', 'จิราภรณ์', 'สมบัติ', 'พรทิพย์', 'วีระ', 'อำไพ', 'ประยุทธ์', 'ดวงใจ', 'สุเมธ', 'นันทนา',
  'ไพโรจน์', 'ลัดดา', 'ชูชาติ', 'สายฝน', 'อดิศักดิ์', 'จันทร์เพ็ญ',
];
const LAST_NAMES = [
  'ใจดี', 'รักเรียน', 'ศรีสุข', 'มั่นคง', 'เจริญพร', 'สุขสันต์', 'แสงทอง', 'บุญเรือง', 'พงษ์ไพร', 'ทองดี',
  'วงศ์สกุล', 'ประเสริฐ', 'สินสมบูรณ์', 'พูลสวัสดิ์', 'ธนสาร', 'โพธิ์ทอง', 'อยู่สุข', 'คงเจริญ', 'ศิริวัฒน์', 'เกตุแก้ว',
];
const AFFILIATIONS = ['สำนักงานใหญ่', 'ฝ่ายการเงิน', 'ฝ่ายบุคคล', 'ฝ่ายปฏิบัติการ', 'สาขาภาคเหนือ', 'สาขาภาคใต้', 'สาขาภาคอีสาน', 'ฝ่ายเทคโนโลยีสารสนเทศ'];
const POSITIONS = ['เจ้าหน้าที่ปฏิบัติการ', 'หัวหน้างาน', 'ผู้จัดการ', 'เจ้าหน้าที่อาวุโส', 'นักวิเคราะห์', 'ผู้ช่วยผู้จัดการ'];
const RELATIONSHIPS = ['คู่สมรส', 'บุตร', 'บิดา', 'มารดา', 'พี่น้อง'];

const nowIso = () => new Date().toISOString();
const isoDaysAgo = (days: number) => new Date(Date.now() - days * 86400000).toISOString();

let memberSeq = 0;
let accountSeq = 0;
let receiptSeq = 0;
let contractSeq = 0;
let applicationSeq = 0;

function buildBeneficiaries(): Beneficiary[] {
  const count = randInt(0, 2);
  if (count === 0) return [];
  if (count === 1) {
    return [{ id: `ben-${rand().toString(36).slice(2)}`, name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`, relationship: pick(RELATIONSHIPS), sharePercent: 100 }];
  }
  return [
    { id: `ben-${rand().toString(36).slice(2)}`, name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`, relationship: pick(RELATIONSHIPS), sharePercent: 60 },
    { id: `ben-${rand().toString(36).slice(2)}`, name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`, relationship: pick(RELATIONSHIPS), sharePercent: 40 },
  ];
}

export interface DemoSeed {
  members: Member[];
  accounts: DepositAccount[];
  accountTransactions: Map<string, DepositTransaction[]>;
  applications: LoanApplication[];
  contracts: LoanContract[];
  contractRepayments: Map<string, LoanRepayment[]>;
  shareLedger: Map<string, ShareLedgerEntry[]>;
  dividendRuns: DividendRun[];
  billingRuns: BillingRun[];
  billingItems: Map<string, BillingItem[]>;
  sequences: {
    memberSeq: number;
    accountSeq: number;
    receiptSeq: number;
    contractSeq: number;
    applicationSeq: number;
  };
}

export function generateDemoSeed(memberCount = 36): DemoSeed {
  const members: Member[] = [];
  const accounts: DepositAccount[] = [];
  const accountTransactions = new Map<string, DepositTransaction[]>();
  const applications: LoanApplication[] = [];
  const contracts: LoanContract[] = [];
  const contractRepayments = new Map<string, LoanRepayment[]>();
  const shareLedger = new Map<string, ShareLedgerEntry[]>();

  for (let i = 0; i < memberCount; i++) {
    memberSeq += 1;
    const joinYearBE = randInt(2555, 2568);
    const salary = randAmount(15000, 65000, 500);
    const monthlyShare = randAmount(300, 3000, 100);
    const monthsAsMember = randInt(6, 180);
    const shareCount = Math.round((monthlyShare * monthsAsMember) / 10);
    const shareValue = shareCount * 10;
    const memberId = `mem-${memberSeq}`;
    const status: Member['status'] = rand() < 0.9 ? 'ACTIVE' : rand() < 0.5 ? 'SUSPENDED' : 'RESIGNED';

    const member: Member = {
      id: memberId,
      memberNo: formatMemberNo(memberSeq, joinYearBE),
      fullName: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
      nationalId: `${randInt(1, 9)}${String(randInt(0, 999999999999)).padStart(12, '0')}`,
      email: `member${memberSeq}@example-coop.local`,
      phone: `08${String(randInt(10000000, 99999999))}`,
      affiliation: pick(AFFILIATIONS),
      position: pick(POSITIONS),
      salary,
      monthlyShareContribution: monthlyShare,
      shareCount,
      shareValue,
      totalDeposits: 0,
      outstandingLoans: 0,
      status,
      joinedAt: isoDaysAgo(monthsAsMember * 30),
      beneficiaries: buildBeneficiaries(),
      firebaseUid: null,
      createdAt: isoDaysAgo(monthsAsMember * 30),
      updatedAt: nowIso(),
    };
    members.push(member);

    shareLedger.set(memberId, [
      {
        id: `shr-${memberId}-init`,
        memberId,
        type: 'MONTHLY_CONTRIBUTION',
        shareCountDelta: shareCount,
        amount: shareValue,
        balanceSharesAfter: shareCount,
        balanceValueAfter: shareValue,
        timestamp: isoDaysAgo(monthsAsMember * 30),
        note: 'ยอดยกมาสะสม',
      },
    ]);

    // เปิดบัญชีเงินฝากออมทรัพย์ให้ทุกคน และบางส่วนมีบัญชีพิเศษ/ฝากประจำเพิ่ม
    const numAccounts = rand() < 0.35 ? 2 : 1;
    let memberTotalDeposits = 0;
    for (let a = 0; a < numAccounts; a++) {
      accountSeq += 1;
      const accountType = a === 0 ? 'SAVINGS' : pick(['SPECIAL', 'FIXED'] as const);
      const prefix = accountType === 'SAVINGS' ? 'S' : accountType === 'SPECIAL' ? 'P' : 'F';
      const balance = randAmount(2000, 250000, 100);
      const accountId = `acc-${accountSeq}`;
      accounts.push({
        id: accountId,
        accountNo: formatAccountNo(prefix, accountSeq),
        memberId,
        accountType,
        accountName: `${DEPOSIT_PRODUCTS[accountType].label} - ${member.fullName}`,
        balance,
        interestRatePercent: DEPOSIT_PRODUCTS[accountType].interestRatePercent,
        openedAt: isoDaysAgo(randInt(10, monthsAsMember * 30)),
        status: 'ACTIVE',
        ownerUid: null,
      });
      memberTotalDeposits += balance;

      receiptSeq += 1;
      accountTransactions.set(accountId, [
        {
          transactionId: `txn-${accountId}-init`,
          accountId,
          memberId,
          type: 'DEPOSIT',
          amount: balance,
          balanceAfter: balance,
          description: 'ยอดยกมา (เปิดบัญชี)',
          timestamp: isoDaysAgo(randInt(10, monthsAsMember * 30)),
          receiptNo: formatReceiptNo(receiptSeq),
          actorUid: 'system-seed',
          idempotencyKey: `seed-${accountId}`,
        },
      ]);
    }
    member.totalDeposits = memberTotalDeposits;

    // สมาชิกส่วนหนึ่งมีสัญญาเงินกู้ที่เปิดดำเนินการอยู่
    if (status === 'ACTIVE' && rand() < 0.4) {
      contractSeq += 1;
      const loanType = pick(['EMERGENCY', 'ORDINARY', 'SPECIAL'] as const);
      const policy = LOAN_POLICIES[loanType];
      const maxAmount = Math.min(policy.maxAmount, policy.computeMaxAmount({ salary, shareValue }));
      const principal = randAmount(Math.min(policy.minAmount, maxAmount * 0.5), Math.max(policy.minAmount, maxAmount), 500);
      const termMonths = randInt(Math.min(6, policy.maxTermMonths), policy.maxTermMonths);
      const installmentResult = calcMonthlyInstallment(principal, policy.interestRatePercent, termMonths);
      const monthlyInstallment = installmentResult.ok ? installmentResult.value : principal / termMonths;
      const monthsElapsed = randInt(1, Math.max(1, termMonths - 1));
      const principalOutstanding = Math.max(0, principal * (1 - monthsElapsed / termMonths) * (0.85 + rand() * 0.15));
      const contractId = `loan-${contractSeq}`;

      contracts.push({
        id: contractId,
        contractNo: formatContractNo(contractSeq, joinYearBE + 1),
        memberId,
        loanType,
        applicationId: null,
        principal,
        interestRatePercent: policy.interestRatePercent,
        termMonths,
        principalOutstanding: Math.round(principalOutstanding),
        interestAccrued: Math.round(principalOutstanding * (policy.interestRatePercent / 100 / 12)),
        monthlyInstallment: Math.round(monthlyInstallment),
        status: 'ACTIVE',
        startedAt: isoDaysAgo(monthsElapsed * 30),
        closedAt: null,
      });
      member.outstandingLoans += Math.round(principalOutstanding);
      contractRepayments.set(contractId, []);
    }
  }

  // คำขอกู้รอพิจารณา
  const activeMembers = members.filter((m) => m.status === 'ACTIVE');
  const pendingCount = Math.min(6, Math.floor(activeMembers.length * 0.12));
  for (let i = 0; i < pendingCount; i++) {
    applicationSeq += 1;
    const member = pick(activeMembers);
    const loanType = pick(['EMERGENCY', 'ORDINARY', 'SPECIAL'] as const);
    const policy = LOAN_POLICIES[loanType];
    const maxAmount = Math.min(policy.maxAmount, policy.computeMaxAmount({ salary: member.salary, shareValue: member.shareValue }));
    applications.push({
      id: `apl-${applicationSeq}`,
      applicationNo: `AP${randInt(2566, 2569)}${String(applicationSeq).padStart(5, '0')}`,
      memberId: member.id,
      loanType,
      requestedAmount: randAmount(policy.minAmount, Math.max(policy.minAmount, maxAmount), 500),
      termMonths: randInt(Math.min(6, policy.maxTermMonths), policy.maxTermMonths),
      purpose: pick(['ค่ารักษาพยาบาล', 'การศึกษาบุตร', 'ซ่อมแซมที่อยู่อาศัย', 'ชำระหนี้สิน', 'ธุรกิจส่วนตัว']),
      status: 'PENDING',
      submittedAt: isoDaysAgo(randInt(1, 20)),
      decidedAt: null,
      decidedByUid: null,
      decisionNote: null,
    });
  }

  const dividendRuns: DividendRun[] = [];
  const billingRuns: BillingRun[] = [];
  const billingItems = new Map<string, BillingItem[]>();

  return {
    members,
    accounts,
    accountTransactions,
    applications,
    contracts,
    contractRepayments,
    shareLedger,
    dividendRuns,
    billingRuns,
    billingItems,
    sequences: { memberSeq, accountSeq, receiptSeq, contractSeq, applicationSeq },
  };
}
