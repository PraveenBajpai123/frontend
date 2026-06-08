"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useStudentStore } from "@/lib/store";
import { review as reviewAPI, quiz as quizAPI } from "@/lib/api";
import { RouteGuard } from "@/components/route-guard";

// ─── Types ────────────────────────────────────────────────────────────────────

interface QueueItem {
  conceptName: string;
  retentionScore: number;
  overdueDays: number;
  halfLifeDays: number;
  daysSinceAttempt: number | null;
}

interface Question {
  id: string;
  index: number;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  cognitiveLevel: string;
  difficulty: number;
  conceptTag: string;
}

type Phase = "loading-queue" | "queue" | "generating" | "quiz" | "results";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function RetentionBar({ value }: { value: number }) {
  const color = value >= 70 ? "#CCEB58" : value >= 40 ? "#facc15" : "#ef4444";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#252525" }}>
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.6 }}
          style={{ background: color }}
        />
      </div>
      <span className="text-xs font-bold w-9 text-right" style={{ color }}>
        {value}%
      </span>
    </div>
  );
}

function ResultCard({ q, isCorrect, userAns }: { q: Question; isCorrect: boolean; userAns: number | undefined }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: isCorrect ? "rgba(204,235,88,0.07)" : "rgba(239,68,68,0.07)",
        border: `1px solid ${isCorrect ? "rgba(204,235,88,0.2)" : "rgba(239,68,68,0.2)"}`,
      }}
    >
      <div className="p-3 flex items-start gap-3">
        <span className="text-sm mt-0.5 flex-shrink-0">{isCorrect ? "✓" : "✗"}</span>
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-medium leading-snug">{q.text}</p>
          {!isCorrect && (
            <p className="text-gray-400 text-xs mt-1">
              Your answer: <span style={{ color: "#ef4444" }}>{userAns !== undefined ? q.options[userAns] : "—"}</span>
              {"  ·  "}
              Correct: <span style={{ color: "#CCEB58" }}>{q.options[q.correctIndex]}</span>
            </p>
          )}
          {q.explanation && (
            <button
              onClick={() => setOpen((v) => !v)}
              className="text-xs font-semibold mt-1.5"
              style={{ color: isCorrect ? "#CCEB58" : "#f87171" }}
            >
              {open ? "Hide ▲" : "Why? ▼"}
            </button>
          )}
        </div>
      </div>
      {open && q.explanation && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="px-4 pb-3"
        >
          <div className="rounded-lg p-3 text-xs leading-relaxed" style={{ background: "rgba(255,255,255,0.04)", color: "#bbb" }}>
            💡 {q.explanation}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ReviewPage() {
  const router = useRouter();
  const student = useStudentStore((s) => s.student);

  const [phase, setPhase] = useState<Phase>("loading-queue");
  const [statusMsg, setStatusMsg] = useState("Loading your review queue…");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [totalDue, setTotalDue] = useState(0);

  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [passage, setPassage] = useState("");
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [reviewedCount, setReviewedCount] = useState(0);

  // Quiz state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<number, number>>(new Map());
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState<any>(null);

  // Load queue on mount
  useEffect(() => {
    if (!student?.id) return;
    reviewAPI
      .getQueue(student.id, 10)
      .then((data) => {
        setTotalDue(data.totalDue);
        setQueue(data.concepts);
        setPhase("queue");
      })
      .catch(() => {
        setStatusMsg("Could not load review queue.");
        setPhase("queue");
      });
  }, [student?.id]);

  const startReview = async () => {
    if (!student?.id) return;
    setPhase("generating");
    setStatusMsg("Checking your review queue…");
    try {
      const result = await reviewAPI.startSession(student.id, 5, (msg) => setStatusMsg(msg));
      setSessionId(result.sessionId);
      setTitle(result.title);
      setPassage(result.passage);
      setQuestions(result.questions);
      setReviewedCount(result.reviewedConceptCount);
      setPhase("quiz");
    } catch (err: any) {
      setStatusMsg(err?.message ?? "Failed to generate review session. Please try again.");
      setPhase("queue");
    }
  };

  const handleSelect = (optIdx: number) => {
    if (submitted) return;
    setAnswers(new Map(answers).set(currentIndex, optIdx));
  };

  const handleSubmit = async () => {
    if (!student?.id || !sessionId) return;
    setIsSubmitting(true);
    try {
      const payload = Array.from(answers.entries()).map(([qi, sel]) => ({
        questionIndex: qi,
        selectedOption: sel,
      }));
      const res = await quizAPI.submitAnswers(sessionId, student.id, payload);
      setResults(res);
      setSubmitted(true);
      setPhase("results");
    } catch {
      // stay on quiz if submission fails — let student retry
    } finally {
      setIsSubmitting(false);
    }
  };

  const correctCount = questions.filter((q, i) => answers.get(i) === q.correctIndex).length;
  const scorePercent = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
  const current = questions[currentIndex];
  const selectedAnswer = answers.get(currentIndex);
  const allAnswered = answers.size === questions.length;

  // ── Loading queue ────────────────────────────────────────────────────────
  if (phase === "loading-queue") {
    return (
      <RouteGuard>
        <div className="min-h-screen flex items-center justify-center" style={{ background: "#141414" }}>
          <div className="text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
              className="w-10 h-10 rounded-full border-2 border-t-transparent mx-auto mb-4"
              style={{ borderColor: "#CCEB58", borderTopColor: "transparent" }}
            />
            <p className="text-gray-400 text-sm">{statusMsg}</p>
          </div>
        </div>
      </RouteGuard>
    );
  }

  // ── Generating ───────────────────────────────────────────────────────────
  if (phase === "generating") {
    return (
      <RouteGuard>
        <div className="min-h-screen flex items-center justify-center" style={{ background: "#141414" }}>
          <div className="text-center max-w-xs">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 rounded-full border-2 border-t-transparent mx-auto mb-5"
              style={{ borderColor: "#CCEB58", borderTopColor: "transparent" }}
            />
            <p className="text-white font-semibold mb-1">Building your review session</p>
            <p className="text-gray-500 text-sm">{statusMsg}</p>
          </div>
        </div>
      </RouteGuard>
    );
  }

  // ── Queue overview ───────────────────────────────────────────────────────
  if (phase === "queue") {
    const hasQueue = totalDue > 0;
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
            <motion.button onClick={() => router.push("/dashboard")} whileHover={{ x: -3 }} className="text-sm font-semibold" style={{ color: "#CCEB58" }}>
              ← Dashboard
            </motion.button>
            <div className="flex-1" />
            <span className="text-gray-500 text-xs font-medium">Spaced Review</span>
          </motion.header>

          <div className="max-w-xl mx-auto px-6 py-10">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-xs font-bold tracking-widest mb-2" style={{ color: "#CCEB58" }}>SPACED REPETITION</p>
              <h1 className="font-black text-white text-3xl mb-1" style={{ letterSpacing: "-0.02em" }}>
                {hasQueue ? `${totalDue} Concepts Fading` : "You're all caught up! 🎉"}
              </h1>
              <p className="text-gray-500 text-sm mb-8">
                {hasQueue
                  ? "Review now to lock these into long-term memory before they slip away."
                  : "No concepts are due for review right now. Come back later or keep studying new material."}
              </p>

              {hasQueue && queue.length > 0 && (
                <div className="space-y-3 mb-8">
                  {queue.map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="rounded-xl p-4"
                      style={{ background: "#1e1e1e", border: "1px solid #2a2a2a" }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-white text-sm font-semibold">{item.conceptName}</p>
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{
                            background: item.overdueDays > 7 ? "rgba(239,68,68,0.15)" : "rgba(250,204,21,0.12)",
                            color: item.overdueDays > 7 ? "#f87171" : "#facc15",
                          }}
                        >
                          {item.overdueDays > 0 ? `${Math.round(item.overdueDays)}d overdue` : "Due now"}
                        </span>
                      </div>
                      <RetentionBar value={item.retentionScore} />
                      <p className="text-gray-600 text-xs mt-1.5">
                        {item.daysSinceAttempt !== null
                          ? `Last seen ${Math.round(item.daysSinceAttempt)} days ago · Half-life: ${item.halfLifeDays}d`
                          : "Half-life: " + item.halfLifeDays + "d"}
                      </p>
                    </motion.div>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <motion.button
                  onClick={() => router.push("/dashboard")}
                  whileHover={{ scale: 1.02 }}
                  className="flex-1 py-3 rounded-full font-bold text-sm"
                  style={{ background: "#1e1e1e", border: "1px solid #2a2a2a", color: "#fff" }}
                >
                  ← Back
                </motion.button>
                {hasQueue && (
                  <motion.button
                    onClick={startReview}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 py-3 rounded-full font-bold text-sm"
                    style={{ background: "#CCEB58", color: "#141414" }}
                  >
                    Start Review →
                  </motion.button>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </RouteGuard>
    );
  }

  // ── Results ──────────────────────────────────────────────────────────────
  if (phase === "results") {
    const passed = scorePercent >= 60;
    return (
      <RouteGuard>
        <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#141414", fontFamily: "'Inter', sans-serif" }}>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full text-center">
            <motion.div
              className="w-20 h-20 rounded-full flex items-center justify-center text-3xl mx-auto mb-5"
              style={{ background: passed ? "rgba(204,235,88,0.15)" : "rgba(239,68,68,0.1)" }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              {passed ? "🧠" : "📖"}
            </motion.div>
            <h1 className="font-black text-white text-4xl mb-1">{scorePercent}%</h1>
            <p className="font-semibold mb-0.5" style={{ color: passed ? "#CCEB58" : "#ef4444" }}>
              {passed ? "Memory reinforced!" : "Keep reviewing!"}
            </p>
            <p className="text-gray-500 text-sm mb-2">
              {correctCount} of {questions.length} correct
            </p>
            <p className="text-gray-600 text-xs mb-6">
              {reviewedCount} concept{reviewedCount !== 1 ? "s" : ""} reviewed ·{" "}
              {passed
                ? "Their half-lives have grown — memory is consolidating."
                : "These concepts have been reset for earlier review."}
            </p>

            <div className="space-y-2 mb-6 text-left">
              {questions.map((q, i) => {
                const ua = answers.get(i);
                return (
                  <ResultCard key={i} q={q} isCorrect={ua === q.correctIndex} userAns={ua} />
                );
              })}
            </div>

            <div className="flex gap-3">
              <motion.button
                onClick={() => router.push("/dashboard")}
                whileHover={{ scale: 1.02 }}
                className="flex-1 py-3 rounded-full font-bold text-sm"
                style={{ background: "#1e1e1e", border: "1px solid #2a2a2a", color: "#fff" }}
              >
                ← Dashboard
              </motion.button>
              <motion.button
                onClick={() => {
                  setPhase("queue");
                  setAnswers(new Map());
                  setSubmitted(false);
                  setCurrentIndex(0);
                }}
                whileHover={{ scale: 1.02 }}
                className="flex-1 py-3 rounded-full font-bold text-sm"
                style={{ background: "#CCEB58", color: "#141414" }}
              >
                Review Again
              </motion.button>
            </div>
          </motion.div>
        </div>
      </RouteGuard>
    );
  }

  // ── Quiz ─────────────────────────────────────────────────────────────────
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

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
          <span className="text-sm font-semibold" style={{ color: "#CCEB58" }}>🧠 Review Session</span>
          <div className="flex-1" />
          <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}>
            {reviewedCount} concepts
          </span>
          <span className="text-gray-500 text-xs">{answers.size}/{questions.length} answered</span>
        </motion.header>

        <div className="max-w-2xl mx-auto px-6 py-8">
          {/* Passage */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-5 mb-6"
            style={{ background: "#1a1a1a", border: "1px solid #252525" }}
          >
            <p className="text-xs font-bold tracking-widest mb-2" style={{ color: "#CCEB58" }}>REVIEW PASSAGE</p>
            <h2 className="text-white font-black text-lg mb-3">{title}</h2>
            <p className="text-gray-400 text-sm leading-relaxed">{passage}</p>
          </motion.div>

          {/* Progress */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-white font-semibold text-sm">
                Question {currentIndex + 1} <span className="text-gray-600">of {questions.length}</span>
              </span>
              <span className="text-xs font-bold" style={{ color: "#CCEB58" }}>{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#252525" }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: "#CCEB58" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </motion.div>

          {/* Question */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.22 }}
              className="rounded-2xl p-6 mb-5"
              style={{ background: "#1e1e1e", border: "1.5px solid #2a2a2a" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(204,235,88,0.1)", color: "#CCEB58" }}>
                  {current?.cognitiveLevel?.replace(/_/g, " ").toUpperCase() || "Q"}
                </span>
                <span className="text-xs text-gray-600">difficulty {current?.difficulty?.toFixed(1)}</span>
              </div>
              <h3 className="text-white font-semibold text-base leading-snug">{current?.text}</h3>
            </motion.div>
          </AnimatePresence>

          {/* Options */}
          <div className="space-y-3 mb-6">
            {(current?.options || []).map((option: string, i: number) => {
              const isSelected = selectedAnswer === i;
              return (
                <motion.button
                  key={i}
                  onClick={() => handleSelect(i)}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full text-left rounded-xl p-4 flex items-start gap-3"
                  style={{
                    background: isSelected ? "rgba(204,235,88,0.08)" : "#1a1a1a",
                    border: `1.5px solid ${isSelected ? "#CCEB58" : "#252525"}`,
                    boxShadow: isSelected ? "0 0 16px rgba(204,235,88,0.1)" : "none",
                  }}
                >
                  <span
                    className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                    style={{ background: isSelected ? "#CCEB58" : "#252525", color: isSelected ? "#141414" : "#666" }}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="text-sm leading-snug mt-0.5" style={{ color: isSelected ? "#CCEB58" : "#ccc" }}>
                    {option}
                  </span>
                </motion.button>
              );
            })}
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            <motion.button
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
              whileHover={currentIndex > 0 ? { scale: 1.02 } : {}}
              className="px-6 py-3 rounded-full font-bold text-sm disabled:opacity-30"
              style={{ background: "#1e1e1e", border: "1px solid #2a2a2a", color: "#fff" }}
            >
              ← Prev
            </motion.button>
            {currentIndex < questions.length - 1 ? (
              <motion.button
                onClick={() => setCurrentIndex((i) => i + 1)}
                disabled={selectedAnswer === undefined}
                whileHover={selectedAnswer !== undefined ? { scale: 1.02 } : {}}
                className="flex-1 py-3 rounded-full font-bold text-sm disabled:opacity-30"
                style={{
                  background: selectedAnswer !== undefined ? "#CCEB58" : "#1e1e1e",
                  color: selectedAnswer !== undefined ? "#141414" : "#555",
                  border: "1px solid #2a2a2a",
                }}
              >
                Next →
              </motion.button>
            ) : (
              <motion.button
                onClick={handleSubmit}
                disabled={isSubmitting || !allAnswered}
                whileHover={allAnswered ? { scale: 1.02 } : {}}
                className="flex-1 py-3 rounded-full font-bold text-sm disabled:opacity-30"
                style={{
                  background: allAnswered ? "#CCEB58" : "#1e1e1e",
                  color: allAnswered ? "#141414" : "#555",
                  border: "1px solid #2a2a2a",
                }}
              >
                {isSubmitting ? "Submitting…" : `Submit Review (${answers.size}/${questions.length})`}
              </motion.button>
            )}
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-2 mt-5">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className="transition-all rounded-full"
                style={{
                  width: i === currentIndex ? 20 : 8,
                  height: 8,
                  background: answers.has(i) ? "#CCEB58" : i === currentIndex ? "#555" : "#2a2a2a",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </RouteGuard>
  );
}
