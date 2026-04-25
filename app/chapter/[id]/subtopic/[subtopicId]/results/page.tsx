"use client";

import { useEffect, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useStudentStore } from "@/lib/store";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { RouteGuard } from "@/components/route-guard";
import { Button } from "@/components/button";

export default function ResultsPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const confettiRef = useRef(false);
  
  const chapterId = params.id as string;
  const subtopicId = params.subtopicId as string;
  const score = parseInt(searchParams.get("score") || "0");

  const student = useStudentStore((state) => state.student);
  const updateChapterProgress = useStudentStore(
    (state) => state.updateChapterProgress
  );

  // Trigger confetti for high scores
  useEffect(() => {
    if (score >= 75 && !confettiRef.current) {
      confettiRef.current = true;
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [score]);

  const handleContinue = () => {
    // Update chapter progress
    updateChapterProgress({
      chapterId,
      masteryLevel: score,
      completedAt: new Date().toISOString(),
    });

    router.push(`/chapter/${chapterId}`);
  };

  const getScoreMessage = () => {
    if (score >= 90) return "Outstanding! You've mastered this topic!";
    if (score >= 75) return "Great job! You're on the right track!";
    if (score >= 60) return "Good effort! Keep practicing!";
    return "You can do better! Try again!";
  };

  const getScoreColor = () => {
    if (score >= 90) return "text-green-400";
    if (score >= 75) return "text-accent";
    if (score >= 60) return "text-yellow-400";
    return "text-red-400";
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <RouteGuard>
      <div className="min-h-screen bg-background px-4 py-12 flex items-center justify-center">
        <motion.div
          className="max-w-2xl w-full"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Success Icon/Badge */}
          <motion.div
            className="text-center mb-8"
            variants={itemVariants}
          >
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/20 mb-6">
              <div className={`text-5xl font-bold ${getScoreColor()}`}>
                {score}%
              </div>
            </div>

            <h1 className="text-4xl font-bold text-foreground mb-4">
              Quiz Complete!
            </h1>

            <p className={`text-2xl font-semibold mb-6 ${getScoreColor()}`}>
              {getScoreMessage()}
            </p>
          </motion.div>

          {/* Score Breakdown */}
          <motion.div
            className="bg-card rounded-lg p-8 border border-border mb-8"
            variants={itemVariants}
          >
            <h2 className="text-xl font-semibold text-foreground mb-6">
              Performance Summary
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Your Score</span>
                <span className={`text-2xl font-bold ${getScoreColor()}`}>
                  {score}%
                </span>
              </div>

              <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary to-secondary"
                  initial={{ width: 0 }}
                  animate={{ width: `${score}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>

              <div className="pt-4 space-y-2 text-muted-foreground text-sm">
                <p>
                  {score >= 75
                    ? "Great work! You have a strong understanding of this topic."
                    : "Practice more topics to improve your mastery level."}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            className="flex gap-4"
            variants={itemVariants}
          >
            <Button
              onClick={handleContinue}
              variant="primary"
              size="lg"
              className="flex-1"
            >
              Continue Learning
            </Button>

            <Button
              onClick={() => router.push("/dashboard")}
              variant="outline"
              size="lg"
              className="flex-1"
            >
              Go to Dashboard
            </Button>
          </motion.div>

          {/* Encouragement */}
          <motion.div
            className="mt-8 text-center text-muted-foreground text-sm"
            variants={itemVariants}
          >
            <p>Keep up the great work! Your next chapter awaits.</p>
          </motion.div>
        </motion.div>
      </div>
    </RouteGuard>
  );
}
