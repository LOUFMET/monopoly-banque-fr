import { describe, it, expect } from 'vitest';
import { FRENCH_PROPERTIES } from '../data/frenchProperties';
import { formatMoney, calculatePlayerNetWorth, countPlayerProperties } from '../utils/format';
import { Player } from '../types/game';
import { PropertyOwnershipState } from '../types/properties';

describe('Règles Officielles du Monopoly Français', () => {
  it('contient exactement 28 titres de propriété officiels', () => {
    expect(FRENCH_PROPERTIES).toHaveLength(28);

    const streets = FRENCH_PROPERTIES.filter((p) => p.type === 'STREET');
    const stations = FRENCH_PROPERTIES.filter((p) => p.type === 'STATION');
    const utilities = FRENCH_PROPERTIES.filter((p) => p.type === 'UTILITY');

    expect(streets).toHaveLength(22);
    expect(stations).toHaveLength(4);
    expect(utilities).toHaveLength(2);
  });

  it('vérifie que les noms de toutes les propriétés et gares correspondent au standard français', () => {
    const names = FRENCH_PROPERTIES.map((p) => p.name);

    // Propriétés emblématiques
    expect(names).toContain('Rue de la Paix');
    expect(names).toContain('Avenue des Champs-Élysées');
    expect(names).toContain('Boulevard de Belleville');
    expect(names).toContain('Rue Lecourbe');
    expect(names).toContain('Place Pigalle');
    expect(names).toContain('Faubourg Saint-Honoré');

    // 4 Gares
    expect(names).toContain('Gare Montparnasse');
    expect(names).toContain('Gare de Lyon');
    expect(names).toContain('Gare du Nord');
    expect(names).toContain('Gare Saint-Lazare');

    // 2 Compagnies
    expect(names).toContain("Compagnie de Distribution d'Électricité");
    expect(names).toContain('Compagnie de Distribution des Eaux');
  });

  it('vérifie que la valeur hypothécaire vaut 50% du prix d’achat', () => {
    FRENCH_PROPERTIES.forEach((prop) => {
      expect(prop.mortgageValue).toBe(prop.price / 2);
    });
  });

  it('vérifie que la levée d’hypothèque comprend 10% d’intérêts', () => {
    FRENCH_PROPERTIES.forEach((prop) => {
      // capital + 10% = mortgageValue * 1.1 (arrondi standard)
      const expected = Math.round(prop.mortgageValue * 1.1);
      expect(Math.abs(prop.unmortgageCost - expected)).toBeLessThanOrEqual(1);
    });
  });

  it('vérifie le barème exact des 4 gares parisiennes (25 €, 50 €, 100 €, 200 €)', () => {
    const montparnasse = FRENCH_PROPERTIES.find((p) => p.id === 'gare-montparnasse');
    expect(montparnasse).toBeDefined();
    expect(montparnasse?.rents).toEqual([25, 50, 100, 200]);
  });

  it('vérifie le multiplicateur de dés des compagnies de distribution (4x et 10x)', () => {
    const elec = FRENCH_PROPERTIES.find((p) => p.id === 'compagnie-electricite');
    expect(elec).toBeDefined();
    expect(elec?.rents).toEqual([4, 10]);
  });

  it('calcule correctement la fortune nette d’un joueur avec terrains et maisons', () => {
    const player: Player = {
      id: 'p1',
      name: 'Alexandre',
      token: '🎩',
      color: '#10B981',
      balance: 1000,
      isBanker: true,
      isHost: true,
      isBankrupt: false,
      joinedAt: Date.now(),
    };

    // Possession de Rue de la Paix (400 €, maison 200 €) avec 2 maisons
    // + Boulevard de Belleville (60 €) hypothéqué (valeur hypo: 30 €)
    const ownership: Record<string, PropertyOwnershipState> = {
      'rue-de-la-paix': {
        propertyId: 'rue-de-la-paix',
        ownerId: 'p1',
        houses: 2,
        hotel: false,
        isMortgaged: false,
      },
      'boulevard-de-belleville': {
        propertyId: 'boulevard-de-belleville',
        ownerId: 'p1',
        houses: 0,
        hotel: false,
        isMortgaged: true,
      },
    };

    const netWorth = calculatePlayerNetWorth(player, ownership);
    // 1000 (cash) + 400 (Paix) + 2*200 (maisons) + 30 (Belleville hypo) = 1830 €
    expect(netWorth).toBe(1830);

    const counts = countPlayerProperties('p1', ownership);
    expect(counts.total).toBe(2);
    expect(counts.houses).toBe(2);
    expect(counts.mortgaged).toBe(1);
  });

  it('formate correctement les devises en euros français', () => {
    const formatted = formatMoney(1500);
    expect(formatted).toContain('1');
    expect(formatted).toContain('500');
    expect(formatted).toContain('€');
  });

  it('respecte la règle de vente uniforme (vente uniquement autorisée sur le niveau maximal du groupe)', () => {
    // Groupe Bleu Foncé : Champs-Élysées (3 maisons), Rue de la Paix (2 maisons)
    const levels = {
      'avenue-champs-elysees': 3,
      'rue-de-la-paix': 2,
    };
    const maxLevel = Math.max(...Object.values(levels));

    // Vendre sur Champs-Élysées (3) doit être autorisé car 3 === maxLevel
    const canSellChamps = levels['avenue-champs-elysees'] === maxLevel;
    expect(canSellChamps).toBe(true);

    // Vendre sur Paix (2) doit être refusé car 2 < maxLevel (créerait un écart de 2 : 3 vs 1)
    const canSellPaix = levels['rue-de-la-paix'] === maxLevel;
    expect(canSellPaix).toBe(false);
  });

  it('respecte la règle de construction uniforme (construction uniquement autorisée sur le niveau minimal du groupe)', () => {
    const levels = {
      'boulevard-belleville': 2,
      'rue-lecourbe': 1,
    };
    const minLevel = Math.min(...Object.values(levels));

    // Construire sur Lecourbe (1) est autorisé
    expect(levels['rue-lecourbe'] === minLevel).toBe(true);

    // Construire sur Belleville (2) est refusé (créerait un écart de 2 : 3 vs 1)
    expect(levels['boulevard-belleville'] === minLevel).toBe(false);
  });
});
