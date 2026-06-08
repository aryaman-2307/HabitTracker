"use client";

import { useState } from "react";
import { useData } from "@/components/DataProvider";
import { GymSession, Exercise } from "@/lib/types";
import { generateId, formatDate, getToday, getLast7Days } from "@/lib/utils";
import Modal from "@/components/Modal";
import EmptyState from "@/components/EmptyState";
import { Plus, Dumbbell, CheckCircle, Trash2 } from "lucide-react";
import { deleteGymSession } from "@/lib/data/supabase-data";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

const QUICK_SPLIT_TYPES = ["Upper", "Lower", "Push", "Pull", "Legs", "Full Body", "Cardio", "Mobility"];

const TYPE_COLORS: Record<string, string> = {
  upper: "bg-blue-400",
  lower: "bg-emerald-400",
  push: "bg-sky-400",
  pull: "bg-purple-400",
  legs: "bg-orange-400",
  "full body": "bg-pink-400",
  cardio: "bg-amber-400",
  mobility: "bg-teal-400",
};

function getTypeColor(type: string): string {
  return TYPE_COLORS[type.toLowerCase()] || "bg-gray-400";
}

export default function GymPage() {
  const { data, updateData } = useData();
  const [showAdd, setShowAdd] = useState(false);
  const [showView, setShowView] = useState<string | null>(null);

  const [sessionType, setSessionType] = useState("");
  const [customTypeInput, setCustomTypeInput] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [bodyweight, setBodyweight] = useState("");
  const [notes, setNotes] = useState("");
  const [cardioDist, setCardioDist] = useState("");
  const [cardioDur, setCardioDur] = useState("");

  const [exerciseInput, setExerciseInput] = useState("");
  const [selectedChartExercise, setSelectedChartExercise] = useState("");

  const last7 = getLast7Days();
  const recentSessions = data.gymSessions.filter((s) => last7.includes(s.date));
  const completedSessions = recentSessions.filter((s) => s.completed);

  const typeBreakdown = (() => {
    const counts: Record<string, number> = {};
    completedSessions.forEach((s) => {
      const key = s.type.toLowerCase();
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  })();

  const uniqueExercises = (() => {
    const names = new Set<string>();
    data.gymSessions.forEach((s) => s.exercises.forEach((e) => names.add(e.name)));
    return Array.from(names).sort();
  })();

  const selectedExerciseData = (() => {
    if (!selectedChartExercise) return [];
    return data.strengthHistory
      .filter((h) => h.exercise === selectedChartExercise && h.setNumber === 1)
      .map((h) => ({ date: h.date.slice(5), weight: h.weight }));
  })();

  const weeklyVolume = last7.map((date) => {
    const sessions = data.gymSessions.filter((s) => s.date === date && s.completed);
    const totalSets = sessions.reduce((acc, s) => acc + s.exercises.reduce((a, e) => a + e.sets, 0), 0);
    return { day: new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" }), sets: totalSets };
  });

  const bodyweightData = data.gymSessions
    .filter((s) => s.bodyweight)
    .map((s) => ({ date: s.date.slice(5), weight: Math.round((s.bodyweight || 0) * 10) / 10 }));

  const activeSessionType = customTypeInput.trim() || sessionType;

  const addExerciseFromInput = () => {
    const name = exerciseInput.trim();
    if (!name) return;
    setExercises([...exercises, { id: generateId(), name, sets: 3, reps: 8, weight: 0, rpe: 7 }]);
    setExerciseInput("");
  };

  const updateExercise = (id: string, field: string, value: number) => {
    setExercises(exercises.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  };

  const updateExerciseName = (id: string, name: string) => {
    setExercises(exercises.map((e) => (e.id === id ? { ...e, name } : e)));
  };

  const removeExercise = (id: string) => {
    setExercises(exercises.filter((e) => e.id !== id));
  };

  const handleAdd = () => {
    if (!activeSessionType.trim()) return;

    const session: GymSession = {
      id: generateId(),
      date: getToday(),
      type: activeSessionType.trim(),
      exercises,
      completed: true,
      duration: exercises.reduce((a, e) => a + e.sets * 3, 0),
      bodyweight: bodyweight ? +bodyweight : undefined,
      notes,
      cardioDistance: cardioDist ? +cardioDist : undefined,
      cardioDuration: cardioDur ? +cardioDur : undefined,
    };

    const newHistory: typeof data.strengthHistory = [];
    exercises.forEach((ex) => {
      for (let s = 0; s < ex.sets; s++) {
        newHistory.push({
          date: getToday(),
          exercise: ex.name,
          weight: ex.weight,
          reps: ex.reps,
          setNumber: s + 1,
        });
      }
    });

    updateData((d) => ({
      ...d,
      gymSessions: [...d.gymSessions, session],
      strengthHistory: [...d.strengthHistory, ...newHistory],
    }));

    setShowAdd(false);
    setSessionType("");
    setCustomTypeInput("");
    setExercises([]);
    setBodyweight("");
    setNotes("");
    setCardioDist("");
    setCardioDur("");
    setExerciseInput("");
  };

  const handleDeleteSession = async (id: string) => {
    try {
      await deleteGymSession(id);
    } catch (err) {
      console.error("Failed to delete gym session from backend:", err);
    }
    updateData((d) => ({ ...d, gymSessions: d.gymSessions.filter((s) => s.id !== id) }));
    setShowView(null);
  };

  const viewedSession = data.gymSessions.find((s) => s.id === showView);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Gym & Hybrid Athlete</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Track any training split, any exercise</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors"
        >
          <Plus size={16} /> Log Workout
        </button>
      </div>

      {Object.keys(typeBreakdown).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(typeBreakdown).slice(0, 4).map(([type, count]) => (
            <div key={type} className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Dumbbell size={14} />
                <span className="capitalize">{type}</span>
              </div>
              <p className="text-2xl font-bold text-violet-500">{count}</p>
            </div>
          ))}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1"><CheckCircle size={14} /> Completion</div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {recentSessions.length > 0 ? Math.round((completedSessions.length / recentSessions.length) * 100) : 0}%
            </p>
          </div>
        </div>
      )}

      {Object.keys(typeBreakdown).length === 0 && (
        <div className="grid grid-cols-1 gap-3">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1"><CheckCircle size={14} /> Completion</div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">0%</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Strength Progression</h2>
            {uniqueExercises.length > 0 && (
              <select
                value={selectedChartExercise}
                onChange={(e) => setSelectedChartExercise(e.target.value)}
                className="text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              >
                <option value="">Select exercise</option>
                {uniqueExercises.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            )}
          </div>
          {selectedChartExercise && selectedExerciseData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={selectedExerciseData}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "none", borderRadius: 8, color: "#fff", fontSize: 12 }} />
                <Line type="monotone" dataKey="weight" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              title={selectedChartExercise ? `No data for ${selectedChartExercise}` : "Select an exercise to view progression"}
              description={selectedChartExercise ? "Log this exercise to see your progression" : "Your logged exercises will appear here"}
            />
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-5">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Weekly Volume (Sets)</h2>
          {weeklyVolume.some((d) => d.sets > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyVolume}>
                <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "none", borderRadius: 8, color: "#fff", fontSize: 12 }} />
                <Bar dataKey="sets" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No volume data" description="Log workouts this week to see volume" />
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-5">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Bodyweight Trend</h2>
          {bodyweightData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={bodyweightData}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} domain={["dataMin - 1", "dataMax + 1"]} />
                <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "none", borderRadius: 8, color: "#fff", fontSize: 12 }} />
                <Line type="monotone" dataKey="weight" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No bodyweight data" description="Log bodyweight with your workouts" />
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-5">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Recent Workouts</h2>
        <div className="space-y-2">
          {recentSessions.length === 0 ? (
            <EmptyState title="No workouts logged" description="Log your first workout to start tracking" />
          ) : (
            recentSessions.sort((a, b) => b.date.localeCompare(a.date)).map((session) => (
              <button
                key={session.id}
                onClick={() => setShowView(session.id)}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-8 rounded-full ${getTypeColor(session.type)}`} />
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {session.type}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatDate(session.date)} · {session.exercises.length} exercises
                      {session.bodyweight && ` · ${session.bodyweight}kg BW`}
                    </p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  session.completed ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "bg-gray-100 text-gray-500 dark:bg-gray-800"
                }`}>{session.completed ? "Done" : "Missed"}</span>
              </button>
            ))
          )}
        </div>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Log Workout">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Session Type</label>
            <input
              type="text"
              value={customTypeInput || sessionType}
              onChange={(e) => {
                setCustomTypeInput(e.target.value);
                setSessionType("");
              }}
              placeholder="e.g. Upper, Push, Full Body, Custom..."
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {QUICK_SPLIT_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setSessionType(t.toLowerCase());
                    setCustomTypeInput("");
                  }}
                  className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                    sessionType === t.toLowerCase() && !customTypeInput
                      ? "bg-violet-600 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-violet-100 dark:hover:bg-violet-900/30 hover:text-violet-600"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Exercises</label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={exerciseInput}
                onChange={(e) => setExerciseInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addExerciseFromInput()}
                placeholder="Type exercise name and press Enter"
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400"
              />
              <button
                onClick={addExerciseFromInput}
                className="px-3 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>

            <div className="space-y-2">
              {exercises.map((ex) => (
                <div key={ex.id} className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={ex.name}
                      onChange={(e) => updateExerciseName(ex.id, e.target.value)}
                      className="flex-1 px-2 py-1 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                    <button onClick={() => removeExercise(ex.id)} className="text-gray-400 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" value={ex.sets} placeholder="Sets" min={1}
                      onChange={(e) => updateExercise(ex.id, "sets", +e.target.value)}
                      className="w-16 px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                    <span className="text-xs text-gray-400">×</span>
                    <input
                      type="number" value={ex.reps} placeholder="Reps" min={1}
                      onChange={(e) => updateExercise(ex.id, "reps", +e.target.value)}
                      className="w-16 px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                    <span className="text-xs text-gray-400">@</span>
                    <input
                      type="number" value={ex.weight} placeholder="kg" min={0} step={2.5}
                      onChange={(e) => updateExercise(ex.id, "weight", +e.target.value)}
                      className="w-20 px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bodyweight (kg)</label>
              <input type="number" value={bodyweight} onChange={(e) => setBodyweight(e.target.value)} step={0.1}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cardio Distance (km)</label>
              <input type="number" value={cardioDist} onChange={(e) => setCardioDist(e.target.value)} step={0.5}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cardio Duration (min)</label>
              <input type="number" value={cardioDur} onChange={(e) => setCardioDur(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100" />
            </div>
            <div />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 resize-none" />
          </div>
          <button onClick={handleAdd}
            className="w-full py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors">
            Save Workout
          </button>
        </div>
      </Modal>

      <Modal open={!!showView} onClose={() => setShowView(null)} title={viewedSession ? `${viewedSession.type} - ${formatDate(viewedSession.date)}` : ""}>
        {viewedSession && (
          <div className="space-y-4">
            {viewedSession.bodyweight && <p className="text-sm text-gray-500">Bodyweight: {viewedSession.bodyweight}kg</p>}
            {viewedSession.exercises.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-2">Exercises</p>
                <div className="space-y-1.5">
                  {viewedSession.exercises.map((ex) => (
                    <div key={ex.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-sm">
                      <span className="text-gray-700 dark:text-gray-300">{ex.name}</span>
                      <span className="text-gray-500">{ex.sets}×{ex.reps} @ {ex.weight}kg{ex.rpe ? ` RPE ${ex.rpe}` : ""}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {viewedSession.notes && <p className="text-sm text-gray-500">{viewedSession.notes}</p>}
            <button onClick={() => handleDeleteSession(viewedSession.id)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <Trash2 size={12} /> Delete
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
