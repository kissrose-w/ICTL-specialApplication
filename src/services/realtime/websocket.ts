/**
 * Phase 2 — WebSocket Realtime Service
 * 
 * 后端 Gateway: ws://localhost:3000/ws?token=<JWT>
 * 完整事件类型严格对齐后端 src/types/index.ts WsEventType
 * 
 * 前端只做"接收 + 分发到 store"，不发 REST 层的广播（后端 REST API 会自动 broadcastToPartner）
 * 前端只发 2 种客户端消息：PING (心跳) 和 NUDGE (快速拍一拍)
 */

import { wsUrl } from '../../config/apiConfig';
import { useTodoStore } from '../../modules/todos/store/todoStore';
import { useNoteStore } from '../../modules/notes/store/noteStore';
import { useReminderStore } from '../../modules/reminders/store/reminderStore';
import { useAuthStore } from '../../store/authStore';
import { Alert } from 'react-native';
import { fromBackendTodo, fromBackendNote, fromBackendReminder } from '../../utils/apiMapper';
import type {
  BackendWsMessage,
  BackendTodoItem,
  BackendTodoNudgedPayload,
  BackendPartnerStatusPayload,
  BackendHeartbeatPongPayload,
  BackendIdOnlyPayload,
  BackendReminderAlertPayload,
  BackendNoteItem,
  BackendReminderItem,
  BackendWsEventType,
} from '../../types/backend';

// 事件类型别名（公开给外部 import）
export type WsEventType = BackendWsEventType;

class RealtimeService {
  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private isConnecting: boolean = false;
  private expectedToken: string | null = null;
  private onReconnectCallback: (() => void) | null = null;

  /**
   * 登录成功后调用 — 用 JWT 建立 WS 鉴权连接
   */
  public connectWithAuth(token: string, onReconnect?: () => void) {
    this.expectedToken = token;
    this.onReconnectCallback = onReconnect ?? null;

    // 如果已有连接，先断开
    this.disconnect();
    this.connect(token);
  }

  /**
   * 底层连接实现 — URL 模板: ws://host/ws?token=<JWT>
   */
  private connect(token: string) {
    if (this.isConnecting) return;

    this.isConnecting = true;
    try {
      this.socket = new WebSocket(wsUrl(token));

      this.socket.onopen = () => {
        this.isConnecting = false;
        console.log('[Realtime] ✅ WebSocket connected to backend gateway');
        // 后端 register 时会自动发 HEARTBEAT_PONG + PARTNER_STATUS，前端不需要自己发上线消息
        // 启动前端心跳（每 25s 发一次 PING，比后端 30s 探测略短）
        this.startClientHeartbeat();
      };

      this.socket.onmessage = (event) => {
        try {
          const msg: BackendWsMessage = JSON.parse(event.data);
          this.handleIncomingEvent(msg);
        } catch (e) {
          console.error('[Realtime] Failed to parse message:', e);
        }
      };

      this.socket.onerror = (err) => {
        console.warn('[Realtime] WebSocket error:', err);
      };

      this.socket.onclose = (event) => {
        this.isConnecting = false;
        this.stopClientHeartbeat();
        console.log(
          `[Realtime] WebSocket disconnected (code=${event.code}). Reconnecting in 5s...`
        );
        this.scheduleReconnect();
      };
    } catch (e) {
      this.isConnecting = false;
      console.warn('[Realtime] Connection failed:', e);
      this.scheduleReconnect();
    }
  }

  public disconnect() {
    this.stopClientHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      try {
        this.socket.onopen = null;
        this.socket.onmessage = null;
        this.socket.onerror = null;
        this.socket.onclose = null;
        this.socket.close();
      } catch {
        /* ignore */
      }
      this.socket = null;
    }
  }

  /**
   * 客户端发 PING (后端 handler 会回 HEARTBEAT_PONG)
   */
  public sendPing() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({ type: 'PING', timestamp: new Date().toISOString() })
      );
    }
  }

  /**
   * 快速拍一拍对方 (不经 REST API，直接走 WS — handler 已支持)
   */
  public sendNudge(title: string = '拍了拍你', message: string = '快来看看待办吧~') {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({ type: 'NUDGE', title, message })
      );
    }
  }

  // =====================================================
  // 心跳 + 重连
  // =====================================================

  private startClientHeartbeat() {
    this.stopClientHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.sendPing();
      }
    }, 25000);
  }

  private stopClientHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      const token = useAuthStore.getState().authToken;
      if (token) {
        this.connect(token);
        // 重连成功后执行补拉回调
        if (this.onReconnectCallback) {
          this.onReconnectCallback();
        }
      } else {
        // token 已清，不需要再连
        console.log('[Realtime] No token available, skipping reconnect');
      }
    }, 5000);
  }

  // =====================================================
  // 事件分发 —— 严格对齐后端 WsEventType
  // =====================================================

  private handleIncomingEvent(message: BackendWsMessage) {
    const myServerUuid = useAuthStore.getState().serverUserUuid;
    // 忽略自己发出的广播（后端 broadcastToPartner 是单向的，但 HEARTBEAT_PONG 等 system 消息 sender='system' 也要处理）
    if (message.sender !== 'system' && message.sender === myServerUuid) return;

    console.log(`[Realtime] Received ${message.type} from ${message.sender}`);

    switch (message.type) {
      case 'TODO_CREATED':
      case 'TODO_UPDATED': {
        const backendTodo = message.data as BackendTodoItem;
        const idMap = useAuthStore.getState().userIdMap;
        const frontendTodo = fromBackendTodo(backendTodo, idMap);
        useTodoStore.getState().mergeRemoteTodos([frontendTodo]);
        break;
      }

      case 'TODO_DELETED': {
        const { id } = message.data as BackendIdOnlyPayload;
        useTodoStore.getState().deleteRemoteTodo(id);
        break;
      }

      case 'TODO_NUDGED': {
        const payload = message.data as BackendTodoNudgedPayload;
        // 更新本地 nudgeCount（UI 显示催一下标记）
        useTodoStore.getState().nudgeTodo(payload.todoId);
        // Toast + 震动的 UI 触发由 UI 组件层监听（暂不在这里直接 Alert）
        console.log(`[Realtime] 💥 NUDGE received: ${payload.senderNickname} → ${payload.message}`);
        break;
      }

      case 'PARTNER_STATUS': {
        const payload = message.data as BackendPartnerStatusPayload;
        useAuthStore.setState({ partnerOnline: payload.online });
        console.log(`[Realtime] 伴侣在线: ${payload.online}`);
        break;
      }

      case 'HEARTBEAT_PONG': {
        const payload = message.data as BackendHeartbeatPongPayload;
        if (payload.onlineStatus) {
          // 后端发的完整在线状态快照（连接成功时会带）
          // 从 onlineStatus 里推导出伴侣状态
          const currentFixed = useAuthStore.getState().currentUserId;
          const partnerOnline =
            currentFixed === 'user_a' ? payload.onlineStatus.userB : payload.onlineStatus.userA;
          useAuthStore.setState({ partnerOnline });
        }
        break;
      }

      case 'NOTE_CREATED':
      case 'NOTE_UPDATED': {
        const backendNote = message.data as BackendNoteItem;
        const idMap = useAuthStore.getState().userIdMap;
        const frontendNote = fromBackendNote(backendNote, idMap);
        useNoteStore.getState().mergeRemoteNotes([frontendNote]);
        break;
      }

      case 'NOTE_DELETED': {
        const { id } = message.data as BackendIdOnlyPayload;
        useNoteStore.getState().deleteRemoteNote(id);
        break;
      }

      case 'REMINDER_CREATED': {
        // 后端 POST /api/reminders 时 broadcastToBoth
        // 伴侣端收到 → mergeRemoteReminder（内部会自动 schedule 本机闹钟如果 targetUserId 是我）
        const backendReminder = message.data as BackendReminderItem;
        const idMap = useAuthStore.getState().userIdMap;
        const frontendReminder = fromBackendReminder(backendReminder, idMap);
        useReminderStore.getState().mergeRemoteReminder(frontendReminder);
        break;
      }

      case 'REMINDER_ALERT': {
        // 后端 cron 到期触发 —— 到点了
        // 本地 AlarmManager 也应该已经触发全屏唤醒（如果排得够准）
        // 这里做 App 内兜底 Alert（如果 App 在前台时）
        const payload = message.data as BackendReminderAlertPayload;
        console.log(`[Realtime] ⏰ REMINDER_ALERT: ${payload.title} — ${payload.body}`);
        Alert.alert(payload.title, payload.body, [{ text: '好的' }]);
        break;
      }

      default:
        console.warn(`[Realtime] Unhandled event type: ${message.type as string}`);
        break;
    }
  }
}

export const realtimeService = new RealtimeService();
