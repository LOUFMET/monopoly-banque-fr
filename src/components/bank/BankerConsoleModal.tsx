import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { formatMoney } from '../../utils/format';
import { Landmark, X, Plus, Minus, RotateCcw, AlertOctagon, Check, ArrowRight } from 'lucide-react';
import { triggerHaptic } from '../../utils/sound';

interface BankerConsoleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BankerConsoleModal: React.FC<BankerConsoleModalProps> = ({ isOpen, onClose }) => {
  const {
    session,
    disburseFromBank,
    payToBank,
    adjustPlayerBalance,
    resetGameSession,
    undoTransaction,
  } = useGame();

  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [actionType, setActionType] = useState<'DISBURSE' | 'COLLECT' | 'ADJUST'>('DISBURSE');
  const [amountStr, setAmountStr] = useState<string>('200');
  const [note, setNote] = useState<string>('');
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  if (!isOpen || !session) return null;

  const targetPlayer = session.players.find((p) => p.id === (selectedPlayerId || session.players[0]?.id));
  const amount = parseInt(amountStr, 10) || 0;

  const handleAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPlayer || amount <= 0) return;

    if (actionType === 'DISBURSE') {
      disburseFromBank(
        targetPlayer.id,
        amount,
        note || 'Versement Banque (Arbitrage)',
        note || 'Versement effectué depuis la console du Banquier'
      );
    } else if (actionType === 'COLLECT') {
      payToBank(
        targetPlayer.id,
        amount,
        note || 'Prélèvement Banque (Arbitrage)',
        note || 'Prélèvement effectué depuis la console du Banquier'
      );
    } else if (actionType === 'ADJUST') {
      adjustPlayerBalance(
        targetPlayer.id,
        amount,
        note || 'Correction manuelle du Banquier'
      );
    }

    setNote('');
    triggerHaptic('medium');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-lg glass-panel rounded-3xl border border-amber-500/30 p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                Console du Banquier
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold">
                  Hôte
                </span>
              </h3>
              <p className="text-xs text-slate-400">Contrôle des flux monétaires et arbitrage</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Player Selection */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Sélectionner le joueur à arbitrer
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {session.players.map((p) => {
                const isSelected = (targetPlayer?.id || session.players[0].id) === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPlayerId(p.id)}
                    className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 text-white shadow-sm ring-1 ring-amber-400'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-base">{p.token}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate">{p.name}</div>
                      <div className="text-[10px] font-mono text-emerald-400">
                        {formatMoney(p.balance)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Tabs */}
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setActionType('DISBURSE');
                setAmountStr('200');
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                actionType === 'DISBURSE'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              Verser
            </button>
            <button
              type="button"
              onClick={() => {
                setActionType('COLLECT');
                setAmountStr('50');
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                actionType === 'COLLECT'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Minus className="w-3.5 h-3.5" />
              Prélever
            </button>
            <button
              type="button"
              onClick={() => {
                setActionType('ADJUST');
                setAmountStr(targetPlayer ? String(targetPlayer.balance) : '1500');
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                actionType === 'ADJUST'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Ajuster solde
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleAction} className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  {actionType === 'ADJUST' ? 'Nouveau Solde Exact (€)' : 'Montant (€)'}
                </label>
                {actionType !== 'ADJUST' && (
                  <div className="flex gap-1">
                    {[50, 100, 200, 500].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setAmountStr(String(v))}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono"
                      >
                        {v}€
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input
                type="number"
                min="0"
                step="1"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                required
                className="w-full px-4 py-2.5 text-xl font-mono font-bold rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Justification / Note d'arbitrage
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="ex: Erreur carte chance, prime tour de plateau, etc."
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            <button
              type="submit"
              className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
                actionType === 'DISBURSE'
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                  : actionType === 'COLLECT'
                  ? 'bg-rose-500 hover:bg-rose-400 text-white'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              }`}
            >
              <Check className="w-4 h-4" />
              Confirmer l'opération pour {targetPlayer?.name}
            </button>
          </form>

          {/* Reset Game Section */}
          <div className="pt-4 border-t border-slate-800">
            {!showConfirmReset ? (
              <button
                type="button"
                onClick={() => setShowConfirmReset(true)}
                className="w-full py-2 px-3 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl border border-rose-500/20 transition-colors flex items-center justify-center gap-1.5"
              >
                <AlertOctagon className="w-4 h-4" />
                Réinitialiser la partie à zéro
              </button>
            ) : (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 space-y-2">
                <p className="text-xs text-rose-200">
                  ⚠️ Réinitialiser remettra tous les soldes à {session.startingCash} € et restituera toutes les propriétés à la Banque.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      resetGameSession();
                      setShowConfirmReset(false);
                      onClose();
                    }}
                    className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold"
                  >
                    Oui, Réinitialiser
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirmReset(false)}
                    className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
