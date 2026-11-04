/**
 * Phase 1 — Auth Store 改造
 * 
 * 原来: mock-token 预设身份，一键切换
 * 现在: 真实 JWT 登录 + 后端 UUID 映射 + 伴侣在线状态
 * 
 * 保持向后兼容:
 *   - loginAs() / logout() / currentUserId / getCurrentUser() / getPartner() 接口不变
 *   - SettingsScreen 继续能用
 * 
 * 新增:
 *   - isLoggedIn: boolean           → RootNavigator 守卫
 *   - userIdMap: UserIdMap          → Phase 2/3 API 转换用
 *   - serverUserUuid: string        → 当前用户后端 UUID
 *   - partnerServerUuid: string     → 伴侣后端 UUID
 *   - partnerOnline: boolean        → 伴侣在线状态
 *   - loginWithBackend(userId, pwd) → 调真实后端登录
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from './storage';
import { FixedUserId, FIXED_USERS, UserProfile, getPartnerUser } from '../config/users';
import { DEFAULT_USER_ID_MAP, type UserIdMap } from '../config/apiConfig';
import { login as loginApi, type LoginError } from '../api/authApi';

export interface AuthState {
  // ============ 身份标识 ============
  /** 当前前端身份 */
  currentUserId: FixedUserId | null;
  /** 是否完成后端登录（RootNavigator 守卫用） */
  isLoggedIn: boolean;

  // ============ 后端返回的凭证 ============
  authToken: string | null;
  serverUserUuid: string | null;      // 当前用户后端 UUID
  partnerServerUuid: string | null;   // 伴侣后端 UUID
  userIdMap: UserIdMap;               // FixedUserId ↔ UUID 映射表
  partnerOnline: boolean;             // 伴侣在线状态

  // ============ Actions ============
  /** 调后端 /api/auth/login */
  loginWithBackend: (
    userId: FixedUserId,
    password: string
  ) => Promise<{ success: true } | { success: false; error: LoginError }>;

  /** 一键切换身份（Phase 1 后 SettingsScreen 内部用 loginWithBackend 替换此处） */
  loginAs: (userId: FixedUserId) => void;

  /** 退出登录，清空后端相关状态 */
  logout: () => void;

  // ============ 计算属性 (保持原接口) ============
  getCurrentUser: () => UserProfile | null;
  getPartner: () => UserProfile | null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // ============ 初始值 ============
      currentUserId: null,
      isLoggedIn: false,
      authToken: null,
      serverUserUuid: null,
      partnerServerUuid: null,
      userIdMap: { ...DEFAULT_USER_ID_MAP },
      partnerOnline: false,

      // ============ Actions ============

      loginWithBackend: async (userId, password) => {
        try {
          const result = await loginApi(userId, password);

          // 从后端返回的 user/partner 里建立 FixedUserId ↔ UUID 映射
          // 后端 username 永远是 'user_a' / 'user_b'，用这个来确定 FixedUserId
          const isCurrentUserA = result.user.username === 'user_a';
          const fixedId: FixedUserId = isCurrentUserA ? 'user_a' : 'user_b';
          const partnerFixedId: FixedUserId = isCurrentUserA ? 'user_b' : 'user_a';

          // 先给全量默认值，确保类型满足 Record<FixedUserId, string>
          const newMap: UserIdMap = {
            ...DEFAULT_USER_ID_MAP,
            [fixedId]: result.user.id,
            [partnerFixedId]: result.partner.id,
          };

          set({
            currentUserId: fixedId,
            isLoggedIn: true,
            authToken: result.token,
            serverUserUuid: result.user.id,
            partnerServerUuid: result.partner.id,
            userIdMap: newMap,
            partnerOnline: result.partner.isOnline,
          });

          return { success: true as const };
        } catch (err) {
          const error = err as LoginError;
          return { success: false as const, error };
        }
      },

      loginAs: (userId) => {
        // 兼容 SettingsScreen 一键切换 — 直接跳过后端验证（dev 模式）
        // 生产期应改为调 loginWithBackend
        set({
          currentUserId: userId,
          isLoggedIn: true,
          // 注意: 跳过后端登录时 token/userIdMap 保持原值或默认值
          // 如果之前已经有 JWT，切换后需要重新 loginWithBackend
        });
      },

      logout: () => {
        set({
          currentUserId: null,
          isLoggedIn: false,
          authToken: null,
          serverUserUuid: null,
          partnerServerUuid: null,
          userIdMap: { ...DEFAULT_USER_ID_MAP }, // 保留默认映射，下次登录用
          partnerOnline: false,
        });
      },

      // ============ 计算属性 (保持原接口) ============

      getCurrentUser: () => {
        const id = get().currentUserId;
        return id ? FIXED_USERS[id] : null;
      },

      getPartner: () => {
        const id = get().currentUserId;
        return id ? getPartnerUser(id) : null;
      },
    }),
    {
      name: 'duo-auth-storage',
      storage: createJSONStorage(() => mmkvStorage),
      // 持久化全部字段 — token 在 MMKV 里是安全的
    }
  )
);
