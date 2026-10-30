import React, { useState, useEffect } from 'react';
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
  Building,
  RefreshCw,
} from 'lucide-react';

export const CommandCenter: React.FC = () => {
  const { currentUser } = useAuth();
  const [pulse, setPulse] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [activeTickets, setActiveTickets] = useState<any[]>([]);
  const [intakeText, setIntakeText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [intakeResult, setIntakeResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pulseData, summaryData, ticketsData] = await Promise.all([
        api.get<any>('/pulse'),
        api.get<any>('/analytics/summary'),
        api.get<any[]>('/work-orders'),
      ]);
      setPulse(pulseData);
      setSummary(summaryData);
      setActiveTickets(ticketsData.slice(0, 8));
    } catch (err) {
      console.error('Error fetching command center data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [currentUser]);

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
      fetchData();
    } catch (err: any) {
      alert(`Intake failed: ${err.message || 'Error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getVibeBadge = (vibe: string) => {
    switch (vibe) {
      case 'STABLE':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'ELEVATED_ATTENTION':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'SLA_WARNING':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Pulse & KPI Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grounded Campus Pulse Briefing */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2.5">
              <Sparkles className="w-5 h-5 text-blue-400" />
              <h2 className="text-base font-bold text-white tracking-tight">
                Campus Overview
              </h2>
            </div>
            {pulse && (
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${getVibeBadge(pulse.status_vibe)}`}>
                {pulse.status_vibe.replace('_', ' ')}
              </span>
            )}
          </div>

          <div className="p-4 bg-slate-950/70 border border-slate-800/80 rounded-lg text-slate-300 text-sm leading-relaxed font-sans mb-4">
            {pulse?.pulse_text || 'All systems running smoothly across SRM Easwari campus.'}
          </div>

          {pulse?.metrics && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-800/50 p-2.5 rounded border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Active Requests</span>
                <span className="text-base font-bold text-white">{pulse.metrics.open_requests}</span>
              </div>
              <div className="bg-slate-800/50 p-2.5 rounded border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Critical Alerts</span>
                <span className="text-base font-bold text-rose-400">{pulse.metrics.critical_requests}</span>
              </div>
              <div className="bg-slate-800/50 p-2.5 rounded border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Pending Parts</span>
                <span className="text-base font-bold text-amber-400">{pulse.metrics.blocked_by_parts}</span>
              </div>
              <div className="bg-slate-800/50 p-2.5 rounded border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Technicians</span>
                <span className="text-base font-bold text-emerald-400">
                  {pulse.metrics.available_technicians_on_shift} Available
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Live KPI Metric Cards */}
        <div className="space-y-3">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-rose-500/10 rounded-lg text-rose-400 border border-rose-500/20">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium">Critical Disruptions</span>
                <div className="text-xl font-bold text-white font-mono">{summary?.open_requests_count || 0}</div>
              </div>
            </div>
            <span className="text-xs text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
              P0 / P1
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-amber-500/10 rounded-lg text-amber-400 border border-amber-500/20">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium">Blocked on Parts</span>
                <div className="text-xl font-bold text-white font-mono">{summary?.blocked_by_parts_count || 0}</div>
              </div>
            </div>
            <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              Procurement
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium">SLA Compliance</span>
                <div className="text-xl font-bold text-white font-mono">
                  {summary?.sla_compliance_percentage ? Number(summary.sla_compliance_percentage).toFixed(1) : 100.0}%
                </div>
              </div>
            </div>
            <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Operational
            </span>
          </div>
        </div>
      </div>

      {/* Quick Incident Intake & Live Work Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Simple Incident Intake Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <Zap className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-white text-sm">Report an Issue</h3>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Describe the maintenance issue or equipment failure. The system will categorize and route the ticket automatically.
            </p>

            <form onSubmit={handleIntakeSubmit} className="space-y-3">
              <textarea
                value={intakeText}
                onChange={(e) => setIntakeText(e.target.value)}
                rows={3}
                placeholder="e.g., Air conditioning in RM-ACAD-204 is leaking water and not cooling..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
              />

              <div className="flex items-center justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting || !intakeText.trim()}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-500/20 transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Submitting...' : 'Submit Report'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Intake Response Card */}
          {intakeResult && (
            <div className="mt-4 p-3.5 bg-slate-950 border border-slate-800 rounded-lg text-xs space-y-1.5 font-mono">
              <div className="flex items-center justify-between">
                <span className="text-emerald-400 font-bold">Ticket #{intakeResult.ticket_number}</span>
                <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px]">
                  {intakeResult.state}
                </span>
              </div>
              <div className="text-slate-300">
                <span className="text-slate-500">Node:</span> {intakeResult.target_node_code || 'Unresolved'} &bull;{' '}
                <span className="text-slate-500">Category:</span> {intakeResult.category}
              </div>
              {intakeResult.clarification_needed && (
                <div className="text-amber-400 text-[11px] bg-amber-500/10 p-2 rounded border border-amber-500/20">
                  {intakeResult.clarification_question}
                </div>
              )}
              {intakeResult.correlation_action !== 'NONE' && (
                <div className="text-purple-400 text-[10px]">
                  Correlation: {intakeResult.correlation_action}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Active Incident Stream Table */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-blue-400" />
              <h3 className="font-bold text-white text-sm">Recent Incidents</h3>
            </div>
            <button
              onClick={fetchData}
              className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono">
                <tr>
                  <th className="py-2.5 px-3">Ticket #</th>
                  <th className="py-2.5 px-3">Room / Asset</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Priority</th>
                  <th className="py-2.5 px-3">State</th>
                  <th className="py-2.5 px-3">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {activeTickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-500">
                      No active operational incidents recorded.
                    </td>
                  </tr>
                ) : (
                  activeTickets.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-3 font-mono text-blue-400">#{t.ticket_number}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-200">
                        {t.node_code || 'General'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 font-mono text-[11px]">{t.category}</td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                          t.calculated_priority === 'P0_CRITICAL'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {t.calculated_priority}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px]">
                        <span className={`px-2 py-0.5 rounded border ${
                          t.state === 'BLOCKED_PARTS'
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                            : t.state === 'TRIAGED'
                            ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                            : 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                        }`}>
                          {t.state}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 truncate max-w-xs" title={t.raw_description}>
                        {t.raw_description}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

