import React, { useState } from 'react';
import { Property } from '../../types/properties';
import { useGame } from '../../context/GameContext';
import { FRENCH_PROPERTIES } from '../../data/frenchProperties';
import { formatMoney } from '../../utils/format';
import { X, ArrowRightLeft, Building2, AlertTriangle, Check, Coins } from 'lucide-react';
import { triggerHaptic } from '../../utils/sound';

interface TransferOwnershipModalProps {
  property: Property;
  isOpen: boolean;
  onClose: () => void;
}

export const TransferOwnershipModal: React.FC<TransferOwnershipModalProps> = ({
  property,
  isOpen,
  onClose,
}) => {
  const { session, currentPlayer, isBanker, transferPropertyOwnership } = useGame();

  const state = session?.properties[property.id];
  const oldOwnerId = state?.ownerId || 'BANK';
  const oldOwner = oldOwnerId === 'BANK' ? null : session?.players.find((p) => p.id === oldOwnerId);

  // Eligible new owners: all players except current owner, plus the Bank if not already the bank
  const eligiblePlayers = session?.players.filter((p) => p.id !== oldOwnerId) || [];
  const [selectedTargetId, setSelectedTargetId] = useState<string>(
    eligiblePlayers[0]?.id || 'BANK'
  );
  const [priceStr, setPriceStr] = useState<string>('0');

  if (!isOpen || !session || !state) return null;

  const targetPlayer = session.players.find((p) => p.id === selectedTargetId);
  const isTargetBank = selectedTargetId === 'BANK';
  const price = parseInt(priceStr, 10) || 0;

  // Check if street group has buildings
  const colorGroupProps = FRENCH_PROPERTIES.filter((p) => p.group === property.group);
  const hasBuildingsInGroup = property.type === 'STREET' && colorGroupProps.some((p) => {
    const s = session.properties[p.id];
    return s && (s.houses > 0 || s.hotel);
  });

  // Check affordability if price > 0
  const canAfford = isTargetBank || !targetPlayer || price <= 0 || targetPlayer.balance >= price;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasBuildingsInGroup || !canAfford) return;

    const ok = transferPropertyOwnership(property.id, selectedTargetId, price);
    if (ok) {
      triggerHaptic('medium');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-md glass-panel rounded-t-3xl sm:rounded-3xl border border-white/15 p-5 sm:p-6 shadow-2xl animate-in slide-in-from-bottom-6 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Changer de Propriétaire</h3>
              <p className="text-xs text-slate-400">Céder ou déclarer le titre à un autre joueur</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Property Card Header Preview */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden mb-4">
          <div
            className="px-3.5 py-2.5 flex items-center justify-between"
            style={{ backgroundColor: property.colorHex }}
          >
            <div>
              <span
                className="text-[9px] uppercase tracking-widest font-black opacity-85 block"
                style={{ color: property.textColor }}
              >
                {property.groupLabel}
              </span>
              <h4
                className="text-sm font-black uppercase tracking-tight"
                style={{ color: property.textColor }}
              >
                {property.name}
              </h4>
            </div>
            <div className="text-right font-mono font-black text-xs" style={{ color: property.textColor }}>
              Valeur : {formatMoney(property.price)}
            </div>
          </div>

          <div className="p-3 bg-slate-950/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Propriétaire actuel :</span>
            <div className="flex items-center gap-1.5 font-bold text-white">
              {oldOwner ? (
                <>
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0 shadow-xs"
                    style={{ backgroundColor: oldOwner.color }}
                  >
                    {oldOwner.name.charAt(0).toUpperCase()}
                  </div>
                  <span>{oldOwner.name}</span>
                </>
              ) : (
                <span className="text-slate-400">La Banque</span>
              )}
            </div>
          </div>
        </div>

        {/* Warning if group has buildings */}
        {hasBuildingsInGroup && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs mb-4 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <div>
              <strong className="font-bold block text-rose-200">Bâtiments construits</strong>
              Selon les règles officielles du Monopoly, il est interdit de céder un terrain tant que des maisons ou hôtels sont érigés sur ce groupe de couleur. Vendez-les d'abord à la Banque.
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Select New Owner */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Nouveau Propriétaire
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
              {/* Other players */}
              {eligiblePlayers.map((player) => {
                const isSelected = selectedTargetId === player.id;
                return (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setSelectedTargetId(player.id);
                    }}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 text-white shadow-sm ring-1 ring-amber-400'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div
                      className="w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-black text-white shrink-0 shadow-xs"
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

              {/* Option to return to Bank */}
              {oldOwnerId !== 'BANK' && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setSelectedTargetId('BANK');
                  }}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                    isTargetBank
                      ? 'bg-slate-800 border-slate-600 text-white shadow-sm ring-1 ring-slate-400'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <div className="w-7 h-7 rounded-xl bg-slate-800 flex items-center justify-center text-amber-400 shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-200 truncate">La Banque</div>
                    <div className="text-[10px] text-slate-500">Restituer</div>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Transfer Price / Compensation */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Prix de cession (€)
              </label>
              <span className="text-[11px] text-slate-400">
                0 € = Cession gratuite / Accord direct
              </span>
            </div>

            <div className="relative">
              <input
                type="number"
                min={0}
                step={1}
                value={priceStr}
                onChange={(e) => setPriceStr(e.target.value)}
                placeholder="0"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-700 text-center font-mono text-2xl font-black text-amber-400 placeholder-slate-600 focus:outline-none focus:border-amber-400"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-500 text-lg">
                €
              </span>
            </div>

            {/* Quick Price Buttons */}
            <div className="grid grid-cols-5 gap-1 mt-2">
              {[0, 50, 100, 200, property.price].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setPriceStr(String(val));
                  }}
                  className={`py-1 text-[11px] font-mono font-bold rounded-lg border transition-all active:scale-95 text-center ${
                    price === val
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {val === 0 ? 'Gratuit' : `${val} €`}
                </button>
              ))}
            </div>

            {/* Inability to pay warning */}
            {!canAfford && targetPlayer && (
              <p className="text-xs text-rose-400 font-medium mt-1.5 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {targetPlayer.name} n'a pas assez d'argent ({formatMoney(targetPlayer.balance)}).
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={hasBuildingsInGroup || !canAfford || (!targetPlayer && !isTargetBank)}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>
              Transférer le titre à {targetPlayer?.name || (isTargetBank ? 'la Banque' : '...')}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
};
