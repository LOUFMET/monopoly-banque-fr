import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { formatMoney } from '../../utils/format';
import { Shield, Copy, Check, Users, Settings, Landmark } from 'lucide-react';

interface HeaderProps {
  onOpenSettings: () => void;
  onOpenBankerConsole: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings, onOpenBankerConsole }) => {
  const { session, currentPlayer, isBanker, switchPlayer, addToast } = useGame();
  const [copied, setCopied] = useState(false);
  const [showPlayerMenu, setShowPlayerMenu] = useState(false);

  if (!session || !currentPlayer) return null;

  const copyRoomCode = () => {
    navigator.clipboard.writeText(session.roomCode);
    setCopied(true);
    addToast({
      type: 'info',
      title: 'Code copié !',
      message: `Code ${session.roomCode} copié dans le presse-papiers`,
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="sticky top-0 z-40 glass-panel border-b border-white/5 px-3.5 py-2.5 sm:px-6">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
        {/* Left: Brand & Room Code */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xl">🎩</span>
            <span className="hidden sm:inline font-display font-black text-sm tracking-tight text-amber-400">
              MONOPOLY
            </span>
          </div>

          {/* Room Code Badge */}
          <button
            onClick={copyRoomCode}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-700/80 hover:border-amber-400/60 active:scale-95 transition-all text-xs"
            title="Cliquez pour copier le code du salon"
          >
            <span className="text-slate-400 font-medium">Salon:</span>
            <span className="font-mono font-bold tracking-wider text-amber-400">
              {session.roomCode}
            </span>
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>
        </div>

        {/* Center / Right: Banker console shortcut + Active Player & Settings */}
        <div className="flex items-center gap-2">
          {/* Banker Console Button */}
          {isBanker && (
            <button
              onClick={onOpenBankerConsole}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 active:scale-95 transition-all text-xs font-semibold"
              title="Console d'arbitrage de la Banque"
            >
              <Landmark className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Banque</span>
            </button>
          )}

          {/* Player Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowPlayerMenu(!showPlayerMenu)}
              className="flex items-center gap-2 p-1 pl-2 pr-2.5 rounded-full bg-slate-900 border border-slate-700/80 hover:border-slate-600 transition-all text-left"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white ring-1 ring-white/20 shadow-sm"
                style={{ backgroundColor: currentPlayer.color }}
              >
                {currentPlayer.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-white max-w-[90px] truncate">
                    {currentPlayer.name}
                  </span>
                  {isBanker && (
                    <span title="Banquier">
                      <Shield className="w-3 h-3 text-amber-400 shrink-0" />
                    </span>
                  )}
                </div>
                <div className="text-[10px] font-mono text-emerald-400 font-bold">
                  {formatMoney(currentPlayer.balance)}
                </div>
              </div>
              <div className="sm:hidden font-mono text-xs font-bold text-emerald-400">
                {formatMoney(currentPlayer.balance)}
              </div>
            </button>

            {/* Quick Player Switch Menu */}
            {showPlayerMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowPlayerMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-56 glass-panel rounded-2xl p-2 shadow-2xl z-50 border border-slate-700/80 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Changer de joueur</span>
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <div className="space-y-1 my-1">
                    {session.players.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          switchPlayer(p.id);
                          setShowPlayerMenu(false);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors ${
                          p.id === currentPlayer.id
                            ? 'bg-amber-500/15 border border-amber-500/30 text-white'
                            : 'hover:bg-white/5 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0 shadow-sm"
                            style={{ backgroundColor: p.color }}
                          >
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs font-bold truncate max-w-[90px]">
                            {p.name}
                          </span>
                        </div>
                        <span className="text-xs font-mono font-semibold text-emerald-400">
                          {formatMoney(p.balance)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            title="Paramètres de session"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
