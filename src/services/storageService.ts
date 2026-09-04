import { GameSession } from '../types/game';

const SESSION_PREFIX = 'monopoly_session_';
const PLAYER_ID_PREFIX = 'monopoly_player_id_';
const LAST_ROOM_KEY = 'monopoly_last_room_code';

export const storageService = {
  saveSession(session: GameSession): void {
    try {
      localStorage.setItem(`${SESSION_PREFIX}${session.roomCode}`, JSON.stringify(session));
      localStorage.setItem(LAST_ROOM_KEY, session.roomCode);
    } catch (e) {
      console.error('Error saving session to localStorage', e);
    }
  },

  loadSession(roomCode: string): GameSession | null {
    try {
      const data = localStorage.getItem(`${SESSION_PREFIX}${roomCode.toUpperCase()}`);
      if (!data) return null;
      return JSON.parse(data) as GameSession;
    } catch (e) {
      console.error('Error loading session from localStorage', e);
      return null;
    }
  },

  getLastRoomCode(): string | null {
    return localStorage.getItem(LAST_ROOM_KEY);
  },

  saveCurrentPlayerId(roomCode: string, playerId: string): void {
    localStorage.setItem(`${PLAYER_ID_PREFIX}${roomCode.toUpperCase()}`, playerId);
  },

  getCurrentPlayerId(roomCode: string): string | null {
    return localStorage.getItem(`${PLAYER_ID_PREFIX}${roomCode.toUpperCase()}`);
  },

  clearSession(roomCode: string): void {
    localStorage.removeItem(`${SESSION_PREFIX}${roomCode.toUpperCase()}`);
    localStorage.removeItem(`${PLAYER_ID_PREFIX}${roomCode.toUpperCase()}`);
    if (localStorage.getItem(LAST_ROOM_KEY) === roomCode.toUpperCase()) {
      localStorage.removeItem(LAST_ROOM_KEY);
    }
  },
};
