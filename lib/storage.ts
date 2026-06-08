import { AppData } from "./types";
import { getToday } from "./utils";

const STORAGE_KEY = "apex-habittracking-data";

export const getDefaultData = (): AppData => ({
  subjects: [],
  schedule: [],
  topics: [],
  notes: [],
  gymSessions: [],
  habits: [],
  habitLogs: [],
  dailyLogs: [],
  recommendations: [],
  strengthHistory: [],
  settings: { darkMode: false, lastUpdated: getToday() },
});

export const loadData = (): AppData => {
  if (typeof window === "undefined") return getDefaultData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultData();
    const parsed = JSON.parse(raw) as AppData;
    return { ...getDefaultData(), ...parsed };
  } catch {
    return getDefaultData();
  }
};

export const saveData = (data: AppData): void => {
  if (typeof window === "undefined") return;
  data.settings.lastUpdated = getToday();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const clearData = (): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
};
