"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useStudentStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { RouteGuard } from "@/components/route-guard";
import { QuizFlow } from "@/components/quiz-flow";

const API_BASE = "http://localhost:3700";

// SSE status step config
const STATUS_STEPS = [
  { key: "analyze",  label: "Analyzing your forgetting curve", icon: "🔍" },
  { key: "queue",    label: "Building review queue",           icon: "📚" },
  { key: "generate", label: "Generating review questions",     icon: "✨" },
];

export default function ReviewSessionPage() {
  const router = useRouter();
  const student = useStudentStore((s) => s.student);

  const [statusMsg,     setStatusMsg]     = useState("Initializing…");
  const [activeStep,    setActiveStep]    = useState(0);
  const [result,        setResult]        = useState<any>(null);
  const [isLoading,     setIsLoading]     = useState(true);
  const [error,         setError]         = useState("");
  const [isRateLimited, setIsRateLimited] = useState(false);

  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  useEffect(() => {
    if (!student) return;

    let cancelled = false;

    const run = async () => {
      setIsLoading(true);
      setError("");
      setIsRateLimited(false);
      setResult(null);
      setActiveStep(0);
      setStatusMsg("Initializing…");

      try {
        // Open SSE stream via POST fetch to the session endpoint
        const response = await fetch(`${API_BASE}/api/review/${student.id}/session`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ maxConcepts: 5 }), // You can tweak maxConcepts
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err?.error || `HTTP ${response.status}`);
        }

        const reader  = response.body!.getReader();
        readerRef.current = reader;
        const decoder = new TextDecoder();
        let buffer    = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done || cancelled) break;

          buffer += decoder.decode(value, { stream: true });

          // SSE frames separated by double newline
          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";

          for (const frame of frames) {
            if (!frame.trim()) continue;
            const lines     = frame.split("\n");
            let eventType   = "";
            let eventData   = "";

            for (const line of lines) {
              if (line.startsWith("event: ")) eventType = line.slice(7).trim();
              if (line.startsWith("data: "))  eventData = line.slice(6).trim();
            }

            if (eventType === "status") {
              const parsed = JSON.parse(eventData) as { message: string };
              setStatusMsg(parsed.message);

              // Advance visual step based on message content
              if (parsed.message.toLowerCase().includes("memory"))    setActiveStep(0);
              if (parsed.message.toLowerCase().includes("queue"))     setActiveStep(1);
              if (parsed.message.toLowerCase().includes("generating")) setActiveStep(2);
            }

            if (eventType === "result") {
              const parsed = JSON.parse(eventData);
              // Expected parsed data structure from review.controller.ts:
              // { sessionId: string, conceptsIncluded: [...], questions: [...] }
              setResult({
                sessionId: parsed.sessionId,
                questions: parsed.questions,
              });
              setIsLoading(false);
              reader.cancel();
              break;
            }

            if (eventType === "error") {
              const parsed = JSON.parse(eventData);
              throw new Error(parsed?.message || "Review session generation failed");
            }
          }

          if (result) break;
        }
      } catch (err: any) {
        if (cancelled) return;
        const msg = err?.message || "Unknown error";
        const isRL = msg.toLowerCase().includes("rate") || msg.includes("429");
        setIsRateLimited(isRL);
        setError(isRL
          ? "The AI is busy right now. Please wait a minute and try again."
          : msg
        );
        setIsLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
      readerRef.current?.cancel().catch(() => {});
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student]);

  const handleComplete = () => {
    // Parent components can handle extra logic, but QuizFlow also provides an exit callback
  };

  if (!student) {
    return (
      <RouteGuard>
        <div className="min-h-screen flex items-center justify-center bg-[#141414]">
          <p className="text-white">Loading student data...</p>
        </div>
      </RouteGuard>
    );
  }

  // ── Loading state with live status ──
  if (isLoading) {
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
              onClick={() => router.push("/dashboard")}
              whileHover={{ x: -3 }}
              className="flex items-center gap-2 text-sm font-semibold"
              style={{ color: "#CCEB58" }}
            >
              ← Dashboard
            </motion.button>
            <div className="flex-1" />
            <span className="text-gray-400 text-sm hidden sm:block truncate max-w-xs">
              Review Session
            </span>
          </motion.header>

          <AnimatePresence mode="wait">
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-24 gap-10"
            >
              {/* Spinner */}
              <div className="relative w-20 h-20">
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{ border: "2.5px solid transparent", borderTopColor: "#fbbf24" }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
                />
                <motion.div
                  className="absolute inset-3 rounded-full"
                  style={{ border: "2px solid transparent", borderTopColor: "rgba(251,191,36,0.25)" }}
                  animate={{ rotate: -360 }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
                />
                <div className="absolute inset-0 flex items-center justify-center text-2xl">
                  {STATUS_STEPS[activeStep]?.icon || "🧠"}
                </div>
              </div>

              {/* Step pills */}
              <div className="flex flex-col items-center gap-3 w-full max-w-xs">
                {STATUS_STEPS.map((step, i) => (
                  <motion.div
                    key={step.key}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-xl"
                    animate={{
                      background: i === activeStep
                        ? "rgba(251,191,36,0.12)"
                        : i < activeStep
                        ? "rgba(251,191,36,0.05)"
                        : "rgba(255,255,255,0.03)",
                      borderColor: i === activeStep
                        ? "rgba(251,191,36,0.4)"
                        : i < activeStep
                        ? "rgba(251,191,36,0.15)"
                        : "rgba(255,255,255,0.06)",
                    }}
                    style={{ border: "1px solid" }}
                    transition={{ duration: 0.3 }}
                  >
                    <span className="text-lg w-6 text-center">
                      {i < activeStep ? "✅" : step.icon}
                    </span>
                    <span
                      className="text-sm font-medium"
                      style={{
                        color: i === activeStep
                          ? "#fbbf24"
                          : i < activeStep
                          ? "#6b7280"
                          : "#374151",
                      }}
                    >
                      {step.label}
                    </span>
                    {i === activeStep && (
                      <motion.div
                        className="ml-auto w-1.5 h-1.5 rounded-full"
                        style={{ background: "#fbbf24" }}
                        animate={{ opacity: [1, 0.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Live status text */}
              <AnimatePresence mode="wait">
                <motion.p
                  key={statusMsg}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="text-gray-500 text-sm text-center"
                >
                  {statusMsg}
                </motion.p>
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>
        </div>
      </RouteGuard>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <RouteGuard>
        <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: "#141414", fontFamily: "'Inter', sans-serif" }}>
          <div className="text-5xl mb-4">{isRateLimited ? "⏳" : "⚠️"}</div>
          <h2 className="text-white font-bold text-xl mb-2">
            {isRateLimited ? "AI is busy" : "Failed to load review"}
          </h2>
          <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto text-center">{error}</p>
          <motion.button
            onClick={() => window.location.reload()}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="px-8 py-3 rounded-full font-bold text-sm"
            style={{ background: "#fbbf24", color: "#141414" }}
          >
            Try Again
          </motion.button>
          <motion.button
            onClick={() => router.push("/dashboard")}
            className="mt-4 text-gray-500 text-sm font-semibold hover:text-white"
          >
            Back to Dashboard
          </motion.button>
        </div>
      </RouteGuard>
    );
  }

  // ── Quiz Flow ──
  if (result) {
    return (
      <QuizFlow
        studentId={student.id}
        sessionId={result.sessionId}
        initialQuestions={result.questions}
        sessionMode="review"
        onComplete={handleComplete}
        onExit={() => router.push("/dashboard")}
      />
    );
  }

  return null;
}
