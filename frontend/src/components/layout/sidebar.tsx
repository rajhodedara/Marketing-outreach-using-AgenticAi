"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path || (path !== "/" && pathname.startsWith(path));
  };

  return (
    <nav className="hidden md:flex flex-col h-screen w-64 border-r border-border bg-sidebar dark:bg-[#1a1b22] py-4 px-2 shrink-0">
      <div className="mb-6 px-3">
        <div className="flex items-center gap-3">
          <img 
            alt="Organization Logo" 
            className="w-8 h-8 rounded" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuC41X0UfvfA0JWbdywFNYkSnlZxPUuaRoGYf_HXCO6uN2Fo6r-N33VBgno2LeNNAESOwxg_HQi8tMUQiY1Hjfx5t14ezFKU2l6_Rqfrp-VBBrOsP6DKaK2DFoKH8y5M0gODz4p9GDfbpZB5SL0ZrT3rNGFlBQzvV2IgJ51BP7r-sRMI7aXRZ_EPJTlNk7P3foEU5lRPtAs6fPcMe3zeB9FFk_FdbnCshd953vWJl5mLyzL2V7Z-_UbYTA"
          />
          <div>
            <h1 className="text-[18px] leading-[24px] tracking-[-0.01em] font-semibold text-foreground">ABM Orchestrator</h1>
            <p className="text-[12px] leading-[16px] text-muted-foreground">Enterprise Tier</p>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto space-y-1">
        <Link 
          href="/dashboard"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200 active:scale-95 transition-transform ${isActive('/dashboard') ? 'text-primary font-bold border-r-2 border-primary bg-muted/50' : 'text-secondary-foreground/70 hover:text-foreground hover:bg-muted/50'}`}
        >
          <span className={`material-symbols-outlined ${isActive('/dashboard') ? 'fill text-primary' : ''}`}>dashboard</span>
          <span className="text-[16px] leading-[24px]">Dashboard</span>
        </Link>
        <Link 
          href="/workspace"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200 active:scale-95 transition-transform ${isActive('/workspace') ? 'text-primary font-bold border-r-2 border-primary bg-muted/50' : 'text-secondary-foreground/70 hover:text-foreground hover:bg-muted/50'}`}
        >
          <span className={`material-symbols-outlined ${isActive('/workspace') ? 'fill text-primary' : ''}`}>corporate_fare</span>
          <span className="text-[16px] leading-[24px]">Accounts</span>
        </Link>
        <Link 
          href="/julian"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200 active:scale-95 transition-transform ${isActive('/julian') ? 'text-primary font-bold border-r-2 border-primary bg-muted/50' : 'text-secondary-foreground/70 hover:text-foreground hover:bg-muted/50'}`}
        >
          <span className={`material-symbols-outlined ${isActive('/julian') ? 'fill text-primary' : ''}`}>call</span>
          <span className="text-[16px] leading-[24px]">Julian</span>
        </Link>
        <Link 
          href="/nova"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200 active:scale-95 transition-transform ${isActive('/nova') ? 'text-primary font-bold border-r-2 border-primary bg-muted/50' : 'text-secondary-foreground/70 hover:text-foreground hover:bg-muted/50'}`}
        >
          <span className={`material-symbols-outlined ${isActive('/nova') ? 'fill text-primary' : ''}`}>neurology</span>
          <span className="text-[16px] leading-[24px]">Nova</span>
        </Link>
        <Link 
          href="/outreach"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200 active:scale-95 transition-transform ${isActive('/outreach') ? 'text-primary font-bold border-r-2 border-primary bg-muted/50' : 'text-secondary-foreground/70 hover:text-foreground hover:bg-muted/50'}`}
        >
          <span className={`material-symbols-outlined ${isActive('/outreach') ? 'fill text-primary' : ''}`}>send</span>
          <span className="text-[16px] leading-[24px]">Outreach</span>
        </Link>
        <Link 
          href="/intelligence"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200 active:scale-95 transition-transform ${isActive('/intelligence') ? 'text-primary font-bold border-r-2 border-primary bg-muted/50' : 'text-secondary-foreground/70 hover:text-foreground hover:bg-muted/50'}`}
        >
          <span className={`material-symbols-outlined ${isActive('/intelligence') ? 'fill text-primary' : ''}`}>psychology</span>
          <span className="text-[16px] leading-[24px]">Intelligence</span>
        </Link>
      </div>
      <div className="mt-auto space-y-1 pt-4 border-t border-border">
        <Link 
          href="/workspace"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-secondary-foreground/70 hover:text-foreground hover:bg-muted/50 transition-colors duration-200"
        >
          <span className="material-symbols-outlined">settings</span>
          <span className="text-[16px] leading-[24px]">Settings</span>
        </Link>
        <Link 
          href="/workspace"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-secondary-foreground/70 hover:text-foreground hover:bg-muted/50 transition-colors duration-200"
        >
          <span className="material-symbols-outlined">help_outline</span>
          <span className="text-[16px] leading-[24px]">Support</span>
        </Link>
        <button className="w-full flex items-center justify-center gap-2 mt-4 px-3 py-2 border border-border rounded-lg text-foreground hover:bg-muted/50 transition-colors text-[12px] font-medium">
          <span className="material-symbols-outlined text-[18px]">keyboard_double_arrow_left</span>
          Collapse View
        </button>
      </div>
    </nav>
  );
}
