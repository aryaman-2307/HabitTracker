"use client";

import { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
}

export default function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="text-center py-8 animate-fade-in">
      {icon && <div className="flex justify-center mb-3 text-gray-300 dark:text-gray-600">{icon}</div>}
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
      {description && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{description}</p>}
    </div>
  );
}
