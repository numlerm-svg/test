// ฟังก์ชันตรวจสอบความถูกต้องของข้อมูล ใช้ร่วมกันทั้งฟอร์มสมาชิก บัญชี และธุรกรรม

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidThaiPhone(phone: string): boolean {
  const digits = phone.replace(/[\s-]/g, '');
  return /^0\d{8,9}$/.test(digits);
}

export function isValidNationalId(id: string): boolean {
  const digits = id.replace(/[\s-]/g, '');
  return /^\d{13}$/.test(digits);
}

export function maskNationalId(id: string): string {
  const digits = id.replace(/[\s-]/g, '');
  if (digits.length !== 13) return '•••••••••••••';
  return `${digits.slice(0, 1)}-xxxx-xxxxx-xx-${digits.slice(12)}`;
}

export function isNonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

export function isPositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

export interface BeneficiaryLike {
  sharePercent: number;
}

export function beneficiarySharesSumTo100(list: BeneficiaryLike[]): boolean {
  if (list.length === 0) return true; // ยังไม่ระบุผู้รับผลประโยชน์ถือว่าผ่านได้ (ไม่บังคับ)
  const sum = list.reduce((acc, b) => acc + (Number.isFinite(b.sharePercent) ? b.sharePercent : 0), 0);
  return Math.abs(sum - 100) < 0.01;
}

export interface FieldError {
  field: string;
  message: string;
}
