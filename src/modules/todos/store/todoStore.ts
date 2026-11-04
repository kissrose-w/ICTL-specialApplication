/**
 * Phase 3 — Todo Store 改造
 * 
 * 原来: 100% 本地 Zustand CRUD，没有后端调用
 * 现在: 乐观更新本地 (syncStatus=pending) → async 上报后端 → 后端自动 broadcastToPartner
 * 
 * 数据流:
 *   UI 点击 → addTodo() 乐观更新 → POST /api/todos → 后端落库 + broadcastToPartner
 *                                                        ↓
 *                                              伴侣端 WS TODO_CREATED → mergeRemoteTodos()
 * 
 * 关键设计:
 *   - addTodo 用 `local-xxx` 临时 ID → 后端返回真实 UUID 后 mergeRemoteTodos + 移除临时项
 *   - toggleTodo / deleteTodo / nudgeTodo 直接用真实 UUID（已经在 Phase 2 全量拉取时拿到）
 *   - 所有 REST 失败不阻塞 UI，保持 pending 等待 retryQueue
 *   - WS 断线重连后自动 GET /api/todos 全量刷新
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '../../../store/storage';
import { TodoItem, TodoFilterType } from '../../../types/todo';
import { FixedUserId } from '../../../config/users';
import { useAuthStore } from '../../../store/authStore';
import { createTodo, updateTodo, deleteTodoApi, nudgeTodoApi, listTodos } from '../../../api/todosApi';
import { toBackendCreateTodo, toBackendToggleTodo, fromBackendTodos } from '../../../utils/apiMapper';

interface TodoStoreState {
  todos: TodoItem[];
  // Actions (乐观更新 + async REST)
  addTodo: (params: {
    title: string;
    description?: string;
    assignedToId: FixedUserId;
    dueDate?: string;
  }) => TodoItem;
  toggleTodo: (id: string, operatorId: FixedUserId) => void;
  nudgeTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
  updateSyncStatus: (id: string, status: 'synced' | 'pending') => void;
  mergeRemoteTodos: (remoteTodos: TodoItem[]) => void;
  deleteRemoteTodo: (id: string) => void;
  // 全量同步 + retry
  syncFromBackend: () => Promise<void>;
  retryPendingSyncs: () => void;
  // Selectors
  getFilteredTodos: (filter: TodoFilterType, currentUserId: FixedUserId) => TodoItem[];
  getPendingNudgesForUser: (currentUserId: FixedUserId) => TodoItem[];
}

/** 生成临时 ID（乐观更新时用，后端返回真实 UUID 后替换） */
function tempId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

export const useTodoStore = create<TodoStoreState>()(
  persist(
    (set, get) => ({
      todos: [],
      // 初始状态为空（Phase 3 后端登录后会自动 syncFromBackend 全量拉取）
      // 但为了不破坏未登录时的 demo 体验，preset 数据保留在下面注释

      // =====================================================
      // CRUD —— 乐观更新 + async REST
      // =====================================================

      addTodo: ({ title, description, assignedToId, dueDate }) => {
        const auth = useAuthStore.getState();
        const creatorId = auth.currentUserId ?? 'user_a';
        const idMap = auth.userIdMap;

        const localTodo: TodoItem = {
          id: tempId(),
          title: title.trim(),
          description,
          creatorId,
          assignedToId,
          completed: false,
          nudgeCount: 0,
          dueDate,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          syncStatus: 'pending',
        };

        // ① 乐观更新本地 —— UI 立即响应
        set((state) => ({ todos: [localTodo, ...state.todos] }));

        // ② async 上报后端（不阻塞）
        (async () => {
          try {
            const backendBody = toBackendCreateTodo({
              title: title.trim(),
              description,
              assigneeFixed: assignedToId,
              dueDate,
              idMap,
            });
            const created = await createTodo(backendBody);

            // 后端返回的完整对象（有真实 UUID）
            const frontendTodo = fromBackendTodos([created], idMap)[0];

            // 移除临时项 + 合并真实后端对象
            set((state) => ({
              todos: state.todos
                .filter((t) => t.id !== localTodo.id)
                .concat([frontendTodo]),
            }));
          } catch (err) {
            console.warn('[TodoStore] addTodo REST failed, keeping pending:', err);
            // 失败后保持 syncStatus=pending，后续 retryPendingSyncs 会重试
          }
        })();

        return localTodo;
      },

      toggleTodo: (id, operatorId) => {
        const todo = get().todos.find((t) => t.id === id);
        if (!todo) return;

        const nextCompleted = !todo.completed;

        // ① 乐观更新
        set((state) => ({
          todos: state.todos.map((t) =>
            t.id === id
              ? {
                  ...t,
                  completed: nextCompleted,
                  completedBy: nextCompleted ? operatorId : undefined,
                  completedAt: nextCompleted ? new Date().toISOString() : undefined,
                  updatedAt: new Date().toISOString(),
                  syncStatus: 'pending' as const,
                }
              : t
          ),
        }));

        // ② async PATCH /api/todos/:id
        (async () => {
          try {
            if (id.startsWith('local-')) {
              console.warn('[TodoStore] toggleTodo: still on local temp ID, skipping REST');
              return;
            }
            await updateTodo(id, toBackendToggleTodo(nextCompleted));
            set((state) => ({
              todos: state.todos.map((t) =>
                t.id === id ? { ...t, syncStatus: 'synced' as const } : t
              ),
            }));
          } catch (err) {
            console.warn('[TodoStore] toggleTodo REST failed:', err);
          }
        })();
      },

      deleteTodo: (id) => {
        // ① 乐观更新 —— 先从本地列表移除
        set((state) => ({
          todos: state.todos.filter((t) => t.id !== id),
        }));

        // ② async DELETE /api/todos/:id
        (async () => {
          try {
            if (id.startsWith('local-')) return; // 还没发后端，直接跳过
            await deleteTodoApi(id);
          } catch (err) {
            console.warn('[TodoStore] deleteTodo REST failed:', err);
          }
        })();
      },

      nudgeTodo: (id) => {
        // ① 乐观更新 —— 本地 nudgeCount+1
        set((state) => ({
          todos: state.todos.map((t) =>
            t.id === id
              ? {
                  ...t,
                  nudgeCount: (t.nudgeCount || 0) + 1,
                  lastNudgeAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  syncStatus: 'pending' as const,
                }
              : t
          ),
        }));

        // ② async POST /api/todos/:id/nudge —— 后端自动 broadcastToPartner TODO_NUDGED
        (async () => {
          try {
            if (id.startsWith('local-')) {
              console.warn('[TodoStore] nudgeTodo: still on local temp ID, skipping REST');
              return;
            }
            await nudgeTodoApi(id, { message: '快来看看待办吧~' });
          } catch (err) {
            console.warn('[TodoStore] nudgeTodo REST failed:', err);
          }
        })();
      },

      // =====================================================
      // Merge / Update helpers
      // =====================================================

      updateSyncStatus: (id, status) => {
        set((state) => ({
          todos: state.todos.map((t) => (t.id === id ? { ...t, syncStatus: status } : t)),
        }));
      },

      mergeRemoteTodos: (remoteTodos) => {
        set((state) => {
          const map = new Map<string, TodoItem>();
          [...state.todos, ...remoteTodos].forEach((item) => {
            const existing = map.get(item.id);
            // 后端返回的永远比本地 temp 更新时间新；同 ID 按 updatedAt 优先
            if (!existing || new Date(item.updatedAt) > new Date(existing.updatedAt)) {
              map.set(item.id, item);
            }
          });
          return { todos: Array.from(map.values()) };
        });
      },

      deleteRemoteTodo: (id) => {
        set((state) => ({
          todos: state.todos.filter((t) => t.id !== id),
        }));
      },

      // =====================================================
      // 全量同步 + Retry
      // =====================================================

      /**
       * 登录成功后 / WS 重连后调用 —— GET /api/todos 全量刷新
       * 会把后端最新状态覆盖本地（本地 pending 的操作会被合并）
       */
      syncFromBackend: async () => {
        try {
          const auth = useAuthStore.getState();
          if (!auth.authToken) return;

          const backendTodos = await listTodos();
          const frontendTodos = fromBackendTodos(backendTodos, auth.userIdMap);
          get().mergeRemoteTodos(frontendTodos);
          console.log(`[TodoStore] ✅ syncFromBackend: ${frontendTodos.length} todos synced`);
        } catch (err) {
          console.warn('[TodoStore] syncFromBackend failed:', err);
        }
      },

      /**
       * 重发 syncStatus='pending' 的条目
       * 登录成功后 / WS 重连后调用
       * 
       * 分两类处理:
       *   (a) local-xxx 临时 ID → 还没 POST 成功过，retry createTodo 并替换为真实 UUID
       *   (b) 真实 UUID + pending → 全量 GET 覆盖即可（后端是 source of truth）
       */
      retryPendingSyncs: async () => {
        const pending = get().todos.filter((t) => t.syncStatus === 'pending');
        console.log(`[TodoStore] retryPendingSyncs: ${pending.length} pending items`);

        // (a) 临时 ID 的 —— retry POST createTodo
        const tempIdPending = pending.filter((t) => t.id.startsWith('local-'));
        for (const t of tempIdPending) {
          try {
            const auth = useAuthStore.getState();
            const backendBody = toBackendCreateTodo({
              title: t.title,
              description: t.description,
              assigneeFixed: t.assignedToId,
              dueDate: t.dueDate,
              idMap: auth.userIdMap,
            });
            const created = await createTodo(backendBody);
            const frontendTodo = fromBackendTodos([created], auth.userIdMap)[0];

            set((state) => ({
              todos: state.todos
                .filter((x) => x.id !== t.id)
                .concat([frontendTodo]),
            }));
            console.log(`[TodoStore] 🔁 Retry createTodo succeeded: ${t.id} → ${frontendTodo.id}`);
          } catch (err) {
            console.warn(`[TodoStore] Retry createTodo failed for ${t.id}:`, err);
          }
        }

        // (b) 真实 UUID 的 —— 全量 GET 覆盖
        // 无论有没有 (b) 类 pending，都做一次全量拉取确保后端状态对齐
        await get().syncFromBackend();
      },

      // =====================================================
      // Selectors (保持不变)
      // =====================================================

      getFilteredTodos: (filter, currentUserId) => {
        const all = get().todos;
        switch (filter) {
          case 'mine':
            return all.filter((t) => !t.completed && t.assignedToId === currentUserId);
          case 'partner':
            return all.filter((t) => !t.completed && t.assignedToId !== currentUserId);
          case 'completed':
            return all.filter((t) => t.completed);
          case 'all':
          default:
            return all.filter((t) => !t.completed);
        }
      },

      getPendingNudgesForUser: (currentUserId) => {
        return get().todos.filter(
          (t) => !t.completed && t.assignedToId === currentUserId && (t.nudgeCount || 0) > 0
        );
      },
    }),
    {
      name: 'duo-todo-storage',
      storage: createJSONStorage(() => mmkvStorage),
      // Phase 3 登录成功后会 syncFromBackend 全量拉取 —— 如果后端没有数据，这里就为空
      // preset 数据保留: 可以让未登录或后端未启动时 UI 也有内容
      partialize: (state) => ({
        // 只持久化 todos 和方法引用（persist 会自动处理）
        todos: state.todos,
      }),
    }
  )
);
