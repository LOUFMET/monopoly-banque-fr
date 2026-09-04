import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { Property, PropertyColorGroup } from '../../types/properties';
import {
  FRENCH_PROPERTIES,
  PROPERTY_GROUPS_ORDER,
  GROUP_TITLES,
} from '../../data/frenchProperties';
import { PropertyCard } from './PropertyCard';
import { RentCalculatorModal } from './RentCalculatorModal';
import { Building2, Search, Filter, Home, Sparkles } from 'lucide-react';

type FilterType = 'ALL' | 'MINE' | 'BANK' | 'RIVALS' | 'MORTGAGED';

export const PropertyCatalog: React.FC = () => {
  const { session, currentPlayer } = useGame();
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPropertyForRent, setSelectedPropertyForRent] = useState<Property | null>(null);

  if (!session || !currentPlayer) return null;

  // Filter properties
  const filteredProperties = FRENCH_PROPERTIES.filter((prop) => {
    const state = session.properties[prop.id];
    if (!state) return false;

    // Search query match
    if (searchQuery.trim()) {
      const matchName = prop.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchGroup = prop.groupLabel.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchName && !matchGroup) return false;
    }

    // Filter pills
    if (activeFilter === 'MINE') return state.ownerId === currentPlayer.id;
    if (activeFilter === 'BANK') return state.ownerId === 'BANK';
    if (activeFilter === 'RIVALS') return state.ownerId !== 'BANK' && state.ownerId !== currentPlayer.id;
    if (activeFilter === 'MORTGAGED') return state.isMortgaged;

    return true;
  });

  // Group filtered properties by color group
  const groupedProperties: Record<PropertyColorGroup, Property[]> = {} as any;
  PROPERTY_GROUPS_ORDER.forEach((grp) => {
    groupedProperties[grp] = [];
  });

  filteredProperties.forEach((prop) => {
    if (groupedProperties[prop.group]) {
      groupedProperties[prop.group].push(prop);
    }
  });

  // Counts for filters
  const countMine = FRENCH_PROPERTIES.filter(
    (p) => session.properties[p.id]?.ownerId === currentPlayer.id
  ).length;
  const countBank = FRENCH_PROPERTIES.filter(
    (p) => session.properties[p.id]?.ownerId === 'BANK'
  ).length;
  const countRivals = FRENCH_PROPERTIES.filter(
    (p) =>
      session.properties[p.id]?.ownerId !== 'BANK' &&
      session.properties[p.id]?.ownerId !== currentPlayer.id
  ).length;
  const countMortgaged = FRENCH_PROPERTIES.filter(
    (p) => session.properties[p.id]?.isMortgaged
  ).length;

  return (
    <div className="space-y-4 pb-20 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-400" />
            Titres de Propriété
          </h2>
          <p className="text-xs text-slate-400">28 propriétés du plateau français</p>
        </div>
        <div className="text-xs font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
          Banque: <strong className="text-amber-400">{countBank}</strong> libres
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher une rue, une gare..."
          className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
          >
            Effacer
          </button>
        )}
      </div>

      {/* Filter Tabs / Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        <button
          onClick={() => setActiveFilter('ALL')}
          className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all ${
            activeFilter === 'ALL'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          Tous (28)
        </button>

        <button
          onClick={() => setActiveFilter('MINE')}
          className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all ${
            activeFilter === 'MINE'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          Mes Titres ({countMine})
        </button>

        <button
          onClick={() => setActiveFilter('BANK')}
          className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all ${
            activeFilter === 'BANK'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          À Vendre ({countBank})
        </button>

        <button
          onClick={() => setActiveFilter('RIVALS')}
          className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all ${
            activeFilter === 'RIVALS'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          Adversaires ({countRivals})
        </button>

        {countMortgaged > 0 && (
          <button
            onClick={() => setActiveFilter('MORTGAGED')}
            className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all ${
              activeFilter === 'MORTGAGED'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'bg-rose-950/40 text-rose-300 hover:text-white border border-rose-500/30'
            }`}
          >
            Hypothéqués ({countMortgaged})
          </button>
        )}
      </div>

      {/* Property Groups List */}
      <div className="space-y-6">
        {PROPERTY_GROUPS_ORDER.map((groupKey) => {
          const propsInGroup = groupedProperties[groupKey];
          if (!propsInGroup || propsInGroup.length === 0) return null;

          // Check if any player has the full monopoly for this group
          const groupTotal = propsInGroup[0].groupTotal;
          const firstOwnerId = session.properties[propsInGroup[0].id]?.ownerId;
          const isBankGroup = firstOwnerId === 'BANK';
          const fullMonopolyOwnerId =
            !isBankGroup &&
            firstOwnerId &&
            propsInGroup.every((p) => session.properties[p.id]?.ownerId === firstOwnerId)
              ? firstOwnerId
              : null;
          const fullMonopolyPlayer = fullMonopolyOwnerId
            ? session.players.find((p) => p.id === fullMonopolyOwnerId)
            : null;

          return (
            <div key={groupKey} className="space-y-2.5">
              <div className="flex items-center justify-between px-1 border-b border-white/5 pb-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  {GROUP_TITLES[groupKey]}
                </h3>
                {fullMonopolyPlayer && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                    Monopole de {fullMonopolyPlayer.name}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {propsInGroup.map((prop) => (
                  <PropertyCard
                    key={prop.id}
                    property={prop}
                    onOpenRentCalculator={(p) => setSelectedPropertyForRent(p)}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {filteredProperties.length === 0 && (
          <div className="glass-panel p-8 rounded-2xl text-center space-y-2">
            <Home className="w-8 h-8 text-slate-500 mx-auto" />
            <div className="text-sm font-bold text-white">Aucun titre trouvé</div>
            <p className="text-xs text-slate-400">
              Aucune propriété ne correspond à votre filtre actuel.
            </p>
          </div>
        )}
      </div>

      {/* Rent Calculator Modal */}
      <RentCalculatorModal
        property={selectedPropertyForRent}
        isOpen={Boolean(selectedPropertyForRent)}
        onClose={() => setSelectedPropertyForRent(null)}
      />
    </div>
  );
};
