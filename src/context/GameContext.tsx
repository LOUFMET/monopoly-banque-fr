import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  GameSession,
  Player,
  Transaction,
  ToastNotification,
  TransactionType,
} from '../types/game';
import { PropertyOwnershipState } from '../types/properties';
import {
  FRENCH_PROPERTIES,
  INITIAL_PROPERTIES_OWNERSHIP,
} from '../data/frenchProperties';
import { storageService } from '../services/storageService';
import { syncService, SyncMessage } from '../services/syncService';
import { playSound, triggerHaptic } from '../utils/sound';
import confetti from 'canvas-confetti';

interface GameContextType {
  session: GameSession | null;
  currentPlayer: Player | null;
  isBanker: boolean;
  activeTab: 'BANK' | 'PLAYERS' | 'PROPERTIES' | 'HISTORY';
  setActiveTab: (tab: 'BANK' | 'PLAYERS' | 'PROPERTIES' | 'HISTORY') => void;
  toasts: ToastNotification[];
  removeToast: (id: string) => void;
  addToast: (toast: Omit<ToastNotification, 'id'>) => void;

  // Actions de jeu
  createGame: (hostName: string, color: string, startingCash: number, token?: string) => string;
  joinGame: (roomCode: string, playerName: string, color: string, token?: string) => Promise<boolean>;
  switchPlayer: (playerId: string) => void;
  leaveGame: () => void;

  // Finances
  disburseFromBank: (toPlayerId: string, amount: number, title: string, note?: string) => void;
  payToBank: (fromPlayerId: string, amount: number, title: string, note?: string) => boolean;
  transferPlayerToPlayer: (fromPlayerId: string, toPlayerId: string, amount: number, title: string, note?: string) => boolean;
  
  // Actions rapides
  quickPassGo: (targetPlayerId?: string) => void;
  quickPayPrison: () => void;
  quickTax: (type: 'INCOME' | 'LUXURY') => void;

  // Gestion Immobilière
  buyPropertyFromBank: (propertyId: string, playerId?: string, customPrice?: number) => boolean;
  mortgageProperty: (propertyId: string) => boolean;
  unmortgageProperty: (propertyId: string) => boolean;
  buildHouse: (propertyId: string) => boolean;
  sellHouse: (propertyId: string) => boolean;
  payRent: (propertyId: string, customMultiplier?: number) => boolean;
  transferPropertyOwnership: (propertyId: string, newOwnerId: string, price?: number) => boolean;

  // Outils Banquier
  undoTransaction: (transactionId: string) => void;
  adjustPlayerBalance: (playerId: string, newBalance: number, reason: string) => void;
  resetGameSession: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const generateRoomCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<GameSession | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'BANK' | 'PLAYERS' | 'PROPERTIES' | 'HISTORY'>('BANK');
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const addToast = useCallback((toast: Omit<ToastNotification, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Update session and broadcast to all devices
  const updateSessionAndBroadcast = useCallback((newSession: GameSession) => {
    setSession(newSession);
    storageService.saveSession(newSession);
    syncService.broadcastSession(newSession);

    // Also persist asynchronously to server so that any joining player can fetch it immediately
    fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session: newSession }),
    }).catch(() => {});
  }, []);

  // Sync listener
  useEffect(() => {
    if (!session?.roomCode) return;

    syncService.init(session.roomCode);

    const unsubscribe = syncService.subscribe((message: SyncMessage) => {
      if (message.type === 'SESSION_SYNC' && message.session) {
        // Only update if newer or different
        setSession((current) => {
          if (!current || message.session.version >= current.version) {
            return message.session;
          }
          return current;
        });
      } else if (message.type === 'TRANSACTION_NOTIFY' && message.transaction) {
        // Notification for transactions involving current player
        if (currentPlayerId && message.transaction.toId === currentPlayerId) {
          playSound('payout');
          triggerHaptic('success');
          addToast({
            type: 'money-in',
            title: 'Paiement reçu !',
            message: `${message.transaction.fromName} vous a versé ${message.transaction.amount} €`,
            amount: message.transaction.amount,
          });
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [session?.roomCode, currentPlayerId, addToast]);

  // Try to load saved game on startup
  useEffect(() => {
    const lastRoom = storageService.getLastRoomCode();
    if (lastRoom) {
      const savedSession = storageService.loadSession(lastRoom);
      if (savedSession) {
        setSession(savedSession);
        const savedPlayerId = storageService.getCurrentPlayerId(lastRoom);
        if (savedPlayerId && savedSession.players.some((p) => p.id === savedPlayerId)) {
          setCurrentPlayerId(savedPlayerId);
        } else if (savedSession.players.length > 0) {
          setCurrentPlayerId(savedSession.players[0].id);
        }

        // Resynchroniser avec le serveur au réveil (en cas de mise en veille Render)
        fetch('/api/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session: savedSession }),
        }).catch(() => {});
      }
    }
  }, []);

  const currentPlayer = session?.players.find((p) => p.id === currentPlayerId) || null;
  const isBanker = Boolean(currentPlayer && (currentPlayer.isBanker || currentPlayer.isHost));

  // Switch player for testing or hotseat
  const switchPlayer = useCallback((playerId: string) => {
    if (!session) return;
    if (session.players.some((p) => p.id === playerId)) {
      setCurrentPlayerId(playerId);
      storageService.saveCurrentPlayerId(session.roomCode, playerId);
      triggerHaptic('light');
    }
  }, [session]);

  // Create new game
  const createGame = useCallback((
    hostName: string,
    color: string,
    startingCash: number,
    token?: string
  ): string => {
    const roomCode = generateRoomCode();
    const hostPlayerId = 'p_' + Math.random().toString(36).substring(2, 8);

    const hostPlayer: Player = {
      id: hostPlayerId,
      name: hostName.trim() || 'Banquier',
      token: token || '',
      color,
      balance: startingCash,
      isBanker: true,
      isHost: true,
      isBankrupt: false,
      joinedAt: Date.now(),
    };

    const initialTransaction: Transaction = {
      id: 'tx_' + Math.random().toString(36).substring(2, 8),
      timestamp: Date.now(),
      type: 'BANK_DISBURSEMENT',
      fromId: 'BANK',
      fromName: 'La Banque',
      toId: hostPlayerId,
      toName: hostPlayer.name,
      amount: startingCash,
      title: 'Mise de départ',
      description: 'Attribution du capital initial',
    };

    const newSession: GameSession = {
      roomCode,
      createdAt: Date.now(),
      hostId: hostPlayerId,
      bankerId: hostPlayerId,
      startingCash,
      status: 'PLAYING',
      players: [hostPlayer],
      properties: { ...INITIAL_PROPERTIES_OWNERSHIP },
      transactions: [initialTransaction],
      version: 1,
      updatedAt: Date.now(),
    };

    setSession(newSession);
    setCurrentPlayerId(hostPlayerId);
    storageService.saveSession(newSession);
    storageService.saveCurrentPlayerId(roomCode, hostPlayerId);

    // Initialiser la synchronisation et diffuser au serveur
    syncService.init(roomCode);
    updateSessionAndBroadcast(newSession);

    playSound('fanfare');
    triggerHaptic('success');
    addToast({
      type: 'success',
      title: 'Partie créée !',
      message: `Code du salon : ${roomCode}. Partagez ce code avec les autres joueurs.`,
    });

    return roomCode;
  }, [addToast, updateSessionAndBroadcast]);

  // Join existing game
  const joinGame = useCallback(async (
    roomCodeInput: string,
    playerName: string,
    color: string,
    token?: string
  ): Promise<boolean> => {
    const code = roomCodeInput.trim().toUpperCase();
    let existing = storageService.loadSession(code);

    // Si non présent dans le stockage local du téléphone, interroger le serveur
    if (!existing) {
      try {
        const res = await fetch(`/api/session/${code}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && data.session) {
            existing = data.session;
          }
        }
      } catch (err) {
        console.warn('[joinGame] Erreur interrogation serveur:', err);
      }
    }

    if (!existing) {
      addToast({
        type: 'error',
        title: 'Salon introuvable',
        message: `Le code ${code} n'a pas été trouvé. Vérifiez le code fourni par l'hôte.`,
      });
      return false;
    }

    // Check if player with same name exists or create new
    let existingPlayer = existing.players.find(
      (p) => p.name.toLowerCase() === playerName.trim().toLowerCase()
    );

    let updatedPlayers = [...existing.players];
    let newPlayerId = existingPlayer?.id;

    if (!existingPlayer) {
      newPlayerId = 'p_' + Math.random().toString(36).substring(2, 8);
      const newPlayer: Player = {
        id: newPlayerId,
        name: playerName.trim() || `Joueur ${existing.players.length + 1}`,
        token: token || '',
        color,
        balance: existing.startingCash,
        isBanker: false,
        isHost: false,
        isBankrupt: false,
        joinedAt: Date.now(),
      };
      updatedPlayers.push(newPlayer);

      const joinTx: Transaction = {
        id: 'tx_' + Math.random().toString(36).substring(2, 8),
        timestamp: Date.now(),
        type: 'BANK_DISBURSEMENT',
        fromId: 'BANK',
        fromName: 'La Banque',
        toId: newPlayerId,
        toName: newPlayer.name,
        amount: existing.startingCash,
        title: 'Entrée en jeu',
        description: `Mise de départ distribuée à ${newPlayer.name}`,
      };

      const updatedSession: GameSession = {
        ...existing,
        players: updatedPlayers,
        transactions: [joinTx, ...existing.transactions],
        version: existing.version + 1,
        updatedAt: Date.now(),
      };

      syncService.init(code);
      updateSessionAndBroadcast(updatedSession);
    } else {
      syncService.init(code);
      updateSessionAndBroadcast(existing);
    }

    setCurrentPlayerId(newPlayerId!);
    storageService.saveCurrentPlayerId(code, newPlayerId!);

    playSound('fanfare');
    triggerHaptic('success');
    addToast({
      type: 'success',
      title: 'Bienvenue sur le plateau !',
      message: `Vous avez rejoint le salon ${code} avec ${existing.startingCash} € de départ.`,
    });

    return true;
  }, [addToast, updateSessionAndBroadcast]);

  // Leave game
  const leaveGame = useCallback(() => {
    if (session) {
      storageService.clearSession(session.roomCode);
    }
    setSession(null);
    setCurrentPlayerId(null);
  }, [session]);

  // 1. Bank Disburses Money (+200 Go, Chance, Community Chest, Banker Arbitrage)
  // RÈGLE STRICTE : Seul le banquier peut verser de l'argent depuis la banque !
  const disburseFromBank = useCallback((
    toPlayerId: string,
    amount: number,
    title: string,
    note?: string
  ) => {
    if (!session) return;

    if (!isBanker) {
      playSound('alert');
      triggerHaptic('warning');
      addToast({
        type: 'error',
        title: 'Action non autorisée',
        message: 'Seul le Banquier a le droit de verser de l’argent depuis la Banque.',
      });
      return;
    }

    const targetPlayer = session.players.find((p) => p.id === toPlayerId);
    if (!targetPlayer) return;

    const tx: Transaction = {
      id: 'tx_' + Math.random().toString(36).substring(2, 8),
      timestamp: Date.now(),
      type: 'BANK_DISBURSEMENT',
      fromId: 'BANK',
      fromName: 'La Banque',
      toId: toPlayerId,
      toName: targetPlayer.name,
      amount,
      title,
      description: note || 'Versement effectué par la Banque',
    };

    const updatedPlayers = session.players.map((p) =>
      p.id === toPlayerId ? { ...p, balance: p.balance + amount } : p
    );

    const updatedSession: GameSession = {
      ...session,
      players: updatedPlayers,
      transactions: [tx, ...session.transactions],
      version: session.version + 1,
      updatedAt: Date.now(),
    };

    updateSessionAndBroadcast(updatedSession);
    syncService.broadcastTransaction(tx);
    playSound('payout');
    triggerHaptic('medium');

    addToast({
      type: 'money-in',
      title: title,
      message: `+${amount} € versés à ${targetPlayer.name}`,
      amount,
    });
  }, [session, updateSessionAndBroadcast, addToast]);

  // 2. Player Pays Bank (-50 Prison, Taxes, Purchases)
  const payToBank = useCallback((
    fromPlayerId: string,
    amount: number,
    title: string,
    note?: string
  ): boolean => {
    if (!session) return false;
    const payer = session.players.find((p) => p.id === fromPlayerId);
    if (!payer) return false;

    if (payer.balance < amount) {
      playSound('alert');
      triggerHaptic('warning');
      addToast({
        type: 'error',
        title: 'Fonds insuffisants',
        message: `${payer.name} possède ${payer.balance} € mais doit payer ${amount} €. Hypothéquez un bien !`,
      });
      return false;
    }

    const tx: Transaction = {
      id: 'tx_' + Math.random().toString(36).substring(2, 8),
      timestamp: Date.now(),
      type: 'BANK_PAYMENT',
      fromId: fromPlayerId,
      fromName: payer.name,
      toId: 'BANK',
      toName: 'La Banque',
      amount,
      title,
      description: note || 'Paiement à la Banque',
    };

    const updatedPlayers = session.players.map((p) =>
      p.id === fromPlayerId ? { ...p, balance: p.balance - amount } : p
    );

    const updatedSession: GameSession = {
      ...session,
      players: updatedPlayers,
      transactions: [tx, ...session.transactions],
      version: session.version + 1,
      updatedAt: Date.now(),
    };

    updateSessionAndBroadcast(updatedSession);
    syncService.broadcastTransaction(tx);
    playSound('pay');
    triggerHaptic('light');

    addToast({
      type: 'money-out',
      title: title,
      message: `-${amount} € payés à la Banque`,
      amount,
    });

    return true;
  }, [session, updateSessionAndBroadcast, addToast]);

  // 3. Player to Player Transfer (Rent, Deals)
  const transferPlayerToPlayer = useCallback((
    fromPlayerId: string,
    toPlayerId: string,
    amount: number,
    title: string,
    note?: string
  ): boolean => {
    if (!session) return false;
    if (fromPlayerId === toPlayerId) return false;

    const sender = session.players.find((p) => p.id === fromPlayerId);
    const receiver = session.players.find((p) => p.id === toPlayerId);
    if (!sender || !receiver) return false;

    if (sender.balance < amount) {
      playSound('alert');
      triggerHaptic('warning');
      addToast({
        type: 'error',
        title: 'Fonds insuffisants',
        message: `Solde insuffisant (${sender.balance} €) pour envoyer ${amount} € à ${receiver.name}.`,
      });
      return false;
    }

    const tx: Transaction = {
      id: 'tx_' + Math.random().toString(36).substring(2, 8),
      timestamp: Date.now(),
      type: 'PLAYER_TRANSFER',
      fromId: fromPlayerId,
      fromName: sender.name,
      toId: toPlayerId,
      toName: receiver.name,
      amount,
      title,
      description: note || `Transfert de ${sender.name} vers ${receiver.name}`,
    };

    const updatedPlayers = session.players.map((p) => {
      if (p.id === fromPlayerId) return { ...p, balance: p.balance - amount };
      if (p.id === toPlayerId) return { ...p, balance: p.balance + amount };
      return p;
    });

    const updatedSession: GameSession = {
      ...session,
      players: updatedPlayers,
      transactions: [tx, ...session.transactions],
      version: session.version + 1,
      updatedAt: Date.now(),
    };

    updateSessionAndBroadcast(updatedSession);
    syncService.broadcastTransaction(tx);
    playSound('coin');
    triggerHaptic('medium');

    addToast({
      type: 'success',
      title: 'Transfert effectué',
      message: `${amount} € envoyés à ${receiver.name}`,
      amount,
    });

    return true;
  }, [session, updateSessionAndBroadcast, addToast]);

  // Quick Action: Pass Go (+200 €) - Banker Only
  const quickPassGo = useCallback((targetPlayerId?: string) => {
    if (!session || !currentPlayer) return;

    if (!isBanker) {
      playSound('alert');
      triggerHaptic('warning');
      addToast({
        type: 'error',
        title: 'Action réservée au Banquier',
        message: 'Seul le Banquier peut verser la prime de la Case Départ (+200 €).',
      });
      return;
    }

    const recipientId = targetPlayerId || currentPlayer.id;
    const recipient = session.players.find((p) => p.id === recipientId);
    if (!recipient) return;

    disburseFromBank(
      recipient.id,
      200,
      'Case Départ (+200 €)',
      `Passage ou arrêt sur la case Départ attribué à ${recipient.name}`
    );
    confetti({
      particleCount: 45,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#10B981', '#F59E0B', '#3B82F6'],
    });
  }, [session, currentPlayer, isBanker, disburseFromBank, addToast]);

  // Quick Action: Pay Jail Fine (-50 €)
  const quickPayPrison = useCallback(() => {
    if (!currentPlayer) return;
    payToBank(
      currentPlayer.id,
      50,
      'Sortie de Prison (-50 €)',
      'Caution payée pour sortir de prison'
    );
  }, [currentPlayer, payToBank]);

  // Quick Action: Taxes
  const quickTax = useCallback((type: 'INCOME' | 'LUXURY') => {
    if (!currentPlayer) return;
    if (type === 'INCOME') {
      payToBank(
        currentPlayer.id,
        200,
        'Impôt sur le revenu (-200 €)',
        'Taxe forfaitaire case Impôt'
      );
    } else {
      payToBank(
        currentPlayer.id,
        100,
        'Taxe de Luxe (-100 €)',
        'Paiement case Taxe de luxe'
      );
    }
  }, [currentPlayer, payToBank]);

  // Buy Property from Bank (Supporte le Prix d'Enchère personnalisé)
  const buyPropertyFromBank = useCallback((
    propertyId: string,
    targetPlayerId?: string,
    customPrice?: number
  ): boolean => {
    if (!session) return false;
    const buyerId = targetPlayerId || currentPlayer?.id;
    if (!buyerId) return false;

    const buyer = session.players.find((p) => p.id === buyerId);
    const prop = FRENCH_PROPERTIES.find((p) => p.id === propertyId);
    const currentOwnership = session.properties[propertyId];

    if (!buyer || !prop || !currentOwnership) return false;

    if (currentOwnership.ownerId !== 'BANK') {
      addToast({
        type: 'warning',
        title: 'Propriété déjà vendue',
        message: `${prop.name} appartient déjà à un joueur.`,
      });
      return false;
    }

    const finalPrice = customPrice !== undefined && customPrice >= 0 ? customPrice : prop.price;
    const isAuction = customPrice !== undefined;

    if (buyer.balance < finalPrice) {
      playSound('alert');
      triggerHaptic('warning');
      addToast({
        type: 'error',
        title: 'Fonds insuffisants',
        message: `${buyer.name} a ${buyer.balance} € mais l'acquisition de ${prop.name} coûte ${finalPrice} €.`,
      });
      return false;
    }

    const tx: Transaction = {
      id: 'tx_' + Math.random().toString(36).substring(2, 8),
      timestamp: Date.now(),
      type: 'PROPERTY_BUY',
      fromId: buyerId,
      fromName: buyer.name,
      toId: 'BANK',
      toName: 'La Banque',
      amount: finalPrice,
      title: isAuction ? `Achat aux enchères de ${prop.name}` : `Achat de ${prop.name}`,
      description: isAuction
        ? `Adjugé pour ${finalPrice} € (Prix standard : ${prop.price} €)`
        : `Acquisition du titre pour ${prop.price} €`,
      propertyId,
    };

    const updatedPlayers = session.players.map((p) =>
      p.id === buyerId ? { ...p, balance: p.balance - finalPrice } : p
    );

    const updatedProperties: Record<string, PropertyOwnershipState> = {
      ...session.properties,
      [propertyId]: {
        ...currentOwnership,
        ownerId: buyerId,
        isMortgaged: false,
        houses: 0,
        hotel: false,
      },
    };

    const updatedSession: GameSession = {
      ...session,
      players: updatedPlayers,
      properties: updatedProperties,
      transactions: [tx, ...session.transactions],
      version: session.version + 1,
      updatedAt: Date.now(),
    };

    updateSessionAndBroadcast(updatedSession);
    syncService.broadcastTransaction(tx);
    
    if (isAuction) {
      playSound('gavel');
    } else {
      playSound('coin');
    }
    triggerHaptic('medium');

    addToast({
      type: 'success',
      title: isAuction ? '🔨 Propriété Adjugée !' : 'Propriété Acquise !',
      message: `${buyer.name} a obtenu ${prop.name} pour ${finalPrice} €.`,
      amount: finalPrice,
    });

    return true;
  }, [session, currentPlayer, addToast, updateSessionAndBroadcast]);

  // Mortgage Property (Hypothéquer)
  const mortgageProperty = useCallback((propertyId: string): boolean => {
    if (!session) return false;
    const prop = FRENCH_PROPERTIES.find((p) => p.id === propertyId);
    const currentOwnership = session.properties[propertyId];
    if (!prop || !currentOwnership) return false;

    const owner = session.players.find((p) => p.id === currentOwnership.ownerId);
    if (!owner) return false;

    // Check caller permission
    if (!isBanker && currentOwnership.ownerId !== currentPlayer?.id) {
      addToast({
        type: 'error',
        title: 'Action non autorisée',
        message: 'Vous ne pouvez hypothéquer que vos propres titres.',
      });
      return false;
    }

    if (currentOwnership.isMortgaged) {
      addToast({
        type: 'warning',
        title: 'Déjà hypothéquée',
        message: `${prop.name} est déjà hypothéquée.`,
      });
      return false;
    }

    // Check if properties of this color have houses (must sell houses first)
    if (currentOwnership.houses > 0 || currentOwnership.hotel) {
      addToast({
        type: 'error',
        title: 'Bâtiments présents',
        message: 'Vous devez revendre les maisons et hôtels avant d’hypothéquer le terrain.',
      });
      return false;
    }

    const mortgageValue = prop.mortgageValue;

    const tx: Transaction = {
      id: 'tx_' + Math.random().toString(36).substring(2, 8),
      timestamp: Date.now(),
      type: 'MORTGAGE',
      fromId: 'BANK',
      fromName: 'La Banque',
      toId: owner.id,
      toName: owner.name,
      amount: mortgageValue,
      title: `Hypothèque : ${prop.name}`,
      description: `Valeur reçue de la Banque (+${mortgageValue} €)`,
      propertyId,
    };

    const updatedPlayers = session.players.map((p) =>
      p.id === owner.id ? { ...p, balance: p.balance + mortgageValue } : p
    );

    const updatedProperties = {
      ...session.properties,
      [propertyId]: {
        ...currentOwnership,
        isMortgaged: true,
      },
    };

    const updatedSession: GameSession = {
      ...session,
      players: updatedPlayers,
      properties: updatedProperties,
      transactions: [tx, ...session.transactions],
      version: session.version + 1,
      updatedAt: Date.now(),
    };

    updateSessionAndBroadcast(updatedSession);
    syncService.broadcastTransaction(tx);
    playSound('mortgage');
    triggerHaptic('medium');

    addToast({
      type: 'money-in',
      title: 'Propriété Hypothéquée',
      message: `+${mortgageValue} € crédités pour ${prop.name}`,
      amount: mortgageValue,
    });

    return true;
  }, [session, isBanker, currentPlayer, updateSessionAndBroadcast, addToast]);

  // Unmortgage Property (Lever l'hypothèque: valeur + 10% d'intérêts)
  const unmortgageProperty = useCallback((propertyId: string): boolean => {
    if (!session) return false;
    const prop = FRENCH_PROPERTIES.find((p) => p.id === propertyId);
    const currentOwnership = session.properties[propertyId];
    if (!prop || !currentOwnership) return false;

    const owner = session.players.find((p) => p.id === currentOwnership.ownerId);
    if (!owner) return false;

    if (!isBanker && currentOwnership.ownerId !== currentPlayer?.id) {
      addToast({
        type: 'error',
        title: 'Action non autorisée',
        message: 'Vous ne pouvez lever l’hypothèque que sur vos propres titres.',
      });
      return false;
    }

    if (!currentOwnership.isMortgaged) {
      addToast({
        type: 'info',
        title: 'Non hypothéquée',
        message: `${prop.name} n’est pas hypothéquée.`,
      });
      return false;
    }

    const unmortgageCost = prop.unmortgageCost; // Valeur + 10%

    if (owner.balance < unmortgageCost) {
      playSound('alert');
      triggerHaptic('warning');
      addToast({
        type: 'error',
        title: 'Fonds insuffisants',
        message: `${owner.name} a ${owner.balance} € mais lever l’hypothèque coûte ${unmortgageCost} € (capital + 10%).`,
      });
      return false;
    }

    const tx: Transaction = {
      id: 'tx_' + Math.random().toString(36).substring(2, 8),
      timestamp: Date.now(),
      type: 'UNMORTGAGE',
      fromId: owner.id,
      fromName: owner.name,
      toId: 'BANK',
      toName: 'La Banque',
      amount: unmortgageCost,
      title: `Levée d'hypothèque : ${prop.name}`,
      description: `Paiement de ${unmortgageCost} € (capital ${prop.mortgageValue} € + 10% intérêt)`,
      propertyId,
    };

    const updatedPlayers = session.players.map((p) =>
      p.id === owner.id ? { ...p, balance: p.balance - unmortgageCost } : p
    );

    const updatedProperties = {
      ...session.properties,
      [propertyId]: {
        ...currentOwnership,
        isMortgaged: false,
      },
    };

    const updatedSession: GameSession = {
      ...session,
      players: updatedPlayers,
      properties: updatedProperties,
      transactions: [tx, ...session.transactions],
      version: session.version + 1,
      updatedAt: Date.now(),
    };

    updateSessionAndBroadcast(updatedSession);
    syncService.broadcastTransaction(tx);
    playSound('pay');
    triggerHaptic('medium');

    addToast({
      type: 'success',
      title: 'Hypothèque levée !',
      message: `${prop.name} rapporte à nouveau ses loyers complets.`,
    });

    return true;
  }, [session, isBanker, currentPlayer, updateSessionAndBroadcast, addToast]);

  // Build House / Hotel
  const buildHouse = useCallback((propertyId: string): boolean => {
    if (!session) return false;
    const prop = FRENCH_PROPERTIES.find((p) => p.id === propertyId);
    const state = session.properties[propertyId];
    if (!prop || !state || prop.type !== 'STREET') return false;

    const owner = session.players.find((p) => p.id === state.ownerId);
    if (!owner) return false;

    // Must own entire color group
    const colorGroupProps = FRENCH_PROPERTIES.filter((p) => p.group === prop.group);
    const ownsAllGroup = colorGroupProps.every(
      (p) => session.properties[p.id]?.ownerId === owner.id
    );

    if (!ownsAllGroup) {
      addToast({
        type: 'warning',
        title: 'Monopole requis',
        message: 'Vous devez posséder tous les terrains de ce groupe de couleur pour construire.',
      });
      return false;
    }

    // No property in group can be mortgaged
    const anyMortgaged = colorGroupProps.some(
      (p) => session.properties[p.id]?.isMortgaged
    );
    if (anyMortgaged) {
      addToast({
        type: 'error',
        title: 'Terrain hypothéqué',
        message: 'Toutes les propriétés du groupe doivent être dés-hypothéquées pour construire.',
      });
      return false;
    }

    if (state.hotel) {
      addToast({
        type: 'info',
        title: 'Maximum atteint',
        message: 'Vous possédez déjà un hôtel sur ce terrain.',
      });
      return false;
    }

    // Règle officielle : construction uniforme (écart max de 1)
    const getBuildingLevel = (pid: string) => {
      const s = session.properties[pid];
      if (!s) return 0;
      if (s.hotel) return 5;
      return s.houses || 0;
    };

    const currentLevel = getBuildingLevel(propertyId);
    const groupLevels = colorGroupProps.map((p) => getBuildingLevel(p.id));
    const minLevel = Math.min(...groupLevels);

    if (currentLevel > minLevel) {
      playSound('alert');
      triggerHaptic('warning');
      addToast({
        type: 'warning',
        title: 'Construction non uniforme',
        message: 'Règle officielle : vous devez d’abord construire sur les terrains du groupe ayant le moins de bâtiments.',
      });
      return false;
    }

    const cost = prop.houseCost;
    if (owner.balance < cost) {
      playSound('alert');
      addToast({
        type: 'error',
        title: 'Fonds insuffisants',
        message: `La construction coûte ${cost} €, solde de ${owner.name}: ${owner.balance} €.`,
      });
      return false;
    }

    const isUpgradingToHotel = state.houses === 4;
    const newHouses = isUpgradingToHotel ? 0 : state.houses + 1;
    const newHotel = isUpgradingToHotel ? true : false;

    const tx: Transaction = {
      id: 'tx_' + Math.random().toString(36).substring(2, 8),
      timestamp: Date.now(),
      type: 'BUILD_HOUSE',
      fromId: owner.id,
      fromName: owner.name,
      toId: 'BANK',
      toName: 'La Banque',
      amount: cost,
      title: isUpgradingToHotel ? `Construction d'un Hôtel sur ${prop.name}` : `Construction de Maison sur ${prop.name}`,
      description: `Bâtiment érigé pour ${cost} €`,
      propertyId,
    };

    const updatedPlayers = session.players.map((p) =>
      p.id === owner.id ? { ...p, balance: p.balance - cost } : p
    );

    const updatedProperties = {
      ...session.properties,
      [propertyId]: {
        ...state,
        houses: newHouses,
        hotel: newHotel,
      },
    };

    const updatedSession: GameSession = {
      ...session,
      players: updatedPlayers,
      properties: updatedProperties,
      transactions: [tx, ...session.transactions],
      version: session.version + 1,
      updatedAt: Date.now(),
    };

    updateSessionAndBroadcast(updatedSession);
    syncService.broadcastTransaction(tx);
    playSound('coin');
    triggerHaptic('medium');

    addToast({
      type: 'success',
      title: isUpgradingToHotel ? 'Hôtel inauguré ! 🏨' : 'Maison construite ! 🏠',
      message: `${prop.name} a augmenté son niveau de loyer.`,
    });

    return true;
  }, [session, updateSessionAndBroadcast, addToast]);

  // Sell House / Hotel back to Bank (50% price)
  const sellHouse = useCallback((propertyId: string): boolean => {
    if (!session) return false;
    const prop = FRENCH_PROPERTIES.find((p) => p.id === propertyId);
    const state = session.properties[propertyId];
    if (!prop || !state || prop.type !== 'STREET') return false;

    const owner = session.players.find((p) => p.id === state.ownerId);
    if (!owner) return false;

    if (state.houses === 0 && !state.hotel) {
      addToast({
        type: 'warning',
        title: 'Aucun bâtiment',
        message: 'Il n’y a aucun bâtiment à revendre sur ce terrain.',
      });
      return false;
    }

    // Règle officielle : vente uniforme (écart max de 1)
    const colorGroupProps = FRENCH_PROPERTIES.filter((p) => p.group === prop.group);
    const getBuildingLevel = (pid: string) => {
      const s = session.properties[pid];
      if (!s) return 0;
      if (s.hotel) return 5;
      return s.houses || 0;
    };

    const currentLevel = getBuildingLevel(propertyId);
    const groupLevels = colorGroupProps.map((p) => getBuildingLevel(p.id));
    const maxLevel = Math.max(...groupLevels);

    if (currentLevel < maxLevel) {
      playSound('alert');
      triggerHaptic('warning');
      addToast({
        type: 'warning',
        title: 'Vente non uniforme',
        message: 'Règle officielle : vous devez d’abord revendre sur les terrains du groupe ayant le plus de bâtiments.',
      });
      return false;
    }

    const refund = Math.floor(prop.houseCost / 2);
    const newHotel = false;
    const newHouses = state.hotel ? 4 : state.houses - 1;

    const tx: Transaction = {
      id: 'tx_' + Math.random().toString(36).substring(2, 8),
      timestamp: Date.now(),
      type: 'SELL_HOUSE',
      fromId: 'BANK',
      fromName: 'La Banque',
      toId: owner.id,
      toName: owner.name,
      amount: refund,
      title: `Revente de bâtiment sur ${prop.name}`,
      description: `Revente à la Banque pour 50% de la valeur (+${refund} €)`,
      propertyId,
    };

    const updatedPlayers = session.players.map((p) =>
      p.id === owner.id ? { ...p, balance: p.balance + refund } : p
    );

    const updatedProperties = {
      ...session.properties,
      [propertyId]: {
        ...state,
        houses: newHouses,
        hotel: newHotel,
      },
    };

    const updatedSession: GameSession = {
      ...session,
      players: updatedPlayers,
      properties: updatedProperties,
      transactions: [tx, ...session.transactions],
      version: session.version + 1,
      updatedAt: Date.now(),
    };

    updateSessionAndBroadcast(updatedSession);
    syncService.broadcastTransaction(tx);
    playSound('payout');
    triggerHaptic('light');

    addToast({
      type: 'money-in',
      title: 'Bâtiment revendu',
      message: `+${refund} € versés à ${owner.name}`,
      amount: refund,
    });

    return true;
  }, [session, updateSessionAndBroadcast, addToast]);

  // Pay Rent directly to Owner
  const payRent = useCallback((
    propertyId: string,
    customMultiplier?: number
  ): boolean => {
    if (!session || !currentPlayer) return false;
    const prop = FRENCH_PROPERTIES.find((p) => p.id === propertyId);
    const state = session.properties[propertyId];
    if (!prop || !state) return false;

    if (state.ownerId === 'BANK') {
      addToast({
        type: 'warning',
        title: 'Terrain libre',
        message: `${prop.name} appartient à la Banque, aucun loyer dû.`,
      });
      return false;
    }

    if (state.ownerId === currentPlayer.id) {
      addToast({
        type: 'info',
        title: 'Votre propriété',
        message: 'Vous êtes chez vous ! Aucun loyer à régler.',
      });
      return false;
    }

    if (state.isMortgaged) {
      addToast({
        type: 'info',
        title: 'Propriété hypothéquée',
        message: `${prop.name} est hypothéquée : aucun loyer ne peut être perçu !`,
      });
      return false;
    }

    const owner = session.players.find((p) => p.id === state.ownerId);
    if (!owner) return false;

    // Calculate exact Monopoly rent
    let rentAmount = 0;

    if (prop.type === 'STREET') {
      if (state.hotel) {
        rentAmount = prop.rents[5];
      } else if (state.houses > 0) {
        rentAmount = prop.rents[state.houses];
      } else {
        // Nu: check if owner has the entire color group
        const colorProps = FRENCH_PROPERTIES.filter((p) => p.group === prop.group);
        const ownsAll = colorProps.every(
          (p) => session.properties[p.id]?.ownerId === owner.id
        );
        rentAmount = ownsAll ? prop.rents[0] * 2 : prop.rents[0];
      }
    } else if (prop.type === 'STATION') {
      // Count stations owned by this owner
      const stationProps = FRENCH_PROPERTIES.filter((p) => p.group === 'STATION');
      const ownedStationsCount = stationProps.filter(
        (p) => session.properties[p.id]?.ownerId === owner.id
      ).length;
      const index = Math.min(Math.max(ownedStationsCount - 1, 0), 3);
      rentAmount = prop.rents[index] || 25;
    } else if (prop.type === 'UTILITY') {
      // Dice multiplier
      const dice = customMultiplier || 7; // default average dice if not specified
      const utilityProps = FRENCH_PROPERTIES.filter((p) => p.group === 'UTILITY');
      const ownedUtilitiesCount = utilityProps.filter(
        (p) => session.properties[p.id]?.ownerId === owner.id
      ).length;
      const multiplier = ownedUtilitiesCount === 2 ? 10 : 4;
      rentAmount = dice * multiplier;
    }

    if (currentPlayer.balance < rentAmount) {
      playSound('alert');
      triggerHaptic('warning');
      addToast({
        type: 'error',
        title: 'Fonds insuffisants pour le loyer',
        message: `Loyer : ${rentAmount} €. Solde : ${currentPlayer.balance} €. Hypothéquez des biens !`,
      });
      return false;
    }

    const tx: Transaction = {
      id: 'tx_' + Math.random().toString(36).substring(2, 8),
      timestamp: Date.now(),
      type: 'PAY_RENT',
      fromId: currentPlayer.id,
      fromName: currentPlayer.name,
      toId: owner.id,
      toName: owner.name,
      amount: rentAmount,
      title: `Loyer : ${prop.name}`,
      description: `Règlement du loyer de ${rentAmount} € à ${owner.name}`,
      propertyId,
    };

    const updatedPlayers = session.players.map((p) => {
      if (p.id === currentPlayer.id) return { ...p, balance: p.balance - rentAmount };
      if (p.id === owner.id) return { ...p, balance: p.balance + rentAmount };
      return p;
    });

    const updatedSession: GameSession = {
      ...session,
      players: updatedPlayers,
      transactions: [tx, ...session.transactions],
      version: session.version + 1,
      updatedAt: Date.now(),
    };

    updateSessionAndBroadcast(updatedSession);
    syncService.broadcastTransaction(tx);
    playSound('coin');
    triggerHaptic('medium');

    addToast({
      type: 'money-out',
      title: 'Loyer réglé',
      message: `${rentAmount} € versés à ${owner.name} (${prop.name})`,
      amount: rentAmount,
    });

    return true;
  }, [session, currentPlayer, updateSessionAndBroadcast, addToast]);

  // Transfer Property Ownership (Cession / Déclaration de propriétaire)
  const transferPropertyOwnership = useCallback((
    propertyId: string,
    newOwnerId: string,
    price?: number
  ): boolean => {
    if (!session) return false;
    const prop = FRENCH_PROPERTIES.find((p) => p.id === propertyId);
    const state = session.properties[propertyId];
    if (!prop || !state) return false;

    if (state.ownerId === newOwnerId) {
      addToast({
        type: 'info',
        title: 'Même propriétaire',
        message: 'Ce joueur est déjà le propriétaire de ce terrain.',
      });
      return false;
    }

    // Official Monopoly rule: Cannot trade/transfer property if any street in the group has houses or hotels
    if (prop.type === 'STREET') {
      const colorGroupProps = FRENCH_PROPERTIES.filter((p) => p.group === prop.group);
      const hasBuildings = colorGroupProps.some((p) => {
        const s = session.properties[p.id];
        return s && (s.houses > 0 || s.hotel);
      });
      if (hasBuildings) {
        playSound('alert');
        triggerHaptic('warning');
        addToast({
          type: 'warning',
          title: 'Bâtiments présents',
          message: 'Impossible de céder ce terrain : vendez d’abord toutes les maisons et hôtels du groupe de couleur à la Banque.',
        });
        return false;
      }
    }

    const oldOwner = state.ownerId === 'BANK' ? null : session.players.find((p) => p.id === state.ownerId);
    const newOwner = newOwnerId === 'BANK' ? null : session.players.find((p) => p.id === newOwnerId);
    const transferPrice = price && price > 0 ? price : 0;

    // If a monetary price is involved, check buyer funds
    if (transferPrice > 0 && newOwner) {
      if (newOwner.balance < transferPrice) {
        playSound('alert');
        triggerHaptic('warning');
        addToast({
          type: 'error',
          title: 'Fonds insuffisants',
          message: `${newOwner.name} n'a pas assez d'argent (${newOwner.balance} €) pour régler les ${transferPrice} €.`,
        });
        return false;
      }
    }

    // Update balances if price > 0
    let updatedPlayers = [...session.players];
    if (transferPrice > 0) {
      updatedPlayers = updatedPlayers.map((p) => {
        if (newOwner && p.id === newOwner.id) {
          return { ...p, balance: p.balance - transferPrice };
        }
        if (oldOwner && p.id === oldOwner.id) {
          return { ...p, balance: p.balance + transferPrice };
        }
        return p;
      });
    }

    const tx: Transaction = {
      id: 'tx_' + Math.random().toString(36).substring(2, 8),
      timestamp: Date.now(),
      type: 'PROPERTY_TRANSFER',
      fromId: state.ownerId,
      fromName: oldOwner ? oldOwner.name : 'La Banque',
      toId: newOwnerId,
      toName: newOwner ? newOwner.name : 'La Banque',
      amount: transferPrice,
      title: `Cession de ${prop.name}`,
      description: transferPrice > 0
        ? `Titre cédé à ${newOwner ? newOwner.name : 'La Banque'} pour ${transferPrice} €`
        : `Titre cédé à ${newOwner ? newOwner.name : 'La Banque'} (déclaration directe)`,
      propertyId,
    };

    const updatedProperties: Record<string, PropertyOwnershipState> = {
      ...session.properties,
      [propertyId]: {
        ...state,
        ownerId: newOwnerId,
      },
    };

    const updatedSession: GameSession = {
      ...session,
      players: updatedPlayers,
      properties: updatedProperties,
      transactions: [tx, ...session.transactions],
      version: session.version + 1,
      updatedAt: Date.now(),
    };

    updateSessionAndBroadcast(updatedSession);
    syncService.broadcastTransaction(tx);
    playSound('coin');
    triggerHaptic('medium');

    addToast({
      type: 'success',
      title: 'Titre transféré ! 📜',
      message: `${prop.name} appartient désormais à ${newOwner ? newOwner.name : 'La Banque'}.`,
    });

    return true;
  }, [session, updateSessionAndBroadcast, addToast]);

  // Undo transaction (Banker only)
  const undoTransaction = useCallback((transactionId: string) => {
    if (!session || !isBanker) return;

    const txIndex = session.transactions.findIndex((t) => t.id === transactionId);
    if (txIndex === -1) return;

    const tx = session.transactions[txIndex];
    if (tx.undone) {
      addToast({
        type: 'warning',
        title: 'Déjà annulée',
        message: 'Cette transaction a déjà été annulée.',
      });
      return;
    }

    // Reverse financial balances
    const updatedPlayers = session.players.map((p) => {
      let balance = p.balance;
      // If player was sender, give back amount
      if (tx.fromId === p.id) {
        balance += tx.amount;
      }
      // If player was receiver, take back amount
      if (tx.toId === p.id) {
        balance -= tx.amount;
      }
      return { ...p, balance };
    });

    // Reverse property ownership if it was a property transfer
    let updatedProperties = { ...session.properties };
    if (tx.type === 'PROPERTY_TRANSFER' && tx.propertyId && updatedProperties[tx.propertyId]) {
      updatedProperties[tx.propertyId] = {
        ...updatedProperties[tx.propertyId],
        ownerId: tx.fromId as string,
      };
    }

    const updatedTransactions = [...session.transactions];
    updatedTransactions[txIndex] = { ...tx, undone: true };

    const undoRecordTx: Transaction = {
      id: 'tx_' + Math.random().toString(36).substring(2, 8),
      timestamp: Date.now(),
      type: 'BANK_DISBURSEMENT',
      fromId: 'BANK',
      fromName: 'Banquier (Audit)',
      toId: tx.fromId,
      toName: tx.fromName,
      amount: tx.amount,
      title: `Annulation : ${tx.title}`,
      description: `Régularisation suite à l'annulation de la transaction`,
    };

    const updatedSession: GameSession = {
      ...session,
      players: updatedPlayers,
      properties: updatedProperties,
      transactions: [undoRecordTx, ...updatedTransactions],
      version: session.version + 1,
      updatedAt: Date.now(),
    };

    updateSessionAndBroadcast(updatedSession);
    playSound('alert');
    triggerHaptic('medium');

    addToast({
      type: 'info',
      title: 'Transaction annulée',
      message: `La transaction de ${tx.amount} € a été inversée par le Banquier.`,
    });
  }, [session, isBanker, updateSessionAndBroadcast, addToast]);

  // Adjust player balance directly (Banker disputes)
  const adjustPlayerBalance = useCallback((
    playerId: string,
    newBalance: number,
    reason: string
  ) => {
    if (!session || !isBanker) return;
    const player = session.players.find((p) => p.id === playerId);
    if (!player) return;

    const diff = newBalance - player.balance;

    const tx: Transaction = {
      id: 'tx_' + Math.random().toString(36).substring(2, 8),
      timestamp: Date.now(),
      type: diff >= 0 ? 'BANK_DISBURSEMENT' : 'BANK_PAYMENT',
      fromId: diff >= 0 ? 'BANK' : playerId,
      fromName: diff >= 0 ? 'La Banque' : player.name,
      toId: diff >= 0 ? playerId : 'BANK',
      toName: diff >= 0 ? player.name : 'La Banque',
      amount: Math.abs(diff),
      title: `Ajustement Arbitrage Banquier`,
      description: reason || `Nouveau solde : ${newBalance} €`,
    };

    const updatedPlayers = session.players.map((p) =>
      p.id === playerId ? { ...p, balance: newBalance } : p
    );

    const updatedSession: GameSession = {
      ...session,
      players: updatedPlayers,
      transactions: [tx, ...session.transactions],
      version: session.version + 1,
      updatedAt: Date.now(),
    };

    updateSessionAndBroadcast(updatedSession);
    addToast({
      type: 'info',
      title: 'Solde ajusté',
      message: `Nouveau solde de ${player.name} : ${newBalance} €`,
    });
  }, [session, isBanker, updateSessionAndBroadcast, addToast]);

  // Reset entire session
  const resetGameSession = useCallback(() => {
    if (!session || !isBanker) return;
    const freshProperties = { ...INITIAL_PROPERTIES_OWNERSHIP };
    const freshPlayers = session.players.map((p) => ({
      ...p,
      balance: session.startingCash,
      isBankrupt: false,
    }));

    const resetTx: Transaction = {
      id: 'tx_' + Math.random().toString(36).substring(2, 8),
      timestamp: Date.now(),
      type: 'BANK_DISBURSEMENT',
      fromId: 'BANK',
      fromName: 'La Banque',
      toId: 'BANK',
      toName: 'Tous les joueurs',
      amount: session.startingCash,
      title: 'Réinitialisation de la partie',
      description: 'Soldes remis à zéro et propriétés restituées à la Banque',
    };

    const updatedSession: GameSession = {
      ...session,
      players: freshPlayers,
      properties: freshProperties,
      transactions: [resetTx],
      version: session.version + 1,
      updatedAt: Date.now(),
    };

    updateSessionAndBroadcast(updatedSession);
    playSound('fanfare');
    addToast({
      type: 'warning',
      title: 'Partie réinitialisée',
      message: 'Tous les joueurs repartent avec le capital de départ.',
    });
  }, [session, isBanker, updateSessionAndBroadcast, addToast]);

  return (
    <GameContext.Provider
      value={{
        session,
        currentPlayer,
        isBanker,
        activeTab,
        setActiveTab,
        toasts,
        removeToast,
        addToast,
        createGame,
        joinGame,
        switchPlayer,
        leaveGame,
        disburseFromBank,
        payToBank,
        transferPlayerToPlayer,
        quickPassGo,
        quickPayPrison,
        quickTax,
        buyPropertyFromBank,
        mortgageProperty,
        unmortgageProperty,
        buildHouse,
        sellHouse,
        payRent,
        transferPropertyOwnership,
        undoTransaction,
        adjustPlayerBalance,
        resetGameSession,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = (): GameContextType => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
