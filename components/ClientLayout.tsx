"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/components/AuthProvider";
import { DataProvider, useData } from "@/components/DataProvider";
import Sidebar from "@/components/Sidebar";

const authRoutes = ["/login", "/signup"];

function AuthRedirect({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && authRoutes.includes(pathname)) {
      router.replace("/");
    }
  }, [user, loading, pathname, router]);

  if (!loading && user && authRoutes.includes(pathname)) {
    return null;
  }

  return <>{children}</>;
}

function AppShell({ children }: { children: React.ReactNode }) {
  const { data, updateData } = useData();
  const pathname = usePathname();
  const darkMode = data.settings.darkMode;
  const isAuthPage = authRoutes.includes(pathname);

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

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-[#f8f9fb] dark:bg-[#0a0a0c] text-gray-900 dark:text-gray-100">
      <Sidebar darkMode={darkMode} toggleDark={toggleDark} />
      <main className="flex-1 lg:ml-60 min-h-screen pb-20 lg:pb-0">{children}</main>
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
