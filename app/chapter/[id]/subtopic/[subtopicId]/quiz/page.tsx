"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useStudentStore } from "@/lib/store";
import { quiz as quizAPI } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { RouteGuard } from "@/components/route-guard";

const API_BASE = "http://localhost:3700";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Question {
  index: number;
  question: string;
  options: string[];
  cognitiveLevel: string;
  difficulty: number;
  conceptTag: string;
}

interface AnswerResult {
  isCorrect: boolean;
  correctIndex: number;
  explanation: string;
  conceptTag: string;
  totalShown: number;
  totalCorrect: number;
  sessionComplete: boolean;
  nextQuestion: Question | null;
  summary: Summary | null;
}

interface Summary {
  score: number;
  total: number;
  grade: string;
  passed: boolean;
  percentage: number;
  subtopicResult?: any;
}

type Screen = "question" | "feedback" | "done";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeQuestion(q: any): Question {
  return {
    index:          q.index ?? 0,
    question:       q.question ?? q.text ?? "",
    options:        q.options ?? [],
    cognitiveLevel: q.cognitiveLevel ?? "",
    difficulty:     q.difficulty ?? 0,
    conceptTag:     q.conceptTag ?? "",
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function QuizPage() {
  const router     = useRouter();
  const params     = useParams();
  const chapterId  = params.id as string;
  const subtopicId = params.subtopicId as string;

  const student         = useStudentStore((s) => s.student);
  const sessionId       = useStudentStore((s) => s.currentSessionId);
  const initialQuestions = useStudentStore((s) => s.currentQuestions);
  const updateChapterProgress = useStudentStore((s) => s.updateChapterProgress);

  // ── State ──────────────────────────────────────────────────────────────────

  const [screen,         setScreen]         = useState<Screen>("question");
  const [question,       setQuestion]       = useState<Question | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answerResult,   setAnswerResult]   = useState<AnswerResult | null>(null);
  const [summary,        setSummary]        = useState<Summary | null>(null);
  const [isSubmitting,   setIsSubmitting]   = useState(false);
  const [questionsShown, setQuestionsShown] = useState(1);
  const [correct,        setCorrect]        = useState(0);
  const [error,          setError]          = useState("");

  // ── Seed first question from Zustand store ─────────────────────────────────

  useEffect(() => {
    if (initialQuestions && initialQuestions.length > 0) {
      setQuestion(normalizeQuestion(initialQuestions[0]));
    }
  }, []);

  // ── Guard: no session ──────────────────────────────────────────────────────

  if (!sessionId || !student) {
    return (
      <RouteGuard>
        <div className="min-h-screen flex items-center justify-center" style={{ background: "#141414" }}>
          <div className="text-center px-6">
            <p className="text-4xl mb-4">📚</p>
            <p className="text-white font-semibold mb-2">No session loaded</p>
            <p className="text-gray-500 text-sm mb-6">Please go back and read the study material first.</p>
            <button
              onClick={() => router.push(`/chapter/${chapterId}/subtopic/${subtopicId}`)}
              className="px-6 py-3 rounded-full font-bold text-sm"
              style={{ background: "#CCEB58", color: "#141414" }}
            >
              ← Back to Study Material
            </button>
          </div>
        </div>
      </RouteGuard>
    );
  }

  // ── Submit answer ──────────────────────────────────────────────────────────

  const handleConfirm = async () => {
    if (selectedOption === null || !question || isSubmitting) return;
    setIsSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/quiz/answer`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          studentId:     student.id,
          sessionId,
          questionIndex: question.index,
          chosenAnswer:  selectedOption,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);

      const result: AnswerResult = json.data ?? json;
      setAnswerResult(result);
      setQuestionsShown(result.totalShown);
      setCorrect(result.totalCorrect);
      setScreen("feedback");

      if (result.sessionComplete) {
        setSummary(result.summary);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to submit answer. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Advance to next question ───────────────────────────────────────────────

  const handleNext = () => {
    if (!answerResult) return;
    if (answerResult.sessionComplete) {
      setScreen("done");
      return;
    }
    if (answerResult.nextQuestion) {
      setQuestion(normalizeQuestion(answerResult.nextQuestion));
    }
    setSelectedOption(null);
    setAnswerResult(null);
    setScreen("question");
  };

  // ── Progress helpers ───────────────────────────────────────────────────────

  const progressPct = questionsShown > 0
    ? Math.round((correct / questionsShown) * 100)
    : 0;

  const handlePostQuizNavigation = (targetPath: string) => {
    const derivedPct = summary?.percentage ?? progressPct;
    updateChapterProgress({
      chapterId,
      masteryLevel: derivedPct,
      completedAt: new Date().toISOString(),
    });
    router.push(targetPath);
  };

  // ════════════════════════════════════════════════════════════════════════════
  // RESULTS SCREEN
  // ════════════════════════════════════════════════════════════════════════════

  if (screen === "done") {
    const passed    = summary?.passed ?? (progressPct >= 60);
    const finalPct  = summary?.percentage ?? progressPct;
    const finalScore = summary?.score ?? correct;
    const finalTotal = summary?.total ?? questionsShown;
    const grade     = summary?.grade ?? (passed ? "Pass" : "Needs Work");

    return (
      <RouteGuard>
        <div
          className="min-h-screen flex items-center justify-center px-4"
          style={{ background: "#141414", fontFamily: "'Inter', sans-serif" }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="max-w-sm w-full text-center"
          >
            {/* Score badge */}
            <motion.div
              className="w-28 h-28 rounded-full flex items-center justify-center text-5xl mx-auto mb-6"
              style={{ background: passed ? "rgba(204,235,88,0.12)" : "rgba(239,68,68,0.1)" }}
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {passed ? "🎯" : "📖"}
            </motion.div>

            <h1
              className="font-black text-white mb-1"
              style={{ fontSize: "clamp(2.5rem,10vw,4rem)", letterSpacing: "-0.03em" }}
            >
              {finalPct}%
            </h1>
            <p className="font-bold text-lg mb-1" style={{ color: passed ? "#CCEB58" : "#ef4444" }}>
              {grade}
            </p>
            <p className="text-gray-500 text-sm mb-8">
              {finalScore} of {finalTotal} correct
            </p>

            {/* Stat pills */}
            <div className="flex gap-3 justify-center mb-8">
              {[
                { label: "Answered",  value: finalTotal },
                { label: "Correct",   value: finalScore },
                { label: "Accuracy",  value: `${finalPct}%` },
              ].map((s) => (
                <div
                  key={s.label}
                  className="flex-1 rounded-2xl py-3 px-2"
                  style={{ background: "#1e1e1e", border: "1px solid #2a2a2a" }}
                >
                  <p className="font-black text-white text-xl">{s.value}</p>
                  <p className="text-gray-600 text-xs mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <motion.button
                onClick={() => handlePostQuizNavigation(`/chapter/${chapterId}`)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex-1 py-3 rounded-full font-bold text-sm"
                style={{ background: "#1e1e1e", border: "1px solid #2a2a2a", color: "#fff" }}
              >
                ← Chapter
              </motion.button>
              <motion.button
                onClick={() => handlePostQuizNavigation(`/chapter/${chapterId}/subtopic/${subtopicId}`)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex-1 py-3 rounded-full font-bold text-sm"
                style={{ background: "#CCEB58", color: "#141414" }}
              >
                {passed ? "Next Topic →" : "Retry →"}
              </motion.button>
            </div>
          </motion.div>
        </div>
      </RouteGuard>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // QUIZ SCREEN (question + feedback)
  // ════════════════════════════════════════════════════════════════════════════

  const isCorrect    = answerResult?.isCorrect ?? false;
  const correctIndex = answerResult?.correctIndex ?? -1;

  return (
    <RouteGuard>
      <div
        className="min-h-screen"
        style={{ background: "#141414", fontFamily: "'Inter', sans-serif" }}
      >
        {/* ── Navbar ── */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-30 px-6 py-4 flex items-center gap-4"
          style={{
            background:     "rgba(20,20,20,0.9)",
            backdropFilter: "blur(16px)",
            borderBottom:   "1px solid #222",
          }}
        >
          <motion.button
            onClick={() => router.push(`/chapter/${chapterId}/subtopic/${subtopicId}`)}
            whileHover={{ x: -3 }}
            className="text-sm font-semibold"
            style={{ color: "#CCEB58" }}
          >
            ← Study Material
          </motion.button>
          <div className="flex-1" />
          <span className="text-gray-500 text-xs font-medium">
            {correct}/{questionsShown} correct
          </span>
        </motion.header>

        <div className="max-w-2xl mx-auto px-6 py-10">

          {/* ── Accuracy bar ── */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-white font-semibold text-sm">
                Question <span className="text-gray-600">{questionsShown} shown</span>
              </span>
              <span className="text-xs font-bold" style={{ color: "#CCEB58" }}>
                {progressPct}% accuracy
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#252525" }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: "#CCEB58" }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </motion.div>

          {/* ── Question card ── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={question?.index}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
              className="rounded-2xl p-6 mb-6"
              style={{ background: "#1e1e1e", border: "1.5px solid #2a2a2a" }}
            >
              <div className="flex items-center gap-2 mb-4">
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(204,235,88,0.1)", color: "#CCEB58" }}
                >
                  {question?.cognitiveLevel?.replace(/_/g, " ").toUpperCase() || "QUESTION"}
                </span>
                <span className="text-xs text-gray-600">
                  difficulty {question?.difficulty?.toFixed(1)}
                </span>
                {question?.conceptTag && (
                  <span className="text-xs text-gray-600 ml-auto truncate max-w-[140px]">
                    #{question.conceptTag}
                  </span>
                )}
              </div>
              <h2 className="text-white font-semibold text-lg leading-snug">
                {question?.question}
              </h2>
            </motion.div>
          </AnimatePresence>

          {/* ── Options ── */}
          <div className="space-y-3 mb-6">
            {(question?.options ?? []).map((option, i) => {
              const isSelected  = selectedOption === i;
              const revealed    = screen === "feedback";
              const isRight     = revealed && i === correctIndex;
              const isWrong     = revealed && isSelected && !isCorrect && i === selectedOption;

              let borderColor = "#252525";
              let bgColor     = "#1a1a1a";
              let textColor   = "#ccc";

              if (revealed) {
                if (isRight)  { borderColor = "#4ade80"; bgColor = "rgba(74,222,128,0.08)";  textColor = "#4ade80"; }
                if (isWrong)  { borderColor = "#ef4444"; bgColor = "rgba(239,68,68,0.08)";   textColor = "#ef4444"; }
              } else if (isSelected) {
                borderColor = "#CCEB58";
                bgColor     = "rgba(204,235,88,0.08)";
                textColor   = "#CCEB58";
              }

              return (
                <motion.button
                  key={i}
                  onClick={() => { if (screen === "question") setSelectedOption(i); }}
                  whileHover={screen === "question" ? { x: 4 } : {}}
                  whileTap={screen === "question" ? { scale: 0.98 } : {}}
                  className="w-full text-left rounded-xl p-4 flex items-start gap-3 transition-colors"
                  style={{
                    background:  bgColor,
                    border:      `1.5px solid ${borderColor}`,
                    cursor:      screen === "question" ? "pointer" : "default",
                    boxShadow:   isRight ? "0 0 16px rgba(74,222,128,0.12)" : isSelected && !revealed ? "0 0 16px rgba(204,235,88,0.1)" : "none",
                  }}
                >
                  <span
                    className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                    style={{
                      background: isRight ? "#4ade80" : isWrong ? "#ef4444" : isSelected && !revealed ? "#CCEB58" : "#252525",
                      color:      isRight || isWrong || (isSelected && !revealed) ? "#141414" : "#666",
                    }}
                  >
                    {isRight ? "✓" : isWrong ? "✗" : String.fromCharCode(65 + i)}
                  </span>
                  <span className="text-sm leading-snug mt-0.5" style={{ color: textColor }}>
                    {option}
                  </span>
                </motion.button>
              );
            })}
          </div>

          {/* ── Explanation (shown after answer) ── */}
          <AnimatePresence>
            {screen === "feedback" && answerResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-2xl p-5 mb-6"
                style={{
                  background:   isCorrect ? "rgba(74,222,128,0.06)" : "rgba(239,68,68,0.06)",
                  border:       `1px solid ${isCorrect ? "rgba(74,222,128,0.25)" : "rgba(239,68,68,0.25)"}`,
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{isCorrect ? "✅" : "❌"}</span>
                  <span
                    className="font-bold text-sm"
                    style={{ color: isCorrect ? "#4ade80" : "#ef4444" }}
                  >
                    {isCorrect ? "Correct!" : "Incorrect"}
                  </span>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {answerResult.explanation}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Error ── */}
          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-400 text-sm text-center mb-4"
            >
              {error}
            </motion.p>
          )}

          {/* ── Action button ── */}
          <AnimatePresence mode="wait">
            {screen === "question" ? (
              <motion.button
                key="confirm"
                onClick={handleConfirm}
                disabled={selectedOption === null || isSubmitting}
                whileHover={selectedOption !== null ? { scale: 1.02, boxShadow: "0 0 30px rgba(204,235,88,0.25)" } : {}}
                whileTap={selectedOption !== null ? { scale: 0.97 } : {}}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="w-full py-4 rounded-2xl font-bold text-base transition-all"
                style={{
                  background: selectedOption !== null ? "#CCEB58" : "#1e1e1e",
                  color:      selectedOption !== null ? "#141414"  : "#444",
                  border:     "1px solid #2a2a2a",
                  cursor:     selectedOption !== null ? "pointer"  : "not-allowed",
                }}
              >
                {isSubmitting
                  ? "Checking…"
                  : selectedOption === null
                  ? "Select an answer"
                  : "Confirm Answer →"}
              </motion.button>
            ) : (
              <motion.button
                key="next"
                onClick={handleNext}
                whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(204,235,88,0.25)" }}
                whileTap={{ scale: 0.97 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="w-full py-4 rounded-2xl font-bold text-base transition-all"
                style={{
                  background: "#CCEB58",
                  color:      "#141414",
                  boxShadow:  "0 0 20px rgba(204,235,88,0.2)",
                }}
              >
                {answerResult?.sessionComplete ? "See Results →" : "Next Question →"}
              </motion.button>
            )}
          </AnimatePresence>

        </div>
      </div>
    </RouteGuard>
  );
}
