interface StatusConfig {
  label: string;
  className: string;
}

const STATUS_MAP: Record<string, StatusConfig> = {
  ACTIVE: { label: 'ใช้งานอยู่', className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  SUSPENDED: { label: 'ระงับชั่วคราว', className: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
  FROZEN: { label: 'ระงับชั่วคราว', className: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
  RESIGNED: { label: 'ลาออก', className: 'bg-slate-100 text-slate-600 ring-slate-500/20' },
  CLOSED: { label: 'ปิดแล้ว', className: 'bg-slate-100 text-slate-600 ring-slate-500/20' },
  DEFAULTED: { label: 'ผิดนัดชำระ', className: 'bg-rose-50 text-rose-700 ring-rose-600/20' },
  PENDING: { label: 'รอพิจารณา', className: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20' },
  APPROVED: { label: 'อนุมัติแล้ว', className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  REJECTED: { label: 'ไม่อนุมัติ', className: 'bg-rose-50 text-rose-700 ring-rose-600/20' },
  CANCELLED: { label: 'ยกเลิก', className: 'bg-slate-100 text-slate-600 ring-slate-500/20' },
  DRAFT: { label: 'ฉบับร่าง', className: 'bg-slate-100 text-slate-600 ring-slate-500/20' },
  PROCESSED: { label: 'ประมวลผลแล้ว', className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  ISSUED: { label: 'ออกใบแจ้งหนี้แล้ว', className: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20' },
  DUE: { label: 'รอชำระ', className: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
  PAID: { label: 'ชำระแล้ว', className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  OVERDUE: { label: 'ค้างชำระ', className: 'bg-rose-50 text-rose-700 ring-rose-600/20' },
  WAIVED: { label: 'ยกเว้น', className: 'bg-slate-100 text-slate-600 ring-slate-500/20' },
};

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_MAP[status] ?? { label: status, className: 'bg-slate-100 text-slate-600 ring-slate-500/20' };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${config.className}`}
    >
      {config.label}
    </span>
  );
}
