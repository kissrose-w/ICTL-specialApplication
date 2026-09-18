import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { UserSelectScreen } from '../modules/auth/screens/UserSelectScreen';
import { MainTabNavigator } from './MainTabNavigator';
import type { RootStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * 根路由导航：
 * 【关键原则】：绝对不要任何“邀请码、配对码、创建双人空间”引导。
 * - 若已选择/记住身份：免登直接进入两人共同主页 (MainTabs)；
 * - 若未选择身份：进入极简 2 选 1 身份切换页 (UserSelect)。
 */
export const RootNavigator: React.FC = () => {
  const currentUserId = useAuthStore((state) => state.currentUserId);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {currentUserId ? (
        // 已经有选择过身份（或本地记住），直达主空间，零引导流程
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      ) : (
        // 未选择身份时，极简两人身份卡片点击即进
        <Stack.Screen
          name="UserSelect"
          component={UserSelectScreen}
          options={{
            animation: 'fade',
          }}
        />
      )}
    </Stack.Navigator>
  );
};
