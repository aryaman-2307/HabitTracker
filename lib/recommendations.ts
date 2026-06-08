import { AppData, Recommendation } from "./types";
import { generateId, getToday, daysAgo, getLast7Days } from "./utils";

const PRIORITY_WEIGHT = { high: 3, medium: 2, low: 1 };

export const generateRecommendations = (data: AppData): Recommendation[] => {
  const recs: Recommendation[] = [];
  const today = getToday();
  const last7 = getLast7Days();

  const recentSchedule = data.schedule.filter((s) => last7.includes(s.date));
  const missedBlocks = recentSchedule.filter((s) => s.status === "skipped");

  const subjects = [...new Set(data.topics.map((t) => t.subject))];
  subjects.forEach((subj) => {
    const subjTopics = data.topics.filter((t) => t.subject === subj);
    const weakTopics = subjTopics.filter((t) => t.strength < 5);
    const lowAccuracyTopics = subjTopics.filter((t) => t.accuracy < 60);
    const oldRevision = subjTopics.filter((t) => daysAgo(t.lastRevised) > 5);

    weakTopics.forEach((t) => {
      recs.push({
        id: generateId(),
        type: "study",
        priority: "high",
        message: `${t.name} (${subj}) is weak (strength ${t.strength}/10). Add a focused practice session.`,
        action: `Schedule 45 min ${subj} practice on ${t.name}`,
        date: today,
        dismissed: false,
      });
    });

    lowAccuracyTopics.forEach((t) => {
      recs.push({
        id: generateId(),
        type: "study",
        priority: "medium",
        message: `Your ${t.name} (${subj}) accuracy is ${t.accuracy}%. Practice more problems.`,
        action: `Add 20 ${t.name} questions this week`,
        date: today,
        dismissed: false,
      });
    });

    oldRevision.forEach((t) => {
      recs.push({
        id: generateId(),
        type: "revision",
        priority: "high",
        message: `You haven't revised ${t.name} (${subj}) in ${daysAgo(t.lastRevised)} days.`,
        action: `Revise ${t.name} today`,
        date: today,
        dismissed: false,
      });
    });

    const missedForSubject = missedBlocks.filter((b) => b.subject === subj).length;
    if (missedForSubject > 2) {
      const freeSlot = data.schedule.find((s) => s.date === today && s.status === "pending" && s.type === "rest");
      recs.push({
        id: generateId(),
        type: "schedule",
        priority: "high",
        message: `You missed ${missedForSubject} ${subj} blocks this week. Increase priority or find time.`,
        action: freeSlot ? `Repurpose ${freeSlot.startTime} slot for ${subj}` : `Add a ${subj} revision block`,
        date: today,
        dismissed: false,
      });
    }
  });

  const gymSessions = data.gymSessions.filter((s) => last7.includes(s.date));
  const upperSessions = gymSessions.filter((s) => s.type === "upper");
  const lowerSessions = gymSessions.filter((s) => s.type === "lower");
  const completedSessions = gymSessions.filter((s) => s.completed);

  if (gymSessions.length > 0) {
    const completionRate = completedSessions.length / gymSessions.length;
    if (completionRate < 0.7) {
      recs.push({
        id: generateId(),
        type: "gym",
        priority: "high",
        message: `Gym completion rate is ${Math.round(completionRate * 100)}% this week. Stay consistent.`,
        action: "Complete your next scheduled workout",
        date: today,
        dismissed: false,
      });
    }
    if (lowerSessions.length < 2 && upperSessions.length >= 2) {
      recs.push({
        id: generateId(),
        type: "gym",
        priority: "medium",
        message: `Upper/lower imbalance: ${upperSessions.length} upper vs ${lowerSessions.length} lower sessions.`,
        action: "Schedule a lower body session",
        date: today,
        dismissed: false,
      });
    }
  }

  const recentLogs = data.habitLogs.filter((l) => last7.includes(l.date));
  data.habits.filter((h) => h.active).forEach((habit) => {
    const habitLogs = recentLogs.filter((l) => l.habitId === habit.id);
    const targetCount = habit.targetDays.filter((d) => {
      const dayDate = new Date(today + "T00:00:00");
      dayDate.setDate(dayDate.getDate() - dayDate.getDay() + d);
      return last7.includes(`${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, "0")}-${String(dayDate.getDate()).padStart(2, "0")}`);
    }).length;
    const completedCount = habitLogs.filter((l) => l.completed).length;
    if (targetCount > 0 && completedCount / targetCount < 0.5) {
      recs.push({
        id: generateId(),
        type: "habit",
        priority: "medium",
        message: `"${habit.name}" completion is low (${completedCount}/${targetCount}). Focus on consistency.`,
        action: `Track "${habit.name}" daily`,
        date: today,
        dismissed: false,
      });
    }
  });

  const todayBlocks = data.schedule.filter((s) => s.date === today);
  const totalMinutes = todayBlocks.reduce((acc, b) => {
    const [sh, sm] = b.startTime.split(":").map(Number);
    const [eh, em] = b.endTime.split(":").map(Number);
    return acc + (eh * 60 + em - sh * 60 - sm);
  }, 0);
  if (totalMinutes > 720) {
    recs.push({
      id: generateId(),
      type: "warning",
      priority: "high",
      message: `Today has ${Math.round(totalMinutes / 60)} hours of scheduled blocks. Consider reducing workload.`,
      action: "Move non-critical blocks to tomorrow",
      date: today,
      dismissed: false,
    });
  }

  const unpracticedNotes = data.notes.filter((n) => n.needsRevision && daysAgo(n.date) > 3);
  unpracticedNotes.forEach((n) => {
    recs.push({
      id: generateId(),
      type: "revision",
      priority: "medium",
      message: `You covered "${n.topic}" (${n.subject}) in class ${daysAgo(n.date)} days ago but marked for revision.`,
      action: `Revise ${n.topic} notes and practice questions`,
      date: today,
      dismissed: false,
    });
  });

  recs.sort((a, b) => PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority]);
  return recs.slice(0, 15);
};
