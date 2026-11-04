/**
 * Phase 3 — Todos REST API 封装
 * 
 * 后端: Hono /api/todos
 * 鉴权: Authorization: Bearer <JWT> (从 authStore 动态读取，不硬编码)
 * 
 * 后端 REST 成功后会自动 broadcastToPartner WS 消息，
 * 前端 REST 层不需要自己发 WS 广播。
 */

import { API_ROUTES, apiUrl } from '../config/apiConfig';
import { useAuthStore } from '../store/authStore';
import type {
  ApiResponse,
  BackendTodoItem,
  BackendCreateTodoRequest,
  BackendUpdateTodoRequest,
  BackendNudgeRequest,
} from '../types/backend';

/** 获取 authStore 当前的 JWT token —— 每次调用 getState() 拿最新值，避免 stale closure */
function getAuthToken(): string | null {
  return useAuthStore.getState().authToken;
}

function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((init?.headers as Record<string, string>) ?? {}),
  };

  return fetch(input, { ...init, headers });
}

// =====================================================
// CRUD
// =====================================================

/** GET /api/todos — 全量拉取（登录后首次加载 + WS 重连补拉用） */
export async function listTodos(): Promise<BackendTodoItem[]> {
  const res = await authFetch(apiUrl(API_ROUTES.todos.list));
  if (!res.ok) throw new Error(`LIST_TODOS_FAILED:${res.status}`);
  const json: ApiResponse<BackendTodoItem[]> = await res.json();
  if (!json.success) throw new Error(json.error ?? 'LIST_TODOS_FAILED');
  return json.data;
}

/** POST /api/todos — 创建待办。后端会自动 broadcastToPartner TODO_CREATED */
export async function createTodo(
  body: BackendCreateTodoRequest
): Promise<BackendTodoItem> {
  const res = await authFetch(apiUrl(API_ROUTES.todos.list), {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`CREATE_TODO_FAILED:${res.status}`);
  const json: ApiResponse<BackendTodoItem> = await res.json();
  if (!json.success) throw new Error(json.error ?? 'CREATE_TODO_FAILED');
  return json.data;
}

/** PATCH /api/todos/:id — 更新待办（完成状态、内容等）。后端会 broadcastToPartner TODO_UPDATED */
export async function updateTodo(
  id: string,
  body: BackendUpdateTodoRequest
): Promise<BackendTodoItem> {
  const res = await authFetch(apiUrl(API_ROUTES.todos.byId(id)), {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`UPDATE_TODO_FAILED:${res.status}`);
  const json: ApiResponse<BackendTodoItem> = await res.json();
  if (!json.success) throw new Error(json.error ?? 'UPDATE_TODO_FAILED');
  return json.data;
}

/** DELETE /api/todos/:id — 删除待办。后端会 broadcastToPartner TODO_DELETED */
export async function deleteTodoApi(id: string): Promise<void> {
  const res = await authFetch(apiUrl(API_ROUTES.todos.byId(id)), {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`DELETE_TODO_FAILED:${res.status}`);
}

/** POST /api/todos/:id/nudge — 拍一拍对方。后端会 broadcastToPartner TODO_NUDGED */
export async function nudgeTodoApi(
  id: string,
  body: BackendNudgeRequest = {}
): Promise<void> {
  const res = await authFetch(apiUrl(API_ROUTES.todos.nudge(id)), {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`NUDGE_TODO_FAILED:${res.status}`);
}
