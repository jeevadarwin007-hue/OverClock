import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import {
  ShieldCheck,
  ShieldAlert,
  Database,
  CheckCircle2,
  Lock,
  GitCommit,
  RefreshCw,
  Terminal,
  Activity,
} from 'lucide-react';

export const InvariantProofPanel: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchInvariants = async () => {
    try {
      setLoading(true);
      const res: any = await api.get('/invariants');
      setData(res);
    } catch (err) {
      console.error('Failed to fetch invariant verification data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvariants();
    const interval = setInterval(fetchInvariants, 8000);
    return () => clearInterval(interval);
  }, []);

  const invariantCards = [
    {
      title: 'Room Double-Booking Guard',
      invariant: 'Strict Schedule Isolation',
      violations: data?.invariants?.overlapping_bookings ?? 0,
      mechanism: 'Prevents overlapping bookings and guarantees conflict-free exam and class scheduling.',
    },
    {
      title: 'Inventory Conservation',
      invariant: 'Stock Balance Verification',
      violations: data?.invariants?.stock_drift_skus ?? 0,
      mechanism: 'Ensures that warehouse physical on-hand stock exactly equals available plus reserved items.',
    },
    {
      title: 'Infrastructure Graph Integrity',
      invariant: 'DAG Acyclicity Guard',
      violations: data?.invariants?.dag_cycles ?? 0,
      mechanism: 'Guarantees no circular dependencies across campus electrical, PoE, and HVAC lines.',
    },
    {
      title: 'Stock Ledger Protection',
      invariant: 'Non-Negative Inventory Balance',
      violations: data?.invariants?.untracked_balance_updates ?? 0,
      mechanism: 'Blocks untracked inventory modifications and prevents negative stock balances.',
    },
    {
      title: 'State Transition Integrity',
      invariant: 'FSM Transition Guard',
      violations: data?.invariants?.illegal_fsm_jumps ?? 0,
      mechanism: 'Enforces authorized progression through intake, triage, parts assignment, and resolution.',
    },
    {
      title: 'Tamper-Proof Audit Trail',
      invariant: 'Append-Only Ledger',
      violations: data?.invariants?.tampered_audit_rows ?? 0,
      mechanism: 'Guarantees that historical operational records cannot be altered or deleted.',
    },
  ];

  return (
    <div className="swiss-page-content h-full flex flex-col bg-transparent text-white overflow-y-auto p-4 space-y-4 font-sans">
      {/* Header Banner */}
      <div className="nothing-widget rounded-3xl p-5 shadow-lg flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-white/10 text-white rounded-2xl border border-white/20 shadow-sm spring-interactive">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight font-ndot">
              System Invariants & Mathematical Proofs
            </h2>
            <p className="text-xs text-neutral-400 font-sans mt-0.5">
              Live automated constraints and relational proof invariants across campus operations.
            </p>
          </div>
        </div>

        <button
          onClick={fetchInvariants}
          className="flex items-center space-x-1.5 px-4 py-2 nothing-btn-outline text-white text-xs font-semibold transition spring-interactive shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Re-verify Now</span>
        </button>
      </div>

      {/* 6 Invariant Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {invariantCards.map((card, idx) => {
          const isPassed = card.violations === 0;
          return (
            <div
              key={idx}
              className={`nothing-widget rounded-3xl p-5 transition spring-interactive shadow-md ${
                isPassed ? 'border-white/10' : 'border-nothing-red/50 bg-nothing-red/10'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-ndot text-[10px] text-neutral-400 font-bold uppercase tracking-widest">
                  Invariant #{idx + 1}
                </span>
                <span
                  className={`flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-ndot border ${
                    isPassed
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-nothing-red/20 text-nothing-red border-nothing-red/40 font-bold'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isPassed ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-nothing-red nothing-red-dot'
                    }`}
                  />
                  <span>{isPassed ? 'VERIFIED (0 VIO)' : `${card.violations} VIOLATION`}</span>
                </span>
              </div>
              <h3 className="text-sm font-bold text-white mb-1.5 font-sans">{card.title}</h3>
              <div className="font-ndot text-xs text-neutral-300 bg-black/60 p-2.5 rounded-2xl border border-white/10 mb-2.5 truncate shadow-inner">
                {card.invariant}
              </div>
              <p className="text-xs text-neutral-400 font-sans leading-relaxed">{card.mechanism}</p>
            </div>
          );
        })}
      </div>

      {/* Activity Log Stream */}
      <div className="nothing-widget rounded-3xl p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-nothing-red" />
            <h3 className="font-bold text-white text-xs uppercase tracking-wider font-ndot">
              Cryptographic Audit Stream ({data?.audit_stream?.length || 0} Recent Events)
            </h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#121215] text-neutral-400 border-b border-white/10 font-ndot text-[10px]">
              <tr>
                <th className="py-2.5 px-3 border-r border-white/10">Timestamp (UTC)</th>
                <th className="py-2.5 px-3 border-r border-white/10">Ticket #</th>
                <th className="py-2.5 px-3 border-r border-white/10">Actor</th>
                <th className="py-2.5 px-3 border-r border-white/10">Action</th>
                <th className="py-2.5 px-3 border-r border-white/10">State Change</th>
                <th className="py-2.5 px-3">Proof Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-[11px]">
              {data?.audit_stream?.map((entry: any) => (
                <tr key={entry.id} className="hover:bg-white/[0.03] transition spring-row h-9">
                  <td className="py-2 px-3 text-neutral-400 border-r border-white/10">
                    {new Date(entry.created_at).toISOString().replace('T', ' ').slice(0, 19)}
                  </td>
                  <td className="py-2 px-3 text-white font-bold font-ndot border-r border-white/10">
                    {entry.ticket_number ? `#${entry.ticket_number}` : 'SYSTEM'}
                  </td>
                  <td className="py-2 px-3 text-white border-r border-white/10 font-sans">
                    {entry.actor_name || 'System / Service'}
                  </td>
                  <td className="py-2 px-3 border-r border-white/10">
                    <span className="px-2 py-0.5 rounded-full bg-white/10 text-white border border-white/20 text-[10px] font-ndot">
                      {entry.action}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-neutral-300 border-r border-white/10 font-sans">
                    {entry.previous_state ? `${entry.previous_state} → ` : ''}
                    <span className="text-white font-bold">{entry.new_state || 'RECORDED'}</span>
                  </td>
                  <td className="py-2 px-3 text-[10px] text-neutral-400 truncate max-w-xs">
                    {JSON.stringify(entry.details)}
                  </td>
                </tr>
              ))}
              {(!data?.audit_stream || data.audit_stream.length === 0) && (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-neutral-500 font-ndot text-xs">
                    No activity recorded in audit ledger yet. Operational events will be immutably recorded here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
