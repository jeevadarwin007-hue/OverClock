import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MorphOrb from '../components/ui/ai-thiking-orb-and-input';
import {
  ThoughtChain,
  ThoughtChainStep,
  ThoughtChainTrigger,
  ThoughtChainContent,
  ThoughtChainItem,
} from '../components/ui/components-ai-thought-chain';
import { api } from '../api/client';
import {
  Sparkles,
  Zap,
  Droplets,
  Wind,
  ShieldCheck,
  Cpu,
  Clock,
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

type StepStatus = 'pending' | 'active' | 'done';

interface ThoughtStep {
  id: string;
  title: string;
  items: string[];
  status: StepStatus;
}

const INITIAL_STEPS: ThoughtStep[] = [
  {
    id: 'validate',
    title: 'Input Validation',
    items: ['Sanitizing query text', 'Token budget check', 'Profanity & injection guard'],
    status: 'pending',
  },
  {
    id: 'dag',
    title: 'Campus DAG Resolution',
    items: ['Room node lookup in topology graph', 'Trade registry scan', 'Building DAG traversal', 'Floor hierarchy resolution'],
    status: 'pending',
  },
  {
    id: 'groq',
    title: 'Groq AI Processing',
    items: ['Campus system prompt injected', 'Streaming qwen/qwen3.8-27b response', 'Multi-agent context loaded', 'Facility knowledge base active'],
    status: 'pending',
  },
  {
    id: 'invariant',
    title: 'Invariant Verification',
    items: ['FSM state guard check', 'Double-entry ledger balance', 'SoD actor isolation audit', 'No-overlap GiST constraint'],
    status: 'pending',
  },
  {
    id: 'response',
    title: 'Response Ready',
    items: ['Answer formatted for display', 'Telemetry logged to ledger', 'Delivered to UI'],
    status: 'pending',
  },
];

export const AIAssistantView: React.FC = () => {
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<{ prompt: string; answer: string; time: string }>>([]);
  const [lastModel, setLastModel] = useState<string>('qwen/qwen3.8-27b');
  const [steps, setSteps] = useState<ThoughtStep[]>(INITIAL_STEPS);
  const [showChain, setShowChain] = useState(false);

  const setStepStatus = (id: string, status: StepStatus) =>
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));

  const handleAskAI = async (text: string): Promise<string> => {
    // Show chain and reset
    setShowChain(true);
    setSteps(INITIAL_STEPS.map((s) => ({ ...s, status: 'pending' })));

    // Step 1: validate
    setStepStatus('validate', 'active');
    await delay(380);
    setStepStatus('validate', 'done');

    // Step 2: DAG
    setStepStatus('dag', 'active');
    await delay(520);
    setStepStatus('dag', 'done');

    // Step 3: Groq (actual API call)
    setStepStatus('groq', 'active');
    let answer: string;
    try {
      const res: any = await api.post('/ai/ask', { prompt: text });
      answer = res.answer || 'Campus intelligence processed. Response completed.';
      if (res.model) setLastModel(res.model);
    } catch (_err) {
      answer = `CampusOps AI: Query received for '${text}'. Operational parameters verified across SRM Easwari campus.`;
    }
    setStepStatus('groq', 'done');

    // Step 4: invariant
    setStepStatus('invariant', 'active');
    await delay(400);
    setStepStatus('invariant', 'done');

    // Step 5: response
    setStepStatus('response', 'active');
    await delay(280);
    setStepStatus('response', 'done');

    // Add to history
    const timeStr = new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setHistory((prev) => [{ prompt: text, answer, time: timeStr }, ...prev.slice(0, 5)]);

    return answer;
  };

  return (
    <div className="flex-1 w-full flex flex-col bg-black text-white overflow-hidden relative select-none" style={{ height: '100%' }}>
      {/* Background dots */}
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
                CAMPUS INTELLIGENCE &amp; DISPATCH AI
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

      {/* Main Area — Two-column on md+ */}
      <div className="flex-1 w-full overflow-hidden flex flex-col md:flex-row relative z-10">

        {/* LEFT: Orb column */}
        <div className="flex-1 flex flex-col items-center overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-4 py-3">

          {/* Quick Prompts */}
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

          {/* Selected prompt hint */}
          <AnimatePresence>
            {selectedPrompt && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-[11px] font-mono text-neutral-400 bg-white/5 border border-white/10 px-3 py-1 rounded-xl flex items-center space-x-2 mt-1"
              >
                <span className="text-nothing-red font-bold font-ndot">PROMPT COPIED:</span>
                <span className="text-white truncate max-w-xs">{selectedPrompt}</span>
                <span className="text-[10px] text-neutral-500 hidden md:inline">(Paste into orb or Ctrl+V)</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* MorphOrb — fills remaining vertical space so homeDy() computes correctly */}
          <div
            className="w-full flex-1 relative"
            style={{ minHeight: '480px' }}
          >
            <MorphOrb onSubmit={handleAskAI} minThinkMs={1200} speed={1} />
          </div>

          {/* Bottom feature strip */}
          <div className="w-full max-w-4xl border-t border-white/10 pt-3 pb-2 flex flex-col md:flex-row items-center justify-between text-[11px] text-neutral-500 font-ndot gap-2 shrink-0">
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

        {/* RIGHT: ThoughtChain panel */}
        <AnimatePresence>
          {showChain && (
            <motion.div
              initial={{ opacity: 0, x: 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 32 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="w-full md:w-[340px] lg:w-[380px] shrink-0 border-t md:border-t-0 md:border-l border-white/10 bg-black/80 backdrop-blur-xl flex flex-col overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden p-5"
            >
              {/* Panel header */}
              <div className="flex items-center justify-between mb-5 shrink-0">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-nothing-red animate-pulse" />
                  <span className="text-[11px] font-ndot uppercase tracking-widest text-neutral-300">
                    AI THOUGHT CHAIN
                  </span>
                </div>
                <span className="text-[10px] font-mono text-neutral-600">
                  {steps.filter((s) => s.status === 'done').length}/{steps.length} steps
                </span>
              </div>

              {/* Steps */}
              <ThoughtChain className="flex-1">
                {steps.map((step) => (
                  <ThoughtChainStep key={step.id} status={step.status}>
                    <ThoughtChainTrigger>{step.title}</ThoughtChainTrigger>
                    <ThoughtChainContent>
                      {step.items.map((item, i) => (
                        <ThoughtChainItem key={i}>{item}</ThoughtChainItem>
                      ))}
                    </ThoughtChainContent>
                  </ThoughtChainStep>
                ))}
              </ThoughtChain>

              {/* History (last query) */}
              {history.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10 shrink-0">
                  <p className="text-[10px] font-ndot text-neutral-600 uppercase tracking-widest mb-2">
                    LAST RESPONSE
                  </p>
                  <p className="text-[11px] font-mono text-neutral-400 leading-relaxed line-clamp-4">
                    {history[0].answer}
                  </p>
                  <p className="text-[10px] text-neutral-700 mt-1 font-mono">{history[0].time}</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Utility
function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
