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
      description: s.subtopicName
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
    selectedOption: number
  ) => {
    const response = await api.post("/api/quiz/answer", {
      sessionId,
      studentId,
      questionIndex,
      selectedOption,
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
    return response.data;
  },
};

// History endpoints
export const history = {
  getHistory: async (studentId: string) => {
    const response = await api.get(`/api/students/${studentId}/history`);
    return response.data.data;
  },
};

export default api;
