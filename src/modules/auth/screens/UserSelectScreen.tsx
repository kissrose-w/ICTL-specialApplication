/**
 * Phase 1 — UserSelectScreen (Modal + TextInput 版)
 * 
 * 修旧 Bug: Alert.alert 的 inputs 属性 Web 不支持
 * 换成 Modal 组件 + TextInput 做密码输入弹窗
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, ArrowRight, ShieldCheck } from 'lucide-react-native';
import { FIXED_USERS, FixedUserId } from '../../../config/users';
import { useAuthStore } from '../../../store/authStore';

export const UserSelectScreen: React.FC = () => {
  const loginWithBackend = useAuthStore((state) => state.loginWithBackend);
  const [loadingFor, setLoadingFor] = useState<FixedUserId | null>(null);
  const [activeUserId, setActiveUserId] = useState<FixedUserId | null>(null);
  const [password, setPassword] = useState('');

  const openPasswordModal = (userId: FixedUserId) => {
    setActiveUserId(userId);
    setPassword('');
  };

  const closeModal = () => {
    setActiveUserId(null);
    setPassword('');
  };

  const handleLogin = async () => {
    if (!activeUserId) return;
    if (!password.trim()) {
      Alert.alert('提示', '密码不能为空');
      return;
    }

    setLoadingFor(activeUserId);
    const result = await loginWithBackend(activeUserId, password.trim());
    setLoadingFor(null);
    closeModal();

    if (!result.success) {
      Alert.alert('登录失败', result.error.message, [{ text: '好的', style: 'cancel' }]);
    }
    // 成功时 authStore.isLoggedIn 变 true → RootNavigator 自动切到 MainTabs
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
          const isLoading = loadingFor === userId;
          const isDisabled = loadingFor !== null;

          return (
            <TouchableOpacity
              key={userId}
              onPress={() => !isDisabled && openPasswordModal(userId)}
              disabled={isDisabled}
              className={`bg-slate-800/90 border rounded-2xl p-5 flex-row items-center justify-between
                ${isUserA ? 'border-blue-500/40' : 'border-rose-500/40'}
                ${isDisabled ? 'opacity-50' : 'active:bg-slate-700'}
              `}
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
                    {user.title} · 点击验证密码
                  </Text>
                </View>
              </View>
              {isLoading ? (
                <ActivityIndicator size="small" color="#94a3b8" />
              ) : (
                <ArrowRight size={20} color="#94a3b8" />
              )}
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

      {/* Password Input Modal — Web + 双端通用 */}
      <Modal
        visible={!!activeUserId}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <Pressable
          className="flex-1 bg-black/60 items-center justify-center px-6"
          onPress={closeModal}
        >
          <Pressable className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm" onPress={() => {}}>
            <Text className="text-white text-lg font-bold mb-1">身份验证</Text>
            <Text className="text-slate-400 text-sm mb-4">
              {activeUserId ? `请输入 "${FIXED_USERS[activeUserId].name}" 的专属密码` : ''}
            </Text>

            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="专属密码"
              placeholderTextColor="#64748b"
              secureTextEntry
              autoFocus
              className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-base mb-5"
            />

            <View className="flex-row space-x-3">
              <TouchableOpacity
                onPress={closeModal}
                className="flex-1 bg-slate-700 rounded-xl py-3 active:bg-slate-600"
              >
                <Text className="text-slate-300 font-bold text-sm text-center">取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleLogin}
                disabled={!!loadingFor}
                className={`flex-1 rounded-xl py-3 active:opacity-80 ${
                  activeUserId === 'user_a' ? 'bg-blue-600' : 'bg-rose-600'
                } ${loadingFor ? 'opacity-50' : ''}`}
              >
                {loadingFor ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-white font-bold text-sm text-center">登录</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};
