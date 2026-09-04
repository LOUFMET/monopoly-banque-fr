import { PropertyOwnershipState } from './properties';

export interface TokenItem {
  id: string;
  name: string;
  emoji: string;
}

export const MONOPOLY_TOKENS: TokenItem[] = [
  { id: 'hat', name: 'Chapeau haut-de-forme', emoji: '🎩' },
  { id: 'car', name: 'Voiture de course', emoji: '🏎️' },
  { id: 'dog', name: 'Chien Scottie', emoji: '🐶' },
  { id: 'boat', name: 'Bateau', emoji: '🚢' },
  { id: 'cat', name: 'Chat', emoji: '🐱' },
  { id: 'thimble', name: 'Dé à coudre', emoji: '🧵' },
  { id: 'shoe', name: 'Chaussure', emoji: '👞' },
  { id: 'barrow', name: 'Brouette', emoji: '🛒' },
  { id: 'duck', name: 'Canard en plastique', emoji: '🦆' },
  { id: 'dino', name: 'T-Rex', emoji: '🦖' },
];

export const PLAYER_COLORS = [
  { id: 'emerald', hex: '#10B981', label: 'Émeraude', bgClass: 'bg-emerald-500' },
  { id: 'blue', hex: '#3B82F6', label: 'Bleu Roi', bgClass: 'bg-blue-500' },
  { id: 'purple', hex: '#8B5CF6', label: 'Violet', bgClass: 'bg-purple-500' },
  { id: 'amber', hex: '#F59E0B', label: 'Ambre / Or', bgClass: 'bg-amber-500' },
  { id: 'rose', hex: '#F43F5E', label: 'Rose Rubis', bgClass: 'bg-rose-500' },
  { id: 'cyan', hex: '#06B6D4', label: 'Cyan Lagon', bgClass: 'bg-cyan-500' },
  { id: 'orange', hex: '#F97316', label: 'Mandarine', bgClass: 'bg-orange-500' },
  { id: 'indigo', hex: '#6366F1', label: 'Indigo Nuit', bgClass: 'bg-indigo-500' },
];

export interface Player {
  id: string;
  name: string;
  token: string; // emoji or id
  color: string; // hex
  balance: number;
  isBanker: boolean;
  isHost: boolean;
  isBankrupt: boolean;
  joinedAt: number;
}

export type TransactionType =
  | 'BANK_DISBURSEMENT' // Banque -> Joueur (+200 départ, prime, etc.)
  | 'BANK_PAYMENT'      // Joueur -> Banque (taxes, prison, etc.)
  | 'PLAYER_TRANSFER'   // Joueur -> Joueur (libre, accord, etc.)
  | 'PROPERTY_BUY'      // Achat d'une propriété à la banque
  | 'MORTGAGE'          // Hypothèque d'une propriété (+50% valeur)
  | 'UNMORTGAGE'        // Levée d'hypothèque (+10% intérêts)
  | 'BUILD_HOUSE'       // Achat maison / hôtel
  | 'SELL_HOUSE'        // Revente maison / hôtel
  | 'PAY_RENT'          // Paiement d'un loyer calculé
  | 'PROPERTY_TRANSFER'; // Cession / Changement de propriétaire

export interface Transaction {
  id: string;
  timestamp: number;
  type: TransactionType;
  fromId: string | 'BANK';
  fromName: string;
  toId: string | 'BANK';
  toName: string;
  amount: number;
  title: string;
  description?: string;
  propertyId?: string;
  undone?: boolean;
}

export interface GameSession {
  roomCode: string;
  createdAt: number;
  hostId: string;
  bankerId: string;
  startingCash: number;
  status: 'LOBBY' | 'PLAYING' | 'ENDED';
  players: Player[];
  properties: Record<string, PropertyOwnershipState>;
  transactions: Transaction[];
  version: number;
  updatedAt: number;
}

export interface ToastNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'money-in' | 'money-out';
  title: string;
  message: string;
  amount?: number;
}
