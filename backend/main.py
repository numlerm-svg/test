"""
FastAPI backend สำหรับเว็บแอป "พยากรณ์สภาพคล่อง" ของสหกรณ์ออมทรัพย์

ออกแบบให้ไม่มีฐานข้อมูล ไม่มีระบบล็อกอิน: ผู้ใช้อัปโหลดไฟล์ ระบบประมวลผลในหน่วยความจำ
แล้วส่งผลลัพธ์กลับไปทั้งหมดในคำตอบเดียว (stateless) ทำให้ deploy ง่ายและไม่มีข้อมูลการเงินสหกรณ์
ค้างอยู่บนเซิร์ฟเวอร์หลังการใช้งาน
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from data_processing import (
    MappingError,
    apply_mapping,
    detect_month_gaps,
    read_uploaded_table,
    suggest_mapping,
)
from forecasting import backtest_methods, forecast_future, pick_best_method

app = FastAPI(title="พยากรณ์สภาพคล่องสหกรณ์ออมทรัพย์")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"

# เกณฑ์คำเตือนความน่าเชื่อถือของการพยากรณ์ (ตามสเปก): ข้อมูลน้อยกว่า 12 เดือน หรือ MAPE ของวิธีที่ดีที่สุด > 20%
MIN_MONTHS_FOR_CONFIDENT_FORECAST = 12
MAPE_WARNING_THRESHOLD = 20.0
DEFAULT_HORIZON = 6


@app.post("/api/preview")
async def preview(file: UploadFile = File(...)):
    """ขั้นตอนที่ 1: อ่านหัวคอลัมน์และตัวอย่างข้อมูล พร้อมเดาการจับคู่คอลัมน์เบื้องต้น
    ผู้ใช้จะเห็นหน้าจอจับคู่คอลัมน์ (mapping) ต่อจากนี้ ไม่ใช่ error ทิ้งไปเฉยๆ ถ้าคอลัมน์ไม่ตรงสเปก
    """
    content = await file.read()
    try:
        df = read_uploaded_table(file.filename, content)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"อ่านไฟล์ไม่สำเร็จ: {exc}") from exc

    if df.empty or len(df.columns) == 0:
        raise HTTPException(status_code=400, detail="ไฟล์นี้ไม่มีข้อมูล หรืออ่านคอลัมน์ไม่ได้")

    columns = [str(c) for c in df.columns]
    preview_rows = df.head(8).fillna("").astype(str).to_dict(orient="records")

    return {
        "columns": columns,
        "preview_rows": preview_rows,
        "n_rows": int(len(df)),
        "suggested_mapping": suggest_mapping(columns),
    }


@app.post("/api/forecast")
async def forecast(
    file: UploadFile = File(...),
    mapping: str = Form(...),
    horizon: int = Form(DEFAULT_HORIZON),
    min_cash_threshold: float = Form(0.0),
):
    """ขั้นตอนที่ 2: รับไฟล์เดิมซ้ำ + การจับคู่คอลัมน์ที่ผู้ใช้ยืนยันแล้ว -> คำนวณพยากรณ์ทั้งหมด

    ไฟล์ถูกอัปโหลดซ้ำอีกครั้ง (แทนที่จะเก็บ session ไว้บนเซิร์ฟเวอร์) เพื่อให้ระบบไม่ต้องมีสถานะค้างไว้
    ระหว่างคำขอ ไฟล์ CSV/Excel ของสหกรณ์มีขนาดเล็ก การอัปโหลดซ้ำจึงแทบไม่มีผลต่อความเร็ว
    """
    try:
        mapping_dict = json.loads(mapping)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="รูปแบบข้อมูลการจับคู่คอลัมน์ไม่ถูกต้อง") from exc

    content = await file.read()
    try:
        raw_df = read_uploaded_table(file.filename, content)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"อ่านไฟล์ไม่สำเร็จ: {exc}") from exc

    try:
        table = apply_mapping(raw_df, mapping_dict)
    except MappingError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    n_months = len(table)
    if n_months < 3:
        raise HTTPException(
            status_code=400,
            detail="ต้องมีข้อมูลอย่างน้อย 3 เดือนจึงจะพยากรณ์ได้ กรุณาอัปโหลดข้อมูลเพิ่ม",
        )

    months_list = table["month"].tolist()
    gaps = detect_month_gaps(months_list)

    net_flow_series = table["net_cash_flow"].to_numpy(dtype=float)

    backtest_results = backtest_methods(net_flow_series)
    best = pick_best_method(backtest_results)

    if best is not None:
        chosen_method = best.method
        chosen_mae = best.mae
        selection_reason = (
            f"เลือก \"{best.method_label}\" เพราะมี MAPE ต่ำสุดจากการทดสอบย้อนหลัง "
            f"({best.mape:.1f}% จากการทดสอบ {best.n_points} จุดข้อมูล) เมื่อเทียบกับวิธีอื่น"
        )
    else:
        chosen_method = "naive"
        chosen_mae = None
        selection_reason = (
            "ข้อมูลย้อนหลังยังน้อยเกินกว่าจะทดสอบเปรียบเทียบวิธีพยากรณ์ได้อย่างน่าเชื่อถือ "
            "ระบบจึงใช้วิธี Naive (ค่าเดือนล่าสุด) เป็นค่าเริ่มต้นซึ่งเป็นวิธีที่ปลอดภัยที่สุดเมื่อข้อมูลมีจำกัด"
        )

    future_points = forecast_future(net_flow_series, chosen_method, horizon, chosen_mae)

    last_actual_balance = float(table["actual_end_balance"].iloc[-1])
    last_month = months_list[-1]

    forecast_balance_rows = []
    running_mid = last_actual_balance
    running_low = last_actual_balance
    running_high = last_actual_balance
    for point in future_points:
        running_mid += point.value
        running_low += point.lower
        running_high += point.upper
        target_month = last_month + point.steps_ahead
        forecast_balance_rows.append(
            {
                "month": str(target_month),
                "steps_ahead": point.steps_ahead,
                "net_cash_flow_mid": round(point.value, 2),
                "net_cash_flow_lower": round(point.lower, 2),
                "net_cash_flow_upper": round(point.upper, 2),
                "balance_mid": round(running_mid, 2),
                "balance_lower": round(running_low, 2),
                "balance_upper": round(running_high, 2),
            }
        )

    warnings = []
    if n_months < MIN_MONTHS_FOR_CONFIDENT_FORECAST:
        warnings.append(
            f"ความแม่นยำของการพยากรณ์นี้ต่ำ เนื่องจากมีข้อมูลย้อนหลังเพียง {n_months} เดือน "
            f"(น้อยกว่า {MIN_MONTHS_FOR_CONFIDENT_FORECAST} เดือนที่แนะนำ) ควรใช้ประกอบดุลยพินิจ ไม่ใช่ตัวเลขตัดสินใจเดียว"
        )
    if best is not None and best.mape is not None and best.mape > MAPE_WARNING_THRESHOLD:
        warnings.append(
            f"ความแม่นยำของการพยากรณ์นี้ต่ำ เนื่องจากวิธีที่ดีที่สุด (\"{best.method_label}\") "
            f"มีค่าความคลาดเคลื่อน MAPE จากการทดสอบย้อนหลังสูงถึง {best.mape:.1f}% "
            f"(เกินเกณฑ์ {MAPE_WARNING_THRESHOLD:.0f}%) ควรใช้ประกอบดุลยพินิจ ไม่ใช่ตัวเลขตัดสินใจเดียว"
        )
    if best is None:
        warnings.append(
            "ความแม่นยำของการพยากรณ์นี้ต่ำ เนื่องจากข้อมูลย้อนหลังไม่พอที่จะทดสอบเปรียบเทียบวิธีพยากรณ์เลย "
            "ควรใช้ประกอบดุลยพินิจ ไม่ใช่ตัวเลขตัดสินใจเดียว"
        )
    if gaps:
        warnings.append(
            "ข้อมูลย้อนหลังไม่ต่อเนื่อง (มีเดือนขาดหาย: " + "; ".join(gaps) + ") "
            "ซึ่งอาจทำให้การพยากรณ์แบบ Seasonal และค่าความคลาดเคลื่อนคลาดเคลื่อนไปจากความเป็นจริง"
        )

    historical_rows = []
    for _, row in table.iterrows():
        historical_rows.append(
            {
                "month": str(row["month"]),
                "deposit_in": round(float(row["deposit_in"]), 2),
                "withdrawal_out": round(float(row["withdrawal_out"]), 2),
                "loan_disbursed": round(float(row["loan_disbursed"]), 2),
                "loan_repaid": round(float(row["loan_repaid"]), 2),
                "cash_start": round(float(row["cash_start"]), 2),
                "net_cash_flow": round(float(row["net_cash_flow"]), 2),
                "actual_end_balance": round(float(row["actual_end_balance"]), 2),
            }
        )

    backtest_table = [
        {
            "method": r.method,
            "method_label": r.method_label,
            "mape": round(r.mape, 2) if r.mape is not None else None,
            "mae": round(r.mae, 2) if r.mae is not None else None,
            "n_points": r.n_points,
            "usable": r.usable,
            "reason": r.reason,
            "is_selected": best is not None and r.method == best.method,
        }
        for r in backtest_results
    ]

    next_month_net_flow = future_points[0].value if future_points else None

    return {
        "n_months": n_months,
        "chosen_method": chosen_method,
        "chosen_method_label": {
            "naive": "Naive (ค่าเดือนล่าสุด)",
            "moving_average": "Moving Average 3 เดือน",
            "seasonal_naive": "Seasonal Naive (เดือนเดียวกันปีก่อน)",
            "linear_trend": "Linear Trend Regression",
        }[chosen_method],
        "selection_reason": selection_reason,
        "warnings": warnings,
        "historical": historical_rows,
        "forecast": forecast_balance_rows,
        "backtest_table": backtest_table,
        "last_actual_balance": round(last_actual_balance, 2),
        "next_month_net_flow": round(next_month_net_flow, 2) if next_month_net_flow is not None else None,
        "min_cash_threshold": min_cash_threshold,
    }


SAMPLE_DIR = Path(__file__).resolve().parent.parent / "sample_data"

# เสิร์ฟหน้าเว็บ frontend (static files) และไฟล์ข้อมูลตัวอย่างจาก backend เดียวกัน เพื่อให้ deploy เป็นบริการเดียวจบ
app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")
app.mount("/samples", StaticFiles(directory=str(SAMPLE_DIR)), name="samples")


@app.get("/")
async def index():
    return FileResponse(str(FRONTEND_DIR / "index.html"))
