import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { aggregateFinancialHealthByMonth, generateFinancialHealthRecords, type MonthlyAggregate } from '../../data/generateFinancialHealthData';
import { calcDepositLoanGap, calcGrowth, calcLDR, calcOverdueRatio, type CalcResult } from '../../lib/finance';
import { formatThaiMonthShort, formatThaiMonthYear, formatTHB } from '../../lib/format';
import { DemoBadge } from '../common/DemoBadge';

type ViewMode = 'COMPARE' | 'DEPOSIT' | 'LOAN' | 'LDR';

const VIEW_LABELS: Record<ViewMode, string> = {
  COMPARE: 'เปรียบเทียบเงินฝากกับสินเชื่อ',
  DEPOSIT: 'เงินรับฝาก',
  LOAN: 'ลูกหนี้เงินกู้',
  LDR: 'Loan-to-Deposit Ratio',
};

function KpiPill({ label, result, suffix = '%' }: { label: string; result: CalcResult; suffix?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      {result.ok ? (
        <p className="mt-1 tabular-nums text-lg font-semibold text-slate-900">
          {result.value.toFixed(2)}
          {suffix}
        </p>
      ) : (
        <p className="mt-1 text-sm font-medium text-slate-400">คำนวณไม่ได้ — {result.reason}</p>
      )}
    </div>
  );
}

export function FinancialHealthChart() {
  const [view, setView] = useState<ViewMode>('COMPARE');
  const [range, setRange] = useState<6 | 12>(12);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; month: MonthlyAggregate } | null>(null);

  const allMonths = useMemo(() => aggregateFinancialHealthByMonth(generateFinancialHealthRecords()), []);
  const visibleMonths = useMemo(() => allMonths.slice(allMonths.length - range), [allMonths, range]);

  const base = allMonths[0];
  const latest = allMonths[allMonths.length - 1];
  const ldr = calcLDR(latest.totalLoanPrincipal, latest.totalDeposit);
  const depositGrowth = calcGrowth(latest.totalDeposit, base.totalDeposit);
  const loanGrowth = calcGrowth(latest.totalLoanPrincipal, base.totalLoanPrincipal);
  const gap = calcDepositLoanGap(latest.totalDeposit, latest.totalLoanPrincipal);

  useEffect(() => {
    if (!svgRef.current) return;
    const width = containerRef.current?.clientWidth ?? 640;
    const height = 320;
    const margin = { top: 20, right: 24, bottom: 32, left: 64 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('role', 'img').attr('aria-label', VIEW_LABELS[view]);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3
      .scaleBand()
      .domain(visibleMonths.map((m) => m.month))
      .range([0, innerWidth])
      .padding(0.3);

    const isLdrView = view === 'LDR';
    const series: { key: string; color: string; getValue: (m: MonthlyAggregate) => number }[] =
      view === 'COMPARE'
        ? [
            { key: 'deposit', color: '#059669', getValue: (m) => m.totalDeposit },
            { key: 'loan', color: '#6366f1', getValue: (m) => m.totalLoanPrincipal },
          ]
        : view === 'DEPOSIT'
          ? [{ key: 'deposit', color: '#059669', getValue: (m) => m.totalDeposit }]
          : view === 'LOAN'
            ? [{ key: 'loan', color: '#6366f1', getValue: (m) => m.totalLoanPrincipal }]
            : [
                {
                  key: 'ldr',
                  color: '#6366f1',
                  getValue: (m) => {
                    const r = calcLDR(m.totalLoanPrincipal, m.totalDeposit);
                    return r.ok ? r.value : 0;
                  },
                },
              ];

    const maxValue = isLdrView
      ? Math.max(10, d3.max(visibleMonths, (m) => series[0].getValue(m)) ?? 0)
      : (d3.max(visibleMonths, (m) => Math.max(...series.map((s) => s.getValue(m)))) ?? 0);

    const y = d3
      .scaleLinear()
      .domain([0, maxValue * 1.15 || 1])
      .range([innerHeight, 0])
      .nice();

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).tickFormat((m) => formatThaiMonthShort(m)))
      .selectAll('text')
      .attr('font-size', 10)
      .attr('fill', '#64748b');

    g.append('g')
      .call(
        d3
          .axisLeft(y)
          .ticks(5)
          .tickFormat((v) => (isLdrView ? `${v}%` : d3.format('.2s')(v as number).replace('G', 'B'))),
      )
      .selectAll('text')
      .attr('font-size', 10)
      .attr('fill', '#64748b');

    g.selectAll('.domain, .tick line').attr('stroke', '#e2e8f0');

    series.forEach((s) => {
      const line = d3
        .line<MonthlyAggregate>()
        .x((m) => (x(m.month) ?? 0) + x.bandwidth() / 2)
        .y((m) => y(s.getValue(m)))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(visibleMonths)
        .attr('fill', 'none')
        .attr('stroke', s.color)
        .attr('stroke-width', 2.5)
        .attr('d', line);

      g.selectAll(`.dot-${s.key}`)
        .data(visibleMonths)
        .join('circle')
        .attr('class', `dot-${s.key}`)
        .attr('cx', (m) => (x(m.month) ?? 0) + x.bandwidth() / 2)
        .attr('cy', (m) => y(s.getValue(m)))
        .attr('r', 3.5)
        .attr('fill', s.color);
    });

    // ชั้นโปร่งใสสำหรับจับ hover ทั้งคอลัมน์เดือน + แสดง focus indicator
    g.selectAll('.hit')
      .data(visibleMonths)
      .join('rect')
      .attr('class', 'hit')
      .attr('x', (m) => x(m.month) ?? 0)
      .attr('y', 0)
      .attr('width', x.bandwidth())
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .style('cursor', 'pointer')
      .on('mouseenter', (_event, m) => {
        const idx = visibleMonths.indexOf(m);
        setFocusIndex(idx);
      })
      .on('mouseleave', () => setFocusIndex(null));

    if (focusIndex !== null && visibleMonths[focusIndex]) {
      const m = visibleMonths[focusIndex];
      const cx = (x(m.month) ?? 0) + x.bandwidth() / 2;
      g.append('line')
        .attr('x1', cx)
        .attr('x2', cx)
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .attr('stroke', '#cbd5e1')
        .attr('stroke-dasharray', '4 3');

      const rect = svgRef.current.getBoundingClientRect();
      setTooltip({ x: rect.left + margin.left + cx, y: rect.top + margin.top, month: m });
    } else {
      setTooltip((t) => (t ? null : t));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, range, visibleMonths, focusIndex]);

  function moveFocus(delta: number) {
    setFocusIndex((prev) => {
      const base = prev ?? visibleMonths.length - 1;
      const next = Math.min(visibleMonths.length - 1, Math.max(0, base + delta));
      return next;
    });
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-slate-900">Financial Health Overview</h2>
          <DemoBadge label="ข้อมูลสาธิต — ไม่ใช่ยอดจริง" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 p-0.5 text-xs">
            {([6, 12] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`rounded-md px-2.5 py-1.5 font-medium ${range === r ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                {r} เดือน
              </button>
            ))}
          </div>
          <div className="flex flex-wrap rounded-lg border border-slate-200 p-0.5 text-xs">
            {(Object.keys(VIEW_LABELS) as ViewMode[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`rounded-md px-2.5 py-1.5 font-medium ${view === v ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                {VIEW_LABELS[v]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiPill label="Loan-to-Deposit Ratio" result={ldr} />
        <KpiPill label="การเติบโตเงินฝาก 12 เดือน" result={depositGrowth} />
        <KpiPill label="การเติบโตเงินกู้ 12 เดือน" result={loanGrowth} />
        <KpiPill label="ส่วนต่างเงินฝาก-เงินกู้" result={gap} suffix=" บาท" />
      </div>

      <div
        ref={containerRef}
        className="relative mt-4"
        tabIndex={0}
        role="group"
        aria-label="กราฟรายเดือน ใช้ปุ่มลูกศรซ้าย-ขวาเพื่อดูข้อมูลแต่ละเดือน"
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            moveFocus(-1);
          } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            moveFocus(1);
          }
        }}
      >
        <div className="flex items-center justify-end gap-1 pb-1">
          <button
            type="button"
            aria-label="เดือนก่อนหน้า"
            onClick={() => moveFocus(-1)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            aria-label="เดือนถัดไป"
            onClick={() => moveFocus(1)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <svg ref={svgRef} className="w-full" style={{ height: 320 }} />
        {tooltip && (
          <div
            className="pointer-events-none fixed z-40 -translate-x-1/2 -translate-y-full rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg"
            style={{ left: tooltip.x, top: tooltip.y - 8 }}
            role="status"
          >
            <p className="font-medium">{formatThaiMonthYear(tooltip.month.month)}</p>
            <p className="tabular-nums">เงินฝากรวม: {formatTHB(tooltip.month.totalDeposit)}</p>
            <p className="tabular-nums">เงินต้นสินเชื่อคงเหลือ: {formatTHB(tooltip.month.totalLoanPrincipal)}</p>
            <p className="tabular-nums">เงินต้นค้างชำระ: {formatTHB(tooltip.month.totalOverduePrincipal)}</p>
          </div>
        )}
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left font-medium">เดือน</th>
              <th className="px-3 py-2 text-right font-medium">เงินฝากรวม</th>
              <th className="px-3 py-2 text-right font-medium">เงินต้นสินเชื่อคงเหลือ</th>
              <th className="px-3 py-2 text-right font-medium">เงินต้นค้างชำระ</th>
              <th className="px-3 py-2 text-right font-medium">อัตราส่วนค้างชำระ</th>
              <th className="px-3 py-2 text-right font-medium">LDR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleMonths.map((m) => {
              const overdueRatio = calcOverdueRatio(m.totalOverduePrincipal, m.totalLoanPrincipal);
              const monthLdr = calcLDR(m.totalLoanPrincipal, m.totalDeposit);
              return (
                <tr key={m.month} className={focusIndex !== null && visibleMonths[focusIndex]?.month === m.month ? 'bg-emerald-50/50' : ''}>
                  <td className="px-3 py-2 text-left text-slate-700">{formatThaiMonthYear(m.month)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatTHB(m.totalDeposit)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatTHB(m.totalLoanPrincipal)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatTHB(m.totalOverduePrincipal)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{overdueRatio.ok ? `${overdueRatio.value.toFixed(2)}%` : '—'}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{monthLdr.ok ? `${monthLdr.value.toFixed(2)}%` : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-400">
        LDR = เงินต้นสินเชื่อคงเหลือ ÷ เงินฝากรวม × 100 · Growth = (ยอดล่าสุด − ยอดฐาน) ÷ ยอดฐาน × 100 ·
        หน่วยเงินเป็นบาทไทย (THB) · อัตราส่วนค้างชำระไม่ใช่ NPL เนื่องจากไม่มีเกณฑ์อายุหนี้รองรับ
      </p>
    </section>
  );
}
