import { useState } from 'react';
import { Modal } from '../common/Modal';
import { BeneficiaryEditor } from './BeneficiaryEditor';
import { isValidEmail, isValidNationalId, isValidThaiPhone, isNonNegative, beneficiarySharesSumTo100 } from '../../lib/validate';
import type { CreateMemberInput } from '../../services/types';
import type { Member } from '../../types';

interface MemberFormProps {
  initial?: Member | null;
  onClose: () => void;
  onSubmit: (input: CreateMemberInput) => Promise<void>;
}

export function MemberForm({ initial, onClose, onSubmit }: MemberFormProps) {
  const [form, setForm] = useState<CreateMemberInput>({
    fullName: initial?.fullName ?? '',
    nationalId: initial?.nationalId ?? '',
    email: initial?.email ?? '',
    phone: initial?.phone ?? '',
    affiliation: initial?.affiliation ?? '',
    position: initial?.position ?? '',
    salary: initial?.salary ?? 0,
    monthlyShareContribution: initial?.monthlyShareContribution ?? 0,
    beneficiaries: initial?.beneficiaries.map(({ name, relationship, sharePercent }) => ({ name, relationship, sharePercent })) ?? [],
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function validate(): string[] {
    const errs: string[] = [];
    if (!form.fullName.trim()) errs.push('กรุณากรอกชื่อ-นามสกุล');
    if (!isValidNationalId(form.nationalId)) errs.push('เลขประจำตัวประชาชนต้องมี 13 หลัก');
    if (!isValidEmail(form.email)) errs.push('รูปแบบอีเมลไม่ถูกต้อง');
    if (!isValidThaiPhone(form.phone)) errs.push('รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง');
    if (!form.affiliation.trim()) errs.push('กรุณากรอกสังกัด');
    if (!isNonNegative(form.salary)) errs.push('เงินเดือนต้องไม่ติดลบ');
    if (!isNonNegative(form.monthlyShareContribution)) errs.push('ยอดส่งหุ้นรายเดือนต้องไม่ติดลบ');
    if (!beneficiarySharesSumTo100(form.beneficiaries)) errs.push('สัดส่วนผู้รับผลประโยชน์ต้องรวมเป็น 100%');
    return errs;
  }

  async function handleSubmit() {
    const errs = validate();
    setErrors(errs);
    if (errs.length > 0) return;
    setSubmitting(true);
    try {
      await onSubmit(form);
      onClose();
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ']);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={initial ? 'แก้ไขข้อมูลสมาชิก' : 'รับสมัครสมาชิกใหม่'}
      onClose={onClose}
      widthClassName="max-w-2xl"
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {submitting ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {errors.length > 0 && (
          <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
            <ul className="list-inside list-disc space-y-0.5">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="ชื่อ-นามสกุล" required>
            <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className={inputClass} />
          </Field>
          <Field label="เลขประจำตัวประชาชน" required>
            <input value={form.nationalId} onChange={(e) => setForm({ ...form, nationalId: e.target.value })} className={inputClass} maxLength={13} />
          </Field>
          <Field label="อีเมล" required>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
          </Field>
          <Field label="เบอร์โทรศัพท์" required>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
          </Field>
          <Field label="สังกัด" required>
            <input value={form.affiliation} onChange={(e) => setForm({ ...form, affiliation: e.target.value })} className={inputClass} />
          </Field>
          <Field label="ตำแหน่ง">
            <input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} className={inputClass} />
          </Field>
          <Field label="เงินเดือน (บาท)" required>
            <input
              type="number"
              min={0}
              value={form.salary}
              onChange={(e) => setForm({ ...form, salary: Number(e.target.value) })}
              className={`${inputClass} text-right tabular-nums`}
            />
          </Field>
          <Field label="ยอดส่งหุ้นรายเดือน (บาท)" required>
            <input
              type="number"
              min={0}
              value={form.monthlyShareContribution}
              onChange={(e) => setForm({ ...form, monthlyShareContribution: Number(e.target.value) })}
              className={`${inputClass} text-right tabular-nums`}
            />
          </Field>
        </div>
        <BeneficiaryEditor beneficiaries={form.beneficiaries} onChange={(list) => setForm({ ...form, beneficiaries: list })} />
      </div>
    </Modal>
  );
}

const inputClass = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500';

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}
