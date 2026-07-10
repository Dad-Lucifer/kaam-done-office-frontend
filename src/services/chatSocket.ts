type MessageHandler = (data: any) => void;

class ChatSocketService {
  private socket: WebSocket | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private heartbeatInterval: number | null = null;
  private url: string;
  private messageQueue: any[] = [];

  constructor() {
    // Derive WebSocket URL from the VITE_API_URL env variable (http→ws, https→wss)
    const apiUrl = import.meta.env.VITE_API_URL as string || 'http://localhost:5000';
    this.url = apiUrl.replace(/^http/, 'ws');
  }

  connect() {
    if (this.socket && (this.socket.readyState === WebSocket.CONNECTING || this.socket.readyState === WebSocket.OPEN)) {
      return;
    }

    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => {
      console.log('[WebSocket] Connected');
      this.startHeartbeat();
      // Flush any queued messages
      while (this.messageQueue.length > 0) {
        const payload = this.messageQueue.shift();
        this.socket?.send(JSON.stringify(payload));
      }
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.messageHandlers.forEach(handler => handler(data));
      } catch (err) {
        console.error('[WebSocket] Failed to parse message', err);
      }
    };

    this.socket.onclose = () => {
      console.log('[WebSocket] Disconnected. Reconnecting in 5s...');
      this.stopHeartbeat();
      setTimeout(() => this.connect(), 5000);
    };

    this.socket.onerror = (err) => {
      console.error('[WebSocket] Error:', err);
      this.socket?.close();
    };
  }

  disconnect() {
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = window.setInterval(() => {
      this.send({ action: 'heartbeat' });
    }, 30000); // 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      window.clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  send(payload: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload));
    } else if (!this.socket || this.socket.readyState === WebSocket.CONNECTING) {
      // Queue it if we are connecting
      this.messageQueue.push(payload);
      if (!this.socket) {
        this.connect();
      }
    } else {
      console.warn('[WebSocket] Cannot send message, socket closed');
    }
  }

  onMessage(handler: MessageHandler) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  // --- Helpers ---
  joinRoom(roomId: string, user: { id: string; username: string }) {
    this.send({ action: 'joinRoom', roomId, user });
  }

  sendMessage(roomId: string, message: string, user: { id: string; username: string; avatar?: string }) {
    this.send({ action: 'sendMessage', roomId, message, user });
  }

  typing(roomId: string, user: { username: string }) {
    this.send({ action: 'typing', roomId, user });
  }

  react(roomId: string, messageId: string, emoji: string, user: { id: string }) {
    this.send({ action: 'react', roomId, messageId, emoji, user });
  }
}

export const chatSocket = new ChatSocketService();
