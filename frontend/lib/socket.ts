type Handler = (data: unknown) => void;

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  const KEY = 'perfil_session_id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      id = crypto.randomUUID();
    } else {
      id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      });
    }
    localStorage.setItem(KEY, id);
  }
  return id;
}

class WsClient {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<Handler>>();
  private reconnectAttempts = 0;
  private readonly maxReconnect = 5;
  private readonly baseUrl: string;
  id: string = '';
  connected: boolean = false;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.connect();
  }

  private connect() {
    if (typeof window === 'undefined') return;
    const sessionId = getOrCreateSessionId();
    this.ws = new WebSocket(`${this.baseUrl}?sessionId=${sessionId}`);

    this.ws.onmessage = (e: MessageEvent) => {
      try {
        const { event, data } = JSON.parse(e.data as string);
        if (event === 'session-id') {
          this.id = data.id;
          this.connected = true;
          this.reconnectAttempts = 0;
          this.fire('connect', undefined);
          return;
        }
        this.fire(event, data);
      } catch {}
    };

    this.ws.onclose = () => {
      this.connected = false;
      this.fire('disconnect', 'transport close');
      if (this.reconnectAttempts < this.maxReconnect) {
        this.reconnectAttempts++;
        setTimeout(() => this.connect(), 1000 * this.reconnectAttempts);
      }
    };

    this.ws.onerror = () => {
      this.fire('connect_error', new Error('WebSocket connection error'));
    };
  }

  private fire(event: string, data: unknown) {
    this.handlers.get(event)?.forEach(h => h(data));
  }

  on<T = unknown>(event: string, handler: (data: T) => void): void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler as Handler);
  }

  off<T = unknown>(event: string, handler?: (data: T) => void): void {
    if (!handler) { this.handlers.delete(event); return; }
    this.handlers.get(event)?.delete(handler as Handler);
  }

  emit(event: string, data?: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event, data }));
    }
  }

  disconnect(): void {
    this.reconnectAttempts = this.maxReconnect;
    this.ws?.close();
    this.ws = null;
    this.connected = false;
  }
}

export type { WsClient };

let client: WsClient | null = null;

export function getSocket(): WsClient {
  if (!client) {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${window.location.hostname}:3001/ws`;
    client = new WsClient(url);
  }
  return client;
}

export function disconnectSocket(): void {
  client?.disconnect();
  client = null;
}

export function getSessionId(): string {
  return getOrCreateSessionId();
}

export function clearSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('perfil_session_id');
  }
}
