import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  subItems?: { label: string; value: string }[];
  accent?: 'emerald' | 'indigo' | 'slate';
  footer?: ReactNode;
}

const ACCENT_CLASSES: Record<NonNullable<KpiCardProps['accent']>, string> = {
  emerald: 'bg-emerald-50 text-emerald-600',
  indigo: 'bg-indigo-50 text-indigo-600',
  slate: 'bg-slate-100 text-slate-600',
};

export function KpiCard({ icon: Icon, label, value, subItems, accent = 'emerald', footer }: KpiCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${ACCENT_CLASSES[accent]}`}>
          <Icon size={18} />
        </span>
      </div>
      <p className="mt-3 tabular-nums text-2xl font-semibold text-slate-900">{value}</p>
      {subItems && subItems.length > 0 && (
        <dl className="mt-4 space-y-1.5 border-t border-slate-100 pt-3">
          {subItems.map((item) => (
            <div key={item.label} className="flex items-center justify-between text-xs text-slate-500">
              <dt>{item.label}</dt>
              <dd className="tabular-nums font-medium text-slate-700">{item.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {footer}
    </div>
  );
}
