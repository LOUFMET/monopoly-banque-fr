import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { formatMoney, calculatePlayerNetWorth, countPlayerProperties } from '../../utils/format';
import { FRENCH_PROPERTIES } from '../../data/frenchProperties';
import { TransferModal } from '../bank/TransferModal';
import { Shield, Send, UserCheck, TrendingUp, Trophy, Home, Plus } from 'lucide-react';
import { triggerHaptic } from '../../utils/sound';

export const PlayerList: React.FC = () => {
  const { session, currentPlayer, switchPlayer, isBanker, quickPassGo } = useGame();
  const [transferTargetId, setTransferTargetId] = useState<string | null>(null);

  if (!session || !currentPlayer) return null;

  // Sort players by total net worth descending for ranking
  const playersWithStats = session.players.map((p) => {
    const netWorth = calculatePlayerNetWorth(p, session.properties);
    const stats = countPlayerProperties(p.id, session.properties);
    
    // Group colors owned
    const ownedProps = FRENCH_PROPERTIES.filter(
      (prop) => session.properties[prop.id]?.ownerId === p.id
    );

    return {
      player: p,
      netWorth,
      stats,
      ownedProps,
    };
  }).sort((a, b) => b.netWorth - a.netWorth);

  return (
    <div className="space-y-4 pb-20 max-w-lg mx-auto">
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            Classement & Joueurs
          </h2>
          <p className="text-xs text-slate-400">{session.players.length} participants en lice</p>
        </div>
      </div>

      <div className="space-y-3">
        {playersWithStats.map(({ player, netWorth, stats, ownedProps }, index) => {
          const isCurrent = player.id === currentPlayer.id;

          return (
            <div
              key={player.id}
              className={`rounded-2xl p-4 glass-panel border transition-all ${
                isCurrent
                  ? 'border-amber-400/50 bg-slate-900/90 ring-1 ring-amber-400/30'
                  : 'border-white/5 bg-slate-900/60 hover:bg-slate-900/80'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                {/* Left: Avatar & Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black text-white shadow-md ring-2 ring-white/10"
                      style={{ backgroundColor: player.color }}
                    >
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-950 border border-slate-700 text-[10px] font-black font-mono flex items-center justify-center text-amber-400">
                      #{index + 1}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-bold text-white truncate">
                        {player.name}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold">
                          Vous
                        </span>
                      )}
                      {player.isBanker && (
                        <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                          <Shield className="w-2.5 h-2.5" />
                          Banquier
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {formatMoney(player.balance)}
                      </span>
                      <span className="text-[11px] text-slate-500">•</span>
                      <span className="text-[11px] font-mono text-amber-300 flex items-center gap-0.5">
                        <TrendingUp className="w-3 h-3 text-amber-400" />
                        {formatMoney(netWorth)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Quick Action Buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Seul le banquier peut verser la case départ */}
                  {isBanker && (
                    <button
                      onClick={() => {
                        triggerHaptic('success');
                        quickPassGo(player.id);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 font-black text-xs flex items-center gap-1 border border-emerald-500/30 active:scale-95 transition-all shadow-sm"
                      title={`Verser la Case Départ (+200 €) à ${player.name}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+200 €</span>
                    </button>
                  )}

                  {!isCurrent ? (
                    <button
                      onClick={() => {
                        triggerHaptic('light');
                        setTransferTargetId(player.id);
                      }}
                      className="p-2.5 rounded-xl bg-blue-600/80 hover:bg-blue-600 text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-blue-950/40 active:scale-95 transition-all"
                      title={`Payer ${player.name}`}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Payer</span>
                    </button>
                  ) : null}

                  {!isCurrent && (
                    <button
                      onClick={() => switchPlayer(player.id)}
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs"
                      title={`Incarner ${player.name} (mode multi-joueurs sur un seul écran)`}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Property & Assets Summary */}
              <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Home className="w-3 h-3 text-slate-400" />
                    <strong>{stats.total}</strong> terrain{stats.total > 1 ? 's' : ''}
                  </span>
                  {stats.houses > 0 && (
                    <span className="text-[11px] text-emerald-400">
                      • {stats.houses} 🏠
                    </span>
                  )}
                  {stats.hotels > 0 && (
                    <span className="text-[11px] text-amber-400">
                      • {stats.hotels} 🏨
                    </span>
                  )}
                  {stats.mortgaged > 0 && (
                    <span className="text-[11px] text-rose-400">
                      • {stats.mortgaged} hypothéqué{stats.mortgaged > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Color dots preview */}
                <div className="flex items-center gap-1">
                  {ownedProps.slice(0, 8).map((prop) => (
                    <span
                      key={prop.id}
                      className="w-2.5 h-2.5 rounded-full ring-1 ring-black/40"
                      style={{ backgroundColor: prop.colorHex }}
                      title={prop.name}
                    />
                  ))}
                  {ownedProps.length > 8 && (
                    <span className="text-[10px] text-slate-500 font-mono">
                      +{ownedProps.length - 8}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Transfer modal if user tapped "Payer" */}
      {transferTargetId && (
        <TransferModal
          isOpen={Boolean(transferTargetId)}
          onClose={() => setTransferTargetId(null)}
          defaultRecipientId={transferTargetId}
        />
      )}
    </div>
  );
};
