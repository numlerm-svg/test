"""
อ่านไฟล์ CSV/Excel ที่ผู้ใช้อัปโหลด, เดาคอลัมน์ที่น่าจะตรงกับสเปกที่ต้องการ,
และแปลงข้อมูลตามการจับคู่คอลัมน์ (mapping) ที่ผู้ใช้ยืนยันแล้ว ให้เป็นตารางมาตรฐานเดียวกัน
ไม่ว่าไฟล์ต้นทางจะตั้งชื่อคอลัมน์ว่าอะไรก็ตาม เพื่อให้ forecasting.py ทำงานกับข้อมูลรูปแบบเดียวเสมอ
"""
from __future__ import annotations

import io
import re
from typing import Optional

import numpy as np
import pandas as pd

# ชื่อฟิลด์มาตรฐานที่ระบบต้องการ และคำสำคัญ (keyword) ที่ใช้เดาว่าคอลัมน์ไหนในไฟล์ผู้ใช้น่าจะตรงกับฟิลด์นั้น
REQUIRED_FIELDS = {
    "month": {
        "label": "เดือน (YYYY-MM)",
        "keywords": ["เดือน", "month", "period", "งวด", "วันที่"],
    },
    "deposit_in": {
        "label": "เงินฝากเข้า (บาท)",
        "keywords": ["ฝากเข้า", "เงินฝากรับ", "รับฝาก", "deposit in", "deposit_in", "เงินฝากเพิ่ม"],
    },
    "withdrawal_out": {
        "label": "เงินถอนออก (บาท)",
        "keywords": ["ถอนออก", "เงินถอน", "withdraw", "เงินฝากถอน", "ถอนเงิน"],
    },
    "loan_disbursed": {
        "label": "เงินกู้เบิกจ่ายใหม่ (บาท)",
        "keywords": ["เบิกจ่ายใหม่", "กู้ใหม่", "จ่ายเงินกู้", "disburse", "เบิกจ่ายเงินกู้"],
    },
    "loan_repaid": {
        "label": "เงินกู้รับชำระคืน (บาท)",
        "keywords": ["รับชำระคืน", "ชำระคืน", "รับชำระ", "repay", "เงินกู้คืน"],
    },
    "cash_start": {
        "label": "เงินสด/เงินฝากธนาคารคงเหลือต้นเดือน (บาท)",
        "keywords": ["คงเหลือต้นเดือน", "เงินสดต้นเดือน", "cash", "ยกมา", "คงเหลือยกมา"],
    },
}


def read_uploaded_table(filename: str, content: bytes) -> pd.DataFrame:
    """อ่านไฟล์ CSV หรือ Excel ให้กลายเป็น DataFrame โดยพยายามหลาย encoding สำหรับ CSV ภาษาไทย"""
    lower = filename.lower()
    if lower.endswith((".xlsx", ".xls")):
        return pd.read_excel(io.BytesIO(content), dtype=str)

    last_error: Optional[Exception] = None
    for encoding in ("utf-8-sig", "utf-8", "cp874", "tis-620"):
        try:
            return pd.read_csv(io.BytesIO(content), dtype=str, encoding=encoding)
        except (UnicodeDecodeError, UnicodeError) as exc:
            last_error = exc
            continue
    raise ValueError(f"ไม่สามารถอ่านไฟล์ CSV ได้ (ลองหลาย encoding แล้วไม่สำเร็จ): {last_error}")


def suggest_mapping(columns: list[str]) -> dict[str, Optional[str]]:
    """เดาว่าคอลัมน์ในไฟล์ผู้ใช้คอลัมน์ไหนน่าจะตรงกับฟิลด์มาตรฐานแต่ละอัน โดยเทียบคำสำคัญแบบ substring (ไม่สนตัวพิมพ์เล็ก/ใหญ่)
    นี่เป็นแค่ "คำแนะนำเริ่มต้น" ผู้ใช้ยังต้องตรวจสอบ/แก้ไขเองในหน้าจับคู่คอลัมน์เสมอ
    """
    mapping: dict[str, Optional[str]] = {}
    used: set[str] = set()
    for field, meta in REQUIRED_FIELDS.items():
        best_col = None
        for col in columns:
            if col in used:
                continue
            col_lower = str(col).lower()
            if any(kw.lower() in col_lower for kw in meta["keywords"]):
                best_col = col
                break
        mapping[field] = best_col
        if best_col:
            used.add(best_col)
    return mapping


_NUMERIC_STRIP_RE = re.compile(r"[,\sบาท฿]")


def _parse_number(value) -> float:
    """แปลงค่าตัวเลขที่อาจมีคอมมา ช่องว่าง หน่วยเงิน หรือวงเล็บ (บัญชีมักใช้วงเล็บแทนค่าติดลบ) ให้เป็น float
    ค่าว่าง/NaN ถือเป็น 0 (สมมติว่าเดือนนั้นไม่มีรายการประเภทนี้เกิดขึ้น)
    """
    if value is None:
        return 0.0
    s = str(value).strip()
    if s == "" or s.lower() == "nan":
        return 0.0
    negative = s.startswith("(") and s.endswith(")")
    s = s.strip("()")
    s = _NUMERIC_STRIP_RE.sub("", s)
    if s == "":
        return 0.0
    try:
        num = float(s)
    except ValueError:
        return 0.0
    return -num if negative else num


def _parse_month(value) -> Optional[pd.Period]:
    """แปลงค่าคอลัมน์เดือนให้เป็น pandas Period รายเดือน รองรับทั้งรูปแบบ YYYY-MM ตรงๆ
    และปี พ.ศ. (เช่น 2568-12) ซึ่งจะถูกแปลงเป็น ค.ศ. โดยลบ 543 โดยอัตโนมัติถ้าปีดูมากผิดปกติ (> 2400)
    """
    s = str(value).strip()
    if not s:
        return None
    # ลองจับรูปแบบปี-เดือน ตรงๆ ก่อน (เช่น 2568-12, 2025/01, 2025-01-15)
    m = re.match(r"^(\d{4})[-/](\d{1,2})", s)
    if m:
        year = int(m.group(1))
        month = int(m.group(2))
        if year > 2400:  # ปี พ.ศ.
            year -= 543
        if 1 <= month <= 12:
            return pd.Period(year=year, month=month, freq="M")
    try:
        dt = pd.to_datetime(s, errors="raise")
        return pd.Period(year=dt.year, month=dt.month, freq="M")
    except Exception:
        return None


class MappingError(ValueError):
    pass


def apply_mapping(df: pd.DataFrame, mapping: dict[str, str]) -> pd.DataFrame:
    """แปลง DataFrame ดิบตามคอลัมน์ที่ผู้ใช้จับคู่ไว้ ให้กลายเป็นตารางมาตรฐาน 1 แถวต่อ 1 เดือน
    เรียงตามเดือนจากเก่าไปใหม่ พร้อมคำนวณกระแสเงินสดสุทธิและยอดคงเหลือปลายเดือนจริง
    """
    missing = [f for f in ["month", "deposit_in", "withdrawal_out", "loan_disbursed", "loan_repaid", "cash_start"] if not mapping.get(f)]
    if missing:
        labels = [REQUIRED_FIELDS[f]["label"] for f in missing]
        raise MappingError(f"ยังไม่ได้จับคู่คอลัมน์สำหรับ: {', '.join(labels)}")

    out = pd.DataFrame()
    out["month"] = df[mapping["month"]].apply(_parse_month)
    if out["month"].isna().any():
        bad_rows = int(out["month"].isna().sum())
        raise MappingError(f"มี {bad_rows} แถวที่อ่านค่าคอลัมน์เดือนไม่ได้ กรุณาตรวจสอบรูปแบบ (ต้องเป็น YYYY-MM)")

    for field in ["deposit_in", "withdrawal_out", "loan_disbursed", "loan_repaid", "cash_start"]:
        out[field] = df[mapping[field]].apply(_parse_number)

    out = out.sort_values("month").reset_index(drop=True)

    if out["month"].duplicated().any():
        dupes = out.loc[out["month"].duplicated(), "month"].astype(str).tolist()
        raise MappingError(f"มีเดือนซ้ำกันในข้อมูล: {', '.join(dupes)} กรุณาแก้ไขให้เหลือ 1 แถวต่อ 1 เดือน")

    out["net_cash_flow"] = (
        out["deposit_in"] - out["withdrawal_out"] + out["loan_repaid"] - out["loan_disbursed"]
    )
    # ยอดเงินสดคงเหลือ "ปลายเดือน" จริง = คงเหลือต้นเดือนที่ผู้ใช้กรอก + กระแสเงินสดสุทธิของเดือนนั้น
    out["actual_end_balance"] = out["cash_start"] + out["net_cash_flow"]

    return out


def detect_month_gaps(months: list[pd.Period]) -> list[str]:
    """ตรวจสอบว่าลำดับเดือนต่อเนื่องกันหรือไม่ (ไม่มีเดือนขาดหาย) คืนรายการช่วงที่ขาดหายเพื่อไปเตือนผู้ใช้
    ข้อมูลที่ไม่ต่อเนื่องจะทำให้ Seasonal Naive และการนับ MAE ต่อเดือนคลาดเคลื่อนได้ ผู้ใช้ควรทราบไว้
    """
    gaps = []
    for i in range(1, len(months)):
        expected = months[i - 1] + 1
        if months[i] != expected:
            gaps.append(f"{expected} ถึง {months[i] - 1}")
    return gaps
