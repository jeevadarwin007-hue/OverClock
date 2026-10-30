import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { Header, TabType } from './components/Header';
import { CommandCenter } from './views/CommandCenter';
import { CampusExplorer } from './views/CampusExplorer';
import { RoomManagementView } from './views/RoomManagementView';
import { WorkOrdersView } from './views/WorkOrdersView';
import { InventoryApprovalsView } from './views/InventoryApprovalsView';
import { InvariantProofPanel } from './views/InvariantProofPanel';
import { api } from './api/client';

export const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('command-center');
  const [allInvariantsPass, setAllInvariantsPass] = useState<boolean>(true);

  // Poll invariants status for global top pill
  useEffect(() => {
    const checkInvariants = async () => {
      try {
        const res: any = await api.get('/invariants');
        setAllInvariantsPass(res.all_invariants_pass ?? true);
      } catch (err) {
        // Fallback
      }
    };
    checkInvariants();
    const interval = setInterval(checkInvariants, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Persistent Navigation Header */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        allInvariantsPass={allInvariantsPass}
      />

      {/* Main Feature View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'command-center' && <CommandCenter />}
        {activeTab === 'campus-explorer' && <CampusExplorer />}
        {activeTab === 'room-management' && <RoomManagementView />}
        {activeTab === 'work-orders' && <WorkOrdersView />}
        {activeTab === 'inventory-approvals' && <InventoryApprovalsView />}
        {activeTab === 'invariants' && <InvariantProofPanel />}
      </main>

      {/* Minimal System Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-3 text-center text-xs text-slate-500 font-mono">
        CampusOps &bull; SRM Easwari Engineering College (Autonomous), Ramapuram, Chennai &bull; Target Coords: [80.1810° E, 13.0324° N] &bull; PostgreSQL 16 + Groq AI
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;

