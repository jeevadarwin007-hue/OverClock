import React from 'react';
import { motion } from 'framer-motion';
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
  loadingTab?: TabType | null;
  allInvariantsPass?: boolean;
  selectedBreadcrumbNode?: string;
  onBreadcrumbClick?: (segment: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  loadingTab = null,
}) => {
  const { currentUser, switchUser } = useAuth();
  const isAdmin = currentUser.role === 'SYS_ADMIN' || currentUser.role === 'FACILITIES_ADMIN';

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
    <header className="h-[56px] bg-black/90 backdrop-blur-2xl border-b border-white/10 px-3 md:px-4 flex items-center gap-3 shrink-0 select-none z-50 shadow-[0_4px_30px_rgba(0,0,0,0.8)]">
      <div className="flex items-center gap-2 shrink-0">
        <div className="h-8 w-8 rounded-xl bg-[#141417] border border-white/20 flex items-center justify-center font-ndot font-bold text-white text-xs relative">
          <span>CO</span>
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-nothing-red nothing-red-dot" />
        </div>
        <span className="hidden sm:block font-ndot55 text-sm tracking-widest text-white uppercase font-bold leading-none">
          CAMPUS<span className="text-nothing-red">OPS</span>
        </span>
      </div>

      <nav aria-label="Primary navigation" className="flex-1 min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="w-max mx-auto flex items-center bg-[#0d0f17]/95 border border-white/15 backdrop-blur-2xl rounded-full p-1 space-x-0.5 shadow-2xl relative">
          {navItems
            .filter((item) => !item.adminOnly || isAdmin)
            .map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const isLoading = loadingTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  title={item.label}
                  className={`relative cursor-pointer text-xs font-semibold px-3 sm:px-4 py-2 rounded-full transition-colors flex items-center space-x-1.5 ${
                    isActive
                      ? 'text-white font-bold'
                      : isLoading
                      ? 'text-white'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 transition-colors ${
                      isActive ? 'text-nothing-red' : 'text-neutral-400'
                    }`}
                  />
                  <span className="hidden lg:inline font-ndot tracking-wide">
                    {isLoading ? 'Loading…' : item.label}
                  </span>

                  {/* Tubelight Lamp Beam & Halo Glow */}
                  {isActive && (
                    <motion.div
                      layoutId="tubelightLamp"
                      className="absolute inset-0 w-full bg-white/[0.08] rounded-full -z-10"
                      initial={false}
                      transition={{
                        type: 'spring',
                        stiffness: 350,
                        damping: 28,
                      }}
                    >
                      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-nothing-red rounded-t-full shadow-[0_0_12px_#d73832]">
                        <div className="absolute w-12 h-6 bg-nothing-red/35 rounded-full blur-md -top-2 -left-2 pointer-events-none" />
                        <div className="absolute w-8 h-6 bg-nothing-red/45 rounded-full blur-md -top-1 pointer-events-none" />
                        <div className="absolute w-4 h-4 bg-white/50 rounded-full blur-sm top-0 left-2 pointer-events-none" />
                      </div>
                    </motion.div>
                  )}
                </button>
              );
            })}
        </div>
      </nav>

      <div className="flex items-center shrink-0">
        <div className="flex items-center bg-[#121215] p-0.5 rounded-full border border-white/15 relative">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => switchUser(SEEDED_USERS[0])}
            className={`relative flex items-center space-x-1 px-2.5 py-1.5 rounded-full text-xs font-sans transition-colors duration-150 ${
              currentUser.role === 'SYS_ADMIN'
                ? 'text-black font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
            title="Administrator role: approvals, scheduling, and staff dispatch"
          >
            {currentUser.role === 'SYS_ADMIN' && (
              <motion.div
                layoutId="headerRolePill"
                className="absolute inset-0 bg-white rounded-full shadow-[0_2px_10px_rgba(255,255,255,0.35)]"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center space-x-1">
              <Shield className="w-3 h-3" />
              <span className="hidden 2xl:inline">Admin</span>
            </span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => switchUser(SEEDED_USERS[1])}
            className={`relative flex items-center space-x-1 px-2.5 py-1.5 rounded-full text-xs font-sans transition-colors duration-150 ${
              currentUser.role === 'STUDENT_FACULTY'
                ? 'text-black font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
            title="Student / Staff role: report facility incidents and track status"
          >
            {currentUser.role === 'STUDENT_FACULTY' && (
              <motion.div
                layoutId="headerRolePill"
                className="absolute inset-0 bg-white rounded-full shadow-[0_2px_10px_rgba(255,255,255,0.35)]"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center space-x-1">
              <GraduationCap className="w-3 h-3" />
              <span className="hidden 2xl:inline">Staff</span>
            </span>
          </motion.button>
        </div>
      </div>
    </header>
  );
};
