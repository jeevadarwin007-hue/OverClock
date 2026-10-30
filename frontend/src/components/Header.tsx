import React, { useState, useEffect } from 'react';
import { useAuth, SEEDED_USERS } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutDashboard,
  Box,
  DoorOpen,
  ClipboardList,
  Layers,
  ShieldCheck,
  Shield,
  GraduationCap,
  Users,
  ChevronRight,
  Search,
  Command,
} from 'lucide-react';

export type TabType =
  | 'command-center'
  | 'campus-explorer'
  | 'room-management'
  | 'work-orders'
  | 'inventory-approvals'
  | 'worker-roster'
  | 'invariants';

interface HeaderProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  allInvariantsPass?: boolean;
  selectedBreadcrumbNode?: string;
  onBreadcrumbClick?: (segment: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  allInvariantsPass = true,
  selectedBreadcrumbNode = 'RM-ACAD-204',
  onBreadcrumbClick,
}) => {
  const { currentUser, switchUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const isAdmin = currentUser.role === 'SYS_ADMIN' || currentUser.role === 'FACILITIES_ADMIN';

  // Live Nothing OS Clock (HH:MM:SS)
  const [currentTime, setCurrentTime] = useState<string>('');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const navItems: { id: TabType; label: string; icon: any; adminOnly?: boolean }[] = [
    { id: 'command-center', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'campus-explorer', label: 'Campus Map & DAG', icon: Box },
    { id: 'room-management', label: 'Rooms', icon: DoorOpen },
    { id: 'work-orders', label: 'Work Orders', icon: ClipboardList },
    { id: 'inventory-approvals', label: 'Inventory & Approvals', icon: Layers },
    { id: 'worker-roster', label: 'Worker Roster', icon: Users, adminOnly: true },
    { id: 'invariants', label: 'System Status', icon: ShieldCheck },
  ];

  return (
    <header className="h-[54px] bg-black/90 backdrop-blur-2xl border-b border-white/10 px-4 flex items-center justify-between shrink-0 select-none z-50 shadow-[0_4px_30px_rgba(0,0,0,0.8)]">
      {/* Zone 1 Left: Brand & Hierarchical Topological Breadcrumb */}
      <div className="flex items-center space-x-3.5 shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="h-8 w-8 rounded-2xl bg-[#141417] border border-white/20 flex items-center justify-center font-ndot font-bold text-white text-xs shadow-[0_0_15px_rgba(255,255,255,0.15)] spring-interactive relative group">
            <span>CO</span>
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-nothing-red nothing-red-dot" />
          </div>
          <div className="flex flex-col">
            <span className="font-ndot55 text-sm tracking-widest text-white uppercase font-bold leading-none">
              CAMPUS<span className="text-nothing-red">OPS</span>
            </span>
            <span className="text-[9px] font-mono text-neutral-400 tracking-wider">
              NOTHING OS 2.5
            </span>
          </div>
        </div>

        <div className="h-4 w-px bg-white/15" />

        {/* Monospace Topological Breadcrumb Path */}
        <nav className="flex items-center space-x-1.5 font-ndot text-xs text-neutral-400">
          <button
            onClick={() => onBreadcrumbClick?.('CAMPUS')}
            className="hover:text-white transition spring-interactive"
          >
            SRM-EEC
          </button>
          <span className="text-neutral-600 font-sans">/</span>
          <button
            onClick={() => onBreadcrumbClick?.('BLOCK')}
            className="hover:text-white transition spring-interactive"
          >
            EEC-ACAD
          </button>
          <span className="text-neutral-600 font-sans">/</span>
          <button
            onClick={() => onBreadcrumbClick?.('FLOOR')}
            className="hover:text-white transition spring-interactive"
          >
            FL-02
          </button>
          <span className="text-neutral-600 font-sans">/</span>
          <button
            onClick={() => onBreadcrumbClick?.('ROOM')}
            className="text-white font-bold hover:text-nothing-red transition spring-interactive flex items-center space-x-1"
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-nothing-red" />
            <span>{selectedBreadcrumbNode}</span>
          </button>
        </nav>
      </div>

      {/* Zone 1 Center: Nothing OS Segmented Pill Control Strip */}
      <div className="flex items-center bg-[#121215] border border-white/15 rounded-full p-1 space-x-1 shadow-inner">
        {navItems
          .filter((item) => !item.adminOnly || isAdmin)
          .map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-sans transition-all duration-200 spring-interactive ${
                  isActive
                    ? 'bg-white text-black font-semibold shadow-[0_2px_12px_rgba(255,255,255,0.35)]'
                    : 'text-neutral-400 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-black' : 'text-neutral-400'}`} />
                <span>{item.label}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-nothing-red" />
                )}
              </button>
            );
          })}
      </div>

      {/* Zone 1 Right: Live NDot Clock, Theme Switcher & Strict 2-Role Persona Switcher */}
      <div className="flex items-center space-x-2.5 shrink-0">
        {/* Live Nothing OS Clock */}
        <div className="hidden xl:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[#121215] border border-white/15 text-white font-ndot text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
          <span>{currentTime || '00:00:00'}</span>
        </div>

        {/* Command Search Trigger */}
        <button
          onClick={() => {
            const input = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
            if (input) input.focus();
          }}
          className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[#121215] border border-white/15 text-neutral-400 hover:text-white hover:border-white/30 text-xs font-mono transition spring-interactive"
        >
          <Search className="w-3 h-3 text-neutral-400" />
          <span className="text-[11px]">Jump</span>
          <span className="px-1.5 py-0.2 rounded bg-white/10 text-[10px] text-white font-ndot">
            ⌘K
          </span>
        </button>

        <div className="h-4 w-px bg-white/15" />

        {/* Theme Toggle (Nothing OLED vs Monochrome vs Mocha) */}
        <div className="flex items-center bg-[#121215] p-0.5 rounded-full border border-white/15">
          <button
            onClick={() => setTheme('monochrome')}
            className={`flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-ndot transition duration-200 spring-interactive ${
              theme === 'monochrome'
                ? 'bg-white text-black font-bold shadow-[0_2px_8px_rgba(255,255,255,0.4)]'
                : 'text-neutral-400 hover:text-white'
            }`}
            title="Switch to OLED Nothing OS Monochrome theme"
          >
            <span className="text-[10px] font-bold">OLED</span>
          </button>
          <button
            onClick={() => setTheme('mocha')}
            className={`flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-ndot transition duration-200 spring-interactive ${
              theme === 'mocha'
                ? 'bg-[#ec9665] text-[#180f0a] font-bold shadow-[0_2px_8px_rgba(236,150,101,0.4)]'
                : 'text-neutral-400 hover:text-white'
            }`}
            title="Switch to warm Mocha theme"
          >
            <span className="text-[10px] font-bold">MOCHA</span>
          </button>
        </div>

        <div className="h-4 w-px bg-white/15" />

        {/* Persona Switcher */}
        <div className="flex items-center bg-[#121215] p-0.5 rounded-full border border-white/15">
          <button
            onClick={() => switchUser(SEEDED_USERS[0])}
            className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-sans transition duration-200 spring-interactive ${
              currentUser.role === 'SYS_ADMIN'
                ? 'bg-white text-black font-bold shadow-[0_2px_10px_rgba(255,255,255,0.35)]'
                : 'text-neutral-400 hover:text-white'
            }`}
            title="Administrator role: approvals, scheduling, and staff dispatch"
          >
            <Shield className="w-3 h-3" />
            <span>Admin</span>
          </button>

          <button
            onClick={() => switchUser(SEEDED_USERS[1])}
            className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-sans transition duration-200 spring-interactive ${
              currentUser.role === 'STUDENT_FACULTY'
                ? 'bg-white text-black font-bold shadow-[0_2px_10px_rgba(255,255,255,0.35)]'
                : 'text-neutral-400 hover:text-white'
            }`}
            title="Student / Staff role: report facility incidents and track status"
          >
            <GraduationCap className="w-3 h-3" />
            <span>Student / Staff</span>
          </button>
        </div>
      </div>
    </header>
  );
};
