import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  ClipboardList,
  Search,
  MessageSquare,
  Play,
  CheckCircle,
  Pause,
  Wrench,
  Clock,
  User,
  Mail,
  Briefcase,
  Shield,
  ArrowRight,
  Send,
  X,
  RefreshCw,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

const ROLE_BADGES: Record<string, { label: string; icon: string; color: string }> = {
  ELECTRICAL: { label: 'Electrician', icon: '⚡', color: 'bg-white/10 text-white border-white/20' },
  PLUMBING: { label: 'Plumber', icon: '🔧', color: 'bg-white/10 text-neutral-300 border-white/20' },
  HVAC: { label: 'HVAC Tech', icon: '❄️', color: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
  NETWORK: { label: 'Network Eng', icon: '🌐', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  AV_EQUIPMENT: { label: 'AV Tech', icon: '📽️', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  STRUCTURAL_SAFETY: { label: 'Safety Officer', icon: '🚨', color: 'bg-nothing-red/20 text-nothing-red border-nothing-red/50 font-bold' },
};

export const WorkOrdersView: React.FC = () => {
  const { currentUser } = useAuth();
  const isAdmin = currentUser.role === 'SYS_ADMIN' || currentUser.role === 'FACILITIES_ADMIN';

  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterState, setFilterState] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [clarifyText, setClarifyText] = useState('');
  const [isSubmittingClarify, setIsSubmittingClarify] = useState(false);
  const [transitionStatus, setTransitionStatus] = useState<string | null>(null);
  const [quickIntakeText, setQuickIntakeText] = useState('');
  const [isSubmittingQuick, setIsSubmittingQuick] = useState(false);

  const handleQuickIntake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickIntakeText.trim()) return;
    try {
      setIsSubmittingQuick(true);
      const res: any = await api.post('/intake', {
        text: quickIntakeText.trim(),
        channel: 'WORK_ORDERS_LEDGER',
      });
      if (res.decision === 'REPLY_QUESTION' || !res.is_ticket_created) {
        setTransitionStatus(`AI Clarification: ${res.reply_message || 'Please describe an equipment or facility problem to file a work order.'}`);
      } else {
        setQuickIntakeText('');
        setTransitionStatus(`Work order #${res.ticket_number} created successfully.`);
        fetchWorkOrders();
      }
    } catch (err: any) {
      alert(`Intake failed: ${err.message || 'Error'}`);
    } finally {
      setIsSubmittingQuick(false);
    }
  };

  const fetchWorkOrders = async () => {
    try {
      setLoading(true);
      const data: any = await api.get('/work-orders');
      setWorkOrders(data);
      if (selectedTicket) {
        const updated = data.find((w: any) => w.id === selectedTicket.id);
        if (updated) setSelectedTicket(updated);
      } else if (data.length > 0) {
        setSelectedTicket(data[0]);
      } else {
        setSelectedTicket(null);
      }
    } catch (err) {
      console.error('Failed to fetch work orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkOrders();
  }, [currentUser]);

  const handleTransition = async (targetState: string, reason: string) => {
    if (!selectedTicket) return;
    try {
      setTransitionStatus(null);
      await api.post(`/work-orders/${selectedTicket.id}/transition`, {
        target_state: targetState,
        reason: reason,
        resolution_notes: targetState === 'RESOLVED' ? 'Repairs completed and operational tests verified.' : undefined,
      });
      setTransitionStatus(`Ticket state updated to ${targetState}`);
      fetchWorkOrders();
    } catch (err: any) {
      setTransitionStatus(`Transition failed: ${err.message || 'FSM rule constraint'}`);
    }
  };

  const handleClarifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !clarifyText.trim()) return;
    try {
      setIsSubmittingClarify(true);
      await api.post(`/intake/${selectedTicket.conversation_thread_id}/clarify`, {
        reply_text: clarifyText,
      });
      setClarifyText('');
      fetchWorkOrders();
    } catch (err: any) {
      alert(`Clarification failed: ${err.message || 'Error'}`);
    } finally {
      setIsSubmittingClarify(false);
    }
  };

  const filteredTickets = workOrders.filter((wo) => {
    const matchesState = filterState === 'ALL' || wo.state === filterState;
    const matchesSearch =
      wo.ticket_number?.toString().includes(searchQuery) ||
      (wo.node_code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (wo.raw_description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (wo.assigned_tech_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (wo.category || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesState && matchesSearch;
  });

  const getStatusDot = (state: string) => {
    switch (state) {
      case 'RESOLVED':
      case 'CLOSED':
        return 'bg-emerald-400 shadow-[0_0_8px_#34d399]';
      case 'ASSIGNED':
        return 'bg-white shadow-[0_0_8px_#ffffff]';
      case 'IN_PROGRESS':
        return 'bg-amber-400 shadow-[0_0_8px_#f59e0b]';
      case 'BLOCKED_PARTS':
        return 'bg-amber-600 shadow-[0_0_8px_#d97706]';
      case 'AWAITING_CLARIFICATION':
        return 'bg-sky-400 shadow-[0_0_8px_#38bdf8]';
      case 'MERGED_DUPLICATE':
        return 'bg-neutral-600';
      default:
        return 'bg-white';
    }
  };

  const getStateBadge = (state: string) => {
    switch (state) {
      case 'TRIAGED':
        return 'bg-white/10 text-white border-white/20';
      case 'ASSIGNED':
        return 'bg-white text-black border-white font-bold';
      case 'IN_PROGRESS':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'BLOCKED_PARTS':
        return 'bg-amber-700/30 text-amber-200 border-amber-600/40';
      case 'AWAITING_CLARIFICATION':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
      case 'MERGED_DUPLICATE':
        return 'bg-neutral-800 text-neutral-400 border-neutral-700';
      case 'RESOLVED':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold';
      default:
        return 'bg-neutral-900 text-neutral-300 border-neutral-800';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'P0_CRITICAL':
        return 'bg-nothing-red text-white border-nothing-red font-bold nothing-red-badge';
      case 'P1_HIGH':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold';
      case 'P2_MEDIUM':
        return 'bg-white/10 text-neutral-300 border-white/20';
      case 'P3_LOW':
        return 'bg-neutral-900 text-neutral-400 border-neutral-800';
      default:
        return 'bg-white/10 text-neutral-300 border-white/20';
    }
  };

  return (
    <div className="h-full flex flex-col bg-transparent text-white overflow-hidden">
      {/* Top Ledger Utility Bar */}
      <div className="h-[50px] border-b border-white/10 bg-black/80 backdrop-blur-xl px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <ClipboardList className="w-4 h-4 text-nothing-red" />
            <span className="font-ndot text-xs font-bold uppercase tracking-wider text-white">
              Work Order Dispatch Ledger
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-ndot bg-white/10 text-white border border-white/20">
            {workOrders.length} Records
          </span>
        </div>

        {/* Search & State Filter Controls */}
        <div className="flex items-center space-x-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search ticket, room, trade..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#121215] border border-white/15 rounded-full px-2.5 pl-8 py-1 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white font-mono w-56 shadow-inner"
            />
          </div>

          <select
            value={filterState}
            onChange={(e) => setFilterState(e.target.value)}
            className="bg-[#121215] border border-white/15 rounded-full px-3 py-1 text-xs text-white focus:outline-none font-ndot cursor-pointer"
          >
            <option value="ALL" className="bg-black text-white">All States ({workOrders.length})</option>
            <option value="TRIAGED" className="bg-black text-white">Triaged</option>
            <option value="ASSIGNED" className="bg-black text-white">Assigned</option>
            <option value="IN_PROGRESS" className="bg-black text-white">In Progress</option>
            <option value="BLOCKED_PARTS" className="bg-black text-white">Blocked on Parts</option>
            <option value="AWAITING_CLARIFICATION" className="bg-black text-white">Awaiting Clarification</option>
            <option value="MERGED_DUPLICATE" className="bg-black text-white">Merged Duplicate</option>
            <option value="RESOLVED" className="bg-black text-white">Resolved</option>
          </select>

          <button
            onClick={fetchWorkOrders}
            className="p-1.5 bg-[#121215] hover:bg-white/10 text-white rounded-full border border-white/15 text-xs transition spring-interactive shadow-sm"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main 60/40 Asymmetric Workspace Split */}
      <div className="flex-1 flex overflow-hidden">
        {/* 60% Left Pane: Spatial Ledger Table (Edge-to-Edge) */}
        <div className="flex-1 border-r border-white/10 overflow-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#121215] text-neutral-400 border-b border-white/10 font-ndot sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="py-2.5 px-3 w-8 border-r border-white/10 text-center">●</th>
                <th className="py-2.5 px-3 w-20 border-r border-white/10">Ticket</th>
                <th className="py-2.5 px-3 w-40 border-r border-white/10">Room / Floor</th>
                <th className="py-2.5 px-3 w-44 border-r border-white/10">Category</th>
                <th className="py-2.5 px-3 w-28 border-r border-white/10 text-right">Priority</th>
                <th className="py-2.5 px-3 w-36 border-r border-white/10 text-right">State</th>
                <th className="py-2.5 px-3 text-right">Assigned Worker</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              {filteredTickets.map((t) => {
                const isSelected = selectedTicket?.id === t.id;
                const roleBadge = ROLE_BADGES[t.assigned_tech_role || t.category];
                return (
                  <tr
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className={`cursor-pointer transition h-9 select-none spring-row ${
                      isSelected
                        ? 'bg-white/[0.08] border-l-2 border-l-nothing-red shadow-sm'
                        : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    <td className="py-2 px-3 border-r border-white/10 text-center">
                      <span
                        className={`inline-block w-1.5 h-1.5 rounded-full ${getStatusDot(t.state)}`}
                        title={t.state}
                      />
                    </td>
                    <td className="py-2 px-3 font-ndot font-bold text-white border-r border-white/10">
                      #{t.ticket_number}
                    </td>
                    <td className="py-2 px-3 font-mono text-neutral-300 border-r border-white/10">
                      <span className="font-semibold text-white">{t.room_code || t.node_code || 'Campus General'}</span>
                      {t.floor_number !== undefined && t.floor_number !== null && (
                        <span className="text-[10px] text-neutral-400 ml-1.5 font-sans">Fl {t.floor_number}</span>
                      )}
                    </td>
                    <td className="py-2 px-3 font-ndot text-neutral-300 text-[11px] border-r border-white/10">
                      {t.category || 'PENDING_TRIAGE'}
                    </td>
                    <td className="py-2 px-3 text-right border-r border-white/10">
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-ndot border ${getPriorityBadge(
                          t.calculated_priority
                        )}`}
                      >
                        {t.calculated_priority || 'P2'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right border-r border-white/10">
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono border ${getStateBadge(
                          t.state
                        )}`}
                      >
                        {t.state}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      {t.assigned_tech_name ? (
                        <div className="inline-flex items-center space-x-1.5 justify-end">
                          <span className="font-semibold text-white">{t.assigned_tech_name}</span>
                          {roleBadge && (
                            <span
                              className={`px-2 py-0.2 rounded-full text-[10px] font-ndot border ${roleBadge.color}`}
                            >
                              {roleBadge.icon} {roleBadge.label}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-neutral-500 italic text-[11px] font-sans">
                          Unassigned
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredTickets.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-neutral-500 text-xs font-ndot">
                    {workOrders.length === 0
                      ? 'No work orders in ledger. New incident reports filed from Dashboard will appear here.'
                      : 'No work orders matching filter criteria.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 40% Right Pane: Contextual Inspector Drawer (Nothing OS Squircle Surface) */}
        <div className="w-[420px] bg-[#0c0c0e]/95 backdrop-blur-2xl border-l border-white/10 flex flex-col justify-between overflow-y-auto shrink-0 shadow-2xl">
          {selectedTicket ? (
            <div className="p-5 space-y-4">
              {/* Drawer Header */}
              <div className="pb-3 border-b border-white/10 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-base font-ndot font-bold text-white">
                      TICKET #{selectedTicket.ticket_number}
                    </span>
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono border ${getStateBadge(
                        selectedTicket.state
                      )}`}
                    >
                      {selectedTicket.state}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-neutral-300 mt-1">
                    {selectedTicket.room_code || selectedTicket.node_code ? (
                      <div>
                        <span className="text-white font-mono font-bold text-sm">{selectedTicket.room_code || selectedTicket.node_code}</span>
                        {selectedTicket.floor_number !== undefined && selectedTicket.floor_number !== null && (
                          <span className="text-neutral-400 ml-2 font-sans font-normal">(Floor {selectedTicket.floor_number})</span>
                        )}
                        {selectedTicket.node_name && (
                          <div className="text-neutral-400 text-[11px] font-sans font-normal mt-0.5">{selectedTicket.node_name}</div>
                        )}
                      </div>
                    ) : (
                      'Campus General Infrastructure'
                    )}
                  </div>
                </div>

                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-ndot border ${getPriorityBadge(
                    selectedTicket.calculated_priority
                  )}`}
                >
                  {selectedTicket.calculated_priority}
                </span>
              </div>

              {/* Status Alert Message */}
              {transitionStatus && (
                <div className="p-3 bg-white/10 border border-white/20 rounded-2xl text-xs text-white font-mono shadow-sm">
                  {transitionStatus}
                </div>
              )}

              {/* Reported Description */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-ndot uppercase tracking-widest text-neutral-400">
                  Reported Incident Description
                </span>
                <div className="p-3.5 bg-black/60 border border-white/10 rounded-2xl text-xs text-neutral-200 leading-relaxed font-mono shadow-inner">
                  {selectedTicket.raw_description || 'No raw description provided.'}
                </div>
              </div>

              {/* AI Structured Summary */}
              {selectedTicket.ai_summary && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-ndot uppercase tracking-widest text-neutral-400">
                    AI Entity Extraction Summary
                  </span>
                  <div className="p-3.5 bg-black/60 border border-white/10 rounded-2xl text-xs text-neutral-300 font-mono shadow-inner">
                    {selectedTicket.ai_summary}
                  </div>
                </div>
              )}

              {/* Assigned Worker Telemetry Card */}
              <div className="p-4 bg-black/60 border border-white/10 rounded-2xl space-y-2.5 shadow-inner">
                <span className="text-[10px] font-ndot uppercase tracking-widest text-neutral-400 flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5 text-nothing-red" />
                  <span>Assigned Maintenance Personnel</span>
                </span>

                {selectedTicket.assigned_tech_name ? (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">
                        {selectedTicket.assigned_tech_name}
                      </span>
                      {(() => {
                        const badge =
                          ROLE_BADGES[
                            selectedTicket.assigned_tech_role || selectedTicket.category
                          ];
                        return badge ? (
                          <span
                            className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-ndot border ${badge.color}`}
                          >
                            <span>{badge.icon}</span>
                            <span>{badge.label}</span>
                          </span>
                        ) : null;
                      })()}
                    </div>
                    <div className="flex items-center space-x-1.5 text-xs text-neutral-400 font-mono">
                      <Mail className="w-3.5 h-3.5 text-neutral-500" />
                      <span>{selectedTicket.assigned_tech_email || 'No email registered'}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-[10px] text-white bg-white/10 px-2.5 py-0.5 rounded-full border border-white/20 w-fit font-mono">
                      <span>✓ Dispatched via Resend API</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-3 text-center text-xs text-neutral-500 bg-white/[0.02] rounded-xl border border-dashed border-white/15 font-sans">
                    Pending technician assignment (Score-based auto-dispatch)
                  </div>
                )}
              </div>

              {/* Emergency Instructions Card */}
              {selectedTicket.partial_slots?.emergency_instructions && (
                <div className="p-4 bg-nothing-red/15 border border-nothing-red/60 rounded-2xl space-y-2 text-xs shadow-md">
                  <div className="flex items-center space-x-1.5 text-white font-bold font-ndot">
                    <AlertTriangle className="w-4 h-4 text-nothing-red shrink-0" />
                    <span>EMERGENCY PROTOCOL ACTIVE</span>
                  </div>
                  <div className="font-semibold text-white">
                    {selectedTicket.partial_slots.emergency_instructions.hazard_title}
                  </div>
                  <p className="text-[11px] text-neutral-200">
                    {selectedTicket.partial_slots.emergency_instructions.evacuation_route}
                  </p>
                  <div className="text-[10px] text-white font-mono bg-black/60 p-2 rounded-xl border border-white/10">
                    Assembly Point:{' '}
                    {selectedTicket.partial_slots.emergency_instructions.assembly_point}
                  </div>
                </div>
              )}

              {/* Clarification Interaction (if awaiting) */}
              {selectedTicket.state === 'AWAITING_CLARIFICATION' && (
                <div className="p-4 bg-black/60 border border-sky-500/40 rounded-2xl space-y-2.5 shadow-inner">
                  <div className="flex items-center space-x-1.5 text-sky-300 text-xs font-bold font-ndot">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Clarification Required</span>
                  </div>
                  <p className="text-xs text-neutral-300 italic">
                    "{selectedTicket.clarification_question || 'Please provide additional details.'}"
                  </p>
                  <form onSubmit={handleClarifySubmit} className="space-y-2 pt-1">
                    <input
                      type="text"
                      placeholder="e.g. Near switchboard in Room 204..."
                      value={clarifyText}
                      onChange={(e) => setClarifyText(e.target.value)}
                      className="w-full bg-black/80 border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-white"
                    />
                    <button
                      type="submit"
                      disabled={isSubmittingClarify || !clarifyText.trim()}
                      className="w-full py-2 nothing-btn-primary text-black disabled:opacity-50 text-xs font-bold transition spring-interactive shadow"
                    >
                      {isSubmittingClarify ? 'Submitting...' : 'Submit Clarification'}
                    </button>
                  </form>
                </div>
              )}

              {/* FSM Lifecycle Action Triggers */}
              <div className="space-y-2.5 pt-2 border-t border-white/10">
                <span className="text-[10px] font-ndot uppercase text-neutral-400 tracking-widest block">
                  Available FSM Actions
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {selectedTicket.state === 'ASSIGNED' && (
                    <button
                      onClick={() => handleTransition('IN_PROGRESS', 'Technician on-site inspection')}
                      className="col-span-2 py-2.5 nothing-btn-primary text-black text-xs font-bold transition spring-interactive flex items-center justify-center space-x-1.5 shadow-[0_4px_16px_rgba(255,255,255,0.25)]"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Start Repair</span>
                    </button>
                  )}

                  {selectedTicket.state === 'IN_PROGRESS' && (
                    <>
                      <button
                        onClick={() =>
                          handleTransition('RESOLVED', 'Repairs completed and operational tests passed.')
                        }
                        className="py-2.5 nothing-btn-primary text-black text-xs font-bold transition spring-interactive flex items-center justify-center space-x-1.5 shadow"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Mark Resolved</span>
                      </button>
                      <button
                        onClick={() =>
                          handleTransition(
                            'BLOCKED_PARTS',
                            'Awaiting replacement parts from central inventory'
                          )
                        }
                        className="py-2.5 nothing-btn-outline text-white text-xs font-bold transition spring-interactive flex items-center justify-center space-x-1.5"
                      >
                        <Pause className="w-3.5 h-3.5" />
                        <span>Block on Parts</span>
                      </button>
                    </>
                  )}

                  {selectedTicket.state === 'BLOCKED_PARTS' && (
                    <button
                      onClick={() =>
                        handleTransition('IN_PROGRESS', 'Replacement parts received from store')
                      }
                      className="col-span-2 py-2.5 nothing-btn-primary text-black text-xs font-bold transition spring-interactive flex items-center justify-center space-x-1.5 shadow"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Resume Repair</span>
                    </button>
                  )}

                  {(selectedTicket.state === 'RESOLVED' || selectedTicket.state === 'CLOSED') && (
                    <div className="col-span-2 py-2.5 text-center text-xs text-white bg-white/10 border border-white/20 rounded-2xl font-ndot shadow-sm">
                      ✓ Lifecycle Complete (State: {selectedTicket.state})
                    </div>
                  )}

                  {selectedTicket.state === 'TRIAGED' && (
                    <div className="col-span-2 py-2.5 text-center text-xs text-neutral-300 bg-black/60 border border-white/15 rounded-2xl font-sans shadow-sm">
                      Awaiting Automated Worker Dispatch
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-5 space-y-4">
              <div className="pb-3 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ClipboardList className="w-4 h-4 text-nothing-red" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white font-ndot">
                    Operational Dispatch Station
                  </span>
                </div>
                <span className="text-[10px] font-ndot px-2.5 py-0.5 rounded-full bg-white/10 text-white border border-white/20">
                  Ready
                </span>
              </div>

              {/* Direct Rapid Incident Intake */}
              <div className="p-4 bg-black/60 border border-white/10 rounded-2xl space-y-2.5">
                <span className="text-xs font-bold text-white flex items-center space-x-1.5 font-ndot">
                  <span>⚡</span>
                  <span>Report Maintenance Incident</span>
                </span>
                <p className="text-[11px] text-neutral-400 font-sans">
                  Enter facility issue description for automated entity triage and worker notification dispatch.
                </p>
                <form onSubmit={handleQuickIntake} className="space-y-2.5">
                  <textarea
                    rows={3}
                    placeholder="e.g. Water leaking from ceiling AC in RM-ACAD-204"
                    value={quickIntakeText}
                    onChange={(e) => setQuickIntakeText(e.target.value)}
                    className="w-full bg-black/80 border border-white/15 rounded-xl p-2.5 text-xs text-white font-mono focus:outline-none focus:border-white resize-none"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingQuick || !quickIntakeText.trim()}
                    className="w-full py-2 nothing-btn-primary text-black font-bold text-xs transition spring-interactive flex items-center justify-center space-x-1.5 shadow disabled:opacity-50"
                  >
                    <Send className="w-3 h-3" />
                    <span>{isSubmittingQuick ? 'Filing...' : 'Submit Work Order'}</span>
                  </button>
                </form>
              </div>

              {/* Active Ledger Metrics */}
              <div className="space-y-2">
                <span className="text-[10px] font-ndot uppercase text-neutral-400 tracking-widest block">
                  Queue Health Telemetry
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-3 bg-black/60 rounded-2xl border border-white/10">
                    <span className="text-[10px] text-neutral-500 block font-ndot">Total Orders</span>
                    <span className="text-xl font-bold font-ndot text-white">{workOrders.length}</span>
                  </div>
                  <div className="p-3 bg-black/60 rounded-2xl border border-white/10">
                    <span className="text-[10px] text-neutral-500 block font-ndot">In Progress</span>
                    <span className="text-xl font-bold font-ndot text-amber-400">
                      {workOrders.filter((w) => w.state === 'IN_PROGRESS').length}
                    </span>
                  </div>
                  <div className="p-3 bg-black/60 rounded-2xl border border-white/10">
                    <span className="text-[10px] text-neutral-500 block font-ndot">Awaiting Dispatch</span>
                    <span className="text-xl font-bold font-ndot text-white">
                      {workOrders.filter((w) => w.state === 'TRIAGED' || w.state === 'ASSIGNED').length}
                    </span>
                  </div>
                  <div className="p-3 bg-black/60 rounded-2xl border border-white/10">
                    <span className="text-[10px] text-neutral-500 block font-ndot">Resolved</span>
                    <span className="text-xl font-bold font-ndot text-emerald-400">
                      {workOrders.filter((w) => w.state === 'RESOLVED' || w.state === 'CLOSED').length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Invariant Guarantees */}
              <div className="p-3.5 bg-black/60 rounded-2xl border border-white/10 text-[10px] font-mono space-y-1.5 text-neutral-400">
                <div className="flex items-center space-x-1.5 text-white font-bold font-ndot">
                  <Shield className="w-3.5 h-3.5 text-nothing-red" />
                  <span>Strict Invariant Protection Active</span>
                </div>
                <div>• FSM transition trigger guard active</div>
                <div>• Audit ledger is strictly append-only</div>
                <div>• Groq multi-agent entity classifier enabled</div>
              </div>
            </div>
          )}

          {/* Drawer Footer Status */}
          <div className="p-3 border-t border-white/10 text-[10px] text-neutral-500 font-ndot flex items-center justify-between bg-black/60">
            <span>FSM: STRICT TRIGGER GUARDS</span>
            <span>AUDIT: IMMUTABLE</span>
          </div>
        </div>
      </div>
    </div>
  );
};
