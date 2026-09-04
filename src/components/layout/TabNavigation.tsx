import React from 'react';
import { useGame } from '../../context/GameContext';
import { Wallet, Users, Home, History } from 'lucide-react';
import { triggerHaptic } from '../../utils/sound';

export const TabNavigation: React.FC = () => {
  const { activeTab, setActiveTab } = useGame();

  const tabs = [
    { id: 'BANK' as const, label: 'Caisse', icon: Wallet },
    { id: 'PLAYERS' as const, label: 'Joueurs', icon: Users },
    { id: 'PROPERTIES' as const, label: 'Propriétés', icon: Home },
    { id: 'HISTORY' as const, label: 'Historique', icon: History },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 glass-panel border-t border-white/5 py-1.5 px-3 pb-[calc(0.375rem+env(safe-area-inset-bottom,0px))]">
      <div className="max-w-md mx-auto grid grid-cols-4 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => {
                triggerHaptic('light');
                setActiveTab(tab.id);
              }}
              className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all ${
                isActive
                  ? 'text-amber-400 bg-amber-400/10 shadow-sm shadow-amber-400/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 transition-transform ${isActive ? 'scale-110' : ''}`} />
              <span className={`text-[11px] font-semibold tracking-tight ${isActive ? 'font-bold' : ''}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
