/**
 * Phase 0 — 前后端数据转换层
 * 
 * 这是身份映射和字段名对齐的核心模块。
 * 所有"发请求前"和"收响应后"的转换都在这里集中处理。
 * 
 * 调用时机：
 *   - 发 REST 请求前: creatorId/assigneeId 用 fixedToUuid() 转换
 *   - 收 REST 响应后: fromBackendTodo() 把后端对象转前端对象
 *   - 收 WS 广播后: 同上，直接用 fromBackendTodo()
 */

import type { FixedUserId } from '../config/users';
import type { UserIdMap } from '../config/apiConfig';
import type { TodoItem } from '../types/todo';
import type { NoteItem } from '../types/note';
import type { ReminderItem } from '../types/reminder';
import type {
  BackendTodoItem,
  BackendCreateTodoRequest,
  BackendNoteItem,
  BackendUserProfile,
  BackendReminderItem,
  BackendCreateReminderRequest,
} from '../types/backend';

// =====================================================
// 基础身份映射
// =====================================================

/**
 * 前端 FixedUserId ('user_a' | 'user_b') → 后端 UUID
 * 发 REST 请求时用这个转换 creatorId / assigneeId / targetUserId
 */
export function fixedToUuid(
  fixed: FixedUserId,
  map: UserIdMap
): string {
  return map[fixed];
}

/**
 * 后端 UUID → 前端 FixedUserId
 * 收到后端返回的 creatorId / assigneeId / authorId 时用这个转换
 * @returns 找不到映射时兜底返回 'user_a'（开发期安全值）
 */
export function uuidToFixed(
  uuid: string | null | undefined,
  map: UserIdMap
): FixedUserId {
  if (!uuid) return 'user_a';

  const entry = Object.entries(map).find(([, v]) => v === uuid);
  if (entry) return entry[0] as FixedUserId;

  // 兜底：如果 uuid 没在映射表里，检查是不是后端 username
  if (uuid === 'user_b') return 'user_b';
  return 'user_a';
}

/**
 * 从后端返回的 user profile 推导出 FixedUserId
 * 后端 /api/auth/login 返回的 user 对象里有 username 字段，用那个最直接
 */
export function profileToFixed(
  profile: BackendUserProfile | undefined | null
): FixedUserId | null {
  if (!profile) return null;
  if (profile.username === 'user_b') return 'user_b';
  if (profile.username === 'user_a') return 'user_a';
  return null;
}

// =====================================================
// TodoItem 双向转换
// =====================================================

/**
 * 后端 TodoItem → 前端 TodoItem
 * 字段名转换 + UUID → FixedUserId + 前端特有字段给默认值
 */
export function fromBackendTodo(
  backend: BackendTodoItem,
  idMap: UserIdMap
): TodoItem {
  const creatorFixed = uuidToFixed(backend.creatorId, idMap);
  const assigneeFixed = uuidToFixed(backend.assigneeId, idMap);

  return {
    id: backend.id,
    title: backend.title,
    description: backend.description ?? undefined,          // null → undefined
    creatorId: creatorFixed,
    assignedToId: assigneeFixed,                             // 后端 null 时 uuidToFixed 兜底
    completed: backend.isCompleted,                           // isCompleted → completed
    completedAt: backend.completedAt ?? undefined,
    dueDate: backend.dueAt ?? undefined,                      // dueAt → dueDate
    // 以下为纯前端本地字段，后端没有，给默认值
    nudgeCount: 0,
    lastNudgeAt: undefined,
    syncStatus: 'synced',
    // 后端没返回 completedBy，前端暂从 sender 推断（WS 广播里才有）
    // REST 全量刷新场景下 completedBy 会是 undefined，TodoCard 渲染时要兜底
    completedBy: undefined,
    createdAt: backend.createdAt,
    updatedAt: backend.updatedAt,
  };
}

/**
 * 批量转换
 */
export function fromBackendTodos(
  backendList: BackendTodoItem[],
  idMap: UserIdMap
): TodoItem[] {
  return backendList.map((t) => fromBackendTodo(t, idMap));
}

/**
 * 前端 Todo 创建草稿 → 后端 POST /api/todos body
 * creatorId 不需要传（后端从 JWT 自动取），assigneeId 要转 UUID
 */
export function toBackendCreateTodo(params: {
  title: string;
  description?: string;
  assigneeFixed?: FixedUserId;
  dueDate?: string;
  idMap: UserIdMap;
}): BackendCreateTodoRequest {
  const body: BackendCreateTodoRequest = {
    title: params.title,
    description: params.description ?? null,
  };

  if (params.assigneeFixed) {
    body.assigneeId = fixedToUuid(params.assigneeFixed, params.idMap);
  }
  if (params.dueDate) {
    body.dueAt = params.dueDate;
  }

  return body;
}

/**
 * 前端 Toggle 完成状态 → 后端 PATCH /api/todos/:id body
 */
export function toBackendToggleTodo(isCompleted: boolean) {
  return { isCompleted };
}

// =====================================================
// NoteItem 双向转换（Phase 4 用）
// =====================================================

export function fromBackendNote(
  backend: BackendNoteItem,
  idMap: UserIdMap
): NoteItem {
  return {
    id: backend.id,
    authorId: uuidToFixed(backend.authorId, idMap),
    title: backend.title,
    content: backend.content,
    isPinned: backend.isPinned,
    metadata: backend.metadata ?? {},
    createdAt: backend.createdAt,
    updatedAt: backend.updatedAt,
    syncStatus: 'synced',
  };
}

export function fromBackendNotes(
  backendList: BackendNoteItem[],
  idMap: UserIdMap
): NoteItem[] {
  return backendList.map((n) => fromBackendNote(n, idMap));
}

// =====================================================
// ReminderItem 双向转换（Phase 5 用）
// =====================================================

/** 后端 ReminderItem → 前端 ReminderItem */
export function fromBackendReminder(
  backend: BackendReminderItem,
  idMap: UserIdMap
): ReminderItem {
  return {
    id: backend.id,
    todoId: backend.todoId,
    targetUserId: uuidToFixed(backend.targetUserId, idMap),
    triggerAt: backend.triggerAt,
    status: backend.status,
    createdAt: backend.createdAt,
    syncStatus: 'synced',
    localAlarmScheduled: false,
  };
}

export function fromBackendReminders(
  backendList: BackendReminderItem[],
  idMap: UserIdMap
): ReminderItem[] {
  return backendList.map((r) => fromBackendReminder(r, idMap));
}

/** 前端创建 reminder 草稿 → 后端 POST /api/reminders body */
export function toBackendCreateReminder(params: {
  targetUserFixed: FixedUserId;
  triggerAt: string;
  todoId?: string | null;
  idMap: UserIdMap;
}): BackendCreateReminderRequest {
  const body: BackendCreateReminderRequest = {
    targetUserId: fixedToUuid(params.targetUserFixed, params.idMap),
    triggerAt: params.triggerAt,
  };
  if (params.todoId) body.todoId = params.todoId;
  return body;
}

// =====================================================
// 工具: 构造完整的 WS Authorization Header
// =====================================================

export function authHeader(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}
