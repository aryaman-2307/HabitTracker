"use client";

import { useState, useMemo, useCallback } from "react";
import { useData } from "@/components/DataProvider";
import { useAuth } from "@/components/AuthProvider";
import { Topic, ClassNote, Subject, DifficultyLevel, DoubtEntry, FileUpload, getSubjectColor, normalizeSubjectName } from "@/lib/types";
import { generateId, getToday, formatDate, daysAgo } from "@/lib/utils";
import Modal from "@/components/Modal";
import EmptyState from "@/components/EmptyState";
import {
  Plus, BookOpen, Target, TrendingUp, AlertCircle,
  ChevronDown, ChevronUp, Edit2, Trash2,
  FileText, Upload, CheckCircle, AlertTriangle, Clock,
  X, Loader2, Sparkles, File,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from "recharts";
import { deleteTopic, deleteTopicsBySubject, deleteClassNotesBySubject, deleteUserSubject, deleteClassNote } from "@/lib/data/supabase-data";

const chartTooltipStyle = {
  backgroundColor: "#1a1b1e",
  border: "1px solid #26272c",
  borderRadius: 12,
  color: "#ededef",
  fontSize: 12,
  boxShadow: "0 8px 24px rgb(0 0 0 / 0.3)",
};

export default function StudyHubPage() {
  const { data, updateData } = useData();
  const { user } = useAuth();

  // --- Main tab ---
  const [mainTab, setMainTab] = useState<"topics" | "notes">("topics");

  // --- Shared state ---
  const [activeTab, setActiveTab] = useState<string>("All");
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [showDeleteSubject, setShowDeleteSubject] = useState<string | null>(null);
  const [newSubject, setNewSubject] = useState({ name: "", color: "#f59e0b" });
  const [subjectError, setSubjectError] = useState("");

  // --- Topics state ---
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [showEditStrength, setShowEditStrength] = useState<string | null>(null);
  const [newTopic, setNewTopic] = useState({ name: "", subject: "", strength: 5, confidence: 5 });
  const [subjectInput, setSubjectInput] = useState("");
  const [editVal, setEditVal] = useState({ strength: 5, accuracy: 50, questions: 0 });

  // --- Notes state ---
  const [showAddNote, setShowAddNote] = useState(false);
  const [showViewNote, setShowViewNote] = useState<string | null>(null);
  const [newNote, setNewNote] = useState({
    subject: "" as Subject,
    topic: "",
    subtopic: "",
    difficulty: "medium" as DifficultyLevel,
    summary: "",
    doubts: "",
    understood: true,
    needsRevision: false,
    tags: "",
  });
  const [uploadedFiles, setUploadedFiles] = useState<FileUpload[]>([]);
  const [uploading, setUploading] = useState(false);
  const [explanationCache, setExplanationCache] = useState<Record<string, string>>({});
  const [loadingExplanation, setLoadingExplanation] = useState<string | null>(null);
  const [expandedDoubts, setExpandedDoubts] = useState<Record<string, boolean>>({});

  // --- Derived data ---
  const allSubjects = useMemo(() => {
    const fromTopics = [...new Set(data.topics.map((t) => t.subject))];
    const fromSubjects = data.subjects.map((s) => s.name);
    return [...new Set([...fromSubjects, ...fromTopics])].sort();
  }, [data.topics, data.subjects]);

  const displayTabs = ["All", ...allSubjects];

  // Topics derived
  const subjectTopics = activeTab === "All" ? data.topics : data.topics.filter((t) => t.subject === activeTab);
  const subjectColor = activeTab === "All" ? "#f59e0b" : getSubjectColor(activeTab, data.subjects);

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

  // Notes derived
  const filteredNotes =
    activeTab === "All" ? data.notes : data.notes.filter((n) => n.subject === activeTab);
  const sortedNotes = [...filteredNotes].sort((a, b) => b.date.localeCompare(a.date));

  const noteStats = {
    total: data.notes.length,
    needsRevision: data.notes.filter((n) => n.needsRevision).length,
    withDoubts: data.notes.filter((n) => n.doubts.length > 0).length,
    recentDays: data.notes.filter((n) => daysAgo(n.date) <= 3).length,
  };

  const viewedNote = data.notes.find((n) => n.id === showViewNote);

  // --- Topic handlers ---
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

  // --- Subject handlers ---
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
    setNewSubject({ name: "", color: "#f59e0b" });
    setSubjectError("");
  };

  const handleDeleteSubject = async (subjectName: string) => {
    const userId = user?.id || "";
    const normalized = normalizeSubjectName(subjectName);
    const displayName = data.subjects.find((s) => normalizeSubjectName(s.name) === normalized)?.name || subjectName;

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

    updateData((d) => ({
      ...d,
      subjects: d.subjects.filter((s) => normalizeSubjectName(s.name) !== normalized),
      topics: d.topics.filter((t) => normalizeSubjectName(t.subject) !== normalized),
      notes: d.notes.filter((n) => normalizeSubjectName(n.subject) !== normalized),
    }));

    if (activeTab === displayName || normalizeSubjectName(activeTab) === normalized) setActiveTab("All");
    setShowDeleteSubject(null);
  };

  // --- Notes handlers ---
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setUploading(true);
    const newFiles: FileUpload[] = [];
    let loaded = 0;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        newFiles.push({
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl: reader.result as string,
        });
        loaded++;
        if (loaded === files.length) {
          setUploadedFiles((prev) => [...prev, ...newFiles]);
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const removeFile = useCallback((index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleAddNote = () => {
    const doubts: DoubtEntry[] = newNote.doubts
      ? newNote.doubts.split(",").map((d) => d.trim()).filter(Boolean).map((text) => ({
          id: generateId(),
          text,
        }))
      : [];
    const note: ClassNote = {
      id: generateId(),
      date: new Date().toISOString().split("T")[0],
      subject: newNote.subject,
      topic: newNote.topic,
      subtopic: newNote.subtopic || undefined,
      difficulty: newNote.difficulty,
      summary: newNote.summary,
      doubts,
      understood: newNote.understood,
      needsRevision: newNote.needsRevision,
      tags: [newNote.subject, newNote.topic, newNote.subtopic].filter(Boolean),
      fileMetadata: uploadedFiles.length > 0 ? uploadedFiles : undefined,
    };
    updateData((d) => ({ ...d, notes: [...d.notes, note] }));
    setShowAddNote(false);
    setNewNote({ subject: "", topic: "", subtopic: "", difficulty: "medium", summary: "", doubts: "", understood: true, needsRevision: false, tags: "" });
    setUploadedFiles([]);
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await deleteClassNote(id);
    } catch (err) {
      console.error("Failed to delete note from backend:", err);
    }
    updateData((d) => ({ ...d, notes: d.notes.filter((n) => n.id !== id) }));
    setShowViewNote(null);
  };

  const handleExplainDoubt = useCallback(async (doubtId: string, doubtText: string, topic: string, subject: string) => {
    if (explanationCache[doubtId]) {
      setExpandedDoubts((prev) => ({ ...prev, [doubtId]: true }));
      return;
    }
    setLoadingExplanation(doubtId);
    setExpandedDoubts((prev) => ({ ...prev, [doubtId]: true }));
    try {
      const res = await fetch("/api/ai/explain-doubt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doubt: doubtText, topic, subject }),
      });
      if (!res.ok) throw new Error("Failed to fetch explanation");
      const resData = await res.json();
      const explanation = resData.explanation || resData.message || "Explanation could not be generated.";
      setExplanationCache((prev) => ({ ...prev, [doubtId]: explanation }));
    } catch {
      setExplanationCache((prev) => ({ ...prev, [doubtId]: "Could not fetch explanation. Please try again later." }));
    } finally {
      setLoadingExplanation(null);
    }
  }, [explanationCache]);

  const subjectFilterOptions = allSubjects;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Study Hub</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Track your academic progress</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowAddSubject(true); setSubjectError(""); }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <Plus size={16} /> Add Subject
          </button>
          {mainTab === "topics" ? (
            <button
              onClick={() => setShowAddTopic(true)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600 transition-colors"
            >
              <Plus size={16} /> Add Topic
            </button>
          ) : (
            <button
              onClick={() => setShowAddNote(true)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600 transition-colors"
            >
              <Plus size={16} /> Add Note
            </button>
          )}
        </div>
      </div>

      {/* Subject management pills */}
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

      {/* Main tab switcher: Topics | Class Notes */}
      <div className="flex gap-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-1 shadow-sm">
        <button
          onClick={() => setMainTab("topics")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            mainTab === "topics"
              ? "bg-amber-500 text-white"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50"
          }`}
        >
          Topics
        </button>
        <button
          onClick={() => setMainTab("notes")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            mainTab === "notes"
              ? "bg-amber-500 text-white"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50"
          }`}
        >
          Class Notes
        </button>
      </div>

      {/* Subject filter tabs */}
      <div className="flex gap-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-1 shadow-sm overflow-x-auto">
        {displayTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 min-w-[60px] py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab
                ? "bg-amber-500 text-white"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Stats row */}
      {mainTab === "topics" ? (
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
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-900 shadow-sm rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1"><FileText size={14} /> Total Notes</div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{noteStats.total}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 shadow-sm rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1"><Clock size={14} /> Needs Revision</div>
            <p className="text-2xl font-bold text-amber-500">{noteStats.needsRevision}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 shadow-sm rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1"><AlertTriangle size={14} /> With Doubts</div>
            <p className="text-2xl font-bold text-red-500">{noteStats.withDoubts}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 shadow-sm rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1"><CheckCircle size={14} /> Recent (3d)</div>
            <p className="text-2xl font-bold text-emerald-500">{noteStats.recentDays}</p>
          </div>
        </div>
      )}

      {/* Content area */}
      {mainTab === "topics" ? (
        <>
          {/* Charts */}
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
                    <Radar name="Strength" dataKey="strength" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
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
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Bar dataKey="hours" fill={subjectColor} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Topic list */}
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
        </>
      ) : (
        /* Notes content */
        <div className="bg-white dark:bg-gray-900 shadow-sm rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          {sortedNotes.length === 0 ? (
            <EmptyState icon={<FileText size={40} />} title="No notes yet" description="Log your first class note to get started" />
          ) : (
            <div className="space-y-2">
              {sortedNotes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => setShowViewNote(note.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left border border-transparent hover:border-gray-200 dark:hover:border-gray-800"
                >
                  <div className={`w-1 h-10 rounded-full shrink-0 ${
                    note.understood && !note.needsRevision ? "bg-emerald-400" : note.needsRevision ? "bg-amber-400" : "bg-red-400"
                  }`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{note.topic}</p>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: getSubjectColor(note.subject, data.subjects) + "20", color: getSubjectColor(note.subject, data.subjects) }}
                      >
                        {note.subject}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{note.summary}</p>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                      <span>{formatDate(note.date)}</span>
                      {note.subtopic && <span>· {note.subtopic}</span>}
                      <span className={`px-1.5 py-0.5 rounded ${
                        note.difficulty === "hard" ? "bg-red-100 text-red-600 dark:bg-red-900/20"
                        : note.difficulty === "medium" ? "bg-amber-100 text-amber-600 dark:bg-amber-900/20"
                        : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20"
                      }`}>{note.difficulty}</span>
                      {note.doubts.length > 0 && <span className="text-red-400">{note.doubts.length} doubts</span>}
                      {note.fileMetadata && note.fileMetadata.length > 0 && (
                        <span className="text-blue-400">{note.fileMetadata.length} file{note.fileMetadata.length > 1 ? "s" : ""}</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== MODALS ===== */}

      {/* Add Topic Modal */}
      <Modal open={showAddTopic} onClose={() => setShowAddTopic(false)} title="Add Topic">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Topic Name</label>
            <input
              value={newTopic.name}
              onChange={(e) => setNewTopic({ ...newTopic, name: e.target.value })}
              placeholder="e.g. Mechanics"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                          ? "border-amber-500 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
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
            className="w-full py-2.5 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
          >
            Add Topic
          </button>
        </div>
      </Modal>

      {/* Edit Strength Modal */}
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
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Questions Practiced</label>
            <input
              type="number" min="0" value={editVal.questions}
              onChange={(e) => setEditVal({ ...editVal, questions: +e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <button
            onClick={() => showEditStrength && handleEditStrength(showEditStrength)}
            className="w-full py-2.5 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600 transition-colors"
          >
            Save Progress
          </button>
        </div>
      </Modal>

      {/* Add Subject Modal */}
      <Modal open={showAddSubject} onClose={() => { setShowAddSubject(false); setSubjectError(""); }} title="Add Subject">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject Name</label>
            <input
              value={newSubject.name}
              onChange={(e) => { setNewSubject({ ...newSubject, name: e.target.value }); setSubjectError(""); }}
              placeholder="e.g. Biology"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            {subjectError && (
              <p className="text-xs text-red-500 mt-1.5">{subjectError}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
            <div className="flex gap-2 flex-wrap">
              {["#f59e0b", "#10b981", "#d97706", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#14b8a6", "#f97316", "#3b82f6"].map((c) => (
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
            className="w-full py-2.5 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
          >
            Add Subject
          </button>
        </div>
      </Modal>

      {/* Delete Subject Modal */}
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

      {/* Add Note Modal */}
      <Modal open={showAddNote} onClose={() => setShowAddNote(false)} title="Add Class Note">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
              <select
                value={newNote.subject}
                onChange={(e) => setNewNote({ ...newNote, subject: e.target.value as Subject })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Select subject...</option>
                {allSubjects.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Difficulty</label>
              <select
                value={newNote.difficulty}
                onChange={(e) => setNewNote({ ...newNote, difficulty: e.target.value as DifficultyLevel })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Topic</label>
            <input
              value={newNote.topic}
              onChange={(e) => setNewNote({ ...newNote, topic: e.target.value })}
              placeholder="e.g. Electrostatics"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subtopic</label>
            <input
              value={newNote.subtopic}
              onChange={(e) => setNewNote({ ...newNote, subtopic: e.target.value })}
              placeholder="e.g. Capacitance"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Summary</label>
            <textarea
              value={newNote.summary}
              onChange={(e) => setNewNote({ ...newNote, summary: e.target.value })}
              rows={3}
              placeholder="What was covered in class..."
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Doubts (comma-separated)</label>
            <input
              value={newNote.doubts}
              onChange={(e) => setNewNote({ ...newNote, doubts: e.target.value })}
              placeholder="e.g. Problem 5, Question 12"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={newNote.understood}
                onChange={(e) => setNewNote({ ...newNote, understood: e.target.checked })}
                className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
              />
              Understood
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={newNote.needsRevision}
                onChange={(e) => setNewNote({ ...newNote, needsRevision: e.target.checked })}
                className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
              />
              Needs Revision
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Upload Files</label>
            <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center relative">
              <input
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.txt,.doc,.docx"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {uploading ? (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <Loader2 size={16} className="animate-spin" /> Uploading...
                </div>
              ) : (
                <>
                  <Upload size={24} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">Click to browse files</p>
                  <p className="text-xs text-gray-400 mt-1">PDF, images, text, doc files</p>
                </>
              )}
            </div>
            {uploadedFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                {uploadedFiles.map((file, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-2 min-w-0">
                      <File size={14} className="text-gray-400 shrink-0" />
                      <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{file.name}</span>
                      <span className="text-[10px] text-gray-400 shrink-0">({formatFileSize(file.size)})</span>
                    </div>
                    <button onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500 shrink-0">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={handleAddNote}
            disabled={!newNote.topic.trim() || !newNote.summary.trim() || !newNote.subject}
            className="w-full py-2.5 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
          >
            Save Note
          </button>
        </div>
      </Modal>

      {/* View Note Modal */}
      <Modal open={!!showViewNote} onClose={() => setShowViewNote(null)} title={viewedNote?.topic || "Note"}>
        {viewedNote && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: getSubjectColor(viewedNote.subject, data.subjects) + "20", color: getSubjectColor(viewedNote.subject, data.subjects) }}
              >
                {viewedNote.subject}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded ${
                viewedNote.difficulty === "hard" ? "bg-red-100 text-red-600"
                : viewedNote.difficulty === "medium" ? "bg-amber-100 text-amber-600"
                : "bg-emerald-100 text-emerald-600"
              }`}>{viewedNote.difficulty}</span>
              <span className="text-xs text-gray-400">{formatDate(viewedNote.date)}</span>
            </div>
            {viewedNote.subtopic && <p className="text-sm text-gray-500">Subtopic: {viewedNote.subtopic}</p>}
            <div>
              <p className="text-xs text-gray-400 mb-1">Summary</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{viewedNote.summary}</p>
            </div>
            <div className="flex gap-4 text-sm">
              <span className={viewedNote.understood ? "text-emerald-600" : "text-red-500"}>
                {viewedNote.understood ? "✓ Understood" : "✗ Not understood"}
              </span>
              {viewedNote.needsRevision && <span className="text-amber-600">Needs revision</span>}
            </div>
            {viewedNote.doubts.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Doubts</p>
                {viewedNote.doubts.map((doubt) => (
                  <div key={doubt.id} className="ml-2 mb-2">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-red-500">· {doubt.text}</p>
                      <button
                        onClick={() => handleExplainDoubt(doubt.id, doubt.text, viewedNote.topic, viewedNote.subject)}
                        disabled={loadingExplanation === doubt.id}
                        className="flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors disabled:opacity-50"
                      >
                        {loadingExplanation === doubt.id ? (
                          <Loader2 size={10} className="animate-spin" />
                        ) : (
                          <Sparkles size={10} />
                        )}
                        Explain
                      </button>
                    </div>
                    {(explanationCache[doubt.id] || loadingExplanation === doubt.id) && expandedDoubts[doubt.id] && (
                      <div className="mt-1 ml-4 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800">
                        {loadingExplanation === doubt.id ? (
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Loader2 size={12} className="animate-spin" /> Generating explanation...
                          </div>
                        ) : (
                          <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{explanationCache[doubt.id]}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {viewedNote.fileMetadata && viewedNote.fileMetadata.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Attached Files</p>
                <div className="space-y-1.5">
                  {viewedNote.fileMetadata.map((file, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <File size={14} className="text-gray-400 shrink-0" />
                      <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{file.name}</span>
                      <span className="text-[10px] text-gray-400 shrink-0">({formatFileSize(file.size)})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {viewedNote.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {viewedNote.tags.filter(Boolean).map((tag, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">{tag}</span>
                ))}
              </div>
            )}
            <div className="pt-2">
              <button
                onClick={() => handleDeleteNote(viewedNote.id)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
              >
                <Trash2 size={12} /> Delete Note
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
