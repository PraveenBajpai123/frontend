"use client";

import { useEffect, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useStudentStore } from "@/lib/store";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { RouteGuard } from "@/components/route-guard";

export default function ResultsPage() {
  const router       = useRouter();
  const params       = useParams();
  const searchParams = useSearchParams();
  const confettiRef  = useRef(false);

  const chapterId  = params.id as string;
  const subtopicId = params.subtopicId as string;
  const score      = parseInt(searchParams.get("score") || "0");

  const student = useStudentStore((state) => state.student);
  const updateChapterProgress = useStudentStore((state) => state.updateChapterProgress);

  // Trigger confetti for high scores
  useEffect(() => {
    if (score >= 75 && !confettiRef.current) {
      confettiRef.current = true;
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
  }, [score]);

  const handleContinue = () => {
    updateChapterProgress({
      chapterId,
      masteryLevel: score,
      completedAt: new Date().toISOString(),
    });
    router.push(`/chapter/${chapterId}`);
  };

  const passed = score >= 60;

  const getMessage = () => {
    if (score >= 90) return "Outstanding! You've mastered this topic!";
    if (score >= 75) return "Great job! You're on the right track!";
    if (score >= 60) return "Good effort! Keep practicing!";
    return "You can do better! Try again!";
  };

  const getScoreColor = () => {
    if (score >= 90) return "#4ade80";
    if (score >= 75) return "#CCEB58";
    if (score >= 60) return "#fbbf24";
    return "#ef4444";
  };

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
            className="w-28 h-28 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: passed ? "rgba(204,235,88,0.1)" : "rgba(239,68,68,0.08)", border: `1.5px solid ${getScoreColor()}30` }}
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          >
            <span
              className="font-black"
              style={{ fontSize: "clamp(1.6rem,8vw,2rem)", color: getScoreColor() }}
            >
              {score}%
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-black text-white mb-1"
            style={{ fontSize: "clamp(1.8rem,6vw,2.6rem)", letterSpacing: "-0.02em" }}
          >
            Quiz Complete!
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="font-bold text-base mb-8"
            style={{ color: getScoreColor() }}
          >
            {getMessage()}
          </motion.p>

          {/* Score breakdown card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="rounded-2xl p-6 mb-6 text-left"
            style={{ background: "#1e1e1e", border: "1.5px solid #2a2a2a" }}
          >
            <h2 className="text-white font-bold text-sm mb-4 tracking-wide">Performance Summary</h2>

            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-500 text-sm">Your Score</span>
              <span className="font-black text-xl" style={{ color: getScoreColor() }}>{score}%</span>
            </div>

            {/* Progress bar */}
            <div className="h-2 rounded-full overflow-hidden mb-4" style={{ background: "#252525" }}>
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${score}%` }}
                transition={{ duration: 0.9, ease: "easeOut", delay: 0.35 }}
                style={{ background: getScoreColor() }}
              />
            </div>

            <p className="text-gray-600 text-xs leading-relaxed">
              {score >= 75
                ? "Great work! You have a strong understanding of this topic."
                : "Practice more to improve your mastery. The AI adapts questions to help you improve."}
            </p>
          </motion.div>

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="flex gap-3"
          >
            <motion.button
              onClick={handleContinue}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex-1 py-3.5 rounded-full font-bold text-sm"
              style={{ background: "#CCEB58", color: "#141414", boxShadow: "0 0 24px rgba(204,235,88,0.2)" }}
            >
              Continue Learning →
            </motion.button>
            <motion.button
              onClick={() => router.push("/dashboard")}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex-1 py-3.5 rounded-full font-bold text-sm"
              style={{ background: "#1e1e1e", border: "1px solid #2a2a2a", color: "#fff" }}
            >
              Dashboard
            </motion.button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-gray-700 text-xs mt-6"
          >
            Keep up the great work! Your next chapter awaits.
          </motion.p>
        </motion.div>
      </div>
    </RouteGuard>
  );
}
