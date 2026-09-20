# ระบบบริหารจัดการสหกรณ์ออมทรัพย์

เว็บแอประบบบริหารจัดการสหกรณ์ออมทรัพย์ภาษาไทย ครอบคลุมทะเบียนสมาชิก เงินฝาก สินเชื่อและเงินกู้
หุ้นและเงินปันผล การเรียกเก็บรายเดือน แดชบอร์ดวิเคราะห์ (Financial Health Overview ด้วย D3.js)
และผู้ช่วย AI ชื่อ **COOP-ai** (ขับเคลื่อนด้วย Google Gemini ผ่าน Cloud Functions)

รองรับผู้ใช้ 3 บทบาท: ผู้ดูแลระบบ (ADMIN) เจ้าหน้าที่ (STAFF) และสมาชิก (MEMBER)

## เทคโนโลยีที่ใช้

**Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + Lucide React + D3.js + Motion + ฟอนต์ Kanit
**Backend:** Firebase Authentication (Google Sign-in) + Cloud Firestore + Firebase Hosting +
Cloud Functions for Firebase (Node.js 20, Express) + Google Gemini API (server-side SDK) +
Firebase Secret Manager (เก็บ Gemini API key)

## เวอร์ชัน Node.js

| ที่ไหน | เวอร์ชันที่รองรับ |
|---|---|
| เครื่องพัฒนา (frontend, `npm run dev`/`build`/`test`) | Node.js 20.x – 22.x |
| Cloud Functions runtime (คลาวด์) | Node.js 20 (กำหนดใน `functions/package.json` ฟิลด์ `engines.node`) |

## โครงสร้างโปรเจกต์

```
src/                    Frontend (React + TypeScript)
  components/            หน้าจอและ UI แยกตามโมดูล (dashboard, members, deposits, loans, shares, billing, coopai, layout, common)
  services/              service interface กลาง + โหมดทดลอง (in-memory) + โหมด Firebase (Firestore)
  auth/                  AuthContext (Google Sign-in โหมด Firebase / สลับบทบาทโหมดทดลอง)
  config/                นโยบายและอัตราต่าง ๆ (policy.ts) + การตรวจสอบโหมดทำงาน (env.ts)
  lib/                   ยูทิลิตี้ร่วม (format, id, validate, finance, firebase)
  data/                  ตัวสร้างข้อมูลสาธิตสำหรับ Financial Health Overview (ดู data/README.md)
functions/               Cloud Functions (Express API + Gemini) — โปรเจกต์ Node.js แยกต่างหาก
firestore.rules          กฎความปลอดภัย Firestore ตามบทบาท
firebase.json            การตั้งค่า Hosting / Functions / Firestore / Emulators
```

## โหมดการทำงาน

ระบบเปิดดูและทดลองใช้งานได้ทันทีโดยไม่ต้องตั้งค่าใด ๆ:

- **โหมดทดลอง (ค่าเริ่มต้น):** เมื่อยังไม่ได้กำหนดค่า Firebase ระบบจะสร้างข้อมูลสมาชิก บัญชี เงินฝาก
  สัญญาเงินกู้ และคำขอกู้จำลองไว้ในหน่วยความจำของหน้าเว็บ ใช้งานฟอร์มและการคำนวณต่าง ๆ ได้ครบ
  แต่การแก้ไขข้อมูลจะหายไปเมื่อรีเฟรชหน้าเว็บ และไม่มีการเชื่อมต่อเครือข่ายไปยัง Firebase ใด ๆ
- **โหมด Firebase:** เมื่อกำหนดค่า Firebase ครบ (ดูด้านล่าง) ระบบจะอ่าน/เขียนข้อมูลจริงผ่าน
  Cloud Firestore และใช้ Firebase Authentication (Google Sign-in) ผู้ใช้ทั่วไปไม่ต้องกรอกค่า
  Firebase ใด ๆ เอง — ค่าทั้งหมดมาจาก environment ที่เจ้าของเว็บตั้งไว้ตอน build/deploy

ทั้งสองโหมดเรียกผ่าน service interface เดียวกัน (`src/services/types.ts`) จึงสลับได้โดยไม่ต้องแก้ไข component

## เริ่มต้นใช้งาน (โหมดทดลอง)

```bash
npm install
npm run dev
```

เปิด `http://localhost:5173` — ใช้งานได้ทันทีในโหมดทดลอง ไม่ต้องตั้งค่าใด ๆ

## ตั้งค่าโหมด Firebase

1. สร้างโปรเจกต์ Firebase และเปิดใช้งาน Authentication (Google Sign-in), Cloud Firestore และ Hosting
2. คัดลอก `.env.example` เป็น `.env.local` แล้วกรอกค่า Web App configuration จาก Firebase Console
3. แก้ `default` project ใน `.firebaserc` ให้เป็น Project ID จริง
4. ตั้งค่า Gemini API key ใน Secret Manager (ดูหัวข้อ COOP-ai ด้านล่าง)
5. ตั้งค่า `roles/{uid}` เอกสารแรกให้ผู้ดูแลระบบคนแรกด้วยตนเองผ่าน Firebase Console หรือ Admin SDK
   (เอกสารนี้เขียนได้เฉพาะผ่าน Cloud Function เท่านั้น ดูหัวข้อ "บทบาทและสิทธิ์" ด้านล่าง)
6. รัน `npm run build` แล้ว `firebase deploy`

## COOP-ai และ Gemini API key

Gemini API key เก็บอยู่ใน Firebase Secret Manager เท่านั้น **ไม่เก็บในโค้ดหรือไฟล์ `.env` ที่ฝั่งเว็บ**
เพราะจะถูกดาวน์โหลดไปยังเบราว์เซอร์ของผู้ใช้ทุกคน

```bash
firebase functions:secrets:set GEMINI_API_KEY
```

Cloud Function `functions/src/routes/ai.ts` อ่านคีย์นี้ฝั่งเซิร์ฟเวอร์และเรียก Gemini ผ่าน
`@google/generative-ai` SDK เท่านั้น หากยังไม่ได้ตั้งค่าคีย์ endpoint จะตอบกลับด้วยข้อความแจ้งเตือนแทนการ error
ในโหมดทดลอง COOP-ai ตอบคำถามด้วยกฎเกณฑ์พื้นฐานจากข้อมูลจำลอง ไม่เรียก Gemini จริง

## บทบาทและสิทธิ์

บทบาท (ADMIN / STAFF / MEMBER) เก็บอยู่ในเอกสาร `roles/{uid}` ซึ่งเป็นแหล่งข้อมูลเดียวที่เชื่อถือได้
เอกสารนี้เขียนได้เฉพาะผ่าน Cloud Function `POST /api/roles/assign` (ตรวจสอบว่าผู้เรียกเป็น ADMIN เท่านั้น)
เพื่อป้องกันไม่ให้ผู้ใช้เพิ่มสิทธิ์ให้ตนเองได้ — Firestore rules ปฏิเสธการเขียน collection นี้จากฝั่งเว็บโดยตรง
เสมอ การผูกบัญชี Google เข้ากับสมาชิกที่มีอยู่ก็ทำผ่าน endpoint เดียวกัน (ระบุ `memberId`)

ในโหมดทดลอง ใช้ตัวเลือก "มุมมอง (โหมดทดลอง)" ที่ Header เพื่อสลับดูมุมมองของแต่ละบทบาทได้ทันที

## รันชุดทดสอบ

```bash
npm test
```

ครอบคลุมสูตรการเงิน (LDR, การเติบโต, ค่างวด), การจัดรูปแบบวันที่/เงินบาทแบบไทย, กลไกสร้างเลขลำดับ
แบบไม่ชนกัน, การตรวจสอบข้อมูล และความถูกต้องของธุรกรรมฝาก/ถอนแบบ idempotent ในโหมดทดลอง

## Cloud Functions (ทดสอบในเครื่อง)

```bash
cd functions
npm install
npm run build
firebase emulators:start
```

## ข้อจำกัดของอัตราและนโยบายตัวอย่าง

อัตราดอกเบี้ยเงินฝาก/เงินกู้ อัตราปันผล และสูตรวงเงินกู้ที่กำหนดไว้ใน `src/config/policy.ts`
เป็น **ค่าตัวอย่างสำหรับสาธิตเท่านั้น** ไม่ใช่อัตรามาตรฐานตามกฎหมายหรือสิทธิประโยชน์ทางภาษีที่รับรองแล้ว
ผู้ดูแลระบบปรับค่าเหล่านี้ได้จากจุดเดียวในไฟล์ config โดยไม่ต้องแก้ไขแต่ละหน้าจอ

ชุดข้อมูลใน "Financial Health Overview" เป็นข้อมูลสังเคราะห์ล้วน แยกขาดจากข้อมูลจริงใน Firestore เสมอ
รายละเอียดดูที่ `src/data/README.md`
