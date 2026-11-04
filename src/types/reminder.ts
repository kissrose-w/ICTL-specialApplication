/**
 * Phase 5 — Reminder 前端内部类型
 * 
 * 后端 BackendReminderItem 字段（见 backend.ts）:
 *   id(UUID), todoId(UUID|null), targetUserId(UUID), triggerAt(ISO), status, createdAt
 * 
 * 前端内部用 FixedUserId 替换 targetUserId, 加 syncStatus 本地态
 */

import type { FixedUserId } from '../config/users';

export type ReminderStatus = 'pending' | 'sent' | 'cancelled';

export interface ReminderItem {
  id: string;
  todoId: string | null;
  targetUserId: FixedUserId;    // 前端内部标识
  triggerAt: string;             // ISO timestamp
  status: ReminderStatus;
  createdAt: string;
  syncStatus: 'synced' | 'pending' | 'conflict';
  /** 标题由 UI 根据 todoId 或用户输入生成，后端 reminder 表本身没有 title 字段 */
  title?: string;
  /** 是否已在本机 schedule Android AlarmManager */
  localAlarmScheduled?: boolean;
}
