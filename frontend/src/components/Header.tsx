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
    { id: 'campus-explorer', label: 'Map', icon: Box },
    { id: 'room-management', label: 'Rooms', icon: DoorOpen },
    { id: 'work-orders', label: 'Orders', icon: ClipboardList },
    { id: 'inventory-approvals', label: 'Inventory', icon: Layers },
    { id: 'worker-roster', label: 'Roster', icon: Users, adminOnly: true },
    { id: 'invariants', label: 'Status', icon: ShieldCheck },
  ];

  return (
    <header className="h-[54px] bg-black/90 backdrop-blur-2xl border-b border-white/10 px-3 md:px-4 flex items-center gap-3 shrink-0 select-none z-50 shadow-[0_4px_30px_rgba(0,0,0,0.8)]">
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
      <div className="w-max mx-auto flex items-center bg-[#121215] border border-white/15 rounded-full p-1 space-x-0.5 shadow-inner relative">
        {navItems
          .filter((item) => !item.adminOnly || isAdmin)
          .map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isLoading = loadingTab === item.id;
            return (
              <motion.button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                title={item.label}
                className={`relative flex items-center space-x-1.5 px-2.5 xl:px-3 py-1.5 rounded-full text-xs font-sans transition-colors duration-150 ${
                  isActive ? 'text-black font-semibold' : isLoading ? 'text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="headerActiveTab"
                    className="absolute inset-0 bg-white rounded-full shadow-[0_2px_12px_rgba(255,255,255,0.35)]"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <span className="relative z-10 flex items-center space-x-1.5">
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-black' : 'text-neutral-400'}`} />
                  <motion.span
                    key={isLoading ? 'loading' : 'label'}
                    initial={isLoading ? { opacity: 0, y: 5, filter: 'blur(3px)' } : false}
                    animate={isLoading ? { opacity: 1, y: 0, filter: 'blur(0px)' } : { opacity: 1 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    style={isLoading ? { fontFamily: "Georgia, 'Times New Roman', serif" } : undefined}
                    className={`${isLoading ? 'inline tracking-wide' : 'hidden xl:inline'}`}
                  >
                    {isLoading ? 'Loading…' : item.label}
                  </motion.span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-nothing-red" />
                  )}
                </span>
              </motion.button>
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
