export type Subject = string;

export type BlockStatus = "pending" | "completed" | "skipped" | "rescheduled";

export type DifficultyLevel = "easy" | "medium" | "hard";

export interface UserSubject {
  id: string;
  name: string;
  color: string;
  order: number;
  normalizedName?: string;
}

export interface ScheduleBlock {
  id: string;
  title: string;
  type: "study" | "gym" | "class" | "revision" | "mock-test" | "rest" | "cardio" | "mobility" | "other";
  subject?: Subject;
  topic?: string;
  startTime: string;
  endTime: string;
  date: string;
  status: BlockStatus;
  notes?: string;
}

export interface Topic {
  id: string;
  name: string;
  subject: Subject;
  subtopics: Subtopic[];
  strength: number;
  confidence: number;
  lastRevised: string;
  questionsPracticed: number;
  accuracy: number;
  notes: string;
  doubts: DoubtEntry[];
  classCovered: boolean;
  revisionNeeded: boolean;
}

export interface Subtopic {
  id: string;
  name: string;
  strength: number;
  questionsPracticed: number;
  accuracy: number;
}

export interface DoubtEntry {
  id: string;
  text: string;
  explanation?: string;
}

export interface ClassNote {
  id: string;
  date: string;
  subject: Subject;
  topic: string;
  subtopic?: string;
  difficulty: DifficultyLevel;
  summary: string;
  doubts: DoubtEntry[];
  understood: boolean;
  needsRevision: boolean;
  tags: string[];
  fileMetadata?: FileUpload[];
}

export interface FileUpload {
  name: string;
  size: number;
  type: string;
  url?: string;
  dataUrl?: string;
}

export interface Exercise {
  id: string;
  name: string;
  category?: string;
  sets: number;
  reps: number;
  weight: number;
  rpe?: number;
  notes?: string;
  duration?: number;
  distance?: number;
}

export interface GymSession {
  id: string;
  date: string;
  type: string;
  exercises: Exercise[];
  completed: boolean;
  duration?: number;
  bodyweight?: number;
  notes?: string;
  cardioDistance?: number;
  cardioDuration?: number;
}

export interface Habit {
  id: string;
  name: string;
  category: string;
  icon?: string;
  targetDays: number[];
  active: boolean;
  startDate: string;
}

export interface HabitLog {
  id: string;
  habitId: string;
  date: string;
  completed: boolean;
  value?: number;
  notes?: string;
}

export interface DailyLog {
  date: string;
  studyHours: Record<string, number>;
  gymCompleted: boolean;
  habitsCompleted: string[];
  mood?: number;
  energy?: number;
  notes?: string;
}

export interface Recommendation {
  id: string;
  type: "schedule" | "study" | "gym" | "habit" | "revision" | "warning";
  priority: "high" | "medium" | "low";
  message: string;
  action?: string;
  date: string;
  dismissed: boolean;
}

export interface StrengthHistory {
  date: string;
  exercise: string;
  weight: number;
  reps: number;
  setNumber: number;
}

export interface AppData {
  subjects: UserSubject[];
  schedule: ScheduleBlock[];
  topics: Topic[];
  notes: ClassNote[];
  gymSessions: GymSession[];
  habits: Habit[];
  habitLogs: HabitLog[];
  dailyLogs: DailyLog[];
  recommendations: Recommendation[];
  strengthHistory: StrengthHistory[];
  settings: {
    darkMode: boolean;
    lastUpdated: string;
  };
}

export const SUBJECT_PALETTE = [
  "#6366f1", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444",
  "#06b6d4", "#ec4899", "#14b8a6", "#f97316", "#3b82f6",
];

export function normalizeSubjectName(name: string): string {
  return name.trim().toLowerCase();
}

export function getSubjectColor(subjectName: string, subjects: UserSubject[]): string {
  const norm = normalizeSubjectName(subjectName);
  const found = subjects.find((s) => normalizeSubjectName(s.name) === norm);
  if (found) return found.color;
  const idx = Math.abs(hashString(subjectName)) % SUBJECT_PALETTE.length;
  return SUBJECT_PALETTE[idx];
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash;
}
