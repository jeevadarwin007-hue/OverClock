import React, { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Zap, Wifi, Server, Activity, ShieldCheck, AlertCircle } from 'lucide-react';

const initialNodes = [
  {
    id: '1',
    type: 'default',
    position: { x: 40, y: 120 },
    data: {
      label: (
        <div className="p-3 bg-[#0e0e11] border border-white/20 rounded-2xl text-left font-mono space-y-1 shadow-xl hover:border-white transition spring-interactive">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-neutral-400 font-ndot">SUBSTATION-MAIN</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
          </div>
          <div className="text-xs font-bold text-white font-sans flex items-center space-x-1">
            <Zap className="w-3 h-3 text-nothing-red" />
            <span>11kV Campus Substation</span>
          </div>
          <div className="text-[10px] text-neutral-500">Nominal 11.2 kV • 0 Alerts</div>
        </div>
      ),
    },
    style: { background: 'transparent', border: 'none', padding: 0 },
  },
  {
    id: '2',
    type: 'default',
    position: { x: 300, y: 40 },
    data: {
      label: (
        <div className="p-3 bg-[#0e0e11] border border-white/20 rounded-2xl text-left font-mono space-y-1 shadow-xl hover:border-white transition spring-interactive">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-neutral-400 font-ndot">PANEL-ACAD-F2</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
          </div>
          <div className="text-xs font-bold text-white font-sans flex items-center space-x-1">
            <Zap className="w-3 h-3 text-white" />
            <span>Academic 2nd Fl DB</span>
          </div>
          <div className="text-[10px] text-neutral-500">Feed to RM-ACAD-204</div>
        </div>
      ),
    },
    style: { background: 'transparent', border: 'none', padding: 0 },
  },
  {
    id: '3',
    type: 'default',
    position: { x: 300, y: 220 },
    data: {
      label: (
        <div className="p-3 bg-[#0e0e11] border border-white/20 rounded-2xl text-left font-mono space-y-1 shadow-xl hover:border-white transition spring-interactive">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-neutral-400 font-ndot">SW-CORE-CAMPUS</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
          </div>
          <div className="text-xs font-bold text-white font-sans flex items-center space-x-1">
            <Server className="w-3 h-3 text-white" />
            <span>10Gbps Optical Switch</span>
          </div>
          <div className="text-[10px] text-neutral-500">Backbone Latency 0.4ms</div>
        </div>
      ),
    },
    style: { background: 'transparent', border: 'none', padding: 0 },
  },
  {
    id: '4',
    type: 'default',
    position: { x: 580, y: 120 },
    data: {
      label: (
        <div className="p-3 bg-[#0e0e11] border border-nothing-red/50 rounded-2xl text-left font-mono space-y-1 shadow-xl hover:border-nothing-red transition spring-interactive ring-1 ring-nothing-red/30">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-nothing-red font-ndot font-bold">RM-ACAD-204</span>
            <span className="w-2 h-2 rounded-full bg-nothing-red nothing-red-dot" />
          </div>
          <div className="text-xs font-bold text-white font-sans flex items-center space-x-1">
            <Activity className="w-3 h-3 text-nothing-red" />
            <span>AI Computing & Web Lab</span>
          </div>
          <div className="text-[10px] text-neutral-400">Depends on: Panel F2 & Switch F3</div>
        </div>
      ),
    },
    style: { background: 'transparent', border: 'none', padding: 0 },
  },
  {
    id: '5',
    type: 'default',
    position: { x: 580, y: 260 },
    data: {
      label: (
        <div className="p-3 bg-[#0e0e11] border border-white/20 rounded-2xl text-left font-mono space-y-1 shadow-xl hover:border-white transition spring-interactive">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-neutral-400 font-ndot">AHU-AUD-MAIN</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
          </div>
          <div className="text-xs font-bold text-white font-sans flex items-center space-x-1">
            <Zap className="w-3 h-3 text-white" />
            <span>TRP Auditorium AHU</span>
          </div>
          <div className="text-[10px] text-neutral-500">Airflow 12,000 CFM</div>
        </div>
      ),
    },
    style: { background: 'transparent', border: 'none', padding: 0 },
  },
];

const initialEdges: Edge[] = [
  {
    id: 'e1-2',
    source: '1',
    target: '2',
    animated: true,
    style: { stroke: '#d73832', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#d73832' },
  },
  {
    id: 'e1-3',
    source: '1',
    target: '3',
    animated: true,
    style: { stroke: '#ffffff', strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#ffffff' },
  },
  {
    id: 'e2-4',
    source: '2',
    target: '4',
    animated: true,
    style: { stroke: '#d73832', strokeWidth: 2.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#d73832' },
  },
  {
    id: 'e3-4',
    source: '3',
    target: '4',
    animated: true,
    style: { stroke: '#ffffff', strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#ffffff' },
  },
  {
    id: 'e1-5',
    source: '1',
    target: '5',
    animated: true,
    style: { stroke: '#ffffff', strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#ffffff' },
  },
];

export const NothingTopologicalGraph: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <div className={`nothing-widget rounded-3xl p-5 flex flex-col space-y-3 ${className}`}>
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
            <Zap className="w-3.5 h-3.5 text-nothing-red" />
          </div>
          <div>
            <span className="font-ndot text-xs uppercase tracking-wider text-white font-bold block">
              Topological Dependency Graph (DAG)
            </span>
            <span className="text-[10px] font-mono text-neutral-400">
              Interactive structural cascading consequence network • Drag nodes to inspect
            </span>
          </div>
        </div>
        <span className="text-[10px] font-ndot px-2.5 py-1 rounded-full bg-black/60 border border-white/20 text-neutral-300">
          ACYCLIC VERIFIED
        </span>
      </div>

      <div className="w-full h-80 rounded-2xl overflow-hidden border border-white/10 bg-[#08080a] relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          attributionPosition="bottom-left"
        >
          <Background color="#333338" gap={18} size={1} />
          <Controls className="!bg-[#121215] !border-white/20 !rounded-xl !text-white" />
        </ReactFlow>
      </div>

      <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 pt-1">
        <span>● Red edges denote active critical electrical supply lines</span>
        <span>Drag nodes • Zoom with scroll • Click to highlight</span>
      </div>
    </div>
  );
};
