import { describe, expect, it } from 'vitest';
import { calcDepositLoanGap, calcGrowth, calcLDR, calcMonthlyInstallment, calcOverdueRatio } from './finance';

describe('calcLDR', () => {
  it('คำนวณ LDR ปกติได้ถูกต้อง', () => {
    const result = calcLDR(500000, 1000000);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBeCloseTo(50);
  });

  it('คืนสถานะคำนวณไม่ได้เมื่อเงินฝากเป็นศูนย์ ไม่คืน Infinity หรือ NaN', () => {
    const result = calcLDR(500000, 0);
    expect(result.ok).toBe(false);
    expect(result).not.toHaveProperty('value');
  });
});

describe('calcGrowth', () => {
  it('คำนวณอัตราการเติบโตปกติได้ถูกต้อง', () => {
    const result = calcGrowth(150, 100);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBeCloseTo(50);
  });

  it('คืนสถานะคำนวณไม่ได้เมื่อยอดฐานเป็นศูนย์ ไม่คืน Infinity หรือ NaN', () => {
    const result = calcGrowth(150, 0);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('ศูนย์');
  });
});

describe('calcOverdueRatio', () => {
  it('คืนสถานะคำนวณไม่ได้เมื่อไม่มีเงินต้นคงเหลือ', () => {
    const result = calcOverdueRatio(0, 0);
    expect(result.ok).toBe(false);
  });

  it('คำนวณอัตราส่วนค้างชำระได้ถูกต้อง', () => {
    const result = calcOverdueRatio(50000, 200000);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBeCloseTo(25);
  });
});

describe('calcDepositLoanGap', () => {
  it('คำนวณส่วนต่างเงินฝากกับเงินกู้ได้ถูกต้อง', () => {
    const result = calcDepositLoanGap(1000000, 400000);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(600000);
  });
});

describe('calcMonthlyInstallment', () => {
  it('คำนวณค่างวดแบบลดต้นลดดอกได้ถูกต้องเมื่อมีดอกเบี้ย', () => {
    const result = calcMonthlyInstallment(120000, 6, 12);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBeGreaterThan(120000 / 12);
  });

  it('คำนวณได้ถูกต้องเมื่ออัตราดอกเบี้ยเป็นศูนย์ (หารเท่า ๆ กันทุกงวด)', () => {
    const result = calcMonthlyInstallment(120000, 0, 12);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBeCloseTo(10000);
  });

  it('ปฏิเสธเมื่อจำนวนเงินกู้ไม่ถูกต้อง', () => {
    const result = calcMonthlyInstallment(0, 5, 12);
    expect(result.ok).toBe(false);
  });
});
