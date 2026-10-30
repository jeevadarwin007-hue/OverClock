import React, { useState } from 'react';
import { motion } from 'framer-motion';
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
  Palette,
  Sparkles,
} from 'lucide-react';

export type TabType =
  | 'command-center'
  | 'campus-explorer'
  | 'room-management'
  | 'work-orders'
  | 'inventory-approvals'
  | 'ai-assistant'
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
  const { theme, setTheme } = useTheme();
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [roleSwitchError, setRoleSwitchError] = useState<string | null>(null);
  const [switchingRole, setSwitchingRole] = useState(false);
  const isAdmin = currentUser.role === 'SYS_ADMIN' || currentUser.role === 'FACILITIES_ADMIN';

  const requestPersonaSwitch = async (user: (typeof SEEDED_USERS)[number]) => {
    if (user.role === currentUser.role) return;
    setRoleSwitchError(null);
    setSwitchingRole(true);
    try {
      await switchUser(user, '');
    } catch (error) {
      console.error('Could not switch CampusOps role:', error);
      const message = error instanceof Error ? error.message : 'The server could not verify this role.';
      setRoleSwitchError(
        message.toLowerCase().includes('failed to fetch') || message.toLowerCase().includes('network')
          ? 'CampusOps server is unreachable. Admin mode was not activated.'
          : `Could not switch to ${user.role === 'SYS_ADMIN' ? 'Admin' : 'Students'}: ${message}`
      );
    } finally {
      setSwitchingRole(false);
    }
  };

  const navItems: { id: TabType; label: string; icon: any; adminOnly?: boolean }[] = [
    { id: 'command-center', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'campus-explorer', label: 'Campus Map & DAG', icon: Box },
    { id: 'room-management', label: 'Rooms', icon: DoorOpen },
    { id: 'work-orders', label: 'Work Orders', icon: ClipboardList },
    { id: 'inventory-approvals', label: 'Inventory & Approvals', icon: Layers },
    { id: 'ai-assistant', label: 'AI Assistant', icon: Sparkles },
    { id: 'worker-roster', label: 'Worker Roster', icon: Users, adminOnly: true },
    { id: 'invariants', label: 'System Status', icon: ShieldCheck },
  ];

  return (
    <header className={`h-[56px] px-3 md:px-4 flex items-center gap-3 shrink-0 select-none z-50 ${theme === 'brutalism' ? 'bg-white text-black border-b-[3px] border-[#e9ef49]' : theme === 'swiss' ? 'swiss-header bg-white text-black border-b border-[#B3B3B3]' : 'bg-black/90 backdrop-blur-2xl border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.8)]'}`}>
      <div className="flex items-center gap-2 shrink-0">
        <div className={`h-8 w-8 flex items-center justify-center font-ndot font-bold text-xs relative ${theme === 'brutalism' ? 'bg-white text-black border-2 border-black rounded-none' : theme === 'swiss' ? 'bg-white text-black border border-black rounded-xl' : 'rounded-xl bg-[#141417] border border-white/20 text-white'}`}>
          <span>CO</span>
          <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 ${theme === 'brutalism' ? 'bg-[#e9ef49]' : 'rounded-full bg-nothing-red nothing-red-dot'}`} />
        </div>
        <span className={`hidden sm:block font-ndot55 text-sm tracking-widest uppercase font-bold leading-none ${theme === 'brutalism' || theme === 'swiss' ? 'text-black' : 'text-white'}`}>
          CAMPUS<span className={theme === 'brutalism' ? 'text-[#e9ef49]' : theme === 'swiss' ? 'text-white' : 'text-nothing-red'}>OPS</span>
        </span>
      </div>

      <nav aria-label="Primary navigation" className="flex-1 min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className={`w-max mx-auto flex items-center p-1 space-x-0.5 relative ${theme === 'brutalism' ? 'bg-white border-2 border-[#e9ef49] rounded-none shadow-none' : theme === 'swiss' ? 'bg-[#D4D4D4] border border-[#B3B3B3] rounded-full shadow-sm' : 'bg-[#0d0f17]/95 border border-white/15 backdrop-blur-2xl rounded-full shadow-2xl'}`}>
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
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative cursor-pointer text-xs font-semibold px-3 sm:px-4 py-2 transition-colors flex items-center space-x-1.5 ${theme === 'brutalism' ? 'rounded-none' : 'rounded-full'} ${
                    isActive
                      ? theme === 'brutalism' ? 'text-black font-bold' : theme === 'swiss' ? 'text-white font-bold' : 'text-white font-bold'
                      : isLoading
                      ? theme === 'brutalism' ? 'text-[#e9ef49]' : theme === 'swiss' ? 'text-black' : 'text-white'
                      : 'text-neutral-400 hover:text-white'
                  } ${theme === 'swiss' && isActive ? 'swiss-active-nav' : ''}`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 transition-colors ${
                      isActive ? theme === 'brutalism' ? 'text-black' : theme === 'swiss' ? 'text-white swiss-active-nav-icon' : 'text-nothing-red' : 'text-neutral-400'
                    }`}
                  />
                  <span className="hidden lg:inline font-ndot tracking-wide">
                    {isLoading ? 'Loading…' : item.label}
                  </span>

                  {/* Tubelight Lamp Beam & Halo Glow */}
                  {isActive && (
                    <motion.div
                      layoutId="tubelightLamp"
                      className={`absolute inset-0 w-full -z-10 ${theme === 'brutalism' ? 'bg-[#e9ef49] rounded-none' : theme === 'swiss' ? 'bg-black swiss-nav-pill rounded-full' : 'bg-white/[0.08] rounded-full'}`}
                      initial={false}
                      transition={{
                        type: 'spring',
                        stiffness: 350,
                        damping: 28,
                      }}
                    >
                      <div className={`absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-1 ${theme === 'brutalism' ? 'bg-[#e9ef49]' : theme === 'swiss' ? 'bg-[#2B2B2B] swiss-tan-rule' : 'bg-nothing-red rounded-t-full shadow-[0_0_12px_#d73832]'}`}>
                        {theme === 'oled' && <>
                          <div className="absolute w-12 h-6 bg-nothing-red/35 rounded-full blur-md -top-2 -left-2 pointer-events-none" />
                          <div className="absolute w-8 h-6 bg-nothing-red/45 rounded-full blur-md -top-1 pointer-events-none" />
                          <div className="absolute w-4 h-4 bg-white/50 rounded-full blur-sm top-0 left-2 pointer-events-none" />
                        </>}
                      </div>
                    </motion.div>
                  )}
                </button>
              );
            })}
        </div>
      </nav>

      <div className="flex items-center gap-2 shrink-0">
        <div className="relative">
          <button
            type="button"
            aria-label="Theme options"
            aria-expanded={themeMenuOpen}
            aria-haspopup="dialog"
            onClick={() => setThemeMenuOpen((open) => !open)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs transition-colors ${theme === 'brutalism' ? 'rounded-none border-2 border-[#e9ef49] bg-white text-black hover:bg-[#e9ef49]' : theme === 'swiss' ? 'rounded-full border border-black bg-white text-black hover:bg-[#D4D4D4]' : 'rounded-full border border-white/15 bg-[#121215] text-neutral-300 hover:bg-white/10 hover:text-white'}`}
            title="Theme options"
          >
            <Palette className="h-3.5 w-3.5" />
            <span className="hidden xl:inline">Theme</span>
          </button>
          {themeMenuOpen && (
            <div
              role="dialog"
              aria-label="Theme options"
              className={`absolute right-0 top-full z-[60] mt-2 w-56 p-3 text-xs ${theme === 'brutalism' ? 'rounded-none border-2 border-black bg-white text-black shadow-[5px_5px_0_#e9ef49]' : theme === 'swiss' ? 'rounded-2xl border border-[#B3B3B3] bg-white text-black shadow-lg' : 'rounded-xl border border-white/15 bg-[#0d0f17] text-neutral-400 shadow-2xl'}`}
            >
              <p className={`mb-2 font-semibold uppercase tracking-wider ${theme === 'brutalism' ? 'text-black' : 'text-neutral-500'}`}>Choose theme</p>
              {([
                ['oled', 'OLED', 'Dark glass interface'],
                ['brutalism', 'Brutalism', 'Hard edges · no glass'],
                ['swiss', 'Swiss Minimalism', 'Clear grid · quiet details'],
              ] as const).map(([mode, label, description]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => { setTheme(mode); setThemeMenuOpen(false); }}
                  aria-pressed={theme === mode}
                  className={`mb-1 flex w-full flex-col items-start border px-2.5 py-2 text-left transition-colors ${theme === mode
                    ? mode === 'brutalism' ? 'border-black bg-[#e9ef49] text-black' : mode === 'swiss' ? 'border-black bg-[#D4D4D4] text-black' : 'border-white/20 bg-white/10 text-white'
                    : theme === 'brutalism' || theme === 'swiss' ? 'border-black/25 text-black hover:bg-[#D4D4D4]' : 'border-white/10 text-neutral-400 hover:bg-white/5 hover:text-white'
                  } ${theme === 'brutalism' ? 'rounded-none' : theme === 'swiss' ? 'rounded-xl' : 'rounded-lg'}`}
                >
                  <span className="font-semibold">{label}</span>
                  <span className="mt-0.5 text-[10px] opacity-70">{description}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className={`flex items-center p-0.5 relative ${theme === 'brutalism' ? 'bg-white border-2 border-black rounded-none' : theme === 'swiss' ? 'bg-[#D4D4D4] border border-black rounded-full shadow-sm' : 'bg-[#121215] rounded-full border border-white/15'}`}>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => requestPersonaSwitch(SEEDED_USERS[0])}
            disabled={switchingRole || currentUser.role === 'SYS_ADMIN'}
            aria-pressed={currentUser.role === 'SYS_ADMIN'}
            aria-label="Switch to Admin role"
            className={`relative flex items-center space-x-1 px-2.5 py-1.5 rounded-full text-xs font-sans transition-colors duration-150 ${
              currentUser.role === 'SYS_ADMIN'
                ? theme === 'swiss' ? 'text-white font-bold swiss-selected-role' : 'text-black font-bold'
                : 'text-neutral-400 hover:text-white'
            } ${switchingRole ? 'cursor-wait opacity-60' : ''}`}
            title="Administrator role: approvals, scheduling, and staff dispatch"
          >
            {currentUser.role === 'SYS_ADMIN' && (
              <motion.div
                layoutId="headerRolePill"
                className={`absolute inset-0 ${theme === 'brutalism' ? 'bg-[#e9ef49] rounded-none' : theme === 'swiss' ? 'bg-black swiss-selected-pill rounded-full' : 'bg-white rounded-full shadow-[0_2px_10px_rgba(255,255,255,0.35)]'}`}
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
            onClick={() => requestPersonaSwitch(SEEDED_USERS[1])}
            disabled={switchingRole || currentUser.role === 'STUDENT_FACULTY'}
            aria-pressed={currentUser.role === 'STUDENT_FACULTY'}
            aria-label="Switch to Students role"
            className={`relative flex items-center space-x-1 px-2.5 py-1.5 rounded-full text-xs font-sans transition-colors duration-150 ${
              currentUser.role === 'STUDENT_FACULTY'
                ? theme === 'swiss' ? 'text-white font-bold swiss-selected-role' : 'text-black font-bold'
                : 'text-neutral-400 hover:text-white'
            } ${switchingRole ? 'cursor-wait opacity-60' : ''}`}
            title="Student / Staff role: report facility incidents and track status"
          >
            {currentUser.role === 'STUDENT_FACULTY' && (
              <motion.div
                layoutId="headerRolePill"
                className={`absolute inset-0 ${theme === 'brutalism' ? 'bg-[#e9ef49] rounded-none' : theme === 'swiss' ? 'bg-black swiss-selected-pill rounded-full' : 'bg-white rounded-full shadow-[0_2px_10px_rgba(255,255,255,0.35)]'}`}
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center space-x-1">
              <GraduationCap className="w-3 h-3" />
              <span className="hidden 2xl:inline">Students</span>
            </span>
          </motion.button>
        </div>
        {roleSwitchError && (
          <div
            role="alert"
            className={`fixed right-3 top-16 z-[70] max-w-[min(24rem,calc(100vw-1.5rem))] border px-3 py-2 text-xs shadow-xl ${theme === 'brutalism' ? 'border-black bg-[#e9ef49] text-black' : 'rounded-lg border-red-500/30 bg-[#161113] text-red-200'}`}
          >
            <span>{roleSwitchError}</span>
            <button
              type="button"
              className="ml-3 font-semibold underline underline-offset-2"
              onClick={() => setRoleSwitchError(null)}
              aria-label="Dismiss role switch error"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

    </header>
  );
};
