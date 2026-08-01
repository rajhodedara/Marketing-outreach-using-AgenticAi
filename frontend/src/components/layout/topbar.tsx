"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();

  const isTabActive = (path: string) => {
    return pathname === path || pathname.startsWith(path + '/');
  };

  if (pathname === '/upload') {
    return (
      <header className="w-full h-16 border-b border-border shadow-sm bg-card px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 font-body text-[12px] leading-[16px] text-secondary-foreground/70">
          <Link href="/" className="hover:text-primary transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-[18px]">corporate_fare</span>
            Accounts
          </Link>
          <span className="material-symbols-outlined text-[16px] text-muted-foreground">chevron_right</span>
          <span className="text-foreground font-medium">New Account</span>
        </div>
        <button 
          onClick={() => router.push('/')}
          className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
        >
          <span className="material-symbols-outlined text-[20px] text-muted-foreground">close</span>
        </button>
      </header>
    );
  }

  return (
    <header className="flex justify-between items-center w-full px-4 h-16 bg-card dark:bg-[#1a1b22] border-b border-border shrink-0">
      <div className="flex items-center gap-4">
        <div className="md:hidden">
          <span className="text-[18px] leading-[24px] tracking-[-0.01em] font-black text-foreground">Account Navigator</span>
        </div>
        <div className="hidden md:flex items-center gap-2 text-secondary-foreground/70 text-[12px] leading-[16px]">
          <span>Platform</span>
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          <span className="text-foreground font-medium">Accounts</span>
        </div>
      </div>
      
      <div className="hidden md:flex flex-1 max-w-md mx-6">
        <div className="relative w-full focus-within:ring-2 focus-within:ring-primary rounded-lg">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary-foreground/70">search</span>
          <input 
            className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-lg text-[12px] leading-[16px] text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow" 
            placeholder="Search accounts..." 
            type="text"
          />
        </div>
      </div>
      
      <nav className="hidden lg:flex items-center gap-6 h-full mr-8">
        <Link 
          href="/" 
          className={`h-full flex items-center text-[12px] leading-[16px] font-medium pt-[2px] transition-colors ${isTabActive('/') ? 'text-primary border-b-2 border-primary' : 'text-secondary-foreground/70 hover:text-foreground'}`}
        >
          Overview
        </Link>
        <Link 
          href="/stakeholders" 
          className={`h-full flex items-center text-[12px] leading-[16px] transition-colors ${isTabActive('/stakeholders') ? 'text-primary border-b-2 border-primary' : 'text-secondary-foreground/70 hover:text-foreground'}`}
        >
          Stakeholders
        </Link>
        <Link 
          href="/outreach" 
          className={`h-full flex items-center text-[12px] leading-[16px] transition-colors ${isTabActive('/outreach') ? 'text-primary border-b-2 border-primary' : 'text-secondary-foreground/70 hover:text-foreground'}`}
        >
          Outreach
        </Link>
        <Link 
          href="/history" 
          className={`h-full flex items-center text-[12px] leading-[16px] transition-colors ${isTabActive('/history') ? 'text-primary border-b-2 border-primary' : 'text-secondary-foreground/70 hover:text-foreground'}`}
        >
          History
        </Link>
      </nav>
      
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" className="hidden sm:flex items-center gap-2 h-8 text-[12px]">
          Export Data
        </Button>
        <Button size="sm" className="flex items-center gap-2 h-8 bg-foreground text-background hover:bg-foreground/90 text-[12px]">
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Account
        </Button>
        
        <div className="h-6 w-[1px] bg-border mx-1 hidden sm:block"></div>
        
        <button className="text-secondary-foreground/70 hover:text-primary transition-colors p-1">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button className="text-secondary-foreground/70 hover:text-primary transition-colors p-1 hidden sm:block">
          <span className="material-symbols-outlined">help</span>
        </button>
        
        <img 
          alt="User Profile" 
          className="w-8 h-8 rounded-full border border-border ml-2 object-cover" 
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuATZ0yJyGWPUEunQJfxPE78-CfFey6Drkh2ovTpTkx3QHTY1lyqB5zxjwzQZgJBGWmKYTVMfZ68e68VYpbieI0dvWmy-8LOvmTpS6GLU8m_E_Ub-Ek7QnrHe4KiIla8v8DQQImP5SbSPus_FgmCZ5bFT4jfGV9zua_Bm2-utZpfywfxfL-fh--kbM3MLhMOLetlMW2uUNwTr_cT_Tpg-LKeT9jXltHArblM30aghv0EniBlOmUVqHSTlQ"
        />
      </div>
    </header>
  );
}
