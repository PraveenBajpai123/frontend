"use client";

import { useRouter, useParams } from "next/navigation";
import { useStudentStore } from "@/lib/store";
import { RouteGuard } from "@/components/route-guard";
import { QuizFlow } from "@/components/quiz-flow";

export default function SubtopicQuizPage() {
  const router     = useRouter();
  const params     = useParams();
  const chapterId  = params.id as string;
  const subtopicId = params.subtopicId as string;

  const student         = useStudentStore((s) => s.student);
  const sessionId       = useStudentStore((s) => s.currentSessionId);
  const initialQuestions = useStudentStore((s) => s.currentQuestions);
  const updateChapterProgress = useStudentStore((s) => s.updateChapterProgress);

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

  const handleComplete = (summary: any, progressPct: number) => {
    const derivedPct = summary?.percentage ?? progressPct;
    updateChapterProgress({
      chapterId,
      masteryLevel: derivedPct,
      completedAt: new Date().toISOString(),
    });
  };

  return (
    <QuizFlow
      studentId={student.id}
      sessionId={sessionId}
      initialQuestions={initialQuestions}
      sessionMode="subtopic"
      onComplete={handleComplete}
      onExit={() => router.push(`/chapter/${chapterId}`)}
      onRetry={() => router.push(`/chapter/${chapterId}/subtopic/${subtopicId}`)}
      onNextTopic={() => router.push(`/chapter/${chapterId}/subtopic/${subtopicId}`)}
    />
  );
}
