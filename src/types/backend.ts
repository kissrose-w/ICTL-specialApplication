/**
 * Phase 0 — 后端原始数据类型接口
 * 
 * 这里定义的是后端 API 返回的"原始形状"（字段名、类型严格对齐后端 src/types/index.ts）
 * 前端内部类型（如 TodoItem）继续用 FixedUserId + 自己的字段命名
 * 两者不直接混用，通过 src/utils/apiMapper.ts 做转换
 */

// =====================================================
// 通用响应包装（后端所有 REST API 统一格式）
// =====================================================

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// =====================================================
// 后端用户档案（DuoUserProfile）
// =====================================================

export interface BackendUserProfile {
  id: string;              // UUID (后端主键)
  username: string;        // 'user_a' / 'user_b'
  nickname: string;        // '用户A' / '用户B'
  avatarUrl?: string | null;
  fcmToken?: string | null;
  updatedAt?: string;
}

// =====================================================
// Auth 相关
// =====================================================

export interface BackendLoginRequest {
  userId: string;          // username 或 UUID 均可
  password: string;
}

export interface BackendLoginResponse {
  token: string;
  user: BackendUserProfile;
  partner: BackendUserProfile & { isOnline: boolean };
}

export interface BackendMeResponse {
  user: BackendUserProfile;
  partner: BackendUserProfile & { isOnline: boolean };
  onlineStatus: { userA: boolean; userB: boolean };
}

// =====================================================
// Todos（后端 src/types/index.ts 的 TodoItem）
// =====================================================

export type BackendTodoPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface BackendTodoMetadata {
  tags?: string[];
  color?: string;
  voiceUrl?: string;
  location?: string;
  customData?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface BackendTodoItem {
  id: string;                    // UUID
  creatorId: string;             // UUID (后端用户表主键)
  assigneeId: string | null;     // UUID | null
  title: string;
  description: string | null;    // 后端是 null，前端是 undefined
  dueAt: string | null;          // ISO timestamp (后端字段名 dueAt，前端叫 dueDate)
  isCompleted: boolean;          // 后端字段名 isCompleted，前端叫 completed
  completedAt: string | null;
  priority: BackendTodoPriority;
  repeatRule: string | null;
  metadata: BackendTodoMetadata; // JSONB，后端扩展用，前端暂不解析
  createdAt: string;
  updatedAt: string;
}

export interface BackendCreateTodoRequest {
  title: string;
  description?: string | null;
  assigneeId?: string | null;    // 后端 UUID
  dueAt?: string | null;
  priority?: BackendTodoPriority;
  repeatRule?: string | null;
  metadata?: BackendTodoMetadata;
}

export interface BackendUpdateTodoRequest {
  title?: string;
  description?: string | null;
  assigneeId?: string | null;
  dueAt?: string | null;
  isCompleted?: boolean;
  priority?: BackendTodoPriority;
  repeatRule?: string | null;
  metadata?: BackendTodoMetadata;
}

export interface BackendNudgeRequest {
  message?: string;
}

// =====================================================
// Notes
// =====================================================

export interface BackendNoteItem {
  id: string;
  authorId: string;                  // UUID
  title: string;
  content: string;
  isPinned: boolean;
  metadata: Record<string, unknown>; // JSONB
  createdAt: string;
  updatedAt: string;
}

export interface BackendCreateNoteRequest {
  title: string;
  content: string;
  isPinned?: boolean;
  metadata?: Record<string, unknown>;
}

export interface BackendUpdateNoteRequest {
  title?: string;
  content?: string;
  isPinned?: boolean;
  metadata?: Record<string, unknown>;
}

// =====================================================
// Reminders
// =====================================================

export type BackendReminderStatus = 'pending' | 'sent' | 'cancelled';

export interface BackendReminderItem {
  id: string;
  todoId: string | null;          // UUID | null
  targetUserId: string;           // UUID
  triggerAt: string;              // ISO timestamp
  status: BackendReminderStatus;
  createdAt: string;
}

export interface BackendCreateReminderRequest {
  todoId?: string | null;
  targetUserId: string;           // UUID
  triggerAt: string;              // ISO timestamp
}

// =====================================================
// WebSocket 事件类型（严格对齐后端 src/types/index.ts）
// =====================================================

export type BackendWsEventType =
  | 'TODO_CREATED'
  | 'TODO_UPDATED'
  | 'TODO_DELETED'
  | 'TODO_NUDGED'
  | 'NOTE_CREATED'
  | 'NOTE_UPDATED'
  | 'NOTE_DELETED'
  | 'REMINDER_CREATED'
  | 'REMINDER_ALERT'
  | 'PARTNER_STATUS'
  | 'HEARTBEAT_PONG';

/** 后端统一下行消息信封 */
export interface BackendWsMessage<T = unknown> {
  type: BackendWsEventType;
  sender: string;       // 'system' 或 后端 UUID
  timestamp: string;    // ISO 8601
  data: T;
}

// --- 各事件的 data 载荷具体类型 ---

export interface BackendTodoNudgedPayload {
  todoId: string;
  todoTitle: string;
  senderNickname: string;
  message: string;
}

export interface BackendPartnerStatusPayload {
  online: boolean;
  userId: string;       // UUID
}

export interface BackendReminderAlertPayload {
  id: string;
  title: string;
  body: string;
  itemType: 'TODO' | 'REMINDER';
}

export interface BackendHeartbeatPongPayload {
  ok?: boolean;
  message?: string;
  onlineStatus?: { userA: boolean; userB: boolean };
}

export interface BackendIdOnlyPayload {
  id: string;
}
