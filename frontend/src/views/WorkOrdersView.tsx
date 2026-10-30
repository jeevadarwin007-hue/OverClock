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
  UserCheck,
  UserPlus,
  RefreshCw,
  Zap,
  Droplets,
  AlertTriangle,
} from 'lucide-react';

const WORKER_ROLE_OPTIONS = [
  { value: 'ELECTRICAL', label: 'Electrician', icon: '⚡', desc: 'Wiring, MCB, lighting, and power distribution' },
  { value: 'PLUMBING', label: 'Plumber', icon: '🔧', desc: 'Pipes, leakage, valves, and water supply' },
  { value: 'HVAC', label: 'HVAC / AC Technician', icon: '❄️', desc: 'Air conditioning, chillers, and ducts' },
  { value: 'NETWORK', label: 'Network & IT Specialist', icon: '🌐', desc: 'Ethernet ports, Wi-Fi APs, and routers' },
  { value: 'AV_EQUIPMENT', label: 'Audio / Visual Technician', icon: '🔊', desc: 'Projectors, speakers, and amplifiers' },
  { value: 'STRUCTURAL_SAFETY', label: 'Carpenter / Safety', icon: '🦺', desc: 'Doors, windows, civil repairs, and fire extinguishers' },
];

export const WorkOrdersView: React.FC = () => {
  const { currentUser } = useAuth();
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterState, setFilterState] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [clarifyText, setClarifyText] = useState('');
  const [isSubmittingClarify, setIsSubmittingClarify] = useState(false);

  // Assign Worker Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null);
  const [workerForm, setWorkerForm] = useState({
    worker_name: '',
    worker_email: '',
    worker_role: 'ELECTRICAL',
  });

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

  const handleOpenAssignModal = (ticket: any) => {
    setSelectedTicket(ticket);
    setAssignError(null);
    setWorkerForm({
      worker_name: ticket.assigned_tech_name || '',
      worker_email: ticket.assigned_tech_email || '',
      worker_role: ticket.assigned_tech_role || ticket.category || 'ELECTRICAL',
    });
    setIsAssignModalOpen(true);
  };

  const handleAssignWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    if (!workerForm.worker_name.trim()) {
      setAssignError('Worker name is required.');
      return;
    }
    if (!workerForm.worker_email.trim()) {
      setAssignError('Worker email is required.');
      return;
    }

    try {
      setIsAssigning(true);
      setAssignError(null);
      const res: any = await api.post(`/work-orders/${selectedTicket.id}/assign`, {
        worker_name: workerForm.worker_name.trim(),
        worker_email: workerForm.worker_email.trim(),
        worker_role: workerForm.worker_role,
      });

      if (res.email_dispatched) {
        setAssignSuccess(`Worker assigned & notification email dispatched via Resend! (ID: ${res.email_dispatch_id || 'sent'})`);
      } else {
        setAssignSuccess(`Worker assigned successfully!`);
      }
      setTimeout(() => setAssignSuccess(null), 8000);

      setIsAssignModalOpen(false);
      await fetchWorkOrders();
    } catch (err: any) {
      setAssignError(err.message || 'Failed to assign worker.');
    } finally {
      setIsAssigning(false);
    }
  };

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
      (wo.raw_description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (wo.assigned_tech_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (wo.assigned_tech_email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (wo.assigned_tech_role || '').toLowerCase().includes(searchQuery.toLowerCase());
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

  const getRoleBadge = (role: string | null) => {
    if (!role) return null;
    switch (role.toUpperCase()) {
      case 'ELECTRICAL':
        return { label: 'Electrician', icon: '⚡', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
      case 'PLUMBING':
        return { label: 'Plumber', icon: '🔧', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
      case 'HVAC':
        return { label: 'HVAC Tech', icon: '❄️', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' };
      case 'NETWORK':
        return { label: 'Network IT', icon: '🌐', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' };
      case 'AV_EQUIPMENT':
        return { label: 'AV Specialist', icon: '🔊', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
      case 'STRUCTURAL_SAFETY':
        return { label: 'Carpenter / Safety', icon: '🦺', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
      default:
        return { label: role, icon: '🛠️', color: 'bg-slate-700/30 text-slate-300 border-slate-700' };
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
              Work Orders & Staff Dispatch
            </h2>
            <p className="text-xs text-slate-400">
              Track incidents, dispatch electricians & plumbers, and manage repairs.
            </p>
          </div>
        </div>

        {/* Filter & Search controls */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search ticket, room, worker..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono w-56"
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
                  <th className="py-3 px-3">Assigned Worker</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredTickets.map((t) => {
                  const roleBadge = getRoleBadge(t.assigned_tech_role || t.category);
                  return (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedTicket(t)}
                      className={`cursor-pointer transition ${
                        selectedTicket?.id === t.id ? 'bg-blue-600/15 border-l-2 border-blue-500' : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-3 px-3 font-mono text-blue-400 font-bold">#{t.ticket_number}</td>
                      <td className="py-3 px-3 font-mono text-slate-200">{t.node_code || 'General'}</td>
                      <td className="py-3 px-3 font-mono text-slate-300 text-[11px]">{t.category || 'TBD'}</td>
                      <td className="py-3 px-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono border ${getStateBadge(t.state)}`}>
                          {t.state}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {t.assigned_tech_name ? (
                          <div className="flex flex-col space-y-0.5">
                            <span className="font-semibold text-slate-100">{t.assigned_tech_name}</span>
                            {roleBadge && (
                              <span className={`inline-flex items-center space-x-1 px-1.5 py-0.2 rounded text-[10px] font-mono border w-fit ${roleBadge.color}`}>
                                <span>{roleBadge.icon}</span>
                                <span>{roleBadge.label}</span>
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 italic text-[11px]">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenAssignModal(t);
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white rounded text-[11px] font-medium border border-slate-700 hover:border-blue-500 transition shadow-sm"
                          title="Assign or change worker"
                        >
                          {t.assigned_tech_name ? 'Reassign' : 'Assign Worker'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredTickets.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 text-xs">
                      No work orders matching the selected filter.
                    </td>
                  </tr>
                )}
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

              {/* Assigned Worker Card */}
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                    <User className="w-3.5 h-3.5 text-blue-400" />
                    <span>Assigned Maintenance Worker</span>
                  </span>
                  <button
                    onClick={() => handleOpenAssignModal(selectedTicket)}
                    className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold transition"
                  >
                    {selectedTicket.assigned_tech_name ? 'Change Worker' : '+ Assign'}
                  </button>
                </div>

                {assignSuccess && (
                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded text-emerald-300 text-xs">
                    {assignSuccess}
                  </div>
                )}

                {selectedTicket.assigned_tech_name ? (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">{selectedTicket.assigned_tech_name}</span>
                      {(() => {
                        const badge = getRoleBadge(selectedTicket.assigned_tech_role || selectedTicket.category);
                        return badge ? (
                          <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-mono border ${badge.color}`}>
                            <span>{badge.icon}</span>
                            <span>{badge.label}</span>
                          </span>
                        ) : null;
                      })()}
                    </div>
                    <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-mono">
                      <Mail className="w-3.5 h-3.5 text-slate-500" />
                      <span>{selectedTicket.assigned_tech_email || 'No email registered'}</span>
                    </div>
                    <div className="flex items-center space-x-1.5 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 w-fit">
                      <span>✓ Dispatched via Resend API</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-2 text-center text-xs text-slate-500 bg-slate-900/50 rounded border border-dashed border-slate-800">
                    No worker assigned yet.{' '}
                    <button
                      onClick={() => handleOpenAssignModal(selectedTicket)}
                      className="text-blue-400 underline hover:text-blue-300 font-semibold ml-1"
                    >
                      Assign now
                    </button>
                  </div>
                )}
              </div>

              {/* Emergency Instructions Card (if recorded) */}
              {selectedTicket.partial_slots?.emergency_instructions && (
                <div className="p-3.5 bg-rose-950/30 border border-rose-500/40 rounded-lg space-y-2 text-xs">
                  <div className="flex items-center space-x-2 text-rose-400 font-bold">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span>{selectedTicket.partial_slots.emergency_instructions.headline}</span>
                  </div>
                  <div className="text-[11px] text-slate-300 bg-rose-900/20 p-2 rounded border border-rose-500/20 space-y-0.5">
                    <p><strong>Route:</strong> {selectedTicket.partial_slots.emergency_instructions.evacuation_route}</p>
                    <p><strong>Assembly:</strong> {selectedTicket.partial_slots.emergency_instructions.assembly_point}</p>
                  </div>
                </div>
              )}

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
              Select a work order from the table to inspect details and assign workers.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Assign Worker (Name, Email, Role) */}
      {isAssignModalOpen && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setIsAssignModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2.5 border-b border-slate-800 pb-3">
              <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Assign Maintenance Worker</h3>
                <p className="text-xs text-slate-400">
                  Assign to Ticket #{selectedTicket.ticket_number} ({selectedTicket.node_code || 'General'})
                </p>
              </div>
            </div>

            {assignError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs">
                {assignError}
              </div>
            )}

            <form onSubmit={handleAssignWorker} className="space-y-3.5">
              {/* Worker Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Worker Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Murugan P"
                  value={workerForm.worker_name}
                  onChange={(e) => setWorkerForm({ ...workerForm, worker_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-sans"
                />
              </div>

              {/* Worker Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Worker Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. murugan.plumber@easwari.edu"
                  value={workerForm.worker_email}
                  onChange={(e) => setWorkerForm({ ...workerForm, worker_email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              {/* Worker Role / Trade */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Worker Role / Trade *
                </label>
                <select
                  value={workerForm.worker_role}
                  onChange={(e) => setWorkerForm({ ...workerForm, worker_role: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-sans"
                >
                  {WORKER_ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.icon} {opt.label} — {opt.desc}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAssigning}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-500/20 transition flex items-center space-x-1.5"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>{isAssigning ? 'Assigning...' : 'Confirm Assignment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
