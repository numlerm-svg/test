import { Router } from 'express';
import * as admin from 'firebase-admin';
import { requireAuth, requireRole } from '../middleware/auth';

export const rolesRouter = Router();

// ผู้ดูแลระบบเท่านั้นที่มอบสิทธิ์ (ADMIN/STAFF) หรือผูกบัญชี Google เข้ากับสมาชิก (MEMBER + memberId) ได้
// การเขียน roles/{uid} ทำผ่าน Cloud Function ด้วย Admin SDK เท่านั้น (Firestore rules ปฏิเสธการเขียนจากฝั่งเว็บโดยตรง)
rolesRouter.post('/assign', requireAuth(), requireRole('ADMIN'), async (req, res) => {
  const targetUid = typeof req.body?.uid === 'string' ? req.body.uid : null;
  const role = req.body?.role;
  const memberId = typeof req.body?.memberId === 'string' ? req.body.memberId : null;

  if (!targetUid || !['ADMIN', 'STAFF', 'MEMBER'].includes(role)) {
    res.status(400).json({ error: 'ต้องระบุ uid และ role เป็น ADMIN, STAFF หรือ MEMBER' });
    return;
  }
  if (role === 'MEMBER' && !memberId) {
    res.status(400).json({ error: 'การผูกบัญชีสมาชิกต้องระบุ memberId' });
    return;
  }

  const db = admin.firestore();
  if (memberId) {
    const memberDoc = await db.collection('members').doc(memberId).get();
    if (!memberDoc.exists) {
      res.status(404).json({ error: 'ไม่พบสมาชิกตาม memberId ที่ระบุ' });
      return;
    }
    await db.collection('members').doc(memberId).update({ firebaseUid: targetUid });
  }

  await db
    .collection('roles')
    .doc(targetUid)
    .set({ role, memberId: memberId ?? null, assignedBy: req.authUser!.uid, assignedAt: new Date().toISOString() });
  res.json({ ok: true });
});
