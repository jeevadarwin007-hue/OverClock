import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="h-8 w-8 rounded-2xl bg-[#141417] border border-white/20 flex items-center justify-center font-ndot font-bold text-white text-xs shadow-[0_0_15px_rgba(255,255,255,0.15)] relative cursor-pointer"
          >
            <span>CO</span>
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-nothing-red nothing-red-dot" />
          </motion.div>
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
          <motion.button
            whileHover={{ scale: 1.05, color: '#ffffff' }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onBreadcrumbClick?.('CAMPUS')}
            className="hover:text-white transition"
          >
            SRM-EEC
          </motion.button>
          <span className="text-neutral-600 font-sans">/</span>
          <motion.button
            whileHover={{ scale: 1.05, color: '#ffffff' }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onBreadcrumbClick?.('BLOCK')}
            className="hover:text-white transition"
          >
            EEC-ACAD
          </motion.button>
          <span className="text-neutral-600 font-sans">/</span>
          <motion.button
            whileHover={{ scale: 1.05, color: '#ffffff' }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onBreadcrumbClick?.('FLOOR')}
            className="hover:text-white transition"
          >
            FL-02
          </motion.button>
          <span className="text-neutral-600 font-sans">/</span>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onBreadcrumbClick?.('ROOM')}
            className="text-white font-bold hover:text-nothing-red transition flex items-center space-x-1"
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-nothing-red" />
            <span>{selectedBreadcrumbNode}</span>
          </motion.button>
        </nav>
      </div>

      {/* Zone 1 Center: Nothing OS Segmented Pill Control Strip with Framer Motion LayoutId */}
      <div className="flex items-center bg-[#121215] border border-white/15 rounded-full p-1 space-x-1 shadow-inner relative">
        {navItems
          .filter((item) => !item.adminOnly || isAdmin)
          .map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <motion.button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                className={`relative flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-sans transition-colors duration-150 ${
                  isActive ? 'text-black font-semibold' : 'text-neutral-400 hover:text-white'
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
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-nothing-red" />
                  )}
                </span>
              </motion.button>
            );
          })}
      </div>

      {/* Zone 1 Right: Live NDot Clock, Theme Switcher & Strict 2-Role Persona Switcher */}
      <div className="flex items-center space-x-2.5 shrink-0">
        {/* Live Nothing OS Clock */}
        <motion.div
          animate={{ opacity: [0.9, 1, 0.9] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="hidden xl:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[#121215] border border-white/15 text-white font-ndot text-xs"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
          <span>{currentTime || '00:00:00'}</span>
        </motion.div>

        {/* Command Search Trigger */}
        <motion.button
          whileHover={{ scale: 1.04, borderColor: 'rgba(255,255,255,0.3)' }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            const input = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
            if (input) input.focus();
          }}
          className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[#121215] border border-white/15 text-neutral-400 hover:text-white text-xs font-mono transition"
        >
          <Search className="w-3 h-3 text-neutral-400" />
          <span className="text-[11px]">Jump</span>
          <span className="px-1.5 py-0.2 rounded bg-white/10 text-[10px] text-white font-ndot">
            ⌘K
          </span>
        </motion.button>

        <div className="h-4 w-px bg-white/15" />

        {/* Theme Toggle (Nothing OLED vs Monochrome vs Mocha) with Framer Motion LayoutId */}
        <div className="flex items-center bg-[#121215] p-0.5 rounded-full border border-white/15 relative">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setTheme('monochrome')}
            className={`relative flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-ndot transition-colors duration-150 ${
              theme === 'monochrome' ? 'text-black font-bold' : 'text-neutral-400 hover:text-white'
            }`}
            title="Switch to OLED Nothing OS Monochrome theme"
          >
            {theme === 'monochrome' && (
              <motion.div
                layoutId="headerThemePill"
                className="absolute inset-0 bg-white rounded-full shadow-[0_2px_8px_rgba(255,255,255,0.4)]"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <span className="relative z-10 text-[10px] font-bold">OLED</span>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setTheme('mocha')}
            className={`relative flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-ndot transition-colors duration-150 ${
              theme === 'mocha' ? 'text-[#180f0a] font-bold' : 'text-neutral-400 hover:text-white'
            }`}
            title="Switch to warm Mocha theme"
          >
            {theme === 'mocha' && (
              <motion.div
                layoutId="headerThemePill"
                className="absolute inset-0 bg-[#ec9665] rounded-full shadow-[0_2px_8px_rgba(236,150,101,0.4)]"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <span className="relative z-10 text-[10px] font-bold">MOCHA</span>
          </motion.button>
        </div>

        <div className="h-4 w-px bg-white/15" />

        {/* Persona Switcher with Framer Motion LayoutId */}
        <div className="flex items-center bg-[#121215] p-0.5 rounded-full border border-white/15 relative">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => switchUser(SEEDED_USERS[0])}
            className={`relative flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-sans transition-colors duration-150 ${
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
              <span>Admin</span>
            </span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => switchUser(SEEDED_USERS[1])}
            className={`relative flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-sans transition-colors duration-150 ${
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
              <span>Student / Staff</span>
            </span>
          </motion.button>
        </div>
      </div>
    </header>
  );
};
