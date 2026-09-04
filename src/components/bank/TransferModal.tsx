import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { formatMoney } from '../../utils/format';
import { X, Send, ArrowRight, Building2, User } from 'lucide-react';
import { triggerHaptic } from '../../utils/sound';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRecipientId?: string;
  defaultAmount?: number;
  defaultReason?: string;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  defaultRecipientId,
  defaultAmount,
  defaultReason,
}) => {
  const { session, currentPlayer, transferPlayerToPlayer, payToBank } = useGame();

  const [recipientId, setRecipientId] = useState<string>(defaultRecipientId || 'BANK');
  const [amountStr, setAmountStr] = useState<string>(defaultAmount ? String(defaultAmount) : '');
  const [note, setNote] = useState<string>(defaultReason || '');

  if (!isOpen || !session || !currentPlayer) return null;

  const amount = parseInt(amountStr, 10) || 0;
  const isTargetBank = recipientId === 'BANK';
  const otherPlayers = session.players.filter((p) => p.id !== currentPlayer.id);
  const targetPlayer = otherPlayers.find((p) => p.id === recipientId);

  const canAfford = currentPlayer.balance >= amount;
  const remainingBalance = currentPlayer.balance - amount;

  const handleQuickAdd = (value: number) => {
    triggerHaptic('light');
    const current = parseInt(amountStr, 10) || 0;
    setAmountStr(String(current + value));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || !canAfford) return;

    if (isTargetBank) {
      const ok = payToBank(
        currentPlayer.id,
        amount,
        note ? `Paiement Banque (${note})` : `Paiement à la Banque`,
        note
      );
      if (ok) onClose();
    } else if (targetPlayer) {
      const ok = transferPlayerToPlayer(
        currentPlayer.id,
        targetPlayer.id,
        amount,
        note ? `Virement (${note})` : `Virement à ${targetPlayer.name}`,
        note
      );
      if (ok) onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md glass-panel rounded-t-3xl sm:rounded-3xl border border-white/10 p-5 sm:p-6 shadow-2xl animate-in slide-in-from-bottom-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Transférer des Fonds</h3>
              <p className="text-xs text-slate-400">Virement sécurisé en temps réel</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Recipient Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Destinataire
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
              {/* Option 1: The Bank */}
              <button
                type="button"
                onClick={() => setRecipientId('BANK')}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                  isTargetBank
                    ? 'bg-amber-500/20 border-amber-400 text-white shadow-sm ring-1 ring-amber-400'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">La Banque</div>
                  <div className="text-[10px] text-slate-400">Taxes, amendes, etc.</div>
                </div>
              </button>

              {/* Other Players */}
              {otherPlayers.map((player) => {
                const isSelected = recipientId === player.id;
                return (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => setRecipientId(player.id)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-blue-500/20 border-blue-400 text-white shadow-sm ring-1 ring-blue-400'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0 shadow-xs"
                      style={{ backgroundColor: player.color }}
                    >
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold truncate">{player.name}</div>
                      <div className="text-[10px] font-mono text-emerald-400 truncate">
                        {formatMoney(player.balance)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Montant (€)
              </label>
              <span className="text-xs text-slate-400 font-mono">
                Solde actuel : <strong className="text-emerald-400">{formatMoney(currentPlayer.balance)}</strong>
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                min="1"
                step="1"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0"
                required
                className="w-full px-4 py-3 text-2xl font-mono font-black rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">
                €
              </span>
            </div>

            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-5 gap-1.5 mt-2">
              {[10, 50, 100, 200, 500].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAdd(val)}
                  className="py-1.5 text-xs font-mono font-bold rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 transition-colors"
                >
                  +{val}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Note / Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Motif / Commentaire (Optionnel)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="ex: Loyer Rue de la Paix, Achat terrain, Cadeau..."
              className="w-full px-3.5 py-2 text-sm rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 text-xs"
            />
          </div>

          {/* Balance projection summary */}
          {amount > 0 && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                canAfford
                  ? 'bg-slate-900/80 border-slate-800 text-slate-300'
                  : 'bg-rose-950/40 border-rose-600/50 text-rose-300'
              }`}
            >
              <span>Nouveau solde après transfert :</span>
              <span
                className={`font-mono font-bold text-sm ${
                  canAfford ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formatMoney(remainingBalance)}
              </span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={amount <= 0 || !canAfford}
            className={`w-full py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
              amount > 0 && canAfford
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 active:scale-[0.98]'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            <Send className="w-4 h-4" />
            Envoyer {amount > 0 ? formatMoney(amount) : ''}
          </button>
        </form>
      </div>
    </div>
  );
};
