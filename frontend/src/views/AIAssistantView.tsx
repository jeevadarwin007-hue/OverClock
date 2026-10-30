import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Cpu, History as HistoryIcon, Plus, Sparkles, X } from 'lucide-react';
import MorphOrb from '../components/ui/ai-thiking-orb-and-input';
import { api } from '../api/client';
import { useTheme } from '../context/ThemeContext';

interface AskAIResponse {
  answer: string;
  model?: string;
}

interface AIHealthResponse {
  connections?: {
    groq?: { connected?: boolean };
    database?: { connected?: boolean };
  };
}

interface IntakeResponse {
  is_ticket_created: boolean;
  decision: string;
  reply_message?: string | null;
  work_order_id?: string | null;
  ticket_number?: number | null;
  state?: string | null;
  needs_admin_approval?: boolean;
  requires_admin_approval?: boolean;
  reporter_urgency?: string | null;
  category?: string | null;
  target_node_code?: string | null;
  recommended_tech_name?: string | null;
  recommended_tech_role?: string | null;
  assigned_tech_name?: string | null;
  assigned_tech_role?: string | null;
  email_dispatched?: boolean | null;
  clarification_needed?: boolean;
  clarification_question?: string | null;
  correlation_action?: string;
  partial_slots?: { dispatch_status?: string };
  emergency_instructions?: {
    headline?: string;
    immediate_actions?: string[];
    evacuation_route?: string;
    assembly_point?: string;
  } | null;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  time: string;
}

interface SavedChat {
  id: string;
  title: string;
  updatedAt: string;
  messages: ChatMessage[];
  pendingIncident: string[];
}

const CHAT_HISTORY_KEY = 'campusops_ai_chat_history';

const loadSavedChats = (): SavedChat[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(CHAT_HISTORY_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((item) => item?.id && Array.isArray(item.messages)) : [];
  } catch {
    return [];
  }
};

const createChatId = () => globalThis.crypto?.randomUUID?.() || `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const apiFailureText = (error: unknown) => {
  const failure = error as { status?: number; message?: string };
  if (failure?.status === 401 || failure?.status === 403) {
    return 'Your session is no longer authorized. Sign in again and retry.';
  }
  if (failure?.status && failure.status >= 500) {
    return `The CampusOps API returned an error (${failure.status}). Check that the backend and database are running, then retry.`;
  }
  return 'The CampusOps API is not reachable. Start or reconnect the backend service, then retry.';
};

const timestamp = () => new Date().toLocaleTimeString('en-US', {
  hour12: false,
  hour: '2-digit',
  minute: '2-digit',
});

export const AIAssistantView: React.FC = () => {
  const { theme } = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [savedChats, setSavedChats] = useState<SavedChat[]>(loadSavedChats);
  const savedChatsRef = useRef(savedChats);
  const [chatId, setChatId] = useState<string>(createChatId);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [lastModel, setLastModel] = useState('qwen/qwen3.8-27b');
  const [connectionLabel, setConnectionLabel] = useState('CHECKING API');
  const [connectionTone, setConnectionTone] = useState<'online' | 'fallback' | 'offline'>('fallback');
  const conversation = useRef<ChatMessage[]>([]);
  const pendingIncident = useRef<string[]>([]);
  const promptUsesAnimation = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, thinking]);

  useEffect(() => {
    let active = true;
    const checkApi = async () => {
      try {
        const health = await api.get<AIHealthResponse>('/health');
        if (!active) return;
        const groqConfigured = health.connections?.groq?.connected === true;
        const databaseConnected = health.connections?.database?.connected !== false;
        setConnectionLabel(!databaseConnected ? (groqConfigured ? 'DB OFFLINE · AI MAY WORK' : 'DB OFFLINE') : groqConfigured ? 'GROQ CONFIGURED' : 'RULE FALLBACK');
        setConnectionTone(databaseConnected && groqConfigured ? 'online' : 'fallback');
      } catch {
        if (!active) return;
        setConnectionLabel('API OFFLINE');
        setConnectionTone('offline');
      }
    };
    checkApi();
    const interval = window.setInterval(checkApi, 30000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!messages.length) return;
    const firstPrompt = messages.find((message) => message.role === 'user')?.text || 'AI chat';
    const session: SavedChat = {
      id: chatId,
      title: firstPrompt.length > 58 ? `${firstPrompt.slice(0, 55)}…` : firstPrompt,
      updatedAt: new Date().toISOString(),
      messages,
      pendingIncident: pendingIncident.current,
    };
    const next = [session, ...savedChatsRef.current.filter((chat) => chat.id !== chatId)].slice(0, 30);
    savedChatsRef.current = next;
    setSavedChats(next);
    try {
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(next));
    } catch {
      // Keep the current conversation usable if local storage is unavailable.
    }
  }, [messages, chatId]);

  const handlePrompt = (text: string) => {
    promptUsesAnimation.current = !hasAnimated;
    setAnimating(promptUsesAnimation.current);
    const message: ChatMessage = { role: 'user', text, time: timestamp() };
    conversation.current = [...conversation.current, message];
    setMessages((current) => [...current, message]);
    setThinking(true);
  };

  const askCampusAI = async (prompt: string): Promise<string> => {
    const history = conversation.current.slice(-12).map(({ role, text }) => ({ role, content: text }));
    const incidentText = [...pendingIncident.current, prompt].join('\n');
    const reportIntent = /\b(no power|power outage|not working|broken|leak|flood|fire|smoke|spark|fault|damaged|repair|maintenance issue|equipment issue)\b/i.test(incidentText);
    let intake: IntakeResponse;
    try {
      intake = await api.post<IntakeResponse>('/intake/chat', {
        text: incidentText,
        channel: 'CHAT',
      });
    } catch {
      pendingIncident.current = [];
      try {
        const response = await api.post<AskAIResponse>('/ai/ask', { prompt, history });
        if (response.model) {
          setLastModel(response.model);
          const isFallback = response.model === 'CampusOps-RuleBased-Core';
          setConnectionLabel(isFallback ? 'RULE FALLBACK' : 'GROQ ACTIVE');
          setConnectionTone(isFallback ? 'fallback' : 'online');
        }
        const fallbackAnswer = response.answer || 'I need a little more detail to answer reliably. What campus system or room are you asking about?';
        return reportIntent
          ? `I couldn't file a work order because incident intake is unavailable, so no ticket was created. ${fallbackAnswer}`
          : fallbackAnswer;
      } catch (aiError) {
        setConnectionLabel('API OFFLINE');
        setConnectionTone('offline');
        return `${apiFailureText(aiError)}${reportIntent ? ' No incident report was submitted.' : ''}`;
      }
    }

    if (intake.is_ticket_created) {
        pendingIncident.current = [];
        if (intake.correlation_action === 'MERGED_DUPLICATE') {
          return `This report matches an existing incident. It has been linked to the existing work order on the dashboard.`;
        }
        const ticket = `Work order #${intake.ticket_number} for ${intake.target_node_code || 'the reported location'} has been added to the Admin dashboard.`;
        if (intake.requires_admin_approval) {
          const safety = intake.emergency_instructions;
          const safetyMessage = safety
            ? ` ${safety.headline || 'Follow the emergency instructions.'}${safety.immediate_actions?.length ? ` ${safety.immediate_actions.join(' ')}` : ''}${safety.evacuation_route ? ` Route: ${safety.evacuation_route}` : ''}${safety.assembly_point ? ` Assembly point: ${safety.assembly_point}.` : ''}`
            : '';
          return `Critical ${intake.reporter_urgency || 'P0'} incident reported to Admin. ${ticket} Admin approval is required before dispatch.${safetyMessage}`;
        }
        if (intake.assigned_tech_name) {
          const dispatch = intake.email_dispatched ? 'The worker was notified by email.' : 'The assignment is recorded on the dashboard.';
          return `${ticket} Assigned ${intake.assigned_tech_role || intake.category || 'technician'}: ${intake.assigned_tech_name}. ${dispatch}`;
        }
        if (intake.partial_slots?.dispatch_status) {
          return `${ticket} ${intake.partial_slots.dispatch_status} The ticket is flagged for Admin attention.`;
        }
        if (!intake.recommended_tech_name) {
          return `${ticket} No eligible ${intake.category || 'trade'} worker is available. The ticket is flagged for Admin staffing.`;
        }
        return `${ticket} Recommended ${intake.recommended_tech_role || intake.category || 'technician'}: ${intake.recommended_tech_name}.`;
      }

    if (intake.clarification_needed && intake.category) {
        pendingIncident.current = [...pendingIncident.current, prompt];
        return intake.clarification_question || intake.reply_message || 'Please provide the exact room and describe the issue.';
      }

    pendingIncident.current = [];

    try {
      const response = await api.post<AskAIResponse>('/ai/ask', { prompt, history });
      if (response.model) {
        setLastModel(response.model);
        const isFallback = response.model === 'CampusOps-RuleBased-Core';
        setConnectionLabel(isFallback ? 'RULE FALLBACK' : 'GROQ ACTIVE');
        setConnectionTone(isFallback ? 'fallback' : 'online');
      }
      return response.answer || 'I need a little more detail to answer reliably. What campus system or room are you asking about?';
    } catch (error) {
      setConnectionLabel('API OFFLINE');
      setConnectionTone('offline');
      return apiFailureText(error);
    }
  };

  const handleAnswer = (text: string) => {
    const message: ChatMessage = { role: 'assistant', text, time: timestamp() };
    conversation.current = [...conversation.current, message];
    setMessages((current) => [...current, message]);
    setThinking(false);
    if (promptUsesAnimation.current) setHasAnimated(true);
    setAnimating(false);
    promptUsesAnimation.current = false;
  };

  const startNewChat = () => {
    if (thinking) return;
    setChatId(createChatId());
    conversation.current = [];
    pendingIncident.current = [];
    promptUsesAnimation.current = false;
    setMessages([]);
    setHasAnimated(false);
    setAnimating(false);
    setHistoryOpen(false);
  };

  const openSavedChat = (chat: SavedChat) => {
    if (thinking) return;
    setChatId(chat.id);
    conversation.current = chat.messages;
    pendingIncident.current = chat.pendingIncident || [];
    setMessages(chat.messages);
    setHasAnimated(true);
    setAnimating(false);
    setHistoryOpen(false);
  };

  return (
    <div className={`ai-view flex-1 w-full flex flex-col bg-[#111114] text-white overflow-hidden relative ${theme === 'brutalism' ? 'ai-view-brutalism' : theme === 'swiss' ? 'ai-view-swiss' : ''}`}>
      <div className="ai-view-background absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none opacity-40" />
      <div className={`ai-chat-header h-14 border-b px-5 flex items-center justify-between shrink-0 z-20 ${theme === 'brutalism' ? 'border-black bg-[#2b2b2b]' : 'border-white/10 bg-black/60 backdrop-blur-xl'}`}>
        <div className="flex items-center space-x-3">
          <div className={`w-8 h-8 flex items-center justify-center ${theme === 'brutalism' ? 'rounded-none border-2 border-black bg-[#e9ef49] text-black' : 'rounded-xl bg-violet-600/20 border border-violet-500/40 text-violet-300'}`}>
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="font-ndot55 text-sm uppercase tracking-wider">CAMPUS AI INTELLIGENCE</div>
            <p className="ai-view-subtitle text-[10px] text-neutral-500 font-mono">
              <span className={`mr-1 md:hidden ${connectionTone === 'offline' ? 'text-red-500' : connectionTone === 'online' ? 'text-emerald-500' : 'text-amber-500'}`}>{connectionLabel} ·</span>
              Ask a question or add details in a follow-up message.
            </p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 text-[11px] font-mono">
          <div className={`px-2 py-1 flex items-center gap-1.5 ${theme === 'brutalism' ? 'rounded-none border border-black bg-white text-black' : 'rounded-full bg-white/5 border border-white/10 text-neutral-400'}`}>
            <Cpu className="w-3 h-3" /><span className={theme === 'brutalism' ? 'text-black' : 'text-white'}>{lastModel}</span>
          </div>
          <div className={`ai-connection-status px-2 py-1 flex items-center gap-1.5 ${theme === 'brutalism' ? 'rounded-none border border-black bg-white text-black' : 'rounded-full bg-white/5 border border-white/10 text-neutral-400'}`}>
            <Clock className={`w-3 h-3 ${connectionTone === 'offline' ? 'text-red-500' : connectionTone === 'online' ? 'text-emerald-400' : 'text-amber-400'}`} /><span>{connectionLabel}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setHistoryOpen((open) => !open)}
            disabled={thinking}
            aria-expanded={historyOpen}
            className={`ai-toolbar-button flex items-center gap-1.5 px-3 py-1.5 text-xs transition disabled:opacity-40 ${theme === 'brutalism' ? 'rounded-none border-2 border-black bg-white text-black hover:bg-[#e9ef49]' : 'rounded-full border border-white/15 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white'}`}
          >
            <HistoryIcon className="h-3.5 w-3.5" /> History{savedChats.length ? ` (${savedChats.length})` : ''}
          </button>
          <button
            type="button"
            onClick={startNewChat}
            disabled={thinking}
            className={`ai-toolbar-button flex items-center gap-1.5 px-3 py-1.5 text-xs transition disabled:opacity-40 ${theme === 'brutalism' ? 'rounded-none border-2 border-black bg-[#e9ef49] text-black hover:bg-white' : 'rounded-full border border-white/15 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white'}`}
          >
            <Plus className="h-3.5 w-3.5" /> New chat
          </button>
        </div>
      </div>

      <div className="ai-chat-stage relative z-10 flex-1 min-h-0 overflow-hidden">
        {historyOpen && (
          <div role="dialog" aria-label="AI chat history" className={`ai-history-panel absolute right-4 top-4 bottom-4 z-30 flex w-[min(360px,calc(100%-2rem))] flex-col border p-3 ${theme === 'brutalism' ? 'rounded-none border-[3px] border-black bg-[#d4d4d4] text-black shadow-[7px_7px_0_#e9ef49]' : 'rounded-2xl border-white/15 bg-[#101014]/95 text-white shadow-2xl backdrop-blur-xl'}`}>
            <div className="mb-3 flex items-center justify-between border-b border-current/20 pb-3">
              <div>
                <h2 className="text-sm font-semibold">AI chat history</h2>
                <p className="mt-0.5 text-[10px] opacity-65">Saved on this device</p>
              </div>
              <button type="button" onClick={() => setHistoryOpen(false)} aria-label="Close chat history" className="p-1 opacity-70 hover:opacity-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
              {savedChats.length === 0 ? (
                <p className="p-3 text-xs opacity-65">Past chats will appear here.</p>
              ) : savedChats.map((chat) => (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => openSavedChat(chat)}
                  className={`ai-history-item block w-full border p-3 text-left ${theme === 'brutalism' ? 'rounded-none border-black/30 bg-white text-black hover:bg-[#e9ef49]' : 'rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10'}`}
                >
                  <span className="block truncate text-xs font-semibold">{chat.title}</span>
                  <span className="mt-1 block text-[10px] opacity-60">
                    {new Date(chat.updatedAt).toLocaleString()} · {chat.messages.length} messages
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="ai-orb-stage absolute inset-0 z-0">
          <MorphOrb
            onPrompt={handlePrompt}
            onSubmit={askCampusAI}
            onAnswer={handleAnswer}
            chatMode
            animate={!hasAnimated}
            minThinkMs={900}
            speed={1}
          />
        </div>

        <div className={`ai-chat-transcript absolute inset-x-0 top-0 bottom-[170px] z-10 flex flex-col ${animating ? 'hidden' : ''}`}>
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-6 sm:px-8 space-y-5">
          {messages.length === 0 && (
            <div className="flex items-start gap-3">
              <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center ${theme === 'brutalism' ? 'rounded-none border-2 border-black bg-[#e9ef49] text-black' : 'rounded-full bg-violet-600 text-white'}`}>
                <Sparkles className="h-4 w-4" />
              </div>
              <div className={`ai-message-assistant max-w-[min(80%,720px)] px-4 py-3 text-sm leading-relaxed ${theme === 'brutalism' ? 'rounded-none border-2 border-black bg-white text-black shadow-[4px_4px_0_#111]' : 'rounded-2xl rounded-tl-md border border-white/10 bg-[#242428] text-neutral-100 shadow-lg'}`}>
                Hi! I’m your CampusOps AI assistant. How can I help with campus operations today?
              </div>
            </div>
          )}

          {messages.map((message, index) => message.role === 'user' ? (
            <motion.div
              key={`${message.time}-${index}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-end"
            >
              <div className={`ai-message-user max-w-[min(82%,760px)] px-4 py-3 text-sm leading-relaxed ${theme === 'brutalism' ? 'rounded-none border-2 border-black bg-[#e9ef49] text-black shadow-[4px_4px_0_#111]' : 'rounded-2xl rounded-br-md bg-violet-600 text-white shadow-[0_8px_24px_rgba(109,40,217,0.25)]'}`}>
                <p className="whitespace-pre-wrap break-words">{message.text}</p>
                <p className={`mt-1 text-right text-[10px] ${theme === 'brutalism' ? 'text-black/60' : 'text-violet-200/70'}`}>{message.time}</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={`${message.time}-${index}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3"
            >
              <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center ${theme === 'brutalism' ? 'rounded-none border-2 border-black bg-[#e9ef49] text-black' : 'rounded-full bg-violet-600 text-white'}`}>
                <Sparkles className="h-4 w-4" />
              </div>
              <div className={`ai-message-assistant max-w-[min(82%,760px)] px-4 py-3 text-sm leading-relaxed ${theme === 'brutalism' ? 'rounded-none border-2 border-black bg-white text-black shadow-[4px_4px_0_#111]' : 'rounded-2xl rounded-tl-md border border-white/10 bg-[#242428] text-neutral-100 shadow-lg'}`}>
                <p className="whitespace-pre-wrap break-words">{message.text.replace(/\*\*/g, '')}</p>
                <p className="mt-1 text-right text-[10px] text-neutral-500">{message.time}</p>
              </div>
            </motion.div>
          ))}

          {thinking && !animating && (
            <div className="flex items-start gap-3" role="status" aria-label="Campus AI is responding">
              <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center ${theme === 'brutalism' ? 'rounded-none border-2 border-black bg-[#e9ef49] text-black' : 'rounded-full bg-violet-600 text-white'}`}>
                <Sparkles className="h-4 w-4" />
              </div>
              <div className={`flex items-center gap-1 px-4 py-4 ${theme === 'brutalism' ? 'rounded-none border-2 border-black bg-white' : 'rounded-2xl rounded-tl-md border border-white/10 bg-[#242428]'}`}>
                {[0, 1, 2].map((dot) => (
                  <motion.span
                    key={dot}
                    className="h-1.5 w-1.5 rounded-full bg-neutral-400"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: dot * 0.18 }}
                  />
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
        </div>
      </div>
    </div>
  );
};
