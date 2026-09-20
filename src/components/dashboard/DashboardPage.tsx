import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coins, Landmark, PiggyBank, Receipt, Sparkles, Users } from 'lucide-react';
import { coopService } from '../../services';
import { useCollection } from '../../hooks/useCollection';
import { useAuth } from '../../auth/AuthContext';
import { COOP_NAME, DIVIDEND_POLICY, SYSTEM_NAME, AI_ASSISTANT_NAME } from '../../config/policy';
import { formatNumber, formatPercent, formatTHB, formatThaiDate } from '../../lib/format';
import { KpiCard } from '../common/KpiCard';
import { LoadingState, ErrorState } from '../common/States';
import { StatusBadge } from '../common/StatusBadge';
import { FinancialHealthChart } from './FinancialHealthChart';
import { CoopAiPanel } from '../coopai/CoopAiPanel';

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [coopAiOpen, setCoopAiOpen] = useState(false);

  const members = useCollection(() => coopService.listMembers(), (cb) => coopService.subscribeMembers(cb));
  const accounts = useCollection(() => coopService.listDepositAccounts(), (cb) => coopService.subscribeDepositAccounts(cb));
  const contracts = useCollection(() => coopService.listLoanContracts(), (cb) => coopService.subscribeLoanContracts(cb));
  const applications = useCollection(() => coopService.listLoanApplications(), (cb) => coopService.subscribeLoanApplications(cb));
  const billingRuns = useCollection(() => coopService.listBillingRuns());

  const loading = members.loading || accounts.loading || contracts.loading || applications.loading;
  const anyError = members.error || accounts.error || contracts.error || applications.error;

  if (loading) return <LoadingState label="กำลังโหลดข้อมูลภาพรวม..." />;
  if (anyError) return <ErrorState message={anyError} onRetry={() => window.location.reload()} />;

  const activeMembers = members.data.filter((m) => m.status === 'ACTIVE');
  const totalShareValue = members.data.reduce((sum, m) => sum + m.shareValue, 0);
  const totalShareCount = members.data.reduce((sum, m) => sum + m.shareCount, 0);
  const totalMonthlyShare = members.data.reduce((sum, m) => sum + m.monthlyShareContribution, 0);

  const totalDeposits = accounts.data.reduce((sum, a) => sum + a.balance, 0);

  const activeContracts = contracts.data.filter((c) => c.status === 'ACTIVE');
  const totalOutstandingPrincipal = activeContracts.reduce((sum, c) => sum + c.principalOutstanding, 0);
  const totalInterestAccrued = activeContracts.reduce((sum, c) => sum + c.interestAccrued, 0);

  const pendingApplications = applications.data.filter((a) => a.status === 'PENDING');
  const latestBillingRun = [...billingRuns.data].sort((a, b) => b.periodLabel.localeCompare(a.periodLabel))[0];

  const canDecideLoans = user?.role === 'ADMIN' || user?.role === 'STAFF';
  const canApplyLoan = user?.role === 'MEMBER';

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{COOP_NAME}</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              {SYSTEM_NAME} — บริหารจัดการสมาชิก เงินฝาก เงินกู้ หุ้น เงินปันผล และการเรียกเก็บรายเดือนในที่เดียว
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCoopAiOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Sparkles size={16} />
              สรุปสถานะการเงินด้วย AI
            </button>
            {canApplyLoan && (
              <button
                type="button"
                onClick={() => navigate('/loans?apply=1')}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Landmark size={16} />
                ยื่นคำขอกู้เงิน
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={Coins}
          label="ทุนเรือนหุ้นรวม"
          value={members.data.length ? formatTHB(totalShareValue) : 'ยังไม่มีข้อมูล'}
          subItems={[
            { label: 'จำนวนหุ้น', value: formatNumber(totalShareCount) },
            { label: 'ยอดส่งหุ้นรายเดือนรวม', value: formatTHB(totalMonthlyShare) },
          ]}
        />
        <KpiCard
          icon={PiggyBank}
          label="เงินรับฝากรวม"
          value={accounts.data.length ? formatTHB(totalDeposits) : 'ยังไม่มีข้อมูล'}
          subItems={[
            { label: 'จำนวนบัญชี', value: formatNumber(accounts.data.length) },
            { label: 'ผลิตภัณฑ์เงินฝาก', value: 'ออมทรัพย์ / ออมทรัพย์พิเศษ / ฝากประจำ' },
          ]}
        />
        <KpiCard
          icon={Landmark}
          label="ลูกหนี้เงินกู้คงค้าง"
          value={activeContracts.length ? formatTHB(totalOutstandingPrincipal) : 'ยังไม่มีข้อมูล'}
          subItems={[
            { label: 'สัญญาที่เปิดดำเนินการ', value: formatNumber(activeContracts.length) },
            { label: 'ดอกเบี้ยรับสะสม', value: formatTHB(totalInterestAccrued) },
          ]}
        />
        <KpiCard
          icon={Users}
          label="สมาชิกและสถานะการเงิน"
          value={members.data.length ? `${formatNumber(activeMembers.length)} / ${formatNumber(members.data.length)}` : 'ยังไม่มีข้อมูล'}
          subItems={[
            { label: 'อัตราปันผลสมมติ', value: formatPercent(DIVIDEND_POLICY.defaultDividendRatePercent) },
            { label: 'NPL', value: 'ยังไม่มีข้อมูลอายุหนี้เพียงพอ' },
          ]}
        />
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { to: '/deposits', label: 'ฝาก/ถอนเงิน', icon: PiggyBank },
          { to: '/loans', label: 'สินเชื่อและเงินกู้', icon: Landmark },
          { to: '/shares', label: 'หุ้นและเงินปันผล', icon: Coins },
          { to: '/billing', label: 'เรียกเก็บรายเดือน', icon: Receipt },
        ].map(({ to, label, icon: Icon }) => (
          <button
            key={to}
            type="button"
            onClick={() => navigate(to)}
            className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm hover:border-emerald-300 hover:bg-emerald-50/40"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Icon size={18} />
            </span>
            <span className="text-sm font-medium text-slate-700">{label}</span>
          </button>
        ))}
      </section>

      <FinancialHealthChart />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">สัญญาเงินกู้ที่เปิดดำเนินการ</h2>
          {activeContracts.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">ยังไม่มีสัญญาเงินกู้ที่เปิดดำเนินการ</p>
          ) : (
            <div className="mt-3 max-h-72 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-slate-500">
                  <tr>
                    <th className="py-1.5 text-left font-medium">เลขที่สัญญา</th>
                    <th className="py-1.5 text-right font-medium">เงินต้นคงเหลือ</th>
                    <th className="py-1.5 text-right font-medium">ค่างวด/เดือน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeContracts.slice(0, 8).map((c) => (
                    <tr key={c.id}>
                      <td className="py-2 text-slate-700">{c.contractNo}</td>
                      <td className="py-2 text-right tabular-nums">{formatTHB(c.principalOutstanding)}</td>
                      <td className="py-2 text-right tabular-nums">{formatTHB(c.monthlyInstallment)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">คำขอกู้รอพิจารณา</h2>
          {!canDecideLoans ? (
            <p className="mt-4 text-sm text-slate-400">มีสิทธิ์เฉพาะผู้ดูแลระบบและเจ้าหน้าที่</p>
          ) : pendingApplications.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">ไม่มีคำขอกู้รอพิจารณา</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {pendingApplications.slice(0, 6).map((app) => (
                <li key={app.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{app.applicationNo}</p>
                    <p className="text-xs text-slate-400">ยื่นเมื่อ {formatThaiDate(app.submittedAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums text-sm text-slate-600">{formatTHB(app.requestedAmount)}</span>
                    <StatusBadge status={app.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          {pendingApplications.length > 0 && (
            <button
              type="button"
              onClick={() => navigate('/loans')}
              className="mt-3 text-sm font-medium text-emerald-700 hover:underline"
            >
              ไปที่หน้าพิจารณาคำขอกู้ →
            </button>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">สรุปใบเรียกเก็บงวดล่าสุด</h2>
        {!latestBillingRun ? (
          <p className="mt-4 text-sm text-slate-400">ยังไม่มีการออกใบเรียกเก็บ</p>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-slate-500">งวด</p>
              <p className="mt-1 font-medium text-slate-800">{latestBillingRun.periodLabel}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">จำนวนรายการ</p>
              <p className="mt-1 tabular-nums font-medium text-slate-800">{formatNumber(latestBillingRun.totalItems)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">ยอดเรียกเก็บรวม</p>
              <p className="mt-1 tabular-nums font-medium text-slate-800">{formatTHB(latestBillingRun.totalAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">ยอดชำระแล้ว</p>
              <p className="mt-1 tabular-nums font-medium text-emerald-700">{formatTHB(latestBillingRun.totalCollected)}</p>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-indigo-600" />
          <h2 className="text-base font-semibold text-slate-900">{AI_ASSISTANT_NAME}</h2>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          ถาม {AI_ASSISTANT_NAME} เกี่ยวกับสถานะการเงินของสหกรณ์ วิธีคำนวณค่างวด หรือขั้นตอนการยื่นคำขอกู้ได้ทันที
        </p>
        <button
          type="button"
          onClick={() => setCoopAiOpen(true)}
          className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          เปิดแชท {AI_ASSISTANT_NAME}
        </button>
      </section>

      {coopAiOpen && <CoopAiPanel onClose={() => setCoopAiOpen(false)} />}
    </div>
  );
}
