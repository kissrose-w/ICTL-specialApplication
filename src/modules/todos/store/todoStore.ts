import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '../../../store/storage';
import { TodoItem, TodoFilterType } from '../../../types/todo';
import { FixedUserId } from '../../../config/users';

interface TodoStoreState {
  todos: TodoItem[];
  // Actions
  addTodo: (params: {
    title: string;
    description?: string;
    creatorId: FixedUserId;
    assignedToId: FixedUserId;
    dueDate?: string;
  }) => TodoItem;
  toggleTodo: (id: string, operatorId: FixedUserId) => void;
  nudgeTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
  updateSyncStatus: (id: string, status: 'synced' | 'pending') => void;
  mergeRemoteTodos: (remoteTodos: TodoItem[]) => void;
  // Selectors
  getFilteredTodos: (filter: TodoFilterType, currentUserId: FixedUserId) => TodoItem[];
  getPendingNudgesForUser: (currentUserId: FixedUserId) => TodoItem[];
}

export const useTodoStore = create<TodoStoreState>()(
  persist(
    (set, get) => ({
      todos: [
        // 初始预置示例数据，展示双人协同
        {
          id: 'preset-todo-1',
          title: '一起去挑选客厅落地灯',
          description: '周六下午去宜家',
          creatorId: 'user_a',
          assignedToId: 'user_b',
          completed: false,
          nudgeCount: 1,
          lastNudgeAt: new Date().toISOString(),
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          updatedAt: new Date(Date.now() - 3600000).toISOString(),
          syncStatus: 'synced',
        },
        {
          id: 'preset-todo-2',
          title: '买猫粮与冻干',
          creatorId: 'user_b',
          assignedToId: 'user_a',
          completed: false,
          nudgeCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          syncStatus: 'synced',
        },
      ],

      addTodo: ({ title, description, creatorId, assignedToId, dueDate }) => {
        const newTodo: TodoItem = {
          id: `local-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          title: title.trim(),
          description,
          creatorId,
          assignedToId,
          completed: false,
          nudgeCount: 0,
          dueDate,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          syncStatus: 'pending', // 离线优先，标记为待后台同步
        };

        set((state) => ({
          todos: [newTodo, ...state.todos],
        }));

        return newTodo;
      },

      toggleTodo: (id: string, operatorId: FixedUserId) => {
        set((state) => ({
          todos: state.todos.map((todo) => {
            if (todo.id !== id) return todo;
            const nextCompleted = !todo.completed;
            return {
              ...todo,
              completed: nextCompleted,
              completedBy: nextCompleted ? operatorId : undefined,
              completedAt: nextCompleted ? new Date().toISOString() : undefined,
              updatedAt: new Date().toISOString(),
              syncStatus: 'pending',
            };
          }),
        }));
      },

      nudgeTodo: (id: string) => {
        set((state) => ({
          todos: state.todos.map((todo) => {
            if (todo.id !== id) return todo;
            return {
              ...todo,
              nudgeCount: (todo.nudgeCount || 0) + 1,
              lastNudgeAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              syncStatus: 'pending',
            };
          }),
        }));
      },

      deleteTodo: (id: string) => {
        set((state) => ({
          todos: state.todos.filter((todo) => todo.id !== id),
        }));
      },

      updateSyncStatus: (id: string, status: 'synced' | 'pending') => {
        set((state) => ({
          todos: state.todos.map((t) => (t.id === id ? { ...t, syncStatus: status } : t)),
        }));
      },

      mergeRemoteTodos: (remoteTodos: TodoItem[]) => {
        set((state) => {
          const map = new Map<string, TodoItem>();
          // 本地优先还是远程优先按更新时间合并
          [...state.todos, ...remoteTodos].forEach((item) => {
            const existing = map.get(item.id);
            if (!existing || new Date(item.updatedAt) > new Date(existing.updatedAt)) {
              map.set(item.id, item);
            }
          });
          return { todos: Array.from(map.values()) };
        });
      },

      getFilteredTodos: (filter: TodoFilterType, currentUserId: FixedUserId) => {
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

      getPendingNudgesForUser: (currentUserId: FixedUserId) => {
        return get().todos.filter(
          (t) => !t.completed && t.assignedToId === currentUserId && (t.nudgeCount || 0) > 0
        );
      },
    }),
    {
      name: 'duo-todo-storage',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
