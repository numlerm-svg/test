import { describe, expect, it } from 'vitest';
import { generateIdempotencyKey, InMemorySequence } from './id';

describe('InMemorySequence', () => {
  it('ให้เลขลำดับที่ไม่ซ้ำกันเสมอแม้เรียกจำนวนมาก (ไม่ใช้ array.length + 1)', () => {
    const seq = new InMemorySequence(0);
    const values = Array.from({ length: 1000 }, () => seq.next());
    const unique = new Set(values);
    expect(unique.size).toBe(1000);
    expect(Math.max(...values)).toBe(1000);
  });

  it('เริ่มต่อจากค่าเริ่มต้นที่กำหนดได้ (สำหรับ resume จาก seed)', () => {
    const seq = new InMemorySequence(50);
    expect(seq.next()).toBe(51);
  });
});

describe('generateIdempotencyKey', () => {
  it('สร้างคีย์ที่ไม่ซ้ำกันในการเรียกหลายครั้ง', () => {
    const keys = new Set(Array.from({ length: 200 }, () => generateIdempotencyKey()));
    expect(keys.size).toBe(200);
  });
});
