import { AppData, UserSubject, ScheduleBlock, Topic, ClassNote, GymSession, Habit, HabitLog, DailyLog, StrengthHistory } from "./types";
import { generateId, getToday, getLast7Days } from "./utils";

const today = getToday();
const dates = getLast7Days();

const createSubjects = (): UserSubject[] => [
  { id: generateId(), name: "Physics", color: "#6366f1", order: 0 },
  { id: generateId(), name: "Chemistry", color: "#10b981", order: 1 },
  { id: generateId(), name: "Maths", color: "#8b5cf6", order: 2 },
];

const createSchedule = (): ScheduleBlock[] => {
  const blocks: ScheduleBlock[] = [];
  const subjects = ["Physics", "Chemistry", "Maths"];

  type BlockType = ScheduleBlock["type"];

  dates.forEach((date, dayIdx) => {
    const base: { start: string; end: string; type: BlockType; subject?: string; title: string }[] = [
      { start: "06:00", end: "06:30", type: "mobility", title: "Morning Mobility" },
      { start: "06:30", end: "07:30", type: "gym", title: dayIdx % 2 === 0 ? "Upper Body" : "Lower Body" },
      { start: "08:00", end: "09:30", type: "study", subject: "Physics", title: "Physics Block" },
      { start: "09:45", end: "11:15", type: "study", subject: "Chemistry", title: "Chemistry Block" },
      { start: "11:30", end: "13:00", type: "study", subject: "Maths", title: "Maths Block" },
      { start: "14:00", end: "15:30", type: "class", title: "Coaching Class" },
      { start: "16:00", end: "17:30", type: "revision", subject: subjects[dayIdx % 3], title: "Revision Block" },
      { start: "18:00", end: "19:00", type: (dayIdx % 3 === 0 ? "cardio" : "rest") as BlockType, title: dayIdx % 3 === 0 ? "Cardio Session" : "Rest" },
    ];

    base.forEach((b) => {
      const isPast = new Date(date + "T00:00:00") < new Date(today + "T00:00:00");
      let status: "completed" | "pending" | "skipped" = "pending";
      if (isPast) {
        status = Math.random() > 0.15 ? "completed" : (Math.random() > 0.5 ? "skipped" : "completed");
      }
      blocks.push({
        id: generateId(),
        title: b.title,
        type: b.type,
        subject: b.subject,
        startTime: b.start,
        endTime: b.end,
        date,
        status,
      });
    });
  });
  return blocks;
};

const createTopics = (): Topic[] => {
  const topicDefs: { name: string; subject: string; subs: string[] }[] = [
    { name: "Mechanics", subject: "Physics", subs: ["Newton's Laws", "Work Energy Power", "Rotational Motion", "Gravitation"] },
    { name: "Electrostatics", subject: "Physics", subs: ["Coulomb's Law", "Electric Field", "Capacitance", "Gauss Law"] },
    { name: "Optics", subject: "Physics", subs: ["Ray Optics", "Wave Optics", "Interference", "Diffraction"] },
    { name: "Organic Chemistry", subject: "Chemistry", subs: ["GOC", "Hydrocarbons", "Haloalkanes", "Alcohols"] },
    { name: "Physical Chemistry", subject: "Chemistry", subs: ["Mole Concept", "Atomic Structure", "Chemical Equilibrium"] },
    { name: "Algebra", subject: "Maths", subs: ["Quadratic Equations", "Sequences", "Binomial Theorem", "Matrices"] },
    { name: "Calculus", subject: "Maths", subs: ["Limits", "Differentiation", "Integration", "Differential Equations"] },
    { name: "Trigonometry", subject: "Maths", subs: ["Trigonometric Functions", "Inverse Trig", "Properties of Triangles"] },
  ];

  return topicDefs.map((t) => ({
    id: generateId(),
    name: t.name,
    subject: t.subject,
    subtopics: t.subs.map((s) => ({
      id: generateId(),
      name: s,
      strength: Math.floor(Math.random() * 7) + 2,
      questionsPracticed: Math.floor(Math.random() * 80) + 10,
      accuracy: Math.floor(Math.random() * 40) + 45,
    })),
    strength: Math.floor(Math.random() * 6) + 3,
    confidence: Math.floor(Math.random() * 6) + 3,
    lastRevised: dates[Math.floor(Math.random() * 5)],
    questionsPracticed: Math.floor(Math.random() * 200) + 50,
    accuracy: Math.floor(Math.random() * 30) + 55,
    notes: "",
    doubts: Math.random() > 0.6 ? [{ id: generateId(), text: "Need more practice" }] : [],
    classCovered: Math.random() > 0.4,
    revisionNeeded: Math.random() > 0.5,
  }));
};

const createNotes = (): ClassNote[] => {
  const noteData = [
    { subject: "Physics", topic: "Mechanics", subtopic: "Newton's Laws", summary: "Covered NLM with pseudo force problems" },
    { subject: "Physics", topic: "Electrostatics", subtopic: "Capacitance", summary: "Capacitor combinations and energy stored" },
    { subject: "Chemistry", topic: "Organic Chemistry", subtopic: "GOC", summary: "Inductive and resonance effects" },
    { subject: "Maths", topic: "Calculus", subtopic: "Integration", summary: "Definite integrals and properties" },
    { subject: "Maths", topic: "Algebra", subtopic: "Matrices", summary: "Matrix operations and determinants" },
  ];

  return noteData.map((n, i) => ({
    id: generateId(),
    date: dates[i % dates.length],
    subject: n.subject,
    topic: n.topic,
    subtopic: n.subtopic,
    difficulty: (["medium", "hard", "easy", "medium", "medium"] as const)[i],
    summary: n.summary,
    doubts: i % 3 === 0 ? [{ id: generateId(), text: "Doubt in problem 5" }] : [],
    understood: Math.random() > 0.3,
    needsRevision: Math.random() > 0.5,
    tags: [n.subject, n.topic, n.subtopic || ""],
    fileMetadata: [],
  }));
};

const createGymSessions = (): GymSession[] => {
  const sessions: GymSession[] = [];
  const upperExercises = [
    { name: "Bench Press", sets: 4, reps: 8, weight: 60 },
    { name: "Barbell Row", sets: 4, reps: 8, weight: 50 },
    { name: "Overhead Press", sets: 3, reps: 10, weight: 35 },
    { name: "Pull-ups", sets: 3, reps: 10, weight: 0 },
  ];
  const lowerExercises = [
    { name: "Squat", sets: 4, reps: 8, weight: 80 },
    { name: "Deadlift", sets: 3, reps: 6, weight: 100 },
    { name: "Leg Press", sets: 3, reps: 12, weight: 120 },
    { name: "Leg Curl", sets: 3, reps: 12, weight: 30 },
  ];

  dates.forEach((date, i) => {
    if (i % 7 === 6) return;
    const isUpper = i % 2 === 0;
    const isCardio = i % 5 === 4;
    sessions.push({
      id: generateId(),
      date,
      type: isCardio ? "cardio" : isUpper ? "upper" : "lower",
      exercises: isCardio ? [] : (isUpper ? upperExercises : lowerExercises).map((e) => ({
        id: generateId(),
        name: e.name,
        sets: e.sets,
        reps: e.reps + Math.floor(Math.random() * 3 - 1),
        weight: e.weight + Math.floor(Math.random() * 10 - 5),
        rpe: Math.floor(Math.random() * 3) + 7,
        notes: "",
      })),
      completed: Math.random() > 0.1,
      duration: Math.floor(Math.random() * 30) + 45,
      bodyweight: 75 + Math.random() * 2 - 1,
      notes: "",
      cardioDistance: isCardio ? Math.floor(Math.random() * 3) + 2 : undefined,
      cardioDuration: isCardio ? Math.floor(Math.random() * 20) + 20 : undefined,
    });
  });
  return sessions;
};

const createStrengthHistory = (): StrengthHistory[] => {
  const history: StrengthHistory[] = [];
  const exercises = ["Bench Press", "Squat", "Deadlift"];
  const baseWeights: Record<string, number> = { "Bench Press": 55, Squat: 75, Deadlift: 95 };
  dates.forEach((date) => {
    exercises.forEach((ex) => {
      const progression = Math.floor(Math.random() * 5);
      for (let s = 0; s < 3; s++) {
        history.push({
          date,
          exercise: ex,
          weight: baseWeights[ex] + progression * 2.5,
          reps: 8 - s + Math.floor(Math.random() * 2),
          setNumber: s + 1,
        });
      }
      baseWeights[ex] += 2.5;
    });
  });
  return history;
};

const createHabits = (): Habit[] => [
  { id: generateId(), name: "Wake up on time", category: "routine", targetDays: [1,2,3,4,5,6,0], active: true, startDate: today },
  { id: generateId(), name: "Sleep by 11 PM", category: "routine", targetDays: [1,2,3,4,5,6,0], active: true, startDate: today },
  { id: generateId(), name: "Study 6+ hours", category: "study", targetDays: [1,2,3,4,5,6], active: true, startDate: today },
  { id: generateId(), name: "Gym session", category: "fitness", targetDays: [1,2,3,4,5,6], active: true, startDate: today },
  { id: generateId(), name: "Revision done", category: "study", targetDays: [1,2,3,4,5,6], active: true, startDate: today },
  { id: generateId(), name: "Meditation", category: "wellness", targetDays: [1,2,3,4,5,6,0], active: true, startDate: today },
  { id: generateId(), name: "3L water", category: "health", targetDays: [1,2,3,4,5,6,0], active: true, startDate: today },
];

const createHabitLogs = (habits: Habit[]): HabitLog[] => {
  const logs: HabitLog[] = [];
  dates.forEach((date) => {
    habits.forEach((habit) => {
      if (habit.targetDays.includes(new Date(date + "T00:00:00").getDay())) {
        logs.push({
          id: generateId(),
          habitId: habit.id,
          date,
          completed: Math.random() > 0.25,
          notes: "",
        });
      }
    });
  });
  return logs;
};

const createDailyLogs = (): DailyLog[] => {
  return dates.map((date) => ({
    date,
    studyHours: {
      Physics: Math.floor(Math.random() * 4) + 2,
      Chemistry: Math.floor(Math.random() * 3) + 1,
      Maths: Math.floor(Math.random() * 4) + 2,
    },
    gymCompleted: Math.random() > 0.15,
    habitsCompleted: [],
    mood: Math.floor(Math.random() * 4) + 6,
    energy: Math.floor(Math.random() * 4) + 6,
    notes: "",
  }));
};

export const getSampleData = (): AppData => {
  const habits = createHabits();
  return {
    subjects: createSubjects(),
    schedule: createSchedule(),
    topics: createTopics(),
    notes: createNotes(),
    gymSessions: createGymSessions(),
    habits,
    habitLogs: createHabitLogs(habits),
    dailyLogs: createDailyLogs(),
    recommendations: [],
    strengthHistory: createStrengthHistory(),
    settings: { darkMode: false, lastUpdated: today },
  };
};
