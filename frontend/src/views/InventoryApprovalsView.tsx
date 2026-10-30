import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Layers,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Package,
  Plus,
  Shield,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';

const CATEGORY_OPTIONS = [
  { value: 'ELECTRICAL', label: 'Electrical' },
  { value: 'HVAC', label: 'HVAC & Cooling' },
  { value: 'PLUMBING', label: 'Plumbing & Water' },
  { value: 'NETWORK', label: 'Network & IT Infrastructure' },
  { value: 'AV_EQUIPMENT', label: 'Audio / Visual Equipment' },
  { value: 'FURNITURE', label: 'Furniture & Fixtures' },
  { value: 'STRUCTURAL_SAFETY', label: 'Structural Safety & Fire' },
];

export const InventoryApprovalsView: React.FC = () => {
  const { currentUser } = useAuth();
  const [parts, setParts] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Add Part Modal State
  const [isAddPartModalOpen, setIsAddPartModalOpen] = useState(false);
  const [partForm, setPartForm] = useState({
    sku: '',
    name: '',
    category: 'ELECTRICAL',
    quantity: 10,
    unit_cost: 350.00,
    reorder_threshold: 2,
    lead_time_hours: 24,
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [inventoryData, approvalsData] = await Promise.all([
        api.get<any[]>('/inventory'),
        api.get<any[]>('/approvals'),
      ]);
      setParts(inventoryData);
      setApprovals(approvalsData);
    } catch (err) {
      console.error('Failed to fetch inventory or approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  const handleApprove = async (approvalId: string) => {
    setActionMessage(null);
    try {
      await api.post(`/approvals/${approvalId}/approve`, {});
      setActionMessage(`Approval granted successfully!`);
      fetchData();
    } catch (err: any) {
      setActionMessage(err.message || 'Separation of duties violation: Requester cannot approve their own request.');
    }
  };

  const handleReject = async (approvalId: string) => {
    setActionMessage(null);
    try {
      await api.post(`/approvals/${approvalId}/reject`, { notes: 'Rejected by operational authority.' });
      setActionMessage(`Approval request rejected.`);
      fetchData();
    } catch (err: any) {
      setActionMessage(err.message || 'Reject failed: Requester cannot reject their own request.');
    }
  };

  const handleAddPart = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);

    if (!partForm.sku.trim()) {
      setActionMessage('Part SKU is required (e.g. PART-AC-CAP-50).');
      return;
    }
    if (!partForm.name.trim()) {
      setActionMessage('Part Name is required.');
      return;
    }

    try {
      await api.post('/inventory/parts', {
        sku: partForm.sku.trim().toUpperCase(),
        name: partForm.name.trim(),
        category: partForm.category,
        quantity: Number(partForm.quantity),
        unit_cost: Number(partForm.unit_cost),
        reorder_threshold: Number(partForm.reorder_threshold),
        lead_time_hours: Number(partForm.lead_time_hours),
      });

      setActionMessage(`Part ${partForm.sku.toUpperCase()} registered successfully!`);
      setIsAddPartModalOpen(false);
      setPartForm({
        sku: '',
        name: '',
        category: 'ELECTRICAL',
        quantity: 10,
        unit_cost: 350.00,
        reorder_threshold: 2,
        lead_time_hours: 24,
      });
      fetchData();
    } catch (err: any) {
      setActionMessage(err.message || 'Failed to register part. Check if SKU already exists.');
    }
  };

  const handleDeletePart = async (part: any) => {
    if (!window.confirm(`Delete part ${part.sku} (${part.name}) from inventory?`)) return;
    try {
      await api.delete(`/inventory/parts/${part.id}`);
      setActionMessage(`Part ${part.sku} removed.`);
      fetchData();
    } catch (err: any) {
      setActionMessage(err.message || 'Failed to delete part.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <Layers className="w-5 h-5 text-blue-400" />
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Inventory & Approvals
            </h2>
            <p className="text-xs text-slate-400">
              Campus stock levels, equipment inventory, and purchase requisitions.
            </p>
          </div>
        </div>

        <button
          onClick={fetchData}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {actionMessage && (
        <div className={`p-4 rounded-xl text-xs font-mono border flex items-center justify-between ${
          actionMessage.includes('Rejected') || actionMessage.includes('failed') || actionMessage.includes('required')
            ? 'bg-rose-950/40 border-rose-500/50 text-rose-300'
            : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
        }`}>
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Pending Approvals Queue */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-purple-400" />
            <h3 className="font-bold text-white text-sm">
              Purchase Approvals ({approvals.filter((a) => a.status === 'PENDING').length} Pending)
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Active Mode: <span className={currentUser.role === 'SYS_ADMIN' ? 'text-purple-400 font-bold' : 'text-blue-400 font-bold'}>
              {currentUser.role === 'SYS_ADMIN' ? 'Administrator' : 'Student / Staff'}
            </span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono">
              <tr>
                <th className="py-2.5 px-3">Ticket</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Requested By</th>
                <th className="py-2.5 px-3">Amount</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {approvals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">
                    No pending approval requests.
                  </td>
                </tr>
              ) : (
                approvals.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3 font-mono text-blue-400 font-bold">
                      #{app.ticket_number || 'N/A'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {app.approval_type?.replace('_', ' ')}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">{app.requested_by_name}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-100">
                      ₹{Number(app.requested_amount || 0).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                        app.status === 'PENDING'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : app.status === 'APPROVED'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                      }`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {app.status === 'PENDING' ? (
                        currentUser.role !== 'SYS_ADMIN' ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            Admin Login Required
                          </span>
                        ) : (
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => handleApprove(app.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold shadow transition"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(app.id)}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-rose-900 text-slate-300 hover:text-white rounded text-[11px] font-bold border border-slate-700 transition"
                            >
                              Reject
                            </button>
                          </div>
                        )
                      ) : (
                        <span className="text-[11px] font-mono text-slate-500">Decided</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Equipment & Spare Parts Inventory Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Package className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-white text-sm">
              Equipment & Spare Parts ({parts.length} Items)
            </h3>
          </div>

          <button
            onClick={() => setIsAddPartModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-500/20 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Part / Item</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono">
              <tr>
                <th className="py-2.5 px-3">SKU</th>
                <th className="py-2.5 px-3">Part Name</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">On Hand</th>
                <th className="py-2.5 px-3">Available</th>
                <th className="py-2.5 px-3">Reserved</th>
                <th className="py-2.5 px-3">Unit Cost</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {parts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500 font-sans">
                    No equipment or spare parts recorded. Click <button onClick={() => setIsAddPartModalOpen(true)} className="text-blue-400 font-semibold underline hover:text-blue-300">Add Part / Item</button> to register materials.
                  </td>
                </tr>
              ) : (
                parts.map((p) => {
                  const isShortage = p.available_qty <= p.reorder_threshold;
                  const isZero = p.physical_on_hand_qty === 0;
                  return (
                    <tr
                      key={p.id}
                      className={`transition ${isZero ? 'bg-rose-950/20' : 'hover:bg-slate-800/40'}`}
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-200">{p.sku}</td>
                      <td className="py-2.5 px-3 text-slate-300">{p.name}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">{p.category}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-white">{p.physical_on_hand_qty}</td>
                      <td className={`py-2.5 px-3 font-mono font-bold ${isZero ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {p.available_qty}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-amber-400">{p.reserved_qty}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-300">₹{Number(p.unit_cost).toFixed(2)}</td>
                      <td className="py-2.5 px-3">
                        {isZero ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            ZERO STOCK SHORTAGE
                          </span>
                        ) : isShortage ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            REORDER WARNING
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            HEALTHY
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => handleDeletePart(p)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded transition"
                          title="Delete part"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Part Modal */}
      {isAddPartModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in duration-200">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Add Inventory Part / Item</h3>
                  <p className="text-xs text-slate-400">
                    Enter equipment SKU, name, stock quantity, and unit cost.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddPartModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPart} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    Part SKU *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PART-AC-CAP-50"
                    value={partForm.sku}
                    onChange={(e) => setPartForm({ ...partForm, sku: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white uppercase font-mono placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    Category *
                  </label>
                  <select
                    value={partForm.category}
                    onChange={(e) => setPartForm({ ...partForm, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  Part / Equipment Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 50 MFD Dual Motor Run Capacitor"
                  value={partForm.name}
                  onChange={(e) => setPartForm({ ...partForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    Quantity In Stock *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={partForm.quantity}
                    onChange={(e) => setPartForm({ ...partForm, quantity: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    Unit Cost (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    required
                    value={partForm.unit_cost}
                    onChange={(e) => setPartForm({ ...partForm, unit_cost: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    Reorder Alert Threshold
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={partForm.reorder_threshold}
                    onChange={(e) => setPartForm({ ...partForm, reorder_threshold: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    Lead Time (Hours)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={partForm.lead_time_hours}
                    onChange={(e) => setPartForm({ ...partForm, lead_time_hours: parseInt(e.target.value) || 24 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddPartModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-xs font-semibold border border-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-blue-500/25 transition"
                >
                  Add Part
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
