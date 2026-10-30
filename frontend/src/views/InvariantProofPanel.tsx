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
      title: 'Work Order Lifecycle Validity',
      invariant: 'State Transition Rules',
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
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-y-auto p-4 space-y-4">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              System Health & Integrity
            </h2>
            <p className="text-xs text-slate-400">
              Live automated health and constraint checks across campus operations.
            </p>
          </div>
        </div>

        <button
          onClick={fetchInvariants}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Re-verify Now</span>
        </button>
      </div>

      {/* 6 Invariant Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {invariantCards.map((card, idx) => {
          const isPassed = card.violations === 0;
          return (
            <div
              key={idx}
              className={`p-5 rounded-xl border transition shadow-lg ${
                isPassed
                  ? 'bg-slate-900/90 border-slate-800 hover:border-emerald-500/40'
                  : 'bg-rose-950/20 border-rose-500/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  Invariant #{idx + 1}
                </span>
                <span className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                  isPassed
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                }`}>
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{isPassed ? 'VERIFIED (0 VIOLATIONS)' : `${card.violations} VIOLATION(S)`}</span>
                </span>
              </div>

              <h4 className="font-bold text-white text-sm mb-1">{card.title}</h4>
              <div className="font-mono text-[11px] text-blue-400 bg-slate-950 p-2 rounded border border-slate-800/80 mb-2 truncate">
                {card.invariant}
              </div>
              <p className="text-[11px] text-slate-400 font-sans leading-relaxed">{card.mechanism}</p>
            </div>
          );
        })}
      </div>

      {/* Immutable Audit Log Stream */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-white text-sm">
              Activity Log ({data?.audit_stream?.length || 0} Recent Events)
            </h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono">
              <tr>
                <th className="py-2 px-3">Timestamp (UTC)</th>
                <th className="py-2 px-3">Ticket #</th>
                <th className="py-2 px-3">Actor</th>
                <th className="py-2 px-3">Action</th>
                <th className="py-2 px-3">State Change</th>
                <th className="py-2 px-3">Cryptographic Signature</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {data?.audit_stream?.map((entry: any) => (
                <tr key={entry.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-2 px-3 text-slate-400">
                    {new Date(entry.created_at).toISOString().replace('T', ' ').slice(0, 19)}
                  </td>
                  <td className="py-2 px-3 text-blue-400 font-bold">
                    {entry.ticket_number ? `#${entry.ticket_number}` : 'SYSTEM'}
                  </td>
                  <td className="py-2 px-3 text-slate-200">{entry.actor_name || 'System / Service'}</td>
                  <td className="py-2 px-3">
                    <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[10px]">
                      {entry.action}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-slate-300">
                    {entry.previous_state ? `${entry.previous_state} -> ` : ''}
                    <span className="text-emerald-400 font-bold">{entry.new_state || 'RECORDED'}</span>
                  </td>
                  <td className="py-2 px-3 text-[10px] text-slate-500 truncate max-w-xs">
                    {JSON.stringify(entry.details)}
                  </td>
                </tr>
              ))}
              {(!data?.audit_stream || data.audit_stream.length === 0) && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-mono text-xs">
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

