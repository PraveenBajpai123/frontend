"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useStudentStore } from "@/lib/store";
import { chapters as chaptersAPI } from "@/lib/api";
import { motion } from "framer-motion";
import { RouteGuard } from "@/components/route-guard";

interface Chapter {
  id: string;
  title: string;
  description: string;
}

const SUBJECT_META: Record<string, { emoji: string; color: string; tagline: string }> = {
  Chemistry: { emoji: "⚗️", color: "#CCEB58", tagline: "Organic · Inorganic · Physical Chemistry" },
  Physics: { emoji: "⚡", color: "#60a5fa", tagline: "Mechanics · Optics · Electromagnetism" },
  Biology: { emoji: "🧬", color: "#34d399", tagline: "Botany · Zoology · Human Physiology" },
  Mathematics: { emoji: "∑", color: "#f472b6", tagline: "Calculus · Algebra · Coordinate Geometry" },
};

const CHAPTER_ICONS = ["⚗️","⚛️","🔬","🧬","⚡","🎯","📐","🔭","🌊","🔥","💎","🧲","🌡️","⚖️","🔗","💧","🌿","🛢️","🌐","📊","🔮","🧪","🎲","🔋","☢️"];

export default function SubjectChaptersPage() {
  const router = useRouter();
  const params = useParams();
  const subject = params.subject as string;

  const student = useStudentStore((state) => state.student);
  const setCurrentChapterId = useStudentStore((state) => state.setCurrentChapterId);
  const chapterProgress = useStudentStore((state) => state.chapterProgress);

  const [chapterList, setChapterList] = useState<Chapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  const meta = SUBJECT_META[subject] || { emoji: "📚", color: "#CCEB58", tagline: subject };

  useEffect(() => {
    chaptersAPI.getAll(subject)
      .then(setChapterList)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [subject]);

  const getProgress = (chapterId: string) =>
    chapterProgress.find((p) => p.chapterId === chapterId)?.masteryLevel || 0;

  const filtered = chapterList.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleChapterClick = (chapterId: string) => {
    setCurrentChapterId(chapterId);
    router.push(`/chapter/${chapterId}`);
  };

  return (
    <RouteGuard>
      <div className="min-h-screen" style={{ background: "#141414", fontFamily: "'Inter', sans-serif" }}>
        {/* Background glow */}
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
          <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 500, height: 300, background: `radial-gradient(ellipse, ${meta.color}08 0%, transparent 70%)` }} />
        </div>

        {/* Navbar */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-30 px-6 py-4 flex items-center gap-4"
          style={{ background: "rgba(20,20,20,0.88)", backdropFilter: "blur(16px)", borderBottom: "1px solid #222" }}
        >
          <motion.button
            onClick={() => router.push("/dashboard")}
            whileHover={{ x: -3 }}
            className="flex items-center gap-2 text-sm font-semibold transition-colors"
            style={{ color: meta.color }}
          >
            ← Subjects
          </motion.button>

          <div className="flex-1 max-w-xs mx-auto">
            <input
              type="text"
              placeholder={`Search ${subject} chapters…`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-all"
              style={{ background: "#1e1e1e", border: "1px solid #2a2a2a" }}
              onFocus={(e) => (e.target.style.borderColor = meta.color)}
              onBlur={(e) => (e.target.style.borderColor = "#2a2a2a")}
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs" style={{ background: `${meta.color}25`, color: meta.color }}>
              {student?.name?.[0]?.toUpperCase() || "S"}
            </div>
          </div>
        </motion.header>

        <div className="relative z-10 max-w-5xl mx-auto px-6 py-10">
          {/* Subject hero */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10 flex items-end gap-6">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl flex-shrink-0" style={{ background: `${meta.color}15`, border: `1px solid ${meta.color}30` }}>
              {meta.emoji}
            </div>
            <div>
              <p className="text-xs font-bold tracking-widest mb-1" style={{ color: meta.color }}>SUBJECT</p>
              <h1 className="font-black text-white leading-none" style={{ fontSize: "clamp(2rem,5vw,3.2rem)", letterSpacing: "-0.02em" }}>
                {subject}
              </h1>
              <p className="text-gray-500 text-sm mt-1">{meta.tagline}</p>
            </div>
          </motion.div>

          {/* Stats chips */}
          {!isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex gap-3 mb-8 flex-wrap">
              {[
                { label: `${chapterList.length} Chapters`, icon: "📚" },
                { label: `${chapterProgress.length} In Progress`, icon: "🎯" },
                { label: `${filtered.length} Shown`, icon: "👁️" },
              ].map((chip) => (
                <div key={chip.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-gray-400" style={{ background: "#1e1e1e", border: "1px solid #2a2a2a" }}>
                  <span>{chip.icon}</span>
                  <span>{chip.label}</span>
                </div>
              ))}
            </motion.div>
          )}

          {/* Chapter grid */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <motion.div
                className="w-12 h-12 rounded-full"
                style={{ border: `2px solid transparent`, borderTopColor: meta.color }}
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              />
              <p className="text-gray-600 text-sm">Loading chapters…</p>
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              initial="hidden" animate="visible"
              variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } }}
            >
              {filtered.map((chapter, i) => {
                const progress = getProgress(chapter.id);
                const hasProgress = progress > 0;
                return (
                  <motion.button
                    key={chapter.id}
                    variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                    whileHover={{ y: -5, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleChapterClick(chapter.id)}
                    className="text-left rounded-2xl p-5 relative overflow-hidden group transition-all"
                    style={{ background: "#1e1e1e", border: "1.5px solid #2a2a2a" }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.borderColor = meta.color;
                      el.style.boxShadow = `0 8px 28px ${meta.color}15`;
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.borderColor = "#2a2a2a";
                      el.style.boxShadow = "none";
                    }}
                  >
                    {/* Glow on hover */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
                      style={{ background: `radial-gradient(ellipse at top left, ${meta.color}08 0%, transparent 60%)` }}
                    />

                    {/* Icon + number */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background: `${meta.color}15` }}>
                        {CHAPTER_ICONS[i % CHAPTER_ICONS.length]}
                      </div>
                      <span className="text-xs font-bold text-gray-700 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                    </div>

                    {/* Title */}
                    <h3 className="font-bold text-white text-sm leading-snug mb-1 group-hover:text-lime-300 transition-colors">
                      {chapter.title}
                    </h3>
                    <p className="text-gray-600 text-xs leading-relaxed mb-4">{chapter.description}</p>

                    {/* Progress */}
                    {hasProgress ? (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">Mastery</span>
                          <span className="font-bold" style={{ color: meta.color }}>{progress}%</span>
                        </div>
                        <div className="h-1 rounded-full overflow-hidden" style={{ background: "#252525" }}>
                          <motion.div className="h-full rounded-full" style={{ background: meta.color }} initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }} />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-700" />
                        <span className="text-xs text-gray-600 font-medium">Not started</span>
                      </div>
                    )}
                  </motion.button>
                );
              })}

              {filtered.length === 0 && !isLoading && (
                <div className="col-span-full text-center py-20 text-gray-600">
                  <p className="text-4xl mb-3">🔍</p>
                  <p className="font-semibold text-white text-sm">No chapters found</p>
                  <p className="text-xs mt-1">Try a different keyword</p>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </RouteGuard>
  );
}
