/**
 * Phase 1 — Auth API 封装
 * 
 * 对接后端:
 *   POST /api/auth/login  { userId, password } → { token, user, partner }
 *   GET  /api/auth/me     Header: Authorization: Bearer <token> → { user, partner, onlineStatus }
 */

import { API_ROUTES, apiUrl } from '../config/apiConfig';
import type {
  ApiResponse,
  BackendLoginRequest,
  BackendLoginResponse,
  BackendMeResponse,
} from '../types/backend';
import { authHeader } from '../utils/apiMapper';

// =====================================================
// 登录
// =====================================================

export interface LoginError {
  code: 'INVALID_CREDENTIALS' | 'NETWORK_ERROR' | 'SERVER_ERROR';
  message: string;
}

export async function login(
  userId: string,
  password: string
): Promise<BackendLoginResponse> {
  const body: BackendLoginRequest = { userId, password };

  let response: Response;
  try {
    response = await fetch(apiUrl(API_ROUTES.auth.login), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw {
      code: 'NETWORK_ERROR',
      message: '无法连接后端服务，请确认后端已启动 (http://localhost:3000)',
    } as LoginError;
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw {
        code: 'INVALID_CREDENTIALS',
        message: '用户名或密码错误',
      } as LoginError;
    }
    throw {
      code: 'SERVER_ERROR',
      message: `服务异常 (${response.status})`,
    } as LoginError;
  }

  const json: ApiResponse<BackendLoginResponse> = await response.json();
  if (!json.success) {
    throw {
      code: 'INVALID_CREDENTIALS',
      message: json.error ?? '登录失败',
    } as LoginError;
  }

  return json.data;
}

// =====================================================
// 获取当前身份 + 伴侣在线状态
// =====================================================

export async function getMe(token: string): Promise<BackendMeResponse> {
  let response: Response;
  try {
    response = await fetch(apiUrl(API_ROUTES.auth.me), {
      method: 'GET',
      headers: authHeader(token),
    });
  } catch (err) {
    throw new Error('NETWORK_ERROR');
  }

  if (response.status === 401 || response.status === 403) {
    // Token 过期或无效，前端应该 logout
    throw new Error('TOKEN_EXPIRED');
  }
  if (!response.ok) {
    throw new Error(`SERVER_ERROR:${response.status}`);
  }

  const json: ApiResponse<BackendMeResponse> = await response.json();
  if (!json.success) throw new Error(json.error ?? 'GET_ME_FAILED');
  return json.data;
}
