"use client";

import { useState } from "react";
import { useData } from "@/components/DataProvider";
import { getToday, getDayName, formatDate } from "@/lib/utils";
import ScheduleCard from "@/components/ScheduleCard";
import { BlockStatus, Recommendation, getSubjectColor } from "@/lib/types";
import {
  CheckCircle, Clock, Dumbbell, Target, Zap, Calendar,
  ArrowUpRight, BookOpen, FileText, Sparkles, RefreshCw, TrendingUp, AlertTriangle, Plus
} from "lucide-react";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const chartTooltipStyle = {
  backgroundColor: "#1a1b1e",
  border: "1px solid #26272c",
  borderRadius: 12,
  color: "#ededef",
  fontSize: 12,
  boxShadow: "0 8px 24px rgb(0 0 0 / 0.3)",
};

export default function DashboardPage() {
  const { data, updateData } = useData();
  const today = getToday();
  const todayBlocks = data.schedule.filter((b) => b.date === today);
  const completedToday = todayBlocks.filter((b) => b.status === "completed");

  const subjects = [...new Set(data.topics.map(t => t.subject))];
  const subjectColors = Object.fromEntries(subjects.map((s) => [s, getSubjectColor(s, data.subjects)]));

  const allSubjectKeys = new Set<string>();
  data.dailyLogs.forEach(l => Object.keys(l.studyHours).forEach(k => allSubjectKeys.add(k)));
  const subjectKeys = [...allSubjectKeys];

  const [aiSuggestions, setAiSuggestions] = useState<Recommendation[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const hasAnyData = data.topics.length > 0 || data.schedule.length > 0 ||
    data.gymSessions.length > 0 || data.habits.length > 0 || data.notes.length > 0;

  const handleGenerateSuggestions = async () => {
    if (aiLoading) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch("/api/ai/suggestions", { method: "POST", signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error("Failed to generate suggestions");
      const result = await res.json();
      setAiSuggestions(result.suggestions || []);
      if (result.source === "rule-based") setAiError("Using rule-based suggestions (AI unavailable)");
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setAiError("Suggestions timed out. Try again later.");
      } else {
        setAiError("Failed to generate suggestions. Try again.");
      }
    } finally {
      setAiLoading(false);
    }
  };

  const dismissSuggestion = (id: string) => {
    setAiSuggestions((prev) => prev.filter((s) => s.id !== id));
  };

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });

  const weeklyStudyHours = last7.map((date) => {
    const log = data.dailyLogs.find((l) => l.date === date);
    const entry: Record<string, string | number> = {
      date: new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" }),
    };
    subjectKeys.forEach(k => {
      entry[k] = (log?.studyHours as Record<string, number>)?.[k] || 0;
    });
    return entry;
  });

  const totalStudyHours = weeklyStudyHours.reduce((acc, d) => {
    return acc + subjectKeys.reduce((sum, k) => sum + ((d[k] as number) || 0), 0);
  }, 0);
  const gymThisWeek = data.gymSessions.filter((s) => last7.includes(s.date) && s.completed).length;
  const habitsToday = data.habitLogs.filter((l) => l.date === today && l.completed).length;
  const habitsTotal = data.habitLogs.filter((l) => l.date === today).length;

  const subjectProgress = subjects.map((subj) => {
    const topics = data.topics.filter((t) => t.subject === subj);
    const avgStrength = topics.length ? topics.reduce((a, t) => a + t.strength, 0) / topics.length : 0;
    return { subject: subj, strength: Math.round(avgStrength * 10) / 10, topics: topics.length };
  });

  const weakTopics = data.topics.filter((t) => t.strength < 5).sort((a, b) => a.strength - b.strength).slice(0, 4);

  const handleBlockStatus = (id: string, status: BlockStatus) => {
    updateData((d) => ({
      ...d,
      schedule: d.schedule.map((b) => (b.id === id ? { ...b, status } : b)),
    }));
  };

  const completionPercent = todayBlocks.length ? Math.round((completedToday.length / todayBlocks.length) * 100) : 0;

  const chartBarRadius = (i: number): [number, number, number, number] => i === subjectKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {getDayName(today)}, {formatDate(today)}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Your daily overview</p>
        </div>
        {todayBlocks.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">Today&apos;s Progress</span>
            <div className="w-28 h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${completionPercent}%` }} />
            </div>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{completionPercent}%</span>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { icon: Clock, label: "Study Hours", value: `${totalStudyHours}h`, sub: "This week", color: "text-amber-500" },
          { icon: Dumbbell, label: "Workouts", value: gymThisWeek, sub: "This week", color: "text-emerald-500" },
          { icon: CheckCircle, label: "Habits", value: `${habitsToday}/${habitsTotal}`, sub: "Today", color: "text-amber-500" },
          { icon: Target, label: "Tasks", value: `${completedToday.length}/${todayBlocks.length}`, sub: "Completed", color: "text-blue-500" },
          { icon: TrendingUp, label: "Weak Topics", value: weakTopics.length, sub: "Need focus", color: "text-red-500" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200/60 dark:border-gray-800 p-4 shadow-sm">
            <div className={`flex items-center gap-2 ${stat.color} text-sm mb-1`}>
              <stat.icon size={14} /> {stat.label}
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stat.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Schedule */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200/60 dark:border-gray-800 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">Today&apos;s Schedule</h2>
              <Link href="/schedule" className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1 hover:underline">
                View all <ArrowUpRight size={14} />
              </Link>
            </div>
            {todayBlocks.length === 0 ? (
              <div className="text-center py-8">
                <Calendar size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">No schedule for today</p>
                <Link href="/schedule" className="inline-flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400 hover:underline">
                  <Plus size={14} /> Create your first schedule
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {todayBlocks.sort((a, b) => a.startTime.localeCompare(b.startTime)).map((block) => (
                  <ScheduleCard key={block.id} block={block} onStatusChange={handleBlockStatus} />
                ))}
              </div>
            )}
          </div>

          {/* Weekly Study Hours */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200/60 dark:border-gray-800 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Weekly Study Hours</h2>
            {subjectKeys.length === 0 ? (
              <div className="text-center py-8">
                <Clock size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">No study data yet</p>
                <Link href="/study" className="inline-flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400 hover:underline">
                  <Plus size={14} /> Add subjects and topics
                </Link>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={weeklyStudyHours}>
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    {subjectKeys.map((key, i) => (
                      <Bar key={key} dataKey={key} stackId="a" fill={subjectColors[key] || "#6b7280"} radius={chartBarRadius(i)} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 mt-2">
                  {subjectKeys.map((subj) => (
                    <div key={subj} className="flex items-center gap-1.5 text-xs text-gray-500">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: subjectColors[subj] || "#6b7280" }} />
                      {subj}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Subject Progress */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200/60 dark:border-gray-800 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">Subject Progress</h2>
              <Link href="/analytics" className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1 hover:underline">
                Details <ArrowUpRight size={14} />
              </Link>
            </div>
            {subjectProgress.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">No subjects added yet</p>
                <Link href="/study" className="inline-flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400 hover:underline">
                  <Plus size={14} /> Add your first subject
                </Link>
              </div>
            ) : (
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(subjectProgress.length, 4)}, minmax(0, 1fr))` }}>
                {subjectProgress.map((s) => (
                  <div key={s.subject} className="text-center">
                    <div className="relative w-16 h-16 mx-auto mb-2">
                      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15" fill="none" stroke="#e5e7eb" strokeWidth="3" className="dark:stroke-gray-700" />
                        <circle cx="18" cy="18" r="15" fill="none" stroke={subjectColors[s.subject] || "#6b7280"} strokeWidth="3" strokeDasharray={`${(s.strength / 10) * 94.2} 94.2`} strokeLinecap="round" />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-900 dark:text-gray-100">{s.strength}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{s.subject}</p>
                    <p className="text-xs text-gray-400">{s.topics} topics</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* AI Suggestions */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200/60 dark:border-gray-800 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-amber-500" />
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">Suggestions</h2>
              </div>
              <button
                onClick={handleGenerateSuggestions}
                disabled={aiLoading || !hasAnyData}
                className="p-1.5 text-gray-400 hover:text-amber-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                title={!hasAnyData ? "Add data first to get suggestions" : "Generate suggestions"}
              >
                <RefreshCw size={14} className={aiLoading ? "animate-spin" : ""} />
              </button>
            </div>
            {aiError && (
              <p className="text-xs text-amber-500 dark:text-amber-400 mb-3">{aiError}</p>
            )}
            <div className="space-y-3">
              {aiLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse space-y-2">
                      <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-lg w-3/4" />
                      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-lg w-1/2" />
                    </div>
                  ))}
                </div>
              ) : !hasAnyData ? (
                <div className="text-center py-4">
                  <Sparkles size={24} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Add some data first to get suggestions</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Create subjects, schedules, workouts, or habits</p>
                </div>
              ) : aiSuggestions.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">No suggestions yet</p>
                  <button
                    onClick={handleGenerateSuggestions}
                    className="text-sm text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    Generate suggestions
                  </button>
                </div>
              ) : (
                aiSuggestions.slice(0, 4).map((rec) => (
                  <div key={rec.id} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 group">
                    <div className="flex items-start gap-2">
                      <Zap size={14} className={`mt-0.5 shrink-0 ${rec.priority === "high" ? "text-red-500" : rec.priority === "medium" ? "text-amber-500" : "text-gray-400"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 dark:text-gray-300">{rec.message}</p>
                        {rec.action && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{rec.action}</p>}
                      </div>
                      <button onClick={() => dismissSuggestion(rec.id)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-opacity">
                        <AlertTriangle size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Weak Topics */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200/60 dark:border-gray-800 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Weak Topics</h2>
            {weakTopics.length === 0 ? (
              <div className="text-center py-4">
                <Target size={24} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {data.topics.length === 0 ? "Add topics to track weak areas" : "No weak topics — nice work!"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {weakTopics.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.name}</p>
                      <p className="text-xs text-gray-400">{t.subject} · {t.accuracy}% accuracy</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-10 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${t.strength * 10}%`, backgroundColor: t.strength < 4 ? "#ef4444" : "#f59e0b" }} />
                      </div>
                      <span className="text-xs font-medium text-gray-500">{t.strength}/10</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200/60 dark:border-gray-800 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { href: "/study", label: "Study Hub", icon: BookOpen, color: "text-indigo-500" },
                { href: "/schedule", label: "Add Schedule", icon: Calendar, color: "text-amber-500" },
                { href: "/gym", label: "Log Workout", icon: Dumbbell, color: "text-emerald-500" },
                { href: "/habits", label: "Track Habits", icon: CheckCircle, color: "text-amber-500" },
                { href: "/study", label: "Study Hub", icon: FileText, color: "text-blue-500" },
                { href: "/analytics", label: "Analytics", icon: TrendingUp, color: "text-rose-500" },
              ].map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-sm text-gray-700 dark:text-gray-300 border border-transparent hover:border-gray-200/60 dark:hover:border-gray-800"
                >
                  <action.icon size={16} className={action.color} /> {action.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
