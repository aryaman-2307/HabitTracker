"use client";

import { useState } from "react";
import { useData } from "@/components/DataProvider";
import { useAuth } from "@/components/AuthProvider";
import { Topic, getSubjectColor, normalizeSubjectName } from "@/lib/types";
import { generateId, getToday, daysAgo } from "@/lib/utils";
import Modal from "@/components/Modal";
import EmptyState from "@/components/EmptyState";
import { Plus, BookOpen, Target, TrendingUp, AlertCircle, ChevronDown, ChevronUp, Edit2, Trash2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from "recharts";
import { deleteTopic, deleteTopicsBySubject, deleteClassNotesBySubject, deleteUserSubject } from "@/lib/data/supabase-data";

export default function JEEPage() {
  const { data, updateData } = useData();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("All");
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [showEditStrength, setShowEditStrength] = useState<string | null>(null);
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [showDeleteSubject, setShowDeleteSubject] = useState<string | null>(null);
  const [newTopic, setNewTopic] = useState({ name: "", subject: "", strength: 5, confidence: 5 });
  const [newSubject, setNewSubject] = useState({ name: "", color: "#6366f1" });
  const [subjectInput, setSubjectInput] = useState("");
  const [editVal, setEditVal] = useState({ strength: 5, accuracy: 50, questions: 0 });
  const [subjectError, setSubjectError] = useState("");

  const allSubjects = [...new Set([...data.subjects.map((s) => s.name), ...data.topics.map((t) => t.subject)])].sort();
  const displayTabs = ["All", ...allSubjects];

  const subjectTopics = activeTab === "All" ? data.topics : data.topics.filter((t) => t.subject === activeTab);
  const subjectColor = activeTab === "All" ? "#6366f1" : getSubjectColor(activeTab, data.subjects);

  const radarData = subjectTopics.map((t) => ({
    topic: t.name.substring(0, 12),
    strength: t.strength,
    accuracy: t.accuracy / 10,
  }));

  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const log = data.dailyLogs.find((l) => l.date === dateStr);
    const hours = activeTab === "All"
      ? Object.values(log?.studyHours || {}).reduce((a, b) => a + b, 0)
      : log?.studyHours[activeTab] || 0;
    return {
      day: d.toLocaleDateString("en-US", { weekday: "short" }),
      hours,
    };
  });

  const totalQuestions = subjectTopics.reduce((a, t) => a + t.questionsPracticed, 0);
  const avgAccuracy = subjectTopics.length
    ? Math.round(subjectTopics.reduce((a, t) => a + t.accuracy, 0) / subjectTopics.length)
    : 0;
  const avgStrength = subjectTopics.length
    ? Math.round(subjectTopics.reduce((a, t) => a + t.strength, 0) / subjectTopics.length * 10) / 10
    : 0;
  const weakCount = subjectTopics.filter((t) => t.strength < 5).length;

  const handleAddTopic = () => {
    const subjectName = newTopic.subject || subjectInput;
    if (!subjectName.trim()) return;

    const normalizedInput = normalizeSubjectName(subjectName);
    const existingTopicSubject = data.topics.find((t) => normalizeSubjectName(t.subject) === normalizedInput);
    const existingUserSubject = data.subjects.find((s) => normalizeSubjectName(s.name) === normalizedInput);
    const resolvedSubject = existingTopicSubject?.subject || existingUserSubject?.name || subjectName.trim();

    if (!existingUserSubject && !existingTopicSubject) {
      updateData((d) => ({
        ...d,
        subjects: [...d.subjects, { id: generateId(), name: subjectName.trim(), color: getSubjectColor(subjectName.trim(), d.subjects), order: d.subjects.length }],
      }));
    }

    const topic: Topic = {
      id: generateId(),
      name: newTopic.name,
      subject: resolvedSubject,
      subtopics: [],
      strength: newTopic.strength,
      confidence: newTopic.confidence,
      lastRevised: getToday(),
      questionsPracticed: 0,
      accuracy: 0,
      notes: "",
      doubts: [],
      classCovered: false,
      revisionNeeded: false,
    };
    updateData((d) => ({ ...d, topics: [...d.topics, topic] }));
    setShowAddTopic(false);
    setNewTopic({ name: "", subject: "", strength: 5, confidence: 5 });
    setSubjectInput("");
  };

  const handleEditStrength = (topicId: string) => {
    updateData((d) => ({
      ...d,
      topics: d.topics.map((t) =>
        t.id === topicId
          ? { ...t, strength: editVal.strength, accuracy: editVal.accuracy, questionsPracticed: editVal.questions, lastRevised: getToday() }
          : t
      ),
    }));
    setShowEditStrength(null);
  };

  const handleDeleteTopic = async (topicId: string) => {
    try {
      await deleteTopic(topicId);
    } catch (err) {
      console.error("Failed to delete topic from backend:", err);
    }
    updateData((d) => ({ ...d, topics: d.topics.filter((t) => t.id !== topicId) }));
  };

  const handleAddSubject = () => {
    if (!newSubject.name.trim()) return;
    const normalizedNew = normalizeSubjectName(newSubject.name);
    const existingSubject = data.subjects.find((s) => normalizeSubjectName(s.name) === normalizedNew);
    const existingFromTopics = data.topics.find((t) => normalizeSubjectName(t.subject) === normalizedNew);
    const conflictName = existingSubject?.name || existingFromTopics?.subject;

    if (conflictName) {
      setSubjectError(`A subject named '${conflictName}' already exists`);
      return;
    }

    updateData((d) => ({
      ...d,
      subjects: [...d.subjects, { id: generateId(), name: newSubject.name.trim(), color: newSubject.color, order: d.subjects.length }],
    }));
    setShowAddSubject(false);
    setNewSubject({ name: "", color: "#6366f1" });
    setSubjectError("");
  };

  const handleDeleteSubject = async (subjectName: string) => {
    const userId = user?.id || "";
    const normalized = normalizeSubjectName(subjectName);
    const displayName = data.subjects.find((s) => normalizeSubjectName(s.name) === normalized)?.name || subjectName;

    // 1. Delete from backend FIRST
    try {
      await deleteTopicsBySubject(userId, subjectName);
      await deleteClassNotesBySubject(userId, subjectName);
      const subjectObj = data.subjects.find((s) => normalizeSubjectName(s.name) === normalized);
      if (subjectObj) {
        await deleteUserSubject(subjectObj.id);
      }
    } catch (err) {
      console.error("Failed to delete subject data from backend:", err);
    }

    // 2. Then update frontend state
    updateData((d) => ({
      ...d,
      subjects: d.subjects.filter((s) => normalizeSubjectName(s.name) !== normalized),
      topics: d.topics.filter((t) => normalizeSubjectName(t.subject) !== normalized),
      notes: d.notes.filter((n) => normalizeSubjectName(n.subject) !== normalized),
    }));

    if (activeTab === displayName || normalizeSubjectName(activeTab) === normalized) setActiveTab("All");
    setShowDeleteSubject(null);
  };

  const subjectFilterOptions = allSubjects;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Study Tracker</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Track your academic progress</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowAddSubject(true); setSubjectError(""); }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <Plus size={16} /> Add Subject
          </button>
          <button
            onClick={() => setShowAddTopic(true)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors"
          >
            <Plus size={16} /> Add Topic
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Subjects</h2>
        </div>
        {allSubjects.length === 0 ? (
          <p className="text-xs text-gray-400">No subjects yet. Add your first subject to get started.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {allSubjects.map((sub) => {
              const color = getSubjectColor(sub, data.subjects);
              return (
                <div key={sub} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-gray-700 dark:text-gray-300">{sub}</span>
                  <button
                    onClick={() => setShowDeleteSubject(sub)}
                    className="ml-1 p-0.5 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex gap-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-1 shadow-sm overflow-x-auto">
        {displayTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 min-w-[60px] py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab
                ? "bg-violet-600 text-white"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1"><Target size={14} /> Avg Strength</div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{avgStrength}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1"><TrendingUp size={14} /> Accuracy</div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{avgAccuracy}%</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1"><BookOpen size={14} /> Questions</div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalQuestions}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1"><AlertCircle size={14} /> Weak Topics</div>
          <p className="text-2xl font-bold text-red-500">{weakCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">{activeTab === "All" ? "All" : activeTab} Strength Radar</h2>
          {radarData.length === 0 ? (
            <EmptyState title="No topics yet" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e4e4e7" />
                <PolarAngleAxis dataKey="topic" tick={{ fontSize: 11 }} />
                <Radar name="Strength" dataKey="strength" stroke={subjectColor} fill={subjectColor} fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">{activeTab === "All" ? "All" : activeTab} Study Hours (7 days)</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={weeklyData}>
              <XAxis dataKey="day" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#18181b", border: "none", borderRadius: 8, color: "#fff", fontSize: 12 }}
              />
              <Bar dataKey="hours" fill={subjectColor} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">{activeTab === "All" ? "All" : activeTab} Topics</h2>
        {subjectTopics.length === 0 ? (
          <EmptyState title="No topics added yet" description="Add your first topic to start tracking" />
        ) : (
          <div className="space-y-2">
            {subjectTopics.map((topic) => {
              const expanded = expandedTopic === topic.id;
              return (
                <div key={topic.id} className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
                  <button
                    onClick={() => setExpandedTopic(expanded ? null : topic.id)}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-2 h-8 rounded-full shrink-0"
                        style={{
                          backgroundColor: topic.strength < 4 ? "#ef4444" : topic.strength < 6 ? "#f59e0b" : "#10b981",
                        }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{topic.name}</p>
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">{topic.subject}</span>
                        </div>
                        <p className="text-xs text-gray-400">
                          Strength {topic.strength}/10 · {topic.accuracy}% accuracy · {topic.questionsPracticed}Q practiced
                        </p>
                      </div>
                    </div>
                    {expanded ? <ChevronUp size={16} className="text-gray-400 shrink-0" /> : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
                  </button>
                  {expanded && (
                    <div className="px-3 pb-3 space-y-3 border-t border-gray-100 dark:border-gray-800 pt-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-gray-400 text-xs">Confidence</p>
                          <p className="font-medium text-gray-700 dark:text-gray-300">{topic.confidence}/10</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs">Last Revised</p>
                          <p className="font-medium text-gray-700 dark:text-gray-300">{daysAgo(topic.lastRevised)}d ago</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs">Doubts</p>
                          <p className="font-medium text-gray-700 dark:text-gray-300">{topic.doubts.length}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs">Class Covered</p>
                          <p className="font-medium text-gray-700 dark:text-gray-300">{topic.classCovered ? "Yes" : "No"}</p>
                        </div>
                      </div>
                      {topic.subtopics.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Subtopics</p>
                          <div className="flex flex-wrap gap-1.5">
                            {topic.subtopics.map((st) => (
                              <span key={st.id} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                {st.name} ({st.strength}/10)
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {topic.notes && <p className="text-xs text-gray-500">{topic.notes}</p>}
                      {topic.doubts.length > 0 && (
                        <div>
                          <p className="text-xs text-red-500 mb-1">Doubts:</p>
                          {topic.doubts.map((d, i) => (
                            <p key={i} className="text-xs text-gray-500 ml-2">· {d.text}</p>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => {
                            setEditVal({ strength: topic.strength, accuracy: topic.accuracy, questions: topic.questionsPracticed });
                            setShowEditStrength(topic.id);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                        >
                          <Edit2 size={12} /> Update Progress
                        </button>
                        <button
                          onClick={() => updateData((d) => ({
                            ...d,
                            topics: d.topics.map((t) =>
                              t.id === topic.id ? { ...t, lastRevised: getToday(), revisionNeeded: false } : t
                            ),
                          }))}
                          className="px-3 py-1.5 text-xs rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200"
                        >
                          Mark Revised
                        </button>
                      </div>
                      <div className="pt-1">
                        <button
                          onClick={() => handleDeleteTopic(topic.id)}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100"
                        >
                          <Trash2 size={12} /> Delete Topic
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal open={showAddTopic} onClose={() => setShowAddTopic(false)} title="Add Topic">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Topic Name</label>
            <input
              value={newTopic.name}
              onChange={(e) => setNewTopic({ ...newTopic, name: e.target.value })}
              placeholder="e.g. Mechanics"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  value={subjectInput}
                  onChange={(e) => { setSubjectInput(e.target.value); setNewTopic({ ...newTopic, subject: "" }); }}
                  placeholder="Type a new subject or pick below"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>
            {subjectFilterOptions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {subjectFilterOptions.map((sub) => {
                  const color = getSubjectColor(sub, data.subjects);
                  return (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => { setSubjectInput(sub); setNewTopic({ ...newTopic, subject: sub }); }}
                      className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border transition-colors ${
                        subjectInput === sub
                          ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400"
                          : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                      }`}
                    >
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      {sub}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Strength (1-10)</label>
              <input
                type="range"
                min="1"
                max="10"
                value={newTopic.strength}
                onChange={(e) => setNewTopic({ ...newTopic, strength: +e.target.value })}
                className="w-full"
              />
              <p className="text-center text-sm font-medium text-gray-600 dark:text-gray-400 mt-1">{newTopic.strength}/10</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confidence (1-10)</label>
              <input
                type="range"
                min="1"
                max="10"
                value={newTopic.confidence}
                onChange={(e) => setNewTopic({ ...newTopic, confidence: +e.target.value })}
                className="w-full"
              />
              <p className="text-center text-sm font-medium text-gray-600 dark:text-gray-400 mt-1">{newTopic.confidence}/10</p>
            </div>
          </div>
          <button
            onClick={handleAddTopic}
            disabled={!newTopic.name.trim() || !subjectInput.trim()}
            className="w-full py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50"
          >
            Add Topic
          </button>
        </div>
      </Modal>

      <Modal open={!!showEditStrength} onClose={() => setShowEditStrength(null)} title="Update Progress">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Strength (1-10)</label>
            <input
              type="range" min="1" max="10" value={editVal.strength}
              onChange={(e) => setEditVal({ ...editVal, strength: +e.target.value })}
              className="w-full"
            />
            <p className="text-center text-sm font-medium text-gray-600 dark:text-gray-400 mt-1">{editVal.strength}/10</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Accuracy %</label>
            <input
              type="number" min="0" max="100" value={editVal.accuracy}
              onChange={(e) => setEditVal({ ...editVal, accuracy: +e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Questions Practiced</label>
            <input
              type="number" min="0" value={editVal.questions}
              onChange={(e) => setEditVal({ ...editVal, questions: +e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <button
            onClick={() => showEditStrength && handleEditStrength(showEditStrength)}
            className="w-full py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors"
          >
            Save Progress
          </button>
        </div>
      </Modal>

      <Modal open={showAddSubject} onClose={() => { setShowAddSubject(false); setSubjectError(""); }} title="Add Subject">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject Name</label>
            <input
              value={newSubject.name}
              onChange={(e) => { setNewSubject({ ...newSubject, name: e.target.value }); setSubjectError(""); }}
              placeholder="e.g. Biology"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            {subjectError && (
              <p className="text-xs text-red-500 mt-1.5">{subjectError}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
            <div className="flex gap-2 flex-wrap">
              {["#6366f1", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#14b8a6", "#f97316", "#3b82f6"].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewSubject({ ...newSubject, color: c })}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${newSubject.color === c ? "border-gray-900 dark:border-white scale-110" : "border-transparent hover:scale-105"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <button
            onClick={handleAddSubject}
            disabled={!newSubject.name.trim()}
            className="w-full py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50"
          >
            Add Subject
          </button>
        </div>
      </Modal>

      <Modal open={!!showDeleteSubject} onClose={() => setShowDeleteSubject(null)} title="Delete Subject">
        {showDeleteSubject && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Deleting <strong>&apos;{showDeleteSubject}&apos;</strong> will also delete its topics and notes.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteSubject(null)}
                className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => showDeleteSubject && handleDeleteSubject(showDeleteSubject)}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
