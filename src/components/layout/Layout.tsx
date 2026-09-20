import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { NavTabs } from './NavTabs';
import { Footer } from './Footer';
import { CoopAiPanel } from '../coopai/CoopAiPanel';

export function Layout() {
  const [coopAiOpen, setCoopAiOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header onOpenCoopAi={() => setCoopAiOpen(true)} />
      <NavTabs />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        <Outlet context={{ openCoopAi: () => setCoopAiOpen(true) }} />
      </main>
      <Footer />
      {coopAiOpen && <CoopAiPanel onClose={() => setCoopAiOpen(false)} />}
    </div>
  );
}
