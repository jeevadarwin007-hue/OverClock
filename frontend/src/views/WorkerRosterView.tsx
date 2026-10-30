import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  UserPlus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Mail,
  Shield,
  Briefcase,
  X,
  Search,
} from 'lucide-react';

interface Worker {
  id: string;
  full_name: string;
  email: string;
  role: string;
  skills: string[];
  is_available: boolean;
  active_workload_count: number;
  max_concurrent_workload: number;
}

const TRADE_ROLES = [
  { value: 'ELECTRICAL', label: 'Electrician (Electrical & Power Systems)', icon: '⚡' },
  { value: 'PLUMBING', label: 'Plumber (Water & Drainage Systems)', icon: '🔧' },
  { value: 'HVAC', label: 'HVAC Technician (AC & Cooling Units)', icon: '❄️' },
  { value: 'NETWORK', label: 'Network Engineer (LAN, Switches & WiFi)', icon: '🌐' },
  { value: 'AV_EQUIPMENT', label: 'AV Technician (Projectors & Acoustics)', icon: '📽️' },
  { value: 'STRUCTURAL_SAFETY', label: 'Safety Officer / Fire Marshall', icon: '🚨' },
];

export const WorkerRosterView: React.FC = () => {
  const { currentUser } = useAuth();
  const isAdmin = currentUser.role === 'SYS_ADMIN' || currentUser.role === 'FACILITIES_ADMIN';

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Registration Drawer Form State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState('ELECTRICAL');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchWorkers = async () => {
    try {
      setLoading(true);
      const res = await api.get<Worker[]>('/staff/workers');
      setWorkers(res);
    } catch (err: any) {
      console.error('Failed to load workers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, [currentUser]);

  const handleRegisterWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setStatusMessage({ text: 'Only System Administrators can register workers.', isError: true });
      return;
    }
    if (!formName.trim() || !formEmail.trim()) {
      setStatusMessage({ text: 'Full Name and Email Address are required.', isError: true });
      return;
    }

    try {
      setIsSubmitting(true);
      setStatusMessage(null);
      await api.post('/staff/workers', {
        full_name: formName.trim(),
        email: formEmail.trim().toLowerCase(),
        role: formRole,
      });

      setStatusMessage({ text: `Worker "${formName}" registered successfully!`, isError: false });
      setFormName('');
      setFormEmail('');
      setIsDrawerOpen(false);
      fetchWorkers();
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Failed to register worker.', isError: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteWorker = async (workerId: string, name: string) => {
    if (!isAdmin) return;
    if (!confirm(`Are you sure you want to deregister worker "${name}"?`)) return;

    try {
      await api.delete(`/staff/workers/${workerId}`);
      setStatusMessage({ text: `Worker "${name}" deregistered.`, isError: false });
      fetchWorkers();
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Failed to deregister worker.', isError: true });
    }
  };

  const filteredWorkers = workers.filter((w) => {
    const q = searchQuery.toLowerCase();
    return (
      w.full_name.toLowerCase().includes(q) ||
      w.email.toLowerCase().includes(q) ||
      w.role.toLowerCase().includes(q)
    );
  });

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Action Bar */}
      <div className="h-12 border-b border-slate-800 bg-slate-900/80 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-blue-400" />
            <h1 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Maintenance Personnel & Trade Roster
            </h1>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
            {workers.length} Registered Personnel
          </span>
          {!isAdmin && (
            <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Read-Only View (Admin required for registration)
            </span>
          )}
        </div>

        <div className="flex items-center space-x-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Filter by name, email, trade..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-2.5 pl-8 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono w-56"
            />
          </div>

          <button
            onClick={fetchWorkers}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 text-xs transition"
            title="Refresh Roster"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {isAdmin && (
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold shadow transition border border-blue-500"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Register Worker</span>
            </button>
          )}
        </div>
      </div>

      {/* Feedback Alert Strip */}
      {statusMessage && (
        <div
          className={`px-4 py-2 text-xs flex items-center justify-between border-b ${
            statusMessage.isError
              ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
              : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
          }`}
        >
          <div className="flex items-center space-x-2">
            {statusMessage.isError ? (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Workspace Split: Roster Ledger (Edge-to-Edge) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Ledger Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono sticky top-0 z-10">
              <tr>
                <th className="py-2 px-3 w-8 border-r border-slate-800 text-center">●</th>
                <th className="py-2 px-3 border-r border-slate-800">Worker Full Name</th>
                <th className="py-2 px-3 border-r border-slate-800">Email Address (Notifications)</th>
                <th className="py-2 px-3 border-r border-slate-800">Primary Trade / Specialty</th>
                <th className="py-2 px-3 border-r border-slate-800 text-right">Active Workload</th>
                <th className="py-2 px-3 border-r border-slate-800 text-right">Duty Status</th>
                {isAdmin && <th className="py-2 px-3 w-20 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-sans">
              {filteredWorkers.map((w) => {
                const trade = TRADE_ROLES.find((t) => t.value === w.role);
                return (
                  <tr key={w.id} className="hover:bg-slate-900/60 transition h-9">
                    <td className="py-2 px-3 border-r border-slate-800 text-center">
                      <span
                        className={`inline-block w-1.5 h-1.5 rounded-full ${
                          w.is_available ? 'bg-emerald-400' : 'bg-slate-600'
                        }`}
                        title={w.is_available ? 'Active on duty' : 'Off duty'}
                      />
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-100 border-r border-slate-800">
                      {w.full_name}
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-300 border-r border-slate-800">
                      {w.email}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-800">
                      <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-blue-500/10 text-blue-300 border border-blue-500/20">
                        <span>{trade?.icon || '🛠️'}</span>
                        <span>{trade?.label.split(' (')[0] || w.role}</span>
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono text-right border-r border-slate-800 text-slate-300">
                      {w.active_workload_count} / {w.max_concurrent_workload} tickets
                    </td>
                    <td className="py-2 px-3 text-right border-r border-slate-800">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-mono border ${
                          w.is_available
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {w.is_available ? 'AVAILABLE' : 'OFF_SHIFT'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="py-2 px-3 text-right">
                        <button
                          onClick={() => handleDeleteWorker(w.id, w.full_name)}
                          className="p-1 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded transition"
                          title="Deregister worker"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
              {filteredWorkers.length === 0 && (
                <tr>
                  <td
                    colSpan={isAdmin ? 7 : 6}
                    className="py-16 text-center text-slate-500 text-xs font-mono"
                  >
                    {workers.length === 0
                      ? 'No maintenance workers registered yet. Click "+ Register Worker" above to add electricians, plumbers, and technicians.'
                      : 'No workers match the search query.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Slide-Over Drawer for Worker Registration */}
        {isDrawerOpen && (
          <div className="w-[400px] border-l border-slate-800 bg-slate-900 p-4 flex flex-col justify-between shrink-0 shadow-2xl z-20">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <UserPlus className="w-4 h-4 text-blue-400" />
                  <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                    Register Maintenance Personnel
                  </h2>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-[11px] text-slate-400 py-3 leading-relaxed">
                Add an operational technician to the campus maintenance roster. Incident intake will
                automatically score and dispatch verified work orders to them via the Groq AI agent and
                Resend email integration.
              </p>

              <form onSubmit={handleRegisterWorker} className="space-y-3 pt-2">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">
                    Worker Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Murugan P"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">
                    Notification Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. murugan.plumber@easwari.edu"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">
                    Primary Trade / Skill *
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                  >
                    {TRADE_ROLES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.icon} {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded text-xs font-bold transition shadow-md flex items-center justify-center space-x-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'Registering...' : 'Register Worker'}</span>
                  </button>
                </div>
              </form>
            </div>

            <div className="pt-4 border-t border-slate-800 text-[10px] text-slate-500 font-mono">
              Role Authority: SYS_ADMIN &bull; Shift Window: 365 Days Active &bull; Max Workload: 5
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

