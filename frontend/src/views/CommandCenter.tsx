import React, { useState, useEffect, useRef } from 'react';
import type { CSSProperties, MouseEvent, ReactNode, TouchEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Activity,
  AlertTriangle,
  Clock,
  Wrench,
  CheckCircle,
  Send,
  Zap,
  Sparkles,
  RefreshCw,
  TrendingUp,
  Cpu,
  Layers,
  Flame,
  Droplets,
  Wind,
  Shield,
  Radio,
  Server,
  Sliders,
  User,
  Mail,
  Check,
  FileText,
} from 'lucide-react';

/* ==========================================================================
   Types & Accents
   ========================================================================== */

type Accent = 'indigo' | 'cyan' | 'emerald' | 'fuchsia' | 'amber' | 'red' | 'white';
type LineType = 'cmd' | 'ok' | 'info' | 'url';

const ACCENTS: Record<Accent, string> = {
  indigo: '129, 140, 248',
  cyan: '34, 211, 238',
  emerald: '52, 211, 153',
  fuchsia: '232, 121, 249',
  amber: '251, 191, 36',
  red: '215, 56, 50',
  white: '255, 255, 255',
};

const GRID_IMAGE =
  'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)';

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

function useAnimatedNumber(target: number, duration = 600): number {
  const [value, setValue] = useState(target);
  const current = useRef(target);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      current.current = target;
      setValue(target);
      return;
    }

    const from = current.current;
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      current.current = from + (target - from) * eased;
      setValue(current.current);
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

/* ==========================================================================
   Framer Motion Spring Variants & GlowCard
   ========================================================================== */

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
};

const cardItemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 350, damping: 26 },
  },
};

function GlowCard({
  accent,
  className = '',
  children,
}: {
  accent: Accent;
  className?: string;
  children: ReactNode;
}) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const rgb = ACCENTS[accent] || '215, 56, 50';

  const moveTo = (clientX: number, clientY: number, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    setPos({ x: clientX - rect.left, y: clientY - rect.top });
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => moveTo(e.clientX, e.clientY, e.currentTarget);

  const handleTouch = (e: TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    if (touch) {
      moveTo(touch.clientX, touch.clientY, e.currentTarget);
      setActive(true);
    }
  };

  const gridMask = `radial-gradient(220px circle at ${pos.x}px ${pos.y}px, black, transparent 75%)`;

  return (
    <motion.div
      variants={cardItemVariants}
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onTouchStart={handleTouch}
      onTouchMove={handleTouch}
      onTouchEnd={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setActive(false);
      }}
      className={cx('relative rounded-3xl overflow-hidden', className)}
    >
      {/* Edge layer 1: dim border */}
      <div aria-hidden="true" className="absolute inset-0 rounded-3xl bg-white/10" />

      {/* Edge layer 2: bright border that follows the cursor */}
      <div
        aria-hidden="true"
        className={cx(
          'absolute inset-0 rounded-3xl transition-opacity duration-500',
          active ? 'opacity-100' : 'opacity-0'
        )}
        style={{
          background: `radial-gradient(240px circle at ${pos.x}px ${pos.y}px, rgba(${rgb}, 0.95), transparent 70%)`,
        }}
      />

      {/* Card face: spotlight and grid live inside it */}
      <div aria-hidden="true" className="absolute inset-px overflow-hidden rounded-[23px] bg-[#0b0d15]">
        <div
          className={cx(
            'absolute inset-0 transition-opacity duration-500',
            active ? 'opacity-100' : 'opacity-0'
          )}
          style={{
            background: `radial-gradient(380px circle at ${pos.x}px ${pos.y}px, rgba(${rgb}, 0.14), transparent 65%)`,
          }}
        />
        <div
          className={cx(
            'absolute inset-0 transition-opacity duration-500',
            active ? 'opacity-100' : 'opacity-0'
          )}
          style={{
            backgroundImage: GRID_IMAGE,
            backgroundSize: '26px 26px',
            maskImage: gridMask,
            WebkitMaskImage: gridMask,
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col p-5 sm:p-6">{children}</div>
    </motion.div>
  );
}

function CardTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h3 className="text-xs font-ndot uppercase tracking-widest text-neutral-300">{children}</h3>
      {right}
    </div>
  );
}

function LiveBadge({ label = 'LIVE' }: { label?: string }) {
  return (
    <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-ndot text-emerald-400 font-bold">
      <span className="tb-pulse w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
      <span>{label}</span>
    </span>
  );
}

/* ==========================================================================
   Reports Across Days (Reports * Days) Types & Helpers
   ========================================================================== */

interface DailyReportPoint {
  date: string;
  day_name: string;
  formatted_date: string;
  total_reports: number;
  critical_count: number;
  high_count: number;
  normal_count: number;
  resolved_count: number;
}

function computeDailyTrendFromOrders(orders: any[], daysCount = 7): DailyReportPoint[] {
  const result: DailyReportPoint[] = [];
  const now = new Date();

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' });
    const formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const dayOrders = orders.filter((o) => {
      if (!o.created_at) return false;
      const orderDate = new Date(o.created_at).toISOString().split('T')[0];
      return orderDate === dateStr;
    });

    result.push({
      date: dateStr,
      day_name: dayName,
      formatted_date: formattedDate,
      total_reports: dayOrders.length,
      critical_count: dayOrders.filter((o) => o.calculated_priority === 'P0_CRITICAL').length,
      high_count: dayOrders.filter((o) => o.calculated_priority === 'P1_HIGH').length,
      normal_count: dayOrders.filter(
        (o) => o.calculated_priority !== 'P0_CRITICAL' && o.calculated_priority !== 'P1_HIGH'
      ).length,
      resolved_count: dayOrders.filter((o) => o.state === 'RESOLVED' || o.state === 'CLOSED').length,
    });
  }
  return result;
}

const TICK_INTERVAL = 1400;

function toSmoothPath(points: Array<{ x: number; y: number }>): string {
  return points.reduce((d, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    const mid = (prev.x + p.x) / 2;
    return `${d} C ${mid} ${prev.y}, ${mid} ${p.y}, ${p.x} ${p.y}`;
  }, '');
}

/* ==========================================================================
   Relative Time Formatting Helper
   ========================================================================== */

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return 'Recent';
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Recent';
  }
}

/* ==========================================================================
   Campus Maintenance Trades Stack
   ========================================================================== */

interface TradeItem {
  id: string;
  name: string;
  code: string;
  desc: string;
  staff: number;
  rgb: string;
  icon: React.ElementType;
}

interface TradeWorkerItem {
  id?: string;
  name: string;
  email?: string;
  is_available: boolean;
  active_workload: number;
  max_workload?: number;
  building: string;
  status?: string;
}

interface TradeAvailabilityData {
  trade_code: string;
  total_staff: number;
  available_staff: number;
  busy_staff: number;
  workers: TradeWorkerItem[];
}

const TRADES_STACK: TradeItem[] = [
  {
    id: 'electrical',
    name: 'Electrical Grid',
    code: 'ELECTRICAL',
    desc: 'Distribution panels, MCB breakers, sub-stations, and PoE power feeds across all blocks.',
    staff: 5,
    rgb: '215, 56, 50',
    icon: Zap,
  },
  {
    id: 'hvac',
    name: 'HVAC & Climate',
    code: 'HVAC',
    desc: 'TRP Auditorium central AHU, chiller compressors, precision split units and ventilation.',
    staff: 3,
    rgb: '56, 189, 248',
    icon: Wind,
  },
  {
    id: 'network',
    name: 'PoE & Core Network',
    code: 'NETWORK',
    desc: 'PoE switches (SW-CORE-ACAD-F3), 10Gbps optical backbone, and Wi-Fi access points.',
    staff: 4,
    rgb: '52, 211, 153',
    icon: Radio,
  },
  {
    id: 'plumbing',
    name: 'Hydro-Pneumatics',
    code: 'PLUMBING',
    desc: 'Central water hydro-pneumatic pump, washroom distribution lines and drainage valves.',
    staff: 3,
    rgb: '129, 140, 248',
    icon: Droplets,
  },
  {
    id: 'av',
    name: 'Smart AV Systems',
    code: 'AV_EQUIPMENT',
    desc: 'Smart classroom projectors, ceiling audio line-arrays, and auditorium stage lighting.',
    staff: 2,
    rgb: '232, 121, 249',
    icon: Cpu,
  },
  {
    id: 'safety',
    name: 'Structural Safety',
    code: 'STRUCTURAL_SAFETY',
    desc: 'Fire suppression, emergency exits, safety net cages, and building structural integrity.',
    staff: 2,
    rgb: '251, 191, 36',
    icon: Shield,
  },
];

/* ==========================================================================
   Main CommandCenter Component
   ========================================================================== */

export const CommandCenter: React.FC = () => {
  const { currentUser } = useAuth();
  const [pulse, setPulse] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [activeTickets, setActiveTickets] = useState<any[]>([]);
  const [intakeText, setIntakeText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [intakeResult, setIntakeResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Reports across days telemetry state
  const [dailyReports, setDailyReports] = useState<DailyReportPoint[]>(() => computeDailyTrendFromOrders([]));
  const [hoverDayIdx, setHoverDayIdx] = useState<number | null>(null);

  // Solved across days telemetry state
  const [hoverSolvedDayIdx, setHoverSolvedDayIdx] = useState<number | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Selected trade state
  const [activeTradeId, setActiveTradeId] = useState<string | null>(null);
  const [tradesData, setTradesData] = useState<Record<string, TradeAvailabilityData>>({});
  const [campusBlocks, setCampusBlocks] = useState<any[]>([]);
  const [invariantData, setInvariantData] = useState<any>(null);

  // Operational connectivity states: Database, Network, Groq, Uptime
  const [connHealth, setConnHealth] = useState({
    database: true,
    network: typeof navigator !== 'undefined' ? navigator.onLine : true,
    groq: true,
    uptime: true,
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pulseData, summaryData, ticketsData, dailyData, tradesAvail, healthData, mapStatus, invariants] = await Promise.all([
        api.get<any>('/pulse').catch(() => null),
        api.get<any>('/analytics/summary').catch(() => null),
        api.get<any[]>('/work-orders').catch(() => null),
        api.get<any>('/analytics/daily-reports?days=7').catch(() => null),
        api.get<any[]>('/staff/trades-availability').catch(() => null),
        api.get<any>('/health').catch(() => null),
        api.get<any>('/campus/map-status').catch(() => null),
        api.get<any>('/invariants').catch(() => null),
      ]);

      if (pulseData) setPulse(pulseData);
      if (summaryData) setSummary(summaryData);
      if (Array.isArray(mapStatus?.blocks)) setCampusBlocks(mapStatus.blocks);
      if (invariants) setInvariantData(invariants);
      const orders = Array.isArray(ticketsData) ? ticketsData : (ticketsData as any)?.items || [];
      if (ticketsData) setActiveTickets(orders);

      if (Array.isArray(tradesAvail)) {
        const tMap: Record<string, TradeAvailabilityData> = {};
        tradesAvail.forEach((item) => {
          tMap[item.trade_code] = item;
        });
        setTradesData(tMap);
      }

      if (dailyData?.daily_trend && Array.isArray(dailyData.daily_trend) && dailyData.daily_trend.length > 0) {
        setDailyReports(dailyData.daily_trend);
      } else if (orders.length > 0) {
        setDailyReports(computeDailyTrendFromOrders(orders));
      }

      // Live connectivity calculations: Green when connected, Red when disconnected
      const isOnline = typeof window !== 'undefined' ? window.navigator.onLine : true;
      const apiReachable = Boolean(healthData || pulseData || summaryData || ticketsData);

      const dbConnected = Boolean(
        isOnline &&
        (healthData?.connections?.database?.connected ?? (Boolean(ticketsData) || Boolean(pulseData)))
      );

      const netConnected = Boolean(isOnline && apiReachable);

      const groqConnected = Boolean(
        isOnline &&
        (healthData?.connections?.groq?.connected ?? true)
      );

      const uptimeConnected = Boolean(
        isOnline &&
        (healthData?.connections?.uptime?.connected ?? apiReachable)
      );

      setConnHealth({
        database: dbConnected,
        network: netConnected,
        groq: groqConnected,
        uptime: uptimeConnected,
      });
    } catch (err) {
      console.error('Error fetching command center data:', err);
      const isOnline = typeof window !== 'undefined' ? window.navigator.onLine : false;
      setConnHealth({
        database: false,
        network: isOnline,
        groq: false,
        uptime: false,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);

    const handleOnline = () => {
      setConnHealth((prev) => ({ ...prev, network: true }));
      fetchData();
    };
    const handleOffline = () => {
      setConnHealth({
        database: false,
        network: false,
        groq: false,
        uptime: false,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [currentUser]);

  // Reports across days calculation
  const totalReportsInRange = dailyReports.reduce((acc, d) => acc + d.total_reports, 0);
  const todayReports = dailyReports[dailyReports.length - 1]?.total_reports || 0;
  const peakDailyReports = Math.max(...dailyReports.map((d) => d.total_reports), 0);
  const peakDay = dailyReports.find((d) => d.total_reports === peakDailyReports);
  const avgDailyReports = (totalReportsInRange / Math.max(dailyReports.length, 1)).toFixed(1);
  const animatedTodayReports = useAnimatedNumber(todayReports, 400);

  // Problems solved across days calculation
  const totalSolvedInRange = dailyReports.reduce((acc, d) => acc + (d.resolved_count || 0), 0);
  const totalResolvedTickets = activeTickets.filter(
    (t) => t.state === 'RESOLVED' || t.state === 'CLOSED'
  ).length;
  const displayTotalSolved = Math.max(totalSolvedInRange, totalResolvedTickets);
  const animatedTotalSolved = useAnimatedNumber(displayTotalSolved, 400);

  const campusBlockCount = campusBlocks.length;
  const synchronizedBlockCount = campusBlocks.filter((block) => block.status_label === 'OPERATIONAL').length;
  const campusStatusPercent = campusBlockCount > 0
    ? Math.round((synchronizedBlockCount / campusBlockCount) * 100)
    : 0;

  const activeRequestCount = Number(summary?.open_requests_count ?? pulse?.metrics?.open_requests ?? 0);
  const problemsToSolvePercent = activeTickets.length > 0
    ? Math.min(100, Math.round((activeRequestCount / activeTickets.length) * 100))
    : 0;

  const invariantValues: number[] = Object.values(invariantData?.invariants ?? {})
    .map((value) => Number(value));
  const invariantCount = invariantValues.length;
  const verifiedInvariantCount = invariantValues.filter((value) => value === 0).length;
  const invariantPercent = invariantCount > 0
    ? Math.round((verifiedInvariantCount / invariantCount) * 100)
    : 0;

  const rosterWorkerMap = new Map(
    Object.values(tradesData)
      .flatMap((trade) => trade.workers)
      .filter((worker) => Boolean(worker.id))
      .map((worker) => [worker.id as string, worker] as const)
  );
  const rosterTotal = rosterWorkerMap.size;
  const workingWorkerCount = Array.from(rosterWorkerMap.values())
    .filter((worker) => worker.active_workload > 0).length;
  const rosterPercent = rosterTotal > 0
    ? Math.min(100, Math.round((workingWorkerCount / rosterTotal) * 100))
    : 0;

  const todaySolved = dailyReports[dailyReports.length - 1]?.resolved_count || 0;
  const peakDailySolved = Math.max(...dailyReports.map((d) => d.resolved_count || 0), 0);
  const maxSolvedScale = Math.max(peakDailySolved, 1);

  const maxScale = Math.max(peakDailyReports, 4);
  const points = dailyReports.map((d, i) => ({
    x: dailyReports.length > 1 ? (i / (dailyReports.length - 1)) * 100 : 50,
    y: 92 - (d.total_reports / maxScale) * 75,
  }));
  const linePath = toSmoothPath(points);
  const areaPath = `${linePath} L 100 100 L 0 100 Z`;
  const shownIdx = hoverDayIdx !== null ? hoverDayIdx : dailyReports.length - 1;
  const activeDay = dailyReports[shownIdx];
  const activePoint = points[shownIdx] || { x: 50, y: 50 };

  const handleChartMove = (e: MouseEvent<HTMLDivElement>) => {
    if (dailyReports.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    const idx = Math.min(Math.round(ratio * (dailyReports.length - 1)), dailyReports.length - 1);
    setHoverDayIdx(idx);
  };

  const isAdmin =
    currentUser?.role === 'SYS_ADMIN' ||
    currentUser?.role === 'FACILITIES_ADMIN' ||
    currentUser?.role === 'CAMPUS_DEAN';

  const handleApproveTicket = async (ticketId: string) => {
    try {
      setActionLoadingId(ticketId);
      await api.post(`/work-orders/${ticketId}/approve`, {}).catch(async () => {
        return await api.post(`/work-orders/${ticketId}/transition`, {
          target_state: 'ASSIGNED',
          reason: 'Admin approved work order for execution',
        });
      });
      await fetchData();
    } catch (err: any) {
      alert(`Failed to approve work order: ${err.message || 'Error'}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResolveTicket = async (ticketId: string) => {
    try {
      setActionLoadingId(ticketId);
      await api.post(`/work-orders/${ticketId}/resolve`, {
        resolution_notes: 'Problem inspected and confirmed resolved by Admin.',
      }).catch(async () => {
        return await api.post(`/work-orders/${ticketId}/transition`, {
          target_state: 'RESOLVED',
          reason: 'Admin marked work order as resolved',
          resolution_notes: 'Problem inspected and confirmed resolved by Admin.',
        });
      });
      await fetchData();
    } catch (err: any) {
      alert(`Failed to resolve work order: ${err.message || 'Error'}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const activeTrade = TRADES_STACK.find((t) => t.id === activeTradeId);

  const handleIntakeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intakeText.trim()) return;
    try {
      setIsSubmitting(true);
      const res: any = await api.post('/intake', {
        text: intakeText,
        channel: 'PORTAL_FORM',
      });
      setIntakeResult(res);
      setIntakeText('');
      if (res.is_ticket_created) {
        fetchData();
      }
    } catch (err: any) {
      alert(`Intake failed: ${err.message || 'Error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-transparent text-white overflow-y-auto p-4 space-y-4">
      {/* Top Identity & Status Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center space-x-3">
          <span className="w-2.5 h-2.5 rounded-full bg-nothing-red nothing-glyph-red animate-pulse" />
          <div>
            <h1 className="text-sm font-bold font-ndot tracking-wider text-white uppercase">
              SRM Easwari Engineering College &bull; Autonomous Command Center
            </h1>
            <p className="text-[11px] font-sans text-neutral-400">
              Live multi-agent incident triage, campus grid telemetry, and automated worker dispatch.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <LiveBadge label="OPERATIONAL" />
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ rotate: 180, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={fetchData}
            className="p-1.5 rounded-full border border-white/15 bg-black/60 hover:bg-white/10 text-neutral-300 hover:text-white transition"
            title="Refresh Command Center"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </motion.button>
        </div>
      </div>

      {/* Top 4 Modular Squircle KPI GlowCards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0"
      >
        <GlowCard accent="red" className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-ndot text-neutral-400 uppercase tracking-widest">
              Campus Status
            </span>
            <LiveBadge label={campusStatusPercent === 100 ? 'NOMINAL' : 'ATTENTION'} />
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-ndot55 tracking-wide text-white">
              {campusStatusPercent === 100 ? 'NOMINAL' : 'ATTENTION'}
            </div>
            <div className="text-[11px] font-sans text-neutral-400 mt-0.5">
              {synchronizedBlockCount}/{campusBlockCount || 5} Campus Blocks Synchronized
            </div>
          </div>
          <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-400 rounded-full transition-[width] duration-500" style={{ width: `${campusStatusPercent}%` }} />
          </div>
        </GlowCard>

        <GlowCard accent="amber" className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-ndot text-neutral-400 uppercase tracking-widest">
              Problems to Solve
            </span>
            <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-nothing-red/20 border border-nothing-red/40 text-[10px] font-ndot text-nothing-red font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-nothing-red nothing-red-dot" />
              <span>P0 / P1</span>
            </span>
          </div>
          <div className="my-2">
            <div className="text-3xl font-bold font-ndot text-white flex items-baseline space-x-2">
              <span>{activeRequestCount}</span>
              <span className="text-xs text-neutral-400 font-sans font-normal">open</span>
            </div>
            <div className="text-[11px] font-sans text-neutral-400 mt-0.5">
              Open work orders awaiting resolution
            </div>
          </div>
          <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-nothing-red rounded-full transition-[width] duration-500" style={{ width: `${problemsToSolvePercent}%` }} />
          </div>
        </GlowCard>

        <GlowCard accent="emerald" className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-ndot text-neutral-400 uppercase tracking-widest">
              Invariant Proofs
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-ndot text-emerald-400">
              {invariantPercent}%
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-ndot text-white flex items-center space-x-2">
              <span className="text-emerald-400">{verifiedInvariantCount}/{invariantCount}</span>
              <span className="text-xs text-neutral-400 font-sans">verified</span>
            </div>
            <div className="text-[11px] font-sans text-neutral-400 mt-0.5">
              Zero budget / FSM violations
            </div>
          </div>
          <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-400 rounded-full transition-[width] duration-500" style={{ width: `${invariantPercent}%` }} />
          </div>
        </GlowCard>

        <GlowCard accent="cyan" className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-ndot text-neutral-400 uppercase tracking-widest">
              Workers Working
            </span>
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-ndot text-cyan-300">
              LIVE
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-ndot text-white flex items-baseline space-x-2">
              <span>{workingWorkerCount}</span>
              <span className="text-xs text-neutral-400 font-sans">working</span>
            </div>
            <div className="text-[11px] font-sans text-neutral-400 mt-0.5">
              Currently assigned to active work orders
            </div>
          </div>
          <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-cyan-400 rounded-full transition-[width] duration-500" style={{ width: `${rosterPercent}%` }} />
          </div>
        </GlowCard>
      </motion.div>

      {/* Interactive Bento Grid Layout (Bento Cards with Hover Effects) */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 auto-rows-[220px]"
      >
        {/* Bento Card 1: Reports Across Days (report * days) (Span 2 Cols x 2 Rows) */}
        <GlowCard accent="red" className="md:col-span-2 lg:row-span-2 min-h-[420px] flex flex-col justify-between">
          <CardTitle
            right={
              <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-nothing-red/10 border border-nothing-red/30 text-[10px] font-ndot text-nothing-red font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-nothing-red nothing-red-dot" />
                <span>REPORTS &bull; 7 DAYS</span>
              </span>
            }
          >
            Incident Reports Across Days
          </CardTitle>

          {/* Headline Metrics */}
          <div className="mb-2 flex flex-wrap items-end justify-between gap-y-2">
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold font-ndot text-white [font-variant-numeric:tabular-nums]">
                {Math.round(animatedTodayReports)}
              </span>
              <span className="mb-1 text-xs text-neutral-400 font-mono">reports today</span>
            </div>
            {hoverDayIdx !== null && activeDay ? (
              <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                <span className="text-white font-ndot font-bold">
                  {activeDay.day_name} &bull; {activeDay.formatted_date}:
                </span>
                <span className="text-nothing-red font-semibold">
                  {activeDay.critical_count} critical
                </span>
                <span className="text-neutral-300">
                  {activeDay.normal_count} normal
                </span>
                <span className="text-emerald-400">
                  {activeDay.resolved_count} resolved
                </span>
              </div>
            ) : (
              <div className="flex gap-4 text-xs font-mono text-neutral-400">
                <span>
                  avg <b className="font-semibold text-white">{avgDailyReports}/day</b>
                </span>
                <span>
                  peak <b className="font-semibold text-nothing-red">{peakDailyReports} on {peakDay?.day_name || 'peak'}</b>
                </span>
                <span>
                  total <b className="font-semibold text-white">{totalReportsInRange} this week</b>
                </span>
              </div>
            )}
          </div>

          {/* Interactive SVG Reports Across Days Curve with Hover Inspector */}
          <div
            className="relative min-h-[140px] flex-1 cursor-crosshair rounded-xl overflow-visible my-1"
            onMouseMove={handleChartMove}
            onMouseLeave={() => setHoverDayIdx(null)}
          >
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full overflow-visible"
              role="img"
              aria-label="Incident reports across days graph"
            >
              <defs>
                <linearGradient id="reports-days-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#d73832" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#d73832" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Reference Grid Lines */}
              {[20, 45, 70, 95].map((y) => (
                <line
                  key={y}
                  x1="0"
                  x2="100"
                  y1={y}
                  y2={y}
                  stroke="rgba(255,255,255,0.06)"
                  strokeDasharray="3 4"
                  vectorEffect="non-scaling-stroke"
                />
              ))}

              {/* Area & Stroke Paths */}
              <path d={areaPath} fill="url(#reports-days-fill)" />
              <path
                d={linePath}
                fill="none"
                stroke="#ff4a42"
                strokeWidth="2.4"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                style={{ filter: 'drop-shadow(0 0 8px rgba(215,56,50,0.8))' }}
              />

              {/* Data points along curve */}
              {points.map((pt, i) => (
                <circle
                  key={i}
                  cx={pt.x}
                  cy={pt.y}
                  r="2"
                  fill="#ffffff"
                  stroke="#d73832"
                  strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke"
                />
              ))}

              {/* Vertical Crosshair Line */}
              {hoverDayIdx !== null && activePoint && (
                <line
                  x1={activePoint.x}
                  x2={activePoint.x}
                  y1="0"
                  y2="100"
                  stroke="rgba(255,255,255,0.4)"
                  strokeDasharray="3 3"
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </svg>

            {/* Glowing Inspector Dot */}
            {activePoint && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-nothing-red shadow-[0_0_14px_#d73832] transition-all duration-150"
                style={{
                  left: `${activePoint.x}%`,
                  top: `${activePoint.y}%`,
                }}
              />
            )}

            {/* Floating Tooltip - Positioned safely above or below point without overlapping */}
            <AnimatePresence>
              {hoverDayIdx !== null && activeDay && activePoint && (() => {
                const isPointHigh = activePoint.y < 42;
                return (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    aria-hidden="true"
                    className="pointer-events-none absolute whitespace-nowrap rounded-xl border border-white/20 bg-black/95 px-3 py-1.5 text-xs font-mono shadow-[0_8px_32px_rgba(0,0,0,0.95)] backdrop-blur-xl z-30"
                    style={{
                      left: `clamp(80px, ${activePoint.x}%, calc(100% - 80px))`,
                      transform: 'translateX(-50%)',
                      ...(isPointHigh
                        ? { top: `calc(${activePoint.y}% + 14px)` }
                        : { bottom: `calc(${100 - activePoint.y}% + 14px)` }),
                    }}
                  >
                    <div className="flex items-center space-x-1.5 text-neutral-400 text-[10px] uppercase font-ndot tracking-wider">
                      <span className="text-white font-bold">{activeDay.day_name}</span>
                      <span>&bull;</span>
                      <span>{activeDay.formatted_date}</span>
                    </div>
                    <div className="text-xs font-bold font-ndot text-white mt-0.5 flex items-center justify-between gap-3">
                      <span>
                        {activeDay.total_reports} {activeDay.total_reports === 1 ? 'Report' : 'Reports'}
                      </span>
                      {activeDay.critical_count > 0 && (
                        <span className="text-[9px] font-mono text-nothing-red font-semibold bg-nothing-red/10 px-1.5 py-0.2 rounded border border-nothing-red/30">
                          {activeDay.critical_count} Crit
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })()}
            </AnimatePresence>
          </div>

          <div className="mt-1 flex justify-between text-[10px] font-mono text-neutral-500">
            <span>7 days ago ({dailyReports[0]?.formatted_date || 'Start'})</span>
            <span>Today ({dailyReports[dailyReports.length - 1]?.formatted_date || 'Live'})</span>
          </div>

          {/* Daily Reports Breakdown Strip (Days * Reports) */}
          <div className="mt-3 grid grid-cols-7 gap-1.5 border-t border-white/10 pt-2.5">
            {dailyReports.map((d, i) => {
              const isSelected = (hoverDayIdx !== null ? hoverDayIdx : dailyReports.length - 1) === i;
              const isToday = i === dailyReports.length - 1;
              return (
                <motion.button
                  key={d.date}
                  type="button"
                  onMouseEnter={() => setHoverDayIdx(i)}
                  onMouseLeave={() => setHoverDayIdx(null)}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 450, damping: 28 }}
                  className={cx(
                    'flex flex-col items-center justify-between p-2 rounded-xl border text-center transition-colors',
                    isSelected
                      ? 'bg-nothing-red/15 border-nothing-red/60 text-white shadow-[0_0_12px_rgba(215,56,50,0.3)]'
                      : isToday
                      ? 'bg-white/5 border-white/20 text-white'
                      : 'bg-black/40 border-white/5 text-neutral-400 hover:text-white hover:bg-white/[0.04]'
                  )}
                >
                  <span className="text-[10px] font-ndot uppercase tracking-wider">
                    {d.day_name}
                  </span>
                  <span className="text-base font-bold font-ndot my-0.5 [font-variant-numeric:tabular-nums]">
                    {d.total_reports}
                  </span>
                  <span className="text-[9px] font-mono text-neutral-500">
                    {d.critical_count > 0 ? (
                      <span className="text-nothing-red font-bold">{d.critical_count} crit</span>
                    ) : (
                      'ok'
                    )}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </GlowCard>

        {/* Bento Card 2: Recent Activity (Real Incident Reports) (Span 1 Col x 2 Rows) */}
        <GlowCard accent="red" className="lg:row-span-2 min-h-[420px] flex flex-col justify-between">
          <CardTitle
            right={
              <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-ndot text-neutral-300">
                <span className="w-1.5 h-1.5 rounded-full bg-nothing-red nothing-red-dot" />
                <span>{activeTickets.length} REPORTS</span>
              </span>
            }
          >
            Recent Activity
          </CardTitle>

          {/* Scrollable Feed of Real Recent Reports */}
          <div
            className="flex-1 overflow-y-auto space-y-2 pr-1 my-1 max-h-[330px] custom-scrollbar"
            role="feed"
            aria-label="Recent Incident Reports Feed"
          >
            <AnimatePresence initial={false}>
              {activeTickets.slice(0, 10).map((t, idx) => {
                const isCritical = t.calculated_priority === 'P0_CRITICAL';
                const isHigh = t.calculated_priority === 'P1_HIGH';
                return (
                  <motion.div
                    key={t.id || t.ticket_number || idx}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    whileHover={{ x: 3, backgroundColor: 'rgba(255,255,255,0.06)' }}
                    transition={{ type: 'spring', stiffness: 450, damping: 28 }}
                    className="p-3 rounded-2xl border border-white/10 bg-black/60 space-y-1.5 transition-colors cursor-pointer group"
                  >
                    {/* Header: Ticket #, Priority, and Relative Time */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="font-ndot font-bold text-white group-hover:text-nothing-red transition-colors">
                          #{t.ticket_number}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded-full font-ndot border ${
                            isCritical
                              ? 'bg-nothing-red/20 text-nothing-red border-nothing-red/50 font-bold'
                              : isHigh
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-white/10 text-neutral-300 border-white/20'
                          }`}
                        >
                          {t.calculated_priority || 'P2'}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-neutral-500">
                        {formatRelativeTime(t.created_at)}
                      </span>
                    </div>

                    {/* Summary / Description */}
                    <div className="text-[11px] font-sans text-neutral-200 line-clamp-2 leading-snug">
                      {t.ai_summary || t.raw_description || 'Incident report received'}
                    </div>

                    {/* Meta: Location, State & Worker */}
                    <div className="flex items-center justify-between text-[10px] pt-1 border-t border-white/5 font-mono">
                      <span className="text-neutral-400 truncate max-w-[130px] flex items-center space-x-1">
                        <span className="w-1 h-1 rounded-full bg-neutral-500" />
                        <span>{t.room_code || t.node_code || 'General'}</span>
                        {t.floor_number !== undefined && t.floor_number !== null && (
                          <span className="text-neutral-500 ml-1">Fl{t.floor_number}</span>
                        )}
                      </span>
                      <span
                        className={`font-semibold ${
                          t.state === 'RESOLVED' || t.state === 'CLOSED'
                            ? 'text-emerald-400'
                            : t.state === 'ASSIGNED' || t.state === 'IN_PROGRESS'
                            ? 'text-cyan-300'
                            : t.state === 'AWAITING_CLARIFICATION'
                            ? 'text-amber-400'
                            : 'text-neutral-400'
                        }`}
                      >
                        {t.state}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {activeTickets.length === 0 && (
              <div className="h-full min-h-[220px] flex flex-col items-center justify-center p-6 text-center text-neutral-500 space-y-2 border border-white/5 rounded-2xl bg-black/40">
                <FileText className="w-6 h-6 text-neutral-600" />
                <div className="text-xs font-mono">No recent reports logged</div>
                <div className="text-[10px] font-sans text-neutral-600">
                  New incident reports submitted via the terminal will appear here in real-time.
                </div>
              </div>
            )}
          </div>

          {/* Footer Status Strip */}
          <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-neutral-500 px-1 border-t border-white/10 pt-2">
            <span className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
              <span className="text-neutral-400">PostgreSQL 16 Feed</span>
            </span>
            <span className="text-neutral-400">Live Sync</span>
          </div>
        </GlowCard>

        {/* Bento Card 3: Autonomous Health & Connection Status Rings */}
        {(() => {
          const allConnected =
            connHealth.database && connHealth.network && connHealth.groq && connHealth.uptime;

          const connectionItems = [
            {
              id: 'database',
              label: 'DATABASE',
              sub: 'PostgreSQL 16',
              connected: connHealth.database,
            },
            {
              id: 'network',
              label: 'NETWORK',
              sub: 'Campus Core API',
              connected: connHealth.network,
            },
            {
              id: 'groq',
              label: 'GROQ',
              sub: 'LLaMA-3.3-70b',
              connected: connHealth.groq,
            },
            {
              id: 'uptime',
              label: 'UPTIME',
              sub: 'System Invariants',
              connected: connHealth.uptime,
            },
          ];

          return (
            <GlowCard accent={allConnected ? 'emerald' : 'red'} className="min-h-[200px] flex flex-col justify-between">
              <CardTitle>
                Operational Health
              </CardTitle>

              <div className="flex flex-1 items-center justify-around gap-1 my-1">
                {connectionItems.map((item) => {
                  const radius = 18;
                  const circumference = 2 * Math.PI * radius;
                  const isConn = item.connected;
                  const ringColor = isConn ? '#2fbf91' : '#c84343';

                  return (
                    <div
                      key={item.id}
                      className="group flex flex-col items-center gap-1.5 cursor-pointer select-none transition-transform duration-200 hover:scale-105"
                      title={`${item.label} (${item.sub}): ${isConn ? 'Connected / Healthy' : 'Disconnected / Offline'}`}
                    >
                      {/* Service name sits inside a restrained connection ring. */}
                      <div className="relative h-14 w-14 rounded-full bg-[#0b0d15]">
                        <svg viewBox="0 0 46 46" className="h-full w-full -rotate-90" aria-hidden="true">
                          <circle
                            cx="23"
                            cy="23"
                            r={radius}
                            fill="#0b0d15"
                            stroke="rgba(255,255,255,0.10)"
                            strokeWidth="2.5"
                          />
                          <circle
                            cx="23"
                            cy="23"
                            r={radius}
                            fill="none"
                            stroke={ringColor}
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={0}
                            className="transition-colors duration-300"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center px-1 text-center text-[8px] leading-tight font-bold font-ndot text-neutral-200">
                          {item.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer Status Strip */}
              <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-neutral-500 px-1 border-t border-white/10 pt-2">
                <span className="flex items-center space-x-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      allConnected ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-[#d73832] shadow-[0_0_8px_#d73832]'
                    }`}
                  />
                  <span className="text-neutral-400">
                    {connHealth.database ? 'PostgreSQL Active' : 'PostgreSQL Down'} &bull;{' '}
                    {connHealth.groq ? 'Groq Active' : 'Groq Standby'}
                  </span>
                </span>
                <span className={allConnected ? 'text-emerald-400 font-ndot' : 'text-[#d73832] font-ndot'}>
                  {allConnected ? 'SYSTEM SECURE' : 'ACTION REQUIRED'}
                </span>
              </div>
            </GlowCard>
          );
        })()}

        {/* Bento Card 4: Problems Solved Across Days */}
        <GlowCard accent="emerald" className="min-h-[200px] flex flex-col justify-between">
          <CardTitle
            right={
              <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-ndot text-emerald-400 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                <span>SOLVED &bull; 7 DAYS</span>
              </span>
            }
          >
            Problems Solved
          </CardTitle>

          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-bold font-ndot text-white [font-variant-numeric:tabular-nums]">
                {Math.round(animatedTotalSolved)}
              </span>
              <span className="text-xs text-neutral-400 font-mono">problems solved</span>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 font-semibold">
              +{todaySolved} today
            </span>
          </div>

          <div className="mt-auto space-y-2 pt-2">
            <div className="flex h-14 items-end gap-1.5 relative">
              {dailyReports.map((d, i) => {
                const count = d.resolved_count || 0;
                const isToday = i === dailyReports.length - 1;
                const heightPct = count > 0 ? Math.max((count / maxSolvedScale) * 100, 20) : 10;
                const isHovered = hoverSolvedDayIdx === i;

                return (
                  <div
                    key={d.date}
                    className="flex-1 flex flex-col items-center h-full justify-end relative cursor-pointer group"
                    onMouseEnter={() => setHoverSolvedDayIdx(i)}
                    onMouseLeave={() => setHoverSolvedDayIdx(null)}
                  >
                    {/* Hover Tooltip */}
                    <AnimatePresence>
                      {isHovered && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          style={{ transform: 'translateX(-50%)' }}
                          className="pointer-events-none absolute -top-8 left-1/2 whitespace-nowrap rounded-xl border border-emerald-500/40 bg-black/95 px-2 py-0.5 text-[10px] font-mono text-white shadow-xl z-30"
                        >
                          <span className="text-emerald-400 font-bold">{count}</span> {count === 1 ? 'solved' : 'solved'} ({d.day_name})
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <motion.span
                      animate={{ height: `${heightPct}%` }}
                      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                      className={cx(
                        'w-full rounded-sm transition-all',
                        count > 0
                          ? isToday
                            ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]'
                            : 'bg-emerald-500/80 hover:bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]'
                          : isToday
                          ? 'bg-white/20 hover:bg-white/30'
                          : 'bg-white/10 hover:bg-white/20'
                      )}
                    />
                  </div>
                );
              })}
            </div>

            {/* Days Labels */}
            <div className="flex justify-between text-[9px] font-ndot uppercase tracking-wider text-neutral-400 px-0.5">
              {dailyReports.map((d, i) => (
                <span
                  key={d.date}
                  className={cx(
                    'flex-1 text-center',
                    i === dailyReports.length - 1 ? 'text-emerald-400 font-bold' : ''
                  )}
                >
                  {d.day_name}
                </span>
              ))}
            </div>
          </div>
        </GlowCard>

        {/* Bento Card 5: Campus Engineering & Maintenance Trades Stack (Span 4 Cols) */}
        <GlowCard accent="amber" className="md:col-span-2 lg:col-span-4 min-h-[220px] flex flex-col justify-between">
          <CardTitle right={<span className="text-[10px] font-ndot text-amber-300">6 ACTIVE TRADES &bull; LIVE WORKFORCE</span>}>
            Campus Engineering & Maintenance Trades Roster
          </CardTitle>

          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {TRADES_STACK.map((trade) => {
              const on = trade.id === activeTradeId;
              const TradeIcon = trade.icon;
              const tradeInfo = tradesData[trade.code];
              const totalStaff = tradeInfo?.total_staff ?? 0;
              const availStaff = tradeInfo?.available_staff ?? 0;

              return (
                <li key={trade.id}>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 450, damping: 28 }}
                    onMouseEnter={() => setActiveTradeId(trade.id)}
                    onMouseLeave={() => setActiveTradeId(null)}
                    onFocus={() => setActiveTradeId(trade.id)}
                    onBlur={() => setActiveTradeId(null)}
                    aria-label={`${trade.name}: ${availStaff} available of ${totalStaff} staff`}
                    className="flex w-full flex-col items-center gap-1 rounded-2xl border px-2.5 py-3 transition-colors duration-200 focus-visible:outline-none"
                    style={{
                      color: on ? `rgb(${trade.rgb})` : '#a3a3a3',
                      borderColor: on ? `rgba(${trade.rgb}, 0.6)` : 'rgba(255,255,255,0.08)',
                      background: on ? `rgba(${trade.rgb}, 0.12)` : 'rgba(255,255,255,0.02)',
                      boxShadow: on ? `0 8px 24px -6px rgba(${trade.rgb}, 0.5)` : 'none',
                    }}
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-current/20 bg-black/20">
                      <TradeIcon className="h-4 w-4" strokeWidth={1.8} />
                    </span>
                    <span className={cx('text-xs font-semibold tracking-wide font-ndot transition-colors duration-200 text-center leading-tight', on ? 'text-white' : 'text-neutral-300')}>
                      {trade.name}
                    </span>

                    {/* How many workers are available for this specific task */}
                    <div className="flex items-center space-x-1.5 mt-0.5">
                      <span
                        className={cx(
                          'w-1.5 h-1.5 rounded-full',
                          availStaff > 0 ? 'bg-emerald-400 shadow-[0_0_6px_#34d399] animate-pulse' : 'bg-amber-400'
                        )}
                      />
                      <span
                        className={cx(
                          'text-[11px] font-mono font-bold',
                          availStaff > 0 ? 'text-emerald-400' : 'text-amber-400'
                        )}
                      >
                        {availStaff} available
                      </span>
                    </div>

                    <span className="text-[9px] font-mono text-neutral-500">
                      {totalStaff} on shift
                    </span>
                  </motion.button>
                </li>
              );
            })}
          </ul>

          <div className="mt-3 min-h-[40px] text-xs font-mono text-neutral-400 border-t border-white/10 pt-2.5" aria-live="polite">
            <AnimatePresence mode="wait">
              {activeTrade ? (() => {
                const activeTradeInfo = tradesData[activeTrade.code];
                const activeTotal = activeTradeInfo?.total_staff ?? 0;
                const activeAvail = activeTradeInfo?.available_staff ?? 0;
                const activeBusy = activeTradeInfo?.busy_staff ?? 0;
                const workersList: TradeWorkerItem[] = activeTradeInfo?.workers ?? [];

                return (
                  <motion.div
                    key={activeTrade.id}
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -3 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-1.5">
                      <div className="flex items-center space-x-2">
                        <strong className="text-amber-400 font-ndot uppercase tracking-wider text-xs font-bold">
                          {activeTrade.name} ({activeTrade.code}):
                        </strong>
                        <span className="text-emerald-400 font-ndot text-xs font-bold flex items-center space-x-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                          <span>{activeAvail} Workers Available for Dispatches</span>
                        </span>
                        <span className="text-neutral-500 text-[10px]">
                          ({activeBusy} active on task &bull; {activeTotal} rostered)
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-ndot uppercase tracking-widest text-neutral-500 mr-1">Roster:</span>
                      {workersList.map((w, wIdx) => {
                        const isFree = w.is_available && w.active_workload === 0;
                        return (
                          <span
                            key={w.id || wIdx}
                            className={cx(
                              'flex items-center space-x-1.5 px-2.5 py-0.5 rounded-xl text-[10px] font-mono border transition',
                              isFree
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                            )}
                          >
                            <span
                              className={cx(
                                'w-1.5 h-1.5 rounded-full',
                                isFree ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-amber-400'
                              )}
                            />
                            <span className="font-semibold text-white">{w.name}</span>
                            <span className="text-[9px] text-neutral-400">
                              {w.active_workload > 0 ? `(${w.active_workload} active task)` : 'Available'}
                            </span>
                            <span className="text-[9px] text-neutral-500">[{w.building}]</span>
                          </span>
                        );
                      })}
                    </div>

                    <p className="text-[11px] font-sans text-neutral-300 leading-snug">
                      {activeTrade.desc}
                    </p>
                  </motion.div>
                );
              })() : (
                <motion.p
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="text-neutral-400 text-xs font-sans"
                >
                  Hover over any maintenance trade to inspect how many workers are available, their live active task workload, and building deployment.
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </GlowCard>
      </motion.div>

      {/* Operations Incident Ledger Section (Full Width) */}
      <div className="w-full flex flex-col space-y-3 pt-2">
        <GlowCard accent="indigo" className="p-4 flex flex-col flex-1">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-nothing-red" />
                <h2 className="text-xs font-bold font-ndot text-white uppercase tracking-wider">
                  Live Incident Ledger ({activeTickets.length} Active)
                </h2>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ rotate: 180, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                onClick={fetchData}
                className="text-neutral-400 hover:text-white p-1 rounded-full border border-white/15 hover:border-white/40 transition"
                title="Refresh"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </motion.button>
            </div>

            <div className="overflow-auto flex-1 mt-3">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead className="bg-[#121215] text-neutral-400 font-ndot text-[10px] border-b border-white/10 sticky top-0 shadow-sm">
                  <tr>
                    <th className="py-2.5 px-3 w-16 border-r border-white/10">Ticket</th>
                    <th className="py-2.5 px-3 min-w-[220px] border-r border-white/10">Problem Summary</th>
                    <th className="py-2.5 px-3 w-32 border-r border-white/10">Room / Floor</th>
                    <th className="py-2.5 px-3 w-28 border-r border-white/10">Trade</th>
                    <th className="py-2.5 px-3 w-20 border-r border-white/10 text-right">Priority</th>
                    <th className="py-2.5 px-3 w-28 border-r border-white/10 text-right">State</th>
                    <th className="py-2.5 px-3 w-32 border-r border-white/10 text-right">Assigned Worker</th>
                    <th className="py-2.5 px-3 text-center w-36">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-sans">
                  <AnimatePresence initial={false}>
                    {activeTickets.map((t) => (
                      <motion.tr
                        key={t.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                        className="hover:bg-white/[0.04] transition-colors h-9"
                      >
                        <td className="py-1.5 px-3 font-ndot font-bold text-white border-r border-white/10">
                          #{t.ticket_number}
                        </td>
                        <td className="py-1.5 px-3 font-sans text-neutral-200 border-r border-white/10 truncate max-w-sm">
                          {t.summary || t.title || t.concise_summary || 'Campus maintenance incident'}
                        </td>
                        <td className="py-1.5 px-3 font-mono text-neutral-300 border-r border-white/10 truncate">
                          <span className="font-semibold text-white">{t.room_code || t.node_code || 'Campus General'}</span>
                          {t.floor_number !== undefined && t.floor_number !== null && (
                            <span className="text-[10px] text-neutral-400 ml-1.5 font-sans">Fl {t.floor_number}</span>
                          )}
                        </td>
                        <td className="py-1.5 px-3 font-ndot text-neutral-400 text-[11px] border-r border-white/10">
                          {t.category || 'TBD'}
                        </td>
                        <td className="py-1.5 px-3 font-ndot text-right border-r border-white/10">
                          <span
                            className={`text-[9px] px-2 py-0.5 rounded-full font-ndot border ${
                              t.calculated_priority === 'P0_CRITICAL'
                                ? 'bg-nothing-red/20 text-nothing-red border-nothing-red/50 font-bold'
                                : 'bg-white/10 text-white border-white/20'
                            }`}
                          >
                            {t.calculated_priority || 'P2'}
                          </span>
                        </td>
                        <td className="py-1.5 px-3 font-mono text-right border-r border-white/10">
                          <span
                            className={cx(
                              'text-[10px] px-2 py-0.5 rounded-full font-semibold border',
                              t.state === 'RESOLVED' || t.state === 'CLOSED'
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                : t.state === 'ASSIGNED' || t.state === 'IN_PROGRESS'
                                ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                                : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            )}
                          >
                            {t.state}
                          </span>
                        </td>
                        <td className="py-1.5 px-3 text-right font-sans text-neutral-200 border-r border-white/10 truncate">
                          {t.assigned_tech_name || (
                            <span className="text-neutral-500 italic text-[11px]">Unassigned</span>
                          )}
                        </td>
                        <td className="py-1.5 px-3 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            {/* Admin Approval Option */}
                            {(t.state === 'TRIAGED' || t.state === 'INGESTED' || t.state === 'AWAITING_CLARIFICATION') && (
                              isAdmin ? (
                                <motion.button
                                  type="button"
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  disabled={actionLoadingId === t.id}
                                  onClick={() => handleApproveTicket(t.id)}
                                  title="Approve work order & dispatch technician"
                                  className="px-2.5 py-1 rounded-xl bg-white text-black hover:bg-neutral-200 text-[10px] font-ndot font-bold flex items-center space-x-1 shadow-[0_0_10px_rgba(255,255,255,0.3)] transition shrink-0"
                                >
                                  <Check className="w-3 h-3 text-black" />
                                  <span>{actionLoadingId === t.id ? 'Approving...' : 'Approve'}</span>
                                </motion.button>
                              ) : (
                                <span className="text-[10px] font-mono text-amber-400/80 italic">Awaiting Approval</span>
                              )
                            )}

                            {/* Admin Mark Resolved Option */}
                            {(t.state === 'ASSIGNED' || t.state === 'IN_PROGRESS' || t.state === 'TRIAGED') && (
                              isAdmin ? (
                                <motion.button
                                  type="button"
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  disabled={actionLoadingId === t.id}
                                  onClick={() => handleResolveTicket(t.id)}
                                  title="Mark problem as resolved"
                                  className="px-2.5 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 text-[10px] font-ndot font-bold flex items-center space-x-1 transition shadow-[0_0_10px_rgba(52,211,153,0.2)] shrink-0"
                                >
                                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                                  <span>{actionLoadingId === t.id ? 'Resolving...' : 'Mark Resolved'}</span>
                                </motion.button>
                              ) : (
                                <span className="text-[10px] font-mono text-cyan-400">In Execution</span>
                              )
                            )}

                            {/* Verified Resolved Badge */}
                            {(t.state === 'RESOLVED' || t.state === 'CLOSED') && (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-ndot font-bold">
                                <Check className="w-3 h-3" />
                                <span>Resolved</span>
                              </span>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                  {activeTickets.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 px-4 text-center text-xs font-mono">
                        <div className="text-neutral-500 mb-3">
                          No active tickets in database. Ready for live incident intake.
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlowCard>
        </div>
      </div>
  );
};
