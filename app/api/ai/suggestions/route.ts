import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateRecommendations } from "@/lib/recommendations";
import { AppData, ScheduleBlock, Topic, ClassNote, GymSession, Habit, HabitLog, DailyLog, StrengthHistory, UserSubject } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

function rowToScheduleBlock(r: Row): ScheduleBlock {
  return {
    id: r.id, title: r.title, type: r.type,
    subject: r.subject || undefined, topic: r.topic || undefined,
    startTime: r.start_time, endTime: r.end_time,
    date: r.date, status: r.status, notes: r.notes || undefined,
  };
}

function rowToTopic(r: Row): Topic {
  return {
    id: r.id, name: r.name, subject: r.subject,
    subtopics: r.subtopics || [],
    strength: r.strength, confidence: r.confidence,
    lastRevised: r.last_revised,
    questionsPracticed: r.questions_practiced,
    accuracy: r.accuracy, notes: r.notes || "",
    doubts: Array.isArray(r.doubts) ? r.doubts : [],
    classCovered: r.class_covered, revisionNeeded: r.revision_needed,
  };
}

function rowToClassNote(r: Row): ClassNote {
  return {
    id: r.id, date: r.date, subject: r.subject,
    topic: r.topic, subtopic: r.subtopic || undefined,
    difficulty: r.difficulty, summary: r.summary,
    doubts: Array.isArray(r.doubts) ? r.doubts : [],
    understood: r.understood, needsRevision: r.needs_revision,
    tags: r.tags || [], fileMetadata: r.file_metadata || [],
  };
}

function rowToGymSession(r: Row): GymSession {
  return {
    id: r.id, date: r.date, type: r.type,
    exercises: r.exercises || [], completed: r.completed,
    duration: r.duration || undefined,
    bodyweight: r.bodyweight || undefined,
    notes: r.notes || undefined,
    cardioDistance: r.cardio_distance || undefined,
    cardioDuration: r.cardio_duration || undefined,
  };
}

function rowToHabit(r: Row): Habit {
  return {
    id: r.id, name: r.name, category: r.category,
    icon: r.icon || undefined,
    targetDays: r.target_days || [0,1,2,3,4,5,6],
    active: r.active,
    startDate: r.start_date || r.created_at?.split("T")[0] || "2024-01-01",
  };
}

function rowToHabitLog(r: Row): HabitLog {
  return {
    id: r.id, habitId: r.habit_id, date: r.date,
    completed: r.completed, value: r.value || undefined,
    notes: r.notes || undefined,
  };
}

function rowToDailyLog(r: Row): DailyLog {
  return {
    date: r.date,
    studyHours: r.study_hours || {},
    gymCompleted: r.gym_completed,
    habitsCompleted: r.habits_completed || [],
    mood: r.mood || undefined,
    energy: r.energy || undefined,
    notes: r.notes || undefined,
  };
}

function rowToStrengthHistory(r: Row): StrengthHistory {
  return {
    date: r.date, exercise: r.exercise,
    weight: r.weight, reps: r.reps, setNumber: r.set_number,
  };
}

function rowToUserSubject(r: Row): UserSubject {
  return {
    id: r.id, name: r.name, color: r.color, order: r.sort_order,
  };
}

async function fetchAllUserData(userId: string, supabase: Awaited<ReturnType<typeof createClient>>): Promise<AppData> {
  const [subjectsRes, scheduleRes, topicsRes, notesRes, gymRes, strengthRes, habitsRes, habitLogsRes, dailyRes] =
    await Promise.all([
      supabase.from("user_subjects").select("*").eq("user_id", userId),
      supabase.from("schedule_blocks").select("*").eq("user_id", userId),
      supabase.from("topics").select("*").eq("user_id", userId),
      supabase.from("class_notes").select("*").eq("user_id", userId),
      supabase.from("gym_sessions").select("*").eq("user_id", userId),
      supabase.from("strength_history").select("*").eq("user_id", userId),
      supabase.from("habits").select("*").eq("user_id", userId),
      supabase.from("habit_logs").select("*").eq("user_id", userId),
      supabase.from("daily_logs").select("*").eq("user_id", userId),
    ]);

  return {
    subjects: (subjectsRes.data || []).map(rowToUserSubject),
    schedule: (scheduleRes.data || []).map(rowToScheduleBlock),
    topics: (topicsRes.data || []).map(rowToTopic),
    notes: (notesRes.data || []).map(rowToClassNote),
    gymSessions: (gymRes.data || []).map(rowToGymSession),
    strengthHistory: (strengthRes.data || []).map(rowToStrengthHistory),
    habits: (habitsRes.data || []).map(rowToHabit),
    habitLogs: (habitLogsRes.data || []).map(rowToHabitLog),
    dailyLogs: (dailyRes.data || []).map(rowToDailyLog),
    recommendations: [],
    settings: { darkMode: false, lastUpdated: "" },
  };
}

function hasEnoughDataForSuggestions(data: AppData): boolean {
  return data.topics.length > 0 ||
    data.schedule.length > 0 ||
    data.gymSessions.length > 0 ||
    data.habits.length > 0 ||
    data.notes.length > 0;
}

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userData = await fetchAllUserData(user.id, supabase);

    // If user has no data, return empty suggestions with a message
    if (!hasEnoughDataForSuggestions(userData)) {
      return NextResponse.json({
        suggestions: [],
        message: "Add some data first — subjects, schedule blocks, workouts, habits, or notes — then generate suggestions.",
      });
    }

    // Try AI first, fall back to rule-based
    let suggestions;
    let source = "rule-based";

    try {
      const apiKey = process.env.AI_API_KEY;
      if (!apiKey) {
        throw new Error("AI_API_KEY not configured");
      }
      const { getAiProvider } = await import("@/lib/ai/providers");
      const { buildAiPrompt } = await import("@/lib/ai/prompt-builder");
      const { parseAiResponse } = await import("@/lib/ai/parser");

      const provider = getAiProvider();
      const prompt = buildAiPrompt(userData);
      const response = await provider.generateSuggestions(prompt);
      suggestions = parseAiResponse(response);
      source = "ai";
    } catch (aiErr) {
      console.warn("AI failed, using rule-based:", aiErr);
      suggestions = generateRecommendations(userData);
    }

    // Save suggestions to database
    if (suggestions.length > 0) {
      const toInsert = suggestions.map((s) => ({
        user_id: user.id,
        type: s.type,
        priority: s.priority,
        message: s.message,
        action: s.action || null,
        date: s.date,
        dismissed: false,
      }));
      await supabase.from("ai_suggestions").insert(toInsert);
    }

    return NextResponse.json({ suggestions, source });
  } catch (error) {
    console.error("AI suggestions error:", error);
    return NextResponse.json({ suggestions: [], source: "error" });
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data } = await supabase
      .from("ai_suggestions")
      .select("*")
      .eq("user_id", user.id)
      .eq("dismissed", false)
      .order("generated_at", { ascending: false })
      .limit(20);

    const suggestions = (data || []).map((row) => ({
      id: row.id, type: row.type, priority: row.priority,
      message: row.message, action: row.action,
      date: row.date, dismissed: row.dismissed,
    }));

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Fetch suggestions error:", error);
    return NextResponse.json({ suggestions: [] });
  }
}
