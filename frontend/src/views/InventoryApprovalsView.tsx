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
  Search,
  DollarSign,
} from 'lucide-react';

const CATEGORY_OPTIONS = [
  { value: 'ELECTRICAL', label: 'Electrical & Power' },
  { value: 'HVAC', label: 'HVAC & Cooling' },
  { value: 'PLUMBING', label: 'Plumbing & Water' },
  { value: 'NETWORK', label: 'Network & IT Infrastructure' },
  { value: 'AV_EQUIPMENT', label: 'Audio / Visual Equipment' },
  { value: 'FURNITURE', label: 'Furniture & Fixtures' },
  { value: 'STRUCTURAL_SAFETY', label: 'Structural Safety & Fire' },
];

export const InventoryApprovalsView: React.FC = () => {
  const { currentUser } = useAuth();
  const isAdmin = currentUser.role === 'SYS_ADMIN' || currentUser.role === 'FACILITIES_ADMIN';

  const [parts, setParts] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionMessage, setActionMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Add Part Slide-Over Drawer
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [partForm, setPartForm] = useState({
    sku: '',
    name: '',
    category: 'ELECTRICAL',
    quantity: 10,
    unit_cost: 350.0,
    reorder_threshold: 2,
    lead_time_hours: 24,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setActionMessage({ text: 'Approval granted successfully! Invariant ledger updated.', isError: false });
      fetchData();
    } catch (err: any) {
      setActionMessage({
        text: err.message || 'Separation of duties violation: Requester cannot approve their own request.',
        isError: true,
      });
    }
  };

  const handleReject = async (approvalId: string) => {
    setActionMessage(null);
    try {
      await api.post(`/approvals/${approvalId}/reject`, { notes: 'Rejected by operational authority.' });
      setActionMessage({ text: 'Requisition rejected.', isError: false });
      fetchData();
    } catch (err: any) {
      setActionMessage({
        text: err.message || 'Reject failed: Requester cannot reject their own request.',
        isError: true,
      });
    }
  };

  const handleAddPart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setActionMessage({ text: 'Admin privileges required to register inventory items.', isError: true });
      return;
    }
    if (!partForm.sku.trim() || !partForm.name.trim()) {
      setActionMessage({ text: 'SKU and Part Name are required.', isError: true });
      return;
    }

    try {
      setIsSubmitting(true);
      setActionMessage(null);
      await api.post('/inventory/parts', {
        sku: partForm.sku.trim().toUpperCase(),
        name: partForm.name.trim(),
        category: partForm.category,
        quantity: Number(partForm.quantity),
        unit_cost: Number(partForm.unit_cost),
        reorder_threshold: Number(partForm.reorder_threshold),
        lead_time_hours: Number(partForm.lead_time_hours),
      });

      setActionMessage({
        text: `Part ${partForm.sku.toUpperCase()} registered successfully!`,
        isError: false,
      });
      setIsAddDrawerOpen(false);
      setPartForm({
        sku: '',
        name: '',
        category: 'ELECTRICAL',
        quantity: 10,
        unit_cost: 350.0,
        reorder_threshold: 2,
        lead_time_hours: 24,
      });
      fetchData();
    } catch (err: any) {
      setActionMessage({
        text: err.message || 'Failed to register part. Ensure SKU is unique.',
        isError: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePart = async (part: any) => {
    if (!isAdmin) return;
    if (!window.confirm(`Delete part ${part.sku} (${part.name}) from inventory?`)) return;
    try {
      await api.delete(`/inventory/parts/${part.id}`);
      setActionMessage({ text: `Part ${part.sku} removed from register.`, isError: false });
      fetchData();
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Failed to delete part.', isError: true });
    }
  };

  const filteredParts = parts.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.sku.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  });

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Ledger Strip */}
      <div className="h-12 border-b border-slate-800 bg-slate-900/80 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <h1 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Campus Inventory & Procurement Approvals
            </h1>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {parts.length} Registered Parts
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20">
            {approvals.filter((a) => a.status === 'PENDING').length} Pending Approvals
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search SKU, part, trade..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-2.5 pl-8 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono w-56"
            />
          </div>

          <button
            onClick={fetchData}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 text-xs transition"
            title="Refresh Inventory"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {isAdmin && (
            <button
              onClick={() => setIsAddDrawerOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold shadow transition border border-blue-500"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Inventory Part</span>
            </button>
          )}
        </div>
      </div>

      {/* Action / Error Banner */}
      {actionMessage && (
        <div
          className={`px-4 py-2 text-xs flex items-center justify-between border-b ${
            actionMessage.isError
              ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
              : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
          }`}
        >
          <div className="flex items-center space-x-2">
            {actionMessage.isError ? (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Workspace Split: Inventory Table + Pending Approvals Drawer */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Equipment & Spare Parts Ledger */}
        <div className="flex-1 overflow-auto border-r border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono sticky top-0 z-10">
              <tr>
                <th className="py-2 px-3 w-8 border-r border-slate-800 text-center">●</th>
                <th className="py-2 px-3 border-r border-slate-800 font-bold">SKU</th>
                <th className="py-2 px-3 border-r border-slate-800">Part Description</th>
                <th className="py-2 px-3 border-r border-slate-800">Category</th>
                <th className="py-2 px-3 border-r border-slate-800 text-right">On Hand</th>
                <th className="py-2 px-3 border-r border-slate-800 text-right">Available</th>
                <th className="py-2 px-3 border-r border-slate-800 text-right">Reserved</th>
                <th className="py-2 px-3 border-r border-slate-800 text-right">Unit Cost</th>
                <th className="py-2 px-3 border-r border-slate-800 text-right">Status</th>
                {isAdmin && <th className="py-2 px-3 w-16 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-sans">
              {filteredParts.map((p) => {
                const isZero = p.on_hand === 0;
                const isLow = p.on_hand <= (p.reorder_threshold || 2) && !isZero;
                return (
                  <tr key={p.id} className="hover:bg-slate-900/60 transition h-9">
                    <td className="py-2 px-3 border-r border-slate-800 text-center">
                      <span
                        className={`inline-block w-1.5 h-1.5 rounded-full ${
                          isZero ? 'bg-rose-500' : isLow ? 'bg-amber-400' : 'bg-emerald-400'
                        }`}
                      />
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-blue-400 border-r border-slate-800">
                      {p.sku}
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-100 border-r border-slate-800">
                      {p.name}
                    </td>
                    <td className="py-2 px-3 font-mono text-[11px] text-slate-300 border-r border-slate-800">
                      {p.category}
                    </td>
                    <td className="py-2 px-3 font-mono text-right border-r border-slate-800 text-slate-200">
                      {p.on_hand}
                    </td>
                    <td className="py-2 px-3 font-mono text-right border-r border-slate-800 text-emerald-400">
                      {p.available}
                    </td>
                    <td className="py-2 px-3 font-mono text-right border-r border-slate-800 text-amber-400">
                      {p.reserved}
                    </td>
                    <td className="py-2 px-3 font-mono text-right border-r border-slate-800 text-slate-200">
                      ₹{Number(p.unit_cost || 0).toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-right border-r border-slate-800">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-mono border ${
                          isZero
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : isLow
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                        }`}
                      >
                        {isZero ? 'ZERO STOCK' : isLow ? 'REORDER WARNING' : 'HEALTHY'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="py-2 px-3 text-right">
                        <button
                          onClick={() => handleDeletePart(p)}
                          className="p-1 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded transition"
                          title="Delete part"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
              {filteredParts.length === 0 && (
                <tr>
                  <td
                    colSpan={isAdmin ? 10 : 9}
                    className="py-16 text-center text-slate-500 text-xs font-mono"
                  >
                    {parts.length === 0
                      ? 'No equipment or spare parts in inventory. Click "+ Add Inventory Part" above to register manual parts.'
                      : 'No items match your search.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Right Pane: Pending Purchase Approvals (Fixed 390px) */}
        <div className="w-[390px] bg-slate-900 border-l border-slate-800 flex flex-col justify-between overflow-y-auto shrink-0 shadow-2xl">
          <div className="p-4 space-y-4">
            <div className="pb-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-purple-400" />
                <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                  Purchase Requisitions
                </h2>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20">
                Separation of Duties
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
              Requisitions generated when work orders are blocked on parts. Admins approve or reject
              procurement requests.
            </p>

            <div className="space-y-3">
              {approvals.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs font-mono border border-dashed border-slate-800 rounded">
                  No active approval requisitions.
                </div>
              ) : (
                approvals.map((app) => (
                  <div
                    key={app.id}
                    className="p-3 bg-slate-950 border border-slate-800 rounded space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-blue-400 font-bold">
                        Ticket #{app.ticket_number || 'N/A'}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-mono border ${
                          app.status === 'PENDING'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : app.status === 'APPROVED'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        }`}
                      >
                        {app.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-300 font-mono text-[11px]">
                      <span>Req Amount:</span>
                      <span className="font-bold text-white">
                        ₹{Number(app.requested_amount || 0).toFixed(2)}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400">
                      Requested By: <span className="text-slate-200">{app.requested_by_name}</span>
                    </div>

                    {app.status === 'PENDING' && (
                      <div className="pt-2 flex items-center space-x-2">
                        {isAdmin ? (
                          <>
                            <button
                              onClick={() => handleApprove(app.id)}
                              className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold font-mono transition"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(app.id)}
                              className="flex-1 py-1.5 bg-slate-800 hover:bg-rose-900 text-slate-300 hover:text-white rounded text-xs font-bold font-mono border border-slate-700 transition"
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <div className="w-full text-center py-1 text-[10px] font-mono text-slate-500 bg-slate-900 rounded border border-slate-800">
                            Admin approval required
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="p-3 border-t border-slate-800 text-[10px] text-slate-500 font-mono flex items-center justify-between">
            <span>INVARIANT: NON-NEGATIVE STOCK</span>
            <span>AUDIT: IMMUTABLE</span>
          </div>
        </div>

        {/* Slide-Over Drawer for Adding Inventory Part */}
        {isAddDrawerOpen && (
          <div className="w-[400px] border-l border-slate-800 bg-slate-900 p-4 flex flex-col justify-between shrink-0 shadow-2xl z-20">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <Package className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                    Register Inventory Part
                  </h2>
                </div>
                <button
                  onClick={() => setIsAddDrawerOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-[11px] text-slate-400 py-3 leading-relaxed">
                Add replacement hardware or consumable parts to the campus store. Work orders
                requesting parts will reserve stock against this ledger.
              </p>

              <form onSubmit={handleAddPart} className="space-y-3 pt-2">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">
                    Part SKU (Unique ID) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PART-AC-CAP-50"
                    value={partForm.sku}
                    onChange={(e) => setPartForm({ ...partForm, sku: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">
                    Part Description *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 50 MFD Dual Motor Run Capacitor"
                    value={partForm.name}
                    onChange={(e) => setPartForm({ ...partForm, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">
                    Category *
                  </label>
                  <select
                    value={partForm.category}
                    onChange={(e) => setPartForm({ ...partForm, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">
                      Initial Qty *
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={partForm.quantity}
                      onChange={(e) =>
                        setPartForm({ ...partForm, quantity: Number(e.target.value) })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">
                      Unit Cost (₹) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={partForm.unit_cost}
                      onChange={(e) =>
                        setPartForm({ ...partForm, unit_cost: Number(e.target.value) })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded text-xs font-bold transition shadow-md flex items-center justify-center space-x-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'Registering...' : 'Register Part'}</span>
                  </button>
                </div>
              </form>
            </div>

            <div className="pt-4 border-t border-slate-800 text-[10px] text-slate-500 font-mono">
              Authority: SYS_ADMIN &bull; Invariant: Balance Non-Negative Constraint
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
