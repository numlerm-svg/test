import { describe, expect, it } from 'vitest';
import { formatTHB, formatThaiDate, toBuddhistYear } from './format';

describe('formatTHB', () => {
  it('จัดรูปแบบเงินบาทด้วยทศนิยม 2 ตำแหน่งเสมอ', () => {
    expect(formatTHB(1234.5)).toContain('1,234.50');
  });

  it('คืนขีดกลางเมื่อค่าไม่ใช่ตัวเลขที่ใช้ได้', () => {
    expect(formatTHB(Number.NaN)).toBe('—');
    expect(formatTHB(Number.POSITIVE_INFINITY)).toBe('—');
  });
});

describe('toBuddhistYear', () => {
  it('แปลงปี ค.ศ. เป็น พ.ศ. โดยบวก 543', () => {
    expect(toBuddhistYear(2024)).toBe(2567);
  });
});

describe('formatThaiDate', () => {
  it('แสดงปีเป็น พ.ศ. เมื่อจัดรูปแบบวันที่', () => {
    const formatted = formatThaiDate('2024-01-15T00:00:00.000Z');
    expect(formatted).toContain('2567');
  });

  it('คืนขีดกลางเมื่อไม่มีวันที่', () => {
    expect(formatThaiDate(null)).toBe('—');
    expect(formatThaiDate(undefined)).toBe('—');
  });
});
