import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings, Users, LogOut, RotateCcw, Database, Shield } from 'lucide-react-native';
import { useAuthStore } from '../store/authStore';
import { useTodoStore } from '../modules/todos/store/todoStore';
import { FIXED_USERS, FixedUserId } from '../config/users';

export const SettingsScreen: React.FC = () => {
  const { currentUserId, loginAs, logout } = useAuthStore();
  const todos = useTodoStore((state) => state.todos);

  const currentUser = currentUserId ? FIXED_USERS[currentUserId] : FIXED_USERS.user_a;

  const handleSwitchIdentity = () => {
    const targetUserId: FixedUserId = currentUserId === 'user_a' ? 'user_b' : 'user_a';
    loginAs(targetUserId);
    Alert.alert('已切换身份', `当前操作者已切换为：${FIXED_USERS[targetUserId].name}`);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-100">
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Header */}
        <View className="flex-row items-center mb-5">
          <Settings size={22} color="#334155" />
          <Text className="text-xl font-black text-slate-800 ml-2">系统设置</Text>
        </View>

        {/* Current Identity Card */}
        <View className="bg-white rounded-2xl p-5 mb-4 border border-slate-200 shadow-sm">
          <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            当前登入身份 (双人专属空间)
          </Text>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View
                className="w-12 h-12 rounded-xl items-center justify-center mr-3"
                style={{ backgroundColor: currentUser.badgeColor }}
              >
                <Text className="text-white font-bold text-lg">
                  {currentUser.id === 'user_a' ? 'A' : 'B'}
                </Text>
              </View>
              <View>
                <Text className="text-base font-bold text-slate-800">
                  {currentUser.name}
                </Text>
                <Text className="text-xs text-slate-500">{currentUser.title}</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleSwitchIdentity}
              className="px-3 py-2 bg-slate-100 rounded-xl border border-slate-200 active:bg-slate-200"
            >
              <Text className="text-xs font-bold text-slate-700">一键换为TA</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Storage & Sync Status */}
        <View className="bg-white rounded-2xl p-5 mb-4 border border-slate-200 shadow-sm">
          <View className="flex-row items-center mb-3">
            <Database size={18} color="#2563eb" />
            <Text className="text-base font-bold text-slate-800 ml-2">
              本地 MMKV 离线数据库
            </Text>
          </View>
          <View className="bg-slate-50 rounded-xl p-3">
            <View className="flex-row justify-between mb-1.5">
              <Text className="text-xs text-slate-500">已缓存待办事项</Text>
              <Text className="text-xs font-bold text-slate-700">{todos.length} 条</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-xs text-slate-500">待上报同步项</Text>
              <Text className="text-xs font-bold text-amber-600">
                {todos.filter((t) => t.syncStatus === 'pending').length} 条
              </Text>
            </View>
          </View>
        </View>

        {/* Account Exit */}
        <TouchableOpacity
          onPress={logout}
          className="flex-row items-center justify-center bg-white border border-red-200 rounded-2xl p-4 active:bg-red-50"
        >
          <LogOut size={18} color="#ef4444" />
          <Text className="text-red-600 font-bold text-sm ml-2">
            退出到身份选择
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};
