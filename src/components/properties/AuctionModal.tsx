import React, { useState } from 'react';
import { Property } from '../../types/properties';
import { useGame } from '../../context/GameContext';
import { formatMoney } from '../../utils/format';
import { Gavel, X, Plus, Minus, Check, AlertCircle, Coins, User } from 'lucide-react';
import { triggerHaptic } from '../../utils/sound';

interface AuctionModalProps {
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AuctionModal: React.FC<AuctionModalProps> = ({
  property,
  isOpen,
  onClose,
}) => {
  const { session, currentPlayer, isBanker, buyPropertyFromBank } = useGame();

  if (!isOpen || !property || !session || !currentPlayer) return null;

  // Selected winner: default to current player, but if banker, can pick anyone
  const [selectedWinnerId, setSelectedWinnerId] = useState<string>(currentPlayer.id);
  const [auctionPriceStr, setAuctionPriceStr] = useState<string>(property.price.toString());

  const winner = session.players.find((p) => p.id === selectedWinnerId) || currentPlayer;
  const auctionPrice = parseInt(auctionPriceStr, 10) || 0;
  const canAfford = winner.balance >= auctionPrice && auctionPrice > 0;

  const handleAdjustPrice = (delta: number) => {
    triggerHaptic('light');
    const newPrice = Math.max(10, auctionPrice + delta);
    setAuctionPriceStr(newPrice.toString());
  };

  const handleConfirmAuction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAfford) return;

    triggerHaptic('heavy');
    const success = buyPropertyFromBank(property.id, winner.id, auctionPrice);
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-md glass-panel rounded-3xl border border-amber-500/40 p-5 sm:p-6 shadow-2xl max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Gavel className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                Vente aux Enchères
              </h3>
              <p className="text-xs text-slate-400">Règle personnalisée de la table</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Property Badge preview */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-10 rounded-lg shadow-sm"
              style={{ backgroundColor: property.colorHex }}
            />
            <div>
              <h4 className="text-sm font-black text-white">{property.name}</h4>
              <p className="text-[11px] text-slate-400">
                {property.groupLabel} • Prix catalogue :{' '}
                <span className="font-mono font-bold text-slate-300">
                  {formatMoney(property.price)}
                </span>
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleConfirmAuction} className="space-y-4">
          {/* Winner Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              {isBanker ? "Attribué au joueur vainqueur :" : "Acheteur (Votre solde) :"}
            </label>

            {isBanker ? (
              <div className="grid grid-cols-2 gap-2">
                {session.players.map((p) => {
                  const isSelected = p.id === winner.id;
                  const hasFunds = p.balance >= auctionPrice;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setSelectedWinnerId(p.id);
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2 ${
                        isSelected
                          ? 'border-amber-400 bg-amber-500/20 text-white ring-2 ring-amber-400/40'
                          : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white shadow-sm"
                        style={{ backgroundColor: p.color }}
                      >
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold truncate">{p.name}</div>
                        <div
                          className={`text-[10px] font-mono font-bold ${
                            hasFunds ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {formatMoney(p.balance)}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-white"
                    style={{ backgroundColor: winner.color }}
                  >
                    {winner.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{winner.name}</div>
                    <div className="text-[11px] text-slate-400">Votre solde disponible</div>
                  </div>
                </div>
                <div className="text-sm font-mono font-bold text-emerald-400">
                  {formatMoney(winner.balance)}
                </div>
              </div>
            )}
          </div>

          {/* Auction Price Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Prix Adjugé de l'Enchère (€)
              </label>
              <button
                type="button"
                onClick={() => setAuctionPriceStr(property.price.toString())}
                className="text-[11px] text-amber-400 hover:underline font-medium"
              >
                Remettre au prix catalogue ({property.price} €)
              </button>
            </div>

            <div className="relative">
              <input
                type="number"
                min={1}
                step={1}
                value={auctionPriceStr}
                onChange={(e) => setAuctionPriceStr(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-slate-700 text-center font-mono text-3xl font-black text-amber-400 placeholder-slate-600 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/40"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-500 text-lg">
                €
              </span>
            </div>

            {/* Quick Adjustment Buttons */}
            <div className="grid grid-cols-5 gap-1.5 mt-2">
              {[-50, -10, 10, 50, 100].map((delta) => (
                <button
                  key={delta}
                  type="button"
                  onClick={() => handleAdjustPrice(delta)}
                  className="py-1.5 text-xs font-mono font-bold rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white transition-all active:scale-95"
                >
                  {delta > 0 ? `+${delta}` : delta}
                </button>
              ))}
            </div>
          </div>

          {/* Affordability check banner */}
          {!canAfford && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>
                {auctionPrice <= 0
                  ? 'Veuillez saisir un montant supérieur à 0 €.'
                  : `${winner.name} n'a pas assez d'argent (${formatMoney(
                      winner.balance
                    )} disponibles pour ${formatMoney(auctionPrice)} demandés).`}
              </span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!canAfford}
            className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xl transition-all active:scale-[0.98] ${
              canAfford
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/25 cursor-pointer'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            <Gavel className="w-4 h-4" />
            Adjuger à {winner.name} pour {formatMoney(auctionPrice)}
          </button>
        </form>
      </div>
    </div>
  );
};
