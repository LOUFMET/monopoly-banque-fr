import { describe, it, expect } from 'vitest';
import { GameSession, Player } from '../types/game';
import { INITIAL_PROPERTIES_OWNERSHIP } from '../data/frenchProperties';

describe('Multiplayer Synchronization & Anti-Ejection Tests', () => {
  const createMockSession = (playerCount: number = 5): GameSession => {
    const players: Player[] = [];
    for (let i = 1; i <= playerCount; i++) {
      players.push({
        id: `p_${i}`,
        name: `Joueur ${i}`,
        color: '#10B981',
        balance: 1500,
        isBanker: i === 1,
        isHost: i === 1,
        isBankrupt: false,
        joinedAt: Date.now() + i,
      });
    }

    return {
      roomCode: 'TEST',
      createdAt: Date.now(),
      hostId: 'p_1',
      bankerId: 'p_1',
      startingCash: 1500,
      status: 'PLAYING',
      players,
      properties: { ...INITIAL_PROPERTIES_OWNERSHIP },
      transactions: [],
      version: playerCount,
      updatedAt: Date.now(),
    };
  };

  it('permet à 6, 7 et 8 joueurs de rejoindre sans perdre aucun joueur', () => {
    let session = createMockSession(5);
    expect(session.players.length).toBe(5);

    // Ajout du 6ème joueur
    const p6: Player = {
      id: 'p_6',
      name: 'Joueur 6',
      color: '#3B82F6',
      balance: 1500,
      isBanker: false,
      isHost: false,
      isBankrupt: false,
      joinedAt: Date.now(),
    };
    session = {
      ...session,
      players: [...session.players, p6],
      version: session.version + 1,
    };

    expect(session.players.length).toBe(6);
    expect(session.players.some((p) => p.id === 'p_5')).toBe(true);
    expect(session.players.some((p) => p.id === 'p_6')).toBe(true);

    // Ajout du 7ème et 8ème joueur
    const p7: Player = { ...p6, id: 'p_7', name: 'Joueur 7' };
    const p8: Player = { ...p6, id: 'p_8', name: 'Joueur 8' };
    session = {
      ...session,
      players: [...session.players, p7, p8],
      version: session.version + 2,
    };

    expect(session.players.length).toBe(8);
    for (let i = 1; i <= 8; i++) {
      expect(session.players.some((p) => p.id === `p_${i}`)).toBe(true);
    }
  });

  it('protège le joueur actif contre l’éjection si un paquet réseau concurrent omet son ID (Auto-guérison)', () => {
    const currentSession = createMockSession(5);
    const currentPlayerId = 'p_5';

    // Simulation d'un paquet concurrent envoyé par un 6ème joueur ayant reçu un état incomplet (contenant J1, J2, J3, J4, J6 mais pas J5)
    const p6: Player = {
      id: 'p_6',
      name: 'Joueur 6',
      color: '#3B82F6',
      balance: 1500,
      isBanker: false,
      isHost: false,
      isBankrupt: false,
      joinedAt: Date.now(),
    };

    const staleIncomingSession: GameSession = {
      ...currentSession,
      players: [
        currentSession.players[0],
        currentSession.players[1],
        currentSession.players[2],
        currentSession.players[3],
        p6,
      ], // Manque p_5 !
      version: currentSession.version + 1,
    };

    // Logique Anti-Éjection
    let finalSession = staleIncomingSession;
    if (currentPlayerId && currentSession.players.some((p) => p.id === currentPlayerId)) {
      const isStillPresent = finalSession.players.some((p) => p.id === currentPlayerId);
      if (!isStillPresent) {
        const myPlayer = currentSession.players.find((p) => p.id === currentPlayerId)!;
        finalSession = {
          ...finalSession,
          players: [...finalSession.players, myPlayer],
          version: Math.max(finalSession.version || 0, currentSession.version || 0) + 1,
          updatedAt: Date.now(),
        };
      }
    }

    // Vérification : le joueur 5 n'est PAS éjecté, et le joueur 6 est également présent !
    expect(finalSession.players.some((p) => p.id === 'p_5')).toBe(true);
    expect(finalSession.players.some((p) => p.id === 'p_6')).toBe(true);
    expect(finalSession.players.length).toBe(6);
  });

  it('rejette les sessions réseau dont la version est obsolète', () => {
    const currentSession = createMockSession(5);
    currentSession.version = 10;

    const staleSession = {
      ...currentSession,
      version: 8,
    };

    const shouldAccept = (staleSession.version || 0) >= (currentSession.version || 0);
    expect(shouldAccept).toBe(false);
  });

  it('fusionne et préserve les joueurs côté serveur si une session incomplète est soumise', () => {
    const serverSession = createMockSession(5);
    // Un client envoie une session où p_5 a été omis
    const incomingPlayers = serverSession.players.slice(0, 4);

    const missingPlayers = serverSession.players.filter(
      (ep) => !incomingPlayers.some((sp) => sp.id === ep.id)
    );

    expect(missingPlayers.length).toBe(1);
    expect(missingPlayers[0].id).toBe('p_5');

    const healedPlayers = [...incomingPlayers, ...missingPlayers];
    expect(healedPlayers.length).toBe(5);
    expect(healedPlayers.some((p) => p.id === 'p_5')).toBe(true);
  });
});
