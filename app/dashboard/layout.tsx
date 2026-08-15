import type { ReactNode } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Sidebar } from "@/components/dashboard/sidebar";
import { PageTransition } from "@/components/dashboard/page-transition";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${plusJakartaSans.variable} dashboard-theme font-sans flex min-h-screen flex-col md:flex-row`}
    >
      <Sidebar />
      <main className="flex-1 px-6 py-8 md:px-10 md:py-10">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
