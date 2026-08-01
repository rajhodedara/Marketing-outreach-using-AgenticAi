import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ABM Orchestrator",
  description: "B2B SaaS Dashboard for Account Based Marketing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
      </head>
      <body className={`${inter.className} flex h-screen bg-background overflow-hidden text-on-surface antialiased`}>
        <TooltipProvider delay={150}>
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <Topbar />
            <main className="flex-1 overflow-y-auto bg-[#FAFAF9] dark:bg-background">
              {children}
            </main>
          </div>
        </TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}

