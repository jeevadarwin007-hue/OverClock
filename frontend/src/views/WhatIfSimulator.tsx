import React, { useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  FlaskConical,
  Play,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Zap,
  Building,
  RotateCcw,
} from 'lucide-react';

export const WhatIfSimulator: React.FC = () => {
  const { currentUser } = useAuth();
  const [scenarioType, setScenarioType] = useState('ROOM_UNAVAILABLE');
  const [targetNode, setTargetNode] = useState('RM-ACAD-204');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState<'PLAN_A' | 'PLAN_B'>('PLAN_A');

  const handleRunSimulation = async () => {
    try {
      setIsSimulating(true);
      setExecutionResult(null);
      const res: any = await api.post('/simulations', {
        scenario_type: scenarioType,
        target_node_code: targetNode,
        description: `What-If dry run for ${scenarioType} on ${targetNode}`,
      });
      setSimulationResult(res);
      setSelectedPlan(res.recommended_plan || 'PLAN_A');
    } catch (err: any) {
      alert(`Simulation failed: ${err.message || 'Error'}`);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleExecutePlan = async () => {
    if (!simulationResult) return;
    try {
      setIsExecuting(true);
      const res: any = await api.post(`/simulations/${simulationResult.simulation_id}/execute`, {
        selected_plan: selectedPlan,
      });
      setExecutionResult(res);
    } catch (err: any) {
      alert(`Execution failed: ${err.message || 'Error'}`);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2.5">
            <FlaskConical className="w-5 h-5 text-purple-400" />
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Deterministic What-If Consequence Simulator
              </h2>
              <p className="text-xs text-slate-400">
                Explore cascading operational consequences across SRM Easwari infrastructure without mutating live database state.
              </p>
            </div>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
            Zero-Mutation Dry Run Mode
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Preset Scenarios */}
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1.5">Disruption Scenario</label>
            <select
              value={scenarioType}
              onChange={(e) => {
                setScenarioType(e.target.value);
                if (e.target.value === 'ROOM_UNAVAILABLE') setTargetNode('RM-ACAD-204');
                if (e.target.value === 'SWITCH_FAILURE') setTargetNode('SW-CORE-ACAD-F3');
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
            >
              <option value="ROOM_UNAVAILABLE">Scenario 1: Pre-Exam Outage (RM-ACAD-204)</option>
              <option value="SWITCH_FAILURE">Scenario 2: Wi-Fi Storm / Switch Failure (SW-CORE-ACAD-F3)</option>
              <option value="TECH_UNAVAILABLE">Technician Unavailable (Dynamic Shift Handoff)</option>
              <option value="SIMULTANEOUS_DISRUPTION">Simultaneous Quad-Failure (High Stress)</option>
            </select>
          </div>

          {/* Target Infrastructure Node */}
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1.5">Target Campus Node</label>
            <input
              type="text"
              value={targetNode}
              onChange={(e) => setTargetNode(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
            />
          </div>

          {/* Trigger Button */}
          <div className="flex items-end">
            <button
              onClick={handleRunSimulation}
              disabled={isSimulating}
              className="w-full flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white p-2.5 rounded-lg text-xs font-bold shadow-lg shadow-purple-500/20 transition"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isSimulating ? 'Evaluating Cascades...' : 'Run Dry-Run Simulation'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Simulation Results Display */}
      {simulationResult && (
        <div className="space-y-6">
          {/* Consequence Step Cascade */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center space-x-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Simulated Consequence Chain ({simulationResult.consequence_chain?.length} Causal Steps)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {simulationResult.consequence_chain?.map((step: any) => (
                <div
                  key={step.step_number}
                  className="bg-slate-950 border border-slate-800/80 rounded-lg p-3 text-xs flex flex-col justify-between space-y-2 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-slate-500 font-bold">STEP #{step.step_number}</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                      step.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {step.entity_type}
                    </span>
                  </div>
                  <div className="font-semibold text-slate-200 text-[11px] leading-snug">{step.title}</div>
                  <div className="text-[10px] text-slate-400 leading-normal">{step.description}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Side-by-Side Trade-Off Matrix (Plan A vs Plan B) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Plan A Card */}
            <div
              onClick={() => setSelectedPlan('PLAN_A')}
              className={`p-6 rounded-xl border cursor-pointer transition relative overflow-hidden ${
                selectedPlan === 'PLAN_A'
                  ? 'bg-slate-900 border-emerald-500/80 ring-2 ring-emerald-500/20 shadow-2xl'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-bold text-emerald-400">PLAN A</span>
                {simulationResult.plan_a.recommended && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Recommended Strategy
                  </span>
                )}
              </div>
              <h4 className="font-bold text-white text-sm mb-2">{simulationResult.plan_a.name}</h4>
              <p className="text-xs text-slate-400 mb-4">{simulationResult.plan_a.strategy}</p>

              <div className="grid grid-cols-3 gap-2 text-xs font-mono mb-4">
                <div className="bg-slate-950 p-2 rounded border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Exam Delay</span>
                  <span className="text-emerald-400 font-bold">{simulationResult.plan_a.sla_impact_minutes} min</span>
                </div>
                <div className="bg-slate-950 p-2 rounded border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Cost</span>
                  <span className="text-slate-200 font-bold">Rs. {simulationResult.plan_a.estimated_cost}</span>
                </div>
                <div className="bg-slate-950 p-2 rounded border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Disruption</span>
                  <span className="text-emerald-400 font-bold">{simulationResult.plan_a.disruption_score}/100</span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-300">
                <span className="text-[11px] font-mono text-slate-500 block">Orchestrated Actions:</span>
                {simulationResult.plan_a.actions?.map((act: string, idx: number) => (
                  <div key={idx} className="flex items-start space-x-2 text-[11px]">
                    <span className="text-emerald-400">&bull;</span>
                    <span>{act}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Plan B Card */}
            <div
              onClick={() => setSelectedPlan('PLAN_B')}
              className={`p-6 rounded-xl border cursor-pointer transition relative overflow-hidden ${
                selectedPlan === 'PLAN_B'
                  ? 'bg-slate-900 border-amber-500/80 ring-2 ring-amber-500/20 shadow-2xl'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-bold text-amber-400">PLAN B</span>
                {simulationResult.plan_b.recommended && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Recommended Strategy
                  </span>
                )}
              </div>
              <h4 className="font-bold text-white text-sm mb-2">{simulationResult.plan_b.name}</h4>
              <p className="text-xs text-slate-400 mb-4">{simulationResult.plan_b.strategy}</p>

              <div className="grid grid-cols-3 gap-2 text-xs font-mono mb-4">
                <div className="bg-slate-950 p-2 rounded border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Exam Delay</span>
                  <span className="text-rose-400 font-bold">{simulationResult.plan_b.sla_impact_minutes} min</span>
                </div>
                <div className="bg-slate-950 p-2 rounded border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Cost</span>
                  <span className="text-amber-400 font-bold">Rs. {simulationResult.plan_b.estimated_cost}</span>
                </div>
                <div className="bg-slate-950 p-2 rounded border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Disruption</span>
                  <span className="text-rose-400 font-bold">{simulationResult.plan_b.disruption_score}/100</span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-300">
                <span className="text-[11px] font-mono text-slate-500 block">Orchestrated Actions:</span>
                {simulationResult.plan_b.actions?.map((act: string, idx: number) => (
                  <div key={idx} className="flex items-start space-x-2 text-[11px]">
                    <span className="text-amber-400">&bull;</span>
                    <span>{act}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Execution Footer */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <div>
                <div className="text-xs font-bold text-white">Execute Selected Plan: {selectedPlan}</div>
                <div className="text-[11px] text-slate-400 font-mono">
                  State Fingerprint: {simulationResult.state_fingerprint} &bull; Revalidates live invariants before commit.
                </div>
              </div>
            </div>

            <button
              onClick={handleExecutePlan}
              disabled={isExecuting || simulationResult.is_executed || !!executionResult}
              className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-xs font-bold shadow-lg shadow-emerald-500/20 transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isExecuting ? 'Revalidating & Committing...' : executionResult ? 'Plan Executed' : `Commit & Execute ${selectedPlan}`}</span>
            </button>
          </div>

          {/* Live Execution Output Banner */}
          {executionResult && (
            <div className="p-5 bg-emerald-950/30 border border-emerald-500/50 rounded-xl text-xs space-y-2 font-mono">
              <div className="flex items-center justify-between">
                <span className="text-emerald-400 font-bold text-sm">RECOVERY PLAN COMMITTED ATOMICALLY</span>
                <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">STATUS: EXECUTED</span>
              </div>
              <div className="text-slate-200">{executionResult.message}</div>
              <div className="text-slate-400 text-[11px]">
                Work Order Created: Ticket #{executionResult.ticket_number} &bull; Room Relocation Confirmed.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

