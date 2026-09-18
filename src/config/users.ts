/**
 * 系统预置固定的两位专属用户身份配置
 * 绝无繁琐的注册、邀请码、配对绑定流程
 */

export type FixedUserId = 'user_a' | 'user_b';

export interface UserProfile {
  id: FixedUserId;
  name: string;
  avatarBg: string; // Tailwind 颜色类
  badgeColor: string;
  title: string;
}

export const FIXED_USERS: Record<FixedUserId, UserProfile> = {
  user_a: {
    id: 'user_a',
    name: '我 (User A)',
    avatarBg: 'bg-blue-500',
    badgeColor: '#3b82f6',
    title: '空间主成员 A',
  },
  user_b: {
    id: 'user_b',
    name: 'TA (User B)',
    avatarBg: 'bg-rose-500',
    badgeColor: '#f43f5e',
    title: '空间主成员 B',
  },
};

/**
 * 根据当前用户 ID 获取对方 (Partner) 的信息
 */
export const getPartnerUser = (currentUserId: FixedUserId): UserProfile => {
  return currentUserId === 'user_a' ? FIXED_USERS.user_b : FIXED_USERS.user_a;
};

/**
 * 根据 ID 获取指定用户信息
 */
export const getUserById = (userId: FixedUserId): UserProfile => {
  return FIXED_USERS[userId] || FIXED_USERS.user_a;
};
