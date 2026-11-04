/**
 * Phase 3 — 全局 WS + Todo 全量同步 Hook
 * 
 * 跟随 authStore.isLoggedIn + authStore.authToken 自动：
 *   ① 连接 / 断开 WebSocket（Phase 2）
 *   ② 登录成功后首次 GET /api/todos 全量拉取（Phase 3）
 *   ③ WS 重连后全量补拉 + retry pending 项（Phase 3）
 * 
 * 放在 App.tsx 根部调用一次即可
 */

import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useTodoStore } from '../modules/todos/store/todoStore';
import { useNoteStore } from '../modules/notes/store/noteStore';
import { useReminderStore } from '../modules/reminders/store/reminderStore';
import { realtimeService } from '../services/realtime/websocket';

export function useRealtimeSync() {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const authToken = useAuthStore((state) => state.authToken);

  // 用 ref 跟踪"这次连接是否已经建立过"，避免 StrictMode 双 effect 导致重复 connect
  const isConnectedRef = useRef(false);
  // 跟踪"是否已经做过登录后首次全量拉取"
  const didInitialSyncRef = useRef(false);

  useEffect(() => {
    if (isLoggedIn && authToken) {
      if (!isConnectedRef.current) {
        console.log('[useRealtimeSync] 🔗 Auth ready, establishing WS connection');

        // 登录后首次全量拉取（后端是 source of truth）
        if (!didInitialSyncRef.current) {
          didInitialSyncRef.current = true;
          useTodoStore.getState().syncFromBackend();
          useNoteStore.getState().syncFromBackend();
          useReminderStore.getState().syncFromBackend();
        }

        // WS 重连回调 —— 全量补拉 + retry
        const onReconnect = () => {
          console.log('[useRealtimeSync] 🔄 WS reconnected, triggering full refresh');
          useTodoStore.getState().retryPendingSyncs();
          useNoteStore.getState().retryPendingSyncs();
          useReminderStore.getState().retryPendingSyncs();
        };

        realtimeService.connectWithAuth(authToken, onReconnect);
        isConnectedRef.current = true;
      }
    } else {
      if (isConnectedRef.current) {
        console.log('[useRealtimeSync] 🔌 Auth cleared, disconnecting WS');
        realtimeService.disconnect();
        isConnectedRef.current = false;
        didInitialSyncRef.current = false;
      }
    }
  }, [isLoggedIn, authToken]);

  // 根组件卸载时真正断开
  useEffect(() => {
    return () => {
      realtimeService.disconnect();
      isConnectedRef.current = false;
      didInitialSyncRef.current = false;
    };
  }, []);
}
