"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useStudentStore } from "@/lib/store";
import { chapters } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { RouteGuard } from "@/components/route-guard";
import * as d3 from "d3";

interface Chapter {
  id: string;
  title: string;
  description: string;
}

const SUBJECT_ICONS: Record<string, string> = {
  chemistry: "⚗️",
  physics: "⚡",
  biology: "🧬",
  math: "∑",
};

function MiniHexField() {
  const svgRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    const W = svgRef.current.clientWidth || 800;
    const H = svgRef.current.clientHeight || 600;
    const hexPath = (r: number) => {
      const pts = d3.range(6).map((i) => {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        return [r * Math.cos(a), r * Math.sin(a)];
      });
      return `M${pts.map((p) => p.join(",")).join("L")}Z`;
    };
    [
      { x: 0.05, y: 0.1, r: 45, op: 0.1 },
      { x: 0.95, y: 0.2, r: 35, op: 0.08 },
      { x: 0.9, y: 0.8, r: 55, op: 0.09 },
      { x: 0.02, y: 0.85, r: 38, op: 0.07 },
    ].forEach((h) => {
      svg
        .append("path")
        .attr("d", hexPath(h.r))
        .attr("transform", `translate(${h.x * W},${h.y * H})`)
        .attr("fill", "none")
        .attr("stroke", "#CCEB58")
        .attr("stroke-width", 1.5)
        .attr("opacity", h.op);
    });
  }, []);
  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const student = useStudentStore((state) => state.student);
  const setCurrentChapterId = useStudentStore((state) => state.setCurrentChapterId);
  const [chapterList, setChapterList] = useState<Chapter[]>([]);
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    chapters
      .getAll()
      .then(setChapterList)
      .catch(() => setError("Failed to load chapters"))
      .finally(() => setIsLoading(false));
  }, []);

  const handleContinue = () => {
    if (selectedChapters.length > 0) {
      setCurrentChapterId(selectedChapters[0]);
      router.push("/dashboard");
    }
  };

  const toggle = (id: string) =>
    setSelectedChapters((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  return (
    <RouteGuard>
      <div
        className="min-h-screen relative overflow-hidden"
        style={{ background: "#1a1a1a", fontFamily: "'Inter', sans-serif" }}
      >
        <MiniHexField />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 50% 40% at 50% 0%, rgba(204,235,88,0.06) 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10 max-w-5xl mx-auto px-6 py-14">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-12"
          >
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center font-black"
                style={{ background: "#CCEB58", color: "#1a1a1a" }}
              >
                R
              </div>
              <span className="text-white font-bold text-lg">Rootvestors</span>
            </div>

            <h1
              className="font-black text-white leading-none mb-3"
              style={{ fontSize: "clamp(2.5rem,6vw,4rem)", letterSpacing: "-0.02em" }}
            >
              Welcome,{" "}
              <span style={{ color: "#CCEB58" }}>{student?.name?.split(" ")[0]}!</span>
            </h1>
            <p className="text-gray-400 text-lg">
              Pick the chapters you want to master. AI will personalise your journey.
            </p>
            <p
              className="text-xs font-bold tracking-widest mt-2"
              style={{ color: "#CCEB58" }}
            >
              TRANSFORMING NATION FROM ROOTS TO REALITY
            </p>
          </motion.div>

          {/* Progress indicator */}
          {selectedChapters.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-6 flex items-center gap-3"
            >
              <div
                className="h-1.5 rounded-full flex-1 overflow-hidden"
                style={{ background: "#2a2a2a" }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: "#CCEB58" }}
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.min((selectedChapters.length / chapterList.length) * 100, 100)}%`,
                  }}
                  transition={{ duration: 0.4 }}
                />
              </div>
              <span className="text-sm font-semibold" style={{ color: "#CCEB58" }}>
                {selectedChapters.length} selected
              </span>
            </motion.div>
          )}

          {/* Error */}
          {error && (
            <div
              className="p-4 rounded-xl mb-6 text-red-400 text-sm"
              style={{ background: "#2a1a1a", border: "1px solid #5a2020" }}
            >
              {error}
            </div>
          )}

          {/* Loading */}
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <div className="relative w-14 h-14">
                <div
                  className="w-full h-full rounded-full border-2 animate-spin"
                  style={{ borderColor: "#CCEB58 transparent transparent transparent" }}
                />
              </div>
            </div>
          ) : (
            <>
              {/* Chapter grid */}
              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
                }}
              >
                {chapterList.map((chapter, i) => {
                  const selected = selectedChapters.includes(chapter.id);
                  const subjectKey = chapter.id.split("_")[1] || "";
                  const icon =
                    SUBJECT_ICONS[subjectKey] ||
                    ["⚗️", "⚡", "🧬", "∑", "📐", "🔬"][i % 6];
                  return (
                    <motion.button
                      key={chapter.id}
                      variants={{
                        hidden: { opacity: 0, y: 20 },
                        visible: { opacity: 1, y: 0 },
                      }}
                      onClick={() => toggle(chapter.id)}
                      whileHover={{ y: -3 }}
                      whileTap={{ scale: 0.98 }}
                      className="text-left rounded-2xl p-5 transition-all relative overflow-hidden"
                      style={{
                        background: selected ? "rgba(204,235,88,0.08)" : "#222",
                        border: selected ? "1.5px solid #CCEB58" : "1.5px solid #2e2e2e",
                        boxShadow: selected
                          ? "0 0 20px rgba(204,235,88,0.12)"
                          : "none",
                      }}
                    >
                      {selected && (
                        <motion.div
                          className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          style={{ background: "#CCEB58", color: "#1a1a1a" }}
                        >
                          ✓
                        </motion.div>
                      )}
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3"
                        style={{
                          background: selected
                            ? "rgba(204,235,88,0.2)"
                            : "#2a2a2a",
                        }}
                      >
                        {icon}
                      </div>
                      <h3
                        className="font-bold text-sm leading-snug mb-1"
                        style={{ color: selected ? "#CCEB58" : "#ffffff" }}
                      >
                        {chapter.title}
                      </h3>
                      <p className="text-gray-500 text-xs leading-relaxed">
                        {chapter.description}
                      </p>
                    </motion.button>
                  );
                })}
              </motion.div>

              {/* Action */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex gap-4"
              >
                <motion.button
                  onClick={handleContinue}
                  disabled={selectedChapters.length === 0}
                  whileHover={selectedChapters.length > 0 ? { scale: 1.03 } : {}}
                  whileTap={selectedChapters.length > 0 ? { scale: 0.97 } : {}}
                  className="px-10 py-4 rounded-full font-bold text-base transition-all disabled:opacity-30"
                  style={{
                    background:
                      selectedChapters.length > 0 ? "#CCEB58" : "#2a2a2a",
                    color: selectedChapters.length > 0 ? "#1a1a1a" : "#555",
                    boxShadow:
                      selectedChapters.length > 0
                        ? "0 0 30px rgba(204,235,88,0.25)"
                        : "none",
                  }}
                >
                  Begin My Journey →
                </motion.button>
                <button
                  onClick={() =>
                    setSelectedChapters(chapterList.map((c) => c.id))
                  }
                  className="px-6 py-4 rounded-full font-medium text-sm text-gray-400 hover:text-white transition-colors"
                  style={{ border: "1px solid #2e2e2e" }}
                >
                  Select All
                </button>
              </motion.div>
            </>
          )}
        </div>
      </div>
    </RouteGuard>
  );
}
