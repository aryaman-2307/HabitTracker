"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  LayoutDashboard, Calendar, BookOpen, Dumbbell,
  CheckSquare, BarChart3, Sun, Moon, LogOut
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/schedule", label: "Schedule", icon: Calendar },
  { href: "/study", label: "Study Hub", icon: BookOpen },
  { href: "/gym", label: "Gym", icon: Dumbbell },
  { href: "/habits", label: "Habits", icon: CheckSquare },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

const mobileNavItems = navItems.slice(0, 5); // First 5 for bottom tab

export default function Sidebar({ darkMode, toggleDark }: { darkMode: boolean; toggleDark: () => void }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [supabaseClient, setSupabaseClient] = useState<any>(null);

  useEffect(() => {
    import("@/lib/supabase/client").then((mod) => {
      try { setSupabaseClient(mod.createClient()); } catch { /* env not set */ }
    });
  }, []);

  const handleLogout = async () => {
    if (supabaseClient) {
      await supabaseClient.auth.signOut();
    }
    window.location.href = "/login";
  };

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex fixed top-0 left-0 z-50 h-full w-60 bg-white dark:bg-[#141517] border-r border-gray-200/60 dark:border-[#26272c] flex-col">
        <div className="flex items-center gap-2.5 p-5 border-b border-gray-100 dark:border-[#1e1f24]">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-sm">
            <span className="text-white text-sm font-bold">A</span>
          </div>
          <span className="font-semibold text-gray-900 dark:text-gray-100 tracking-tight">Apex</span>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  active
                    ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-100 dark:border-[#1e1f24] space-y-1">
          {user && (
            <div className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500 truncate">
              {user.email}
            </div>
          )}
          <button
            onClick={toggleDark}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm w-full text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            {darkMode ? "Light Mode" : "Dark Mode"}
          </button>
          {user && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm w-full text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              <LogOut size={18} />
              Sign out
            </button>
          )}
        </div>
      </aside>

      {/* ── Mobile Bottom Tab Bar ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-gray-200/60 dark:border-[#26272c] pb-safe">
        <div className="flex items-center justify-around px-2 h-16">
          {mobileNavItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl min-w-[56px] transition-colors ${
                  active
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-gray-400 dark:text-gray-500"
                }`}
              >
                <item.icon size={20} strokeWidth={active ? 2.5 : 2} />
                <span className={`text-[10px] ${active ? "font-semibold" : "font-medium"}`}>
                  {item.label === "Dashboard" ? "Home" : item.label === "Study Hub" ? "Study" : item.label}
                </span>
                {active && (
                  <div className="absolute -top-0 w-8 h-0.5 bg-amber-500 rounded-full" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── Mobile sidebar overlay (for settings/analytics access) ── */}
      {open && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden" onClick={() => setOpen(false)} />
      )}
    </>
  );
}
