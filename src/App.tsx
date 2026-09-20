import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { DashboardPage } from './components/dashboard/DashboardPage';
import { MembersPage } from './components/members/MembersPage';
import { DepositsPage } from './components/deposits/DepositsPage';
import { LoansPage } from './components/loans/LoansPage';
import { SharesPage } from './components/shares/SharesPage';
import { BillingPage } from './components/billing/BillingPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="members" element={<MembersPage />} />
        <Route path="deposits" element={<DepositsPage />} />
        <Route path="loans" element={<LoansPage />} />
        <Route path="shares" element={<SharesPage />} />
        <Route path="billing" element={<BillingPage />} />
      </Route>
    </Routes>
  );
}
