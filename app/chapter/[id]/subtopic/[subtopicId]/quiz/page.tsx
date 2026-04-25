"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useStudentStore } from "@/lib/store";
import { quiz as quizAPI } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { RouteGuard } from "@/components/route-guard";

export default function QuizPage() {
  const router = useRouter();
  const params = useParams();
  const chapterId = params.id as string;
  const subtopicId = params.subtopicId as string;

  const student = useStudentStore((s) => s.student);
  const currentSessionId = useStudentStore((s) => s.currentSessionId);
  const currentQuestions = useStudentStore((s) => s.currentQuestions);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<number, number>>(new Map());
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const questions = currentQuestions;
  const current = questions[currentIndex];
  const selectedAnswer = answers.get(currentIndex);
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;
  const allAnswered = answers.size === questions.length;

  const handleSelectOption = (idx: number) => {
    if (submitted) return;
    setAnswers(new Map(answers).set(currentIndex, idx));
    setShowExplanation(false);
  };

  const handleNext = () => {
    setShowExplanation(false);
    if (currentIndex < questions.length - 1) setCurrentIndex(currentIndex + 1);
  };

  const handlePrev = () => {
    setShowExplanation(false);
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleSubmit = async () => {
    if (!student || !currentSessionId) return;
    setIsSubmitting(true);
    try {
      const answersPayload = Array.from(answers.entries()).map(([qIndex, selectedOption]) => ({
        questionIndex: qIndex,
        selectedOption,
      }));
      const result = await quizAPI.submitAnswers(currentSessionId, student.id, answersPayload);
      setResults(result);
      setSubmitted(true);
    } catch (err) {
      console.error("Submit failed", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const correctCount = submitted
    ? questions.filter((q: any, i: number) => answers.get(i) === q.correctIndex).length
    : 0;
  const scorePercent = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

  if (questions.length === 0) {
    return (
      <RouteGuard>
        <div className="min-h-screen flex items-center justify-center" style={{ background: "#141414" }}>
          <div className="text-center">
            <p className="text-4xl mb-4">📚</p>
            <p className="text-white font-semibold mb-2">No questions loaded</p>
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

  // Results screen
  if (submitted) {
    const passed = scorePercent >= 60;
    return (
      <RouteGuard>
        <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#141414", fontFamily: "'Inter', sans-serif" }}>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full text-center">
            <motion.div
              className="w-24 h-24 rounded-full flex items-center justify-center text-4xl mx-auto mb-6"
              style={{ background: passed ? "rgba(204,235,88,0.15)" : "rgba(239,68,68,0.1)" }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              {passed ? "🎯" : "📖"}
            </motion.div>

            <h1 className="font-black text-white text-4xl mb-2" style={{ letterSpacing: "-0.02em" }}>
              {scorePercent}%
            </h1>
            <p className="font-semibold mb-1" style={{ color: passed ? "#CCEB58" : "#ef4444" }}>
              {passed ? "Great job!" : "Keep practicing!"}
            </p>
            <p className="text-gray-500 text-sm mb-8">
              {correctCount} of {questions.length} correct
            </p>

            {/* Mini result per question */}
            <div className="space-y-2 mb-8 text-left">
              {questions.map((q: any, i: number) => {
                const userAns = answers.get(i);
                const isCorrect = userAns === q.correctIndex;
                return (
                  <div key={i} className="rounded-xl p-3 flex items-start gap-3" style={{ background: isCorrect ? "rgba(204,235,88,0.07)" : "rgba(239,68,68,0.07)", border: `1px solid ${isCorrect ? "rgba(204,235,88,0.2)" : "rgba(239,68,68,0.2)"}` }}>
                    <span className="text-sm mt-0.5">{isCorrect ? "✓" : "✗"}</span>
                    <div>
                      <p className="text-white text-xs font-medium leading-snug">{q.text}</p>
                      {!isCorrect && <p className="text-gray-400 text-xs mt-1">Correct: {q.options?.[q.correctIndex]}</p>}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3">
              <motion.button
                onClick={() => router.push(`/chapter/${chapterId}`)}
                whileHover={{ scale: 1.03 }}
                className="flex-1 py-3 rounded-full font-bold text-sm"
                style={{ background: "#1e1e1e", border: "1px solid #2a2a2a", color: "#fff" }}
              >
                ← Back
              </motion.button>
              <motion.button
                onClick={() => router.push(`/chapter/${chapterId}/subtopic/${subtopicId}`)}
                whileHover={{ scale: 1.03 }}
                className="flex-1 py-3 rounded-full font-bold text-sm"
                style={{ background: "#CCEB58", color: "#141414" }}
              >
                {passed ? "Next Topic" : "Retry →"}
              </motion.button>
            </div>
          </motion.div>
        </div>
      </RouteGuard>
    );
  }

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
            onClick={() => router.push(`/chapter/${chapterId}/subtopic/${subtopicId}`)}
            whileHover={{ x: -3 }}
            className="text-sm font-semibold"
            style={{ color: "#CCEB58" }}
          >
            ← Study Material
          </motion.button>
          <div className="flex-1" />
          <span className="text-gray-500 text-xs font-medium">{answers.size}/{questions.length} answered</span>
        </motion.header>

        <div className="max-w-2xl mx-auto px-6 py-10">
          {/* Progress bar */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-white font-semibold text-sm">Question {currentIndex + 1} <span className="text-gray-600">of {questions.length}</span></span>
              <span className="text-xs font-bold" style={{ color: "#CCEB58" }}>{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#252525" }}>
              <motion.div className="h-full rounded-full" style={{ background: "#CCEB58" }} animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
            </div>
          </motion.div>

          {/* Question card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="rounded-2xl p-6 mb-6"
              style={{ background: "#1e1e1e", border: "1.5px solid #2a2a2a" }}
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(204,235,88,0.1)", color: "#CCEB58" }}>
                  {current?.cognitiveLevel?.replace(/_/g, " ").toUpperCase() || "Q"}
                </span>
                <span className="text-xs text-gray-600">difficulty {current?.difficulty?.toFixed(1)}</span>
              </div>
              <h2 className="text-white font-semibold text-lg leading-snug">{current?.text}</h2>
            </motion.div>
          </AnimatePresence>

          {/* Options */}
          <div className="space-y-3 mb-8">
            {(current?.options || []).map((option: string, i: number) => {
              const isSelected = selectedAnswer === i;
              return (
                <motion.button
                  key={i}
                  onClick={() => handleSelectOption(i)}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full text-left rounded-xl p-4 flex items-start gap-3 transition-all"
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
              onClick={handlePrev}
              disabled={currentIndex === 0}
              whileHover={currentIndex > 0 ? { scale: 1.03 } : {}}
              className="px-6 py-3 rounded-full font-bold text-sm disabled:opacity-30"
              style={{ background: "#1e1e1e", border: "1px solid #2a2a2a", color: "#fff" }}
            >
              ← Prev
            </motion.button>

            {currentIndex < questions.length - 1 ? (
              <motion.button
                onClick={handleNext}
                disabled={selectedAnswer === undefined}
                whileHover={selectedAnswer !== undefined ? { scale: 1.03 } : {}}
                className="flex-1 py-3 rounded-full font-bold text-sm disabled:opacity-30"
                style={{ background: selectedAnswer !== undefined ? "#CCEB58" : "#1e1e1e", color: selectedAnswer !== undefined ? "#141414" : "#555", border: "1px solid #2a2a2a" }}
              >
                Next →
              </motion.button>
            ) : (
              <motion.button
                onClick={handleSubmit}
                disabled={isSubmitting || !allAnswered}
                whileHover={allAnswered ? { scale: 1.03 } : {}}
                className="flex-1 py-3 rounded-full font-bold text-sm disabled:opacity-30"
                style={{ background: allAnswered ? "#CCEB58" : "#1e1e1e", color: allAnswered ? "#141414" : "#555", border: "1px solid #2a2a2a" }}
              >
                {isSubmitting ? "Submitting…" : `Submit Quiz (${answers.size}/${questions.length})`}
              </motion.button>
            )}
          </div>

          {/* Question dots nav */}
          <div className="flex justify-center gap-2 mt-6">
            {questions.map((_: any, i: number) => (
              <button
                key={i}
                onClick={() => { setShowExplanation(false); setCurrentIndex(i); }}
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
