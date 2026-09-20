import { Modal } from '../common/Modal';
import { StatusBadge } from '../common/StatusBadge';
import { formatTHB, formatThaiDate, formatNumber } from '../../lib/format';
import { maskNationalId } from '../../lib/validate';
import type { Member } from '../../types';

export function MemberDetail({
  member,
  canSeeFullNationalId,
  canEdit,
  onClose,
  onEdit,
}: {
  member: Member;
  canSeeFullNationalId: boolean;
  canEdit: boolean;
  onClose: () => void;
  onEdit: () => void;
}) {
  return (
    <Modal
      title={`สมาชิก ${member.memberNo}`}
      onClose={onClose}
      widthClassName="max-w-2xl"
      footer={
        canEdit ? (
          <button type="button" onClick={onEdit} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            แก้ไขข้อมูล
          </button>
        ) : undefined
      }
    >
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold text-slate-900">{member.fullName}</p>
            <p className="text-sm text-slate-500">{member.position} · {member.affiliation}</p>
          </div>
          <StatusBadge status={member.status} />
        </div>

        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Item label="เลขประจำตัวประชาชน" value={canSeeFullNationalId ? member.nationalId : maskNationalId(member.nationalId)} />
          <Item label="อีเมล" value={member.email} />
          <Item label="เบอร์โทรศัพท์" value={member.phone} />
          <Item label="วันที่สมัคร" value={formatThaiDate(member.joinedAt)} />
          <Item label="เงินเดือน" value={formatTHB(member.salary)} />
          <Item label="ยอดส่งหุ้นรายเดือน" value={formatTHB(member.monthlyShareContribution)} />
        </dl>

        <div className="grid grid-cols-3 gap-3 rounded-xl bg-slate-50 p-3">
          <Summary label="จำนวนหุ้น" value={formatNumber(member.shareCount)} />
          <Summary label="มูลค่าหุ้นสะสม" value={formatTHB(member.shareValue)} />
          <Summary label="เงินฝากรวม" value={formatTHB(member.totalDeposits)} />
          <Summary label="เงินกู้คงค้าง" value={formatTHB(member.outstandingLoans)} />
        </div>

        <div>
          <h3 className="text-sm font-medium text-slate-700">ผู้รับผลประโยชน์</h3>
          {member.beneficiaries.length === 0 ? (
            <p className="mt-1 text-sm text-slate-400">ยังไม่ได้ระบุ</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {member.beneficiaries.map((b) => (
                <li key={b.id} className="flex justify-between rounded-lg border border-slate-100 px-3 py-1.5">
                  <span>{b.name} ({b.relationship})</span>
                  <span className="tabular-nums font-medium">{b.sharePercent}%</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{value}</dd>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 tabular-nums text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}
