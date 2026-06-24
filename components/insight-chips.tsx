"use client";

import { motion } from "framer-motion";

interface InsightChipsProps {
  velocity:         number;
  consecutiveWrong: number;
  conceptName:      string;
}

interface ChipDef {
  icon:    string;
  label:   string;
  color:   string;
  bg:      string;
  border:  string;
}

function getVelocityChip(velocity: number, conceptName: string): ChipDef | null {
  if (velocity > 0.3)
    return {
      icon:   "↑",
      label:  `Improving fast on ${conceptName}`,
      color:  "#4ade80",
      bg:     "rgba(74,222,128,0.10)",
      border: "rgba(74,222,128,0.25)",
    };
  if (velocity > 0.05)
    return {
      icon:   "↗",
      label:  "On track",
      color:  "#2dd4bf",
      bg:     "rgba(45,212,191,0.10)",
      border: "rgba(45,212,191,0.25)",
    };
  if (velocity >= -0.05)
    return {
      icon:   "→",
      label:  `Plateauing on ${conceptName}`,
      color:  "#fbbf24",
      bg:     "rgba(251,191,36,0.10)",
      border: "rgba(251,191,36,0.25)",
    };
  // velocity < -0.05
  return {
    icon:   "↓",
    label:  "Declining",
    color:  "#f87171",
    bg:     "rgba(248,113,113,0.10)",
    border: "rgba(248,113,113,0.25)",
  };
}

export function InsightChips({ velocity, consecutiveWrong, conceptName }: InsightChipsProps) {
  const chips: ChipDef[] = [];

  // Only show velocity chip if the concept has been attempted at all
  const velocityChip = getVelocityChip(velocity, conceptName);
  if (velocityChip) chips.push(velocityChip);

  // Wrong-answer streak chip
  if (consecutiveWrong >= 3) {
    chips.push({
      icon:   "⚠",
      label:  `${consecutiveWrong} wrong in a row`,
      color:  "#ef4444",
      bg:     "rgba(239,68,68,0.10)",
      border: "rgba(239,68,68,0.25)",
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {chips.map((chip, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.06, duration: 0.2 }}
          className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{
            color:       chip.color,
            background:  chip.bg,
            border:      `1px solid ${chip.border}`,
          }}
        >
          <span className="text-[11px] leading-none">{chip.icon}</span>
          {chip.label}
        </motion.span>
      ))}
    </div>
  );
}
