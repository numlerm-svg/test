import { Router } from 'express';
import * as admin from 'firebase-admin';
import { askGemini, geminiApiKeySecret } from '../gemini';
import { requireAuth } from '../middleware/auth';

export const aiRouter = Router();

interface Member {
  status: string;
  shareValue: number;
  totalDeposits: number;
  outstandingLoans: number;
}

async function buildContextSummary(): Promise<string> {
  const db = admin.firestore();
  const membersSnap = await db.collection('members').get();
  const members = membersSnap.docs.map((d) => d.data() as Member);
  const activeMembers = members.filter((m) => m.status === 'ACTIVE');
  const totalShareValue = members.reduce((s, m) => s + (m.shareValue ?? 0), 0);
  const totalDeposits = members.reduce((s, m) => s + (m.totalDeposits ?? 0), 0);
  const totalOutstandingLoans = members.reduce((s, m) => s + (m.outstandingLoans ?? 0), 0);

  return [
    `จำนวนสมาชิกทั้งหมด: ${members.length} คน (ใช้งานอยู่ ${activeMembers.length} คน)`,
    `ทุนเรือนหุ้นรวม: ${totalShareValue.toLocaleString('th-TH')} บาท`,
    `เงินฝากรวม: ${totalDeposits.toLocaleString('th-TH')} บาท`,
    `เงินกู้คงค้างรวม: ${totalOutstandingLoans.toLocaleString('th-TH')} บาท`,
  ].join('\n');
}

aiRouter.post('/chat', requireAuth(), async (req, res) => {
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message) {
    res.status(400).json({ error: 'กรุณาระบุข้อความคำถาม' });
    return;
  }

  const apiKey = geminiApiKeySecret.value();
  if (!apiKey) {
    res.status(503).json({ error: 'ยังไม่ได้ตั้งค่า Gemini API key บนเซิร์ฟเวอร์ กรุณาติดต่อผู้ดูแลระบบ' });
    return;
  }

  try {
    const contextSummary = await buildContextSummary();
    const reply = await askGemini(apiKey, message, contextSummary);
    res.json({ reply });
  } catch (err) {
    console.error('COOP-ai chat error', err);
    res.status(502).json({ error: 'COOP-ai ไม่สามารถตอบกลับได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง' });
  }
});
