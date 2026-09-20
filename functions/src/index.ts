import * as admin from 'firebase-admin';
import cors from 'cors';
import express from 'express';
import { onRequest } from 'firebase-functions/v2/https';
import { aiRouter } from './routes/ai';
import { rolesRouter } from './routes/roles';
import { geminiApiKeySecret } from './gemini';

admin.initializeApp();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/ai', aiRouter);
app.use('/roles', rolesRouter);

// Hosting rewrite (ดู firebase.json) ส่งคำขอ /api/** มาที่ฟังก์ชันนี้ตัวเดียว
export const api = onRequest({ secrets: [geminiApiKeySecret], region: 'asia-southeast1' }, app);
