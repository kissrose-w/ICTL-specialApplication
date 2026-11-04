/**
 * Phase 4 — Notes 前端类型定义
 * 
 * 后端 BackendNoteItem 字段（见 src/types/backend.ts）:
 *   id, authorId(UUID), title, content, isPinned, metadata(JSONB), createdAt, updatedAt
 * 
 * 前端用 FixedUserId 替换 authorId，加 syncStatus 本地状态
 */

import type { FixedUserId } from '../config/users';

export interface NoteItem {
  id: string;
  authorId: FixedUserId;        // 前端内部标识，不是 UUID
  title: string;
  content: string;
  isPinned: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  syncStatus: 'synced' | 'pending' | 'conflict';
}
