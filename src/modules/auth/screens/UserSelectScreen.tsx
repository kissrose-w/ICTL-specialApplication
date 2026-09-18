import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, ArrowRight, ShieldCheck } from 'lucide-react-native';
import { FIXED_USERS, FixedUserId } from '../../../config/users';
import { useAuthStore } from '../../../store/authStore';

export const UserSelectScreen: React.FC = () => {
  const loginAs = useAuthStore((state) => state.loginAs);

  const handleSelect = (userId: FixedUserId) => {
    loginAs(userId);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-900 justify-between p-6">
      {/* Top Header */}
      <View className="items-center mt-12">
        <View className="w-16 h-16 bg-blue-600/20 border border-blue-500/40 rounded-3xl items-center justify-center mb-4">
          <Users size={32} color="#60a5fa" />
        </View>
        <Text className="text-2xl font-black text-white tracking-tight">
          专属双人空间
        </Text>
        <Text className="text-xs text-slate-400 mt-2 text-center max-w-xs">
          私密预置双人系统 · 绝无繁琐配对流程 · 选择身份即刻进入
        </Text>
      </View>

      {/* 2 User Selection Cards */}
      <View className="space-y-4 my-auto">
        {(Object.keys(FIXED_USERS) as FixedUserId[]).map((userId) => {
          const user = FIXED_USERS[userId];
          const isUserA = userId === 'user_a';

          return (
            <TouchableOpacity
              key={userId}
              onPress={() => handleSelect(userId)}
              className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 flex-row items-center justify-between active:bg-slate-700"
            >
              <View className="flex-row items-center">
                <View
                  className={`w-12 h-12 rounded-2xl items-center justify-center mr-4 ${
                    isUserA ? 'bg-blue-600' : 'bg-rose-600'
                  }`}
                >
                  <Text className="text-white font-bold text-lg">
                    {isUserA ? 'A' : 'B'}
                  </Text>
                </View>
                <View>
                  <Text className="text-white font-bold text-base">
                    {user.name}
                  </Text>
                  <Text className="text-xs text-slate-400 mt-0.5">
                    {user.title} · 点击进入
                  </Text>
                </View>
              </View>
              <ArrowRight size={20} color="#94a3b8" />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Footer Disclaimer */}
      <View className="flex-row items-center justify-center space-x-1 mb-4">
        <ShieldCheck size={14} color="#64748b" />
        <Text className="text-xs text-slate-500 ml-1">
          端到端本地 MMKV 高速存储
        </Text>
      </View>
    </SafeAreaView>
  );
};
