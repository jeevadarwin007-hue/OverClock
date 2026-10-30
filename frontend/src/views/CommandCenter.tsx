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
  TrendingUp,
  Cpu,
  Layers,
  ArrowUpRight,
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
      setActiveTickets(ticketsData.slice(0, 10));
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
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'ELEVATED_ATTENTION':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'SLA_WARNING':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-y-auto p-4 space-y-4">
      {/* Top Telemetry & Health Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
        <div className="bg-slate-900 border border-slate-800 rounded p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
              Campus Status
            </span>
            <div className="text-sm font-bold text-white font-mono mt-0.5">
              {pulse?.status_vibe?.replace('_', ' ') || 'OPERATIONAL'}
            </div>
          </div>
          <span
            className={`text-[9px] px-2 py-0.5 rounded font-mono border ${getVibeBadge(
              pulse?.status_vibe || 'STABLE'
            )}`}
          >
            LIVE
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
              Active Disruptions
            </span>
            <div className="text-sm font-bold text-rose-400 font-mono mt-0.5">
              {summary?.open_requests_count || pulse?.metrics?.open_requests || 0} Open
            </div>
          </div>
          <span className="text-[9px] px-2 py-0.5 rounded font-mono bg-rose-500/10 text-rose-400 border border-rose-500/25">
            P0/P1
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
              Inventory Constrained
            </span>
            <div className="text-sm font-bold text-amber-400 font-mono mt-0.5">
              {summary?.blocked_by_parts_count || 0} Blocked
            </div>
          </div>
          <span className="text-[9px] px-2 py-0.5 rounded font-mono bg-amber-500/10 text-amber-400 border border-amber-500/25">
            Store Hold
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
              SLA Compliance
            </span>
            <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
              {summary?.sla_compliance_percentage
                ? Number(summary.sla_compliance_percentage).toFixed(1)
                : 100.0}
              %
            </div>
          </div>
          <span className="text-[9px] px-2 py-0.5 rounded font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
            Nominal
          </span>
        </div>
      </div>

      {/* Primary 60/40 Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        {/* 60% Left Pane: Operational Briefing & Active Incident Stream (7 Cols) */}
        <div className="lg:col-span-7 space-y-4 flex flex-col">
          {/* Executive Pulse Briefing */}
          <div className="bg-slate-900 border border-slate-800 rounded p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Executive Operations Briefing</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">SRM Easwari Digital Twin</span>
            </div>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded text-xs text-slate-300 leading-relaxed font-mono">
              {pulse?.pulse_text || 'Campus facilities nominal across all operational sectors.'}
            </div>
          </div>

          {/* Real-time Work Order Feed */}
          <div className="bg-slate-900 border border-slate-800 rounded p-3.5 flex-1 flex flex-col space-y-2 overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center space-x-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>Live Operational Feed ({activeTickets.length} active)</span>
              </span>
              <button
                onClick={fetchData}
                className="text-slate-400 hover:text-white p-1 rounded transition"
                title="Refresh"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="overflow-auto flex-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-950 text-slate-400 font-mono text-[10px] border-b border-slate-800 sticky top-0">
                  <tr>
                    <th className="py-1.5 px-2.5 w-16 border-r border-slate-800">Ticket</th>
                    <th className="py-1.5 px-2.5 border-r border-slate-800">Location</th>
                    <th className="py-1.5 px-2.5 border-r border-slate-800">Category</th>
                    <th className="py-1.5 px-2.5 border-r border-slate-800 text-right">Priority</th>
                    <th className="py-1.5 px-2.5 border-r border-slate-800 text-right">State</th>
                    <th className="py-1.5 px-2.5 text-right">Assigned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {activeTickets.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-950/60 transition h-8">
                      <td className="py-1 px-2.5 font-mono font-bold text-blue-400 border-r border-slate-800">
                        #{t.ticket_number}
                      </td>
                      <td className="py-1 px-2.5 font-mono text-slate-300 border-r border-slate-800">
                        {t.node_code || 'General'}
                      </td>
                      <td className="py-1 px-2.5 font-mono text-slate-400 text-[11px] border-r border-slate-800">
                        {t.category || 'TBD'}
                      </td>
                      <td className="py-1 px-2.5 font-mono text-right border-r border-slate-800">
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded border ${
                            t.calculated_priority === 'P0_CRITICAL'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {t.calculated_priority || 'P2'}
                        </span>
                      </td>
                      <td className="py-1 px-2.5 font-mono text-right border-r border-slate-800">
                        <span className="text-[10px] text-slate-300">{t.state}</span>
                      </td>
                      <td className="py-1 px-2.5 text-right font-mono text-slate-300">
                        {t.assigned_tech_name || (
                          <span className="text-slate-600 italic">Unassigned</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {activeTickets.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 text-xs font-mono">
                        No active work orders.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 40% Right Pane: Incident Reporting & Emergency Protocols (5 Cols) */}
        <div className="lg:col-span-5 space-y-4 flex flex-col">
          {/* Incident Intake Terminal */}
          <div className="bg-slate-900 border border-slate-800 rounded p-3.5 space-y-3">
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono">
                Rapid Incident Intake
              </h2>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
              Describe room fault, fire hazard, or equipment breakdown. Multi-agent AI extracts entities
              and dispatches instructions.
            </p>

            <form onSubmit={handleIntakeSubmit} className="space-y-2.5">
              <textarea
                value={intakeText}
                onChange={(e) => setIntakeText(e.target.value)}
                rows={3}
                placeholder="e.g. URGENT: Electrical short circuit sparks near switchboard in RM-ACAD-204!"
                className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500 resize-none"
              />

              <button
                type="submit"
                disabled={isSubmitting || !intakeText.trim()}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded text-xs font-bold font-mono transition flex items-center justify-center space-x-1.5 shadow"
              >
                <Send className="w-3 h-3" />
                <span>{isSubmitting ? 'Analyzing & Routing...' : 'Submit Incident Report'}</span>
              </button>
            </form>
          </div>

          {/* Real-time Emergency Protocol Output (Instruction Agent + Anti-Hallucination) */}
          {intakeResult && (
            <div className="bg-slate-900 border border-slate-800 rounded p-3.5 space-y-2.5">
              {intakeResult.emergency_instructions && (
                <div className="p-3 bg-rose-950/40 border border-rose-500/60 rounded space-y-2 text-xs">
                  <div className="flex items-center space-x-1.5 text-rose-400 font-bold">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{intakeResult.emergency_instructions.headline}</span>
                  </div>
                  <div className="p-2 bg-rose-900/30 rounded border border-rose-500/30 text-[11px] text-rose-200 font-mono">
                    📍 Route: {intakeResult.emergency_instructions.evacuation_route}
                    <br />
                    🛡️ Assembly: {intakeResult.emergency_instructions.assembly_point}
                  </div>
                  <div className="text-[11px] text-slate-200">
                    <span className="font-bold text-rose-300 block mb-1">Immediate Safety Steps:</span>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {intakeResult.emergency_instructions.immediate_actions?.map(
                        (act: string, idx: number) => (
                          <li key={idx}>{act}</li>
                        )
                      )}
                    </ul>
                  </div>
                </div>
              )}

              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded text-xs font-mono space-y-1">
                <div className="flex items-center justify-between text-blue-400 font-bold">
                  <span>Ticket #{intakeResult.ticket_number}</span>
                  <span>{intakeResult.state}</span>
                </div>
                <div className="text-slate-300 text-[11px]">
                  Category: <span className="text-white">{intakeResult.category || 'TBD'}</span>
                </div>
                <div className="text-slate-400 text-[10px]">
                  Summary: {intakeResult.concise_summary}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
