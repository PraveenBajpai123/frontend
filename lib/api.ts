import axios from "axios";

const API_BASE_URL = "http://localhost:3700";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // 2 min for AI generation
});

// Student endpoints
export const students = {
  register: async (name: string, email: string) => {
    const response = await api.post("/api/students", { name, email });
    return response.data.data;
  },
  get: async (studentId: string) => {
    const response = await api.get(`/api/students/${studentId}`);
    return response.data.data;
  },
};

// Chapter endpoints
export const chapters = {
  getAll: async (subject = "Chemistry") => {
    const response = await api.get(`/api/subtopics/topics?subject=${subject}`);
    return response.data.data.map((topic: any) => ({
      id: topic.id,
      title: topic.name,
      description: `${topic.totalSubtopics} topics in this chapter`
    }));
  },
  get: async (chapterId: string) => {
    const response = await api.get("/api/subtopics/topics?subject=Chemistry");
    const topics = response.data.data;
    const topic = topics.find((t: any) => t.id === chapterId);
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
    return response.data.data.subtopics.map((s: any) => ({
      id: s.subtopicId,
      title: s.subtopicName,
      description: s.subtopicName,
      isComplete: s.isComplete,
      isUnlocked: s.isUnlocked,
      mastery: s.mastery,
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
};

// Content generation endpoints
// Returns { sessionId, title, passage, questions[] }
export const content = {
  generatePassage: async (
    studentId: string,
    subtopicId: string
  ) => {
    const response = await api.post("/api/content/generate", {
      studentId,
      subtopicId,
    });
    const data = response.data.data;
    return {
      sessionId: data.sessionId,
      title: data.title || "Study Material",
      passage: data.passage,
      // questions array straight from the session (index 0-4)
      questions: (data.questions || []).map((q: any) => ({
        id: String(q.index),
        index: q.index,
        text: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: q.explanation,
        cognitiveLevel: q.cognitiveLevel,
        difficulty: q.difficulty,
        conceptTag: q.conceptTag,
      })),
    };
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
    return response.data.data;
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

// Spaced-repetition review endpoints
export const review = {
  getQueue: async (studentId: string, limit = 20) => {
    const response = await api.get(`/api/review/${studentId}/queue?limit=${limit}`);
    return response.data.data as {
      totalDue: number;
      concepts: Array<{
        conceptId: string;
        conceptName: string;
        tag: string;
        effectiveMastery: number;
        retentionScore: number;
        overdueDays: number;
        nextReviewDate: string | null;
        halfLifeDays: number;
        daysSinceAttempt: number | null;
        consecutiveWrong: number;
        velocity: number;
      }>;
    };
  },

  /**
   * Returns a promise that resolves once the SSE stream is complete.
   * Calls onStatus and onResult callbacks as events arrive.
   */
  startSession: async (
    studentId: string,
    maxConcepts = 5,
    onStatus?: (msg: string) => void,
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
