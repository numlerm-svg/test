// ตัวกลางเรียกใช้งาน COOP-ai — โหมดทดลองตอบด้วยกฎเกณฑ์จากข้อมูลในหน่วยความจำ
// โหมด Firebase เรียก Cloud Function ที่เรียก Gemini API ผ่าน server-side SDK (ไม่เปิดเผยคีย์ที่ฝั่งเว็บ)
import { IS_FIREBASE_MODE, getApiBaseUrl } from '../config/env';
import { coopService } from '../services';
import { COOP_NAME, DIVIDEND_POLICY, LOAN_POLICIES, DEPOSIT_PRODUCTS } from '../config/policy';
import { formatTHB, formatPercent } from './format';
import { calcLDR } from './finance';
import type { AppUser } from '../types';

async function demoAnswer(message: string, user: AppUser | null): Promise<string> {
  const q = message.toLowerCase();
  const [members, accounts, contracts, applications] = await Promise.all([
    coopService.listMembers(),
    coopService.listDepositAccounts(),
    coopService.listLoanContracts(),
    coopService.listLoanApplications(),
  ]);

  const totalDeposits = accounts.reduce((s, a) => s + a.balance, 0);
  const totalOutstanding = contracts.filter((c) => c.status === 'ACTIVE').reduce((s, c) => s + c.principalOutstanding, 0);
  const pending = applications.filter((a) => a.status === 'PENDING').length;
  const ldr = calcLDR(totalOutstanding, totalDeposits);

  if (/สรุป|ภาพรวม|สถานะการเงิน/.test(q)) {
    return [
      `สรุปสถานะการเงินของ${COOP_NAME} (ข้อมูลโหมดทดลอง):`,
      `• สมาชิกทั้งหมด ${members.length} คน`,
      `• เงินฝากรวม ${formatTHB(totalDeposits)}`,
      `• เงินต้นสินเชื่อคงเหลือ ${formatTHB(totalOutstanding)}`,
      `• Loan-to-Deposit Ratio: ${ldr.ok ? `${ldr.value.toFixed(2)}%` : 'คำนวณไม่ได้'}`,
      `• คำขอกู้ที่รอพิจารณา ${pending} รายการ`,
    ].join('\n');
  }

  if (/ดอกเบี้ย.*ฝาก|อัตรา.*ฝาก/.test(q)) {
    return Object.values(DEPOSIT_PRODUCTS)
      .map((p) => `${p.label}: ${p.interestRatePercent}% ต่อปี (${p.description})`)
      .join('\n');
  }

  if (/กู้|สินเชื่อ|ผ่อน/.test(q)) {
    return [
      'ประเภทเงินกู้และอัตราดอกเบี้ยตัวอย่าง:',
      ...Object.values(LOAN_POLICIES).map((p) => `• ${p.label}: ${p.interestRatePercent}% ต่อปี ผ่อนได้สูงสุด ${p.maxTermMonths} งวด`),
      'ลองใช้ "เครื่องคำนวณเงินกู้" ในหน้าสินเชื่อและเงินกู้เพื่อดูค่างวดโดยประมาณได้เลยครับ/ค่ะ',
    ].join('\n');
  }

  if (/ปันผล/.test(q)) {
    return `อัตราปันผลตัวอย่างที่ตั้งไว้คือ ${formatPercent(DIVIDEND_POLICY.defaultDividendRatePercent)} ต่อหุ้น ผู้ดูแลระบบสามารถปรับอัตราและอนุมัติรอบปันผลได้ที่หน้า "หุ้นและเงินปันผล"`;
  }

  if (/สมัคร|เปิดบัญชี/.test(q)) {
    return 'เจ้าหน้าที่หรือผู้ดูแลระบบสามารถรับสมัครสมาชิกใหม่และเปิดบัญชีเงินฝากได้จากหน้า "ทะเบียนสมาชิก" และ "เงินฝากสหกรณ์" ตามลำดับครับ/ค่ะ';
  }

  return `${AI_FALLBACK_PREFIX(user)}ลองถามเกี่ยวกับสถานะการเงินโดยรวม อัตราดอกเบี้ยเงินฝาก เงื่อนไขเงินกู้ หรือเงินปันผลได้เลยครับ/ค่ะ (นี่คือคำตอบจากกฎเกณฑ์พื้นฐานในโหมดทดลอง ยังไม่ได้เชื่อมต่อ Gemini API จริง)`;
}

function AI_FALLBACK_PREFIX(user: AppUser | null): string {
  return user ? `สวัสดีคุณ ${user.displayName} ` : '';
}

export interface SendChatOptions {
  message: string;
  user: AppUser | null;
}

export async function sendCoopAiMessage({ message, user }: SendChatOptions): Promise<string> {
  if (!IS_FIREBASE_MODE) {
    return demoAnswer(message, user);
  }

  const { getFirebaseAuth } = await import('./firebase');
  const auth = getFirebaseAuth();
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) {
    throw new Error('กรุณาเข้าสู่ระบบก่อนใช้งาน COOP-ai');
  }

  const response = await fetch(`${getApiBaseUrl()}/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    throw new Error('COOP-ai ไม่สามารถตอบกลับได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง');
  }
  const data = (await response.json()) as { reply: string };
  return data.reply;
}
