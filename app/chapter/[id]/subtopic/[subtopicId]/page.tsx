"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useStudentStore } from "@/lib/store";
import { subtopics as subtopicsAPI, content } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { RouteGuard } from "@/components/route-guard";

interface Subtopic {
  id: string;
  title: string;
}

export default function SubtopicPage() {
  const router = useRouter();
  const params = useParams();
  const chapterId = params.id as string;
  const subtopicId = params.subtopicId as string;

  const student = useStudentStore((s) => s.student);
  const setCurrentSessionId = useStudentStore((s) => s.setCurrentSessionId);
  const setCurrentQuestions = useStudentStore((s) => s.setCurrentQuestions);

  const [subtopic, setSubtopic] = useState<Subtopic | null>(null);
  const [passageTitle, setPassageTitle] = useState("");
  const [passageText, setPassageText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isRateLimited, setIsRateLimited] = useState(false);

  useEffect(() => {
    if (!chapterId || !subtopicId || !student) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError("");
      setIsRateLimited(false);
      try {
        // Get subtopic name
        const subtopicData = await subtopicsAPI.get(chapterId, subtopicId, student.id);
        setSubtopic(subtopicData);

        // Generate AI passage + questions
        const result = await content.generatePassage(student.id, subtopicId);
        setPassageTitle(result.title);
        setPassageText(result.passage);

        // Store session and questions in Zustand so the quiz page can use them
        setCurrentSessionId(result.sessionId);
        setCurrentQuestions(result.questions);
      } catch (err: any) {
        const status = err?.response?.status;
        const msg = err?.response?.data?.error || err?.message || "Unknown error";
        console.error("Content generation error:", status, msg, err?.response?.data);
        if (status === 429) {
          setIsRateLimited(true);
          setError("The AI is busy right now (rate limited). Please wait a minute and try again.");
        } else {
          setError(`Error ${status || ""}: ${msg}`);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [chapterId, subtopicId, student]);

  const handleStartQuiz = () => {
    router.push(`/chapter/${chapterId}/subtopic/${subtopicId}/quiz`);
  };

  const paragraphs = passageText.split(/\n+/).filter(Boolean);

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
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm" style={{ background: "#CCEB58", color: "#141414" }}>R</div>
        </motion.header>

        <div className="max-w-3xl mx-auto px-6 py-10">
          {/* Loading state */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-32 gap-6">
              <div className="relative w-16 h-16">
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{ border: "2px solid transparent", borderTopColor: "#CCEB58" }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                />
                <motion.div
                  className="absolute inset-2 rounded-full"
                  style={{ border: "2px solid transparent", borderTopColor: "rgba(204,235,88,0.3)" }}
                  animate={{ rotate: -360 }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
                />
              </div>
              <div className="text-center">
                <p className="text-white font-semibold mb-1">Generating your personalised content…</p>
                <p className="text-gray-500 text-sm">AI is preparing a study passage and quiz questions</p>
              </div>
            </div>
          )}

          {/* Error state */}
          {!isLoading && error && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
              <div className="text-5xl mb-4">{isRateLimited ? "⏳" : "⚠️"}</div>
              <h2 className="text-white font-bold text-xl mb-2">{isRateLimited ? "AI is busy" : "Something went wrong"}</h2>
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

          {/* Content */}
          {!isLoading && !error && (
            <>
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
                <h1 className="font-black text-white leading-tight mb-2" style={{ fontSize: "clamp(1.8rem,4vw,2.8rem)", letterSpacing: "-0.02em" }}>
                  {passageTitle || subtopic?.title}
                </h1>
                {subtopic && passageTitle !== subtopic.title && (
                  <p className="text-gray-500 text-sm">{subtopic.title}</p>
                )}
              </motion.div>

              {/* Passage card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
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
                      transition={{ delay: 0.3 + i * 0.08 }}
                    >
                      {para}
                    </motion.p>
                  ))}
                </div>
              </motion.div>

              {/* CTA */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                <motion.button
                  onClick={handleStartQuiz}
                  whileHover={{ scale: 1.03, boxShadow: "0 0 40px rgba(204,235,88,0.3)" }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full py-4 rounded-2xl font-bold text-lg transition-all"
                  style={{ background: "#CCEB58", color: "#141414", boxShadow: "0 0 24px rgba(204,235,88,0.2)" }}
                >
                  Take Quiz →
                </motion.button>
                <p className="text-gray-600 text-xs text-center mt-3">5 adaptive questions based on this passage</p>
              </motion.div>
            </>
          )}
        </div>
      </div>
    </RouteGuard>
  );
}
