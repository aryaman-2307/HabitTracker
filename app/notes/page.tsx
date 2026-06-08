"use client";

import { useState, useMemo, useCallback } from "react";
import { useData } from "@/components/DataProvider";
import { ClassNote, Subject, DifficultyLevel, DoubtEntry, FileUpload, getSubjectColor } from "@/lib/types";
import { generateId, formatDate, daysAgo } from "@/lib/utils";
import Modal from "@/components/Modal";
import EmptyState from "@/components/EmptyState";
import { Plus, FileText, Upload, CheckCircle, AlertTriangle, Clock, Trash2, X, Loader2, Sparkles, File } from "lucide-react";
import { deleteClassNote } from "@/lib/data/supabase-data";

export default function NotesPage() {
  const { data, updateData } = useData();
  const [activeTab, setActiveTab] = useState<string>("All");
  const [showAdd, setShowAdd] = useState(false);
  const [showView, setShowView] = useState<string | null>(null);
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

  const uniqueSubjects = useMemo(() => {
    const fromTopics = [...new Set(data.topics.map((t) => t.subject))];
    const fromSubjects = data.subjects.map((s) => s.name);
    const all = [...new Set([...fromSubjects, ...fromTopics])];
    return all.sort();
  }, [data.topics, data.subjects]);

  const tabs = useMemo(() => ["All", ...uniqueSubjects], [uniqueSubjects]);

  const filteredNotes =
    activeTab === "All" ? data.notes : data.notes.filter((n) => n.subject === activeTab);

  const sortedNotes = [...filteredNotes].sort((a, b) => b.date.localeCompare(a.date));

  const stats = {
    total: data.notes.length,
    needsRevision: data.notes.filter((n) => n.needsRevision).length,
    withDoubts: data.notes.filter((n) => n.doubts.length > 0).length,
    recentDays: data.notes.filter((n) => daysAgo(n.date) <= 3).length,
  };

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

  const handleAdd = () => {
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
    setShowAdd(false);
    setNewNote({ subject: "", topic: "", subtopic: "", difficulty: "medium", summary: "", doubts: "", understood: true, needsRevision: false, tags: "" });
    setUploadedFiles([]);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteClassNote(id);
    } catch (err) {
      console.error("Failed to delete note from backend:", err);
    }
    updateData((d) => ({ ...d, notes: d.notes.filter((n) => n.id !== id) }));
    setShowView(null);
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
      const data = await res.json();
      const explanation = data.explanation || data.message || "Explanation could not be generated.";
      setExplanationCache((prev) => ({ ...prev, [doubtId]: explanation }));
    } catch {
      setExplanationCache((prev) => ({ ...prev, [doubtId]: "Could not fetch explanation. Please try again later." }));
    } finally {
      setLoadingExplanation(null);
    }
  }, [explanationCache]);

  const viewedNote = data.notes.find((n) => n.id === showView);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Notes & Class Log</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Log classes and track understanding</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors"
        >
          <Plus size={16} /> Add Note
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-900 shadow-sm rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1"><FileText size={14} /> Total Notes</div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 shadow-sm rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1"><Clock size={14} /> Needs Revision</div>
          <p className="text-2xl font-bold text-amber-500">{stats.needsRevision}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 shadow-sm rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1"><AlertTriangle size={14} /> With Doubts</div>
          <p className="text-2xl font-bold text-red-500">{stats.withDoubts}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 shadow-sm rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1"><CheckCircle size={14} /> Recent (3d)</div>
          <p className="text-2xl font-bold text-emerald-500">{stats.recentDays}</p>
        </div>
      </div>

      <div className="flex gap-2 bg-white dark:bg-gray-900 shadow-sm rounded-xl border border-gray-200 dark:border-gray-800 p-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-shrink-0 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-violet-600 text-white"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 shadow-sm rounded-xl border border-gray-200 dark:border-gray-800 p-5">
        {sortedNotes.length === 0 ? (
          <EmptyState icon={<FileText size={40} />} title="No notes yet" description="Log your first class note to get started" />
        ) : (
          <div className="space-y-2">
            {sortedNotes.map((note) => (
              <button
                key={note.id}
                onClick={() => setShowView(note.id)}
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

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Class Note">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
              <select
                value={newNote.subject}
                onChange={(e) => setNewNote({ ...newNote, subject: e.target.value as Subject })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="">Select subject...</option>
                {uniqueSubjects.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Difficulty</label>
              <select
                value={newNote.difficulty}
                onChange={(e) => setNewNote({ ...newNote, difficulty: e.target.value as DifficultyLevel })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
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
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subtopic</label>
            <input
              value={newNote.subtopic}
              onChange={(e) => setNewNote({ ...newNote, subtopic: e.target.value })}
              placeholder="e.g. Capacitance"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Summary</label>
            <textarea
              value={newNote.summary}
              onChange={(e) => setNewNote({ ...newNote, summary: e.target.value })}
              rows={3}
              placeholder="What was covered in class..."
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Doubts (comma-separated)</label>
            <input
              value={newNote.doubts}
              onChange={(e) => setNewNote({ ...newNote, doubts: e.target.value })}
              placeholder="e.g. Problem 5, Question 12"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={newNote.understood}
                onChange={(e) => setNewNote({ ...newNote, understood: e.target.checked })}
                className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
              />
              Understood
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={newNote.needsRevision}
                onChange={(e) => setNewNote({ ...newNote, needsRevision: e.target.checked })}
                className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
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
            onClick={handleAdd}
            disabled={!newNote.topic.trim() || !newNote.summary.trim() || !newNote.subject}
            className="w-full py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50"
          >
            Save Note
          </button>
        </div>
      </Modal>

      <Modal open={!!showView} onClose={() => setShowView(null)} title={viewedNote?.topic || "Note"}>
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
                        className="flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-colors disabled:opacity-50"
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
                      <div className="mt-1 ml-4 p-2 rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800">
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
                onClick={() => handleDelete(viewedNote.id)}
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
