"use client";

import { useState, useEffect } from "react";
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
  const chapterProgress = useStudentStore((state) => state.chapterProgress);
  
  const [graphData, setGraphData] = useState<KnowledgeGraphData | null>(null);
  const [historyData, setHistoryData] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!student) return;

        const [graphResult, historyResult] = await Promise.all([
          graph.getKnowledgeGraph(student.id),
          history.getHistory(student.id),
        ]);

        setGraphData(graphResult);
        setHistoryData(historyResult);
      } catch (err) {
        console.error("Failed to load progress data", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (student) {
      fetchData();
    }
  }, [student]);

  const totalMastery =
    chapterProgress.length > 0
      ? Math.round(
        chapterProgress.reduce((a, p) => a + p.masteryLevel, 0) /
        chapterProgress.length
      )
      : 0;

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
      <div className="min-h-screen bg-background px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            className="flex justify-between items-start mb-12"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">
                Learning Progress
              </h1>
              <p className="text-muted-foreground">
                Track your chemistry mastery over time
              </p>
            </div>
            <button
              onClick={() => router.push("/dashboard")}
              className="text-accent hover:underline"
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
              className="bg-white rounded-lg p-6 border border-border shadow-rv hover:shadow-lg transition-shadow"
              variants={itemVariants}
            >
              <p className="text-muted-foreground text-sm mb-2">Overall Mastery</p>
              <p className="text-3xl font-bold text-rv-lime">{totalMastery}%</p>
            </motion.div>

            <motion.div
              className="bg-white rounded-lg p-6 border border-border shadow-rv hover:shadow-lg transition-shadow"
              variants={itemVariants}
            >
              <p className="text-muted-foreground text-sm mb-2">Topics Completed</p>
              <p className="text-3xl font-bold text-rv-lime-light">
                {chapterProgress.length}
              </p>
            </motion.div>

            <motion.div
              className="bg-white rounded-lg p-6 border border-border shadow-rv hover:shadow-lg transition-shadow"
              variants={itemVariants}
            >
              <p className="text-muted-foreground text-sm mb-2">Quizzes Taken</p>
              <p className="text-3xl font-bold text-rv-black">
                {historyData.length}
              </p>
            </motion.div>

            <motion.div
              className="bg-white rounded-lg p-6 border border-border shadow-rv hover:shadow-lg transition-shadow"
              variants={itemVariants}
            >
              <p className="text-muted-foreground text-sm mb-2">Avg Score</p>
              <p className="text-3xl font-bold text-rv-lime">
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
          {!isLoading && graphData && (
            <motion.div
              className="mb-12"
              variants={itemVariants}
              initial="hidden"
              animate="visible"
            >
              <h2 className="text-2xl font-semibold text-foreground mb-6">
                Knowledge Graph
              </h2>
              <KnowledgeGraphD3
                nodes={graphData.nodes.map((node) => ({
                  id: node.id,
                  label: node.name,
                  mastery: node.mastery,
                  level: 1,
                }))}
                links={graphData.edges}
              />
            </motion.div>
          )}

          {/* History */}
          <motion.div
            className="bg-white rounded-lg p-8 border border-border shadow-rv"
            variants={itemVariants}
            initial="hidden"
            animate="visible"
          >
            <h2 className="text-2xl font-semibold text-foreground mb-6">
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
                    className="flex items-center justify-between p-4 rounded-lg bg-muted border border-border hover:border-rv-lime transition-colors hover:shadow-rv"
                  >
                    <div>
                      <p className="text-rv-black font-semibold">
                        {entry.chapterTitle || `Chapter ${entry.chapterId}`}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {entry.subtopicTitle ||
                          `Subtopic ${entry.subtopicId}`}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-rv-lime font-bold">
                        {entry.score}%
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {new Date(entry.completedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No quiz history yet. Start taking quizzes to see your progress!
              </p>
            )}
          </motion.div>
        </div>
      </div>
    </RouteGuard>
  );
}
