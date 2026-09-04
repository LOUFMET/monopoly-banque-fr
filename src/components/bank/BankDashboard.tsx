import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { formatMoney, calculatePlayerNetWorth, countPlayerProperties } from '../../utils/format';
import { TransferModal } from './TransferModal';
import { BankerConsoleModal } from './BankerConsoleModal';
import { BankDisburseModal } from './BankDisburseModal';
import {
  Send,
  Building2,
  Sparkles,
  ArrowDownRight,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  History,
  Shield,
  HelpCircle,
  X,
} from 'lucide-react';
import { triggerHaptic } from '../../utils/sound';

export const BankDashboard: React.FC = () => {
  const {
    session,
    currentPlayer,
    isBanker,
    quickTax,
    setActiveTab,
  } = useGame();

  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isBankerConsoleOpen, setIsBankerConsoleOpen] = useState(false);
  const [isDisburseModalOpen, setIsDisburseModalOpen] = useState(false);

  if (!session || !currentPlayer) return null;

  const netWorth = calculatePlayerNetWorth(currentPlayer, session.properties);
  const propCounts = countPlayerProperties(currentPlayer.id, session.properties);

  const recentTransactions = session.transactions.slice(0, 4);

  return (
    <div className="space-y-4 pb-20 max-w-lg mx-auto">
      {/* Current Player Card & Big Balance */}
      <div className="relative overflow-hidden rounded-3xl p-6 glass-panel border border-white/10 shadow-2xl">
        {/* Glow behind balance */}
        <div
          className="absolute -top-10 -right-10 w-44 h-44 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: currentPlayer.color }}
        />

        {/* Player Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shadow-md ring-2 ring-white/15"
              style={{ backgroundColor: currentPlayer.color }}
            >
              {currentPlayer.token}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-bold text-white tracking-tight">
                  {currentPlayer.name}
                </h2>
                {isBanker && (
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <Shield className="w-2.5 h-2.5" />
                    Banquier
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">Compte bancaire actif</p>
            </div>
          </div>

          {/* Quick Fortune Summary */}
          <div className="text-right">
            <div className="text-[10px] uppercase font-semibold text-slate-400">Fortune totale</div>
            <div className="text-sm font-mono font-bold text-amber-300 flex items-center justify-end gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              {formatMoney(netWorth)}
            </div>
          </div>
        </div>

        {/* Liquid Balance (Huge) */}
        <div className="my-3">
          <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
            Liquidités disponibles
          </div>
          <div className="flex items-baseline gap-1">
            <span
              className={`text-4xl sm:text-5xl font-mono font-black tracking-tight ${
                currentPlayer.balance >= 200
                  ? 'text-emerald-400'
                  : currentPlayer.balance > 0
                  ? 'text-amber-400'
                  : 'text-rose-500'
              }`}
            >
              {formatMoney(currentPlayer.balance)}
            </span>
          </div>

          {/* Holdings summary badge */}
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-white/5 text-xs text-slate-300">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800">
              🏠 <strong>{propCounts.total}</strong> titres
            </span>
            {propCounts.mortgaged > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300">
                ⚠️ <strong>{propCounts.mortgaged}</strong> hypothéqué{propCounts.mortgaged > 1 ? 's' : ''}
              </span>
            )}
            {propCounts.houses > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300">
                🏡 <strong>{propCounts.houses}</strong> maison{propCounts.houses > 1 ? 's' : ''}
              </span>
            )}
            {propCounts.hotels > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-300">
                🏨 <strong>{propCounts.hotels}</strong> hôtel{propCounts.hotels > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions (Actions Rapides) */}
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Actions Rapides
          </h3>
          <span className="text-[11px] text-slate-500">Un clic pour valider</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* -200 Impôt sur le revenu */}
          <button
            onClick={() => quickTax('INCOME')}
            className="flex items-center justify-between p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 text-slate-200 border border-slate-700/80 active:scale-[0.98] transition-all cursor-pointer"
          >
            <div className="text-left">
              <div className="text-[11px] text-slate-400">Impôt sur le Revenu</div>
              <div className="text-sm font-mono font-bold text-rose-400">-200 €</div>
            </div>
            <span className="text-xs text-slate-500 font-mono">Forfait</span>
          </button>

          {/* -100 Taxe de Luxe */}
          <button
            onClick={() => quickTax('LUXURY')}
            className="flex items-center justify-between p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 text-slate-200 border border-slate-700/80 active:scale-[0.98] transition-all cursor-pointer"
          >
            <div className="text-left">
              <div className="text-[11px] text-slate-400">Taxe de Luxe</div>
              <div className="text-sm font-mono font-bold text-rose-400">-100 €</div>
            </div>
            <span className="text-xs text-slate-500 font-mono">Bague</span>
          </button>
        </div>
      </div>

      {/* Main Operations / Transfers */}
      <div className={`grid ${isBanker ? 'grid-cols-2' : 'grid-cols-1'} gap-2.5`}>
        <button
          onClick={() => {
            triggerHaptic('light');
            setIsTransferOpen(true);
          }}
          className="flex items-center justify-center gap-2 py-4 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold text-sm shadow-xl shadow-blue-950/40 active:scale-[0.98] transition-all cursor-pointer"
        >
          <Send className="w-4 h-4" />
          <span>Payer (Banque ou Joueur)</span>
        </button>

        {isBanker && (
          <button
            onClick={() => {
              triggerHaptic('light');
              setIsDisburseModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 py-4 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold text-sm shadow-xl shadow-emerald-950/40 border border-emerald-400/30 active:scale-[0.98] transition-all cursor-pointer"
          >
            <ArrowDownRight className="w-4 h-4 text-emerald-200" />
            <span>Verser depuis la Banque</span>
          </button>
        )}
      </div>

      {/* Recent Activity Trail */}
      <div className="glass-panel p-4 rounded-2xl border border-white/5 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5" />
            Dernières Transactions
          </h4>
          <button
            onClick={() => setActiveTab('HISTORY')}
            className="text-xs text-amber-400 hover:text-amber-300 font-medium"
          >
            Voir tout ({session.transactions.length})
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <p className="text-xs text-slate-500 py-3 text-center">Aucune transaction pour le moment.</p>
        ) : (
          <div className="space-y-2">
            {recentTransactions.map((tx) => {
              const isPayer = tx.fromId === currentPlayer.id;
              const isReceiver = tx.toId === currentPlayer.id;

              return (
                <div
                  key={tx.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs ${
                    tx.undone
                      ? 'bg-slate-900/40 border-slate-800/60 opacity-50 line-through'
                      : 'bg-slate-900/80 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`p-1.5 rounded-lg shrink-0 ${
                        isReceiver
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : isPayer
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {isReceiver ? (
                        <ArrowDownLeft className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-white truncate">{tx.title}</div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {tx.fromName} → {tx.toName}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 ml-2">
                    <div
                      className={`font-mono font-bold ${
                        isReceiver
                          ? 'text-emerald-400'
                          : isPayer
                          ? 'text-rose-400'
                          : 'text-slate-300'
                      }`}
                    >
                      {isReceiver ? '+' : isPayer ? '-' : ''}
                      {formatMoney(tx.amount)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <TransferModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
      />

      <BankDisburseModal
        isOpen={isDisburseModalOpen}
        onClose={() => setIsDisburseModalOpen(false)}
      />

      <BankerConsoleModal
        isOpen={isBankerConsoleOpen}
        onClose={() => setIsBankerConsoleOpen(false)}
      />
    </div>
  );
};
