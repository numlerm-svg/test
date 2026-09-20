import { Plus, Trash2 } from 'lucide-react';
import type { Beneficiary } from '../../types';

type DraftBeneficiary = Omit<Beneficiary, 'id'>;

export function BeneficiaryEditor({
  beneficiaries,
  onChange,
}: {
  beneficiaries: DraftBeneficiary[];
  onChange: (list: DraftBeneficiary[]) => void;
}) {
  const total = beneficiaries.reduce((sum, b) => sum + (Number.isFinite(b.sharePercent) ? b.sharePercent : 0), 0);

  function update(index: number, patch: Partial<DraftBeneficiary>) {
    onChange(beneficiaries.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700">ผู้รับผลประโยชน์</label>
        <button
          type="button"
          onClick={() => onChange([...beneficiaries, { name: '', relationship: '', sharePercent: 0 }])}
          className="flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline"
        >
          <Plus size={14} /> เพิ่มรายชื่อ
        </button>
      </div>
      <div className="mt-2 space-y-2">
        {beneficiaries.map((b, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 p-2.5">
            <input
              value={b.name}
              onChange={(e) => update(i, { name: e.target.value })}
              placeholder="ชื่อ-นามสกุล"
              className="min-w-[10rem] flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm"
            />
            <input
              value={b.relationship}
              onChange={(e) => update(i, { relationship: e.target.value })}
              placeholder="ความสัมพันธ์"
              className="w-28 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm"
            />
            <input
              type="number"
              value={b.sharePercent}
              onChange={(e) => update(i, { sharePercent: Number(e.target.value) })}
              placeholder="สัดส่วน %"
              className="w-24 rounded-lg border border-slate-200 px-2.5 py-1.5 text-right text-sm tabular-nums"
            />
            <button
              type="button"
              onClick={() => onChange(beneficiaries.filter((_, idx) => idx !== i))}
              aria-label="ลบรายชื่อ"
              className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
      {beneficiaries.length > 0 && (
        <p className={`mt-1.5 text-xs ${Math.abs(total - 100) < 0.01 ? 'text-slate-400' : 'text-rose-500'}`}>
          รวมสัดส่วน {total}% {Math.abs(total - 100) >= 0.01 && '(ต้องรวมเป็น 100%)'}
        </p>
      )}
    </div>
  );
}
