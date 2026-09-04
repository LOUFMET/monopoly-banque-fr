import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { Property } from '../../types/properties';
import { FRENCH_PROPERTIES } from '../../data/frenchProperties';
import { formatMoney } from '../../utils/format';
import { X, Dices, Send, Building2, AlertTriangle } from 'lucide-react';
import { triggerHaptic } from '../../utils/sound';

interface RentCalculatorModalProps {
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RentCalculatorModal: React.FC<RentCalculatorModalProps> = ({
  property,
  isOpen,
  onClose,
}) => {
  const { session, currentPlayer, payRent } = useGame();
  const [diceTotal, setDiceTotal] = useState<number>(7); // Default dice roll for utilities

  if (!isOpen || !property || !session || !currentPlayer) return null;

  const state = session.properties[property.id];
  if (!state || state.ownerId === 'BANK') return null;

  const owner = session.players.find((p) => p.id === state.ownerId);
  if (!owner) return null;

  // Calculate rent
  let rentAmount = 0;
  let rentExplanation = '';

  if (property.type === 'STREET') {
    if (state.hotel) {
      rentAmount = property.rents[5];
      rentExplanation = 'Hôtel (Niveau maximal)';
    } else if (state.houses > 0) {
      rentAmount = property.rents[state.houses];
      rentExplanation = `${state.houses} Maison${state.houses > 1 ? 's' : ''}`;
    } else {
      // Bare terrain: check monopoly
      const groupProps = FRENCH_PROPERTIES.filter((p) => p.group === property.group);
      const hasMonopoly = groupProps.every(
        (p) => session.properties[p.id]?.ownerId === owner.id
      );

      if (hasMonopoly) {
        rentAmount = property.rents[0] * 2;
        rentExplanation = 'Terrain nu (Loyer doublé car le groupe complet est détenu sans constructions)';
      } else {
        rentAmount = property.rents[0];
        rentExplanation = 'Terrain nu (sans constructions)';
      }
    }
  } else if (property.type === 'STATION') {
    const stationProps = FRENCH_PROPERTIES.filter((p) => p.group === 'STATION');
    const stationsOwned = stationProps.filter(
      (p) => session.properties[p.id]?.ownerId === owner.id
    ).length;
    const tier = Math.min(Math.max(stationsOwned - 1, 0), 3);
    rentAmount = property.rents[tier] || 25;
    rentExplanation = `${stationsOwned} Gare${stationsOwned > 1 ? 's' : ''} détenue${stationsOwned > 1 ? 's' : ''} par ${owner.name}`;
  } else if (property.type === 'UTILITY') {
    const utilityProps = FRENCH_PROPERTIES.filter((p) => p.group === 'UTILITY');
    const utilitiesOwned = utilityProps.filter(
      (p) => session.properties[p.id]?.ownerId === owner.id
    ).length;
    const multiplier = utilitiesOwned === 2 ? 10 : 4;
    rentAmount = diceTotal * multiplier;
    rentExplanation = `${diceTotal} (dés) × ${multiplier} (${utilitiesOwned === 2 ? '2 Compagnies' : '1 Compagnie'})`;
  }

  const canAfford = currentPlayer.balance >= rentAmount;

  const handlePay = () => {
    triggerHaptic('medium');
    const ok = payRent(property.id, property.type === 'UTILITY' ? diceTotal : undefined);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md glass-panel rounded-t-3xl sm:rounded-3xl border border-white/10 p-5 sm:p-6 shadow-2xl animate-in slide-in-from-bottom-6">
        {/* Header with property color ribbon */}
        <div className="relative -mt-2 -mx-2 mb-4 p-4 rounded-2xl overflow-hidden text-center shadow-lg" style={{ backgroundColor: property.colorHex }}>
          <div className="absolute inset-0 bg-black/15" />
          <div className="relative z-10">
            <span className="text-[10px] uppercase tracking-widest font-black opacity-80" style={{ color: property.textColor }}>
              Titre de Propriété
            </span>
            <h3 className="text-lg font-black uppercase tracking-tight" style={{ color: property.textColor }}>
              {property.name}
            </h3>
            <div className="flex items-center justify-center gap-1.5 text-xs font-medium opacity-90 mt-0.5" style={{ color: property.textColor }}>
              <span>Propriétaire : <strong>{owner.name}</strong></span>
              <span
                className="w-4 h-4 rounded-full inline-flex items-center justify-center text-[9px] font-black text-white shadow-xs"
                style={{ backgroundColor: owner.color }}
              >
                {owner.name.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors z-20"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hypothéqué Warning */}
        {state.isMortgaged ? (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-200 text-center space-y-1">
            <div className="font-bold flex items-center justify-center gap-1.5 text-sm">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              Propriété Hypothéquée
            </div>
            <p className="text-xs text-rose-300/90">
              Selon les règles officielles du Monopoly, une propriété hypothéquée ne rapporte aucun loyer.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Rent Breakdown */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-1">
              <div className="text-xs uppercase font-semibold tracking-wider text-slate-400">
                Loyer Exact à Régler
              </div>
              <div className="text-4xl font-mono font-black text-amber-400">
                {formatMoney(rentAmount)}
              </div>
              <p className="text-xs text-slate-300 font-medium">{rentExplanation}</p>
            </div>

            {/* If Utility: Dice Input Selector */}
            {property.type === 'UTILITY' && (
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-semibold flex items-center gap-1">
                    <Dices className="w-4 h-4 text-amber-400" />
                    Total du lancer de dés physique
                  </span>
                  <span className="font-mono font-black text-amber-400 text-base">{diceTotal}</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="12"
                  value={diceTotal}
                  onChange={(e) => setDiceTotal(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>Min: 2</span>
                  <span>Moyenne: 7</span>
                  <span>Max: 12</span>
                </div>
              </div>
            )}

            {/* Current Player Funds Check */}
            <div className="flex items-center justify-between text-xs px-1 text-slate-400">
              <span>Votre solde disponible :</span>
              <span className={`font-mono font-bold ${canAfford ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatMoney(currentPlayer.balance)}
              </span>
            </div>

            {/* Pay Button */}
            <button
              onClick={handlePay}
              disabled={!canAfford}
              className={`w-full py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-xl transition-all ${
                canAfford
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 active:scale-[0.98]'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              <Send className="w-4 h-4" />
              Payer {formatMoney(rentAmount)} à {owner.name}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
