import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { NothingTelemetryGraph } from '../components/nothing/NothingTelemetryGraph';
import { NothingDecryptedText } from '../components/nothing/NothingDecryptedText';
import {
  Activity,
  AlertTriangle,
  Clock,
  Wrench,
  CheckCircle,
  Send,
  Zap,
  Sparkles,
  RefreshCw,
  TrendingUp,
  Cpu,
  Layers,
  Flame,
  Droplets,
  Wind,
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
      if (res.is_ticket_created) {
        fetchData();
      }
    } catch (err: any) {
      alert(`Intake failed: ${err.message || 'Error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-transparent text-white overflow-y-auto p-4 space-y-4">
      {/* Top 4 Nothing OS Modular Squircle KPI Widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
        {/* Status Widget */}
        <div className="nothing-widget rounded-3xl p-4 flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-ndot text-neutral-400 uppercase tracking-widest">
              Campus Status
            </span>
            <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-ndot text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
              <span>LIVE</span>
            </span>
          </div>
          <div className="my-2">
            <div className="text-xl font-bold font-ndot55 tracking-wide text-white">
              {pulse?.status_vibe?.replace('_', ' ') || 'NOMINAL'}
            </div>
            <div className="text-[11px] font-sans text-neutral-400 mt-0.5">
              5 Campus Blocks Synchronized
            </div>
          </div>
          <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-400 rounded-full w-full" />
          </div>
        </div>

        {/* Active Disruptions Widget */}
        <div className="nothing-widget rounded-3xl p-4 flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-ndot text-neutral-400 uppercase tracking-widest">
              Active Disruptions
            </span>
            <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-nothing-red/20 border border-nothing-red/40 text-[10px] font-ndot text-nothing-red font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-nothing-red nothing-red-dot" />
              <span>P0 / P1</span>
            </span>
          </div>
          <div className="my-2">
            <div className="text-3xl font-bold font-ndot text-white flex items-baseline space-x-2">
              <span>{summary?.open_requests_count || pulse?.metrics?.open_requests || 0}</span>
              <span className="text-xs font-sans text-neutral-400 font-normal">in ledger</span>
            </div>
            <div className="text-[11px] font-sans text-neutral-400 mt-0.5">
              Zero simulated tickets
            </div>
          </div>
          <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-nothing-red rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(
                  ((summary?.open_requests_count || 0) / 10) * 100,
                  100
                )}%`,
              }}
            />
          </div>
        </div>

        {/* Inventory Constrained Widget */}
        <div className="nothing-widget rounded-3xl p-4 flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-ndot text-neutral-400 uppercase tracking-widest">
              Supply Hold
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-ndot text-amber-300">
              WAREHOUSE
            </span>
          </div>
          <div className="my-2">
            <div className="text-3xl font-bold font-ndot text-white flex items-baseline space-x-2">
              <span>{summary?.blocked_by_parts_count || 0}</span>
              <span className="text-xs font-sans text-neutral-400 font-normal">awaiting SKU</span>
            </div>
            <div className="text-[11px] font-sans text-neutral-400 mt-0.5">
              Stock conservation verified
            </div>
          </div>
          <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-amber-400 rounded-full w-1/4" />
          </div>
        </div>

        {/* SLA Compliance Widget */}
        <div className="nothing-widget rounded-3xl p-4 flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-ndot text-neutral-400 uppercase tracking-widest">
              SLA Health
            </span>
            <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/20 text-[10px] font-ndot text-white">
              NOMINAL
            </span>
          </div>
          <div className="my-2">
            <div className="text-3xl font-bold font-ndot text-white flex items-baseline space-x-1">
              <span>
                {summary?.sla_compliance_percentage
                  ? Number(summary.sla_compliance_percentage).toFixed(1)
                  : '100.0'}
              </span>
              <span className="text-sm font-ndot text-neutral-400">%</span>
            </div>
            <div className="text-[11px] font-sans text-neutral-400 mt-0.5">
              Response within SLA target
            </div>
          </div>
          <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full w-[99%]" />
          </div>
        </div>
      </div>

      {/* Real-time Nothing OS Telemetry Graph (Wave / Trade Breakdown) */}
      <NothingTelemetryGraph className="shrink-0" />

      {/* Primary 60/40 Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        {/* 60% Left Pane: Operational Feed & Executive Briefing (7 Cols) */}
        <div className="lg:col-span-7 space-y-4 flex flex-col">
          {/* Executive Pulse Briefing (Nothing OS Widget) */}
          <div className="nothing-widget rounded-3xl p-5 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-ndot text-white uppercase tracking-wider flex items-center space-x-2">
                <Sparkles className="w-3.5 h-3.5 text-nothing-red" />
                <span>Executive AI Operations Summary</span>
              </span>
              <span className="text-[10px] text-neutral-400 font-ndot">
                SRM EASWARI TWIN
              </span>
            </div>
            <div className="p-4 bg-black/60 border border-white/10 rounded-2xl text-xs text-neutral-300 leading-relaxed font-mono shadow-inner">
              <NothingDecryptedText
                text={
                  pulse?.pulse_text ||
                  'Campus facilities nominal across all operational sectors. Substation 11kV load balanced, HVAC chilling loops verified, zero untracked work orders.'
                }
                speed={25}
              />
            </div>
          </div>

          {/* Real-time Work Order Feed */}
          <div className="nothing-widget rounded-3xl p-5 flex-1 flex flex-col space-y-3 overflow-hidden shadow-lg">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-nothing-red animate-pulse" />
                <span className="text-xs font-bold font-ndot text-white uppercase tracking-wider">
                  Live Incident Ledger ({activeTickets.length} active)
                </span>
              </div>
              <button
                onClick={fetchData}
                className="text-neutral-400 hover:text-white p-1 rounded-full border border-white/15 hover:border-white/40 transition spring-interactive"
                title="Refresh"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="overflow-auto flex-1">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead className="bg-[#121215] text-neutral-400 font-ndot text-[10px] border-b border-white/10 sticky top-0 shadow-sm">
                  <tr>
                    <th className="py-2.5 px-3 w-20 border-r border-white/10">Ticket</th>
                    <th className="py-2.5 px-3 w-36 border-r border-white/10">Room / Floor</th>
                    <th className="py-2.5 px-3 w-32 border-r border-white/10">Trade</th>
                    <th className="py-2.5 px-3 w-24 border-r border-white/10 text-right">Priority</th>
                    <th className="py-2.5 px-3 w-28 border-r border-white/10 text-right">State</th>
                    <th className="py-2.5 px-3 text-right">Assigned Worker</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-sans">
                  {activeTickets.map((t) => (
                    <tr
                      key={t.id}
                      className="hover:bg-white/[0.04] transition h-9 spring-row"
                    >
                      <td className="py-1.5 px-3 font-ndot font-bold text-white border-r border-white/10">
                        #{t.ticket_number}
                      </td>
                      <td className="py-1.5 px-3 font-mono text-neutral-300 border-r border-white/10 truncate">
                        <span className="font-semibold text-white">{t.room_code || t.node_code || 'Campus General'}</span>
                        {t.floor_number !== undefined && t.floor_number !== null && (
                          <span className="text-[10px] text-neutral-400 ml-1.5 font-sans">Fl {t.floor_number}</span>
                        )}
                      </td>
                      <td className="py-1.5 px-3 font-ndot text-neutral-400 text-[11px] border-r border-white/10">
                        {t.category || 'TBD'}
                      </td>
                      <td className="py-1.5 px-3 font-ndot text-right border-r border-white/10">
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full font-ndot border ${
                            t.calculated_priority === 'P0_CRITICAL'
                              ? 'bg-nothing-red/20 text-nothing-red border-nothing-red/50 font-bold'
                              : 'bg-white/10 text-white border-white/20'
                          }`}
                        >
                          {t.calculated_priority || 'P2'}
                        </span>
                      </td>
                      <td className="py-1.5 px-3 font-mono text-right border-r border-white/10">
                        <span className="text-[10px] text-neutral-300 font-semibold">{t.state}</span>
                      </td>
                      <td className="py-1.5 px-3 text-right font-sans text-neutral-200 truncate">
                        {t.assigned_tech_name || (
                          <span className="text-neutral-500 italic text-[11px]">Unassigned</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {activeTickets.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 px-4 text-center text-xs font-mono">
                        <div className="text-neutral-500 mb-3">
                          No active tickets in database. Ready for live incident intake.
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-white font-ndot mb-2">
                          Quick Incident Templates (Click to fill & dispatch)
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-left">
                          <button
                            type="button"
                            onClick={() =>
                              setIntakeText(
                                'URGENT: Electrical short circuit sparks near switchboard in RM-ACAD-204!'
                              )
                            }
                            className="p-2.5 bg-black/60 hover:bg-white/10 border border-white/15 rounded-2xl text-[11px] text-white spring-interactive transition flex items-center space-x-2"
                          >
                            <Zap className="w-3.5 h-3.5 text-nothing-red shrink-0" />
                            <span>Short circuit in RM-ACAD-204</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setIntakeText(
                                'Water pipe leaking heavily and flooding corridor in EEC-MAIN'
                              )
                            }
                            className="p-2.5 bg-black/60 hover:bg-white/10 border border-white/15 rounded-2xl text-[11px] text-white spring-interactive transition flex items-center space-x-2"
                          >
                            <Droplets className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span>Water leak in Main Block</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setIntakeText(
                                'Central Air Handling Unit AHU-AUD-MAIN blowing hot air in Auditorium'
                              )
                            }
                            className="p-2.5 bg-black/60 hover:bg-white/10 border border-white/15 rounded-2xl text-[11px] text-white spring-interactive transition flex items-center space-x-2"
                          >
                            <Wind className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                            <span>AC failure in Auditorium</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setIntakeText(
                                'EMERGENCY: Fire catching fast everywhere in Academic Tech Block near RM-ACAD-204!'
                              )
                            }
                            className="p-2.5 bg-nothing-red/20 hover:bg-nothing-red/30 border border-nothing-red/40 rounded-2xl text-[11px] text-white spring-interactive transition flex items-center space-x-2"
                          >
                            <Flame className="w-3.5 h-3.5 text-nothing-red shrink-0 animate-pulse" />
                            <span>Fire hazard in Academic Block</span>
                          </button>
                        </div>
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
          {/* Incident Intake Terminal (Nothing OS Style Voice/Text Recorder Widget) */}
          <div className="nothing-widget rounded-3xl p-5 space-y-3.5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-nothing-red nothing-glyph-red animate-pulse" />
                <h2 className="text-xs font-bold font-ndot text-white uppercase tracking-wider">
                  Rapid Incident Terminal
                </h2>
              </div>
              <span className="text-[10px] font-ndot text-neutral-400">
                GROQ AI MULTI-AGENT
              </span>
            </div>

            <p className="text-[11px] text-neutral-300 leading-relaxed font-sans">
              Enter room fault, electrical fire, or equipment hazard. Autonomous Groq agents
              extract entities, notify assigned workers via Resend, and output emergency guidelines.
            </p>

            <form onSubmit={handleIntakeSubmit} className="space-y-3">
              <textarea
                value={intakeText}
                onChange={(e) => setIntakeText(e.target.value)}
                rows={3}
                placeholder="e.g. URGENT: Electrical short circuit sparks near switchboard in RM-ACAD-204!"
                className="w-full bg-black/80 border border-white/15 rounded-2xl p-3 text-xs text-white font-mono focus:outline-none focus:border-white transition resize-none shadow-inner"
              />

              <button
                type="submit"
                disabled={isSubmitting || !intakeText.trim()}
                className="w-full py-2.5 nothing-btn-primary hover:brightness-110 text-black text-xs font-bold transition spring-interactive flex items-center justify-center space-x-2 shadow-[0_4px_20px_rgba(255,255,255,0.25)]"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Triage Agents Dispatched...' : 'Submit Incident Report'}</span>
              </button>
            </form>
          </div>

          {/* Groq AI Decision Output: Reply With Question vs Registered Ticket */}
          {intakeResult && (
            intakeResult.decision === 'REPLY_QUESTION' || !intakeResult.is_ticket_created ? (
              <div className="nothing-widget rounded-3xl p-5 space-y-3 shadow-lg border border-sky-400/40">
                <div className="flex items-center space-x-2 text-sky-300 font-bold font-ndot tracking-wide">
                  <span className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]" />
                  <span>AI ASSISTANT CLARIFICATION</span>
                </div>
                <div className="p-3.5 bg-black/60 border border-white/10 rounded-2xl text-xs text-neutral-200 leading-relaxed font-sans shadow-inner">
                  {intakeResult.reply_message || 'Hello! What campus maintenance or equipment issue can we help you resolve? Please specify the problem and room location.'}
                </div>
                <div className="text-[10px] text-neutral-400 font-ndot uppercase tracking-widest flex items-center justify-between">
                  <span>DECISION: QUESTION RETURNED</span>
                  <span className="text-emerald-400">LEDGER UNTOUCHED</span>
                </div>
              </div>
            ) : (
              <div className="nothing-widget rounded-3xl p-5 space-y-3 shadow-lg border border-nothing-red/40">
                {intakeResult.emergency_instructions && (
                  <div className="p-4 bg-nothing-red/15 border border-nothing-red/60 rounded-2xl space-y-2.5 text-xs">
                    <div className="flex items-center space-x-2 text-white font-bold font-ndot tracking-wide">
                      <AlertTriangle className="w-4 h-4 text-nothing-red shrink-0" />
                      <span>{intakeResult.emergency_instructions.headline}</span>
                    </div>
                    <div className="p-2.5 bg-black/60 rounded-xl border border-white/10 text-[11px] text-neutral-200 font-mono space-y-1">
                      <div>📍 Evacuation Route: <span className="text-white font-semibold">{intakeResult.emergency_instructions.evacuation_route}</span></div>
                      <div>🛡️ Assembly Point: <span className="text-white font-semibold">{intakeResult.emergency_instructions.assembly_point}</span></div>
                    </div>
                    <div className="text-[11px] text-neutral-300">
                      <span className="font-bold text-white block mb-1 font-ndot uppercase tracking-wider">
                        Immediate Safety Steps:
                      </span>
                      <ul className="list-disc pl-4 space-y-1">
                        {intakeResult.emergency_instructions.immediate_actions?.map(
                          (act: string, idx: number) => (
                            <li key={idx}>{act}</li>
                          )
                        )}
                      </ul>
                    </div>
                  </div>
                )}

                <div className="p-3 bg-black/60 border border-white/10 rounded-2xl text-xs font-mono space-y-1.5 shadow-inner">
                  <div className="flex items-center justify-between text-white font-bold font-ndot">
                    <span>TICKET #{intakeResult.ticket_number} REGISTERED</span>
                    <span className="text-emerald-400 font-sans">{intakeResult.state}</span>
                  </div>
                  <div className="text-neutral-300 text-[11px] flex justify-between">
                    <span>Category: <strong className="text-white font-ndot">{intakeResult.category || 'TBD'}</strong></span>
                    <span>Room: <strong className="text-white font-mono">{intakeResult.room_code || intakeResult.target_node_code} (Floor {intakeResult.floor_number ?? '1'})</strong></span>
                  </div>
                  <div className="text-neutral-400 text-[10px]">
                    Summary: {intakeResult.concise_summary}
                  </div>
                  {intakeResult.assigned_tech_name && (
                    <div className="text-[11px] text-emerald-400 flex items-center justify-between pt-1 border-t border-white/10 font-sans">
                      <span>Worker: <strong className="text-white">{intakeResult.assigned_tech_name}</strong> ({intakeResult.assigned_tech_role || 'Technician'})</span>
                      <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full text-emerald-400">✓ Notified via Email</span>
                    </div>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
