import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Progress } from 'antd';
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
  Activity,
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
  { value: 'ELECTRICAL', label: 'Electrician (Electrical & Power)', icon: '⚡' },
  { value: 'PLUMBING', label: 'Plumber (Water & Drainage)', icon: '🔧' },
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

  const totalCapacity = workers.reduce((sum, w) => sum + (w.max_concurrent_workload || 4), 0);
  const activeWorkload = workers.reduce((sum, w) => sum + (w.active_workload_count || 0), 0);
  const fleetUtilization = totalCapacity > 0 ? Math.round((activeWorkload / totalCapacity) * 100) : 0;

  return (
    <div className="h-full flex flex-col bg-transparent text-white overflow-hidden">
      {/* Top Action Bar */}
      <div className="h-[50px] border-b border-white/10 bg-black/80 backdrop-blur-xl px-4 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-nothing-red" />
            <h1 className="text-xs font-bold uppercase tracking-wider text-white font-ndot">
              Maintenance Fleet & Trade Roster
            </h1>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-ndot bg-white/10 text-white border border-white/20">
            {workers.length} Personnel
          </span>
          {!isAdmin && (
            <span className="text-[10px] px-2.5 py-0.5 rounded-full font-ndot bg-white/5 text-neutral-400 border border-white/10">
              Read-Only View (Admin required for registration)
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2.5">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Filter by name, email, trade..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#121215] border border-white/15 rounded-full px-2.5 pl-8 py-1 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white font-mono w-56 shadow-inner"
            />
          </div>

          <button
            onClick={fetchWorkers}
            className="p-1.5 bg-[#121215] hover:bg-white/10 text-white rounded-full border border-white/15 text-xs transition spring-interactive shadow-sm"
            title="Refresh Roster"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Feedback Alert Strip */}
      {statusMessage && (
        <div
          className={`px-4 py-2.5 text-xs flex items-center justify-between border-b ${
            statusMessage.isError
              ? 'bg-nothing-red/20 text-white border-nothing-red/50 font-ndot'
              : 'bg-white/10 text-white border-white/20 font-ndot'
          }`}
        >
          <div className="flex items-center space-x-2">
            {statusMessage.isError ? (
              <AlertTriangle className="w-4 h-4 text-nothing-red shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-neutral-400 hover:text-white spring-interactive">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Workspace Split: Roster Ledger (60/40 Asymmetric Split) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane: Ledger Table */}
        <div className="flex-1 border-r border-white/10 overflow-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#121215] text-neutral-400 border-b border-white/10 font-ndot sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="py-2.5 px-3 w-8 border-r border-white/10 text-center">●</th>
                <th className="py-2.5 px-3 w-40 border-r border-white/10">Worker Name</th>
                <th className="py-2.5 px-3 w-56 border-r border-white/10">Email (Resend API)</th>
                <th className="py-2.5 px-3 w-40 border-r border-white/10">Trade Role</th>
                <th className="py-2.5 px-3 w-32 border-r border-white/10 text-right">Workload</th>
                <th className="py-2.5 px-3 w-28 border-r border-white/10 text-right">Status</th>
                {isAdmin && <th className="py-2.5 px-3 w-16 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              {filteredWorkers.map((w) => {
                const trade = TRADE_ROLES.find((t) => t.value === w.role);
                const percent = Math.round((w.active_workload_count / (w.max_concurrent_workload || 4)) * 100);
                return (
                  <tr key={w.id} className="hover:bg-white/[0.03] transition h-10 spring-row">
                    <td className="py-2 px-3 border-r border-white/10 text-center">
                      <span
                        className={`inline-block w-1.5 h-1.5 rounded-full ${
                          w.is_available ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-neutral-600'
                        }`}
                        title={w.is_available ? 'Active on duty' : 'Off duty'}
                      />
                    </td>
                    <td className="py-2 px-3 font-semibold text-white border-r border-white/10 truncate">
                      {w.full_name}
                    </td>
                    <td className="py-2 px-3 font-mono text-neutral-300 border-r border-white/10 truncate">
                      {w.email}
                    </td>
                    <td className="py-2 px-3 border-r border-white/10">
                      <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-ndot bg-white/10 text-white border border-white/20">
                        <span>{trade?.icon || '🛠️'}</span>
                        <span>{trade?.label.split(' (')[0] || w.role}</span>
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right border-r border-white/10">
                      <div className="flex items-center justify-end space-x-2">
                        <span className="font-ndot text-[11px] text-white">
                          {w.active_workload_count}/{w.max_concurrent_workload}
                        </span>
                        <div className="w-12">
                          <Progress
                            percent={percent}
                            showInfo={false}
                            size="small"
                            strokeColor={percent > 75 ? '#d73832' : '#ffffff'}
                            trailColor="rgba(255, 255, 255, 0.1)"
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right border-r border-white/10">
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-ndot border ${
                          w.is_available
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                        }`}
                      >
                        {w.is_available ? 'ACTIVE' : 'OFF'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="py-2 px-3 text-right">
                        <button
                          onClick={() => handleDeleteWorker(w.id, w.full_name)}
                          className="p-1.5 hover:bg-nothing-red/20 text-neutral-400 hover:text-nothing-red rounded-full transition spring-interactive"
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
                    className="py-16 text-center text-neutral-500 text-xs font-ndot"
                  >
                    {workers.length === 0
                      ? 'No maintenance workers registered yet. Use the registration panel on the right to add technicians.'
                      : 'No workers match the search query.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Right Pane: Persistent Worker Operations & Registration Command Station */}
        <div className="w-[420px] bg-[#0c0c0e]/95 backdrop-blur-2xl border-l border-white/10 p-5 flex flex-col justify-between shrink-0 shadow-2xl z-10 overflow-y-auto space-y-4">
          <div className="space-y-4">
            {/* Fleet Workload KPI Widget with Ant Design Progress */}
            <div className="nothing-widget rounded-3xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-ndot text-neutral-400 uppercase tracking-widest block">
                  Fleet Utilization
                </span>
                <div className="text-2xl font-bold font-ndot text-white mt-1">
                  {fleetUtilization}%
                </div>
                <div className="text-[11px] font-sans text-neutral-400 mt-0.5">
                  {activeWorkload} active of {totalCapacity} total capacity
                </div>
              </div>
              <Progress
                type="circle"
                percent={fleetUtilization}
                size={54}
                strokeColor={{
                  '0%': '#ffffff',
                  '100%': '#d73832',
                }}
                trailColor="rgba(255, 255, 255, 0.1)"
              />
            </div>

            {isAdmin ? (
              <div className="nothing-widget rounded-3xl p-5 space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <div className="flex items-center space-x-2">
                    <UserPlus className="w-4 h-4 text-nothing-red" />
                    <h2 className="text-xs font-bold text-white uppercase tracking-wider font-ndot">
                      Register Maintenance Worker
                    </h2>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-ndot bg-white/10 text-white border border-white/20">
                    Admin Only
                  </span>
                </div>

                <form onSubmit={handleRegisterWorker} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-ndot uppercase tracking-widest text-neutral-400 mb-1">
                      Worker Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Murugan P"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full bg-black/80 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-ndot uppercase tracking-widest text-neutral-400 mb-1">
                      Notification Email (Resend API) *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. murugan.plumber@easwari.edu"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full bg-black/80 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-ndot uppercase tracking-widest text-neutral-400 mb-1">
                      Primary Trade / Specialty *
                    </label>
                    <select
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value)}
                      className="w-full bg-black/80 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-sans cursor-pointer"
                    >
                      {TRADE_ROLES.map((t) => (
                        <option key={t.value} value={t.value} className="bg-black text-white">
                          {t.icon} {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-2.5 nothing-btn-primary text-black font-bold text-xs transition spring-interactive flex items-center justify-center space-x-1.5 shadow-[0_4px_16px_rgba(255,255,255,0.25)]"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>{isSubmitting ? 'Registering...' : 'Register Worker'}</span>
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="p-4 bg-black/60 rounded-2xl border border-white/10 text-xs text-neutral-400 space-y-2">
                <div className="flex items-center space-x-2 text-white font-ndot">
                  <Shield className="w-4 h-4 text-nothing-red" />
                  <span>Administrative Privilege Required</span>
                </div>
                <p>
                  Worker onboarding and email dispatch notifications can only be registered by Campus Facilities Administrators. Switch persona in the top status bar.
                </p>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-white/10 text-[10px] text-neutral-500 font-ndot flex items-center justify-between">
            <span>RESEND: INTEGRATED</span>
            <span>AUTONOMOUS DISPATCH: ON</span>
          </div>
        </div>
      </div>
    </div>
  );
};
