import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { formatMoney } from '../../utils/format';
import { Landmark, X, ArrowDownRight, Sparkles, AlertCircle, Check } from 'lucide-react';
import { triggerHaptic } from '../../utils/sound';

interface BankDisburseModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRecipientId?: string;
}

const REASON_PRESETS = [
  'Passage Case Départ (+200 €)',
  'Carte Chance',
  'Caisse de Communauté',
  'Prime / Récompense',
  'Erreur de la banque en votre faveur',
];

export const BankDisburseModal: React.FC<BankDisburseModalProps> = ({
  isOpen,
  onClose,
  defaultRecipientId,
}) => {
  const { session, disburseFromBank } = useGame();

  const [recipientId, setRecipientId] = useState<string>(
    defaultRecipientId || session?.players[0]?.id || ''
  );
  const [amountStr, setAmountStr] = useState<string>('200');
  const [reason, setReason] = useState<string>('Passage Case Départ (+200 €)');
  const [customReason, setCustomReason] = useState<string>('');

  if (!isOpen || !session) return null;

  const targetPlayer = session.players.find((p) => p.id === (recipientId || session.players[0]?.id));
  const amount = parseInt(amountStr, 10) || 0;

  const handleQuickAmount = (val: number) => {
    triggerHaptic('light');
    setAmountStr(String(val));
  };

  const handleAddAmount = (delta: number) => {
    triggerHaptic('light');
    const cur = parseInt(amountStr, 10) || 0;
    setAmountStr(String(Math.max(1, cur + delta)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPlayer || amount <= 0) return;

    const finalTitle = customReason.trim() ? customReason.trim() : reason;
    disburseFromBank(
      targetPlayer.id,
      amount,
      finalTitle,
      `Versement de ${amount} € ordonné par le Banquier`
    );

    triggerHaptic('medium');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-md glass-panel rounded-t-3xl sm:rounded-3xl border border-emerald-500/30 p-5 sm:p-6 shadow-2xl animate-in slide-in-from-bottom-6 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-bold text-white">Verser depuis la Banque</h3>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold">
                  Banquier
                </span>
              </div>
              <p className="text-xs text-slate-400">Payer un joueur avec les fonds de la Banque</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Joueur Bénéficiaire */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Bénéficiaire
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
              {session.players.map((player) => {
                const isSelected = (targetPlayer?.id || session.players[0].id) === player.id;
                return (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setRecipientId(player.id);
                    }}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-sm ring-1 ring-emerald-400'
                        : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black text-white shadow-md shrink-0"
                      style={{ backgroundColor: player.color }}
                    >
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold truncate">{player.name}</div>
                      <div className="text-[10px] font-mono text-emerald-400 truncate font-semibold">
                        {formatMoney(player.balance)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Saisie du Montant */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Montant à verser (€)
              </label>
              <span className="text-xs text-emerald-400 font-medium">
                Fonds Banque illimités
              </span>
            </div>

            <div className="relative">
              <input
                type="number"
                min={1}
                step={1}
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="200"
                required
                className="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-slate-700 text-center font-mono text-3xl font-black text-emerald-400 placeholder-slate-600 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-500 text-lg">
                €
              </span>
            </div>

            {/* Quick Amounts */}
            <div className="grid grid-cols-4 gap-1.5 mt-2">
              {[
                { label: 'Départ 200€', val: 200 },
                { label: '+50 €', delta: 50 },
                { label: '+100 €', delta: 100 },
                { label: '+500 €', delta: 500 },
              ].map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() =>
                    item.val !== undefined ? handleQuickAmount(item.val) : handleAddAmount(item.delta!)
                  }
                  className="py-1.5 px-1 text-[11px] font-mono font-bold rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white transition-all active:scale-95 text-center"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Motif du versement */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Motif du versement
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {REASON_PRESETS.map((preset) => {
                const isSelected = reason === preset && !customReason;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setReason(preset);
                      setCustomReason('');
                      if (preset.includes('200')) {
                        setAmountStr('200');
                      }
                    }}
                    className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-semibold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {preset}
                  </button>
                );
              })}
            </div>

            <input
              type="text"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Ou saisir un motif personnalisé..."
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-400"
            />
          </div>

          {/* Bouton de confirmation */}
          <button
            type="submit"
            disabled={amount <= 0 || !targetPlayer}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold text-sm shadow-xl shadow-emerald-950/50 flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ArrowDownRight className="w-5 h-5" />
            <span>
              Verser {formatMoney(amount)} à {targetPlayer?.name || 'Joueur'}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
};
