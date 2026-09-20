// ตัวช่วยจัดรูปแบบเลขที่เอกสารต่าง ๆ
// ตัวเลขลำดับ (sequence) ต้องมาจากกลไกที่ไม่ชนกันเมื่อมีผู้ใช้พร้อมกันเสมอ
// (ตัวนับแบบ atomic ในหน่วยความจำสำหรับโหมดทดลอง หรือ Firestore transaction บน counters/{name} ในโหมด Firebase)
// ห้ามใช้ array.length + 1 เป็นเลขลำดับ

export function formatMemberNo(seq: number, joinYearBE: number): string {
  return `SM${joinYearBE}${String(seq).padStart(5, '0')}`;
}

export function formatAccountNo(typePrefix: 'S' | 'P' | 'F', seq: number): string {
  return `${typePrefix}${String(seq).padStart(8, '0')}`;
}

export function formatReceiptNo(seq: number, date = new Date()): string {
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(
    date.getDate(),
  ).padStart(2, '0')}`;
  return `RCP-${ymd}-${String(seq).padStart(6, '0')}`;
}

export function formatContractNo(seq: number, yearBE: number): string {
  return `LN${yearBE}${String(seq).padStart(5, '0')}`;
}

export function formatApplicationNo(seq: number, yearBE: number): string {
  return `AP${yearBE}${String(seq).padStart(5, '0')}`;
}

/** สร้าง idempotency key ฝั่ง client เพื่อป้องกันธุรกรรมซ้ำเมื่อกดส่งซ้ำหรือเครือข่ายขัดข้อง */
export function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** ตัวนับลำดับแบบ atomic ในหน่วยความจำ ใช้สำหรับโหมดทดลองเท่านั้น (ปลอดภัยเพราะ JS เป็น single-threaded event loop) */
export class InMemorySequence {
  private value: number;
  constructor(start = 0) {
    this.value = start;
  }
  next(): number {
    this.value += 1;
    return this.value;
  }
}
