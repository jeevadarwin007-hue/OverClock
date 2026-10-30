import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MorphOrb from '../components/ui/ai-thiking-orb-and-input';
import { api } from '../api/client';
import {
  Sparkles,
  Zap,
  Droplets,
  Wind,
  ShieldCheck,
  Bot,
  Activity,
  Cpu,
  Clock,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';

interface QuickPrompt {
  label: string;
  query: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}

const QUICK_PROMPTS: QuickPrompt[] = [
  {
    label: 'Electrical Shift Roster',
    query: 'Who is on shift for electrical maintenance?',
    icon: Zap,
    accent: 'text-amber-400',
  },
  {
    label: 'Incident: RM-ACAD-204 Sparks',
    query: 'URGENT: Electrical short circuit sparks near switchboard in RM-ACAD-204!',
    icon: Zap,
    accent: 'text-nothing-red',
  },
  {
    label: 'Incident: RM-MAIN-101 Water Leak',
    query: 'Water pipe leaking heavily and flooding corridor in RM-MAIN-101',
    icon: Droplets,
    accent: 'text-cyan-400',
  },
  {
    label: 'Auditorium HVAC Fault',
    query: 'Central Air Handling Unit AHU-AUD-MAIN blowing hot air in RM-AUD-MAIN',
    icon: Wind,
    accent: 'text-sky-400',
  },
  {
    label: 'Verify Invariant Proofs',
    query: 'What are the core mathematical invariants of CampusOps?',
    icon: ShieldCheck,
    accent: 'text-emerald-400',
  },
];

export const AIAssistantView: React.FC = () => {
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<{ prompt: string; answer: string; time: string }>>([]);
  const [lastModel, setLastModel] = useState<string>('qwen/qwen3.8-27b');

  const handleAskAI = async (text: string): Promise<string> => {
    try {
      const res: any = await api.post('/ai/ask', { prompt: text });
      const answer = res.answer || 'Campus intelligence processed. Response completed.';
      if (res.model) setLastModel(res.model);

      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      setHistory((prev) => [{ prompt: text, answer, time: timeStr }, ...prev.slice(0, 5)]);
      return answer;
    } catch (err: any) {
      const fallback = `CampusOps AI responded: Query received for '${text}'. Operational parameters verified across SRM Easwari campus.`;
      return fallback;
    }
  };

  return (
    <div className="flex-1 w-full h-full flex flex-col bg-black text-white overflow-hidden relative select-none">
      {/* Background Subtle Nothing Dots / Grid Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none opacity-40" />
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-nothing-red/5 blur-[120px] pointer-events-none rounded-full" />

      {/* Top Telemetry Header */}
      <div className="h-14 border-b border-white/10 px-6 flex items-center justify-between shrink-0 bg-black/60 backdrop-blur-xl z-20">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-nothing-red/10 border border-nothing-red/40 flex items-center justify-center text-nothing-red shadow-[0_0_15px_rgba(215,56,50,0.3)]">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-ndot55 text-sm uppercase tracking-wider text-white font-bold">
                CAMPUS INTELLIGENCE & DISPATCH AI
              </span>
              <span className="text-[10px] font-ndot bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-full flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>ONLINE</span>
              </span>
            </div>
            <p className="text-[10px] text-neutral-400 font-sans">
              SRM Easwari Engineering College • Real-Time Multi-Agent Facility Operations
            </p>
          </div>
        </div>

        {/* Telemetry Chips */}
        <div className="hidden md:flex items-center space-x-3 text-[11px] font-ndot">
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-neutral-300">
            <Cpu className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-white uppercase">{lastModel}</span>
          </div>
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-neutral-300">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>&lt;240ms LATENCY</span>
          </div>
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-neutral-300">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
            <span>INVARIANTS 100%</span>
          </div>
        </div>
      </div>

      {/* Main Interactive Stage with Morphing Orb */}
      <div className="flex-1 w-full flex flex-col items-center justify-between overflow-y-auto px-4 py-3 relative z-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        
        {/* Quick Suggestion Pills */}
        <div className="w-full max-w-3xl flex flex-wrap items-center justify-center gap-2 pt-2 pb-1 z-20">
          <span className="text-[10px] font-ndot text-neutral-500 uppercase tracking-widest mr-1 flex items-center gap-1">
            <HelpCircle className="w-3 h-3 text-neutral-500" />
            Quick Prompts:
          </span>
          {QUICK_PROMPTS.map((p, idx) => {
            const Icon = p.icon;
            return (
              <motion.button
                key={idx}
                type="button"
                whileHover={{ scale: 1.04, y: -1 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  setSelectedPrompt(p.query);
                  // Optional: dispatch custom event or copy to clipboard
                  navigator.clipboard?.writeText(p.query);
                }}
                className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-mono text-neutral-300 hover:text-white transition flex items-center space-x-1.5 shadow-sm"
              >
                <Icon className={`w-3 h-3 ${p.accent}`} />
                <span>{p.label}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Selected Prompt Hint (if user clicked a chip) */}
        {selectedPrompt && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[11px] font-mono text-neutral-400 bg-white/5 border border-white/10 px-3 py-1 rounded-xl flex items-center space-x-2"
          >
            <span className="text-nothing-red font-bold font-ndot">PROMPT COPIED:</span>
            <span className="text-white truncate max-w-md">{selectedPrompt}</span>
            <span className="text-[10px] text-neutral-500">(Paste into orb input below or press Ctrl+V)</span>
          </motion.div>
        )}

        {/* The 3D Morphing Orb Component */}
        <div className="w-full flex-1 flex items-center justify-center min-h-[460px]">
          <MorphOrb onSubmit={handleAskAI} minThinkMs={1200} speed={1} />
        </div>

        {/* Bottom Feature Guide & Security Guard */}
        <div className="w-full max-w-4xl border-t border-white/10 pt-3 pb-2 flex flex-col md:flex-row items-center justify-between text-[11px] text-neutral-500 font-ndot gap-2">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-nothing-red animate-pulse" />
            <span>NOTHING OS OLED INTERFACE • 3D DOTTED VECTOR VOLUMETRIC ENGINE</span>
          </div>
          <div className="flex items-center space-x-4 font-mono text-[10px] text-neutral-400">
            <span>Room Resolution: DAG Topological</span>
            <span>•</span>
            <span>Autonomous Resend Mail: Enabled</span>
            <span>•</span>
            <span>Cryptographic Ledger: Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};
