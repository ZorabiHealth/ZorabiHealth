"use client";

import React, { useState } from "react";
import { Plus, HeartPulse } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Reading {
  date: string;
  hr: number;
  spo2: number;
  sleep: number;
}

const initialReadings: Reading[] = [
  { date: "May 29", hr: 72, spo2: 97, sleep: 7.5 },
  { date: "May 30", hr: 68, spo2: 98, sleep: 8.0 },
  { date: "May 31", hr: 75, spo2: 97, sleep: 6.8 },
  { date: "Jun 01", hr: 80, spo2: 96, sleep: 7.2 },
  { date: "Jun 02", hr: 70, spo2: 99, sleep: 8.5 },
  { date: "Jun 03", hr: 72, spo2: 97, sleep: 7.6 },
  { date: "Jun 04", hr: 74, spo2: 98, sleep: 7.8 },
];

export default function AnalyticsPage() {
  const [readings, setReadings] = useState<Reading[]>(initialReadings);
  const [timeRange, setTimeRange] = useState<"7d" | "30d">("7d");
  const [activeMetric, setActiveMetric] = useState<"hr" | "spo2" | "sleep">("hr");

  // Form State
  const [inputHR, setInputHR] = useState("72");
  const [inputSpO2, setInputSpO2] = useState("98");
  const [inputSleep, setInputSleep] = useState("7.5");
  const [inputDate, setInputDate] = useState("Jun 05");

  // Handle New Log Submission
  const handleLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hrVal = parseInt(inputHR);
    const spo2Val = parseInt(inputSpO2);
    const sleepVal = parseFloat(inputSleep);

    if (isNaN(hrVal) || isNaN(spo2Val) || isNaN(sleepVal)) return;

    const newReading: Reading = {
      date: inputDate,
      hr: hrVal,
      spo2: spo2Val,
      sleep: sleepVal,
    };

    setReadings((prev) => [...prev, newReading]);

    // Pendo Track: analytics_reading_logged
    if (typeof window !== 'undefined' && (window as any).pendo) {
      (window as any).pendo.track('analytics_reading_logged', {
        date_label: inputDate,
        heart_rate_bpm: hrVal,
        spo2_percent: spo2Val,
        sleep_hours: sleepVal,
      });
    }

    // Increment date automatically for next entry
    const dayMatch = inputDate.match(/\d+/);
    if (dayMatch) {
      const nextDay = parseInt(dayMatch[0]) + 1;
      const formattedDay = nextDay.toString().padStart(2, "0");
      setInputDate(`Jun ${formattedDay}`);
    }
  };

  // Chart Dimensions & Calculations
  const chartWidth = 650;
  const chartHeight = 260;
  const padding = 40;

  // Min/Max bounds for plotting metrics
  const getBounds = () => {
    if (activeMetric === "hr") return { min: 50, max: 110, label: "bpm" };
    if (activeMetric === "spo2") return { min: 92, max: 100, label: "%" };
    return { min: 4, max: 12, label: "hrs" };
  };

  const bounds = getBounds();

  // Map Data Point to SVG Grid coordinates
  const getCoords = (index: number, val: number) => {
    if (readings.length <= 1) return { x: padding, y: chartHeight / 2 };

    // X Coordinate spacing
    const x = padding + (index / (readings.length - 1)) * (chartWidth - 2 * padding);

    // Y Coordinate based on min/max bounds
    const ratio = (val - bounds.min) / (bounds.max - bounds.min);
    const clampedRatio = Math.max(0, Math.min(1, ratio));
    const y = chartHeight - padding - clampedRatio * (chartHeight - 2 * padding);

    return { x, y };
  };

  // Generate SVG Line path
  const generateLinePath = () => {
    if (readings.length === 0) return "";
    return readings
      .map((r, idx) => {
        const val = activeMetric === "hr" ? r.hr : activeMetric === "spo2" ? r.spo2 : r.sleep;
        const { x, y } = getCoords(idx, val);
        return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  };

  // Generate SVG Area path for gradient fill
  const generateAreaPath = () => {
    if (readings.length === 0) return "";
    const linePath = generateLinePath();
    const firstPoint = getCoords(
      0,
      activeMetric === "hr"
        ? readings[0].hr
        : activeMetric === "spo2"
          ? readings[0].spo2
          : readings[0].sleep
    );
    const lastPoint = getCoords(
      readings.length - 1,
      activeMetric === "hr"
        ? readings[readings.length - 1].hr
        : activeMetric === "spo2"
          ? readings[readings.length - 1].spo2
          : readings[readings.length - 1].sleep
    );

    return `${linePath} L ${lastPoint.x} ${chartHeight - padding} L ${firstPoint.x} ${chartHeight - padding} Z`;
  };

  const metricTitle = {
    hr: "Heart Rate Pulse History",
    spo2: "Oxygen Saturation (SpO2) Levels",
    sleep: "Outpatient Sleep Quality Telemetry",
  };

  return (
    <div className="p-8 space-y-8 w-full min-h-full bg-[#f0f5ff]">
      {/* Header Banner */}
      <header className="flex justify-between items-center bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Diagnostics Analytics</h1>
          <p className="text-slate-500 text-sm font-semibold mt-1">
            Predictive diagnostic curve charts mapped from indicators logs database.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTimeRange("7d")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${timeRange === "7d" ? "bg-brand-500 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            7 Days
          </button>
          <button
            onClick={() => setTimeRange("30d")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${timeRange === "30d" ? "bg-brand-500 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            30 Days
          </button>
        </div>
      </header>

      {/* Main Grid Content */}
      <div className="grid grid-cols-12 gap-8">
        {/* Chart Window (8 Cols) */}
        <section className="col-span-12 lg:col-span-8 bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-between">
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <span className="text-[10px] uppercase font-bold text-brand-600 tracking-wider">
                Predictive Trend
              </span>
              <h2 className="text-xl font-black text-slate-800 mt-1">
                {metricTitle[activeMetric]}
              </h2>
            </div>

            {/* Metric Tab Selector */}
            <div className="flex gap-1.5 bg-slate-50 border border-slate-100 p-1.5 rounded-xl">
              <button
                onClick={() => setActiveMetric("hr")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${activeMetric === "hr" ? "bg-white text-brand-600 shadow-sm border border-slate-100" : "text-slate-500 hover:text-slate-800"}`}
              >
                Heart Rate
              </button>
              <button
                onClick={() => setActiveMetric("spo2")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${activeMetric === "spo2" ? "bg-white text-sky-600 shadow-sm border border-slate-100" : "text-slate-500 hover:text-slate-800"}`}
              >
                SpO2
              </button>
              <button
                onClick={() => setActiveMetric("sleep")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${activeMetric === "sleep" ? "bg-white text-indigo-600 shadow-sm border border-slate-100" : "text-slate-500 hover:text-slate-800"}`}
              >
                Sleep
              </button>
            </div>
          </header>

          {/* Custom SVG Line Chart */}
          <div className="relative border border-slate-50 bg-slate-50/50 rounded-2xl p-6 flex justify-center items-center">
            {readings.length === 0 ? (
              <p className="text-slate-400 text-xs py-20">
                No telemetry log readings recorded. Log vitals to render chart.
              </p>
            ) : (
              <svg
                className="w-full h-auto aspect-[65/26] max-h-[300px]"
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              >
                {/* Grids / Guidelines */}
                <line
                  x1={padding}
                  y1={padding}
                  x2={chartWidth - padding}
                  y2={padding}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                />
                <line
                  x1={padding}
                  y1={chartHeight / 2}
                  x2={chartWidth - padding}
                  y2={chartHeight / 2}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <line
                  x1={padding}
                  y1={chartHeight - padding}
                  x2={chartWidth - padding}
                  y2={chartHeight - padding}
                  stroke="#e2e8f0"
                  strokeWidth="1.5"
                />

                {/* Y-axis Labels */}
                <text
                  x={padding - 10}
                  y={padding + 4}
                  textAnchor="end"
                  className="text-[10px] font-bold fill-slate-400 font-mono"
                >
                  {bounds.max}
                </text>
                <text
                  x={padding - 10}
                  y={chartHeight / 2 + 4}
                  textAnchor="end"
                  className="text-[10px] font-bold fill-slate-400 font-mono"
                >
                  {(bounds.max + bounds.min) / 2}
                </text>
                <text
                  x={padding - 10}
                  y={chartHeight - padding + 4}
                  textAnchor="end"
                  className="text-[10px] font-bold fill-slate-400 font-mono"
                >
                  {bounds.min}
                </text>

                {/* Area Fill Gradient */}
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={
                        activeMetric === "hr"
                          ? "#0ea5e9"
                          : activeMetric === "spo2"
                            ? "#38bdf8"
                            : "#6366f1"
                      }
                      stopOpacity="0.25"
                    />
                    <stop
                      offset="100%"
                      stopColor={
                        activeMetric === "hr"
                          ? "#0ea5e9"
                          : activeMetric === "spo2"
                            ? "#38bdf8"
                            : "#6366f1"
                      }
                      stopOpacity="0.0"
                    />
                  </linearGradient>
                </defs>
                <path d={generateAreaPath()} fill="url(#chartGradient)" />

                {/* Main Curve Line */}
                <path
                  d={generateLinePath()}
                  fill="none"
                  stroke={
                    activeMetric === "hr"
                      ? "#0ea5e9"
                      : activeMetric === "spo2"
                        ? "#0284c7"
                        : "#4f46e5"
                  }
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Data Points */}
                {readings.map((r, idx) => {
                  const val =
                    activeMetric === "hr" ? r.hr : activeMetric === "spo2" ? r.spo2 : r.sleep;
                  const { x, y } = getCoords(idx, val);
                  return (
                    <g key={idx} className="group cursor-pointer">
                      <circle
                        cx={x}
                        cy={y}
                        r="5"
                        className="fill-white stroke-brand-500 stroke-[2.5]"
                      />
                      <circle
                        cx={x}
                        cy={y}
                        r="10"
                        className="fill-brand-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                    </g>
                  );
                })}

                {/* X-axis Labels */}
                {readings.map((r, idx) => {
                  const val =
                    activeMetric === "hr" ? r.hr : activeMetric === "spo2" ? r.spo2 : r.sleep;
                  const { x } = getCoords(idx, val);
                  return (
                    <text
                      key={idx}
                      x={x}
                      y={chartHeight - padding + 22}
                      textAnchor="middle"
                      className="text-[9px] font-bold fill-slate-500"
                    >
                      {r.date}
                    </text>
                  );
                })}
              </svg>
            )}
          </div>
        </section>

        {/* Form Logging Panel (4 Cols) */}
        <section className="col-span-12 lg:col-span-4 bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex gap-2 items-center mb-6">
              <div className="h-10 w-10 rounded-xl bg-brand-50 flex items-center justify-center">
                <HeartPulse className="text-brand-500 h-5.5 w-5.5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800">Add Log Entry</h3>
                <p className="text-slate-500 text-xs font-semibold">
                  Log daily medical indicator stats.
                </p>
              </div>
            </div>

            <form onSubmit={handleLogSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Date Label
                </label>
                <Input
                  type="text"
                  value={inputDate}
                  onChange={(e) => setInputDate(e.target.value)}
                  placeholder="e.g. Jun 05"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Heart Rate (bpm)
                </label>
                <Input
                  type="number"
                  min="30"
                  max="220"
                  value={inputHR}
                  onChange={(e) => setInputHR(e.target.value)}
                  placeholder="e.g. 72"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Oxygen Saturation (%)
                </label>
                <Input
                  type="number"
                  min="50"
                  max="100"
                  value={inputSpO2}
                  onChange={(e) => setInputSpO2(e.target.value)}
                  placeholder="e.g. 98"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Sleep Hours (hrs)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  min="1"
                  max="24"
                  value={inputSleep}
                  onChange={(e) => setInputSleep(e.target.value)}
                  placeholder="e.g. 7.5"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md shadow-brand-500/10 mt-6"
              >
                <Plus className="h-4 w-4" /> Log Reading
              </button>
            </form>
          </div>
        </section>
      </div>

      {/* History Table logs database view */}
      <section className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
        <h3 className="text-lg font-black text-slate-800 mb-6">
          Outpatient Telemetry Logs History
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="pb-4 pl-4">Diagnostic Date</th>
                <th className="pb-4">Heart Rate Frequency</th>
                <th className="pb-4">Oxygen Saturation (SpO2)</th>
                <th className="pb-4">Sleep Telemetry</th>
                <th className="pb-4">Analysis Classification</th>
              </tr>
            </thead>
            <tbody>
              {readings.map((r, idx) => (
                <tr
                  key={idx}
                  className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                >
                  <td className="py-4 pl-4 font-bold text-slate-800">{r.date}</td>
                  <td className="py-4 font-semibold text-slate-600">{r.hr} bpm</td>
                  <td className="py-4 font-semibold text-slate-600">{r.spo2}%</td>
                  <td className="py-4 font-semibold text-slate-600">{r.sleep} hrs</td>
                  <td className="py-4">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        r.hr > 85 || r.spo2 < 95
                          ? "bg-amber-50 text-amber-600 border border-amber-100"
                          : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                      }`}
                    >
                      {r.hr > 85 || r.spo2 < 95 ? "Attention Required" : "Optimal"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
