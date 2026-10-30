import React, { useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { api } from '../api/client';
import { GitBranch, RefreshCw, AlertCircle, ShieldAlert, Cpu, Box } from 'lucide-react';

// Custom Node for Campus Infrastructure & Rooms
const CampusNodeComponent = ({ data }: any) => {
  const isOp = data.is_operational;
  return (
    <div className={`p-3 rounded-lg border shadow-lg min-w-[180px] bg-slate-900 ${
      isOp ? 'border-blue-500/40 text-slate-200' : 'border-rose-500/80 bg-rose-950/20 text-rose-200'
    }`}>
      <Handle type="target" position={Position.Left} className="!bg-blue-400" />
      <div className="flex items-center space-x-1.5 mb-1">
        <Cpu className="w-3.5 h-3.5 text-blue-400" />
        <span className="font-mono font-bold text-xs">{data.node_code}</span>
      </div>
      <div className="text-[11px] text-slate-300 truncate max-w-[160px]">{data.name}</div>
      <div className="mt-1 flex items-center justify-between text-[10px] font-mono">
        <span className="text-slate-500">{data.node_type}</span>
        <span className={`px-1 py-0.2 rounded ${isOp ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
          {isOp ? 'OP' : 'FAULT'}
        </span>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-blue-400" />
    </div>
  );
};

// Custom Node for Incidents & Disruptions
const IncidentNodeComponent = ({ data }: any) => {
  const isCrit = data.priority === 'P0_CRITICAL';
  return (
    <div className={`p-3 rounded-lg border shadow-xl min-w-[200px] ${
      isCrit ? 'bg-rose-950/40 border-rose-500 text-rose-100' : 'bg-amber-950/30 border-amber-500/70 text-amber-100'
    }`}>
      <Handle type="target" position={Position.Left} className="!bg-rose-400" />
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono font-bold text-xs text-rose-400">Incident #{data.ticket_number}</span>
        <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-rose-500/20 text-rose-300">
          {data.priority}
        </span>
      </div>
      <div className="text-[11px] font-mono text-slate-300 mb-1">State: {data.state}</div>
      <div className="text-[10px] text-slate-400 line-clamp-2">{data.description}</div>
      <Handle type="source" position={Position.Right} className="!bg-rose-400" />
    </div>
  );
};

const nodeTypes = {
  campusNode: CampusNodeComponent,
  incidentNode: IncidentNodeComponent,
};

export const ConsequenceGraph: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNodeData, setSelectedNodeData] = useState<any>(null);

  const fetchGraphData = async () => {
    try {
      setLoading(true);
      const res: any = await api.get('/campus/graph');
      setNodes(res.nodes || []);
      setEdges(res.edges || []);
    } catch (err) {
      console.error('Failed to load consequence graph:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraphData();
  }, []);

  const onNodeClick = (_: any, node: Node) => {
    setSelectedNodeData(node.data);
  };

  return (
    <div className="relative h-[calc(100vh-140px)] w-full rounded-xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950 flex flex-col">
      {/* Header Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between z-10">
        <div className="flex items-center space-x-2.5">
          <GitBranch className="w-5 h-5 text-blue-400" />
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">
              Topological Consequence & Causal Cascade Graph
            </h2>
            <p className="text-[11px] text-slate-400">
              Visualizes real-time fault propagation, DAG upstream dependencies, and incident cascading across SRM Easwari infrastructure.
            </p>
          </div>
        </div>

        <button
          onClick={fetchGraphData}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reload Graph</span>
        </button>
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1 w-full h-full relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.2}
          maxZoom={2}
          attributionPosition="bottom-left"
        >
          <Background color="#1e293b" gap={20} size={1} />
          <Controls className="!bg-slate-900 !border-slate-800 !text-slate-300" />
          <MiniMap
            nodeColor={(n) => (n.type === 'incidentNode' ? '#ef4444' : '#3b82f6')}
            className="!bg-slate-900/90 !border-slate-800 !rounded-lg"
          />
        </ReactFlow>

        {/* Node Inspection Modal Drawer */}
        {selectedNodeData && (
          <div className="absolute bottom-4 right-4 z-20 w-80 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl p-4 shadow-2xl text-xs space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-white font-mono">
                {selectedNodeData.node_code || `Ticket #${selectedNodeData.ticket_number}`}
              </span>
              <button
                onClick={() => setSelectedNodeData(null)}
                className="text-slate-400 hover:text-white"
              >
                &times;
              </button>
            </div>
            <div className="text-slate-300 space-y-1 font-mono text-[11px]">
              {selectedNodeData.name && <div>Name: {selectedNodeData.name}</div>}
              {selectedNodeData.building_code && <div>Block: {selectedNodeData.building_code}</div>}
              {selectedNodeData.status && <div>Status: {selectedNodeData.status}</div>}
              {selectedNodeData.priority && <div>Priority: {selectedNodeData.priority}</div>}
              {selectedNodeData.description && <div className="text-slate-400 font-sans">{selectedNodeData.description}</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

