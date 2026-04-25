"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useStudentStore } from "@/lib/store";
import { students } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import * as d3 from "d3";

const SUBJECTS = ["Physics", "Chemistry", "Biology", "Mathematics"];

function HexagonField() {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const W = window.innerWidth;
    const H = window.innerHeight;
    svg.attr("width", W).attr("height", H);

    const hexPath = (r: number) => {
      const pts = d3.range(6).map((i) => {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        return [r * Math.cos(a), r * Math.sin(a)];
      });
      return `M${pts.map((p) => p.join(",")).join("L")}Z`;
    };

    const hexes = [
      { x: 0.08, y: 0.2, r: 60, op: 0.12 },
      { x: 0.92, y: 0.15, r: 40, op: 0.09 },
      { x: 0.85, y: 0.6, r: 70, op: 0.1 },
      { x: 0.05, y: 0.75, r: 50, op: 0.08 },
      { x: 0.5, y: 0.05, r: 35, op: 0.07 },
      { x: 0.95, y: 0.85, r: 45, op: 0.1 },
      { x: 0.15, y: 0.5, r: 28, op: 0.06 },
      { x: 0.75, y: 0.9, r: 55, op: 0.08 },
    ];

    hexes.forEach((h, i) => {
      const g = svg
        .append("g")
        .attr("transform", `translate(${h.x * W},${h.y * H})`);

      g.append("path")
        .attr("d", hexPath(h.r))
        .attr("fill", "none")
        .attr("stroke", "#CCEB58")
        .attr("stroke-width", 1.5)
        .attr("opacity", h.op);

      // Float animation via CSS keyframes on transform
      g.style("animation", `hexFloat${i % 3} ${6 + i * 1.2}s ease-in-out infinite`);
    });

    // Dots
    const dots = d3.range(18).map(() => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 3 + 1,
      op: Math.random() * 0.25 + 0.05,
    }));
    dots.forEach((d2) => {
      svg
        .append("circle")
        .attr("cx", d2.x)
        .attr("cy", d2.y)
        .attr("r", d2.r)
        .attr("fill", "#CCEB58")
        .attr("opacity", d2.op);
    });
  }, []);

  return (
    <>
      <style>{`
        @keyframes hexFloat0 { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-18px)} }
        @keyframes hexFloat1 { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-12px)} }
        @keyframes hexFloat2 { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-22px)} }
      `}</style>
      <svg
        ref={svgRef}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 0 }}
      />
    </>
  );
}

function SubjectTicker() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % SUBJECTS.length), 2000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="relative inline-block overflow-hidden" style={{ minWidth: 220 }}>
      <AnimatePresence mode="wait">
        <motion.span
          key={SUBJECTS[index]}
          className="block"
          style={{ color: "#CCEB58" }}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          {SUBJECTS[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export default function Landing() {
  const router = useRouter();
  const setStudent = useStudentStore((state) => state.setStudent);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({ name: "", email: "" });
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const student = await students.register(formData.name, formData.email);
      setStudent(student);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to register. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center px-4"
      style={{ background: "#1a1a1a", fontFamily: "'Inter', sans-serif" }}
    >
      <HexagonField />

      {/* Radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(204,235,88,0.07) 0%, transparent 70%)",
          zIndex: 0,
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center max-w-2xl w-full">
        {/* Logo badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-3 mb-10"
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl"
            style={{ background: "#CCEB58", color: "#1a1a1a" }}
          >
            R
          </div>
          <div className="text-left">
            <p className="font-bold text-white text-base leading-none">Rootvestors</p>
            <p style={{ color: "#CCEB58" }} className="text-xs leading-none mt-0.5">
              LearnGraph
            </p>
          </div>
        </motion.div>

        {/* Hero headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="font-black leading-none mb-3"
          style={{ fontSize: "clamp(3rem,8vw,5.5rem)", color: "#ffffff", letterSpacing: "-0.02em" }}
        >
          Master{" "}
          <SubjectTicker />
          <br />
          <span style={{ color: "#CCEB58" }}>Like Never Before</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="text-gray-400 text-lg mb-2 max-w-lg"
        >
          AI-powered adaptive learning for NCERT. Personalized quizzes, intelligent progress tracking across all subjects.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="text-xs font-bold tracking-widest mb-10"
          style={{ color: "#CCEB58" }}
        >
          TRANSFORMING NATION FROM ROOTS TO REALITY
        </motion.p>

        {/* CTA / Form toggle */}
        <AnimatePresence mode="wait">
          {!showForm ? (
            <motion.button
              key="cta"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: 0.65 }}
              onClick={() => setShowForm(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-3 px-10 py-4 rounded-full font-bold text-lg transition-shadow"
              style={{
                background: "#CCEB58",
                color: "#1a1a1a",
                boxShadow: "0 0 40px rgba(204,235,88,0.3)",
              }}
            >
              Start Learning
              <span className="text-xl">›</span>
            </motion.button>
          ) : (
            <motion.form
              key="form"
              onSubmit={handleSubmit}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-sm space-y-4"
            >
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Your name"
                required
                className="w-full px-5 py-3.5 rounded-xl text-white font-medium placeholder-gray-500 focus:outline-none focus:ring-2 transition-all"
                style={{
                  background: "#2a2a2a",
                  border: "1.5px solid #333",
                  // @ts-ignore
                  "--tw-ring-color": "#CCEB58",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#CCEB58")}
                onBlur={(e) => (e.target.style.borderColor = "#333")}
              />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="your@email.com"
                required
                className="w-full px-5 py-3.5 rounded-xl text-white font-medium placeholder-gray-500 focus:outline-none transition-all"
                style={{ background: "#2a2a2a", border: "1.5px solid #333" }}
                onFocus={(e) => (e.target.style.borderColor = "#CCEB58")}
                onBlur={(e) => (e.target.style.borderColor = "#333")}
              />
              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-red-400 text-sm"
                >
                  {error}
                </motion.p>
              )}
              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="w-full py-3.5 rounded-full font-bold text-lg disabled:opacity-50 transition-all"
                style={{
                  background: "#CCEB58",
                  color: "#1a1a1a",
                  boxShadow: "0 0 30px rgba(204,235,88,0.25)",
                }}
              >
                {isLoading ? "Creating account…" : "Start Learning →"}
              </motion.button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Feature cards */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="grid grid-cols-3 gap-4 mt-16 w-full max-w-xl"
        >
          {[
            { icon: "🧠", title: "AI-Powered", sub: "Personalized learning paths" },
            { icon: "🎯", title: "NCERT-Aligned", sub: "Class 11 & 12 all subjects" },
            { icon: "✨", title: "Adaptive", sub: "Adjusts to your pace" },
          ].map((f) => (
            <motion.div
              key={f.title}
              whileHover={{ y: -4, borderColor: "#CCEB58" }}
              className="rounded-2xl p-4 flex flex-col items-center gap-2 text-center transition-all cursor-default"
              style={{ background: "#222", border: "1px solid #2e2e2e" }}
            >
              <span className="text-2xl">{f.icon}</span>
              <p className="font-semibold text-white text-sm">{f.title}</p>
              <p className="text-gray-500 text-xs">{f.sub}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
