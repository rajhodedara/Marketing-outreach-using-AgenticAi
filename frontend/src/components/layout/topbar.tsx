"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { 
  MagnifyingGlass, 
  CaretRight, 
  X, 
  Plus, 
  Bell, 
  Question 
} from "@phosphor-icons/react";

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();

  const isTabActive = (path: string) => {
    return pathname === path || pathname.startsWith(path + '/');
  };

  if (pathname === '/upload') {
    return (
      <header className="w-full h-16 border-b border-border shadow-sm bg-card/80 backdrop-blur-md px-6 flex items-center justify-between shrink-0 sticky top-0 z-10">
        <div className="flex items-center gap-2 font-body text-sm text-muted-foreground">
          <Link href="/" className="hover:text-primary transition-colors flex items-center gap-1">
            Accounts
          </Link>
          <CaretRight size={14} />
          <span className="text-foreground font-medium">New Account</span>
        </div>
        <button 
          onClick={() => router.push('/')}
          className="w-8 h-8 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors"
        >
          <X size={16} />
        </button>
      </header>
    );
  }

  return (
    <header className="flex justify-between items-center w-full px-6 h-16 bg-card/80 backdrop-blur-md border-b border-border shrink-0 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <div className="md:hidden">
          <span className="text-lg tracking-tight font-bold text-foreground">ABM</span>
        </div>
        <div className="hidden md:flex items-center gap-2 text-muted-foreground text-sm">
          <span>Platform</span>
          <CaretRight size={14} />
          <span className="text-foreground font-medium">Accounts</span>
        </div>
      </div>
      
      <div className="hidden md:flex flex-1 max-w-md mx-8">
        <div className="relative w-full rounded-full">
          <MagnifyingGlass size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            className="w-full pl-11 pr-4 py-2 bg-muted/50 border border-transparent hover:bg-muted focus:bg-background rounded-full text-sm text-foreground focus:outline-none focus:border-border focus:ring-1 focus:ring-border transition-all duration-300" 
            placeholder="Search accounts..." 
            type="text"
          />
        </div>
      </div>
      
      <nav className="hidden lg:flex items-center gap-8 h-full mr-8">
        <Link 
          href="/" 
          className={`h-full flex items-center text-sm font-medium transition-colors ${isTabActive('/') ? 'text-foreground border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Overview
        </Link>
        <Link 
          href="/stakeholders" 
          className={`h-full flex items-center text-sm font-medium transition-colors ${isTabActive('/stakeholders') ? 'text-foreground border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Stakeholders
        </Link>
        <Link 
          href="/outreach" 
          className={`h-full flex items-center text-sm font-medium transition-colors ${isTabActive('/outreach') ? 'text-foreground border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Outreach
        </Link>
        <Link 
          href="/history" 
          className={`h-full flex items-center text-sm font-medium transition-colors ${isTabActive('/history') ? 'text-foreground border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          History
        </Link>
      </nav>
      
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" className="hidden sm:flex rounded-full px-4 h-9 text-xs font-medium border-border hover:bg-muted">
          Export Data
        </Button>
        <Button size="sm" className="flex items-center gap-1.5 h-9 rounded-full bg-foreground text-background hover:bg-foreground/90 px-4 text-xs font-medium">
          <Plus size={16} />
          New Account
        </Button>
        
        <div className="h-6 w-[1px] bg-border mx-2 hidden sm:block"></div>
        
        <button className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-full hover:bg-muted">
          <Bell size={20} />
        </button>
        <button className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-full hover:bg-muted hidden sm:block">
          <Question size={20} />
        </button>
        
        <img 
          alt="User Profile" 
          className="w-9 h-9 rounded-full border border-border ml-2 object-cover" 
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuATZ0yJyGWPUEunQJfxPE78-CfFey6Drkh2ovTpTkx3QHTY1lyqB5zxjwzQZgJBGWmKYTVMfZ68e68VYpbieI0dvWmy-8LOvmTpS6GLU8m_E_Ub-Ek7QnrHe4KiIla8v8DQQImP5SbSPus_FgmCZ5bFT4jfGV9zua_Bm2-utZpfywfxfL-fh--kbM3MLhMOLetlMW2uUNwTr_cT_Tpg-LKeT9jXltHArblM30aghv0EniBlOmUVqHSTlQ"
        />
      </div>
    </header>
  );
}
