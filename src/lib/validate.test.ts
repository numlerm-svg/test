import { describe, expect, it } from 'vitest';
import { beneficiarySharesSumTo100, isValidEmail, isValidNationalId, isValidThaiPhone, maskNationalId } from './validate';

describe('isValidEmail', () => {
  it('ยอมรับอีเมลรูปแบบถูกต้อง', () => {
    expect(isValidEmail('member@example.com')).toBe(true);
  });
  it('ปฏิเสธอีเมลรูปแบบไม่ถูกต้อง', () => {
    expect(isValidEmail('not-an-email')).toBe(false);
  });
});

describe('isValidThaiPhone', () => {
  it('ยอมรับเบอร์โทรศัพท์ไทย 10 หลักที่ขึ้นต้นด้วย 0', () => {
    expect(isValidThaiPhone('0812345678')).toBe(true);
  });
  it('ปฏิเสธเบอร์ที่สั้นเกินไป', () => {
    expect(isValidThaiPhone('012345')).toBe(false);
  });
});

describe('isValidNationalId', () => {
  it('ยอมรับเลขประจำตัวประชาชน 13 หลัก', () => {
    expect(isValidNationalId('1103700xxxxxx'.replace(/x/g, '1'))).toBe(true);
  });
  it('ปฏิเสธเมื่อจำนวนหลักไม่ครบ 13', () => {
    expect(isValidNationalId('12345')).toBe(false);
  });
});

describe('maskNationalId', () => {
  it('ปิดบังเลขประจำตัวประชาชนโดยเปิดเผยเฉพาะหลักแรกและหลักสุดท้าย', () => {
    const masked = maskNationalId('1234567890123');
    expect(masked).toBe('1-xxxx-xxxxx-xx-3');
    expect(masked).not.toContain('234567890');
  });
});

describe('beneficiarySharesSumTo100', () => {
  it('ผ่านเมื่อไม่มีผู้รับผลประโยชน์ระบุไว้', () => {
    expect(beneficiarySharesSumTo100([])).toBe(true);
  });
  it('ผ่านเมื่อสัดส่วนรวมเป็น 100%', () => {
    expect(beneficiarySharesSumTo100([{ sharePercent: 60 }, { sharePercent: 40 }])).toBe(true);
  });
  it('ไม่ผ่านเมื่อสัดส่วนรวมไม่ครบ 100%', () => {
    expect(beneficiarySharesSumTo100([{ sharePercent: 60 }, { sharePercent: 30 }])).toBe(false);
  });
});
