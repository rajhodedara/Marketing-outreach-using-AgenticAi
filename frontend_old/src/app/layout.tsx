import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

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
      <body className={`${inter.className} bg-background text-foreground antialiased min-h-screen`}>
        <TooltipProvider delayDuration={150}>
          <div className="flex min-h-screen flex-col">
            <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
              <div className="container mx-auto flex h-16 items-center px-4 md:px-6">
                <a className="flex items-center gap-2 font-semibold" href="/">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                  <span className="text-lg tracking-tight">ABM Orchestrator</span>
                </a>
                <nav className="ml-auto flex gap-4 sm:gap-6">
                  <a className="text-sm font-medium hover:text-primary transition-colors" href="/">Accounts</a>
                  <a className="text-sm font-medium hover:text-primary transition-colors" href="/upload">Upload Data</a>
                </nav>
              </div>
            </header>
            <main className="flex-1 container mx-auto p-4 md:p-6 lg:p-8">
              {children}
            </main>
          </div>
        </TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
