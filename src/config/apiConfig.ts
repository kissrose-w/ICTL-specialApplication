/**
 * Phase 0 — 前后端对接基础设施
 * 
 * 后端地址 / WebSocket 地址 / 固定双用户 credentials / UUID 映射表
 * 所有后续 Phase 都从这里读取配置
 */

import { FixedUserId } from './users';

// =====================================================
// 后端服务地址
// =====================================================

// 开发期: 本地后端 http://localhost:3000
// 生产期: 改为真实域名 (如 https://api.yourdomain.com)
export const API_BASE_URL = 'http://localhost:3000';
export const WS_BASE_URL = 'ws://localhost:3000';

/** API 完整路径辅助 */
export const apiUrl = (path: string) => `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

/** WebSocket 完整路径辅助 (需拼接 JWT token) */
export const wsUrl = (token: string) => `${WS_BASE_URL}/ws?token=${encodeURIComponent(token)}`;

// =====================================================
// 固定双用户登录凭证 (开发期硬编码，生产可移到 env)
// =====================================================

export interface UserCredentials {
  userId: string;       // 后端 login 接口接受 username 或 UUID，这里用 username 最简洁
  password: string;
}

export const USER_CREDENTIALS: Record<FixedUserId, UserCredentials> = {
  user_a: { userId: 'user_a', password: 'duo_secret_a_123' },
  user_b: { userId: 'user_b', password: 'duo_secret_b_456' },
};

// =====================================================
// 前端内部 FixedUserId ↔ 后端 UUID 固化映射
// =====================================================
// 前端全程用 'user_a' / 'user_b' 做内部标识，不换 UUID
// 但发后端 REST API 时，creatorId / assigneeId / targetUserId 必须传后端 UUID
// 这个映射表就是做这个转换的

export type UserIdMap = Record<FixedUserId, string>;

/**
 * 默认映射（来自后端 config.ts 的默认值）
 * 登录成功后 authStore 会从后端返回值覆盖这个表
 * 但即使后端 UUID 改了，username 永远是 user_a / user_b，转换逻辑不失效
 */
export const DEFAULT_USER_ID_MAP: UserIdMap = {
  user_a: '00000000-0000-0000-0000-000000000001',
  user_b: '00000000-0000-0000-0000-000000000002',
};

// =====================================================
// REST API 路径常量（避免在各处散落字符串）
// =====================================================

export const API_ROUTES = {
  auth: {
    login: '/api/auth/login',
    me: '/api/auth/me',
  },
  todos: {
    list: '/api/todos',
    byId: (id: string) => `/api/todos/${id}`,
    nudge: (id: string) => `/api/todos/${id}/nudge`,
  },
  notes: {
    list: '/api/notes',
    byId: (id: string) => `/api/notes/${id}`,
  },
  reminders: {
    list: '/api/reminders',
    byId: (id: string) => `/api/reminders/${id}`,
  },
} as const;
