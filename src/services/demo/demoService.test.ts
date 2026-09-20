import { describe, expect, it } from 'vitest';
import { demoService } from './demoService';
import { generateIdempotencyKey } from '../../lib/id';

describe('demoService — เงินฝาก', () => {
  it('การส่งคำขอฝากซ้ำด้วย idempotencyKey เดิมต้องไม่เพิ่มยอดซ้ำ', async () => {
    const accounts = await demoService.listDepositAccounts();
    const account = accounts.find((a) => a.status === 'ACTIVE');
    if (!account) throw new Error('ไม่มีบัญชีทดสอบ');

    const idempotencyKey = generateIdempotencyKey();
    const before = (await demoService.listDepositAccounts()).find((a) => a.id === account.id)!;

    const first = await demoService.deposit({ accountId: account.id, amount: 1000, description: 'ทดสอบ', actorUid: 'test', idempotencyKey });
    const second = await demoService.deposit({ accountId: account.id, amount: 1000, description: 'ทดสอบ', actorUid: 'test', idempotencyKey });

    expect(second.transactionId).toBe(first.transactionId);

    const after = (await demoService.listDepositAccounts()).find((a) => a.id === account.id)!;
    expect(after.balance).toBe(before.balance + 1000);
  });

  it('ถอนเงินเกินยอดคงเหลือต้องถูกปฏิเสธ', async () => {
    const accounts = await demoService.listDepositAccounts();
    const account = accounts.find((a) => a.status === 'ACTIVE')!;
    await expect(
      demoService.withdraw({
        accountId: account.id,
        amount: account.balance + 1_000_000,
        description: 'ทดสอบถอนเกินยอด',
        actorUid: 'test',
        idempotencyKey: generateIdempotencyKey(),
      }),
    ).rejects.toThrow();
  });

  it('บัญชีที่ถูกระงับ (FROZEN) ทำรายการฝาก/ถอนไม่ได้', async () => {
    const accounts = await demoService.listDepositAccounts();
    const active = accounts.find((a) => a.status === 'ACTIVE')!;
    await demoService.setAccountStatus(active.id, 'FROZEN');

    await expect(
      demoService.deposit({ accountId: active.id, amount: 100, description: 'ทดสอบ', actorUid: 'test', idempotencyKey: generateIdempotencyKey() }),
    ).rejects.toThrow();

    await demoService.setAccountStatus(active.id, 'ACTIVE');
  });

  it('จำนวนเงินต้องมากกว่า 0', async () => {
    const accounts = await demoService.listDepositAccounts();
    const account = accounts.find((a) => a.status === 'ACTIVE')!;
    await expect(
      demoService.deposit({ accountId: account.id, amount: 0, description: 'ทดสอบ', actorUid: 'test', idempotencyKey: generateIdempotencyKey() }),
    ).rejects.toThrow();
  });
});

describe('demoService — สมาชิก', () => {
  it('เลขสมาชิกที่สร้างใหม่ต้องไม่ซ้ำกันแม้สร้างพร้อมกันหลายคน', async () => {
    const inputs = Array.from({ length: 20 }, (_, i) => ({
      fullName: `ทดสอบ สมาชิกใหม่ ${i}`,
      nationalId: `100000000000${i % 10}`,
      email: `newmember${i}@example.local`,
      phone: '0812345678',
      affiliation: 'ฝ่ายทดสอบ',
      position: 'เจ้าหน้าที่ทดสอบ',
      salary: 20000,
      monthlyShareContribution: 500,
      beneficiaries: [],
    }));

    const created = await Promise.all(inputs.map((input) => demoService.createMember(input)));
    const memberNos = new Set(created.map((m) => m.memberNo));
    expect(memberNos.size).toBe(created.length);
  });
});
