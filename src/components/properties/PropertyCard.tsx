import React, { useState } from 'react';
import { Property } from '../../types/properties';
import { useGame } from '../../context/GameContext';
import { FRENCH_PROPERTIES } from '../../data/frenchProperties';
import { formatMoney } from '../../utils/format';
import {
  ChevronDown,
  ChevronUp,
  Building,
  Plus,
  Minus,
  Coins,
  ShieldAlert,
  CheckCircle,
  HelpCircle,
  Gavel,
  ArrowRightLeft,
} from 'lucide-react';
import { triggerHaptic } from '../../utils/sound';
import { AuctionModal } from './AuctionModal';
import { TransferOwnershipModal } from './TransferOwnershipModal';

interface PropertyCardProps {
  property: Property;
  onOpenRentCalculator: (property: Property) => void;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  onOpenRentCalculator,
}) => {
  const {
    session,
    currentPlayer,
    isBanker,
    buyPropertyFromBank,
    mortgageProperty,
    unmortgageProperty,
    buildHouse,
    sellHouse,
  } = useGame();

  const [expanded, setExpanded] = useState(false);
  const [isAuctionOpen, setIsAuctionOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  if (!session || !currentPlayer) return null;

  const state = session.properties[property.id] || {
    propertyId: property.id,
    ownerId: 'BANK',
    houses: 0,
    hotel: false,
    isMortgaged: false,
  };

  const isBank = state.ownerId === 'BANK';
  const isMine = state.ownerId === currentPlayer.id;
  const owner = isBank ? null : session.players.find((p) => p.id === state.ownerId);

  // Check if owner holds full group (Monopoly)
  const groupProperties = FRENCH_PROPERTIES.filter((p) => p.group === property.group);
  const ownsAllGroup = owner
    ? groupProperties.every((p) => session.properties[p.id]?.ownerId === owner.id)
    : false;

  // Uniform building and selling calculation (Monopoly official rule)
  const getBuildingLevel = (pid: string) => {
    const s = session.properties[pid];
    if (!s) return 0;
    if (s.hotel) return 5;
    return s.houses || 0;
  };

  const currentLevel = getBuildingLevel(property.id);
  const groupLevels = groupProperties.map((p) => getBuildingLevel(p.id));
  const maxLevel = Math.max(...groupLevels);
  const minLevel = Math.min(...groupLevels);

  const canSellUniform = (state.houses > 0 || state.hotel) && currentLevel === maxLevel;
  const canBuildUniform = !state.hotel && property.houseCost > 0 && currentPlayer.balance >= property.houseCost && currentLevel === minLevel;

  const canAffordBuy = currentPlayer.balance >= property.price;
  const canAffordUnmortgage = currentPlayer.balance >= property.unmortgageCost;
  const canAffordHouse = property.houseCost > 0 && currentPlayer.balance >= property.houseCost;

  return (
    <div
      className={`rounded-2xl border transition-all overflow-hidden relative shadow-lg ${
        state.isMortgaged
          ? 'bg-slate-950/80 border-rose-900/50 opacity-80'
          : isMine
          ? 'bg-slate-900/90 border-amber-400/40 ring-1 ring-amber-400/20'
          : 'bg-slate-900/70 border-white/10 hover:border-white/20'
      }`}
    >
      {/* Slashed banner overlay if mortgaged */}
      {state.isMortgaged && (
        <div className="absolute top-8 -right-12 z-20 bg-rose-600/90 text-white text-[10px] font-black uppercase tracking-widest py-1 px-12 rotate-45 shadow-md pointer-events-none">
          Hypothéquée
        </div>
      )}

      {/* Top Banner with Property Color */}
      <div
        className="p-3 relative flex items-center justify-between"
        style={{ backgroundColor: property.colorHex }}
      >
        <div className="min-w-0 pr-6">
          <span
            className="text-[9px] uppercase tracking-widest font-black opacity-85 block truncate"
            style={{ color: property.textColor }}
          >
            {property.groupLabel}
          </span>
          <h4
            className="text-xs sm:text-sm font-black uppercase tracking-tight truncate"
            style={{ color: property.textColor }}
          >
            {property.name}
          </h4>
        </div>

        <div className="text-right shrink-0">
          <span
            className="text-xs font-mono font-black px-2 py-0.5 rounded-md bg-black/30"
            style={{ color: property.textColor }}
          >
            {formatMoney(property.price)}
          </span>
        </div>
      </div>

      {/* Ownership & Status Bar */}
      <div className="px-3.5 py-2.5 bg-slate-950/50 border-b border-white/5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 min-w-0">
          {isBank ? (
            <span className="text-slate-400 font-medium">Disponible à la Banque</span>
          ) : (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-slate-400 text-[11px]">Propriétaire :</span>
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0"
                style={{ backgroundColor: owner?.color }}
              >
                {owner?.token}
              </div>
              <span className="font-bold text-white truncate max-w-[100px]">
                {owner?.name}
              </span>
              {isMine && (
                <span className="text-[9px] px-1 rounded bg-amber-400/20 text-amber-300 font-bold">
                  Vous
                </span>
              )}
            </div>
          )}
        </div>

        {/* Monopoly indicator or Houses badge */}
        <div className="flex items-center gap-1 shrink-0">
          {ownsAllGroup && property.type === 'STREET' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
              Monopole
            </span>
          )}
          {state.hotel && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
              🏨 Hôtel
            </span>
          )}
          {!state.hotel && state.houses > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
              🏠 {state.houses}
            </span>
          )}
        </div>
      </div>

      {/* Action Zone */}
      <div className="p-3.5 space-y-2.5">
        {/* CASE 1: AVAILABLE AT BANK */}
        {isBank && (
          <div className="space-y-2">
            {/* Bouton d'Enchère Principal */}
            <button
              onClick={() => {
                triggerHaptic('medium');
                setIsAuctionOpen(true);
              }}
              className="w-full py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 active:scale-98 cursor-pointer"
            >
              <Gavel className="w-4 h-4" />
              {isBanker ? '🔨 Vendre aux enchères (Prix libre)' : '🔨 Acheter aux enchères'}
            </button>

            {/* Achat direct optionnel au prix officiel */}
            <button
              onClick={() => {
                triggerHaptic('medium');
                buyPropertyFromBank(property.id);
              }}
              disabled={!canAffordBuy}
              className={`w-full py-1.5 px-2.5 rounded-lg font-medium text-[11px] flex items-center justify-center gap-1 transition-all ${
                canAffordBuy
                  ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 active:scale-98 cursor-pointer'
                  : 'bg-slate-950/60 text-slate-600 cursor-not-allowed border border-slate-800'
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
              Prix standard : {formatMoney(property.price)}
            </button>

            <AuctionModal
              property={property}
              isOpen={isAuctionOpen}
              onClose={() => setIsAuctionOpen(false)}
            />
          </div>
        )}

        {/* CASE 2: OWNED BY CURRENT PLAYER */}
        {isMine && (
          <div className="space-y-2">
            {/* Construction controls (Streets only) */}
            {property.type === 'STREET' && ownsAllGroup && !state.isMortgaged && (
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[11px] text-slate-300 font-medium flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-amber-400" />
                  Maison ({property.houseCost} €)
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      sellHouse(property.id);
                    }}
                    disabled={!canSellUniform}
                    className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
                    title={
                      state.houses === 0 && !state.hotel
                        ? 'Aucun bâtiment à revendre'
                        : currentLevel < maxLevel
                        ? 'Vente non uniforme : revendez d’abord sur les terrains ayant le plus de bâtiments'
                        : 'Revendre un bâtiment à la banque'
                    }
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-mono font-bold text-white px-2">
                    {state.hotel ? 'Hôtel' : `${state.houses}/4`}
                  </span>
                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      buildHouse(property.id);
                    }}
                    disabled={!canBuildUniform}
                    className="p-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    title={
                      state.hotel
                        ? 'Maximum atteint (Hôtel)'
                        : !canAffordHouse
                        ? 'Fonds insuffisants'
                        : currentLevel > minLevel
                        ? 'Construction non uniforme : construisez d’abord sur les terrains ayant le moins de bâtiments'
                        : 'Construire une maison ou un hôtel'
                    }
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Mortgage / Unmortgage Actions */}
            <div className="grid grid-cols-1 gap-1.5">
              {!state.isMortgaged ? (
                <button
                  onClick={() => {
                    triggerHaptic('medium');
                    mortgageProperty(property.id);
                  }}
                  disabled={state.houses > 0 || state.hotel}
                  className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-rose-300 hover:text-rose-200 border border-rose-500/20 text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Hypothéquer (+{formatMoney(property.mortgageValue)})
                </button>
              ) : (
                <button
                  onClick={() => {
                    triggerHaptic('medium');
                    unmortgageProperty(property.id);
                  }}
                  disabled={!canAffordUnmortgage}
                  className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all ${
                    canAffordUnmortgage
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                      : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Lever l'hypothèque (-{formatMoney(property.unmortgageCost)})
                </button>
              )}
            </div>

            {/* Cession / Déclaration de propriétaire */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setIsTransferModalOpen(true);
              }}
              className="w-full py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-amber-500/20 text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-98 cursor-pointer"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
              Céder / Déclarer un nouveau propriétaire
            </button>
          </div>
        )}

        {/* CASE 3: OWNED BY ANOTHER PLAYER */}
        {!isBank && !isMine && (
          <div className="space-y-2">
            <button
              onClick={() => onOpenRentCalculator(property)}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40 active:scale-98 transition-all cursor-pointer"
            >
              <Coins className="w-4 h-4" />
              Calculer & Payer le Loyer
            </button>

            {isBanker && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setIsTransferModalOpen(true);
                }}
                className="w-full py-1.5 px-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-amber-400/90 border border-amber-500/20 text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 active:scale-98 cursor-pointer"
              >
                <ArrowRightLeft className="w-3 h-3" />
                Arbitrage Banquier : Céder ce titre
              </button>
            )}
          </div>
        )}

        {/* Expandable Rent Table */}
        <div>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between pt-1 text-[11px] text-slate-400 hover:text-slate-200"
          >
            <span>Détail des loyers officiels</span>
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {expanded && (
            <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] space-y-1 text-slate-300 font-mono animate-in fade-in">
              {property.type === 'STREET' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Terrain nu :</span>
                    <span>{formatMoney(property.rents[0])}</span>
                  </div>
                  <div className="flex justify-between text-emerald-400">
                    <span>Nu avec Monopole :</span>
                    <span>{formatMoney(property.rents[0] * 2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Avec 1 Maison :</span>
                    <span>{formatMoney(property.rents[1])}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Avec 2 Maisons :</span>
                    <span>{formatMoney(property.rents[2])}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Avec 3 Maisons :</span>
                    <span>{formatMoney(property.rents[3])}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Avec 4 Maisons :</span>
                    <span>{formatMoney(property.rents[4])}</span>
                  </div>
                  <div className="flex justify-between text-amber-300 font-bold">
                    <span>Avec Hôtel :</span>
                    <span>{formatMoney(property.rents[5])}</span>
                  </div>
                  <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800/60">
                    <span>Coût maison/hôtel :</span>
                    <span>{formatMoney(property.houseCost)}</span>
                  </div>
                </>
              )}

              {property.type === 'STATION' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-400">1 Gare possédée :</span>
                    <span>25 €</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">2 Gares :</span>
                    <span>50 €</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">3 Gares :</span>
                    <span>100 €</span>
                  </div>
                  <div className="flex justify-between text-amber-300 font-bold">
                    <span>4 Gares (Réseau complet) :</span>
                    <span>200 €</span>
                  </div>
                </>
              )}

              {property.type === 'UTILITY' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-400">1 Compagnie détenue :</span>
                    <span>4 × montant des dés</span>
                  </div>
                  <div className="flex justify-between text-amber-300 font-bold">
                    <span>Les 2 Compagnies :</span>
                    <span>10 × montant des dés</span>
                  </div>
                </>
              )}

              <div className="flex justify-between text-rose-300 pt-1 border-t border-slate-800/60">
                <span>Valeur Hypothécaire :</span>
                <span>{formatMoney(property.mortgageValue)}</span>
              </div>
              <div className="flex justify-between text-rose-400">
                <span>Levée d'hypothèque (+10%) :</span>
                <span>{formatMoney(property.unmortgageCost)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <TransferOwnershipModal
        property={property}
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
      />
    </div>
  );
};
