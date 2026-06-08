import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f9fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0c" },
  ],
};

export const metadata: Metadata = {
  title: "Apex - Personal Productivity",
  description: "Personal productivity and habit tracking for studies, fitness, and daily habits",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full bg-[#f8f9fb] dark:bg-[#0a0a0c] text-gray-900 dark:text-gray-100 antialiased">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
