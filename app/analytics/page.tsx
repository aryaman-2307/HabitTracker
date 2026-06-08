"use client";

import { useState } from "react";
import { useData } from "@/components/DataProvider";
import { getSubjectColor } from "@/lib/types";
import { getLast7Days } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, Radar, LineChart, Line
} from "recharts";
import { TrendingUp, Clock, Target, Activity, BookOpen, Dumbbell, CheckCircle, Info } from "lucide-react";

const PIE_COLORS = ["#6366f1", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#14b8a6"];

const chartTooltipStyle = {
  backgroundColor: "#1f2937", border: "none", borderRadius: 12,
  color: "#f3f4f6", fontSize: 12, boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
};

function computeProductivityScore(data: ReturnType<typeof useData>["data"]) {
  const last7 = getLast7Days();
  const components: { name: string; value: number; weight: number; hasData: boolean }[] = [];

  // Schedule completion (35%)
  const scheduleBlocks = data.schedule.filter((b) => last7.includes(b.date));
  const scheduleCompleted = scheduleBlocks.filter((b) => b.status === "completed").length;
  const scheduleRate = scheduleBlocks.length > 0 ? Math.round((scheduleCompleted / scheduleBlocks.length) * 100) : 0;
  components.push({ name: "Schedule", value: scheduleRate, weight: 35, hasData: scheduleBlocks.length > 0 });

  // Study progress (25%)
  const studyHours = data.dailyLogs.filter((l) => last7.includes(l.date))
    .reduce((a, l) => a + Object.values(l.studyHours).reduce((b, h) => b + h, 0), 0);
  const studyRate = Math.min(100, Math.round((studyHours / 35) * 100));
  components.push({ name: "Study", value: studyRate, weight: 25, hasData: studyHours > 0 });

  // Habit completion (25%)
  const habitLogs = data.habitLogs.filter((l) => last7.includes(l.date));
  const habitCompleted = habitLogs.filter((l) => l.completed).length;
  const habitRate = habitLogs.length > 0 ? Math.round((habitCompleted / habitLogs.length) * 100) : 0;
  components.push({ name: "Habits", value: habitRate, weight: 25, hasData: habitLogs.length > 0 });

  // Gym consistency (15%)
  const gymSessions = data.gymSessions.filter((s) => last7.includes(s.date) && s.completed);
  const gymRate = Math.min(100, Math.round((gymSessions.length / 5) * 100));
  components.push({ name: "Gym", value: gymRate, weight: 15, hasData: gymSessions.length > 0 });

  const activeComponents = components.filter((c) => c.hasData);
  if (activeComponents.length === 0) return { score: 0, components, hasData: false };

  const totalWeight = activeComponents.reduce((a, c) => a + c.weight, 0);
  const score = Math.round(activeComponents.reduce((a, c) => a + (c.value * c.weight / totalWeight), 0));

  return { score, components, hasData: true };
}

export default function AnalyticsPage() {
  const { data } = useData();
  const last7 = getLast7Days();
  const [selectedExercise, setSelectedExercise] = useState<string>("");

  const subjects = [...new Set(data.topics.map((t) => t.subject))];
  const studySubjectKeys = [...new Set(data.dailyLogs.flatMap((l) => Object.keys(l.studyHours)))];

  const weeklyStudyData = last7.map((date) => {
    const log = data.dailyLogs.find((l) => l.date === date);
    const entry: Record<string, string | number> = {
      day: new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" }),
    };
    let total = 0;
    for (const key of studySubjectKeys) {
      const val = log?.studyHours[key] ?? 0;
      entry[key] = val;
      total += val;
    }
    entry.total = total;
    return entry;
  });

  const subjectProgress = subjects.map((subj) => {
    const topics = data.topics.filter((t) => t.subject === subj);
    const avg = topics.length ? Math.round(topics.reduce((a, t) => a + t.strength, 0) / topics.length * 10) / 10 : 0;
    const avgAcc = topics.length ? Math.round(topics.reduce((a, t) => a + t.accuracy, 0) / topics.length) : 0;
    return { subject: subj, strength: avg, accuracy: avgAcc, topics: topics.length, questions: topics.reduce((a, t) => a + t.questionsPracticed, 0) };
  });

  const subjectPie = subjectProgress.map((s) => ({ name: s.subject, value: s.questions }));

  const topicRadar = subjects.map((subj) => {
    const topics = data.topics.filter((t) => t.subject === subj);
    return {
      subject: subj,
      avgStrength: topics.length ? Math.round(topics.reduce((a, t) => a + t.strength, 0) / topics.length) : 0,
      avgAccuracy: topics.length ? Math.round(topics.reduce((a, t) => a + t.accuracy, 0) / topics.length) : 0,
    };
  });

  const gymWeeklyData = last7.map((date) => {
    const sessions = data.gymSessions.filter((s) => s.date === date && s.completed);
    const totalSets = sessions.reduce((a, s) => a + s.exercises.reduce((b, e) => b + e.sets, 0), 0);
    return {
      day: new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" }),
      sets: totalSets, sessions: sessions.length,
    };
  });

  const habitWeeklyData = last7.map((date) => {
    const logs = data.habitLogs.filter((l) => l.date === date);
    const completed = logs.filter((l) => l.completed).length;
    return {
      day: new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" }),
      rate: logs.length > 0 ? Math.round((completed / logs.length) * 100) : 0,
    };
  });

  const weeklySchedule = last7.map((date) => {
    const blocks = data.schedule.filter((b) => b.date === date);
    return {
      day: new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" }),
      completed: blocks.filter((b) => b.status === "completed").length,
      skipped: blocks.filter((b) => b.status === "skipped").length,
      pending: blocks.filter((b) => b.status === "pending").length,
    };
  });

  const uniqueExercises = [...new Set(data.strengthHistory.map((h) => h.exercise))].sort();
  const exerciseProgression = selectedExercise
    ? data.strengthHistory
        .filter((h) => h.exercise === selectedExercise && h.setNumber === 1)
        .map((h) => ({ date: h.date.slice(5), weight: h.weight, reps: h.reps }))
    : [];

  const { score, components, hasData } = computeProductivityScore(data);
  const hasSubjects = subjects.length > 0;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Analytics</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Performance overview and trends</p>
      </div>

      {/* Productivity Score */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-3">
          <Target size={20} />
          <h2 className="text-lg font-semibold">Productivity Score</h2>
          <div className="relative group ml-1">
            <Info size={14} className="text-white/50 cursor-help" />
            <div className="absolute bottom-full left-0 mb-2 w-72 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              <p className="font-medium mb-1">How it&apos;s calculated:</p>
              {components.map((c) => (
                <p key={c.name}>- {c.name}: {c.value}% (weight: {c.weight}%)</p>
              ))}
              <p className="mt-1 text-white/70">Final = weighted average of components with data</p>
            </div>
          </div>
        </div>
        {hasData ? (
          <>
            <div className="flex items-end gap-4">
              <p className="text-5xl font-bold">{score}</p>
              <div className="pb-2">
                <div className="w-48 h-3 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full" style={{ width: `${score}%` }} />
                </div>
                <p className="text-sm text-white/70 mt-1">out of 100</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              {components.map((c) => (
                <div key={c.name} className="bg-white/10 rounded-xl p-3">
                  <p className="text-sm text-white/70">{c.name} ({c.weight}%)</p>
                  <p className="text-xl font-bold">{c.value}%</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-white/70">Not enough data yet</p>
            <p className="text-sm text-white/50 mt-1">Add schedule, study, habit, or gym data to see your score</p>
          </div>
        )}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200/60 dark:border-gray-800 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={16} className="text-violet-500" />
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Study Hours per Subject</h2>
          </div>
          {studySubjectKeys.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={weeklyStudyData}>
                <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} />
                {studySubjectKeys.map((key, i) => (
                  <Bar key={key} dataKey={key} stackId="a" fill={getSubjectColor(key, data.subjects)} radius={i === studySubjectKeys.length - 1 ? [4, 4, 0, 0] : undefined} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-sm text-gray-400">No study data yet</div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200/60 dark:border-gray-800 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-emerald-500" />
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Subject Strength</h2>
          </div>
          {hasSubjects ? (
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={topicRadar}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                <Radar name="Strength" dataKey="avgStrength" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
                <Radar name="Accuracy" dataKey="avgAccuracy" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-sm text-gray-400">No subjects yet</div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200/60 dark:border-gray-800 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle size={16} className="text-amber-500" />
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Habit Completion Rate</h2>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={habitWeeklyData}>
              <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Area type="monotone" dataKey="rate" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200/60 dark:border-gray-800 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Dumbbell size={16} className="text-rose-500" />
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Workout Volume</h2>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={gymWeeklyData}>
              <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="sets" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200/60 dark:border-gray-800 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} className="text-cyan-500" />
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Schedule Completion</h2>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={weeklySchedule}>
              <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="completed" stackId="a" fill="#10b981" />
              <Bar dataKey="skipped" stackId="a" fill="#ef4444" />
              <Bar dataKey="pending" stackId="a" fill="#d1d5db" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            <div className="flex items-center gap-1.5 text-xs text-gray-500"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Completed</div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500"><div className="w-2.5 h-2.5 rounded-full bg-red-500" /> Skipped</div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500"><div className="w-2.5 h-2.5 rounded-full bg-gray-300" /> Pending</div>
          </div>
        </div>

        {/* Strength Progression */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200/60 dark:border-gray-800 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-indigo-500" />
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">Strength Progression</h2>
            </div>
            {uniqueExercises.length > 0 && (
              <select
                value={selectedExercise}
                onChange={(e) => setSelectedExercise(e.target.value)}
                className="text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              >
                <option value="">Select exercise</option>
                {uniqueExercises.map((ex) => (
                  <option key={ex} value={ex}>{ex}</option>
                ))}
              </select>
            )}
          </div>
          {selectedExercise && exerciseProgression.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={exerciseProgression}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} domain={["dataMin - 5", "dataMax + 5"]} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Line type="monotone" dataKey="weight" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-sm text-gray-400">
              {uniqueExercises.length === 0 ? "No exercises logged yet" : "Select an exercise to see progression"}
            </div>
          )}
        </div>

        {/* Questions Distribution */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200/60 dark:border-gray-800 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={16} className="text-indigo-500" />
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Questions Distribution</h2>
          </div>
          {hasSubjects ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={subjectPie} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                    {subjectPie.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {subjectProgress.map((s, i) => (
                  <div key={s.subject} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{s.subject}</span>
                    <span className="text-sm font-medium text-gray-500">{s.questions}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-sm text-gray-400">No questions data yet</div>
          )}
        </div>
      </div>

      {/* Subject Summary Cards */}
      {hasSubjects ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {subjectProgress.map((s) => (
            <div key={s.subject} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200/60 dark:border-gray-800 p-4 text-center shadow-sm">
              <p className="text-sm text-gray-500 mb-1">{s.subject}</p>
              <div className="relative w-14 h-14 mx-auto mb-2">
                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="#e5e7eb" strokeWidth="3" className="dark:stroke-gray-700" />
                  <circle cx="18" cy="18" r="15" fill="none" stroke={getSubjectColor(s.subject, data.subjects)} strokeWidth="3" strokeDasharray={`${(s.strength / 10) * 94.2} 94.2`} strokeLinecap="round" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-900 dark:text-gray-100">{s.strength}</span>
              </div>
              <p className="text-xs text-gray-400">{s.topics} topics · {s.questions}Q</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200/60 dark:border-gray-800 p-8 text-center shadow-sm">
          <p className="text-gray-400">No subject data yet. Add topics to see summary cards here.</p>
        </div>
      )}
    </div>
  );
}
