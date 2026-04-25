import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Student {
  id: string;
  name: string;
  email: string;
}

export interface QuizAnswer {
  questionId: string;
  selectedOption: number;
  isCorrect: boolean;
}

export interface ChapterProgress {
  chapterId: string;
  masteryLevel: number; // 0-100
  completedAt?: string;
}

interface StudentStore {
  student: Student | null;
  setStudent: (student: Student) => void;
  currentChapterId: string | null;
  setCurrentChapterId: (id: string | null) => void;
  currentSubtopicId: string | null;
  setCurrentSubtopicId: (id: string | null) => void;
  currentSessionId: string | null;
  setCurrentSessionId: (id: string | null) => void;
  currentQuestions: any[];
  setCurrentQuestions: (questions: any[]) => void;
  quizAnswers: QuizAnswer[];
  setQuizAnswers: (answers: QuizAnswer[]) => void;
  addQuizAnswer: (answer: QuizAnswer) => void;
  chapterProgress: ChapterProgress[];
  setChapterProgress: (progress: ChapterProgress[]) => void;
  updateChapterProgress: (progress: ChapterProgress) => void;
  clearSession: () => void;
}

export const useStudentStore = create<StudentStore>()(
  persist(
    (set) => ({
      student: null,
      setStudent: (student) => set({ student }),
      currentChapterId: null,
      setCurrentChapterId: (id) => set({ currentChapterId: id }),
      currentSubtopicId: null,
      setCurrentSubtopicId: (id) => set({ currentSubtopicId: id }),
      currentSessionId: null,
      setCurrentSessionId: (id) => set({ currentSessionId: id }),
      currentQuestions: [],
      setCurrentQuestions: (questions) => set({ currentQuestions: questions }),
      quizAnswers: [],
      setQuizAnswers: (answers) => set({ quizAnswers: answers }),
      addQuizAnswer: (answer) =>
        set((state) => ({
          quizAnswers: [...state.quizAnswers, answer],
        })),
      chapterProgress: [],
      setChapterProgress: (progress) => set({ chapterProgress: progress }),
      updateChapterProgress: (progress) =>
        set((state) => {
          const existing = state.chapterProgress.find(
            (p) => p.chapterId === progress.chapterId
          );
          if (existing) {
            return {
              chapterProgress: state.chapterProgress.map((p) =>
                p.chapterId === progress.chapterId ? progress : p
              ),
            };
          }
          return {
            chapterProgress: [...state.chapterProgress, progress],
          };
        }),
      clearSession: () =>
        set({
          student: null,
          currentChapterId: null,
          currentSubtopicId: null,
          quizAnswers: [],
        }),
    }),
    {
      name: "student-store",
    }
  )
);
