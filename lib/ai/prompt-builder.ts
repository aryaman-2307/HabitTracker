import { AppData } from "../types";
import { getToday, daysAgo, getLast7Days } from "../utils";

export function buildAiPrompt(data: AppData): string {
  const today = getToday();
  const last7 = getLast7Days();

  const recentSchedule = data.schedule.filter((s) => last7.includes(s.date));
  const todaySchedule = data.schedule.filter((s) => s.date === today);

  const subjects = [...new Set(data.topics.map((t) => t.subject))];
  const topicSummary = subjects
    .map((subj) => {
      const topics = data.topics.filter((t) => t.subject === subj);
      if (topics.length === 0) return `${subj}: No topics tracked`;
      const weak = topics.filter((t) => t.strength < 5);
      const stale = topics.filter((t) => daysAgo(t.lastRevised) > 5);
      const lowAcc = topics.filter((t) => t.accuracy < 60);
      const avgStr = Math.round(topics.reduce((a, t) => a + t.strength, 0) / topics.length);
      const avgAcc = Math.round(topics.reduce((a, t) => a + t.accuracy, 0) / topics.length);
      let line = `${subj}: ${topics.length} topics, avg strength ${avgStr}/10, avg accuracy ${avgAcc}%`;
      if (weak.length) line += `, weak: ${weak.map((t) => t.name).join(", ")}`;
      if (stale.length) line += `, not revised in 5+ days: ${stale.map((t) => t.name).join(", ")}`;
      if (lowAcc.length) line += `, low accuracy: ${lowAcc.map((t) => `${t.name}(${t.accuracy}%)`).join(", ")}`;
      return line;
    })
    .join("\n");

  const notesSummary = data.notes
    .filter((n) => daysAgo(n.date) <= 7)
    .map((n) => `- ${n.subject} > ${n.topic}${n.subtopic ? ` > ${n.subtopic}` : ""} (${n.date})${n.needsRevision ? " [NEEDS REVISION]" : ""}${n.doubts.length ? ` [DOUBTS: ${n.doubts.map((d) => d.text).join(", ")}]` : ""}`)
    .join("\n") || "No recent class notes";

  const scheduleSummary = recentSchedule
    .map((s) => `- ${s.date}: ${s.title} (${s.type}${s.subject ? `, ${s.subject}` : ""}) → ${s.status}`)
    .join("\n") || "No schedule data";

  const gymSummary = (() => {
    const recent = data.gymSessions.filter((s) => last7.includes(s.date));
    const upper = recent.filter((s) => s.type === "upper").length;
    const lower = recent.filter((s) => s.type === "lower").length;
    const cardio = recent.filter((s) => s.type === "cardio").length;
    const completed = recent.filter((s) => s.completed).length;
    const rate = recent.length > 0 ? Math.round((completed / recent.length) * 100) : 0;
    return `Gym: ${recent.length} sessions (${upper} upper, ${lower} lower, ${cardio} cardio), completion ${rate}%.`;
  })();

  const habitSummary = (() => {
    const habits = data.habits.filter((h) => h.active);
    const last7Logs = data.habitLogs.filter((l) => last7.includes(l.date));
    const stats = habits
      .map((h) => {
        const logs = last7Logs.filter((l) => l.habitId === h.id);
        const done = logs.filter((l) => l.completed).length;
        const rate = logs.length > 0 ? Math.round((done / logs.length) * 100) : 0;
        return `${h.name}: ${rate}%`;
      })
      .join(", ");
    return `Habits: ${stats || "No habits tracked"}`;
  })();

  const todayMinutes = todaySchedule.reduce((acc, b) => {
    const [sh, sm] = b.startTime.split(":").map(Number);
    const [eh, em] = b.endTime.split(":").map(Number);
    return acc + (eh * 60 + em - sh * 60 - sm);
  }, 0);

  const studyHours: Record<string, number> = {};
  data.dailyLogs.filter((l) => last7.includes(l.date)).forEach((l) => {
    Object.entries(l.studyHours).forEach(([subj, hrs]) => {
      studyHours[subj] = (studyHours[subj] || 0) + hrs;
    });
  });
  const studyHoursStr = Object.entries(studyHours).map(([s, h]) => `${s}: ${h}h`).join(", ") || "No study hours logged";

  return `You are a personal productivity coach for a student. Analyze their data and give practical, specific suggestions.

## Current Date: ${today}

## Study Data (Last 7 Days)
${topicSummary}

## Weekly Study Hours
${studyHoursStr}

## Schedule (Last 7 Days)
${scheduleSummary}

## Today's Schedule (${todaySchedule.length} blocks, ${Math.round(todayMinutes / 60)}h total)
${todaySchedule.map((s) => `- ${s.startTime}-${s.endTime}: ${s.title} (${s.status})`).join("\n") || "No blocks today"}

## Class Notes (Last 7 Days)
${notesSummary}

## Gym & Training
${gymSummary}

## Habits
${habitSummary}

## Instructions
Generate 6-8 practical, actionable suggestions. Be specific with numbers, times, and topic names from their data. Focus on:
1. Schedule adjustments for today or tomorrow
2. Which topics need immediate revision or practice
3. Subject priority recommendations based on weak areas
4. Gym/training balance suggestions
5. Habit streak recovery if any are broken
6. Workload management if the day is overloaded

Return your response as a JSON array with this exact format:
[
  {
    "type": "schedule" | "study" | "gym" | "habit" | "revision" | "warning",
    "priority": "high" | "medium" | "low",
    "message": "Your suggestion message here",
    "action": "Specific action to take"
  }
]

Only return the JSON array, no other text.`;
}
