import { FRENCH_PROPERTIES } from '../data/frenchProperties';
import { Player } from '../types/game';
import { PropertyOwnershipState } from '../types/properties';

export const formatMoney = (amount: number): string => {
  const formatted = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount);
  return formatted;
};

export const formatShortTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

/**
 * Calcul de la fortune nette d'un joueur :
 * Solde liquide + Valeur des terrains non hypothéqués (prix d'achat)
 * + Valeur des terrains hypothéqués (valeur hypothécaire)
 * + Valeur des maisons et hôtels construits
 */
export const calculatePlayerNetWorth = (
  player: Player,
  propertiesState: Record<string, PropertyOwnershipState>
): number => {
  let netWorth = player.balance;

  FRENCH_PROPERTIES.forEach((prop) => {
    const state = propertiesState[prop.id];
    if (state && state.ownerId === player.id) {
      if (state.isMortgaged) {
        netWorth += prop.mortgageValue;
      } else {
        netWorth += prop.price;
        // Bâtiments
        if (state.hotel) {
          netWorth += prop.houseCost * 5;
        } else if (state.houses > 0) {
          netWorth += prop.houseCost * state.houses;
        }
      }
    }
  });

  return netWorth;
};

/**
 * Calcule le nombre total de propriétés possédées par un joueur
 */
export const countPlayerProperties = (
  playerId: string,
  propertiesState: Record<string, PropertyOwnershipState>
): { total: number; mortgaged: number; houses: number; hotels: number } => {
  let total = 0;
  let mortgaged = 0;
  let houses = 0;
  let hotels = 0;

  Object.values(propertiesState).forEach((state) => {
    if (state.ownerId === playerId) {
      total++;
      if (state.isMortgaged) mortgaged++;
      if (state.hotel) hotels++;
      else houses += state.houses;
    }
  });

  return { total, mortgaged, houses, hotels };
};
