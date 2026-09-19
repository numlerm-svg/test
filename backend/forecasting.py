"""
ตรรกะการพยากรณ์กระแสเงินสดและการ backtest

แนวคิดหลัก:
1. เราพยากรณ์ "กระแสเงินสดสุทธิรายเดือน" (เงินเข้าทั้งหมด - เงินออกทั้งหมด) ไม่ใช่พยากรณ์
   ยอดเงินสดคงเหลือโดยตรง เพราะกระแสเงินสดสุทธิมักจะนิ่งกว่า (stationary) และพยากรณ์ได้ง่ายกว่า
   ยอดคงเหลือสะสมซึ่งมีแนวโน้มสะสม (trend) ติดตัวอยู่แล้ว
2. ยอดเงินสดคงเหลือพยากรณ์ = ยอดคงเหลือเดือนล่าสุดจริง + ผลรวมสะสมของกระแสเงินสดสุทธิที่พยากรณ์
3. เราไม่เลือกวิธีพยากรณ์ที่ "ดูซับซ้อน/ดูฉลาด" ไว้ก่อน แต่ให้ข้อมูลในอดีตเป็นคนตัดสิน
   โดยการทำ backtest (ทดสอบย้อนหลัง) แล้ววัดความแม่นยำด้วยค่า MAPE แล้วเลือกวิธีที่ MAPE ต่ำสุด
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Optional

import numpy as np


# ---------------------------------------------------------------------------
# วิธีพยากรณ์แต่ละแบบ
# แต่ละฟังก์ชันรับ "ประวัติค่าจริงจนถึงตอนนี้" (history) แล้วคืนค่าพยากรณ์ 1 ค่า
# สำหรับเดือนถัดไปทันที (one-step-ahead) ใช้ทั้งตอน backtest และตอนพยากรณ์อนาคตจริง
# ---------------------------------------------------------------------------

def forecast_naive(history: np.ndarray, future_index: Optional[int] = None) -> float:
    """Naive: ใช้ค่าของเดือนล่าสุดที่มีข้อมูลจริงเป็นค่าพยากรณ์ของเดือนถัดไปทุกเดือน
    เหมาะกับข้อมูลที่ไม่มีแนวโน้มหรือฤดูกาลชัดเจน และเป็น baseline ขั้นต่ำสุดที่วิธีอื่นต้อง "เอาชนะ" ให้ได้
    """
    return float(history[-1])


def forecast_moving_average(history: np.ndarray, window: int = 3) -> float:
    """Moving Average 3 เดือน: เฉลี่ยของ 3 เดือนล่าสุด (หรือเท่าที่มีถ้าน้อยกว่า 3 เดือน)
    ช่วยลด noise ของเดือนใดเดือนหนึ่งที่ผิดปกติ เหมาะกับข้อมูลที่แกว่งขึ้นลงแบบสุ่มรอบค่าเฉลี่ยที่ค่อนข้างคงที่
    """
    w = min(window, len(history))
    return float(np.mean(history[-w:]))


def forecast_seasonal_naive(history: np.ndarray, steps_ahead: int, period: int = 12) -> Optional[float]:
    """Seasonal naive: ใช้ค่าของ "เดือนเดียวกันในรอบปีก่อนหน้า" เป็นค่าพยากรณ์
    เช่น พยากรณ์เดือน ม.ค. ปีนี้ ใช้ค่าจริงของเดือน ม.ค. ปีที่แล้ว
    ใช้ได้เฉพาะเมื่อมีข้อมูลย้อนหลังพอ (อย่างน้อย period เดือน ก่อนเดือนที่จะพยากรณ์)
    คืนค่า None ถ้าข้อมูลไม่พอ เพื่อไม่ให้เอาไปปะปนกับวิธีอื่นแบบผิดๆ
    """
    target_index = len(history) + steps_ahead - 1 - period
    if target_index < 0:
        return None
    return float(history[target_index])


def forecast_linear_trend(history: np.ndarray, steps_ahead: int) -> float:
    """Linear trend regression: ลากเส้นตรง (least squares) ผ่านค่าย้อนหลังทั้งหมด แล้วต่อเส้นออกไปในอนาคต
    เหมาะกับข้อมูลที่มีแนวโน้มเพิ่ม/ลดต่อเนื่องชัดเจน แต่จะพยากรณ์ผิดพลาดมากถ้าข้อมูลจริงๆ ไม่มีแนวโน้มเชิงเส้น
    """
    n = len(history)
    x = np.arange(n)
    # np.polyfit หา a, b ที่ทำให้ y = a*x + b ใกล้เคียงข้อมูลจริงที่สุด (least squares)
    a, b = np.polyfit(x, history, 1)
    future_x = n - 1 + steps_ahead
    return float(a * future_x + b)


METHOD_NAMES = {
    "naive": "Naive (ค่าเดือนล่าสุด)",
    "moving_average": "Moving Average 3 เดือน",
    "seasonal_naive": "Seasonal Naive (เดือนเดียวกันปีก่อน)",
    "linear_trend": "Linear Trend Regression",
}


def _predict_one_step(method: str, history: np.ndarray, steps_ahead: int) -> Optional[float]:
    if method == "naive":
        return forecast_naive(history)
    if method == "moving_average":
        return forecast_moving_average(history)
    if method == "seasonal_naive":
        return forecast_seasonal_naive(history, steps_ahead)
    if method == "linear_trend":
        return forecast_linear_trend(history, steps_ahead)
    raise ValueError(f"unknown method: {method}")


# ---------------------------------------------------------------------------
# MAPE (Mean Absolute Percentage Error)
# สูตร: MAPE = ค่าเฉลี่ยของ |ค่าจริง - ค่าพยากรณ์| / |ค่าจริง| x 100%
# ตีความ: MAPE ยิ่งต่ำ = พยากรณ์แม่นยำ ยิ่งสูง = พยากรณ์คลาดเคลื่อนมาก (หน่วยเป็น %)
# ข้อจำกัดสำคัญ: ถ้า "ค่าจริง" ในเดือนนั้นใกล้ศูนย์ (กระแสเงินสดสุทธิพอดีเกือบเท่าทุนเข้า-ออก)
# ตัวหารจะใกล้ศูนย์ ทำให้ %error พุ่งสูงผิดปกติทั้งที่ผลต่างจริงเป็นเงินไม่กี่บาท
# ในโค้ดนี้เราจึงตัดจุดที่ |ค่าจริง| ต่ำกว่า MAPE_MIN_DENOMINATOR ออกจากการคำนวณ MAPE
# เพื่อไม่ให้ตัวเลขที่ปกติกลายเป็น outlier ที่ทำให้การเปรียบเทียบวิธีผิดเพี้ยน
# ---------------------------------------------------------------------------
MAPE_MIN_DENOMINATOR = 1000.0  # บาท: ต่ำกว่านี้ถือว่าใกล้ศูนย์เกินกว่าจะคำนวณ %error ได้อย่างมีความหมาย


def _mape(actuals: list[float], forecasts: list[float]) -> Optional[float]:
    errors = []
    for a, f in zip(actuals, forecasts):
        if abs(a) < MAPE_MIN_DENOMINATOR:
            continue
        errors.append(abs(a - f) / abs(a))
    if not errors:
        return None
    return float(np.mean(errors) * 100.0)


def _mae(actuals: list[float], forecasts: list[float]) -> Optional[float]:
    """Mean Absolute Error หน่วยเป็นบาท ใช้สร้างช่วงความไม่แน่นอน (± บาท) ของค่าพยากรณ์
    ต่างจาก MAPE ตรงที่ MAE ไม่มีปัญหาหารด้วยศูนย์ จึงใช้เป็นตัวกำหนดขนาด "แถบความไม่แน่นอน" บนกราฟได้ตรงไปตรงมากว่า
    """
    if not actuals:
        return None
    diffs = [abs(a - f) for a, f in zip(actuals, forecasts)]
    return float(np.mean(diffs))


@dataclass
class BacktestResult:
    method: str
    method_label: str
    mape: Optional[float]
    mae: Optional[float]
    n_points: int
    usable: bool
    reason: str = ""


def backtest_methods(series: np.ndarray, min_train: int = 6, max_backtest_points: int = 6) -> list[BacktestResult]:
    """ทำ backtest แบบ expanding window แบบ one-step-ahead:
    - เริ่มจากเทรนบนข้อมูล min_train เดือนแรก แล้วพยากรณ์เดือนถัดไป 1 เดือน เทียบกับค่าจริง
    - ขยายหน้าต่างเทรนออกไปทีละเดือน ทำซ้ำจนถึงเดือนสุดท้ายที่มีข้อมูลจริง
    - รวบรวม error ของทุกจุดที่ backtest ได้ แล้วคำนวณ MAPE / MAE รวมของแต่ละวิธี
    วิธีนี้จำลองสถานการณ์จริงที่สุด: "ถ้าเรายืนอยู่ ณ เดือนนั้นๆ แล้วพยากรณ์เดือนถัดไป จะแม่นแค่ไหน"
    """
    n = len(series)
    results: list[BacktestResult] = []

    start = max(min_train, n - max_backtest_points)
    test_indices = list(range(start, n))

    for method in METHOD_NAMES:
        actuals: list[float] = []
        forecasts: list[float] = []
        for t in test_indices:
            history = series[:t]
            pred = _predict_one_step(method, history, steps_ahead=1)
            if pred is None:
                continue
            actuals.append(float(series[t]))
            forecasts.append(pred)

        if not actuals:
            reason = "ข้อมูลย้อนหลังไม่พอสำหรับทดสอบวิธีนี้"
            if method == "seasonal_naive":
                reason = "ต้องมีข้อมูลย้อนหลังอย่างน้อย 13 เดือนจึงจะเทียบเดือนเดียวกันปีก่อนได้"
            results.append(BacktestResult(method, METHOD_NAMES[method], None, None, 0, False, reason))
            continue

        results.append(
            BacktestResult(
                method=method,
                method_label=METHOD_NAMES[method],
                mape=_mape(actuals, forecasts),
                mae=_mae(actuals, forecasts),
                n_points=len(actuals),
                usable=True,
            )
        )
    return results


def pick_best_method(results: list[BacktestResult]) -> Optional[BacktestResult]:
    """เลือกวิธีที่ MAPE ต่ำสุดในบรรดาวิธีที่ทดสอบได้จริง (usable=True และมีค่า mape)
    ถ้าไม่มีวิธีไหนทดสอบได้เลย (ข้อมูลน้อยมาก) จะคืนค่า None แล้วให้ผู้เรียกใช้ fallback ไปที่ naive
    """
    candidates = [r for r in results if r.usable and r.mape is not None]
    if not candidates:
        return None
    return min(candidates, key=lambda r: r.mape)


@dataclass
class ForecastPoint:
    steps_ahead: int
    value: float
    lower: float
    upper: float


def forecast_future(series: np.ndarray, method: str, horizon: int, mae: Optional[float]) -> list[ForecastPoint]:
    """พยากรณ์กระแสเงินสดสุทธิล่วงหน้า horizon เดือน ด้วยวิธีที่เลือก โดยใช้ข้อมูลจริงทั้งหมดที่มี (ไม่ใช่แค่ช่วง backtest)

    ช่วงความไม่แน่นอน (lower/upper):
    ใช้ MAE จากการ backtest เป็นขนาดค่าคลาดเคลื่อนเฉลี่ยต่อเดือน แล้วขยายตามระยะเวลาพยากรณ์ล่วงหน้า
    ด้วย sqrt(steps_ahead) ซึ่งเป็นสมมติฐานมาตรฐานว่าความคลาดเคลื่อนของแต่ละเดือนเป็นอิสระต่อกัน
    (ผลรวมของความแปรปรวนที่เป็นอิสระ = ผลรวมความแปรปรวนแต่ละตัว ทำให้ส่วนเบี่ยงเบนมาตรฐานรวม = MAE*sqrt(h))
    นี่เป็นการประมาณอย่างง่าย ไม่ใช่ค่าทางสถิติที่เข้มงวด แต่ให้ภาพที่สมเหตุสมผลว่ายิ่งพยากรณ์ไกลยิ่งไม่แน่นอนมากขึ้น
    """
    mae_value = mae if mae is not None else 0.0
    points: list[ForecastPoint] = []
    for h in range(1, horizon + 1):
        pred = _predict_one_step(method, series, steps_ahead=h)
        if pred is None:
            # กรณี seasonal_naive แต่ข้อมูลไม่พอสำหรับ horizon นี้ -> fallback เป็น naive ของค่าที่ predict ไว้ล่าสุด
            pred = forecast_naive(series)
        band = mae_value * math.sqrt(h)
        points.append(ForecastPoint(steps_ahead=h, value=pred, lower=pred - band, upper=pred + band))
    return points
