import React, { useState, useEffect } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { Header } from './components/layout/Header';
import { TabNavigation } from './components/layout/TabNavigation';
import { ToastContainer } from './components/common/ToastContainer';
import { LobbyScreen } from './components/lobby/LobbyScreen';
import { BankDashboard } from './components/bank/BankDashboard';
import { PlayerList } from './components/players/PlayerList';
import { PropertyCatalog } from './components/properties/PropertyCatalog';
import { TransactionHistory } from './components/history/TransactionHistory';
import { SettingsModal } from './components/common/SettingsModal';
import { BankerConsoleModal } from './components/bank/BankerConsoleModal';

const GameMain: React.FC = () => {
  const { session, currentPlayer, activeTab } = useGame();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBankerConsoleOpen, setIsBankerConsoleOpen] = useState(false);

  // If no active session or player, show the lobby
  if (!session || !currentPlayer) {
    return (
      <>
        <ToastContainer />
        <LobbyScreen />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-black">
      <ToastContainer />

      {/* Top Header */}
      <Header
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenBankerConsole={() => setIsBankerConsoleOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-lg w-full mx-auto p-3.5 sm:p-4 animate-in fade-in">
        {activeTab === 'BANK' && <BankDashboard />}
        {activeTab === 'PLAYERS' && <PlayerList />}
        {activeTab === 'PROPERTIES' && <PropertyCatalog />}
        {activeTab === 'HISTORY' && <TransactionHistory />}
      </main>

      {/* Fixed Bottom Navigation */}
      <TabNavigation />

      {/* Global Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onOpenBankerConsole={() => setIsBankerConsoleOpen(true)}
      />

      <BankerConsoleModal
        isOpen={isBankerConsoleOpen}
        onClose={() => setIsBankerConsoleOpen(false)}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <GameProvider>
      <GameMain />
    </GameProvider>
  );
};

export default App;
