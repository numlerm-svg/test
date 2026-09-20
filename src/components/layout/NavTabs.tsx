import { NavLink } from 'react-router-dom';
import { BarChart3, Coins, Landmark, PiggyBank, Receipt, Users } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', label: 'ภาพรวมสหกรณ์', icon: BarChart3, end: true },
  { to: '/members', label: 'ทะเบียนสมาชิก', icon: Users },
  { to: '/deposits', label: 'เงินฝากสหกรณ์', icon: PiggyBank },
  { to: '/loans', label: 'สินเชื่อและเงินกู้', icon: Landmark },
  { to: '/shares', label: 'หุ้นและเงินปันผล', icon: Coins },
  { to: '/billing', label: 'เรียกเก็บรายเดือน', icon: Receipt },
];

export function NavTabs() {
  return (
    <nav className="border-b border-slate-200 bg-white" aria-label="เมนูหลัก">
      <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6" style={{ scrollbarWidth: 'thin' }}>
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:border-slate-200 hover:text-slate-700'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
