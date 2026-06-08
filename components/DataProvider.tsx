"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { AppData } from "@/lib/types";
import { loadData, saveData } from "@/lib/storage";
import { useAuth } from "@/components/AuthProvider";
import { fetchAllFromSupabase, syncAllToSupabase } from "@/lib/data/supabase-data";

interface DataContextType {
  data: AppData;
  updateData: (updater: (d: AppData) => AppData) => void;
  isSyncing: boolean;
  lastSynced: string | null;
}

const DataContext = createContext<DataContextType | null>(null);

function hasMeaningfulData(d: AppData): boolean {
  return d.subjects.length > 0 || d.topics.length > 0 || d.schedule.length > 0 ||
    d.gymSessions.length > 0 || d.habits.length > 0 || d.notes.length > 0;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<AppData | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const init = async () => {
      if (authLoading) return;

      if (user) {
        try {
          setIsSyncing(true);
          const supabaseData = await fetchAllFromSupabase(user.id);
          const cached = loadData();
          const cachedHasData = hasMeaningfulData(cached);
          const serverHasData = hasMeaningfulData(supabaseData);

          if (serverHasData) {
            setData(supabaseData);
            saveData(supabaseData);
          } else if (cachedHasData) {
            setData(cached);
            saveData(cached);
            syncAllToSupabase(user.id, cached).catch(console.error);
          } else {
            setData(supabaseData);
            saveData(supabaseData);
          }
          setLastSynced(new Date().toISOString());
        } catch (err) {
          console.error("Failed to fetch from Supabase:", err);
          const cached = loadData();
          setData(cached);
        } finally {
          setIsSyncing(false);
        }
      } else {
        const cached = loadData();
        setData(cached);
      }
      setMounted(true);
    };
    init();
  }, [user, authLoading]);

  useEffect(() => {
    if (data && mounted) {
      saveData(data);
    }
  }, [data, mounted]);

  const syncToServer = useCallback(
    (currentData: AppData) => {
      if (!user) return;
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);

      syncTimeoutRef.current = setTimeout(async () => {
        try {
          setIsSyncing(true);
          await syncAllToSupabase(user.id, currentData);
          setLastSynced(new Date().toISOString());
        } catch (err) {
          console.error("Sync failed:", err);
        } finally {
          setIsSyncing(false);
        }
      }, 2000);
    },
    [user]
  );

  const updateData = (updater: (d: AppData) => AppData) => {
    setData((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      syncToServer(next);
      return next;
    });
  };

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <DataContext.Provider value={{ data, updateData, isSyncing, lastSynced }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = (): DataContextType => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
};
