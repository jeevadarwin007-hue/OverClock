import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  ClipboardList,
  Filter,
  Search,
  MessageSquare,
  Play,
  CheckCircle,
  Pause,
  Wrench,
  Clock,
  User,
  Shield,
  ArrowRight,
  Send,
  X,
} from 'lucide-react';

export const WorkOrdersView: React.FC = () => {
  const { currentUser } = useAuth();
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterState, setFilterState] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [clarifyText, setClarifyText] = useState('');
  const [isSubmittingClarify, setIsSubmittingClarify] = useState(false);

  const fetchWorkOrders = async () => {
    try {
      setLoading(true);
      const data: any = await api.get('/work-orders');
      setWorkOrders(data);
      if (selectedTicket) {
        const updated = data.find((w: any) => w.id === selectedTicket.id);
        if (updated) setSelectedTicket(updated);
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
      await api.post(`/work-orders/${selectedTicket.id}/transition`, {
        target_state: targetState,
        reason: reason,
        resolution_notes: targetState === 'RESOLVED' ? 'Repairs completed and operational tests passed.' : undefined,
      });
      fetchWorkOrders();
    } catch (err: any) {
      alert(`Transition failed: ${err.message || 'FSM violation'}`);
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
      (wo.raw_description || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesState && matchesSearch;
  });

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
      case 'RESOLVED':
      case 'CLOSED':
        return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
      case 'MERGED_DUPLICATE':
        return 'bg-slate-700/30 text-slate-400 border-slate-700/50';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-2.5">
          <ClipboardList className="w-5 h-5 text-blue-400" />
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Work Orders
            </h2>
            <p className="text-xs text-slate-400">
              Track, assign, and resolve campus maintenance tickets.
            </p>
          </div>
        </div>

        {/* Filter controls */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by ticket or room..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono w-48"
            />
          </div>

          <select
            value={filterState}
            onChange={(e) => setFilterState(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500 font-mono"
          >
            <option value="ALL">All States ({workOrders.length})</option>
            <option value="TRIAGED">Triaged</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="BLOCKED_PARTS">Blocked on Parts</option>
            <option value="AWAITING_CLARIFICATION">Awaiting Clarification</option>
            <option value="MERGED_DUPLICATE">Merged Duplicates</option>
            <option value="RESOLVED">Resolved / Closed</option>
          </select>
        </div>
      </div>

      {/* Main Table + Inspector Drawer Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Work Order Table */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono">
                <tr>
                  <th className="py-3 px-3">Ticket</th>
                  <th className="py-3 px-3">Room / Node</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">State</th>
                  <th className="py-3 px-3">Priority</th>
                  <th className="py-3 px-3">Reporters</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredTickets.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className={`cursor-pointer transition ${
                      selectedTicket?.id === t.id ? 'bg-blue-600/15 border-l-2 border-blue-500' : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="py-3 px-3 font-mono text-blue-400 font-bold">#{t.ticket_number}</td>
                    <td className="py-3 px-3 font-mono text-slate-200">{t.node_code || 'General'}</td>
                    <td className="py-3 px-3 font-mono text-slate-300 text-[11px]">{t.category}</td>
                    <td className="py-3 px-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono border ${getStateBadge(t.state)}`}>
                        {t.state}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                        t.calculated_priority === 'P0_CRITICAL'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {t.calculated_priority}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-400">
                      {t.correlator_reporter_count || 1}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ticket Details & Action Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col justify-between">
          {selectedTicket ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-xs font-mono text-blue-400 font-bold">
                    Ticket #{selectedTicket.ticket_number}
                  </span>
                  <h3 className="text-sm font-bold text-white">{selectedTicket.node_code || 'Campus General'}</h3>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono border ${getStateBadge(selectedTicket.state)}`}>
                  {selectedTicket.state}
                </span>
              </div>

              {/* Description */}
              <div>
                <span className="text-[11px] font-mono text-slate-500 block">Reported Description:</span>
                <p className="text-xs text-slate-300 bg-slate-950 p-2.5 rounded border border-slate-800 font-sans mt-1">
                  {selectedTicket.raw_description}
                </p>
              </div>

              {/* Meta details */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-slate-950 p-2 rounded border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Category</span>
                  <span className="text-white font-bold">{selectedTicket.category || 'TBD'}</span>
                </div>
                <div className="bg-slate-950 p-2 rounded border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Priority</span>
                  <span className="text-rose-400 font-bold">{selectedTicket.calculated_priority}</span>
                </div>
              </div>

              {/* Stateful Clarification Loop Box (if AWAITING_CLARIFICATION) */}
              {selectedTicket.state === 'AWAITING_CLARIFICATION' && (
                <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-lg space-y-2">
                  <div className="flex items-center space-x-1.5 text-xs text-amber-300 font-bold">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Stateful Clarification Loop</span>
                  </div>
                  <p className="text-[11px] text-amber-200/90 font-mono">
                    {selectedTicket.clarification_question || 'Missing specific room code or category. Reply below:'}
                  </p>
                  <form onSubmit={handleClarifySubmit} className="flex space-x-1.5 pt-1">
                    <input
                      type="text"
                      placeholder="e.g. LAB-ACAD-301..."
                      value={clarifyText}
                      onChange={(e) => setClarifyText(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                    />
                    <button
                      type="submit"
                      disabled={isSubmittingClarify || !clarifyText.trim()}
                      className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-bold transition"
                    >
                      <Send className="w-3 h-3" />
                    </button>
                  </form>
                </div>
              )}

              {/* FSM Allowed Action Transitions */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <span className="text-[11px] font-mono text-slate-500 block">Available FSM Actions:</span>
                <div className="grid grid-cols-2 gap-2">
                  {selectedTicket.state === 'ASSIGNED' && (
                    <button
                      onClick={() => handleTransition('IN_PROGRESS', 'Technician started physical repairs')}
                      className="flex items-center justify-center space-x-1 bg-blue-600 hover:bg-blue-500 text-white p-2 rounded text-xs font-bold transition"
                    >
                      <Play className="w-3 h-3" />
                      <span>Start Repair</span>
                    </button>
                  )}
                  {selectedTicket.state === 'IN_PROGRESS' && (
                    <button
                      onClick={() => handleTransition('RESOLVED', 'Completed field inspection')}
                      className="flex items-center justify-center space-x-1 bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded text-xs font-bold transition"
                    >
                      <CheckCircle className="w-3 h-3" />
                      <span>Mark Resolved</span>
                    </button>
                  )}
                  {['ASSIGNED', 'IN_PROGRESS'].includes(selectedTicket.state) && (
                    <button
                      onClick={() => handleTransition('BLOCKED_PARTS', 'Awaiting component stock arrival')}
                      className="flex items-center justify-center space-x-1 bg-amber-600 hover:bg-amber-500 text-white p-2 rounded text-xs font-bold transition"
                    >
                      <Pause className="w-3 h-3" />
                      <span>Block on Parts</span>
                    </button>
                  )}
                  {['TRIAGED', 'AWAITING_CLARIFICATION', 'RESOLVED'].includes(selectedTicket.state) && (
                    <button
                      onClick={() => handleTransition('CLOSED', 'Administrative ticket closure')}
                      className="flex items-center justify-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded text-xs font-bold border border-slate-700 transition"
                    >
                      <span>Close Ticket</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs py-16">
              Select a work order from the table to inspect details and execute state transitions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

