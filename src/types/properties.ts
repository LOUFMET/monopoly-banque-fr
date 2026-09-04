export type PropertyColorGroup =
  | 'BROWN'
  | 'LIGHT_BLUE'
  | 'PINK'
  | 'ORANGE'
  | 'RED'
  | 'YELLOW'
  | 'GREEN'
  | 'DARK_BLUE'
  | 'STATION'
  | 'UTILITY';

export type PropertyType = 'STREET' | 'STATION' | 'UTILITY';

export interface Property {
  id: string;
  name: string;
  group: PropertyColorGroup;
  groupLabel: string;
  type: PropertyType;
  price: number;
  mortgageValue: number;
  unmortgageCost: number;
  houseCost: number; // 0 for stations & utilities
  rents: number[]; // [nu/1gare, 1maison/2gares, 2maisons/3gares, 3maisons/4gares, 4maisons, hotel]
  groupTotal: number;
  colorHex: string;
  textColor: string;
  borderHex: string;
}

export interface PropertyOwnershipState {
  propertyId: string;
  ownerId: string | 'BANK';
  houses: number; // 0 to 4
  hotel: boolean;
  isMortgaged: boolean;
}
