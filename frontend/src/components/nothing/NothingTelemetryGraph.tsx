import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import { Activity, Zap, TrendingUp, ShieldAlert, Cpu } from 'lucide-react';

const SAMPLE_HOURLY_DATA = [
  { time: '00:00', incidents: 1, resolved: 1, load: 12 },
  { time: '03:00', incidents: 0, resolved: 0, load: 8 },
  { time: '06:00', incidents: 2, resolved: 1, load: 18 },
  { time: '09:00', incidents: 8, resolved: 6, load: 64 },
  { time: '11:00', incidents: 12, resolved: 10, load: 82 },
  { time: '13:00', incidents: 7, resolved: 8, load: 55 },
  { time: '15:00', incidents: 14, resolved: 12, load: 91 },
  { time: '17:00', incidents: 9, resolved: 9, load: 60 },
  { time: '19:00', incidents: 4, resolved: 5, load: 35 },
  { time: '21:00', incidents: 2, resolved: 3, load: 20 },
  { time: '23:00', incidents: 1, resolved: 2, load: 14 },
];

const TRADE_BREAKDOWN = [
  { trade: 'ELEC', name: 'Electrical', active: 3, resolved: 18, capacity: 85 },
  { trade: 'PLUMB', name: 'Plumbing', active: 2, resolved: 14, capacity: 60 },
  { trade: 'HVAC', name: 'HVAC Units', active: 4, resolved: 11, capacity: 90 },
  { trade: 'NET', name: 'Network IT', active: 1, resolved: 22, capacity: 40 },
  { trade: 'AV', name: 'AV Tech', active: 1, resolved: 9, capacity: 30 },
  { trade: 'FIRE', name: 'Life Safety', active: 0, resolved: 6, capacity: 15 },
];

export const NothingTelemetryGraph: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [viewMode, setViewMode] = useState<'wave' | 'trade'>('wave');
  const [timeRange, setTimeRange] = useState<'24H' | '7D' | '30D'>('24H');

  return (
    <div className={`nothing-widget rounded-3xl p-5 space-y-4 ${className}`}>
      {/* Widget Header in Nothing OS Dot-Matrix Style */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
            <Activity className="w-4 h-4 text-nothing-red animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-ndot text-sm tracking-wider uppercase text-white font-bold">
                Operational Telemetry Wave
              </span>
              <span className="inline-block w-2 h-2 rounded-full bg-nothing-red nothing-red-dot" />
            </div>
            <p className="text-[11px] font-mono text-neutral-400">
              Real-time incident frequency vs technician resolution throughput
            </p>
          </div>
        </div>

        {/* Nothing OS Segmented Pill Controls */}
        <div className="flex items-center space-x-1 bg-black/60 p-1 rounded-full border border-white/15 self-start sm:self-auto">
          <button
            onClick={() => setViewMode('wave')}
            className={`px-3 py-1 rounded-full text-[11px] font-ndot transition spring-interactive ${
              viewMode === 'wave'
                ? 'bg-white text-black font-bold shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Incident Waves
          </button>
          <button
            onClick={() => setViewMode('trade')}
            className={`px-3 py-1 rounded-full text-[11px] font-ndot transition spring-interactive ${
              viewMode === 'trade'
                ? 'bg-white text-black font-bold shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Trade Capacity
          </button>
        </div>
      </div>

      {/* KPI Readout Pills */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 font-mono text-xs">
        <div className="p-3 bg-white/[0.03] border border-white/10 rounded-2xl flex flex-col">
          <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-ndot">Peak Incident Vol</span>
          <span className="text-xl font-ndot text-white font-bold mt-1">14 <span className="text-xs font-sans text-neutral-400 font-normal">req/hr</span></span>
        </div>
        <div className="p-3 bg-white/[0.03] border border-white/10 rounded-2xl flex flex-col">
          <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-ndot">Mean SLA Margin</span>
          <span className="text-xl font-ndot text-nothing-red font-bold mt-1">99.4 <span className="text-xs font-sans text-neutral-400 font-normal">%</span></span>
        </div>
        <div className="p-3 bg-white/[0.03] border border-white/10 rounded-2xl flex flex-col">
          <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-ndot">Active Technician Load</span>
          <span className="text-xl font-ndot text-white font-bold mt-1">11 <span className="text-xs font-sans text-neutral-400 font-normal">on shift</span></span>
        </div>
        <div className="p-3 bg-white/[0.03] border border-white/10 rounded-2xl flex flex-col">
          <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-ndot">Autonomous Triage</span>
          <span className="text-xl font-ndot text-white font-bold mt-1">100 <span className="text-xs font-sans text-neutral-400 font-normal">% Groq AI</span></span>
        </div>
      </div>

      {/* Main Graph Visualization Area */}
      <div className="h-56 w-full pt-2">
        {viewMode === 'wave' ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={SAMPLE_HOURLY_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="nothingRedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#d73832" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#d73832" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="nothingWhiteGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ffffff" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#ffffff" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis
                dataKey="time"
                stroke="#666670"
                fontSize={10}
                tickLine={false}
                fontFamily="Space Grotesk"
              />
              <YAxis
                stroke="#666670"
                fontSize={10}
                tickLine={false}
                fontFamily="Space Grotesk"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0a0a0c',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '16px',
                  fontFamily: 'Space Grotesk',
                  fontSize: '11px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
                }}
                labelStyle={{ color: '#ffffff', fontFamily: 'NDot57', letterSpacing: '0.05em' }}
              />
              <Area
                type="monotone"
                dataKey="incidents"
                name="New Incidents"
                stroke="#d73832"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#nothingRedGrad)"
              />
              <Area
                type="monotone"
                dataKey="resolved"
                name="Resolved"
                stroke="#ffffff"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#nothingWhiteGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={TRADE_BREAKDOWN} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="name" stroke="#666670" fontSize={10} tickLine={false} fontFamily="Space Grotesk" />
              <YAxis stroke="#666670" fontSize={10} tickLine={false} fontFamily="Space Grotesk" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0a0a0c',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '16px',
                  fontFamily: 'Space Grotesk',
                  fontSize: '11px',
                }}
              />
              <Bar dataKey="active" name="Active Tickets" fill="#d73832" radius={[6, 6, 0, 0]} />
              <Bar dataKey="resolved" name="Resolved This Week" fill="#ffffff" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Graph Legend & Status Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[10px] font-mono text-neutral-400">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-nothing-red" />
            <span className="text-white">Active Disruptions</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-white" />
            <span className="text-white">Resolved Throughput</span>
          </div>
        </div>
        <span className="font-ndot text-neutral-500">SAMPLING: 10 SECONDS INTERVAL</span>
      </div>
    </div>
  );
};
