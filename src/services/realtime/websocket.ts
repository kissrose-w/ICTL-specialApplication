import { useTodoStore } from '../../modules/todos/store/todoStore';
import { useAuthStore } from '../../store/authStore';
import { TodoItem } from '../../types/todo';

export type RealtimeEventType =
  | 'TODO_CREATED'
  | 'TODO_UPDATED'
  | 'TODO_COMPLETED'
  | 'NUDGE_RECEIVED'
  | 'PARTNER_ONLINE';

export interface RealtimeMessage {
  type: RealtimeEventType;
  senderId: string;
  timestamp: string;
  payload?: any;
}

class RealtimeService {
  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isConnecting: boolean = false;

  /**
   * 初始化连接 WebSocket 服务器 (两人共用同一个房间/Channel)
   */
  public connect(serverUrl: string = 'wss://api.example.com/duo-sync') {
    if (this.socket || this.isConnecting) return;

    this.isConnecting = true;
    try {
      this.socket = new WebSocket(serverUrl);

      this.socket.onopen = () => {
        this.isConnecting = false;
        console.log('[Realtime] WebSocket connected');
        // 自动加入专属两人频道
        const currentUserId = useAuthStore.getState().currentUserId;
        this.send({
          type: 'PARTNER_ONLINE',
          senderId: currentUserId || 'unknown',
          timestamp: new Date().toISOString(),
        });
      };

      this.socket.onmessage = (event) => {
        try {
          const msg: RealtimeMessage = JSON.parse(event.data);
          this.handleIncomingEvent(msg);
        } catch (e) {
          console.error('[Realtime] Failed to parse message:', e);
        }
      };

      this.socket.onerror = (err) => {
        console.warn('[Realtime] WebSocket error:', err);
      };

      this.socket.onclose = () => {
        this.socket = null;
        this.isConnecting = false;
        console.log('[Realtime] WebSocket disconnected. Reconnecting in 5s...');
        this.reconnectTimer = setTimeout(() => this.connect(serverUrl), 5000);
      };
    } catch (e) {
      this.isConnecting = false;
      console.warn('[Realtime] Connection failed:', e);
    }
  }

  public disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  public send(message: RealtimeMessage) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  private handleIncomingEvent(message: RealtimeMessage) {
    const currentUserId = useAuthStore.getState().currentUserId;
    // 忽略自己发送的回环广播
    if (message.senderId === currentUserId) return;

    console.log('[Realtime] Received partner event:', message.type);

    switch (message.type) {
      case 'TODO_CREATED':
      case 'TODO_UPDATED':
        if (message.payload?.todo) {
          useTodoStore.getState().mergeRemoteTodos([message.payload.todo]);
        }
        break;
      case 'TODO_COMPLETED':
        if (message.payload?.todoId) {
          useTodoStore
            .getState()
            .toggleTodo(message.payload.todoId, message.senderId as any);
        }
        break;
      case 'NUDGE_RECEIVED':
        if (message.payload?.todoId) {
          useTodoStore.getState().nudgeTodo(message.payload.todoId);
        }
        break;
      default:
        break;
    }
  }
}

export const realtimeService = new RealtimeService();
