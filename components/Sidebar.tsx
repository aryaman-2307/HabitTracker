"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  LayoutDashboard, Calendar, BookOpen, FileText, Dumbbell,
  CheckSquare, BarChart3, Menu, X, Sun, Moon, LogOut
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/schedule", label: "Schedule", icon: Calendar },
  { href: "/jee", label: "Study Tracker", icon: BookOpen },
  { href: "/notes", label: "Notes & Log", icon: FileText },
  { href: "/gym", label: "Gym Tracker", icon: Dumbbell },
  { href: "/habits", label: "Habits", icon: CheckSquare },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

export default function Sidebar({ darkMode, toggleDark }: { darkMode: boolean; toggleDark: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
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
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed top-4 left-4 z-50 p-2 rounded-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/60 dark:border-gray-700 shadow-sm lg:hidden"
      >
        <Menu size={20} className="text-gray-600 dark:text-gray-400" />
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden" onClick={() => setOpen(false)} />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-gray-900 border-r border-gray-200/60 dark:border-gray-800 shadow-lg lg:shadow-none transform transition-transform duration-200 ease-in-out ${
          open ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:static lg:z-auto flex flex-col`}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm">
              <span className="text-white text-sm font-bold">V</span>
            </div>
            <span className="font-semibold text-gray-900 dark:text-gray-100">Apex</span>
          </div>
          <button onClick={() => setOpen(false)} className="lg:hidden p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  active
                    ? "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 font-medium shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-100 dark:border-gray-800 space-y-1">
          {user && (
            <div className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500 truncate">
              {user.email}
            </div>
          )}
          <button
            onClick={toggleDark}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm w-full text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
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
    </>
  );
}
