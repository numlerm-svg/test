import { FlaskConical } from 'lucide-react';

export function DemoBadge({ label = 'ข้อมูลตัวอย่าง' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-600 ring-1 ring-inset ring-indigo-600/20">
      <FlaskConical size={11} />
      {label}
    </span>
  );
}
