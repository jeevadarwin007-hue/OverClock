import React from 'react';
import { useAuth, SEEDED_USERS } from '../context/AuthContext';
import {
  ShieldAlert,
  MapPin,
  CheckCircle2,
  LayoutDashboard,
  Box,
  DoorOpen,
  ClipboardList,
  Layers,
  ShieldCheck,
  Shield,
  GraduationCap,
} from 'lucide-react';

export type TabType =
  | 'command-center'
  | 'campus-explorer'
  | 'room-management'
  | 'work-orders'
  | 'inventory-approvals'
  | 'invariants';

interface HeaderProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  allInvariantsPass?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  allInvariantsPass = true,
}) => {
  const { currentUser, switchUser } = useAuth();

  const navItems: { id: TabType; label: string; icon: any }[] = [
    { id: 'command-center', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'campus-explorer', label: 'Campus Map', icon: Box },
    { id: 'room-management', label: 'Rooms', icon: DoorOpen },
    { id: 'work-orders', label: 'Work Orders', icon: ClipboardList },
    { id: 'inventory-approvals', label: 'Inventory & Approvals', icon: Layers },
    { id: 'invariants', label: 'System Status', icon: ShieldCheck },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-md">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Institution Info */}
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-md shadow-blue-500/20 text-base">
              CO
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-base text-white tracking-tight">CampusOps</span>
                <span className="text-[11px] px-2 py-0.5 rounded font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20">
                  SRM Easwari
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Operations & Facilities Platform</p>
            </div>
          </div>

          {/* Right Status & Static User Profile */}
          <div className="flex items-center space-x-3">
            {/* System Status Pill */}
            <div
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                allInvariantsPass
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/25'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${allInvariantsPass ? 'bg-emerald-400' : 'bg-rose-400'}`} />
              <span>{allInvariantsPass ? 'System Online' : 'System Alert'}</span>
            </div>

            {/* 2-Account Switcher: Admin (Approvals) vs Student / Staff (Reports) */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => switchUser(SEEDED_USERS[0])}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  currentUser.role === 'SYS_ADMIN'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Switch to Administrator for approvals and operations"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin (Approvals)</span>
              </button>

              <button
                onClick={() => switchUser(SEEDED_USERS[1])}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  currentUser.role === 'STUDENT_FACULTY'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Switch to Student / Staff for reporting incidents"
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Student / Staff (Report)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 overflow-x-auto py-2 border-t border-slate-800/60">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};


