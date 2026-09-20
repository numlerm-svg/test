import { GoogleGenerativeAI } from '@google/generative-ai';
import { defineSecret } from 'firebase-functions/params';

// เก็บ Gemini API key ใน Firebase Secret Manager (ตั้งค่าด้วย `firebase functions:secrets:set GEMINI_API_KEY`)
// ไม่เก็บคีย์ไว้ในโค้ดหรือ environment variable ธรรมดา
export const geminiApiKeySecret = defineSecret('GEMINI_API_KEY');

const SYSTEM_INSTRUCTION = `คุณคือ COOP-ai ผู้ช่วย AI ของระบบบริหารจัดการสหกรณ์ออมทรัพย์ ตอบเป็นภาษาไทยอย่างสุภาพและกระชับ
ให้ข้อมูลเกี่ยวกับเงินฝาก เงินกู้ หุ้น เงินปันผล และการเรียกเก็บรายเดือนตามข้อมูลที่ได้รับเท่านั้น
ห้ามให้คำแนะนำทางกฎหมายหรือภาษีที่รับรองผล และห้ามสร้างตัวเลขที่ไม่มีอยู่ในข้อมูลที่ให้มา
หากข้อมูลไม่พอให้แจ้งว่ายังไม่มีข้อมูลเพียงพอ แทนที่จะเดา`;

export async function askGemini(apiKey: string, userMessage: string, contextSummary: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash', systemInstruction: SYSTEM_INSTRUCTION });

  const prompt = `ข้อมูลสรุปสถานะสหกรณ์ปัจจุบัน:\n${contextSummary}\n\nคำถามจากผู้ใช้: ${userMessage}`;
  const result = await model.generateContent(prompt);
  return result.response.text();
}
