import type {
  Beneficiary,
  BillingItem,
  BillingRun,
  DepositAccount,
  DepositAccountType,
  DepositTransaction,
  DividendAllocation,
  DividendRun,
  LoanApplication,
  LoanContract,
  LoanRepayment,
  LoanType,
  Member,
  MemberStatus,
  ShareLedgerEntry,
} from '../types';

export interface CreateMemberInput {
  fullName: string;
  nationalId: string;
  email: string;
  phone: string;
  affiliation: string;
  position: string;
  salary: number;
  monthlyShareContribution: number;
  beneficiaries: Omit<Beneficiary, 'id'>[];
}

export type UpdateMemberInput = Partial<CreateMemberInput> & { status?: MemberStatus };

export interface OpenAccountInput {
  memberId: string;
  accountType: DepositAccountType;
  accountName: string;
  openingBalance: number;
  actorUid: string;
}

export interface DepositWithdrawInput {
  accountId: string;
  amount: number;
  description: string;
  actorUid: string;
  idempotencyKey: string;
}

export interface SubmitLoanApplicationInput {
  memberId: string;
  loanType: LoanType;
  requestedAmount: number;
  termMonths: number;
  purpose: string;
}

export interface DecideLoanApplicationInput {
  applicationId: string;
  approve: boolean;
  decidedByUid: string;
  note: string;
}

export interface RepayLoanInput {
  contractId: string;
  amount: number;
  actorUid: string;
  idempotencyKey: string;
}

export interface CreateDividendRunInput {
  fiscalYearBE: number;
  dividendRatePercent: number;
  interestRefundRatePercent: number;
}

export interface GenerateBillingRunInput {
  periodYearBE: number;
  periodMonth: number;
}

export type Unsubscribe = () => void;

/**
 * Service interface ร่วมระหว่างโหมดทดลอง (in-memory) และโหมด Firebase (Firestore)
 * Component เรียกผ่าน interface นี้เท่านั้น ไม่เรียก Firestore หรือ state ภายในโดยตรง
 */
export interface CoopDataService {
  readonly mode: 'demo' | 'firebase';

  // สมาชิก
  listMembers(): Promise<Member[]>;
  subscribeMembers(onChange: (members: Member[]) => void): Unsubscribe;
  getMember(id: string): Promise<Member | null>;
  createMember(input: CreateMemberInput): Promise<Member>;
  updateMember(id: string, input: UpdateMemberInput): Promise<Member>;

  // เงินฝาก
  listDepositAccounts(): Promise<DepositAccount[]>;
  subscribeDepositAccounts(onChange: (accounts: DepositAccount[]) => void): Unsubscribe;
  openDepositAccount(input: OpenAccountInput): Promise<DepositAccount>;
  listAccountTransactions(accountId: string): Promise<DepositTransaction[]>;
  deposit(input: DepositWithdrawInput): Promise<DepositTransaction>;
  withdraw(input: DepositWithdrawInput): Promise<DepositTransaction>;
  setAccountStatus(accountId: string, status: DepositAccount['status']): Promise<DepositAccount>;

  // สินเชื่อ
  listLoanApplications(): Promise<LoanApplication[]>;
  subscribeLoanApplications(onChange: (apps: LoanApplication[]) => void): Unsubscribe;
  submitLoanApplication(input: SubmitLoanApplicationInput): Promise<LoanApplication>;
  decideLoanApplication(input: DecideLoanApplicationInput): Promise<{
    application: LoanApplication;
    contract: LoanContract | null;
  }>;
  listLoanContracts(): Promise<LoanContract[]>;
  subscribeLoanContracts(onChange: (contracts: LoanContract[]) => void): Unsubscribe;
  listContractRepayments(contractId: string): Promise<LoanRepayment[]>;
  repayLoan(input: RepayLoanInput): Promise<LoanRepayment>;

  // หุ้นและเงินปันผล
  listShareLedger(memberId: string): Promise<ShareLedgerEntry[]>;
  listDividendRuns(): Promise<DividendRun[]>;
  createDividendRun(input: CreateDividendRunInput): Promise<DividendRun>;
  approveDividendRun(runId: string, approvedByUid: string): Promise<DividendRun>;
  processDividendRun(runId: string): Promise<DividendRun>;
  listDividendAllocations(runId: string): Promise<DividendAllocation[]>;

  // เรียกเก็บรายเดือน
  listBillingRuns(): Promise<BillingRun[]>;
  generateBillingRun(input: GenerateBillingRunInput): Promise<BillingRun>;
  listBillingItems(runId: string): Promise<BillingItem[]>;
  markBillingItemPaid(itemId: string, actorUid: string): Promise<BillingItem>;
}
