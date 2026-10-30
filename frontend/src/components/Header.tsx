import React from 'react';
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
  Palette,
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

  const navItems: { id: TabType; label: string; icon: any; adminOnly?: boolean }[] = [
    { id: 'command-center', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'campus-explorer', label: 'Campus Map', icon: Box },
    { id: 'room-management', label: 'Rooms', icon: DoorOpen },
    { id: 'work-orders', label: 'Work Orders', icon: ClipboardList },
    { id: 'inventory-approvals', label: 'Inventory & Approvals', icon: Layers },
    { id: 'worker-roster', label: 'Worker Roster', icon: Users, adminOnly: true },
    { id: 'invariants', label: 'System Status', icon: ShieldCheck },
  ];

  return (
    <header className="h-[52px] bg-[#24160f]/85 backdrop-blur-xl border-b border-[#9c6c4c]/30 px-3 flex items-center justify-between shrink-0 select-none z-50 shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
      {/* Zone 1 Left: Brand & Hierarchical Topological Breadcrumb */}
      <div className="flex items-center space-x-3 shrink-0">
        <div className="flex items-center space-x-2">
          <div className="h-7 w-7 rounded-md bg-gradient-to-br from-[#ec9665] to-[#9c6c4c] flex items-center justify-center font-black text-[#180f0a] text-xs shadow-[0_0_15px_rgba(236,150,101,0.35)] spring-interactive">
            CO
          </div>
          <span className="font-bold text-xs tracking-tight text-[#f4aa7f] uppercase font-mono">
            CampusOps
          </span>
        </div>

        <div className="h-4 w-px bg-[#9c6c4c]/40" />

        {/* Monospace Topological Breadcrumb Path */}
        <nav className="flex items-center space-x-1 font-mono text-[11px] text-[#d8bca4]/70">
          <button
            onClick={() => onBreadcrumbClick?.('CAMPUS')}
            className="hover:text-[#ec9665] transition spring-interactive"
          >
            SRM-EEC
          </button>
          <ChevronRight className="w-3 h-3 text-[#9c6c4c]" />
          <button
            onClick={() => onBreadcrumbClick?.('BLOCK')}
            className="hover:text-[#ec9665] transition spring-interactive"
          >
            EEC-ACAD
          </button>
          <ChevronRight className="w-3 h-3 text-[#9c6c4c]" />
          <button
            onClick={() => onBreadcrumbClick?.('FLOOR')}
            className="hover:text-[#ec9665] transition spring-interactive"
          >
            Fl 2
          </button>
          <ChevronRight className="w-3 h-3 text-[#9c6c4c]" />
          <button
            onClick={() => onBreadcrumbClick?.('ROOM')}
            className="text-[#ec9665] font-semibold hover:underline spring-interactive"
          >
            {selectedBreadcrumbNode}
          </button>
        </nav>
      </div>

      {/* Zone 1 Center: Enclosed Glass Segmented Control Strip */}
      <div className="flex items-center bg-[#523624]/40 backdrop-blur-md border border-[#9c6c4c]/35 rounded-lg p-0.5 space-x-0.5 shadow-inner">
        {navItems
          .filter((item) => !item.adminOnly || isAdmin)
          .map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono transition-all duration-200 spring-interactive ${
                  isActive
                    ? 'bg-[#ec9665] text-[#180f0a] font-bold shadow-[0_2px_12px_rgba(236,150,101,0.4)]'
                    : 'text-[#d8bca4]/80 hover:text-[#f4aa7f] hover:bg-[#5f493b]/40'
                }`}
              >
                <Icon className={`w-3 h-3 ${isActive ? 'text-[#180f0a]' : 'text-[#d8bca4]/70'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
      </div>

      {/* Zone 1 Right: Theme Switcher & Strict 2-Role Persona Switcher */}
      <div className="flex items-center space-x-2 shrink-0">
        {/* Theme Toggle (Mocha & Coral vs Monochrome) */}
        <div className="flex items-center bg-[#523624]/40 backdrop-blur-md p-0.5 rounded-lg border border-[#9c6c4c]/35 shadow-inner">
          <button
            onClick={() => setTheme('mocha')}
            className={`flex items-center space-x-1 px-2 py-1 rounded-md text-[11px] font-mono transition duration-200 spring-interactive ${
              theme === 'mocha'
                ? 'bg-gradient-to-r from-[#ec9665] to-[#f4aa7f] text-[#180f0a] font-bold shadow-[0_2px_8px_rgba(236,150,101,0.4)]'
                : 'text-[#d8bca4]/70 hover:text-[#f4aa7f]'
            }`}
            title="Switch to warm Mocha & Coral theme"
          >
            <span className="text-xs">☕</span>
            <span>Mocha</span>
          </button>
          <button
            onClick={() => setTheme('monochrome')}
            className={`flex items-center space-x-1 px-2 py-1 rounded-md text-[11px] font-mono transition duration-200 spring-interactive ${
              theme === 'monochrome'
                ? 'bg-white text-black font-bold shadow-[0_2px_8px_rgba(255,255,255,0.4)]'
                : 'text-[#d8bca4]/70 hover:text-[#f4aa7f]'
            }`}
            title="Switch to sleek Monochrome theme"
          >
            <span className="text-xs">⬛</span>
            <span>Mono</span>
          </button>
        </div>

        <div className="h-4 w-px bg-[#9c6c4c]/40" />

        {/* Persona Switcher */}
        <div className="flex items-center bg-[#523624]/40 backdrop-blur-md p-0.5 rounded-lg border border-[#9c6c4c]/35 shadow-inner">
          <button
            onClick={() => switchUser(SEEDED_USERS[0])}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-[11px] font-mono transition duration-200 spring-interactive ${
              currentUser.role === 'SYS_ADMIN'
                ? 'bg-gradient-to-r from-[#ec9665] to-[#f4aa7f] text-[#180f0a] font-bold shadow-[0_2px_10px_rgba(236,150,101,0.35)]'
                : 'text-[#d8bca4]/75 hover:text-[#f4aa7f]'
            }`}
            title="Administrator role: approvals, scheduling, and staff dispatch"
          >
            <Shield className="w-3 h-3" />
            <span>Admin (Approvals)</span>
          </button>

          <button
            onClick={() => switchUser(SEEDED_USERS[1])}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-[11px] font-mono transition duration-200 spring-interactive ${
              currentUser.role === 'STUDENT_FACULTY'
                ? 'bg-[#9c6c4c] text-white font-bold shadow-[0_2px_10px_rgba(156,108,76,0.35)]'
                : 'text-[#d8bca4]/75 hover:text-[#f4aa7f]'
            }`}
            title="Student / Staff role: report facility incidents and track status"
          >
            <GraduationCap className="w-3 h-3" />
            <span>Student / Staff (Report)</span>
          </button>
        </div>
      </div>
    </header>
  );
};
