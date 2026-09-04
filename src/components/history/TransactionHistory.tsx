import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { formatMoney, formatShortTime } from '../../utils/format';
import {
  History,
  RotateCcw,
  ArrowDownLeft,
  ArrowUpRight,
  Shield,
  Building2,
  Coins,
  ShieldAlert,
  CheckCircle,
  Home,
  FileSpreadsheet,
} from 'lucide-react';
import { triggerHaptic } from '../../utils/sound';

export const TransactionHistory: React.FC = () => {
  const { session, currentPlayer, isBanker, undoTransaction } = useGame();
  const [selectedPlayerFilter, setSelectedPlayerFilter] = useState<string>('ALL');

  if (!session || !currentPlayer) return null;

  const filteredTransactions = session.transactions.filter((tx) => {
    if (selectedPlayerFilter === 'ALL') return true;
    return tx.fromId === selectedPlayerFilter || tx.toId === selectedPlayerFilter;
  });

  const handleUndo = (txId: string) => {
    triggerHaptic('warning');
    undoTransaction(txId);
  };

  const getTransactionIcon = (type: string, isReceiver: boolean) => {
    switch (type) {
      case 'BANK_DISBURSEMENT':
        return <Coins className="w-4 h-4 text-emerald-400" />;
      case 'BANK_PAYMENT':
        return <Building2 className="w-4 h-4 text-amber-400" />;
      case 'PROPERTY_BUY':
        return <Home className="w-4 h-4 text-blue-400" />;
      case 'MORTGAGE':
        return <ShieldAlert className="w-4 h-4 text-rose-400" />;
      case 'UNMORTGAGE':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'BUILD_HOUSE':
      case 'SELL_HOUSE':
        return <Home className="w-4 h-4 text-amber-400" />;
      default:
        return isReceiver ? (
          <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
        ) : (
          <ArrowUpRight className="w-4 h-4 text-amber-400" />
        );
    }
  };

  return (
    <div className="space-y-4 pb-20 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-amber-400" />
            Journal d'Audit & Historique
          </h2>
          <p className="text-xs text-slate-400">
            {session.transactions.length} transaction{session.transactions.length > 1 ? 's' : ''} enregistrée{session.transactions.length > 1 ? 's' : ''}
          </p>
        </div>
        {isBanker && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 flex items-center gap-1">
            <Shield className="w-2.5 h-2.5" />
            Droit d'annulation actif
          </span>
        )}
      </div>

      {/* Filter by player */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        <button
          onClick={() => setSelectedPlayerFilter('ALL')}
          className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all ${
            selectedPlayerFilter === 'ALL'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          Tous les flux
        </button>

        {session.players.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedPlayerFilter(p.id)}
            className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all ${
              selectedPlayerFilter === p.id
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <span>{p.token}</span>
            <span>{p.name}</span>
          </button>
        ))}
      </div>

      {/* Audit Log Entries */}
      <div className="space-y-2.5">
        {filteredTransactions.map((tx) => {
          const isReceiver = tx.toId === currentPlayer.id;
          const isPayer = tx.fromId === currentPlayer.id;

          return (
            <div
              key={tx.id}
              className={`rounded-2xl p-3.5 glass-panel border transition-all ${
                tx.undone
                  ? 'border-slate-800 bg-slate-950/40 opacity-50 line-through'
                  : 'border-white/5 bg-slate-900/80 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 shrink-0 mt-0.5">
                    {getTransactionIcon(tx.type, isReceiver)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-bold text-white truncate">
                        {tx.title}
                      </h4>
                      {tx.undone && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800 no-underline">
                          Annulée
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400 mt-0.5">
                      <strong className="text-slate-200">{tx.fromName}</strong> a payé à{' '}
                      <strong className="text-slate-200">{tx.toName}</strong>
                    </p>

                    {tx.description && (
                      <p className="text-[10px] text-slate-500 italic mt-0.5 truncate">
                        "{tx.description}"
                      </p>
                    )}

                    <span className="text-[10px] font-mono text-slate-500 mt-1 block">
                      {formatShortTime(tx.timestamp)}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div
                    className={`font-mono font-black text-sm ${
                      tx.undone
                        ? 'text-slate-500'
                        : isReceiver
                        ? 'text-emerald-400'
                        : isPayer
                        ? 'text-rose-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {isReceiver && !tx.undone ? '+' : isPayer && !tx.undone ? '-' : ''}
                    {formatMoney(tx.amount)}
                  </div>

                  {/* Banker Undo Action */}
                  {isBanker && !tx.undone && (
                    <button
                      onClick={() => handleUndo(tx.id)}
                      className="mt-1 text-[10px] text-rose-400 hover:text-rose-300 hover:underline flex items-center justify-end gap-1 ml-auto"
                      title="Annuler cette transaction et rétablir les soldes"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      Annuler
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredTransactions.length === 0 && (
          <div className="glass-panel p-8 rounded-2xl text-center space-y-2">
            <FileSpreadsheet className="w-8 h-8 text-slate-500 mx-auto" />
            <div className="text-sm font-bold text-white">Aucun mouvement enregistré</div>
            <p className="text-xs text-slate-400">
              Les transactions apparaîtront ici au fur et à mesure de la partie.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
