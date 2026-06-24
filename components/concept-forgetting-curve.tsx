"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Area,
  AreaChart,
  CartesianGrid,
} from "recharts";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ConceptForgettingCurveProps {
  conceptName:    string;
  halfLifeDays:   number | null;
  lastAttempted:  string | null;  // ISO date string
  nextReviewDate: string | null;  // ISO date string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Ebbinghaus retention: R = e^(-t / h) */
function retention(t: number, halfLifeDays: number): number {
  return Math.exp(-t / halfLifeDays);
}

/** Days elapsed from a given ISO date to now (can be negative if date is future) */
function daysSince(isoDate: string): number {
  const then = new Date(isoDate).getTime();
  const now  = Date.now();
  return (now - then) / (1000 * 60 * 60 * 24);
}

/** Format ISO date as "Wed, Jun 25" */
function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-US", {
    weekday: "short",
    month:   "short",
    day:     "numeric",
  });
}

/** Colour the retention arc: green → yellow → orange → red */
function retentionColor(r: number): string {
  if (r >= 0.70) return "#4ade80";   // green
  if (r >= 0.50) return "#CCEB58";   // lime/brand
  if (r >= 0.30) return "#fbbf24";   // amber
  return "#ef4444";                   // red
}

// ── Custom tooltip ────────────────────────────────────────────────────────────

function CurveTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const val: number = payload[0]?.value ?? 0;
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs font-semibold shadow-xl"
      style={{ background: "#1e1e1e", border: "1px solid #333", color: "#fff" }}
    >
      <span style={{ color: "#888" }}>{label}  </span>
      <span style={{ color: retentionColor(val / 100) }}>{Math.round(val)}%</span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ConceptForgettingCurve({
  conceptName,
  halfLifeDays,
  lastAttempted,
  nextReviewDate,
}: ConceptForgettingCurveProps) {

  // ── Graceful degrade: never attempted ─────────────────────────────────────
  if (!lastAttempted || !halfLifeDays || halfLifeDays <= 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="rounded-xl px-4 py-4 mt-3 flex items-center gap-3"
        style={{ background: "#141414", border: "1px dashed #2a2a2a" }}
      >
        <span className="text-xl flex-shrink-0">🧪</span>
        <p className="text-gray-600 text-xs leading-relaxed">
          Not yet evaluated. Start a quiz to map your memory profile.
        </p>
      </motion.div>
    );
  }

  // ── Compute curve data ─────────────────────────────────────────────────────

  const { chartData, currentRetention } = useMemo(() => {
    const elapsed   = daysSince(lastAttempted);   // days since last quiz
    const horizon   = 8;                          // days forward to project
    const step      = 0.5;                        // sample every 0.5 days for smooth curve

    const points: { label: string; retention: number; t: number }[] = [];

    for (let i = 0; i <= horizon; i += step) {
      const t = elapsed + i;   // total days since last attempt at this future point
      const r = retention(Math.max(0, t), halfLifeDays) * 100;

      let label = "";
      // Only label whole-day integers: Today, +2d, +4d, +6d, +8d
      if (Number.isInteger(i)) {
        label = i === 0 ? "Today" : `+${i}d`;
      }
      points.push({ label, retention: Math.round(r * 10) / 10, t: i });
    }

    // Current retention = retention at t = elapsed days since last quiz
    const cur = retention(Math.max(0, elapsed), halfLifeDays);
    return { chartData: points, currentRetention: cur };
  }, [halfLifeDays, lastAttempted]);

  const curColor    = retentionColor(currentRetention);
  const curPct      = Math.round(currentRetention * 100);
  const reviewByStr = nextReviewDate ? formatDate(nextReviewDate) : null;

  // ── UI ─────────────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="mt-3 rounded-xl p-4"
      style={{ background: "#141414", border: "1px solid #222" }}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm">📉</span>
        <span className="text-xs font-bold text-gray-400 tracking-wide uppercase">
          Memory Decay
        </span>
        <span
          className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ color: curColor, background: `${curColor}18`, border: `1px solid ${curColor}30` }}
        >
          {curPct}% now
        </span>
      </div>

      {/* Chart */}
      <div style={{ width: "100%", height: 100 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 4, right: 4, bottom: 0, left: -24 }}
          >
            <defs>
              <linearGradient id={`grad-${conceptName}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={curColor} stopOpacity={0.25} />
                <stop offset="95%" stopColor={curColor} stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#1e1e1e"
              vertical={false}
            />

            <XAxis
              dataKey="label"
              tick={{ fill: "#444", fontSize: 9, fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
              interval={1}   // show every other sample so only labeled points show
              // Filter to only show non-empty labels
              tickFormatter={(v: string) => v}
            />

            <YAxis
              domain={[0, 100]}
              tick={{ fill: "#333", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              tickCount={3}
              tickFormatter={(v: number) => `${v}%`}
            />

            {/* 50% half-life reference line */}
            <ReferenceLine
              y={50}
              stroke="#2a2a2a"
              strokeDasharray="4 4"
              label={{ value: "½", fill: "#333", fontSize: 9, position: "insideLeft" }}
            />

            <Tooltip content={<CurveTooltip />} />

            <Area
              type="monotone"
              dataKey="retention"
              stroke={curColor}
              strokeWidth={2}
              fill={`url(#grad-${conceptName})`}
              dot={false}
              activeDot={{ r: 4, fill: curColor, strokeWidth: 0 }}
              isAnimationActive={true}
              animationDuration={800}
              animationEasing="ease-out"
            />

            {/* "Today" marker dot at t=0 */}
            {chartData.length > 0 && (
              <ReferenceLine
                x="Today"
                stroke={curColor}
                strokeOpacity={0.35}
                strokeDasharray="3 3"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Callout row */}
      <div
        className="flex items-center gap-3 mt-3 pt-3"
        style={{ borderTop: "1px solid #1e1e1e" }}
      >
        {/* Current retention badge */}
        <div
          className="flex-shrink-0 rounded-lg px-3 py-1.5 text-center"
          style={{ background: `${curColor}12`, border: `1px solid ${curColor}25` }}
        >
          <p
            className="font-black leading-none"
            style={{ color: curColor, fontSize: "1.1rem" }}
          >
            {curPct}%
          </p>
          <p className="text-gray-600 text-[9px] font-semibold mt-0.5 uppercase tracking-wide">
            retained
          </p>
        </div>

        {/* Text callout */}
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-semibold leading-snug">
            Your memory of{" "}
            <span style={{ color: curColor }}>{conceptName}</span>{" "}
            is at {curPct}% and{" "}
            {currentRetention >= 0.5 ? "holding" : "decaying"}.
          </p>
          {reviewByStr ? (
            <p className="text-gray-500 text-xs mt-0.5">
              Review by{" "}
              <span className="font-bold" style={{ color: "#fbbf24" }}>
                {reviewByStr}
              </span>{" "}
              to consolidate.
            </p>
          ) : (
            <p className="text-gray-600 text-xs mt-0.5">
              Review soon to consolidate your memory.
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
