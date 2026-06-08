"use client";

import { useState } from "react";
import { useData } from "@/components/DataProvider";
import { Habit, HabitLog } from "@/lib/types";
import { generateId, getToday, getLast7Days, getLast30Days } from "@/lib/utils";
import Modal from "@/components/Modal";
import EmptyState from "@/components/EmptyState";
import { Plus, CheckCircle, Flame, Trash2, Trophy, AlertTriangle } from "lucide-react";
import { deleteHabit } from "@/lib/data/supabase-data";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

const CATEGORY_COLORS: Record<string, string> = {
  routine: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  study: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  fitness: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  wellness: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  focus: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  health: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
};

export default function HabitsPage() {
  const { data, updateData } = useData();
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [showAdd, setShowAdd] = useState(false);
  const [newHabit, setNewHabit] = useState({ name: "", category: "routine" });

  const activeHabits = data.habits.filter((h) => h.active);
  const habitsForDate = activeHabits.filter((h) => h.startDate <= selectedDate);
  const last7 = getLast7Days();
  const last30 = getLast30Days();

  const getStreak = (habitId: string): number => {
    const habit = data.habits.find((h) => h.id === habitId);
    if (!habit) return 0;
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 60; i++) {
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (dateStr < habit.startDate) break;
      const log = data.habitLogs.find((l) => l.habitId === habitId && l.date === dateStr && l.completed);
      if (log) streak++;
      else if (i > 0) break;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  };

  const weeklyCompletion = last7.map((date) => {
    const eligible = activeHabits.filter((h) => h.startDate <= date);
    const logs = data.habitLogs.filter((l) => l.date === date && eligible.some((h) => h.id === l.habitId));
    const completed = logs.filter((l) => l.completed).length;
    return {
      day: new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" }),
      rate: eligible.length > 0 ? Math.round((completed / eligible.length) * 100) : 0,
    };
  });

  const monthlyData = last30.map((date) => {
    const eligible = activeHabits.filter((h) => h.startDate <= date);
    const logs = data.habitLogs.filter((l) => l.date === date && eligible.some((h) => h.id === l.habitId));
    const completed = logs.filter((l) => l.completed).length;
    return {
      date: date.slice(5),
      rate: eligible.length > 0 ? Math.round((completed / eligible.length) * 100) : 0,
    };
  });

  const habitStats = activeHabits.map((h) => {
    const last7Logs = data.habitLogs.filter(
      (l) => l.habitId === h.id && last7.includes(l.date) && l.date >= h.startDate
    );
    const eligibleDays = last7.filter((d) => d >= h.startDate).length;
    const completionRate = eligibleDays > 0
      ? Math.round((last7Logs.filter((l) => l.completed).length / eligibleDays) * 100)
      : 0;
    return { ...h, completionRate, streak: getStreak(h.id) };
  });

  const bestHabit = habitStats.length > 0
    ? habitStats.reduce((best, h) => h.completionRate > best.completionRate ? h : best, habitStats[0])
    : null;
  const worstHabit = habitStats.length > 0
    ? habitStats.reduce((worst, h) => h.completionRate < worst.completionRate ? h : worst, habitStats[0])
    : null;

  const toggleHabit = (habitId: string) => {
    const habit = data.habits.find((h) => h.id === habitId);
    if (!habit) return;
    if (selectedDate < habit.startDate) return;
    const existing = data.habitLogs.find((l) => l.habitId === habitId && l.date === selectedDate);
    if (existing) {
      updateData((d) => ({
        ...d,
        habitLogs: d.habitLogs.map((l) =>
          l.id === existing.id ? { ...l, completed: !l.completed } : l
        ),
      }));
    } else {
      const log: HabitLog = { id: generateId(), habitId, date: selectedDate, completed: true, notes: "" };
      updateData((d) => ({ ...d, habitLogs: [...d.habitLogs, log] }));
    }
  };

  const handleAdd = () => {
    const habit: Habit = {
      id: generateId(),
      name: newHabit.name,
      category: newHabit.category,
      targetDays: [1, 2, 3, 4, 5, 6, 0],
      active: true,
      startDate: getToday(),
    };
    updateData((d) => ({ ...d, habits: [...d.habits, habit] }));
    setShowAdd(false);
    setNewHabit({ name: "", category: "routine" });
  };

  const handleDeleteHabit = async (id: string) => {
    try {
      await deleteHabit(id);
    } catch (err) {
      console.error("Failed to delete habit from backend:", err);
    }
    updateData((d) => ({
      ...d,
      habits: d.habits.filter((h) => h.id !== id),
      habitLogs: d.habitLogs.filter((l) => l.habitId !== id),
    }));
  };

  const completedToday = habitsForDate.filter((h) =>
    data.habitLogs.some((l) => l.habitId === h.id && l.date === selectedDate && l.completed)
  ).length;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Habit Tracker</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Build consistency, track streaks</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors"
        >
          <Plus size={16} /> Add Habit
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1"><CheckCircle size={14} /> Today</div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{completedToday}/{habitsForDate.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1"><Flame size={14} /> Best Streak</div>
          <p className="text-2xl font-bold text-amber-500">
            {habitStats.length > 0 ? Math.max(...habitStats.map((h) => h.streak)) : 0}d
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1"><Trophy size={14} /> Best Habit</div>
          <p className="text-sm font-bold text-emerald-500 truncate">{bestHabit?.name || "-"}</p>
          <p className="text-xs text-gray-400">{bestHabit?.completionRate || 0}%</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1"><AlertTriangle size={14} /> Needs Work</div>
          <p className="text-sm font-bold text-red-500 truncate">{worstHabit?.name || "-"}</p>
          <p className="text-xs text-gray-400">{worstHabit?.completionRate || 0}%</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-1 flex gap-1 overflow-x-auto shadow-sm">
        {getLast7Days().reverse().map((date) => {
          const isToday = date === getToday();
          const isSelected = date === selectedDate;
          const eligible = activeHabits.filter((h) => h.startDate <= date);
          const logs = data.habitLogs.filter((l) => l.date === date && eligible.some((h) => h.id === l.habitId));
          const completed = logs.filter((l) => l.completed).length;
          const total = eligible.length;
          return (
            <button
              key={date}
              onClick={() => setSelectedDate(date)}
              className={`flex-1 min-w-[50px] py-2 px-1 rounded-lg text-center transition-colors ${
                isSelected
                  ? "bg-violet-600 text-white"
                  : isToday
                  ? "bg-violet-50 dark:bg-violet-500/10"
                  : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
              }`}
            >
              <p className={`text-[10px] ${isSelected ? "text-violet-200" : "text-gray-400"}`}>
                {new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" })}
              </p>
              <p className={`text-lg font-bold ${isSelected ? "text-white" : "text-gray-900 dark:text-gray-100"}`}>
                {new Date(date + "T00:00:00").getDate()}
              </p>
              <div className="flex justify-center gap-0.5 mt-1">
                {Array.from({ length: Math.min(total, 5) }).map((_, i) => (
                  <div key={i} className={`w-1 h-1 rounded-full ${
                    i < completed ? (isSelected ? "bg-white" : "bg-emerald-400") : (isSelected ? "bg-violet-300" : "bg-gray-300 dark:bg-gray-600")
                  }`} />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Daily Habits</h2>
        {activeHabits.length === 0 ? (
          <EmptyState title="No habits yet" description="Add your first habit to start tracking" />
        ) : habitsForDate.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            No habits started yet on this date.
          </p>
        ) : (
          <div className="space-y-2">
            {habitsForDate.map((habit) => {
              const isCompleted = data.habitLogs.some(
                (l) => l.habitId === habit.id && l.date === selectedDate && l.completed
              );
              const streak = getStreak(habit.id);
              const beforeStart = selectedDate < habit.startDate;
              return (
                <div
                  key={habit.id}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                    isCompleted ? "bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800" : "bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-800"
                  }`}
                >
                  <button
                    onClick={() => toggleHabit(habit.id)}
                    disabled={beforeStart}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                      beforeStart
                        ? "border-gray-200 dark:border-gray-700 opacity-40 cursor-not-allowed"
                        : isCompleted
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : "border-gray-300 dark:border-gray-600 hover:border-violet-400"
                    }`}
                  >
                    {isCompleted && <CheckCircle size={14} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${isCompleted ? "text-emerald-700 dark:text-emerald-400 line-through" : "text-gray-800 dark:text-gray-200"}`}>
                      {habit.name}
                    </p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${CATEGORY_COLORS[habit.category] || "bg-gray-100 text-gray-500"}`}>
                      {habit.category}
                    </span>
                    {beforeStart && (
                      <p className="text-[10px] text-gray-400 mt-0.5">Habit starts on {habit.startDate}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {streak > 0 && (
                      <div className="flex items-center gap-1 text-xs text-amber-600">
                        <Flame size={12} /> {streak}d
                      </div>
                    )}
                    <button
                      onClick={() => handleDeleteHabit(habit.id)}
                      className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Weekly Completion Rate</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyCompletion}>
              <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "none", borderRadius: 8, color: "#fff", fontSize: 12 }} />
              <Bar dataKey="rate" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">30-Day Trend</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyData}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "none", borderRadius: 8, color: "#fff", fontSize: 12 }} />
              <Line type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Habit Streaks</h2>
        <div className="space-y-2">
          {habitStats
            .sort((a, b) => b.streak - a.streak)
            .map((h) => (
              <div key={h.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                <span className="text-sm text-gray-700 dark:text-gray-300">{h.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{h.completionRate}% this week</span>
                  <span className={`text-sm font-bold ${h.streak >= 5 ? "text-amber-500" : "text-gray-500"}`}>{h.streak}d 🔥</span>
                </div>
              </div>
            ))}
        </div>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New Habit">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Habit Name</label>
            <input
              value={newHabit.name}
              onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })}
              placeholder="e.g. Read 30 minutes"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
            <select
              value={newHabit.category}
              onChange={(e) => setNewHabit({ ...newHabit, category: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="routine">Routine</option>
              <option value="study">Study</option>
              <option value="fitness">Fitness</option>
              <option value="wellness">Wellness</option>
              <option value="focus">Focus</option>
              <option value="health">Health</option>
            </select>
          </div>
          <button
            onClick={handleAdd}
            disabled={!newHabit.name.trim()}
            className="w-full py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50"
          >
            Add Habit
          </button>
        </div>
      </Modal>
    </div>
  );
}
