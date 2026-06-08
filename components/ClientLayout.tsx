"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/components/AuthProvider";
import { DataProvider, useData } from "@/components/DataProvider";
import Sidebar from "@/components/Sidebar";

function AuthRedirect({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && (pathname === "/login" || pathname === "/signup")) {
      router.replace("/");
    }
  }, [user, loading, pathname, router]);

  if (!loading && user && (pathname === "/login" || pathname === "/signup")) {
    return null;
  }

  return <>{children}</>;
}

function AppShell({ children }: { children: React.ReactNode }) {
  const { data, updateData } = useData();
  const darkMode = data.settings.darkMode;

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  const toggleDark = () => {
    const newMode = !darkMode;
    updateData((d) => ({ ...d, settings: { ...d.settings, darkMode: newMode } }));
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <Sidebar darkMode={darkMode} toggleDark={toggleDark} />
      <main className="flex-1 lg:ml-0 min-h-screen">{children}</main>
    </div>
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DataProvider>
        <AuthRedirect>
          <AppShell>{children}</AppShell>
        </AuthRedirect>
      </DataProvider>
    </AuthProvider>
  );
}
