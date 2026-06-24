"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useStudentStore } from "@/lib/store";
import { graph, history } from "@/lib/api";
import { motion } from "framer-motion";
import { RouteGuard } from "@/components/route-guard";
import { KnowledgeGraphD3, type ConceptGraphData } from "@/components/knowledge-graph-d3";

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
  
  const [graphData,       setGraphData]       = useState<any | null>(null);
  const [conceptGraph,    setConceptGraph]    = useState<ConceptGraphData>({ nodes: [], edges: [] });
  const [historyData,     setHistoryData]     = useState<HistoryEntry[]>([]);
  const [isLoading,       setIsLoading]       = useState(true);
  const [lastUpdatedAt,   setLastUpdatedAt]   = useState<Date | null>(null);
  const [colorMode,       setColorMode]       = useState<'mastery' | 'retention'>('mastery');

  const fetchData = useCallback(async () => {
    if (!student) return;
    try {
      const [graphResult, conceptResult, historyResult] = await Promise.all([
        graph.getKnowledgeGraph(student.id),
        graph.getConceptGraph(student.id),
        history.getHistory(student.id),
      ]);
      setGraphData(graphResult);
      setConceptGraph(conceptResult);
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
          graphData.nodes.reduce((sum: number, node: any) => sum + (node.mastery ?? 0), 0) /
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
          {!isLoading && (
            <motion.div
              className="mb-12"
              variants={itemVariants}
              initial="hidden"
              animate="visible"
            >
              {/* Section header + mode toggle */}
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-2xl font-bold text-white">Knowledge Graph</h2>

                {/* Mastery / Retention pill toggle */}
                <div
                  className="flex rounded-full p-1 gap-1"
                  style={{ background: '#1e1e1e', border: '1px solid #2a2a2a' }}
                >
                  {(['mastery', 'retention'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setColorMode(mode)}
                      className="px-4 py-1.5 rounded-full text-xs font-bold transition-all capitalize"
                      style={{
                        background:  colorMode === mode ? '#CCEB58' : 'transparent',
                        color:       colorMode === mode ? '#141414' : '#555',
                        boxShadow:   colorMode === mode ? '0 0 12px rgba(204,235,88,0.25)' : 'none',
                      }}
                    >
                      {mode === 'mastery' ? '🧠 Mastery' : '⏳ Retention'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-6 mb-4">
                {colorMode === 'mastery' ? (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: '#CCEB58' }} />
                      <span className="text-xs text-gray-500">High mastery (100%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: '#888' }} />
                      <span className="text-xs text-gray-500">Mid mastery (50%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: '#252525', border: '1px solid #333' }} />
                      <span className="text-xs text-gray-500">Not attempted</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: '#4ade80' }} />
                      <span className="text-xs text-gray-500">High retention</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: '#fbbf24' }} />
                      <span className="text-xs text-gray-500">Fading</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: '#ef4444' }} />
                      <span className="text-xs text-gray-500">Urgent review</span>
                    </div>
                  </>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <div className="w-8 border-t-2" style={{ borderColor: '#5a5a5a' }} />
                  <span className="text-xs text-gray-600">REQUIRES</span>
                  <div className="w-8 border-t border-dashed" style={{ borderColor: '#3a3a3a' }} />
                  <span className="text-xs text-gray-600">RELATED_TO</span>
                </div>
              </div>

              {/* Graph canvas */}
              <KnowledgeGraphD3
                data={
                  // Prefer concept graph if the endpoint is live,
                  // otherwise fall back to topic-level nodes so nothing breaks
                  conceptGraph.nodes.length > 0
                    ? conceptGraph
                    : {
                        nodes: (graphData?.nodes ?? []).map((n: any) => ({
                          id:        n.id,
                          label:     n.title ?? n.name ?? n.id,
                          type:      'topic' as const,
                          parentId:  null,
                          mastery:   n.mastery ?? 0,
                          retention: n.mastery ?? 0,
                        })),
                        edges: (graphData?.edges ?? []).map((e: any) => ({
                          source: e.source,
                          target: e.target,
                          type:   'RELATED_TO' as const,
                        })),
                      }
                }
                colorMode={colorMode}
                height={560}
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
