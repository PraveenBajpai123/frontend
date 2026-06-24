"use client";

import { motion } from "framer-motion";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

// ── Types ────────────────────────────────────────────────────────────────────

interface ConceptBloomScores {
  recallScore?:      number; // 0-100
  vocabularyScore?:  number;
  causeEffectScore?: number;
  inferenceScore?:   number;
  applicationScore?: number;
  attempts?:         number;
}

interface BloomRadarChartProps {
  concepts: ConceptBloomScores[];
}

// ── Bloom axis definitions ────────────────────────────────────────────────────

const BLOOM_AXES = [
  { key: "recallScore",      label: "Recall",       shortLabel: "Recall" },
  { key: "vocabularyScore",  label: "Vocabulary",   shortLabel: "Vocab"  },
  { key: "causeEffectScore", label: "Cause & Effect", shortLabel: "C&E"  },
  { key: "inferenceScore",   label: "Inference",    shortLabel: "Infer"  },
  { key: "applicationScore", label: "Application",  shortLabel: "Apply"  },
] as const;

type BloomKey = typeof BLOOM_AXES[number]["key"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function averageBloomScores(concepts: ConceptBloomScores[]) {
  // Only consider concepts that have at least one attempt
  const active = concepts.filter((c) => (c.attempts ?? 0) > 0);
  if (active.length === 0) return null;

  const sums: Record<BloomKey, number> = {
    recallScore: 0,
    vocabularyScore: 0,
    causeEffectScore: 0,
    inferenceScore: 0,
    applicationScore: 0,
  };

  for (const c of active) {
    for (const axis of BLOOM_AXES) {
      sums[axis.key] += c[axis.key] ?? 0;
    }
  }

  const result: Record<BloomKey, number> = {} as Record<BloomKey, number>;
  for (const axis of BLOOM_AXES) {
    result[axis.key] = Math.round(sums[axis.key] / active.length);
  }
  return result;
}

function getStrongestWeakest(scores: Record<BloomKey, number>) {
  let strongest: typeof BLOOM_AXES[number] = BLOOM_AXES[0];
  let weakest:   typeof BLOOM_AXES[number] = BLOOM_AXES[0];
  for (const axis of BLOOM_AXES) {
    if (scores[axis.key] > scores[strongest.key]) strongest = axis;
    if (scores[axis.key] < scores[weakest.key])   weakest   = axis;
  }
  return { strongest, weakest };
}

// ── Custom tooltip ────────────────────────────────────────────────────────────

function RadarTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs font-semibold shadow-xl"
      style={{ background: "#1e1e1e", border: "1px solid #333", color: "#fff" }}
    >
      <span style={{ color: "#CCEB58" }}>{item.payload.axis}</span>
      <span className="ml-2 text-gray-300">{item.value}%</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function BloomRadarChart({ concepts }: BloomRadarChartProps) {
  const averaged = averageBloomScores(concepts);

  // ── Zero state: no attempts yet ──
  if (!averaged) {
    return (
      <div
        className="rounded-xl px-4 py-5 mb-5 flex flex-col items-center justify-center gap-2 text-center"
        style={{ background: "#141414", border: "1px dashed #2a2a2a" }}
      >
        <span className="text-2xl">🧠</span>
        <p className="text-gray-600 text-xs leading-relaxed max-w-xs">
          Complete a quiz to see your Bloom's Taxonomy breakdown — how you score across Recall, Vocabulary, Cause &amp; Effect, Inference, and Application.
        </p>
      </div>
    );
  }

  // Build recharts data format
  const radarData = BLOOM_AXES.map((axis) => ({
    axis:  axis.label,
    score: averaged[axis.key],
  }));

  const { strongest, weakest } = getStrongestWeakest(averaged);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl p-5 mb-5"
      style={{ background: "#161616", border: "1px solid #242424" }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-base">📊</span>
        <h3 className="text-white font-bold text-sm tracking-wide">
          Cognitive Profile
        </h3>
        <span
          className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full"
          style={{ color: "#CCEB58", background: "rgba(204,235,88,0.08)" }}
        >
          Bloom's Taxonomy
        </span>
      </div>

      {/* Radar chart */}
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
            <PolarGrid
              stroke="#2a2a2a"
              strokeDasharray="3 3"
            />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fill: "#666", fontSize: 11, fontWeight: 600 }}
            />
            <Radar
              name="Score"
              dataKey="score"
              stroke="#CCEB58"
              strokeWidth={2}
              fill="#CCEB58"
              fillOpacity={0.18}
              dot={{ fill: "#CCEB58", r: 3, strokeWidth: 0 }}
              activeDot={{ fill: "#CCEB58", r: 5, strokeWidth: 0 }}
            />
            <Tooltip content={<RadarTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Strongest / Weakest summary chips */}
      <div className="flex flex-wrap gap-2 mt-3 pt-3" style={{ borderTop: "1px solid #222" }}>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-600 font-medium">Strongest:</span>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ color: "#4ade80", background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.25)" }}
          >
            ★ {strongest.label}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-600 font-medium">Weakest:</span>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ color: "#f87171", background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.25)" }}
          >
            ⬇ {weakest.label}
          </span>
        </div>

        {/* Score pills for each axis */}
        <div className="w-full flex flex-wrap gap-1.5 mt-1">
          {BLOOM_AXES.map((axis) => {
            const score = averaged[axis.key];
            const isTop   = axis.key === strongest.key;
            const isLow   = axis.key === weakest.key;
            const dotColor = isTop ? "#4ade80" : isLow ? "#f87171" : "#555";
            return (
              <span
                key={axis.key}
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: "#1e1e1e", color: "#888", border: "1px solid #2a2a2a" }}
              >
                <span style={{ color: dotColor }}>●</span>{" "}
                {axis.shortLabel}{" "}
                <span style={{ color: "#ccc" }}>{score}%</span>
              </span>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
