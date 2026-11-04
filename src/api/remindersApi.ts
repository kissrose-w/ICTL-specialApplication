/**
 * Phase 5 — Reminders REST API 封装
 * 
 * 后端: Hono /api/reminders
 * 鉴权: Authorization: Bearer <JWT>
 * 
 * 后端 REST:
 *   POST /api/reminders  → broadcastToBoth REMINDER_CREATED
 *   DELETE /api/reminders/:id → 无 broadcast (依赖前端 syncFromBackend 兜底)
 *   GET /api/reminders  → 全量
 */

import { API_ROUTES, apiUrl } from '../config/apiConfig';
import { useAuthStore } from '../store/authStore';
import type {
  ApiResponse,
  BackendReminderItem,
  BackendCreateReminderRequest,
} from '../types/backend';

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

/** GET /api/reminders — 全量 */
export async function listReminders(): Promise<BackendReminderItem[]> {
  const res = await authFetch(apiUrl(API_ROUTES.reminders.list));
  if (!res.ok) throw new Error(`LIST_REMINDERS_FAILED:${res.status}`);
  const json: ApiResponse<BackendReminderItem[]> = await res.json();
  if (!json.success) throw new Error(json.error ?? 'LIST_REMINDERS_FAILED');
  return json.data;
}

/** POST /api/reminders — 创建。后端 broadcastToBoth REMINDER_CREATED */
export async function createReminder(
  body: BackendCreateReminderRequest
): Promise<BackendReminderItem> {
  const res = await authFetch(apiUrl(API_ROUTES.reminders.list), {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`CREATE_REMINDER_FAILED:${res.status}`);
  const json: ApiResponse<BackendReminderItem> = await res.json();
  if (!json.success) throw new Error(json.error ?? 'CREATE_REMINDER_FAILED');
  return json.data;
}

/** DELETE /api/reminders/:id — 取消。后端不 broadcast（前端 syncFromBackend 兜底） */
export async function deleteReminderApi(id: string): Promise<void> {
  const res = await authFetch(apiUrl(API_ROUTES.reminders.byId(id)), {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`DELETE_REMINDER_FAILED:${res.status}`);
}
