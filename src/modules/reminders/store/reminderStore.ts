/**
 * Phase 5 — Reminder Store
 * 
 * 核心设计：
 *   前端创建 reminder → 乐观更新 → async REST 上报 → **同时 schedule 本机 Android AlarmManager**
 *   后端 cron (每分钟扫描) + WS REMINDER_ALERT 是兜底通道
 *   
 *   本地 AlarmManager 可以做到秒级精准唤醒 (setExactAndAllowWhileIdle)
 *   后端 cron 只有分钟级精度 —— 所以前端一定要自己 schedule
 * 
 * schedule 条件：
 *   - reminder.targetUserId 是我（我是被提醒人）
 *   - triggerAt 在未来
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '../../../store/storage';
import type { ReminderItem } from '../../../types/reminder';
import { useAuthStore } from '../../../store/authStore';
import { alarmBridge } from '../../../native-bridge/alarmBridge';
import {
  listReminders,
  createReminder,
  deleteReminderApi,
} from '../../../api/remindersApi';
import { fromBackendReminder, fromBackendReminders, toBackendCreateReminder } from '../../../utils/apiMapper';

function tempId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

interface ReminderStoreState {
  reminders: ReminderItem[];

  /**
   * 创建提醒 — 乐观更新 + async REST + schedule 本机 AlarmManager
   */
  addReminder: (params: {
    targetUserFixed: 'user_a' | 'user_b';
    triggerAt: string;
    todoId?: string | null;
    title?: string;
  }) => ReminderItem;

  /** 取消/删除 */
  deleteReminder: (id: string) => void;

  /** WS merge helpers */
  mergeRemoteReminders: (remoteReminders: ReminderItem[]) => void;
  mergeRemoteReminder: (remoteReminder: ReminderItem) => void;

  /** 伴侣端 WS REMINDER_CREATED 触发时，schedule 本机闹钟（如果 targetUserId 是我） */
  scheduleLocalAlarmIfMine: (reminder: ReminderItem) => void;

  /** 应用内触发提醒（WS REMINDER_ALERT 到达时） */
  markReminderAlerted: (id: string) => void;

  /** Sync */
  syncFromBackend: () => Promise<void>;
  retryPendingSyncs: () => Promise<void>;
}

/** 是否需要 schedule 本机 AlarmManager */
function shouldScheduleLocalAlarm(reminder: ReminderItem, myId: 'user_a' | 'user_b'): boolean {
  if (reminder.status === 'sent' || reminder.status === 'cancelled') return false;
  if (reminder.targetUserId !== myId) return false;
  if (reminder.localAlarmScheduled) return false;
  const triggerTs = new Date(reminder.triggerAt).getTime();
  return triggerTs > Date.now(); // 必须在未来
}

/** 调用原生 AlarmManager scheduleExactAlarm */
async function scheduleLocalAlarm(reminder: ReminderItem, title?: string) {
  try {
    await alarmBridge.scheduleExactAlarm({
      alarmId: reminder.id,
      triggerTimestamp: new Date(reminder.triggerAt).getTime(),
      title: title || '专属提醒',
      message: '您有一条提醒事项到期啦~',
      isFullScreenWakeup: true,
    });
    console.log(`[ReminderStore] 🔔 Local alarm scheduled: ${reminder.id}`);
    return true;
  } catch (err) {
    console.warn('[ReminderStore] scheduleExactAlarm failed:', err);
    return false;
  }
}

async function cancelLocalAlarm(reminderId: string) {
  try {
    await alarmBridge.cancelAlarm(reminderId);
  } catch (err) {
    console.warn('[ReminderStore] cancelAlarm failed:', err);
  }
}

export const useReminderStore = create<ReminderStoreState>()(
  persist(
    (set, get) => ({
      reminders: [],

      addReminder: ({ targetUserFixed, triggerAt, todoId, title }) => {
        const auth = useAuthStore.getState();
        const myFixed = auth.currentUserId ?? 'user_a';

        const localReminder: ReminderItem = {
          id: tempId(),
          todoId: todoId ?? null,
          targetUserId: targetUserFixed,
          triggerAt,
          status: 'pending',
          createdAt: new Date().toISOString(),
          syncStatus: 'pending',
          title,
          localAlarmScheduled: false,
        };

        // ① 乐观更新
        set((state) => ({ reminders: [...state.reminders, localReminder] }));

        // ② 如果目标是我，立即 schedule 本机 AlarmManager（不用等后端 REST 返回）
        if (targetUserFixed === myFixed) {
          if (shouldScheduleLocalAlarm(localReminder, myFixed)) {
            scheduleLocalAlarm(localReminder, title).then((ok) => {
              if (ok) {
                set((state) => ({
                  reminders: state.reminders.map((r) =>
                    r.id === localReminder.id ? { ...r, localAlarmScheduled: true } : r
                  ),
                }));
              }
            });
          }
        }

        // ③ async POST /api/reminders —— 后端 broadcastToBoth REMINDER_CREATED
        (async () => {
          try {
            const created = await createReminder(
              toBackendCreateReminder({
                targetUserFixed,
                triggerAt,
                todoId,
                idMap: auth.userIdMap,
              })
            );
            const backendReminder = fromBackendReminder(created, auth.userIdMap);

            set((state) => ({
              reminders: state.reminders
                .filter((r) => r.id !== localReminder.id)
                .concat([{ ...backendReminder, title }]),
            }));
          } catch (err) {
            console.warn('[ReminderStore] addReminder REST failed:', err);
          }
        })();

        return localReminder;
      },

      deleteReminder: (id) => {
        const reminder = get().reminders.find((r) => r.id === id);
        if (reminder) {
          cancelLocalAlarm(id);
        }

        // ① 乐观移除
        set((state) => ({
          reminders: state.reminders.map((r) =>
            r.id === id ? { ...r, status: 'cancelled' as const } : r
          ),
        }));

        // ② async DELETE
        (async () => {
          try {
            if (id.startsWith('local-')) return;
            await deleteReminderApi(id);
          } catch (err) {
            console.warn('[ReminderStore] deleteReminder REST failed:', err);
          }
        })();
      },

      mergeRemoteReminder: (remote) => {
        // 后端 REMINDER_CREATED 广播到达时调用
        const auth = useAuthStore.getState();
        const myFixed = auth.currentUserId ?? 'user_a';

        set((state) => {
          const existing = state.reminders.find((r) => r.id === remote.id);
          if (existing) {
            return {
              reminders: state.reminders.map((r) =>
                r.id === remote.id
                  ? {
                      ...remote,
                      title: existing.title ?? remote.title, // 保留本地 title（后端 reminder 表没有）
                    }
                  : r
              ),
            };
          }
          return { reminders: [...state.reminders, remote] };
        });

        // 自动 schedule 本机闹钟（如果是给我的提醒）
        get().scheduleLocalAlarmIfMine(remote);
      },

      mergeRemoteReminders: (remoteReminders) => {
        set((state) => {
          const map = new Map<string, ReminderItem>();
          [...state.reminders, ...remoteReminders].forEach((item) => {
            const existing = map.get(item.id);
            if (!existing || new Date(item.createdAt) > new Date(existing.createdAt)) {
              map.set(item.id, item);
            }
          });
          return { reminders: Array.from(map.values()) };
        });
      },

      scheduleLocalAlarmIfMine: (reminder) => {
        const auth = useAuthStore.getState();
        const myFixed = auth.currentUserId ?? 'user_a';

        if (shouldScheduleLocalAlarm(reminder, myFixed)) {
          scheduleLocalAlarm(reminder, reminder.title).then((ok) => {
            if (ok) {
              set((state) => ({
                reminders: state.reminders.map((r) =>
                  r.id === reminder.id ? { ...r, localAlarmScheduled: true } : r
                ),
              }));
            }
          });
        }
      },

      markReminderAlerted: (id) => {
        set((state) => ({
          reminders: state.reminders.map((r) =>
            r.id === id ? { ...r, status: 'sent' as const } : r
          ),
        }));
      },

      syncFromBackend: async () => {
        try {
          const auth = useAuthStore.getState();
          if (!auth.authToken) return;

          const backendList = await listReminders();
          const frontendList = fromBackendReminders(backendList, auth.userIdMap);
          get().mergeRemoteReminders(frontendList);
          console.log(`[ReminderStore] ✅ syncFromBackend: ${frontendList.length} reminders synced`);
        } catch (err) {
          console.warn('[ReminderStore] syncFromBackend failed:', err);
        }
      },

      retryPendingSyncs: async () => {
        const pending = get().reminders.filter((r) => r.syncStatus === 'pending');
        console.log(`[ReminderStore] retryPendingSyncs: ${pending.length} pending items`);

        const tempIdPending = pending.filter((r) => r.id.startsWith('local-'));
        for (const r of tempIdPending) {
          try {
            const auth = useAuthStore.getState();
            const created = await createReminder(
              toBackendCreateReminder({
                targetUserFixed: r.targetUserId,
                triggerAt: r.triggerAt,
                todoId: r.todoId,
                idMap: auth.userIdMap,
              })
            );
            const backendReminder = fromBackendReminder(created, auth.userIdMap);
            set((state) => ({
              reminders: state.reminders
                .filter((x) => x.id !== r.id)
                .concat([backendReminder]),
            }));
            console.log(`[ReminderStore] 🔁 Retry createReminder succeeded: ${r.id} → ${backendReminder.id}`);
          } catch (err) {
            console.warn(`[ReminderStore] Retry createReminder failed for ${r.id}:`, err);
          }
        }

        await get().syncFromBackend();
      },
    }),
    {
      name: 'duo-reminder-storage',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
