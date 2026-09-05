import { GameSession, Transaction } from '../types/game';

export type SyncMessage =
  | { type: 'SESSION_SYNC'; session: GameSession; senderId: string }
  | { type: 'TRANSACTION_NOTIFY'; transaction: Transaction; senderId: string }
  | { type: 'PLAYER_JOINED'; player: any; senderId: string }
  | { type: 'JOIN_ROOM'; roomCode: string; senderId: string };

type SyncCallback = (message: SyncMessage) => void;

class SyncService {
  private channel: BroadcastChannel | null = null;
  private socket: WebSocket | null = null;
  private currentRoomCode: string | null = null;
  private callbacks: Set<SyncCallback> = new Set();
  private clientId: string = Math.random().toString(36).substring(2, 9);
  private reconnectTimer: any = null;
  private pendingSession: GameSession | null = null;

  public init(roomCode: string): void {
    const formattedCode = roomCode.toUpperCase();
    // Si déjà connecté ou en cours de connexion sur le même salon, ne rien casser
    if (
      this.currentRoomCode === formattedCode &&
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const previousPending = this.pendingSession;
    this.destroy(true); // Ne pas jeter la pendingSession
    this.currentRoomCode = formattedCode;
    this.pendingSession = previousPending;

    // 1. BroadcastChannel for fast local same-device / multi-tabs sync
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        this.channel = new BroadcastChannel(`monopoly_sync_${this.currentRoomCode}`);
        this.channel.onmessage = (event: MessageEvent<SyncMessage>) => {
          if (event.data && event.data.senderId !== this.clientId) {
            this.notifyListeners(event.data);
          }
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel not supported', e);
    }

    // 2. Storage event fallback
    window.addEventListener('storage', this.handleStorageEvent);

    // 3. Network WebSocket connection for Multi-Phone real-time sync across the Internet
    this.connectWebSocket(formattedCode);
  }

  private connectWebSocket(roomCode: string): void {
    if (typeof window === 'undefined') return;

    try {
      const isHttps = window.location.protocol === 'https:';
      const wsProtocol = isHttps ? 'wss:' : 'ws:';
      // In production or via tunnel, window.location.host is the exact host to connect to
      const wsUrl = `${wsProtocol}//${window.location.host}`;

      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log(`[SyncService] WebSocket connecté à ${wsUrl}`);
        // Inform server we joined this room
        this.socket?.send(
          JSON.stringify({
            type: 'JOIN_ROOM',
            roomCode,
            senderId: this.clientId,
          })
        );
        if (this.pendingSession) {
          this.socket?.send(
            JSON.stringify({
              type: 'SESSION_SYNC',
              session: this.pendingSession,
              senderId: this.clientId,
            })
          );
          this.pendingSession = null;
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const data: SyncMessage = JSON.parse(event.data);
          if (data && (data as any).senderId !== this.clientId) {
            this.notifyListeners(data);
          }
        } catch (err) {
          console.error('[SyncService] Erreur lecture message WebSocket:', err);
        }
      };

      this.socket.onclose = () => {
        // Auto-reconnect after 3s if still on this room
        if (this.currentRoomCode === roomCode) {
          this.reconnectTimer = setTimeout(() => {
            this.connectWebSocket(roomCode);
          }, 3000);
        }
      };

      this.socket.onerror = (e) => {
        // Fallback silently if standalone / dev server without backend ws
      };
    } catch (e) {
      console.warn('[SyncService] Connexion WebSocket non disponible:', e);
    }
  }

  private handleStorageEvent = (event: StorageEvent) => {
    if (event.key === `monopoly_session_${this.currentRoomCode}` && event.newValue) {
      try {
        const session: GameSession = JSON.parse(event.newValue);
        this.notifyListeners({
          type: 'SESSION_SYNC',
          session,
          senderId: 'storage_sync',
        });
      } catch (e) {
        console.error('Failed to parse storage event session', e);
      }
    }
  };

  public subscribe(callback: SyncCallback): () => void {
    this.callbacks.add(callback);
    return () => {
      this.callbacks.delete(callback);
    };
  }

  private notifyListeners(message: SyncMessage): void {
    this.callbacks.forEach((cb) => {
      try {
        cb(message);
      } catch (e) {
        console.error('Error in sync listener callback', e);
      }
    });
  }

  public broadcastSession(session: GameSession): void {
    const message: SyncMessage = {
      type: 'SESSION_SYNC',
      session,
      senderId: this.clientId,
    };

    // Broadcast locally to tabs
    if (this.channel) {
      try {
        this.channel.postMessage(message);
      } catch (e) {
        console.warn('BroadcastChannel postMessage error', e);
      }
    }

    // Broadcast over network WebSocket to other phones
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify(message));
      } catch (e) {
        console.warn('WebSocket send error', e);
      }
    } else {
      this.pendingSession = session;
    }
  }

  public broadcastTransaction(transaction: Transaction): void {
    const message: SyncMessage = {
      type: 'TRANSACTION_NOTIFY',
      transaction,
      senderId: this.clientId,
    };

    if (this.channel) {
      try {
        this.channel.postMessage(message);
      } catch (e) {
        console.warn('BroadcastChannel postMessage error', e);
      }
    }

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify(message));
      } catch (e) {
        console.warn('WebSocket send error', e);
      }
    }
  }

  public destroy(keepPending: boolean = false): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    window.removeEventListener('storage', this.handleStorageEvent);
    if (!keepPending) {
      this.callbacks.clear();
      this.pendingSession = null;
    }
    this.currentRoomCode = null;
  }

  public getClientId(): string {
    return this.clientId;
  }
}

export const syncService = new SyncService();
