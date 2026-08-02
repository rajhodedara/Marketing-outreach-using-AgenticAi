import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

const outfit = Outfit({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ABM Orchestrator",
  description: "B2B SaaS Dashboard for Account Based Marketing",
};

import { Providers } from "./providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
      </head>
      <body className={`${outfit.className} flex h-[100dvh] bg-background overflow-hidden text-foreground antialiased`} suppressHydrationWarning>
        <Providers>
          <TooltipProvider delay={150}>
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              <Topbar />
              <main className="flex-1 overflow-y-auto bg-background p-4 md:p-8">
                {children}
              </main>
            </div>
          </TooltipProvider>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}

