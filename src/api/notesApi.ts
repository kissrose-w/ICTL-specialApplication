/**
 * Phase 4 — Notes REST API 封装
 * 
 * 后端: Hono /api/notes
 * 鉴权: Authorization: Bearer <JWT> (从 authStore 动态读取)
 * 
 * 后端 REST 成功后自动 broadcastToPartner NOTE_CREATED/UPDATED/DELETED
 */

import { API_ROUTES, apiUrl } from '../config/apiConfig';
import { useAuthStore } from '../store/authStore';
import type {
  ApiResponse,
  BackendNoteItem,
  BackendCreateNoteRequest,
  BackendUpdateNoteRequest,
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

/** GET /api/notes — 置顶优先 + 更新时间倒序 */
export async function listNotes(): Promise<BackendNoteItem[]> {
  const res = await authFetch(apiUrl(API_ROUTES.notes.list));
  if (!res.ok) throw new Error(`LIST_NOTES_FAILED:${res.status}`);
  const json: ApiResponse<BackendNoteItem[]> = await res.json();
  if (!json.success) throw new Error(json.error ?? 'LIST_NOTES_FAILED');
  return json.data;
}

/** POST /api/notes — 创建。后端自动 broadcastToPartner NOTE_CREATED */
export async function createNote(
  body: BackendCreateNoteRequest
): Promise<BackendNoteItem> {
  const res = await authFetch(apiUrl(API_ROUTES.notes.list), {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`CREATE_NOTE_FAILED:${res.status}`);
  const json: ApiResponse<BackendNoteItem> = await res.json();
  if (!json.success) throw new Error(json.error ?? 'CREATE_NOTE_FAILED');
  return json.data;
}

/** PATCH /api/notes/:id — 更新/置顶切换。后端 broadcastToPartner NOTE_UPDATED */
export async function updateNote(
  id: string,
  body: BackendUpdateNoteRequest
): Promise<BackendNoteItem> {
  const res = await authFetch(apiUrl(API_ROUTES.notes.byId(id)), {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`UPDATE_NOTE_FAILED:${res.status}`);
  const json: ApiResponse<BackendNoteItem> = await res.json();
  if (!json.success) throw new Error(json.error ?? 'UPDATE_NOTE_FAILED');
  return json.data;
}

/** DELETE /api/notes/:id — 删除。后端 broadcastToPartner NOTE_DELETED */
export async function deleteNoteApi(id: string): Promise<void> {
  const res = await authFetch(apiUrl(API_ROUTES.notes.byId(id)), {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`DELETE_NOTE_FAILED:${res.status}`);
}
