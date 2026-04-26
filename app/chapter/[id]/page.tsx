"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useStudentStore } from "@/lib/store";
import { subtopics as subtopicsAPI, chapters as chaptersAPI } from "@/lib/api";
import { motion } from "framer-motion";
import { RouteGuard } from "@/components/route-guard";

interface Subtopic {
  id: string;
  title: string;
  description: string;
}

interface Chapter {
  id: string;
  title: string;
  description: string;
}

export default function ChapterPage() {
  const router = useRouter();
  const params = useParams();
  const chapterId = params.id as string;

  const student = useStudentStore((state) => state.student);
  const setCurrentSubtopicId = useStudentStore((state) => state.setCurrentSubtopicId);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [subtopicList, setSubtopicList] = useState<Subtopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [chapterData, subtopicsData] = await Promise.all([
          chaptersAPI.get(chapterId),
          subtopicsAPI.getByChapter(chapterId, student!.id),
        ]);
        setChapter(chapterData);
        setSubtopicList(subtopicsData);
      } catch (err) {
        console.error("Failed to load chapter data", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (chapterId && student) {
      fetchData();
    }
  }, [chapterId, student]);

  const handleSubtopicClick = (subtopicId: string) => {
    setCurrentSubtopicId(subtopicId);
    router.push(`/chapter/${chapterId}/subtopic/${subtopicId}`);
  };

  const completed = subtopicList.filter((s: any) => s.isComplete).length;
  const progress = subtopicList.length > 0 ? (completed / subtopicList.length) * 100 : 0;

  return (
    <RouteGuard>
      <div
        className="min-h-screen"
        style={{ background: "#1a1a1a", fontFamily: "'Inter', sans-serif" }}
      >
        {/* Top bar */}
        <div
          className="sticky top-0 z-20 px-6 py-4 flex items-center gap-4 backdrop-blur-sm"
          style={{ background: "rgba(26,26,26,0.9)", borderBottom: "1px solid #252525" }}
        >
          <motion.button
            onClick={() => {
              const subjectRoute = chapterId.startsWith("c11_") || chapterId.startsWith("c12_")
                ? "/subject/Chemistry"
                : "/dashboard";
              router.push(subjectRoute);
            }}
            whileHover={{ x: -3 }}
            className="flex items-center gap-2 text-sm font-medium transition-colors"
            style={{ color: "#CCEB58" }}
          >
            ← Back
          </motion.button>
          <div className="flex-1" />
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm"
            style={{ background: "#CCEB58", color: "#1a1a1a" }}
          >
            R
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-10">
          {/* Chapter header */}
          {!isLoading && chapter && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-10"
            >
              <motion.span
                className="inline-block text-xs font-bold tracking-widest mb-4 px-3 py-1 rounded-full"
                style={{ color: "#CCEB58", background: "rgba(204,235,88,0.1)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                CHAPTER
              </motion.span>

              <h1
                className="font-black text-white leading-none mb-3"
                style={{ fontSize: "clamp(2rem,5vw,3.5rem)", letterSpacing: "-0.02em" }}
              >
                {chapter.title}
              </h1>
              <p className="text-gray-400 text-base mb-6">{chapter.description}</p>

              {/* Progress bar */}
              <div className="flex items-center gap-4">
                <div
                  className="flex-1 h-1.5 rounded-full overflow-hidden"
                  style={{ background: "#252525" }}
                >
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: "#CCEB58" }}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                  />
                </div>
                <span className="text-sm font-semibold" style={{ color: "#CCEB58" }}>
                  {subtopicList.length} topics
                </span>
              </div>
            </motion.div>
          )}

          {/* Loading */}
          {isLoading ? (
            <div className="flex justify-center py-24">
              <div
                className="w-12 h-12 rounded-full border-2 animate-spin"
                style={{ borderColor: "#CCEB58 transparent transparent transparent" }}
              />
            </div>
          ) : (
            <motion.div
              className="space-y-3"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
              }}
            >
              {subtopicList.map((subtopic, index) => (
                <motion.button
                  key={subtopic.id || index}
                  onClick={() => handleSubtopicClick(subtopic.id)}
                  variants={{
                    hidden: { opacity: 0, x: -20 },
                    visible: { opacity: 1, x: 0 },
                  }}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full text-left group rounded-2xl transition-all"
                  style={{ background: "#222", border: "1.5px solid #2a2a2a" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "#CCEB58";
                    (e.currentTarget as HTMLElement).style.boxShadow =
                      "0 0 20px rgba(204,235,88,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "#2a2a2a";
                    (e.currentTarget as HTMLElement).style.boxShadow = "none";
                  }}
                >
                  <div className="flex items-center gap-4 p-5">
                    {/* Number badge */}
                    <div
                      className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-colors"
                      style={{
                        background: "rgba(204,235,88,0.1)",
                        color: "#CCEB58",
                      }}
                    >
                      {index + 1}
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base leading-snug text-white group-hover:text-lime-300 transition-colors">
                        {subtopic.title}
                      </h3>
                      {subtopic.description && subtopic.description !== subtopic.title && (
                        <p className="text-gray-500 text-sm mt-0.5 truncate">
                          {subtopic.description}
                        </p>
                      )}
                    </div>

                    {/* Arrow */}
                    <motion.div className="flex-shrink-0 text-gray-600 group-hover:text-lime-400 transition-colors text-lg">
                      →
                    </motion.div>
                  </div>
                </motion.button>
              ))}

              {subtopicList.length === 0 && !isLoading && (
                <div className="text-center py-16 text-gray-500">
                  No topics found for this chapter.
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </RouteGuard>
  );
}
