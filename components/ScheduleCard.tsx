"use client";

import { BlockStatus, Subject } from "@/lib/types";

const statusColors: Record<BlockStatus, string> = {
  completed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  pending: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  skipped: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
  rescheduled: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
};

const subjectColorClasses: Record<string, string> = {};

function getSubjectBorderClass(subject?: Subject): string {
  if (!subject) return "border-l-gray-300 dark:border-l-gray-600";
  if (!subjectColorClasses[subject]) {
    const hash = Math.abs(subject.split("").reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0));
    const colors = ["border-l-blue-500", "border-l-emerald-500", "border-l-amber-500", "border-l-orange-500", "border-l-rose-500", "border-l-cyan-500", "border-l-pink-500", "border-l-teal-500"];
    subjectColorClasses[subject] = colors[hash % colors.length];
  }
  return subjectColorClasses[subject];
}

interface ScheduleCardProps {
  block: {
    id: string;
    title: string;
    type: string;
    subject?: Subject;
    startTime: string;
    endTime: string;
    status: BlockStatus;
  };
  onStatusChange?: (id: string, status: BlockStatus) => void;
  onDelete?: () => void;
  compact?: boolean;
  readOnly?: boolean;
}

export default function ScheduleCard({ block, onStatusChange, onDelete, readOnly }: ScheduleCardProps) {
  return (
    <div className={`rounded-xl border border-gray-200/60 dark:border-[#26272c] bg-white dark:bg-[#141517] p-3.5 border-l-4 shadow-sm transition-all hover:shadow-md ${getSubjectBorderClass(block.subject)}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{block.title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {block.startTime} - {block.endTime}
            {block.subject && <span className="ml-1.5">· {block.subject}</span>}
          </p>
        </div>
        <span className={`shrink-0 text-xs px-2.5 py-0.5 rounded-full font-medium ${statusColors[block.status]}`}>
          {block.status}
        </span>
      </div>
      {onStatusChange && !readOnly && (
        <div className="flex gap-1 mt-2.5">
          {(["completed", "skipped", "pending"] as BlockStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => onStatusChange(block.id, s)}
              className={`text-xs px-2.5 py-1.5 rounded-lg transition-all active:scale-[0.97] ${
                block.status === s
                  ? "bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900"
                  : "bg-gray-100 dark:bg-[#1e1f24] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#26272c]"
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
          {onDelete && (
            <button
              onClick={onDelete}
              className="ml-auto text-xs px-2.5 py-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
