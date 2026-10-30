import React, { useState } from 'react';
import { useAuth, SEEDED_USERS } from '../context/AuthContext';
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
  Search,
  Terminal,
  Activity,
  MapPin,
  ChevronRight,
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
  const isAdmin = currentUser.role === 'SYS_ADMIN' || currentUser.role === 'FACILITIES_ADMIN';

  const [commandBarOpen, setCommandBarOpen] = useState(false);
  const [commandInput, setCommandInput] = useState('');

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
    <header className="h-[52px] bg-slate-950 border-b border-slate-800 px-3 flex items-center justify-between shrink-0 select-none z-50">
      {/* Zone 1 Left: Brand & Hierarchical Topological Breadcrumb */}
      <div className="flex items-center space-x-3 shrink-0">
        <div className="flex items-center space-x-2">
          <div className="h-7 w-7 rounded bg-blue-600 flex items-center justify-center font-bold text-white text-xs shadow-sm">
            CO
          </div>
          <span className="font-bold text-xs tracking-tight text-white uppercase font-mono">
            CampusOps
          </span>
        </div>

        <div className="h-4 w-px bg-slate-800" />

        {/* Monospace Topological Breadcrumb Path */}
        <nav className="flex items-center space-x-1 font-mono text-[11px] text-slate-400">
          <button
            onClick={() => onBreadcrumbClick?.('CAMPUS')}
            className="hover:text-blue-400 transition"
          >
            SRM-EEC
          </button>
          <ChevronRight className="w-3 h-3 text-slate-600" />
          <button
            onClick={() => onBreadcrumbClick?.('BLOCK')}
            className="hover:text-blue-400 transition"
          >
            EEC-ACAD
          </button>
          <ChevronRight className="w-3 h-3 text-slate-600" />
          <button
            onClick={() => onBreadcrumbClick?.('FLOOR')}
            className="hover:text-blue-400 transition"
          >
            Fl 2
          </button>
          <ChevronRight className="w-3 h-3 text-slate-600" />
          <button
            onClick={() => onBreadcrumbClick?.('ROOM')}
            className="text-blue-400 font-semibold hover:underline"
          >
            {selectedBreadcrumbNode}
          </button>
        </nav>
      </div>

      {/* Zone 1 Center: Enclosed Segmented Control Strip */}
      <div className="flex items-center bg-slate-900 border border-slate-800 rounded p-0.5 space-x-0.5">
        {navItems
          .filter((item) => !item.adminOnly || isAdmin)
          .map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-[11px] font-mono transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{item.label}</span>
              </button>
            );
          })}
      </div>

      {/* Zone 1 Right: Command Trigger + Env Badge + Strict 2-Role Persona Switcher */}
      <div className="flex items-center space-x-2 shrink-0">
        {/* Command Bar Trigger */}
        <div className="relative">
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded px-2 py-1 space-x-1.5 text-xs text-slate-400 cursor-pointer hover:border-slate-700">
            <Search className="w-3 h-3 text-slate-500" />
            <input
              type="text"
              placeholder="Command / Jump..."
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              className="bg-transparent text-[11px] font-mono text-slate-200 focus:outline-none w-28"
            />
            <kbd className="text-[9px] font-mono bg-slate-950 px-1 py-0.5 rounded border border-slate-800 text-slate-400">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Live Environment Badge */}
        <div className="flex items-center space-x-1.5 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>PROD</span>
        </div>

        {/* Strict 2-Role Persona Switcher: Admin (Approvals) vs Student / Staff (Report) */}
        <div className="flex items-center bg-slate-900 p-0.5 rounded border border-slate-800">
          <button
            onClick={() => switchUser(SEEDED_USERS[0])}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded text-[11px] font-mono transition ${
              currentUser.role === 'SYS_ADMIN'
                ? 'bg-purple-600 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Administrator role: approvals, scheduling, and staff dispatch"
          >
            <Shield className="w-3 h-3" />
            <span>Admin (Approvals)</span>
          </button>

          <button
            onClick={() => switchUser(SEEDED_USERS[1])}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded text-[11px] font-mono transition ${
              currentUser.role === 'STUDENT_FACULTY'
                ? 'bg-blue-600 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
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
