import axios from "axios";

const API_BASE_URL = "http://localhost:3700";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // 2 min for AI generation
});

// Student endpoints
export const students = {
  register: async (name: string) => {
    const response = await api.post("/api/students", { name });
    return response.data.data;
  },
  get: async (studentId: string) => {
    const response = await api.get(`/api/students/${studentId}`);
    return response.data.data;
  },
};

// Chapter endpoints
export const chapters = {
  getAll: async (subject = "Chemistry", classLevel = 11) => {
    const response = await api.get(
      `/api/subtopics/topics?subject=${subject}&classLevel=${classLevel}`
    );
    return response.data.data.map((topic: any) => ({
      id: topic.id,
      title: topic.name,
      description: `${topic.totalSubtopics} topics in this chapter`
    }));
  },
  get: async (chapterId: string, classLevel = 11) => {
    const response = await api.get(
      `/api/subtopics/topics?subject=Chemistry&classLevel=${classLevel}`
    );
    const topics = response.data.data;
    const topic  = topics.find((t: any) => t.id === chapterId);
    if (!topic) throw new Error("Chapter not found");
    return {
      id: topic.id,
      title: topic.name,
      description: `${topic.totalSubtopics} topics in this chapter`
    };
  },
};

// Subtopic endpoints
export const subtopics = {
  getByChapter: async (chapterId: string, studentId: string) => {
    const response = await api.get(`/api/subtopics/${chapterId}/progress?studentId=${studentId}`);
    return response.data.data.subtopics.map((s: any, i: number) => ({
      id:         s.subtopicId,
      title:      s.subtopicName,
      description: s.subtopicName,
      // First subtopic is always unlocked; respect backend flag for the rest
      isUnlocked: i === 0 ? true : (s.isUnlocked ?? false),
      // Backend returns 0-1 float → normalize to 0-100
      masteryScore: s.masteryScore != null ? Math.min(100, Math.round(s.masteryScore * 100)) : null,
    }));
  },
  get: async (chapterId: string, subtopicId: string, studentId: string) => {
    const response = await api.get(`/api/subtopics/${chapterId}/progress?studentId=${studentId}`);
    const subtopic = response.data.data.subtopics.find((s: any) => s.subtopicId === subtopicId);
    if (!subtopic) throw new Error("Subtopic not found");
    return {
      id: subtopic.subtopicId,
      title: subtopic.subtopicName,
      description: subtopic.subtopicName
    };
  },

  // GET /api/subtopics/:subtopicId/concepts?studentId=...
  getConcepts: async (subtopicId: string, studentId: string) => {
    const response = await api.get(
      `/api/subtopics/${subtopicId}/concepts?studentId=${studentId}`
    );
    const list: any[] = response.data.data ?? response.data ?? [];
    return list.map((c) => ({
      conceptId:        c.conceptId,
      conceptName:      c.conceptName,
      tag:              c.tag,
      // Normalize 0-1 → 0-100
      effectiveMastery: Math.min(100, Math.round((c.effectiveMastery ?? 0) * 100)),
      mastery:          Math.min(100, Math.round((c.mastery         ?? 0) * 100)),
      velocity:         c.velocity         ?? 0,
      consecutiveWrong: c.consecutiveWrong ?? 0,
      retentionScore:   Math.min(100, Math.round((c.retentionScore  ?? 0) * 100)),
      daysSinceAttempt: c.daysSinceAttempt ?? 0,
      attempts:         c.attempts         ?? 0,
      // Bloom's taxonomy cognitive-level scores (0-100)
      recallScore:      Math.min(100, Math.round((c.recallScore      ?? 0) * 100)),
      vocabularyScore:  Math.min(100, Math.round((c.vocabularyScore  ?? 0) * 100)),
      causeEffectScore: Math.min(100, Math.round((c.causeEffectScore ?? 0) * 100)),
      inferenceScore:   Math.min(100, Math.round((c.inferenceScore   ?? 0) * 100)),
      applicationScore: Math.min(100, Math.round((c.applicationScore ?? 0) * 100)),
      // Forgetting-curve fields (pass through as-is — null when concept never attempted)
      halfLifeDays:     c.halfLifeDays   ?? null,   // number | null
      lastAttempted:    c.lastAttempted  ?? null,   // ISO string | null
      nextReviewDate:   c.nextReviewDate ?? null,   // ISO string | null
    }));
  },
};

// Review-due endpoint (deprecated in favor of review.getQueue)
export const reviewDue = {
  get: async (studentId: string) => {
    const response = await api.get(`/api/subtopics/${studentId}/review-due`);
    const list: any[] = response.data.data ?? response.data ?? [];
    return list.map((c) => ({
      conceptId:        c.conceptId   as string,
      conceptName:      c.conceptName as string,
      tag:              c.tag         as string,
      effectiveMastery: Math.min(100, Math.round((c.effectiveMastery ?? 0) * 100)),
      mastery:          Math.min(100, Math.round((c.mastery          ?? 0) * 100)),
      retentionScore:   Math.min(100, Math.round((c.retentionScore   ?? 0) * 100)),
      daysSinceAttempt: Math.round(c.daysSinceAttempt ?? 0),
      attempts:         c.attempts ?? 0,
    }));
  },
};

// Spaced Repetition Review endpoints
export const review = {
  getQueue: async (studentId: string, limit = 20) => {
    const response = await api.get(`/api/review/${studentId}/queue`, {
      params: { limit },
    });
    const payload = response.data.data;
    const concepts = payload.concepts || [];
    return {
      totalDue: payload.totalDue || concepts.length,
      concepts: concepts.map((c: any) => ({
        ...c,
        effectiveMastery: Math.min(100, Math.round((c.effectiveMastery ?? 0))), // already scaled to 0-100 in backend
        retentionScore:   Math.min(100, Math.round((c.retentionScore ?? 0))),
      })),
    };
  },

  /**
   * Returns a promise that resolves once the SSE stream is complete.
   * Calls onStatus and onResult callbacks as events arrive.
   */
  startSession: async (
    studentId: string,
    maxConcepts = 5,
    onStatus?: (msg: string) => void
  ): Promise<{
    sessionId: string;
    title: string;
    passage: string;
    questions: any[];
    subtopicId: string;
    reviewedConceptCount: number;
  }> => {
    return new Promise((resolve, reject) => {
      // Use fetch directly since EventSource doesn't support POST
      fetch(`http://localhost:3700/api/review/${studentId}/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxConcepts }),
      })
        .then((res) => {
          if (!res.ok || !res.body) throw new Error("Stream failed");
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          const processChunk = ({ done, value }: { done: boolean; value?: Uint8Array }) => {
            if (done) return;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              if (line.startsWith("event: ")) {
                // handled in next data line
              } else if (line.startsWith("data: ")) {
                const raw = line.slice(6);
                try {
                  const parsed = JSON.parse(raw);
                  if (parsed.message) onStatus?.(parsed.message);
                  if (parsed.sessionId) {
                    resolve({
                      sessionId:            parsed.sessionId,
                      title:                parsed.title,
                      passage:              parsed.passage,
                      questions:            (parsed.questions ?? []).map((q: any) => ({
                        id:             String(q.index),
                        index:          q.index,
                        text:           q.question,
                        options:        q.options,
                        correctIndex:   q.correctIndex,
                        explanation:    q.explanation,
                        cognitiveLevel: q.cognitiveLevel,
                        difficulty:     q.difficulty,
                        conceptTag:     q.conceptTag,
                      })),
                      subtopicId:           parsed.subtopicId,
                      reviewedConceptCount: parsed.reviewedConceptCount ?? 0,
                    });
                  }
                  if (parsed.message && parsed.message.toLowerCase().includes("no concepts")) {
                    reject(new Error(parsed.message));
                  }
                } catch {
                  // ignore parse errors
                }
              }
            }
            reader.read().then(processChunk).catch(reject);
          };

          reader.read().then(processChunk).catch(reject);
        })
        .catch(reject);
    });
  },
};

// Session engagement signals (C5 — fire-and-forget, never blocks UI)
export const sessions = {
  /**
   * Record passage reading engagement metrics on the already-created session.
   * The backend stores these for the quality-feedback loop (see ARCHITECTURE_ROADMAP §C5).
   * This call is intentionally fire-and-forget — failures are silently swallowed.
   */
  recordEngagement: (
    sessionId: string,
    payload: { timeOnPassageMs: number; maxScrollDepth: number }
  ): void => {
    api
      .patch(`/api/sessions/${sessionId}/engagement`, payload)
      .catch(() => {
        // Silently ignore — engagement signals are supplementary and must never
        // block or lag the quiz navigation.
      });
  },
};

// Content generation is handled directly via SSE streaming in the subtopic page.
// This export is kept only for backward compatibility — do not call it.
export const content = {
  generatePassage: async (_studentId: string, _subtopicId: string) => {
    throw new Error("Use SSE streaming in the subtopic page directly.");
  },
};

// Quiz endpoints – uses session state, NOT /api/quiz/questions (that route doesn't exist)
export const quiz = {
  // Load a previously generated session's questions
  getSessionState: async (sessionId: string, studentId: string) => {
    const response = await api.get(`/api/quiz/session/${sessionId}/state`, {
      params: { studentId },
    });
    const data = response.data.data;
    return {
      sessionId: data.id || data.sessionId,
      passage: data.passage,
      questions: (data.questions || []).map((q: any) => ({
        id: String(q.index),
        index: q.index,
        text: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: q.explanation,
        cognitiveLevel: q.cognitiveLevel,
        difficulty: q.difficulty,
      })),
    };
  },

  // Submit a single answer (the backend's /api/quiz/answer endpoint)
  submitAnswer: async (
    sessionId: string,
    studentId: string,
    questionIndex: number,
    chosenAnswer: number
  ) => {
    const response = await api.post("/api/quiz/answer", {
      sessionId,
      studentId,
      questionIndex,
      chosenAnswer,
    });
    return response.data.data;
  },

  // Submit all answers at once via /api/quiz/submit
  submitAnswers: async (
    sessionId: string,
    studentId: string,
    answers: Array<{ questionIndex: number; selectedOption: number }>
  ) => {
    // Backend expects answers as number[] sorted by question index
    const sorted = [...answers].sort((a, b) => a.questionIndex - b.questionIndex);
    const answersArray = sorted.map((a) => a.selectedOption);
    const response = await api.post("/api/quiz/submit", {
      sessionId,
      studentId,
      answers: answersArray,
    });
    return response.data.data;
  },
};

// Graph endpoints
export const graph = {
  getKnowledgeGraph: async (studentId: string) => {
    const response = await api.get(`/api/graph/${studentId}`);
    // Backend wraps response as { success: true, data: { nodes, edges } }
    const payload = response.data?.data ?? response.data ?? {};
    const rawNodes: any[] = payload.nodes ?? [];
    const edges:    any[] = payload.edges ?? [];
    // Normalize mastery: backend returns 0-1 float → convert to 0-100 integer
    const nodes = rawNodes.map((n: any) => ({
      ...n,
      mastery: Math.min(100, Math.round((n.mastery ?? 0) * 100)),
    }));
    return { nodes, edges };
  },

  /**
   * Concept-level graph for the C1 interactive drill-down visualization.
   * Expects GET /api/graph/:studentId/concepts to return hierarchical nodes
   * (type: "topic" | "subtopic" | "concept") with REQUIRES / RELATED_TO edges.
   * Falls back to { nodes: [], edges: [] } gracefully until the backend route exists.
   */
  getConceptGraph: async (studentId: string): Promise<{
    nodes: {
      id: string;
      label: string;
      type: "topic" | "subtopic" | "concept";
      parentId: string | null;
      mastery: number;    // 0-100
      retention: number;  // 0-100 (falls back to mastery if not provided)
    }[];
    edges: {
      source: string;
      target: string;
      type: "PART_OF" | "REQUIRES" | "RELATED_TO";
    }[];
  }> => {
    try {
      const response = await api.get(`/api/graph/${studentId}/concepts`);
      const payload  = response.data?.data ?? response.data ?? {};
      const rawNodes: any[] = payload.nodes ?? [];
      const rawEdges: any[] = payload.edges ?? [];

      const nodes = rawNodes.map((n: any) => {
        // Backend may return 0-1 floats or already-normalised 0-100 integers
        const raw = (v: any) => (v == null ? 0 : v <= 1.01 ? v * 100 : v);
        return {
          id:        n.id,
          label:     n.label ?? n.name ?? n.title ?? n.id,
          type:      (n.type as "topic" | "subtopic" | "concept") ?? "topic",
          parentId:  n.parentId ?? null,
          mastery:   Math.min(100, Math.round(raw(n.mastery))),
          retention: Math.min(100, Math.round(raw(n.retention ?? n.effectiveMastery ?? n.mastery))),
        };
      });

      const edges = rawEdges.map((e: any) => ({
        source: e.source,
        target: e.target,
        type:   (e.type as "PART_OF" | "REQUIRES" | "RELATED_TO") ?? "PART_OF",
      }));

      return { nodes, edges };
    } catch {
      // Endpoint not yet live — progress page gracefully renders nothing
      return { nodes: [], edges: [] };
    }
  },

  getRecommendations: async (studentId: string, subject = "Chemistry", classLevel = 12, limit = 4) => {
    const response = await api.get(
      `/api/graph/${studentId}/recommendations?subject=${subject}&classLevel=${classLevel}&limit=${limit}`,
    );
    return response.data.data as Array<{
      id: string;
      name: string;
      classLevel: number;
      mastery: number;
      attempts: number;
      masteryLevel: string;
    }>;
  },
};


// History endpoints
export const history = {
  getHistory: async (studentId: string) => {
    const response = await api.get(`/api/students/${studentId}/history`);
    const student = response.data.data;
    // Backend returns student object with sessions array, not a flat array
    return (student.sessions || []).map((s: any) => ({
      id: s.id,
      chapterId: s.subtopic?.topicId || s.topicId,
      subtopicId: s.subtopicId,
      score: s.totalShown > 0 ? Math.round((s.totalCorrect / s.totalShown) * 100) : 0,
      completedAt: s.createdAt,
      subtopicTitle: s.subtopic?.name,
    }));
  },
};

export default api;
