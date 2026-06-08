"use client";

import { useState } from "react";
import { useData } from "@/components/DataProvider";
import { generateRecommendations } from "@/lib/recommendations";
import { getToday, getWeekDates } from "@/lib/utils";
import { ScheduleBlock, BlockStatus, Subject } from "@/lib/types";
import { generateId } from "@/lib/utils";
import { deleteScheduleBlock } from "@/lib/data/supabase-data";
import ScheduleCard from "@/components/ScheduleCard";
import Modal from "@/components/Modal";
import { Plus, ChevronLeft, ChevronRight, Lightbulb, Calendar } from "lucide-react";

const typeOptions = ["study", "gym", "class", "revision", "mock-test", "cardio", "mobility", "rest", "other"] as const;

export default function SchedulePage() {
  const { data, updateData } = useData();
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(getToday());
  const [showAdd, setShowAdd] = useState(false);
  const [newBlock, setNewBlock] = useState({
    title: "",
    type: "study" as ScheduleBlock["type"],
    subject: "" as Subject,
    startTime: "09:00",
    endTime: "10:30",
    notes: "",
  });

  const availableSubjects = [...new Set(data.topics.map(t => t.subject))];

  const weekDates = getWeekDates(weekOffset);
  const dayBlocks = data.schedule
    .filter((b) => b.date === selectedDay)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const recommendations = generateRecommendations(data);
  const scheduleRecs = recommendations.filter((r) => r.type === "schedule" || r.type === "warning").slice(0, 3);

  const handleAdd = () => {
    const block: ScheduleBlock = {
      id: generateId(),
      title: newBlock.title || `${newBlock.type} block`,
      type: newBlock.type,
      subject: newBlock.type === "study" || newBlock.type === "revision" ? newBlock.subject : undefined,
      startTime: newBlock.startTime,
      endTime: newBlock.endTime,
      date: selectedDay,
      status: "pending",
      notes: newBlock.notes,
    };
    updateData((d) => ({ ...d, schedule: [...d.schedule, block] }));
    setShowAdd(false);
    setNewBlock({ title: "", type: "study", subject: "", startTime: "09:00", endTime: "10:30", notes: "" });
  };

  const handleStatusChange = (id: string, status: BlockStatus) => {
    updateData((d) => ({
      ...d,
      schedule: d.schedule.map((b) => (b.id === id ? { ...b, status } : b)),
    }));
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteScheduleBlock(id);
    } catch (err) {
      console.error("Failed to delete schedule block from backend:", err);
    }
    updateData((d) => ({ ...d, schedule: d.schedule.filter((b) => b.id !== id) }));
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Schedule Planner</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Plan and manage your day</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors"
        >
          <Plus size={16} /> Add Block
        </button>
      </div>

      <div className="flex items-center gap-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-1 shadow-sm">
        <button
          onClick={() => setWeekOffset((w) => w - 1)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex-1 flex overflow-x-auto">
          {weekDates.map((date) => {
            const isSelected = date === selectedDay;
            const isToday = date === getToday();
            const blocks = data.schedule.filter((b) => b.date === date);
            return (
              <button
                key={date}
                onClick={() => setSelectedDay(date)}
                className={`flex-1 min-w-[60px] py-2 px-1 rounded-lg text-center transition-colors ${
                  isSelected
                    ? "bg-violet-600 text-white"
                    : isToday
                    ? "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400"
                    : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                }`}
              >
                <p className={`text-[10px] uppercase ${isSelected ? "text-violet-200" : "text-gray-400"}`}>
                  {new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" })}
                </p>
                <p className={`text-lg font-semibold ${isSelected ? "text-white" : "text-gray-900 dark:text-gray-100"}`}>
                  {new Date(date + "T00:00:00").getDate()}
                </p>
                {blocks.length > 0 && (
                  <div className="flex justify-center gap-0.5 mt-1">
                    {blocks.slice(0, 4).map((b, i) => (
                      <div
                        key={i}
                        className={`w-1 h-1 rounded-full ${
                          b.status === "completed" ? "bg-emerald-400" : b.status === "skipped" ? "bg-red-400" : isSelected ? "bg-violet-300" : "bg-gray-300 dark:bg-gray-600"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setWeekOffset((w) => w + 1)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Calendar size={16} />
                {new Date(selectedDay + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </h2>
              <span className="text-sm text-gray-400">
                {dayBlocks.filter((b) => b.status === "completed").length}/{dayBlocks.length} done
              </span>
            </div>
            <div className="space-y-2">
              {dayBlocks.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-12">No blocks scheduled. Click &quot;Add Block&quot; to start.</p>
              ) : (
                dayBlocks.map((block) => (
                  <div key={block.id}>
                    <ScheduleCard block={block} onStatusChange={handleStatusChange} onDelete={() => handleDelete(block.id)} readOnly={selectedDay < getToday()} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb size={16} className="text-amber-500" />
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Schedule Suggestions</h2>
            </div>
            <div className="space-y-3">
              {scheduleRecs.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">Schedule looks good!</p>
              ) : (
                scheduleRecs.map((rec) => (
                  <div key={rec.id} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <p className="text-sm text-gray-700 dark:text-gray-300">{rec.message}</p>
                    {rec.action && (
                      <p className="text-xs text-violet-600 dark:text-violet-400 mt-1">{rec.action}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-3">Day Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Total blocks</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{dayBlocks.length}</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Study blocks</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{dayBlocks.filter((b) => b.type === "study").length}</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Completed</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">{dayBlocks.filter((b) => b.status === "completed").length}</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Skipped</span>
                <span className="font-medium text-red-600 dark:text-red-400">{dayBlocks.filter((b) => b.status === "skipped").length}</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Pending</span>
                <span className="font-medium text-amber-600 dark:text-amber-400">{dayBlocks.filter((b) => b.status === "pending").length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Schedule Block">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
            <input
              value={newBlock.title}
              onChange={(e) => setNewBlock({ ...newBlock, title: e.target.value })}
              placeholder="e.g. Physics Practice"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
              <select
                value={newBlock.type}
                onChange={(e) => setNewBlock({ ...newBlock, type: e.target.value as ScheduleBlock["type"] })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {typeOptions.map((t) => (
                  <option key={t} value={t}>{t.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                ))}
              </select>
            </div>
            {(newBlock.type === "study" || newBlock.type === "revision") && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
                {availableSubjects.length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-gray-500 py-2">Add subjects in Study Tracker first</p>
                ) : (
                  <select
                    value={newBlock.subject}
                    onChange={(e) => setNewBlock({ ...newBlock, subject: e.target.value as Subject })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    {availableSubjects.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Time</label>
              <input
                type="time"
                value={newBlock.startTime}
                onChange={(e) => setNewBlock({ ...newBlock, startTime: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Time</label>
              <input
                type="time"
                value={newBlock.endTime}
                onChange={(e) => setNewBlock({ ...newBlock, endTime: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
            <textarea
              value={newBlock.notes}
              onChange={(e) => setNewBlock({ ...newBlock, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            />
          </div>
          <button
            onClick={handleAdd}
            className="w-full py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors"
          >
            Add Block
          </button>
        </div>
      </Modal>
    </div>
  );
}
