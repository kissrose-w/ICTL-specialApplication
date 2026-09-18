import { FixedUserId } from '../config/users';

export type TodoSyncStatus = 'synced' | 'pending' | 'conflict';

export interface TodoItem {
  id: string;
  title: string;
  description?: string;
  creatorId: FixedUserId;       // 谁创建的
  assignedToId: FixedUserId;    // 指派给谁 (我 或 TA)
  completed: boolean;
  completedBy?: FixedUserId;    // 谁打钩完成的
  completedAt?: string;
  nudgeCount: number;           // 一键催办/拍一拍次数
  lastNudgeAt?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: TodoSyncStatus;   // 离线同步状态 (pending: 本地未上报, synced: 已同步)
}

export type TodoFilterType = 'all' | 'mine' | 'partner' | 'completed';
