// บริการโหมดทดลอง — เก็บสถานะทั้งหมดในหน่วยความจำของหน้าเว็บ ไม่เชื่อมต่อ Firestore
// รีเฟรชหน้าเว็บแล้วสถานะจะถูกสร้างใหม่จาก generateDemoSeed() เสมอ
import type {
  BillingItem,
  BillingRun,
  DepositAccount,
  DepositTransaction,
  DividendAllocation,
  DividendRun,
  LoanApplication,
  LoanContract,
  LoanRepayment,
  Member,
  ShareLedgerEntry,
} from '../../types';
import { DEPOSIT_PRODUCTS, LOAN_POLICIES } from '../../config/policy';
import { formatAccountNo, formatContractNo, formatMemberNo, formatReceiptNo, InMemorySequence } from '../../lib/id';
import { calcMonthlyInstallment } from '../../lib/finance';
import { generateDemoSeed } from './demoData';
import type {
  CoopDataService,
  CreateDividendRunInput,
  CreateMemberInput,
  DecideLoanApplicationInput,
  DepositWithdrawInput,
  GenerateBillingRunInput,
  OpenAccountInput,
  RepayLoanInput,
  SubmitLoanApplicationInput,
  Unsubscribe,
  UpdateMemberInput,
} from '../types';

const seed = generateDemoSeed();

const state = {
  members: [...seed.members],
  accounts: [...seed.accounts],
  accountTransactions: seed.accountTransactions,
  applications: [...seed.applications],
  contracts: [...seed.contracts],
  contractRepayments: seed.contractRepayments,
  shareLedger: seed.shareLedger,
  dividendRuns: [...seed.dividendRuns],
  dividendAllocations: new Map<string, DividendAllocation[]>(),
  billingRuns: [...seed.billingRuns],
  billingItems: seed.billingItems,
};

const seq = {
  member: new InMemorySequence(seed.sequences.memberSeq),
  account: new InMemorySequence(seed.sequences.accountSeq),
  receipt: new InMemorySequence(seed.sequences.receiptSeq),
  contract: new InMemorySequence(seed.sequences.contractSeq),
  application: new InMemorySequence(seed.sequences.applicationSeq),
  dividendRun: new InMemorySequence(0),
  dividendAllocation: new InMemorySequence(0),
  billingRun: new InMemorySequence(0),
  billingItem: new InMemorySequence(0),
};

// เก็บผลลัพธ์ของ idempotencyKey ที่ใช้ไปแล้ว เพื่อไม่ให้ธุรกรรมซ้ำเมื่อกดส่งซ้ำ
const depositWithdrawIdempotency = new Map<string, DepositTransaction>();
const repayIdempotency = new Map<string, LoanRepayment>();

type Listener<T> = (items: T[]) => void;
function createChannel<T>(getSnapshot: () => T[]) {
  const listeners = new Set<Listener<T>>();
  return {
    subscribe(listener: Listener<T>): Unsubscribe {
      listeners.add(listener);
      listener(getSnapshot());
      return () => listeners.delete(listener);
    },
    emit() {
      const snapshot = getSnapshot();
      listeners.forEach((l) => l(snapshot));
    },
  };
}

const membersChannel = createChannel(() => state.members);
const accountsChannel = createChannel(() => state.accounts);
const applicationsChannel = createChannel(() => state.applications);
const contractsChannel = createChannel(() => state.contracts);

const delay = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

function currentYearBE(): number {
  return new Date().getFullYear() + 543;
}

export const demoService: CoopDataService = {
  mode: 'demo',

  async listMembers() {
    await delay();
    return [...state.members];
  },
  subscribeMembers(onChange) {
    return membersChannel.subscribe(onChange);
  },
  async getMember(id) {
    await delay();
    return state.members.find((m) => m.id === id) ?? null;
  },
  async createMember(input: CreateMemberInput) {
    await delay();
    if (!input.fullName.trim()) throw new Error('กรุณากรอกชื่อ-นามสกุล');
    if (input.salary < 0) throw new Error('เงินเดือนต้องไม่ติดลบ');
    if (input.monthlyShareContribution < 0) throw new Error('ยอดส่งหุ้นต้องไม่ติดลบ');

    const num = seq.member.next();
    const joinYearBE = currentYearBE();
    const id = `mem-${Date.now()}-${num}`;
    const nowIso = new Date().toISOString();
    const member: Member = {
      id,
      memberNo: formatMemberNo(num, joinYearBE),
      fullName: input.fullName.trim(),
      nationalId: input.nationalId,
      email: input.email,
      phone: input.phone,
      affiliation: input.affiliation,
      position: input.position,
      salary: input.salary,
      monthlyShareContribution: input.monthlyShareContribution,
      shareCount: 0,
      shareValue: 0,
      totalDeposits: 0,
      outstandingLoans: 0,
      status: 'ACTIVE',
      joinedAt: nowIso,
      beneficiaries: input.beneficiaries.map((b, i) => ({ ...b, id: `ben-${id}-${i}` })),
      firebaseUid: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    state.members = [...state.members, member];
    membersChannel.emit();
    return member;
  },
  async updateMember(id, input: UpdateMemberInput) {
    await delay();
    const idx = state.members.findIndex((m) => m.id === id);
    if (idx === -1) throw new Error('ไม่พบสมาชิก');
    const { beneficiaries, ...rest } = input;
    const updated: Member = {
      ...state.members[idx],
      ...rest,
      ...(beneficiaries ? { beneficiaries: beneficiaries.map((b, i) => ({ ...b, id: `ben-${id}-${i}` })) } : {}),
      updatedAt: new Date().toISOString(),
    };
    state.members = state.members.map((m) => (m.id === id ? updated : m));
    membersChannel.emit();
    return updated;
  },

  async listDepositAccounts() {
    await delay();
    return [...state.accounts];
  },
  subscribeDepositAccounts(onChange) {
    return accountsChannel.subscribe(onChange);
  },
  async openDepositAccount(input: OpenAccountInput) {
    await delay();
    if (input.openingBalance < 0) throw new Error('ยอดเปิดบัญชีต้องไม่ติดลบ');
    const num = seq.account.next();
    const prefix = input.accountType === 'SAVINGS' ? 'S' : input.accountType === 'SPECIAL' ? 'P' : 'F';
    const id = `acc-${Date.now()}-${num}`;
    const account: DepositAccount = {
      id,
      accountNo: formatAccountNo(prefix, num),
      memberId: input.memberId,
      accountType: input.accountType,
      accountName: input.accountName,
      balance: input.openingBalance,
      interestRatePercent: DEPOSIT_PRODUCTS[input.accountType].interestRatePercent,
      openedAt: new Date().toISOString(),
      status: 'ACTIVE',
      ownerUid: null,
    };
    state.accounts = [...state.accounts, account];
    state.accountTransactions.set(id, []);
    if (input.openingBalance > 0) {
      const receiptNum = seq.receipt.next();
      const txn: DepositTransaction = {
        transactionId: `txn-${Date.now()}`,
        accountId: id,
        memberId: input.memberId,
        type: 'DEPOSIT',
        amount: input.openingBalance,
        balanceAfter: input.openingBalance,
        description: 'เปิดบัญชี',
        timestamp: new Date().toISOString(),
        receiptNo: formatReceiptNo(receiptNum),
        actorUid: input.actorUid,
        idempotencyKey: `open-${id}`,
      };
      state.accountTransactions.set(id, [txn]);
    }
    bumpMemberDepositTotal(input.memberId);
    accountsChannel.emit();
    return account;
  },
  async listAccountTransactions(accountId) {
    await delay();
    return [...(state.accountTransactions.get(accountId) ?? [])];
  },
  async deposit(input: DepositWithdrawInput) {
    return applyDepositWithdraw(input, 'DEPOSIT');
  },
  async withdraw(input: DepositWithdrawInput) {
    return applyDepositWithdraw(input, 'WITHDRAW');
  },
  async setAccountStatus(accountId, status) {
    await delay();
    const idx = state.accounts.findIndex((a) => a.id === accountId);
    if (idx === -1) throw new Error('ไม่พบบัญชี');
    const updated = { ...state.accounts[idx], status };
    state.accounts = state.accounts.map((a) => (a.id === accountId ? updated : a));
    accountsChannel.emit();
    return updated;
  },

  async listLoanApplications() {
    await delay();
    return [...state.applications];
  },
  subscribeLoanApplications(onChange) {
    return applicationsChannel.subscribe(onChange);
  },
  async submitLoanApplication(input: SubmitLoanApplicationInput) {
    await delay();
    const member = state.members.find((m) => m.id === input.memberId);
    if (!member) throw new Error('ไม่พบสมาชิก');
    const policy = LOAN_POLICIES[input.loanType];
    const maxAmount = Math.min(policy.maxAmount, policy.computeMaxAmount({ salary: member.salary, shareValue: member.shareValue }));
    if (input.requestedAmount <= 0) throw new Error('จำนวนเงินกู้ต้องมากกว่า 0');
    if (input.requestedAmount > maxAmount) {
      throw new Error(`วงเงินกู้ประเภท${policy.label}สูงสุดคือ ${maxAmount.toLocaleString('th-TH')} บาท`);
    }
    const num = seq.application.next();
    const application: LoanApplication = {
      id: `apl-${Date.now()}-${num}`,
      applicationNo: `AP${currentYearBE()}${String(num).padStart(5, '0')}`,
      memberId: input.memberId,
      loanType: input.loanType,
      requestedAmount: input.requestedAmount,
      termMonths: input.termMonths,
      purpose: input.purpose,
      status: 'PENDING',
      submittedAt: new Date().toISOString(),
      decidedAt: null,
      decidedByUid: null,
      decisionNote: null,
    };
    state.applications = [...state.applications, application];
    applicationsChannel.emit();
    return application;
  },
  async decideLoanApplication(input: DecideLoanApplicationInput) {
    await delay();
    const idx = state.applications.findIndex((a) => a.id === input.applicationId);
    if (idx === -1) throw new Error('ไม่พบคำขอกู้');
    const application = state.applications[idx];
    if (application.status !== 'PENDING') throw new Error('คำขอนี้ถูกพิจารณาไปแล้ว');

    const updatedApplication: LoanApplication = {
      ...application,
      status: input.approve ? 'APPROVED' : 'REJECTED',
      decidedAt: new Date().toISOString(),
      decidedByUid: input.decidedByUid,
      decisionNote: input.note,
    };
    state.applications = state.applications.map((a) => (a.id === input.applicationId ? updatedApplication : a));
    applicationsChannel.emit();

    if (!input.approve) return { application: updatedApplication, contract: null };

    const policy = LOAN_POLICIES[application.loanType];
    const installmentResult = calcMonthlyInstallment(application.requestedAmount, policy.interestRatePercent, application.termMonths);
    const num = seq.contract.next();
    const contractId = `loan-${Date.now()}-${num}`;
    const contract: LoanContract = {
      id: contractId,
      contractNo: formatContractNo(num, currentYearBE()),
      memberId: application.memberId,
      loanType: application.loanType,
      applicationId: application.id,
      principal: application.requestedAmount,
      interestRatePercent: policy.interestRatePercent,
      termMonths: application.termMonths,
      principalOutstanding: application.requestedAmount,
      interestAccrued: 0,
      monthlyInstallment: installmentResult.ok ? Math.round(installmentResult.value) : Math.round(application.requestedAmount / application.termMonths),
      status: 'ACTIVE',
      startedAt: new Date().toISOString(),
      closedAt: null,
    };
    state.contracts = [...state.contracts, contract];
    state.contractRepayments.set(contractId, []);
    contractsChannel.emit();

    const memberIdx = state.members.findIndex((m) => m.id === application.memberId);
    if (memberIdx !== -1) {
      state.members = state.members.map((m) =>
        m.id === application.memberId ? { ...m, outstandingLoans: m.outstandingLoans + contract.principal } : m,
      );
      membersChannel.emit();
    }

    return { application: updatedApplication, contract };
  },
  async listLoanContracts() {
    await delay();
    return [...state.contracts];
  },
  subscribeLoanContracts(onChange) {
    return contractsChannel.subscribe(onChange);
  },
  async listContractRepayments(contractId) {
    await delay();
    return [...(state.contractRepayments.get(contractId) ?? [])];
  },
  async repayLoan(input: RepayLoanInput) {
    await delay();
    const existing = repayIdempotency.get(input.idempotencyKey);
    if (existing) return existing;

    const idx = state.contracts.findIndex((c) => c.id === input.contractId);
    if (idx === -1) throw new Error('ไม่พบสัญญาเงินกู้');
    const contract = state.contracts[idx];
    if (contract.status !== 'ACTIVE') throw new Error('สัญญานี้ปิดแล้ว ไม่สามารถชำระเพิ่มได้');
    if (input.amount <= 0) throw new Error('จำนวนเงินต้องมากกว่า 0');

    const monthlyRate = contract.interestRatePercent / 100 / 12;
    const interestPortion = Math.min(input.amount, Math.round(contract.principalOutstanding * monthlyRate));
    const principalPortion = Math.min(contract.principalOutstanding, input.amount - interestPortion);
    const principalAfter = Math.max(0, contract.principalOutstanding - principalPortion);

    const receiptNum = seq.receipt.next();
    const repayment: LoanRepayment = {
      repaymentId: `rep-${Date.now()}`,
      contractId: input.contractId,
      memberId: contract.memberId,
      amount: input.amount,
      principalPortion,
      interestPortion,
      principalAfter,
      type: principalAfter === 0 ? 'PAYOFF' : 'INSTALLMENT',
      timestamp: new Date().toISOString(),
      receiptNo: formatReceiptNo(receiptNum),
      actorUid: input.actorUid,
      idempotencyKey: input.idempotencyKey,
    };
    repayIdempotency.set(input.idempotencyKey, repayment);

    const updatedContract: LoanContract = {
      ...contract,
      principalOutstanding: principalAfter,
      status: principalAfter === 0 ? 'CLOSED' : 'ACTIVE',
      closedAt: principalAfter === 0 ? new Date().toISOString() : null,
    };
    state.contracts = state.contracts.map((c) => (c.id === input.contractId ? updatedContract : c));
    state.contractRepayments.set(input.contractId, [...(state.contractRepayments.get(input.contractId) ?? []), repayment]);
    contractsChannel.emit();

    state.members = state.members.map((m) =>
      m.id === contract.memberId ? { ...m, outstandingLoans: Math.max(0, m.outstandingLoans - principalPortion) } : m,
    );
    membersChannel.emit();

    return repayment;
  },

  async listShareLedger(memberId) {
    await delay();
    return [...(state.shareLedger.get(memberId) ?? [])];
  },
  async listDividendRuns() {
    await delay();
    return [...state.dividendRuns];
  },
  async createDividendRun(input: CreateDividendRunInput) {
    await delay();
    const activeMembers = state.members.filter((m) => m.status === 'ACTIVE' && m.shareValue > 0);
    const num = seq.dividendRun.next();
    const allocations: DividendAllocation[] = activeMembers.map((m) => {
      const allocNum = seq.dividendAllocation.next();
      return {
        id: `div-alloc-${allocNum}`,
        runId: `div-${num}`,
        memberId: m.id,
        shareCount: m.shareCount,
        dividendAmount: Math.round(m.shareValue * (input.dividendRatePercent / 100)),
        interestRefundAmount: 0,
      };
    });
    const run: DividendRun = {
      id: `div-${num}`,
      fiscalYearBE: input.fiscalYearBE,
      dividendRatePercent: input.dividendRatePercent,
      interestRefundRatePercent: input.interestRefundRatePercent,
      status: 'DRAFT',
      totalDividendAmount: allocations.reduce((sum, a) => sum + a.dividendAmount, 0),
      memberCount: allocations.length,
      createdAt: new Date().toISOString(),
      approvedAt: null,
      approvedByUid: null,
      processedAt: null,
    };
    state.dividendRuns = [...state.dividendRuns, run];
    state.dividendAllocations.set(run.id, allocations);
    return run;
  },
  async approveDividendRun(runId, approvedByUid) {
    await delay();
    const idx = state.dividendRuns.findIndex((r) => r.id === runId);
    if (idx === -1) throw new Error('ไม่พบรายการปันผล');
    if (state.dividendRuns[idx].status !== 'DRAFT') throw new Error('รายการนี้ถูกอนุมัติไปแล้ว');
    const updated: DividendRun = { ...state.dividendRuns[idx], status: 'APPROVED', approvedAt: new Date().toISOString(), approvedByUid };
    state.dividendRuns = state.dividendRuns.map((r) => (r.id === runId ? updated : r));
    return updated;
  },
  async processDividendRun(runId) {
    await delay();
    const idx = state.dividendRuns.findIndex((r) => r.id === runId);
    if (idx === -1) throw new Error('ไม่พบรายการปันผล');
    if (state.dividendRuns[idx].status !== 'APPROVED') throw new Error('ต้องอนุมัติก่อนจึงประมวลผลได้');
    const updated: DividendRun = { ...state.dividendRuns[idx], status: 'PROCESSED', processedAt: new Date().toISOString() };
    state.dividendRuns = state.dividendRuns.map((r) => (r.id === runId ? updated : r));

    const allocations = state.dividendAllocations.get(runId) ?? [];
    for (const alloc of allocations) {
      const ledgerEntries = state.shareLedger.get(alloc.memberId) ?? [];
      const last = ledgerEntries[ledgerEntries.length - 1];
      const newEntry: ShareLedgerEntry = {
        id: `shr-${alloc.id}`,
        memberId: alloc.memberId,
        type: 'ADJUSTMENT',
        shareCountDelta: 0,
        amount: alloc.dividendAmount,
        balanceSharesAfter: last?.balanceSharesAfter ?? 0,
        balanceValueAfter: (last?.balanceValueAfter ?? 0) + alloc.dividendAmount,
        timestamp: new Date().toISOString(),
        note: `เงินปันผลปี ${updated.fiscalYearBE}`,
      };
      state.shareLedger.set(alloc.memberId, [...ledgerEntries, newEntry]);
    }
    return updated;
  },
  async listDividendAllocations(runId) {
    await delay();
    return [...(state.dividendAllocations.get(runId) ?? [])];
  },

  async listBillingRuns() {
    await delay();
    return [...state.billingRuns];
  },
  async generateBillingRun(input: GenerateBillingRunInput) {
    await delay();
    const periodLabel = `${input.periodYearBE}-${String(input.periodMonth).padStart(2, '0')}`;
    if (state.billingRuns.some((r) => r.periodLabel === periodLabel)) {
      throw new Error('มีรอบเรียกเก็บของงวดนี้อยู่แล้ว');
    }
    const activeMembers = state.members.filter((m) => m.status === 'ACTIVE');
    const num = seq.billingRun.next();
    const runId = `bill-${num}`;
    const items: BillingItem[] = activeMembers.map((m) => {
      const itemNum = seq.billingItem.next();
      const loanInstallment = state.contracts
        .filter((c) => c.memberId === m.id && c.status === 'ACTIVE')
        .reduce((sum, c) => sum + c.monthlyInstallment, 0);
      const totalDue = m.monthlyShareContribution + loanInstallment;
      return {
        id: `bitem-${itemNum}`,
        runId,
        memberId: m.id,
        shareContribution: m.monthlyShareContribution,
        loanInstallment,
        otherFees: 0,
        totalDue,
        status: 'DUE',
        dueDate: new Date(Date.now() + 15 * 86400000).toISOString(),
        paidAt: null,
      };
    });
    const run: BillingRun = {
      id: runId,
      periodLabel,
      periodYearBE: input.periodYearBE,
      periodMonth: input.periodMonth,
      status: 'ISSUED',
      totalItems: items.length,
      totalAmount: items.reduce((sum, i) => sum + i.totalDue, 0),
      totalCollected: 0,
      createdAt: new Date().toISOString(),
      issuedAt: new Date().toISOString(),
    };
    state.billingRuns = [...state.billingRuns, run];
    state.billingItems.set(runId, items);
    return run;
  },
  async listBillingItems(runId) {
    await delay();
    return [...(state.billingItems.get(runId) ?? [])];
  },
  async markBillingItemPaid(itemId) {
    await delay();
    for (const [runId, items] of state.billingItems.entries()) {
      const idx = items.findIndex((i) => i.id === itemId);
      if (idx !== -1) {
        const updatedItem: BillingItem = { ...items[idx], status: 'PAID', paidAt: new Date().toISOString() };
        const updatedItems = items.map((i) => (i.id === itemId ? updatedItem : i));
        state.billingItems.set(runId, updatedItems);
        const runIdx = state.billingRuns.findIndex((r) => r.id === runId);
        if (runIdx !== -1) {
          const run = state.billingRuns[runIdx];
          state.billingRuns = state.billingRuns.map((r) =>
            r.id === runId ? { ...r, totalCollected: r.totalCollected + updatedItem.totalDue } : r,
          );
          void run;
        }
        return updatedItem;
      }
    }
    throw new Error('ไม่พบรายการเรียกเก็บ');
  },
};

function bumpMemberDepositTotal(memberId: string) {
  const total = state.accounts.filter((a) => a.memberId === memberId).reduce((sum, a) => sum + a.balance, 0);
  state.members = state.members.map((m) => (m.id === memberId ? { ...m, totalDeposits: total } : m));
  membersChannel.emit();
}

async function applyDepositWithdraw(
  input: DepositWithdrawInput,
  type: 'DEPOSIT' | 'WITHDRAW',
): Promise<DepositTransaction> {
  await delay();
  const existing = depositWithdrawIdempotency.get(input.idempotencyKey);
  if (existing) return existing;

  if (input.amount <= 0) throw new Error('จำนวนเงินต้องมากกว่า 0');
  const idx = state.accounts.findIndex((a) => a.id === input.accountId);
  if (idx === -1) throw new Error('ไม่พบบัญชี');
  const account = state.accounts[idx];
  if (account.status !== 'ACTIVE') throw new Error('บัญชีนี้ถูกระงับหรือปิดแล้ว ไม่สามารถทำรายการได้');
  if (type === 'WITHDRAW' && input.amount > account.balance) throw new Error('ยอดเงินคงเหลือไม่เพียงพอ');

  const balanceAfter = type === 'DEPOSIT' ? account.balance + input.amount : account.balance - input.amount;
  const receiptNum = seq.receipt.next();
  const txn: DepositTransaction = {
    transactionId: `txn-${Date.now()}-${receiptNum}`,
    accountId: input.accountId,
    memberId: account.memberId,
    type,
    amount: input.amount,
    balanceAfter,
    description: input.description,
    timestamp: new Date().toISOString(),
    receiptNo: formatReceiptNo(receiptNum),
    actorUid: input.actorUid,
    idempotencyKey: input.idempotencyKey,
  };
  depositWithdrawIdempotency.set(input.idempotencyKey, txn);

  state.accounts = state.accounts.map((a) => (a.id === input.accountId ? { ...a, balance: balanceAfter } : a));
  state.accountTransactions.set(input.accountId, [...(state.accountTransactions.get(input.accountId) ?? []), txn]);
  accountsChannel.emit();
  bumpMemberDepositTotal(account.memberId);

  return txn;
}
