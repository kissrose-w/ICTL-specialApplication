import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from './storage';
import { FixedUserId, FIXED_USERS, UserProfile, getPartnerUser } from '../config/users';

interface AuthState {
  currentUserId: FixedUserId | null;
  authToken: string | null;
  // Actions
  loginAs: (userId: FixedUserId) => void;
  logout: () => void;
  // Computed helpers
  getCurrentUser: () => UserProfile | null;
  getPartner: () => UserProfile | null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUserId: 'user_a', // 默认预设为 user_a，可免密一键切换
      authToken: 'mock-token-user-a',

      loginAs: (userId: FixedUserId) => {
        set({
          currentUserId: userId,
          authToken: `mock-token-${userId}`,
        });
      },

      logout: () => {
        set({
          currentUserId: null,
          authToken: null,
        });
      },

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
    }
  )
);
