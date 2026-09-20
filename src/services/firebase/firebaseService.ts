// บริการโหมด Firebase — อ่าน/เขียนข้อมูลจริงผ่าน Cloud Firestore
// ธุรกรรมทางการเงิน (ฝาก/ถอน/ชำระเงินกู้) ใช้ Firestore transaction เพื่อบันทึกรายการและปรับยอดในครั้งเดียว
// และใช้ idempotencyKey เป็นรหัสเอกสารเพื่อป้องกันการทำรายการซ้ำเมื่อส่งคำขอซ้ำ
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
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
import { formatAccountNo, formatContractNo, formatMemberNo, formatReceiptNo } from '../../lib/id';
import { calcMonthlyInstallment } from '../../lib/finance';
import { getFirebaseDb } from '../../lib/firebase';
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

const COL = {
  members: 'members',
  accounts: 'depositAccounts',
  transactions: 'depositTransactions',
  applications: 'loanApplications',
  contracts: 'loanContracts',
  repayments: 'loanRepayments',
  shareLedger: 'shareLedger',
  dividendRuns: 'dividendRuns',
  dividendAllocations: 'dividendAllocations',
  billingRuns: 'billingRuns',
  billingItems: 'billingItems',
  counters: 'counters',
};

function currentYearBE(): number {
  return new Date().getFullYear() + 543;
}

/** เพิ่มค่า counter แบบ atomic ผ่าน Firestore transaction เพื่อไม่ให้เลขที่ชนกันเมื่อมีผู้ใช้พร้อมกัน */
async function nextCounter(name: string): Promise<number> {
  const db = getFirebaseDb();
  const ref = doc(db, COL.counters, name);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists() ? (snap.data().value as number) : 0;
    const next = current + 1;
    tx.set(ref, { value: next }, { merge: true });
    return next;
  });
}

export const firebaseService: CoopDataService = {
  mode: 'firebase',

  async listMembers() {
    const db = getFirebaseDb();
    const snap = await getDocs(collection(db, COL.members));
    return snap.docs.map((d) => d.data() as Member);
  },
  subscribeMembers(onChange) {
    const db = getFirebaseDb();
    return onSnapshot(collection(db, COL.members), (snap) => {
      onChange(snap.docs.map((d) => d.data() as Member));
    }) as Unsubscribe;
  },
  async getMember(id) {
    const db = getFirebaseDb();
    const snap = await getDoc(doc(db, COL.members, id));
    return snap.exists() ? (snap.data() as Member) : null;
  },
  async createMember(input: CreateMemberInput) {
    if (!input.fullName.trim()) throw new Error('กรุณากรอกชื่อ-นามสกุล');
    if (input.salary < 0) throw new Error('เงินเดือนต้องไม่ติดลบ');
    if (input.monthlyShareContribution < 0) throw new Error('ยอดส่งหุ้นต้องไม่ติดลบ');

    const db = getFirebaseDb();
    const num = await nextCounter('members');
    const joinYearBE = currentYearBE();
    const ref = doc(collection(db, COL.members));
    const nowIso = new Date().toISOString();
    const member: Member = {
      id: ref.id,
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
      beneficiaries: input.beneficiaries.map((b, i) => ({ ...b, id: `ben-${ref.id}-${i}` })),
      firebaseUid: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    await setDoc(ref, member);
    return member;
  },
  async updateMember(id, input: UpdateMemberInput) {
    const db = getFirebaseDb();
    const ref = doc(db, COL.members, id);
    await updateDoc(ref, { ...input, updatedAt: new Date().toISOString() });
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('ไม่พบสมาชิก');
    return snap.data() as Member;
  },

  async listDepositAccounts() {
    const db = getFirebaseDb();
    const snap = await getDocs(collection(db, COL.accounts));
    return snap.docs.map((d) => d.data() as DepositAccount);
  },
  subscribeDepositAccounts(onChange) {
    const db = getFirebaseDb();
    return onSnapshot(collection(db, COL.accounts), (snap) => {
      onChange(snap.docs.map((d) => d.data() as DepositAccount));
    }) as Unsubscribe;
  },
  async openDepositAccount(input: OpenAccountInput) {
    if (input.openingBalance < 0) throw new Error('ยอดเปิดบัญชีต้องไม่ติดลบ');
    const db = getFirebaseDb();
    const num = await nextCounter('accounts');
    const prefix = input.accountType === 'SAVINGS' ? 'S' : input.accountType === 'SPECIAL' ? 'P' : 'F';
    const ref = doc(collection(db, COL.accounts));
    const account: DepositAccount = {
      id: ref.id,
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
    await setDoc(ref, account);
    if (input.openingBalance > 0) {
      await applyDepositWithdraw(
        { accountId: ref.id, amount: input.openingBalance, description: 'เปิดบัญชี', actorUid: input.actorUid, idempotencyKey: `open-${ref.id}` },
        'DEPOSIT',
      );
    }
    return account;
  },
  async listAccountTransactions(accountId) {
    const db = getFirebaseDb();
    const snap = await getDocs(query(collection(db, COL.transactions), where('accountId', '==', accountId)));
    return snap.docs.map((d) => d.data() as DepositTransaction).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  },
  async deposit(input: DepositWithdrawInput) {
    return applyDepositWithdraw(input, 'DEPOSIT');
  },
  async withdraw(input: DepositWithdrawInput) {
    return applyDepositWithdraw(input, 'WITHDRAW');
  },
  async setAccountStatus(accountId, status) {
    const db = getFirebaseDb();
    const ref = doc(db, COL.accounts, accountId);
    await updateDoc(ref, { status });
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('ไม่พบบัญชี');
    return snap.data() as DepositAccount;
  },

  async listLoanApplications() {
    const db = getFirebaseDb();
    const snap = await getDocs(collection(db, COL.applications));
    return snap.docs.map((d) => d.data() as LoanApplication);
  },
  subscribeLoanApplications(onChange) {
    const db = getFirebaseDb();
    return onSnapshot(collection(db, COL.applications), (snap) => {
      onChange(snap.docs.map((d) => d.data() as LoanApplication));
    }) as Unsubscribe;
  },
  async submitLoanApplication(input: SubmitLoanApplicationInput) {
    const db = getFirebaseDb();
    const memberSnap = await getDoc(doc(db, COL.members, input.memberId));
    if (!memberSnap.exists()) throw new Error('ไม่พบสมาชิก');
    const member = memberSnap.data() as Member;
    const policy = LOAN_POLICIES[input.loanType];
    const maxAmount = Math.min(policy.maxAmount, policy.computeMaxAmount({ salary: member.salary, shareValue: member.shareValue }));
    if (input.requestedAmount <= 0) throw new Error('จำนวนเงินกู้ต้องมากกว่า 0');
    if (input.requestedAmount > maxAmount) {
      throw new Error(`วงเงินกู้ประเภท${policy.label}สูงสุดคือ ${maxAmount.toLocaleString('th-TH')} บาท`);
    }
    const num = await nextCounter('applications');
    const ref = doc(collection(db, COL.applications));
    const application: LoanApplication = {
      id: ref.id,
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
    await setDoc(ref, application);
    return application;
  },
  async decideLoanApplication(input: DecideLoanApplicationInput) {
    const db = getFirebaseDb();
    const appRef = doc(db, COL.applications, input.applicationId);
    const appSnap = await getDoc(appRef);
    if (!appSnap.exists()) throw new Error('ไม่พบคำขอกู้');
    const application = appSnap.data() as LoanApplication;
    if (application.status !== 'PENDING') throw new Error('คำขอนี้ถูกพิจารณาไปแล้ว');

    const updatedApplication: LoanApplication = {
      ...application,
      status: input.approve ? 'APPROVED' : 'REJECTED',
      decidedAt: new Date().toISOString(),
      decidedByUid: input.decidedByUid,
      decisionNote: input.note,
    };
    await setDoc(appRef, updatedApplication);
    if (!input.approve) return { application: updatedApplication, contract: null };

    const policy = LOAN_POLICIES[application.loanType];
    const installmentResult = calcMonthlyInstallment(application.requestedAmount, policy.interestRatePercent, application.termMonths);
    const num = await nextCounter('contracts');
    const contractRef = doc(collection(db, COL.contracts));
    const contract: LoanContract = {
      id: contractRef.id,
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
    await setDoc(contractRef, contract);

    const memberRef = doc(db, COL.members, application.memberId);
    const memberSnap = await getDoc(memberRef);
    if (memberSnap.exists()) {
      const member = memberSnap.data() as Member;
      await updateDoc(memberRef, { outstandingLoans: member.outstandingLoans + contract.principal });
    }

    return { application: updatedApplication, contract };
  },
  async listLoanContracts() {
    const db = getFirebaseDb();
    const snap = await getDocs(collection(db, COL.contracts));
    return snap.docs.map((d) => d.data() as LoanContract);
  },
  subscribeLoanContracts(onChange) {
    const db = getFirebaseDb();
    return onSnapshot(collection(db, COL.contracts), (snap) => {
      onChange(snap.docs.map((d) => d.data() as LoanContract));
    }) as Unsubscribe;
  },
  async listContractRepayments(contractId) {
    const db = getFirebaseDb();
    const snap = await getDocs(query(collection(db, COL.repayments), where('contractId', '==', contractId)));
    return snap.docs.map((d) => d.data() as LoanRepayment).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  },
  async repayLoan(input: RepayLoanInput) {
    const db = getFirebaseDb();
    const contractRef = doc(db, COL.contracts, input.contractId);
    const repaymentRef = doc(db, COL.repayments, input.idempotencyKey);

    return runTransaction(db, async (tx) => {
      const existing = await tx.get(repaymentRef);
      if (existing.exists()) return existing.data() as LoanRepayment;

      const contractSnap = await tx.get(contractRef);
      if (!contractSnap.exists()) throw new Error('ไม่พบสัญญาเงินกู้');
      const contract = contractSnap.data() as LoanContract;
      if (contract.status !== 'ACTIVE') throw new Error('สัญญานี้ปิดแล้ว ไม่สามารถชำระเพิ่มได้');
      if (input.amount <= 0) throw new Error('จำนวนเงินต้องมากกว่า 0');

      const monthlyRate = contract.interestRatePercent / 100 / 12;
      const interestPortion = Math.min(input.amount, Math.round(contract.principalOutstanding * monthlyRate));
      const principalPortion = Math.min(contract.principalOutstanding, input.amount - interestPortion);
      const principalAfter = Math.max(0, contract.principalOutstanding - principalPortion);
      const receiptNum = await nextCounter('receipts');

      const repayment: LoanRepayment = {
        repaymentId: repaymentRef.id,
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
      tx.set(repaymentRef, repayment);
      tx.update(contractRef, {
        principalOutstanding: principalAfter,
        status: principalAfter === 0 ? 'CLOSED' : 'ACTIVE',
        closedAt: principalAfter === 0 ? new Date().toISOString() : null,
      });

      const memberRef = doc(db, COL.members, contract.memberId);
      const memberSnap = await tx.get(memberRef);
      if (memberSnap.exists()) {
        const member = memberSnap.data() as Member;
        tx.update(memberRef, { outstandingLoans: Math.max(0, member.outstandingLoans - principalPortion) });
      }

      return repayment;
    });
  },

  async listShareLedger(memberId) {
    const db = getFirebaseDb();
    const snap = await getDocs(query(collection(db, COL.shareLedger), where('memberId', '==', memberId)));
    return snap.docs.map((d) => d.data() as ShareLedgerEntry).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  },
  async listDividendRuns() {
    const db = getFirebaseDb();
    const snap = await getDocs(collection(db, COL.dividendRuns));
    return snap.docs.map((d) => d.data() as DividendRun);
  },
  async createDividendRun(input: CreateDividendRunInput) {
    const db = getFirebaseDb();
    const membersSnap = await getDocs(query(collection(db, COL.members), where('status', '==', 'ACTIVE')));
    const activeMembers = membersSnap.docs.map((d) => d.data() as Member).filter((m) => m.shareValue > 0);
    const num = await nextCounter('dividendRuns');
    const runRef = doc(db, COL.dividendRuns, `div-${num}`);
    const allocations: DividendAllocation[] = activeMembers.map((m, i) => ({
      id: `${runRef.id}-alloc-${i}`,
      runId: runRef.id,
      memberId: m.id,
      shareCount: m.shareCount,
      dividendAmount: Math.round(m.shareValue * (input.dividendRatePercent / 100)),
      interestRefundAmount: 0,
    }));
    const run: DividendRun = {
      id: runRef.id,
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
    await setDoc(runRef, run);
    await Promise.all(allocations.map((a) => setDoc(doc(db, COL.dividendAllocations, a.id), a)));
    return run;
  },
  async approveDividendRun(runId, approvedByUid) {
    const db = getFirebaseDb();
    const ref = doc(db, COL.dividendRuns, runId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('ไม่พบรายการปันผล');
    const run = snap.data() as DividendRun;
    if (run.status !== 'DRAFT') throw new Error('รายการนี้ถูกอนุมัติไปแล้ว');
    await updateDoc(ref, { status: 'APPROVED', approvedAt: new Date().toISOString(), approvedByUid });
    return { ...run, status: 'APPROVED', approvedAt: new Date().toISOString(), approvedByUid };
  },
  async processDividendRun(runId) {
    const db = getFirebaseDb();
    const ref = doc(db, COL.dividendRuns, runId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('ไม่พบรายการปันผล');
    const run = snap.data() as DividendRun;
    if (run.status !== 'APPROVED') throw new Error('ต้องอนุมัติก่อนจึงประมวลผลได้');
    const processedAt = new Date().toISOString();
    await updateDoc(ref, { status: 'PROCESSED', processedAt });

    const allocSnap = await getDocs(query(collection(db, COL.dividendAllocations), where('runId', '==', runId)));
    const allocations = allocSnap.docs.map((d) => d.data() as DividendAllocation);
    await Promise.all(
      allocations.map(async (alloc) => {
        const ledgerSnap = await getDocs(query(collection(db, COL.shareLedger), where('memberId', '==', alloc.memberId)));
        const entries = ledgerSnap.docs.map((d) => d.data() as ShareLedgerEntry).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
        const last = entries[entries.length - 1];
        const entryRef = doc(collection(db, COL.shareLedger));
        const entry: ShareLedgerEntry = {
          id: entryRef.id,
          memberId: alloc.memberId,
          type: 'ADJUSTMENT',
          shareCountDelta: 0,
          amount: alloc.dividendAmount,
          balanceSharesAfter: last?.balanceSharesAfter ?? 0,
          balanceValueAfter: (last?.balanceValueAfter ?? 0) + alloc.dividendAmount,
          timestamp: processedAt,
          note: `เงินปันผลปี ${run.fiscalYearBE}`,
        };
        await setDoc(entryRef, entry);
      }),
    );
    return { ...run, status: 'PROCESSED', processedAt };
  },
  async listDividendAllocations(runId) {
    const db = getFirebaseDb();
    const snap = await getDocs(query(collection(db, COL.dividendAllocations), where('runId', '==', runId)));
    return snap.docs.map((d) => d.data() as DividendAllocation);
  },

  async listBillingRuns() {
    const db = getFirebaseDb();
    const snap = await getDocs(collection(db, COL.billingRuns));
    return snap.docs.map((d) => d.data() as BillingRun);
  },
  async generateBillingRun(input: GenerateBillingRunInput) {
    const db = getFirebaseDb();
    const periodLabel = `${input.periodYearBE}-${String(input.periodMonth).padStart(2, '0')}`;
    const existing = await getDocs(query(collection(db, COL.billingRuns), where('periodLabel', '==', periodLabel)));
    if (!existing.empty) throw new Error('มีรอบเรียกเก็บของงวดนี้อยู่แล้ว');

    const membersSnap = await getDocs(query(collection(db, COL.members), where('status', '==', 'ACTIVE')));
    const activeMembers = membersSnap.docs.map((d) => d.data() as Member);
    const contractsSnap = await getDocs(query(collection(db, COL.contracts), where('status', '==', 'ACTIVE')));
    const activeContracts = contractsSnap.docs.map((d) => d.data() as LoanContract);

    const runRef = doc(collection(db, COL.billingRuns));
    const items: BillingItem[] = activeMembers.map((m, i) => {
      const loanInstallment = activeContracts.filter((c) => c.memberId === m.id).reduce((sum, c) => sum + c.monthlyInstallment, 0);
      const totalDue = m.monthlyShareContribution + loanInstallment;
      return {
        id: `${runRef.id}-item-${i}`,
        runId: runRef.id,
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
      id: runRef.id,
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
    await setDoc(runRef, run);
    await Promise.all(items.map((item) => setDoc(doc(db, COL.billingItems, item.id), item)));
    return run;
  },
  async listBillingItems(runId) {
    const db = getFirebaseDb();
    const snap = await getDocs(query(collection(db, COL.billingItems), where('runId', '==', runId)));
    return snap.docs.map((d) => d.data() as BillingItem);
  },
  async markBillingItemPaid(itemId) {
    const db = getFirebaseDb();
    const ref = doc(db, COL.billingItems, itemId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('ไม่พบรายการเรียกเก็บ');
    const item = snap.data() as BillingItem;
    const paidAt = new Date().toISOString();
    await updateDoc(ref, { status: 'PAID', paidAt });
    const runRef = doc(db, COL.billingRuns, item.runId);
    const runSnap = await getDoc(runRef);
    if (runSnap.exists()) {
      const run = runSnap.data() as BillingRun;
      await updateDoc(runRef, { totalCollected: run.totalCollected + item.totalDue });
    }
    return { ...item, status: 'PAID', paidAt };
  },
};

async function applyDepositWithdraw(
  input: DepositWithdrawInput,
  type: 'DEPOSIT' | 'WITHDRAW',
): Promise<DepositTransaction> {
  const db = getFirebaseDb();
  const accountRef = doc(db, COL.accounts, input.accountId);
  const txnRef = doc(db, COL.transactions, input.idempotencyKey);

  return runTransaction(db, async (tx) => {
    const existing = await tx.get(txnRef);
    if (existing.exists()) return existing.data() as DepositTransaction;

    if (input.amount <= 0) throw new Error('จำนวนเงินต้องมากกว่า 0');
    const accountSnap = await tx.get(accountRef);
    if (!accountSnap.exists()) throw new Error('ไม่พบบัญชี');
    const account = accountSnap.data() as DepositAccount;
    if (account.status !== 'ACTIVE') throw new Error('บัญชีนี้ถูกระงับหรือปิดแล้ว ไม่สามารถทำรายการได้');
    if (type === 'WITHDRAW' && input.amount > account.balance) throw new Error('ยอดเงินคงเหลือไม่เพียงพอ');

    const balanceAfter = type === 'DEPOSIT' ? account.balance + input.amount : account.balance - input.amount;
    const receiptNum = await nextCounter('receipts');
    const txn: DepositTransaction = {
      transactionId: txnRef.id,
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
    tx.set(txnRef, txn);
    tx.update(accountRef, { balance: balanceAfter });

    const memberRef = doc(db, COL.members, account.memberId);
    const memberSnap = await tx.get(memberRef);
    if (memberSnap.exists()) {
      const member = memberSnap.data() as Member;
      const delta = type === 'DEPOSIT' ? input.amount : -input.amount;
      tx.update(memberRef, { totalDeposits: Math.max(0, member.totalDeposits + delta) });
    }

    return txn;
  });
}

