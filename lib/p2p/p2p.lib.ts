import Peer, { DataConnection } from "peerjs";

export enum ConnectionState {
  Idle = "idle",
  Connecting = "connecting",
  Incoming = "incoming",
  Connected = "connected",
  Closed = "closed",
  Destroyed = "destroyed",
}

export enum P2PErrorCode {
  Timeout = "timeout",
  Network = "network",
  PeerUnavailable = "peer-unavailable",
  InvalidPacket = "invalid-packet",
  NotConnected = "not-connected",
  InvalidState = "invalid-state",
  Destroyed = "destroyed",
  Unknown = "unknown",
}

export interface Packet<T = unknown> {
  type: string;
  payload: T;
}

export interface P2PError {
  code: P2PErrorCode;
  message: string;
  cause?: unknown;
}

export interface P2PEvents {
  open: (peerId: string) => void;
  incoming: (peerId: string) => void;
  connected: () => void;
  disconnected: () => void;
  message: (packet: Packet) => void;
  error: (error: P2PError) => void;
}

type EventMap = { [K in keyof P2PEvents]: P2PEvents[K] };
type Listener<T> = T extends (...args: infer A) => void ? (...args: A) => void : never;

class EventEmitter<TEvents extends object> {
  protected listeners: { [K in keyof TEvents]?: Set<Listener<TEvents[K]>> } = {};

  on<K extends keyof TEvents>(event: K, callback: Listener<TEvents[K]>): () => void {
    if (!this.listeners[event]) this.listeners[event] = new Set();
    this.listeners[event]!.add(callback);
    return () => this.off(event, callback);
  }

  once<K extends keyof TEvents>(event: K, callback: Listener<TEvents[K]>): () => void {
    const unsubscribe = this.on(event, ((...args: Parameters<Listener<TEvents[K]>>) => {
      unsubscribe();
      callback(...args);
    }) as Listener<TEvents[K]>);
    return unsubscribe;
  }

  off<K extends keyof TEvents>(event: K, callback: Listener<TEvents[K]>): void {
    this.listeners[event]?.delete(callback);
  }

  protected emit<K extends keyof TEvents>(event: K, ...args: Parameters<Listener<TEvents[K]>>): void {
    const listeners = this.listeners[event];
    if (!listeners) return;
    for (const listener of listeners) {
      try { listener(...args); } catch (error) { console.error(`[EventEmitter] listener error (${String(event)})`, error); }
    }
  }

  removeAllListeners(): void {
    this.listeners = {};
  }
}

export class P2PClient extends EventEmitter<EventMap> {
  private peer: Peer;
  private conn: DataConnection | null = null;
  private incomingConn: DataConnection | null = null;
  private peerId = "";
  private state: ConnectionState = ConnectionState.Idle;
  private readonly connectionTimeout = 10000;
  private connectTimer: ReturnType<typeof setTimeout> | null = null;
  private readyPromise: Promise<string>;
  private resolveReady: ((peerId: string) => void) | null = null;

  constructor() {
    super();
    this.peer = new Peer();
    this.readyPromise = new Promise<string>((resolve) => { this.resolveReady = resolve; });
    this.bindPeerEvents();
  }

  async ready(): Promise<string> { return this.readyPromise; }
  getId(): string { return this.peerId; }
  getState(): ConnectionState { return this.state; }
  isConnected(): boolean { return this.state === ConnectionState.Connected; }

  connect(remoteId: string): void {
    this.ensureNotDestroyed();
    if (this.state !== ConnectionState.Idle && this.state !== ConnectionState.Closed) {
      this.emitError(P2PErrorCode.InvalidState, `Cannot connect while state is ${this.state}`);
      return;
    }
    this.state = ConnectionState.Connecting;
    const conn = this.peer.connect(remoteId);
    this.startConnectionTimeout();
    this.setupConnection(conn);
  }

  accept(): void {
    this.ensureNotDestroyed();
    if (!this.incomingConn) {
      this.emitError(P2PErrorCode.InvalidState, "No incoming connection");
      return;
    }
    this.setupConnection(this.incomingConn);
    this.incomingConn = null;
  }

  reject(): void {
    this.ensureNotDestroyed();
    this.incomingConn?.close();
    this.incomingConn = null;
    this.state = ConnectionState.Idle;
  }

  disconnect(): void {
    if (this.state === ConnectionState.Destroyed) return;
    this.clearConnectionTimeout();
    this.conn?.close();
    this.conn = null;
    this.state = ConnectionState.Closed;
  }

  send<T>(packet: Packet<T>): boolean {
    this.ensureNotDestroyed();
    if (!this.conn) {
      this.emitError(P2PErrorCode.NotConnected, "No active connection");
      return false;
    }
    if (!this.validatePacket(packet)) {
      this.emitError(P2PErrorCode.InvalidPacket, "Invalid packet");
      return false;
    }
    try {
      if (JSON.stringify(packet).length > 1024 * 1024) {
        this.emitError(P2PErrorCode.InvalidPacket, "Packet exceeds 1MB limit");
        return false;
      }
      this.conn.send(packet);
      return true;
    } catch (error) {
      this.emitError(P2PErrorCode.Unknown, "Failed to send packet", error);
      return false;
    }
  }

  destroy(): void {
    if (this.state === ConnectionState.Destroyed) return;
    this.clearConnectionTimeout();
    try { this.conn?.close(); } catch {}
    try { this.incomingConn?.close(); } catch {}
    try { this.peer.destroy(); } catch {}
    this.conn = null;
    this.incomingConn = null;
    this.removeAllListeners();
    this.state = ConnectionState.Destroyed;
  }

  private bindPeerEvents(): void {
    this.peer.on("open", (id) => {
      this.peerId = id;
      this.resolveReady?.(id);
      this.emit("open", id);
    });
    this.peer.on("connection", (conn) => {
      if (this.state === ConnectionState.Destroyed) { conn.close(); return; }
      if (this.conn) { conn.close(); return; }
      this.incomingConn = conn;
      this.state = ConnectionState.Incoming;
      this.emit("incoming", conn.peer);
    });
    this.peer.on("error", (error: unknown) => {
      this.handleUnknownError(error, P2PErrorCode.Network, "Peer error");
    });
  }

  private setupConnection(conn: DataConnection): void {
    this.conn = conn;
    conn.on("open", () => {
      this.clearConnectionTimeout();
      this.state = ConnectionState.Connected;
      this.emit("connected");
    });
    conn.on("close", () => {
      this.clearConnectionTimeout();
      this.conn = null;
      if (this.state !== ConnectionState.Destroyed) {
        this.state = ConnectionState.Closed;
        this.emit("disconnected");
      }
    });
    conn.on("error", (error: unknown) => {
      this.handleUnknownError(error, P2PErrorCode.Network, "Connection error");
    });
    conn.on("data", (data: unknown) => {
      if (!this.validatePacket(data)) {
        this.emitError(P2PErrorCode.InvalidPacket, "Received invalid packet");
        return;
      }
      this.emit("message", data);
    });
  }

  private startConnectionTimeout(): void {
    this.clearConnectionTimeout();
    this.connectTimer = setTimeout(() => {
      if (this.state === ConnectionState.Connecting) {
        this.conn?.close();
        this.emitError(P2PErrorCode.Timeout, "Connection timeout");
        this.state = ConnectionState.Closed;
      }
    }, this.connectionTimeout);
  }

  private clearConnectionTimeout(): void {
    if (this.connectTimer) { clearTimeout(this.connectTimer); this.connectTimer = null; }
  }

  private validatePacket(data: unknown): data is Packet {
    if (typeof data !== "object" || data === null) return false;
    const packet = data as Record<string, unknown>;
    return typeof packet.type === "string" && "payload" in packet;
  }

  private handleUnknownError(error: unknown, fallbackCode: P2PErrorCode, fallbackMessage: string): void {
    if (error && typeof error === "object" && "message" in error) {
      this.emitError(fallbackCode, String(error.message), error);
      return;
    }
    this.emitError(fallbackCode, fallbackMessage, error);
  }

  private emitError(code: P2PErrorCode, message: string, cause?: unknown): void {
    this.emit("error", { code, message, cause });
  }

  private ensureNotDestroyed(): void {
    if (this.state === ConnectionState.Destroyed) throw new Error("P2PClient has been destroyed");
  }
}