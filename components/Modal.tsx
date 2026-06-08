"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#141517] sm:rounded-2xl rounded-t-2xl shadow-2xl border border-gray-200/60 dark:border-[#26272c] w-full sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-slide-up-sheet sm:animate-scale-in">
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100 dark:border-[#1e1f24]">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 -mr-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto p-5 sm:p-6">{children}</div>
      </div>
    </div>
  );
}
