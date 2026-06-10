import { AppData, ScheduleBlock, Topic, ClassNote, GymSession, Habit, HabitLog, DailyLog, StrengthHistory, Recommendation, UserSubject, normalizeSubjectName } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

function supabase() {
  return createClient();
}


// ============================================================
// User Subjects
// ============================================================
export async function fetchUserSubjects(userId: string): Promise<UserSubject[]> {
  const { data } = await supabase()
    .from("user_subjects")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order");
  return (data || []).map((r: Row) => ({
    id: r.id, name: r.name, color: r.color, order: r.sort_order,
    normalizedName: r.normalized_name,
  }));
}

export async function upsertUserSubjects(userId: string, subjects: UserSubject[]) {
  const rows = subjects.map((s) => ({
    id: s.id,
    user_id: userId,
    name: s.name,
    color: s.color,
    sort_order: s.order,
  }));
  await supabase().from("user_subjects").upsert(rows, { onConflict: "id" }).throwOnError();
}

export async function deleteUserSubject(id: string) {
  await supabase().from("user_subjects").delete().eq("id", id).throwOnError();
}

// ============================================================
// Schedule Blocks
// ============================================================
export async function fetchScheduleBlocks(userId: string): Promise<ScheduleBlock[]> {
  const { data } = await supabase()
    .from("schedule_blocks")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: true });
  return (data || []).map((r: Row) => ({
    id: r.id, title: r.title, type: r.type,
    subject: r.subject || undefined, topic: r.topic || undefined,
    startTime: r.start_time, endTime: r.end_time,
    date: r.date, status: r.status, notes: r.notes || undefined,
  }));
}

export async function upsertScheduleBlocks(userId: string, blocks: ScheduleBlock[]) {
  const rows = blocks.map((b) => ({
    id: b.id, user_id: userId, title: b.title, type: b.type,
    subject: b.subject || null, topic: b.topic || null,
    start_time: b.startTime, end_time: b.endTime,
    date: b.date, status: b.status, notes: b.notes || "",
  }));
  await supabase().from("schedule_blocks").upsert(rows, { onConflict: "id" }).throwOnError();
}

export async function deleteScheduleBlock(id: string) {
  await supabase().from("schedule_blocks").delete().eq("id", id).throwOnError();
}

// ============================================================
// Topics
// ============================================================
export async function fetchTopics(userId: string): Promise<Topic[]> {
  const { data } = await supabase().from("topics").select("*").eq("user_id", userId);
  return (data || []).map((r: Row) => ({
    id: r.id, name: r.name, subject: r.subject,
    subtopics: r.subtopics || [], strength: r.strength, confidence: r.confidence,
    lastRevised: r.last_revised, questionsPracticed: r.questions_practiced,
    accuracy: r.accuracy, notes: r.notes || "", doubts: r.doubts || [],
    classCovered: r.class_covered, revisionNeeded: r.revision_needed,
  }));
}

export async function upsertTopics(userId: string, topics: Topic[]) {
  const rows = topics.map((t) => ({
    id: t.id, user_id: userId, name: t.name, subject: t.subject,
    subtopics: t.subtopics, strength: t.strength, confidence: t.confidence,
    last_revised: t.lastRevised, questions_practiced: t.questionsPracticed,
    accuracy: t.accuracy, notes: t.notes, doubts: t.doubts,
    class_covered: t.classCovered, revision_needed: t.revisionNeeded,
  }));
  await supabase().from("topics").upsert(rows, { onConflict: "id" }).throwOnError();
}

export async function deleteTopic(id: string) {
  await supabase().from("topics").delete().eq("id", id).throwOnError();
}

export async function deleteTopicsBySubject(userId: string, subjectName: string) {
  const norm = normalizeSubjectName(subjectName);
  const { data: topics } = await supabase().from("topics").select("id, subject").eq("user_id", userId).throwOnError();
  if (topics) {
    const toDelete = topics.filter((t: Row) => normalizeSubjectName(t.subject) === norm).map((t: Row) => t.id);
    if (toDelete.length > 0) {
      await supabase().from("topics").delete().in("id", toDelete).throwOnError();
    }
  }
}

export async function deleteClassNotesBySubject(userId: string, subjectName: string) {
  const norm = normalizeSubjectName(subjectName);
  const { data: notes } = await supabase().from("class_notes").select("id, subject").eq("user_id", userId).throwOnError();
  if (notes) {
    const toDelete = notes.filter((n: Row) => normalizeSubjectName(n.subject) === norm).map((n: Row) => n.id);
    if (toDelete.length > 0) {
      await supabase().from("class_notes").delete().in("id", toDelete).throwOnError();
    }
  }
}

// ============================================================
// Class Notes
// ============================================================
export async function fetchClassNotes(userId: string): Promise<ClassNote[]> {
  const { data } = await supabase().from("class_notes").select("*").eq("user_id", userId);
  return (data || []).map((r: Row) => ({
    id: r.id, date: r.date, subject: r.subject,
    topic: r.topic, subtopic: r.subtopic || undefined,
    difficulty: r.difficulty, summary: r.summary,
    doubts: r.doubts || [], understood: r.understood,
    needsRevision: r.needs_revision, tags: r.tags || [],
    fileMetadata: r.file_metadata || [],
  }));
}

export async function upsertClassNotes(userId: string, notes: ClassNote[]) {
  const rows = notes.map((n) => ({
    id: n.id, user_id: userId, date: n.date, subject: n.subject,
    topic: n.topic, subtopic: n.subtopic || null, difficulty: n.difficulty,
    summary: n.summary, doubts: n.doubts, understood: n.understood,
    needs_revision: n.needsRevision, tags: n.tags, file_metadata: n.fileMetadata || [],
  }));
  await supabase().from("class_notes").upsert(rows, { onConflict: "id" }).throwOnError();
}

export async function deleteClassNote(id: string) {
  await supabase().from("class_notes").delete().eq("id", id).throwOnError();
}

// ============================================================
// Gym Sessions
// ============================================================
export async function fetchGymSessions(userId: string): Promise<GymSession[]> {
  const { data } = await supabase().from("gym_sessions").select("*").eq("user_id", userId);
  return (data || []).map((r: Row) => ({
    id: r.id, date: r.date, type: r.type,
    exercises: r.exercises || [], completed: r.completed,
    duration: r.duration || undefined,
    bodyweight: r.bodyweight || undefined,
    notes: r.notes || undefined,
    cardioDistance: r.cardio_distance || undefined,
    cardioDuration: r.cardio_duration || undefined,
  }));
}

export async function upsertGymSessions(userId: string, sessions: GymSession[]) {
  const rows = sessions.map((s) => ({
    id: s.id, user_id: userId, date: s.date, type: s.type,
    exercises: s.exercises, completed: s.completed,
    duration: s.duration || null, bodyweight: s.bodyweight || null,
    notes: s.notes || "", cardio_distance: s.cardioDistance || null,
    cardio_duration: s.cardioDuration || null,
  }));
  await supabase().from("gym_sessions").upsert(rows, { onConflict: "id" }).throwOnError();
}

export async function deleteGymSession(id: string) {
  await supabase().from("gym_sessions").delete().eq("id", id).throwOnError();
}

// ============================================================
// Strength History
// ============================================================
export async function fetchStrengthHistory(userId: string): Promise<StrengthHistory[]> {
  const { data } = await supabase().from("strength_history").select("*").eq("user_id", userId);
  return (data || []).map((r: Row) => ({
    date: r.date, exercise: r.exercise,
    weight: r.weight, reps: r.reps, setNumber: r.set_number,
  }));
}

export async function upsertStrengthHistory(userId: string, history: StrengthHistory[]) {
  const rows = history.map((h) => ({
    user_id: userId, date: h.date, exercise: h.exercise,
    weight: h.weight, reps: h.reps, set_number: h.setNumber,
  }));
  await supabase().from("strength_history").delete().eq("user_id", userId).throwOnError();
  if (rows.length > 0) {
    await supabase().from("strength_history").insert(rows).throwOnError();
  }
}

// ============================================================
// Habits
// ============================================================
export async function fetchHabits(userId: string): Promise<Habit[]> {
  const { data } = await supabase().from("habits").select("*").eq("user_id", userId);
  return (data || []).map((r: Row) => ({
    id: r.id, name: r.name, category: r.category,
    icon: r.icon || undefined,
    targetDays: r.target_days || [0,1,2,3,4,5,6],
    active: r.active,
    startDate: r.start_date || r.created_at?.split("T")[0] || "2024-01-01",
  }));
}

export async function upsertHabits(userId: string, habits: Habit[]) {
  const rows = habits.map((h) => ({
    id: h.id, user_id: userId, name: h.name, category: h.category,
    icon: h.icon || null, target_days: h.targetDays,
    active: h.active, start_date: h.startDate,
  }));
  await supabase().from("habits").upsert(rows, { onConflict: "id" }).throwOnError();
}

export async function deleteHabit(id: string) {
  await supabase().from("habit_logs").delete().eq("habit_id", id).throwOnError();
  await supabase().from("habits").delete().eq("id", id).throwOnError();
}

// ============================================================
// Habit Logs
// ============================================================
export async function fetchHabitLogs(userId: string): Promise<HabitLog[]> {
  const { data } = await supabase().from("habit_logs").select("*").eq("user_id", userId);
  return (data || []).map((r: Row) => ({
    id: r.id, habitId: r.habit_id, date: r.date,
    completed: r.completed, value: r.value || undefined,
    notes: r.notes || undefined,
  }));
}

export async function upsertHabitLogs(userId: string, logs: HabitLog[]) {
  const rows = logs.map((l) => ({
    id: l.id, user_id: userId, habit_id: l.habitId,
    date: l.date, completed: l.completed,
    value: l.value || null, notes: l.notes || "",
  }));
  await supabase().from("habit_logs").upsert(rows, { onConflict: "id" }).throwOnError();
}

export async function deleteHabitLog(id: string) {
  await supabase().from("habit_logs").delete().eq("id", id).throwOnError();
}

// ============================================================
// Daily Logs
// ============================================================
export async function fetchDailyLogs(userId: string): Promise<DailyLog[]> {
  const { data } = await supabase().from("daily_logs").select("*").eq("user_id", userId);
  return (data || []).map((r: Row) => ({
    date: r.date, studyHours: r.study_hours || {},
    gymCompleted: r.gym_completed, habitsCompleted: r.habits_completed || [],
    mood: r.mood || undefined, energy: r.energy || undefined,
    notes: r.notes || undefined,
  }));
}

export async function upsertDailyLogs(userId: string, logs: DailyLog[]) {
  const rows = logs.map((l) => ({
    user_id: userId, date: l.date, study_hours: l.studyHours,
    gym_completed: l.gymCompleted, habits_completed: l.habitsCompleted,
    mood: l.mood || null, energy: l.energy || null, notes: l.notes || "",
  }));
  await supabase().from("daily_logs").upsert(rows, { onConflict: "user_id,date" }).throwOnError();
}

// ============================================================
// AI Suggestions
// ============================================================
export async function fetchAiSuggestions(userId: string): Promise<Recommendation[]> {
  const { data } = await supabase().from("ai_suggestions")
    .select("*").eq("user_id", userId).eq("dismissed", false)
    .order("generated_at", { ascending: false }).limit(20);
  return (data || []).map((r: Row) => ({
    id: r.id, type: r.type, priority: r.priority,
    message: r.message, action: r.action || undefined,
    date: r.date, dismissed: r.dismissed,
  }));
}

export async function dismissAiSuggestion(id: string) {
  await supabase().from("ai_suggestions").update({ dismissed: true }).eq("id", id).throwOnError();
}

// ============================================================
// Full Sync
// ============================================================
export async function syncAllToSupabase(userId: string, data: AppData) {
  const results = await Promise.allSettled([
    upsertUserSubjects(userId, data.subjects),
    upsertScheduleBlocks(userId, data.schedule),
    upsertTopics(userId, data.topics),
    upsertClassNotes(userId, data.notes),
    upsertGymSessions(userId, data.gymSessions),
    upsertStrengthHistory(userId, data.strengthHistory),
    upsertHabits(userId, data.habits),
    upsertHabitLogs(userId, data.habitLogs),
    upsertDailyLogs(userId, data.dailyLogs),
  ]);
  
  results.forEach((res, i) => {
    if (res.status === "rejected") {
      console.error(`Sync failed for table index ${i}:`, res.reason);
    }
  });
}

export async function fetchAllFromSupabase(userId: string): Promise<AppData> {
  const [subjects, schedule, topics, notes, gymSessions, strengthHistory, habits, habitLogs, dailyLogs] =
    await Promise.all([
      fetchUserSubjects(userId),
      fetchScheduleBlocks(userId),
      fetchTopics(userId),
      fetchClassNotes(userId),
      fetchGymSessions(userId),
      fetchStrengthHistory(userId),
      fetchHabits(userId),
      fetchHabitLogs(userId),
      fetchDailyLogs(userId),
    ]);

  return {
    subjects, schedule, topics, notes, gymSessions, strengthHistory,
    habits, habitLogs, dailyLogs, recommendations: [],
    settings: { darkMode: false, lastUpdated: "" },
  };
}
