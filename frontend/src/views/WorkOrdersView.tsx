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
  ELECTRICAL: { label: 'Electrician', icon: '⚡', color: 'bg-amber-500/10 text-amber-300 border-amber-500/30' },
  PLUMBING: { label: 'Plumber', icon: '🔧', color: 'bg-blue-500/10 text-blue-300 border-blue-500/30' },
  HVAC: { label: 'HVAC Tech', icon: '❄️', color: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30' },
  NETWORK: { label: 'Network Eng', icon: '🌐', color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
  AV_EQUIPMENT: { label: 'AV Tech', icon: '📽️', color: 'bg-purple-500/10 text-purple-300 border-purple-500/30' },
  STRUCTURAL_SAFETY: { label: 'Safety Officer', icon: '🚨', color: 'bg-rose-500/10 text-rose-300 border-rose-500/30' },
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
        return 'bg-emerald-400';
      case 'ASSIGNED':
        return 'bg-purple-400';
      case 'IN_PROGRESS':
        return 'bg-cyan-400';
      case 'BLOCKED_PARTS':
        return 'bg-amber-400';
      case 'AWAITING_CLARIFICATION':
        return 'bg-orange-400';
      case 'MERGED_DUPLICATE':
        return 'bg-slate-500';
      default:
        return 'bg-blue-400';
    }
  };

  const getStateBadge = (state: string) => {
    switch (state) {
      case 'TRIAGED':
        return 'bg-blue-500/10 text-blue-300 border-blue-500/30';
      case 'ASSIGNED':
        return 'bg-purple-500/10 text-purple-300 border-purple-500/30';
      case 'IN_PROGRESS':
        return 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30';
      case 'BLOCKED_PARTS':
        return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
      case 'AWAITING_CLARIFICATION':
        return 'bg-orange-500/10 text-orange-300 border-orange-500/30';
      case 'MERGED_DUPLICATE':
        return 'bg-slate-500/10 text-slate-400 border-slate-700';
      case 'RESOLVED':
        return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'P0_CRITICAL':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold';
      case 'P1_HIGH':
        return 'bg-orange-500/15 text-orange-300 border-orange-500/30';
      case 'P2_MEDIUM':
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Ledger Context Filter Strip */}
      <div className="h-12 border-b border-slate-800 bg-slate-900/80 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <ClipboardList className="w-4 h-4 text-blue-400" />
            <h1 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Work Order Operational Ledger
            </h1>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
            {workOrders.length} Records
          </span>
        </div>

        {/* Search & State Filter Controls */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search ticket, room, trade..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-2.5 pl-8 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono w-56"
            />
          </div>

          <select
            value={filterState}
            onChange={(e) => setFilterState(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-blue-500 font-mono"
          >
            <option value="ALL">All States ({workOrders.length})</option>
            <option value="TRIAGED">Triaged</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="BLOCKED_PARTS">Blocked on Parts</option>
            <option value="AWAITING_CLARIFICATION">Awaiting Clarification</option>
            <option value="MERGED_DUPLICATE">Merged Duplicate</option>
            <option value="RESOLVED">Resolved</option>
          </select>

          <button
            onClick={fetchWorkOrders}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 text-xs transition"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main 60/40 Asymmetric Workspace Split */}
      <div className="flex-1 flex overflow-hidden">
        {/* 60% Left Pane: Spatial Ledger Table (Edge-to-Edge) */}
        <div className="flex-1 border-r border-slate-800 overflow-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono sticky top-0 z-10">
              <tr>
                <th className="py-2 px-3 w-8 border-r border-slate-800 text-center">●</th>
                <th className="py-2 px-3 w-20 border-r border-slate-800">Ticket</th>
                <th className="py-2 px-3 border-r border-slate-800">Room / Node</th>
                <th className="py-2 px-3 border-r border-slate-800">Category</th>
                <th className="py-2 px-3 border-r border-slate-800 text-right">Priority</th>
                <th className="py-2 px-3 border-r border-slate-800 text-right">State</th>
                <th className="py-2 px-3 text-right">Assigned Worker</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-sans">
              {filteredTickets.map((t) => {
                const isSelected = selectedTicket?.id === t.id;
                const roleBadge = ROLE_BADGES[t.assigned_tech_role || t.category];
                return (
                  <tr
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className={`cursor-pointer transition h-9 select-none ${
                      isSelected
                        ? 'bg-blue-600/15 border-l-2 border-l-blue-500'
                        : 'hover:bg-slate-900/60'
                    }`}
                  >
                    <td className="py-2 px-3 border-r border-slate-800 text-center">
                      <span
                        className={`inline-block w-1.5 h-1.5 rounded-full ${getStatusDot(t.state)}`}
                        title={t.state}
                      />
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-blue-400 border-r border-slate-800">
                      #{t.ticket_number}
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-200 border-r border-slate-800">
                      {t.node_code || 'Campus General'}
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-300 text-[11px] border-r border-slate-800">
                      {t.category || 'PENDING_TRIAGE'}
                    </td>
                    <td className="py-2 px-3 text-right border-r border-slate-800">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-mono border ${getPriorityBadge(
                          t.calculated_priority
                        )}`}
                      >
                        {t.calculated_priority || 'P2'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right border-r border-slate-800">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-mono border ${getStateBadge(
                          t.state
                        )}`}
                      >
                        {t.state}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      {t.assigned_tech_name ? (
                        <div className="inline-flex items-center space-x-1.5 justify-end">
                          <span className="font-semibold text-slate-200">{t.assigned_tech_name}</span>
                          {roleBadge && (
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-mono border ${roleBadge.color}`}
                            >
                              {roleBadge.icon} {roleBadge.label}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500 italic text-[11px] font-mono">
                          Unassigned
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredTickets.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-500 text-xs font-mono">
                    {workOrders.length === 0
                      ? 'No work orders in ledger. New incident reports filed from Dashboard will be recorded here.'
                      : 'No work orders matching filter criteria.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 40% Right Pane: Contextual Inspector Drawer (Fixed 410px width) */}
        <div className="w-[410px] bg-slate-900 border-l border-slate-800 flex flex-col justify-between overflow-y-auto shrink-0 shadow-2xl">
          {selectedTicket ? (
            <div className="p-4 space-y-4">
              {/* Drawer Header */}
              <div className="pb-3 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-mono font-bold text-blue-400">
                      Ticket #{selectedTicket.ticket_number}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-mono border ${getStateBadge(
                        selectedTicket.state
                      )}`}
                    >
                      {selectedTicket.state}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-200 mt-1">
                    {selectedTicket.node_name
                      ? `${selectedTicket.node_name} (${selectedTicket.node_code})`
                      : 'Campus General Infrastructure'}
                  </div>
                </div>

                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-mono border ${getPriorityBadge(
                    selectedTicket.calculated_priority
                  )}`}
                >
                  {selectedTicket.calculated_priority}
                </span>
              </div>

              {/* Status Alert Message */}
              {transitionStatus && (
                <div className="p-2.5 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-blue-300 font-mono">
                  {transitionStatus}
                </div>
              )}

              {/* Reported Description */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase text-slate-400">
                  Reported Incident Description
                </span>
                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-300 leading-relaxed font-mono">
                  {selectedTicket.raw_description || 'No raw description provided.'}
                </div>
              </div>

              {/* AI Structured Summary */}
              {selectedTicket.ai_summary && (
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase text-slate-400">
                    AI Entity Extraction Summary
                  </span>
                  <div className="p-2.5 bg-blue-950/20 border border-blue-800/40 rounded text-xs text-blue-200 font-mono">
                    {selectedTicket.ai_summary}
                  </div>
                </div>
              )}

              {/* Assigned Worker Telemetry Card (NO Change Worker Button) */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5 text-blue-400" />
                  <span>Assigned Maintenance Personnel</span>
                </span>

                {selectedTicket.assigned_tech_name ? (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-100">
                        {selectedTicket.assigned_tech_name}
                      </span>
                      {(() => {
                        const badge =
                          ROLE_BADGES[
                            selectedTicket.assigned_tech_role || selectedTicket.category
                          ];
                        return badge ? (
                          <span
                            className={`inline-flex items-center space-x-1 px-1.5 py-0.2 rounded text-[10px] font-mono border ${badge.color}`}
                          >
                            <span>{badge.icon}</span>
                            <span>{badge.label}</span>
                          </span>
                        ) : null;
                      })()}
                    </div>
                    <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-mono">
                      <Mail className="w-3 h-3 text-slate-500" />
                      <span>{selectedTicket.assigned_tech_email || 'No email registered'}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 w-fit font-mono">
                      <span>✓ Dispatched via Resend API</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-2.5 text-center text-xs text-slate-500 bg-slate-900/50 rounded border border-dashed border-slate-800 font-mono">
                    Pending technician assignment (Score-based auto-dispatch)
                  </div>
                )}
              </div>

              {/* Emergency Instructions Card (Anti-Hallucination Verified) */}
              {selectedTicket.partial_slots?.emergency_instructions && (
                <div className="p-3 bg-rose-950/30 border border-rose-500/40 rounded space-y-2 text-xs">
                  <div className="flex items-center space-x-1.5 text-rose-400 font-bold">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>EMERGENCY PROTOCOL ACTIVE</span>
                  </div>
                  <div className="font-semibold text-rose-200">
                    {selectedTicket.partial_slots.emergency_instructions.hazard_title}
                  </div>
                  <p className="text-[11px] text-slate-300">
                    {selectedTicket.partial_slots.emergency_instructions.evacuation_route}
                  </p>
                  <div className="text-[10px] text-rose-300 font-mono bg-rose-950/60 p-2 rounded border border-rose-900">
                    Assembly Point:{' '}
                    {selectedTicket.partial_slots.emergency_instructions.assembly_point}
                  </div>
                </div>
              )}

              {/* Clarification Interaction (if awaiting) */}
              {selectedTicket.state === 'AWAITING_CLARIFICATION' && (
                <div className="p-3 bg-amber-950/20 border border-amber-500/40 rounded space-y-2">
                  <div className="flex items-center space-x-1.5 text-amber-400 text-xs font-bold">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Clarification Required</span>
                  </div>
                  <p className="text-xs text-slate-300 italic">
                    "{selectedTicket.clarification_question || 'Please provide additional details.'}"
                  </p>
                  <form onSubmit={handleClarifySubmit} className="space-y-2 pt-1">
                    <input
                      type="text"
                      placeholder="e.g. Near switchboard in Room 204..."
                      value={clarifyText}
                      onChange={(e) => setClarifyText(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="submit"
                      disabled={isSubmittingClarify || !clarifyText.trim()}
                      className="w-full py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded text-xs font-semibold font-mono transition"
                    >
                      {isSubmittingClarify ? 'Submitting...' : 'Submit Clarification'}
                    </button>
                  </form>
                </div>
              )}

              {/* FSM Lifecycle Action Triggers */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">
                  Available FSM Actions
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {selectedTicket.state === 'ASSIGNED' && (
                    <button
                      onClick={() => handleTransition('IN_PROGRESS', 'Technician on-site inspection')}
                      className="col-span-2 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold font-mono transition flex items-center justify-center space-x-1.5 shadow"
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
                        className="py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold font-mono transition flex items-center justify-center space-x-1.5 shadow"
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
                        className="py-2 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-bold font-mono transition flex items-center justify-center space-x-1.5 shadow"
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
                      className="col-span-2 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-bold font-mono transition flex items-center justify-center space-x-1.5 shadow"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Resume Repair</span>
                    </button>
                  )}

                  {(selectedTicket.state === 'RESOLVED' || selectedTicket.state === 'CLOSED') && (
                    <div className="col-span-2 py-2 text-center text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded font-mono">
                      ✓ Lifecycle Complete (State: {selectedTicket.state})
                    </div>
                  )}

                  {selectedTicket.state === 'TRIAGED' && (
                    <div className="col-span-2 py-2 text-center text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded font-mono">
                      Awaiting Automated Worker Dispatch
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs font-mono">
              Select a work order row to inspect telemetry and trigger state transitions.
            </div>
          )}

          {/* Drawer Footer Status */}
          <div className="p-3 border-t border-slate-800 text-[10px] text-slate-500 font-mono flex items-center justify-between">
            <span>FSM: STRICT TRIGGER GUARDS</span>
            <span>AUDIT: IMMUTABLE</span>
          </div>
        </div>
      </div>
    </div>
  );
};
