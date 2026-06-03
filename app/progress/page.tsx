"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useStudentStore } from "@/lib/store";
import { graph, history } from "@/lib/api";
import { motion } from "framer-motion";
import { RouteGuard } from "@/components/route-guard";
import { KnowledgeGraphD3 } from "@/components/knowledge-graph-d3";

interface GraphNode {
  id: string;
  title: string;
  mastery: number;
  x?: number;
  y?: number;
}

interface GraphEdge {
  source: string;
  target: string;
}

interface KnowledgeGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface HistoryEntry {
  id: string;
  chapterId: string;
  subtopicId: string;
  score: number;
  completedAt: string;
  chapterTitle?: string;
  subtopicTitle?: string;
}

export default function ProgressPage() {
  const router = useRouter();
  const student = useStudentStore((state) => state.student);
  
  const [graphData, setGraphData] = useState<KnowledgeGraphData | null>(null);
  const [historyData, setHistoryData] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    if (!student) return;
    try {
      const [graphResult, historyResult] = await Promise.all([
        graph.getKnowledgeGraph(student.id),
        history.getHistory(student.id),
      ]);
      setGraphData(graphResult);
      setHistoryData(historyResult);
      setLastUpdatedAt(new Date());
    } catch (err) {
      console.error("Failed to load progress data", err);
    } finally {
      setIsLoading(false);
    }
  }, [student]);

  useEffect(() => {
    if (!student) return;
    setIsLoading(true);
    fetchData();
  }, [student, fetchData]);

  useEffect(() => {
    if (!student) return;

    const handleFocusRefresh = () => {
      fetchData();
    };

    const pollId = window.setInterval(fetchData, 15000);
    window.addEventListener("focus", handleFocusRefresh);
    document.addEventListener("visibilitychange", handleFocusRefresh);

    return () => {
      window.clearInterval(pollId);
      window.removeEventListener("focus", handleFocusRefresh);
      document.removeEventListener("visibilitychange", handleFocusRefresh);
    };
  }, [student, fetchData]);

  const totalMastery =
    graphData && graphData.nodes.length > 0
      ? Math.round(
          graphData.nodes.reduce((sum, node) => sum + node.mastery, 0) /
            graphData.nodes.length
        )
      : 0;

  const topicsCompleted = graphData?.nodes?.length ?? 0;

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
      <div
        className="min-h-screen px-4 py-12"
        style={{ background: "#141414", fontFamily: "'Inter', sans-serif" }}
      >
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            className="flex justify-between items-start mb-12"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div>
              <h1 className="text-4xl font-black text-white mb-2">
                Learning Progress
              </h1>
              <p className="text-gray-500">
                Track your chemistry mastery over time
              </p>
              {lastUpdatedAt && (
                <p className="text-gray-600 text-xs mt-2">
                  Last updated: {lastUpdatedAt.toLocaleTimeString()}
                </p>
              )}
            </div>
            <button
              onClick={() => router.push("/dashboard")}
              className="text-sm font-semibold transition-colors"
              style={{ color: "#CCEB58" }}
            >
              Back to Dashboard
            </button>
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div
              className="rounded-xl p-6 transition-shadow"
              style={{ background: "#1e1e1e", border: "1px solid #2a2a2a" }}
              variants={itemVariants}
            >
              <p className="text-gray-500 text-sm mb-2">Overall Mastery</p>
              <p className="text-3xl font-black" style={{ color: "#CCEB58" }}>{totalMastery}%</p>
            </motion.div>

            <motion.div
              className="rounded-xl p-6 transition-shadow"
              style={{ background: "#1e1e1e", border: "1px solid #2a2a2a" }}
              variants={itemVariants}
            >
              <p className="text-gray-500 text-sm mb-2">Topics Completed</p>
              <p className="text-3xl font-black" style={{ color: "#CCEB58" }}>
                {topicsCompleted}
              </p>
            </motion.div>

            <motion.div
              className="rounded-xl p-6 transition-shadow"
              style={{ background: "#1e1e1e", border: "1px solid #2a2a2a" }}
              variants={itemVariants}
            >
              <p className="text-gray-500 text-sm mb-2">Quizzes Taken</p>
              <p className="text-3xl font-black text-white">
                {historyData.length}
              </p>
            </motion.div>

            <motion.div
              className="rounded-xl p-6 transition-shadow"
              style={{ background: "#1e1e1e", border: "1px solid #2a2a2a" }}
              variants={itemVariants}
            >
              <p className="text-gray-500 text-sm mb-2">Avg Score</p>
              <p className="text-3xl font-black" style={{ color: "#CCEB58" }}>
                {historyData.length > 0
                  ? Math.round(
                    historyData.reduce((a, h) => a + h.score, 0) /
                    historyData.length
                  )
                  : 0}
                %
              </p>
            </motion.div>
          </motion.div>

          {/* Knowledge Graph */}
          {!isLoading && graphData && graphData.nodes?.length > 0 && (
            <motion.div
              className="mb-12"
              variants={itemVariants}
              initial="hidden"
              animate="visible"
            >
              <h2 className="text-2xl font-bold text-white mb-6">
                Knowledge Graph
              </h2>
              <KnowledgeGraphD3 
                nodes={graphData.nodes.map((node) => ({
                  id: node.id,
                  label: node.title,
                  mastery: node.mastery,
                  level: 1,
                }))}
                links={graphData.edges}
              />
            </motion.div>
          )}

          {/* History */}
          <motion.div
            className="rounded-xl p-8"
            style={{ background: "#1e1e1e", border: "1px solid #2a2a2a" }}
            variants={itemVariants}
            initial="hidden"
            animate="visible"
          >
            <h2 className="text-2xl font-bold text-white mb-6">
              Quiz History
            </h2>

            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary" />
              </div>
            ) : historyData.length > 0 ? (
              <div className="space-y-4">
                {historyData.map((entry, index) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-4 rounded-lg transition-colors"
                    style={{ background: "#1a1a1a", border: "1px solid #252525" }}
                  >
                    <div>
                      <p className="text-white font-semibold">
                        {entry.chapterTitle || `Chapter ${entry.chapterId}`}
                      </p>
                      <p className="text-gray-500 text-sm">
                        {entry.subtopicTitle ||
                          `Subtopic ${entry.subtopicId}`}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-bold" style={{ color: "#CCEB58" }}>
                        {entry.score}%
                      </p>
                      <p className="text-gray-500 text-sm">
                        {new Date(entry.completedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No quiz history yet. Start taking quizzes to see your progress!
              </p>
            )}
          </motion.div>
        </div>
      </div>
    </RouteGuard>
  );
}
