"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  SquaresFour, 
  Buildings, 
  Users, 
  RocketLaunch, 
  Brain, 
  Gear, 
  Question,
  CaretDoubleLeft
} from "@phosphor-icons/react";

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path || (path !== "/" && pathname.startsWith(path));
  };

  return (
    <nav className="hidden md:flex flex-col h-full w-64 bg-sidebar border-r border-sidebar-border py-6 px-4 shrink-0 transition-all duration-300">
      <div className="mb-8 px-2">
        <div className="flex items-center gap-3">
          <img 
            alt="Organization Logo" 
            className="w-8 h-8 rounded-xl shadow-sm object-cover" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuC41X0UfvfA0JWbdywFNYkSnlZxPUuaRoGYf_HXCO6uN2Fo6r-N33VBgno2LeNNAESOwxg_HQi8tMUQiY1Hjfx5t14ezFKU2l6_Rqfrp-VBBrOsP6DKaK2DFoKH8y5M0gODz4p9GDfbpZB5SL0ZrT3rNGFlBQzvV2IgJ51BP7r-sRMI7aXRZ_EPJTlNk7P3foEU5lRPtAs6fPcMe3zeB9FFk_FdbnCshd953vWJl5mLyzL2V7Z-_UbYTA"
          />
          <div>
            <h1 className="text-base tracking-tight font-semibold text-sidebar-foreground">ABM Orchestrator</h1>
            <p className="text-xs text-muted-foreground">Enterprise Tier</p>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-2">
        <Link 
          href="/dashboard"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 active:scale-95 ${isActive('/dashboard') ? 'bg-primary/10 text-primary font-medium' : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'}`}
        >
          <SquaresFour size={20} weight={isActive('/dashboard') ? "fill" : "regular"} />
          <span className="text-sm">Dashboard</span>
        </Link>

        <Link 
          href="/segments"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 active:scale-95 ${isActive('/segments') ? 'bg-primary/10 text-primary font-medium' : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'}`}
        >
          <Users size={20} weight={isActive('/segments') ? "fill" : "regular"} />
          <span className="text-sm">Segments</span>
        </Link>
        <Link 
          href="/campaigns"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 active:scale-95 ${isActive('/campaigns') ? 'bg-primary/10 text-primary font-medium' : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'}`}
        >
          <RocketLaunch size={20} weight={isActive('/campaigns') ? "fill" : "regular"} />
          <span className="text-sm">Campaigns</span>
        </Link>
        <Link 
          href="/intelligence"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 active:scale-95 ${isActive('/intelligence') ? 'bg-primary/10 text-primary font-medium' : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'}`}
        >
          <Brain size={20} weight={isActive('/intelligence') ? "fill" : "regular"} />
          <span className="text-sm">Intelligence</span>
        </Link>
      </div>
      
      <div className="mt-auto space-y-1 pt-6">
        <Link 
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors duration-200"
        >
          <Gear size={20} />
          <span className="text-sm">Settings</span>
        </Link>
        <Link 
          href="/support"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors duration-200"
        >
          <Question size={20} />
          <span className="text-sm">Support</span>
        </Link>
        
        <button className="w-full flex items-center justify-center gap-2 mt-4 px-3 py-2.5 border border-sidebar-border rounded-xl text-sidebar-foreground hover:bg-sidebar-accent transition-colors text-xs font-medium">
          <CaretDoubleLeft size={16} />
          Collapse View
        </button>
      </div>
    </nav>
  );
}
