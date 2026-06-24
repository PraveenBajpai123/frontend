"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useStudentStore } from "@/lib/store";
import { subtopics as subtopicsAPI, sessions as sessionsAPI } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { RouteGuard } from "@/components/route-guard";
import { BloomRadarChart } from "@/components/bloom-radar-chart";
import { InsightChips } from "@/components/insight-chips";
import { ConceptForgettingCurve } from "@/components/concept-forgetting-curve";

const API_BASE = "http://localhost:3700";

interface Subtopic {
  id: string;
  title: string;
}

interface GeneratedResult {
  sessionId: string;
  title: string;
  passage: string;
  questions: any[];
}

interface Concept {
  conceptId: string;
  conceptName: string;
  tag: string;
  effectiveMastery: number; // 0-100
  mastery: number;          // 0-100
  retentionScore: number;   // 0-100
  daysSinceAttempt: number;
  consecutiveWrong: number;
  velocity: number;
  attempts: number;
  // Bloom's taxonomy cognitive-level scores (0-100, optional — absent until first attempt)
  recallScore?:      number;
  vocabularyScore?:  number;
  causeEffectScore?: number;
  inferenceScore?:   number;
  applicationScore?: number;
  // Forgetting-curve fields (null = concept never attempted)
  halfLifeDays?:   number | null;
  lastAttempted?:  string | null;  // ISO date string
  nextReviewDate?: string | null;  // ISO date string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function masteryLabel(pct: number): { text: string; color: string; bg: string } {
  if (pct < 30) return { text: "CRITICAL GAP", color: "#ef4444", bg: "rgba(239,68,68,0.1)" };
  if (pct < 50) return { text: "WEAK",         color: "#f97316", bg: "rgba(249,115,22,0.1)" };
  if (pct < 75) return { text: "DEVELOPING",   color: "#eab308", bg: "rgba(234,179,8,0.1)" };
  return            { text: "STRONG",           color: "#4ade80", bg: "rgba(74,222,128,0.1)" };
}

// SSE status step config
const STATUS_STEPS = [
  { key: "graph",    label: "Fetching your knowledge graph",  icon: "🧠" },
  { key: "gaps",     label: "Analyzing concept gaps",         icon: "🔍" },
  { key: "generate", label: "Generating your content",        icon: "✨" },
];

export default function SubtopicPage() {
  const router   = useRouter();
  const params   = useParams();
  const chapterId  = params.id as string;
  const subtopicId = params.subtopicId as string;

  const student            = useStudentStore((s) => s.student);
  const setCurrentSessionId  = useStudentStore((s) => s.setCurrentSessionId);
  const setCurrentQuestions  = useStudentStore((s) => s.setCurrentQuestions);

  const [subtopic,      setSubtopic]      = useState<Subtopic | null>(null);
  const [statusMsg,     setStatusMsg]     = useState("Initialising…");
  const [activeStep,    setActiveStep]    = useState(0);
  const [result,        setResult]        = useState<GeneratedResult | null>(null);
  const [isLoading,     setIsLoading]     = useState(true);
  const [error,         setError]         = useState("");
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [concepts,      setConcepts]      = useState<Concept[]>([]);
  const [conceptsLoading, setConceptsLoading] = useState(false);

  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  // ── C5 Engagement-signal refs ───────────────────────────────────────────────
  // Refs (not state) so reads/writes never trigger re-renders.
  const passageCardRef   = useRef<HTMLDivElement | null>(null);
  const passageStartTime = useRef<number | null>(null);      // performance.now() when passage mounts
  const maxScrollDepth   = useRef<number>(0);                // 0-100 %

  useEffect(() => {
    if (!chapterId || !subtopicId || !student) return;

    let cancelled = false;

    const run = async () => {
      setIsLoading(true);
      setError("");
      setIsRateLimited(false);
      setResult(null);
      setActiveStep(0);
      setStatusMsg("Initialising…");

      try {
        // 1. Fetch subtopic metadata in parallel with stream start
        subtopicsAPI.get(chapterId, subtopicId, student.id)
          .then((s) => { if (!cancelled) setSubtopic(s); })
          .catch(() => {});

        // 2. Open SSE stream via POST fetch
        const response = await fetch(`${API_BASE}/api/content/generate`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ studentId: student.id, subtopicId }),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err?.error || `HTTP ${response.status}`);
        }

        const reader  = response.body!.getReader();
        readerRef.current = reader;
        const decoder = new TextDecoder();
        let buffer    = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done || cancelled) break;

          buffer += decoder.decode(value, { stream: true });

          // SSE frames separated by double newline
          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";

          for (const frame of frames) {
            if (!frame.trim()) continue;
            const lines     = frame.split("\n");
            let eventType   = "";
            let eventData   = "";

            for (const line of lines) {
              if (line.startsWith("event: ")) eventType = line.slice(7).trim();
              if (line.startsWith("data: "))  eventData = line.slice(6).trim();
            }

            if (eventType === "status") {
              const parsed = JSON.parse(eventData) as { message: string };
              setStatusMsg(parsed.message);

              // Advance visual step based on message content
              if (parsed.message.toLowerCase().includes("knowledge graph")) setActiveStep(0);
              if (parsed.message.toLowerCase().includes("concept"))         setActiveStep(1);
              if (parsed.message.toLowerCase().includes("generating"))      setActiveStep(2);
            }

            if (eventType === "result") {
              const data = JSON.parse(eventData);
              const parsed: GeneratedResult = {
                sessionId: data.sessionId,
                title:     data.title || "Study Material",
                passage:   data.passage,
                questions: (data.questions || []).map((q: any) => ({
                  id:             String(q.index),
                  index:          q.index,
                  text:           q.question,
                  options:        q.options,
                  correctIndex:   q.correctIndex,
                  explanation:    q.explanation,
                  cognitiveLevel: q.cognitiveLevel,
                  difficulty:     q.difficulty,
                  conceptTag:     q.conceptTag,
                })),
              };
              setResult(parsed);
              setCurrentSessionId(parsed.sessionId);
              setCurrentQuestions(parsed.questions);
              setIsLoading(false);
              reader.cancel();
              break;
            }

            if (eventType === "error") {
              const parsed = JSON.parse(eventData);
              throw new Error(parsed?.message || "Generation failed");
            }
          }

          if (result) break;
        }
      } catch (err: any) {
        if (cancelled) return;
        const msg = err?.message || "Unknown error";
        const isRL = msg.toLowerCase().includes("rate") || msg.includes("429");
        setIsRateLimited(isRL);
        setError(isRL
          ? "The AI is busy right now. Please wait a minute and try again."
          : msg
        );
        setIsLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
      readerRef.current?.cancel().catch(() => {});
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId, subtopicId, student]);

  // ── C5: Start scroll-depth tracking when the passage becomes visible ────────
  useEffect(() => {
    if (!result) return;  // passage not yet rendered

    // Record the moment the passage card first appears
    passageStartTime.current = performance.now();
    maxScrollDepth.current   = 0;

    const updateScrollDepth = () => {
      const el = passageCardRef.current;
      if (!el) return;

      // How much of the passage element has scrolled into view?
      const rect          = el.getBoundingClientRect();
      const passageHeight = el.offsetHeight;
      if (passageHeight <= 0) return;

      // Pixels of the passage that have passed the bottom of the viewport
      const scrolledPast = Math.max(0, -rect.top);            // px scrolled above top of viewport
      const visibleFrom  = Math.max(0, rect.top);             // px from viewport top to passage top
      const alreadySeen  = window.innerHeight - visibleFrom;  // px visible from the start
      const totalSeen    = scrolledPast + Math.max(0, alreadySeen);

      const pct = Math.min(100, Math.round((totalSeen / passageHeight) * 100));
      if (pct > maxScrollDepth.current) maxScrollDepth.current = pct;
    };

    // Fire once immediately (student may not need to scroll at all on large screens)
    updateScrollDepth();
    window.addEventListener("scroll", updateScrollDepth, { passive: true });

    return () => {
      window.removeEventListener("scroll", updateScrollDepth);
    };
  }, [result]);

  // ── C5: Fire engagement signal then navigate ──────────────────────────────
  const handleStartQuiz = () => {
    if (result?.sessionId && passageStartTime.current !== null) {
      const timeOnPassageMs = Math.round(performance.now() - passageStartTime.current);
      const scrollDepth     = maxScrollDepth.current;

      // Fire-and-forget — never awaited, never blocks navigation
      sessionsAPI.recordEngagement(result.sessionId, {
        timeOnPassageMs,
        maxScrollDepth: scrollDepth,
      });
    }
    router.push(`/chapter/${chapterId}/subtopic/${subtopicId}/quiz`);
  };

  // Fetch concept mastery once the passage result is available
  useEffect(() => {
    if (!result || !student) return;
    setConceptsLoading(true);
    subtopicsAPI.getConcepts(subtopicId, student.id)
      .then(setConcepts)
      .catch(() => setConcepts([]))  // silent fail — concepts are supplementary
      .finally(() => setConceptsLoading(false));
  }, [result, subtopicId, student]);

  const paragraphs = result?.passage.split(/\n+/).filter(Boolean) ?? [];

  return (
    <RouteGuard>
      <div className="min-h-screen" style={{ background: "#141414", fontFamily: "'Inter', sans-serif" }}>

        {/* Navbar */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-30 px-6 py-4 flex items-center gap-4"
          style={{ background: "rgba(20,20,20,0.9)", backdropFilter: "blur(16px)", borderBottom: "1px solid #222" }}
        >
          <motion.button
            onClick={() => router.push(`/chapter/${chapterId}`)}
            whileHover={{ x: -3 }}
            className="flex items-center gap-2 text-sm font-semibold"
            style={{ color: "#CCEB58" }}
          >
            ← Chapter
          </motion.button>
          <div className="flex-1" />
          {subtopic && (
            <span className="text-gray-400 text-sm hidden sm:block truncate max-w-xs">
              {subtopic.title}
            </span>
          )}
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm" style={{ background: "#CCEB58", color: "#141414" }}>R</div>
        </motion.header>

        <div className="max-w-3xl mx-auto px-6 py-10">

          {/* ── Loading state with live status ── */}
          <AnimatePresence mode="wait">
            {isLoading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-24 gap-10"
              >
                {/* Spinner */}
                <div className="relative w-20 h-20">
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{ border: "2.5px solid transparent", borderTopColor: "#CCEB58" }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
                  />
                  <motion.div
                    className="absolute inset-3 rounded-full"
                    style={{ border: "2px solid transparent", borderTopColor: "rgba(204,235,88,0.25)" }}
                    animate={{ rotate: -360 }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-2xl">
                    {STATUS_STEPS[activeStep]?.icon}
                  </div>
                </div>

                {/* Step pills */}
                <div className="flex flex-col items-center gap-3 w-full max-w-xs">
                  {STATUS_STEPS.map((step, i) => (
                    <motion.div
                      key={step.key}
                      className="flex items-center gap-3 w-full px-4 py-3 rounded-xl"
                      animate={{
                        background: i === activeStep
                          ? "rgba(204,235,88,0.12)"
                          : i < activeStep
                          ? "rgba(204,235,88,0.05)"
                          : "rgba(255,255,255,0.03)",
                        borderColor: i === activeStep
                          ? "rgba(204,235,88,0.4)"
                          : i < activeStep
                          ? "rgba(204,235,88,0.15)"
                          : "rgba(255,255,255,0.06)",
                      }}
                      style={{ border: "1px solid" }}
                      transition={{ duration: 0.3 }}
                    >
                      <span className="text-lg w-6 text-center">
                        {i < activeStep ? "✅" : step.icon}
                      </span>
                      <span
                        className="text-sm font-medium"
                        style={{
                          color: i === activeStep
                            ? "#CCEB58"
                            : i < activeStep
                            ? "#6b7280"
                            : "#374151",
                        }}
                      >
                        {step.label}
                      </span>
                      {i === activeStep && (
                        <motion.div
                          className="ml-auto w-1.5 h-1.5 rounded-full"
                          style={{ background: "#CCEB58" }}
                          animate={{ opacity: [1, 0.2, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        />
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* Live status text */}
                <AnimatePresence mode="wait">
                  <motion.p
                    key={statusMsg}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="text-gray-500 text-sm text-center"
                  >
                    {statusMsg}
                  </motion.p>
                </AnimatePresence>
              </motion.div>
            )}

            {/* ── Error state ── */}
            {!isLoading && error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-16"
              >
                <div className="text-5xl mb-4">{isRateLimited ? "⏳" : "⚠️"}</div>
                <h2 className="text-white font-bold text-xl mb-2">
                  {isRateLimited ? "AI is busy" : "Something went wrong"}
                </h2>
                <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">{error}</p>
                <motion.button
                  onClick={() => window.location.reload()}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-8 py-3 rounded-full font-bold text-sm"
                  style={{ background: "#CCEB58", color: "#141414" }}
                >
                  Try Again
                </motion.button>
              </motion.div>
            )}

            {/* ── Content ── */}
            {!isLoading && !error && result && (
              <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
              >
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                  <motion.span
                    className="inline-block text-xs font-bold tracking-widest mb-3 px-3 py-1 rounded-full"
                    style={{ color: "#CCEB58", background: "rgba(204,235,88,0.1)" }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    STUDY MATERIAL
                  </motion.span>
                  <h1
                    className="font-black text-white leading-tight mb-2"
                    style={{ fontSize: "clamp(1.8rem,4vw,2.8rem)", letterSpacing: "-0.02em" }}
                  >
                    {result.title}
                  </h1>
                  {subtopic && result.title !== subtopic.title && (
                    <p className="text-gray-500 text-sm">{subtopic.title}</p>
                  )}
                </motion.div>

                {/* Passage card — ref used for C5 scroll-depth tracking */}
                <motion.div
                  ref={passageCardRef}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="rounded-2xl p-8 mb-8"
                  style={{ background: "#1e1e1e", border: "1.5px solid #2a2a2a" }}
                >
                  <div className="space-y-4">
                    {paragraphs.map((para, i) => (
                      <motion.p
                        key={i}
                        className="text-gray-300 leading-relaxed text-base"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + i * 0.06 }}
                      >
                        {para}
                      </motion.p>
                    ))}
                  </div>
                </motion.div>

                {/* ── Concept mastery panel ── */}
                <AnimatePresence>
                  {(conceptsLoading || concepts.length > 0) && (
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: 0.25 }}
                      className="rounded-2xl p-6 mb-8"
                      style={{ background: "#1a1a1a", border: "1.5px solid #242424" }}
                    >
                      <div className="flex items-center gap-2 mb-5">
                        <span className="text-lg">🧩</span>
                        <h2 className="text-white font-bold text-sm tracking-wide">Concept Mastery</h2>
                        {conceptsLoading && (
                          <div
                            className="ml-auto w-4 h-4 rounded-full border animate-spin"
                            style={{ borderColor: "#CCEB58 transparent transparent transparent" }}
                          />
                        )}
                      </div>

                      {!conceptsLoading && concepts.length === 0 && (
                        <p className="text-gray-600 text-sm">No concept data yet — complete a quiz to see your breakdown.</p>
                      )}

                      {/* ── Bloom Radar Chart ── */}
                      {!conceptsLoading && concepts.length > 0 && (
                        <BloomRadarChart concepts={concepts} />
                      )}

                      <div className="space-y-4">
                        {concepts.map((c) => {
                          const lbl  = masteryLabel(c.effectiveMastery);
                          const warn = c.daysSinceAttempt > 2;
                          return (
                            <motion.div
                              key={c.conceptId}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="space-y-2"
                            >
                              {/* Row: name + label + warning */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-white text-sm font-semibold flex-1 min-w-0 truncate">
                                  {c.conceptName}
                                </span>

                                {/* Grade pill */}
                                <span
                                  className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                                  style={{ background: lbl.bg, color: lbl.color }}
                                >
                                  {lbl.text}
                                </span>

                                {/* Retention warning */}
                                {warn && (
                                  <span
                                    className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                                    style={{ background: "rgba(251,191,36,0.1)", color: "#fbbf24" }}
                                    title={`Retention: ${c.retentionScore}% — last attempted ${c.daysSinceAttempt}d ago`}
                                  >
                                    ⏰ Review ({c.daysSinceAttempt}d ago)
                                  </span>
                                )}
                              </div>

                              {/* Progress bar */}
                              <div className="h-2 rounded-full overflow-hidden" style={{ background: "#252525" }}>
                                <motion.div
                                  className="h-full rounded-full"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${c.effectiveMastery}%` }}
                                  transition={{ duration: 0.7, ease: "easeOut" }}
                                  style={{ background: lbl.color }}
                                />
                              </div>

                              {/* ── Insight Chips: velocity / trend / streak ── */}
                              {c.attempts > 0 && (
                                <InsightChips
                                  velocity={c.velocity}
                                  consecutiveWrong={c.consecutiveWrong}
                                  conceptName={c.conceptName}
                                />
                              )}

                              {/* ── Per-concept Forgetting Curve (C2) ── */}
                              <ConceptForgettingCurve
                                conceptName={c.conceptName}
                                halfLifeDays={c.halfLifeDays ?? null}
                                lastAttempted={c.lastAttempted ?? null}
                                nextReviewDate={c.nextReviewDate ?? null}
                              />

                              {/* Meta row */}
                              <div className="flex items-center gap-3 text-xs" style={{ color: "#555" }}>
                                <span>{c.effectiveMastery}% mastery</span>
                                {c.attempts > 0 && <span>· {c.attempts} attempt{c.attempts !== 1 ? "s" : ""}</span>}
                                {warn && <span>· retention {c.retentionScore}%</span>}
                                {c.consecutiveWrong > 0 && (
                                  <span style={{ color: "#ef4444" }}>· {c.consecutiveWrong}✗ streak</span>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* CTA */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                  <motion.button
                    onClick={handleStartQuiz}
                    whileHover={{ scale: 1.03, boxShadow: "0 0 40px rgba(204,235,88,0.3)" }}
                    whileTap={{ scale: 0.97 }}
                    className="w-full py-4 rounded-2xl font-bold text-lg transition-all"
                    style={{ background: "#CCEB58", color: "#141414", boxShadow: "0 0 24px rgba(204,235,88,0.2)" }}
                  >
                    Take Quiz →
                  </motion.button>
                  <p className="text-gray-600 text-xs text-center mt-3">
                    5 adaptive questions based on this passage
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </RouteGuard>
  );
}
