import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { LoginScreen } from '../modules/auth/screens/LoginScreen';
import { MainTabNavigator } from './MainTabNavigator';
import type { RootStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * 根路由导航：
 * 【关键原则】：绝对不要任何“邀请码、配对码、创建双人空间”引导。
 * - 已登录：直达两人的共享空间 (MainTabs)；
 * - 未登录：普通登录页 (Login)，身份由后端登录结果判定。
 */
export const RootNavigator: React.FC = () => {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {isLoggedIn ? (
        // 已完成后端 JWT 登录 → 直达主空间
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      ) : (
        // 未登录 → 账号 + 密码
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{
            animation: 'fade',
          }}
        />
      )}
    </Stack.Navigator>
  );
};
