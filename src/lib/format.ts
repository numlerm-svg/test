// ยูทิลิตี้จัดรูปแบบตัวเลขเงิน (THB) และวันที่แบบไทย (ปี พ.ศ.)
// เก็บข้อมูลวันที่ภายในเป็น ISO timestamp เสมอ แปลงเป็น พ.ศ. เฉพาะตอนแสดงผลที่นี่เท่านั้น

const thbFormatter = new Intl.NumberFormat('th-TH', {
  style: 'currency',
  currency: 'THB',
  currencyDisplay: 'symbol',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat('th-TH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatTHB(amount: number): string {
  if (!Number.isFinite(amount)) return '—';
  return thbFormatter.format(amount);
}

export function formatNumber(amount: number): string {
  if (!Number.isFinite(amount)) return '—';
  return numberFormatter.format(amount);
}

export function formatPercent(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return '—';
  return `${value.toFixed(digits)}%`;
}

const thaiDateFormatter = new Intl.DateTimeFormat('th-TH-u-ca-buddhist', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

const thaiDateTimeFormatter = new Intl.DateTimeFormat('th-TH-u-ca-buddhist', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const thaiMonthYearFormatter = new Intl.DateTimeFormat('th-TH-u-ca-buddhist', {
  year: 'numeric',
  month: 'long',
});

const thaiMonthShortFormatter = new Intl.DateTimeFormat('th-TH-u-ca-buddhist', {
  year: '2-digit',
  month: 'short',
});

export function formatThaiDate(isoTimestamp: string | null | undefined): string {
  if (!isoTimestamp) return '—';
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return '—';
  return thaiDateFormatter.format(date);
}

export function formatThaiDateTime(isoTimestamp: string | null | undefined): string {
  if (!isoTimestamp) return '—';
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return '—';
  return thaiDateTimeFormatter.format(date);
}

export function formatThaiMonthYear(isoTimestampOrYearMonth: string | null | undefined): string {
  if (!isoTimestampOrYearMonth) return '—';
  const date = /^\d{4}-\d{2}$/.test(isoTimestampOrYearMonth)
    ? new Date(`${isoTimestampOrYearMonth}-01T00:00:00`)
    : new Date(isoTimestampOrYearMonth);
  if (Number.isNaN(date.getTime())) return '—';
  return thaiMonthYearFormatter.format(date);
}

export function formatThaiMonthShort(isoTimestampOrYearMonth: string | null | undefined): string {
  if (!isoTimestampOrYearMonth) return '—';
  const date = /^\d{4}-\d{2}$/.test(isoTimestampOrYearMonth)
    ? new Date(`${isoTimestampOrYearMonth}-01T00:00:00`)
    : new Date(isoTimestampOrYearMonth);
  if (Number.isNaN(date.getTime())) return '—';
  return thaiMonthShortFormatter.format(date);
}

export function toBuddhistYear(gregorianYear: number): number {
  return gregorianYear + 543;
}
