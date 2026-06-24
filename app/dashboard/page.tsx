"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStudentStore } from "@/lib/store";
import { review } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { RouteGuard } from "@/components/route-guard";
import Link from "next/link";

const SUBJECTS = [
  {
    id: "Chemistry",
    label: "Chemistry",
    emoji: "⚗️",
    desc: "Organic, Inorganic & Physical Chemistry",
    classes: "Class 11 & 12",
    available: true,
    chapters: 20,
    color: "#CCEB58",
  },
  {
    id: "Physics",
    label: "Physics",
    emoji: "⚡",
    desc: "Mechanics, Optics, Electromagnetism & more",
    classes: "Class 11 & 12",
    available: false,
    chapters: 0,
    color: "#60a5fa",
  },
  {
    id: "Biology",
    label: "Biology",
    emoji: "🧬",
    desc: "Botany, Zoology & Human Physiology",
    classes: "Class 11 & 12",
    available: false,
    chapters: 0,
    color: "#34d399",
  },
  {
    id: "Mathematics",
    label: "Mathematics",
    emoji: "∑",
    desc: "Calculus, Algebra, Coordinate Geometry",
    classes: "Class 11 & 12",
    available: false,
    chapters: 0,
    color: "#f472b6",
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const student         = useStudentStore((state) => state.student);
  const chapterProgress = useStudentStore((state) => state.chapterProgress);

  // ── Review-due state ──────────────────────────────────────────────────────
  interface ReviewItem {
    conceptId:        string;
    conceptName:      string;
    tag:              string;
    effectiveMastery: number;
    mastery:          number;
    retentionScore:   number;
    daysSinceAttempt: number;
  }
  const [dueItems,    setDueItems]    = useState<ReviewItem[]>([]);
  const [dueCount,    setDueCount]    = useState(0);
  const [dueLoading,  setDueLoading]  = useState(false);

  useEffect(() => {
    if (!student) return;
    setDueLoading(true);
    review.getQueue(student.id)
      .then(res => {
        setDueCount(res.totalDue);
        setDueItems(res.concepts);
      })
      .catch(() => {
        setDueCount(0);
        setDueItems([]);
      })
      .finally(() => setDueLoading(false));
  }, [student]);

  // ─────────────────────────────────────────────────────────────────────────

  const avgMastery =
    chapterProgress.length > 0
      ? Math.round(chapterProgress.reduce((a, p) => a + p.masteryLevel, 0) / chapterProgress.length)
      : 0;

  return (
    <RouteGuard>
      <div className="min-h-screen relative" style={{ background: "#141414", fontFamily: "'Inter', sans-serif" }}>
        {/* Background orb */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
          <motion.div
            className="absolute rounded-full"
            style={{ width: 600, height: 600, left: "50%", top: "10%", transform: "translateX(-50%)", background: "radial-gradient(circle, rgba(204,235,88,0.05) 0%, transparent 70%)" }}
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Hex corners */}
          {[{ x: "5%", y: "8%" }, { x: "90%", y: "12%" }, { x: "92%", y: "80%" }, { x: "3%", y: "85%" }].map((pos, i) => (
            <motion.div
              key={i}
              className="absolute"
              style={{ left: pos.x, top: pos.y }}
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 25 + i * 5, repeat: Infinity, ease: "linear" }}
            >
              <svg width="60" height="60" viewBox="-30 -30 60 60" opacity={0.08}>
                <polygon
                  points={Array.from({ length: 6 }, (_, k) => {
                    const a = (Math.PI / 3) * k - Math.PI / 6;
                    return `${25 * Math.cos(a)},${25 * Math.sin(a)}`;
                  }).join(" ")}
                  fill="none" stroke="#CCEB58" strokeWidth="1.5"
                />
              </svg>
            </motion.div>
          ))}
        </div>

        {/* Navbar */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-30 px-6 py-4 flex items-center gap-4"
          style={{ background: "rgba(20,20,20,0.88)", backdropFilter: "blur(16px)", borderBottom: "1px solid #222" }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm" style={{ background: "#CCEB58", color: "#141414" }}>R</div>
            <span className="text-white font-bold text-sm hidden sm:block">LearnGraph</span>
          </div>
          <div className="flex-1" />
          <Link href="/progress" className="text-xs font-semibold transition-colors hidden sm:block" style={{ color: "#CCEB58" }}>
            Progress →
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs" style={{ background: "rgba(204,235,88,0.15)", color: "#CCEB58" }}>
              {student?.name?.[0]?.toUpperCase() || "S"}
            </div>
            <span className="text-white text-sm font-medium hidden sm:block">{student?.name?.split(" ")[0]}</span>
          </div>
        </motion.header>

        <div className="relative z-10 max-w-5xl mx-auto px-6 py-12">
          {/* Hero */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-10">
            <motion.p className="text-xs font-bold tracking-widest mb-3" style={{ color: "#CCEB58" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              TRANSFORMING NATION FROM ROOTS TO REALITY
            </motion.p>
            <h1 className="font-black text-white leading-none mb-2" style={{ fontSize: "clamp(2.2rem,5vw,3.5rem)", letterSpacing: "-0.02em" }}>
              Choose Your<br /><span style={{ color: "#CCEB58" }}>Subject</span>
            </h1>
            <p className="text-gray-500 text-base">Pick a subject to explore chapters and start your AI-powered journey.</p>
          </motion.div>

          {/* Stats row */}
          <motion.div className="flex gap-4 mb-12 flex-wrap" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
            {[
              { label: "Chapters Studied", val: chapterProgress.length },
              { label: "Avg Mastery", val: `${avgMastery}%` },
              { label: "Subjects Available", val: "1" },
            ].map((s) => (
              <motion.div key={s.label} variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} className="rounded-xl px-6 py-4 flex-1 min-w-[120px]" style={{ background: "#1e1e1e", border: "1px solid #2a2a2a" }}>
                <p className="text-gray-600 text-xs uppercase tracking-wider font-semibold mb-1">{s.label}</p>
                <p className="text-white text-2xl font-black" style={{ color: "#CCEB58" }}>{s.val}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Subject grid */}
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 gap-5"
            initial="hidden" animate="visible"
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } }}
          >
            {SUBJECTS.map((subj) => (
              <motion.button
                key={subj.id}
                variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } }}
                whileHover={subj.available ? { y: -6, scale: 1.01 } : {}}
                whileTap={subj.available ? { scale: 0.98 } : {}}
                onClick={() => subj.available && router.push(`/subject/${subj.id}`)}
                disabled={!subj.available}
                className="text-left rounded-2xl p-7 relative overflow-hidden group transition-all"
                style={{
                  background: subj.available ? "#1e1e1e" : "#181818",
                  border: `1.5px solid ${subj.available ? "#2a2a2a" : "#1e1e1e"}`,
                  cursor: subj.available ? "pointer" : "not-allowed",
                  opacity: subj.available ? 1 : 0.5,
                }}
                onMouseEnter={(e) => {
                  if (!subj.available) return;
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = subj.color;
                  el.style.boxShadow = `0 8px 32px ${subj.color}20`;
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = subj.available ? "#2a2a2a" : "#1e1e1e";
                  el.style.boxShadow = "none";
                }}
              >
                {/* Hover glow */}
                {subj.available && (
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
                    style={{ background: `radial-gradient(ellipse at top left, ${subj.color}0d 0%, transparent 60%)` }}
                  />
                )}

                <div className="flex items-start justify-between mb-5">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl" style={{ background: `${subj.color}15` }}>
                    {subj.emoji}
                  </div>
                  {subj.available ? (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: `${subj.color}20`, color: subj.color }}>
                      Available
                    </span>
                  ) : (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full text-gray-600" style={{ background: "#252525" }}>
                      Coming Soon
                    </span>
                  )}
                </div>

                <h2 className="text-2xl font-black text-white mb-1">{subj.label}</h2>
                <p className="text-gray-500 text-sm mb-4">{subj.desc}</p>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 font-medium">{subj.classes}</span>
                  {subj.available && (
                    <motion.span className="text-sm font-bold" style={{ color: subj.color }} animate={{ x: [0, 4, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                      Explore →
                    </motion.span>
                  )}
                </div>
              </motion.button>
            ))}
          </motion.div>

          {/* ── Due for Review ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mt-12"
          >
            <div className="flex items-center gap-3 mb-5">
              <span className="text-2xl">⏰</span>
              <div>
                <h2 className="text-white font-black text-xl" style={{ letterSpacing: "-0.01em" }}>Due for Review</h2>
                <p className="text-gray-600 text-xs mt-0.5">Concepts you've learned but may be forgetting</p>
              </div>
              {dueCount > 0 && (
                <span
                  className="ml-auto text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{ background: "rgba(251,191,36,0.12)", color: "#fbbf24" }}
                >
                  {dueCount} due
                </span>
              )}
            </div>

            {/* ── Review Session Banner ── */}
            {!dueLoading && dueCount > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-2xl p-5 mb-5 flex items-center gap-4"
                style={{
                  background: "rgba(251,191,36,0.06)",
                  border: "1.5px solid rgba(251,191,36,0.3)",
                  boxShadow: "0 0 32px rgba(251,191,36,0.05)",
                }}
              >
                <div
                  className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ background: "rgba(251,191,36,0.12)" }}
                >
                  🧠
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm">
                    {dueCount} concept{dueCount !== 1 ? "s" : ""} due for review today
                  </p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    Reinforce before you forget — takes just a few minutes
                  </p>
                </div>
                <motion.button
                  onClick={() => router.push("/review/session")}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex-shrink-0 px-5 py-2.5 rounded-xl font-bold text-sm"
                  style={{ background: "#fbbf24", color: "#141414" }}
                >
                  Start Review →
                </motion.button>
              </motion.div>
            )}

            {/* Loading skeleton */}
            {dueLoading && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="rounded-2xl h-16 animate-pulse"
                    style={{ background: "#1a1a1a" }}
                  />
                ))}
              </div>
            )}

            {/* Empty state */}
            {!dueLoading && dueCount === 0 && (
              <div
                className="rounded-2xl p-8 text-center"
                style={{ background: "#1a1a1a", border: "1px solid #222" }}
              >
                <p className="text-3xl mb-2">✅</p>
                <p className="text-white font-semibold text-sm">All caught up!</p>
                <p className="text-gray-600 text-xs mt-1">No concepts due for review right now.</p>
              </div>
            )}

            {/* Review cards */}
            {!dueLoading && dueCount > 0 && (
              <AnimatePresence>
                <motion.div
                  className="space-y-3"
                  initial="hidden"
                  animate="visible"
                  variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
                >
                  {dueItems.map((item) => {
                    const decay = item.mastery > 0
                      ? Math.round(((item.mastery - item.effectiveMastery) / item.mastery) * 100)
                      : 0;
                    // Tag often looks like "chemical_bonding_covalent_bonds" — prettify it
                    const topicHint = item.tag
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase())
                      .split(" ")
                      .slice(0, 4)
                      .join(" ");

                    return (
                      <motion.div
                        key={item.conceptId}
                        variants={{ hidden: { opacity: 0, x: -16 }, visible: { opacity: 1, x: 0 } }}
                        className="group rounded-2xl p-4 flex items-center gap-4 transition-all"
                        style={{
                          background: "#1a1a1a",
                          border: "1.5px solid #222",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = "#fbbf24";
                          (e.currentTarget as HTMLElement).style.boxShadow = "0 0 20px rgba(251,191,36,0.08)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = "#222";
                          (e.currentTarget as HTMLElement).style.boxShadow = "none";
                        }}
                      >
                        {/* Urgency dot */}
                        <div
                          className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold"
                          style={{ background: "rgba(251,191,36,0.1)", color: "#fbbf24" }}
                        >
                          {item.daysSinceAttempt}d
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold text-sm truncate">{item.conceptName}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-gray-600 text-xs truncate">{topicHint}</span>
                            {decay > 0 && (
                              <span className="text-xs font-semibold flex-shrink-0" style={{ color: "#ef4444" }}>
                                ↓{decay}% decay
                              </span>
                            )}
                          </div>
                          {/* Retention bar */}
                          <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: "#252525" }}>
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${item.effectiveMastery}%`,
                                background: item.effectiveMastery < 30 ? "#ef4444" : item.effectiveMastery < 60 ? "#f97316" : "#eab308",
                              }}
                            />
                          </div>
                        </div>

                        {/* Action */}
                        <Link
                          href="/review/session"
                          className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                          style={{ background: "rgba(251,191,36,0.1)", color: "#fbbf24" }}
                        >
                          Review →
                        </Link>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            )}
          </motion.div>
        </div>
      </div>
    </RouteGuard>
  );
}
