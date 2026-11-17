/**
 * 登录页 — 账号 + 密码
 *
 * 身份不由用户选择：登录请求成功后，authStore 根据后端返回的 user.username
 * 判定当前身份，RootNavigator 自动切到主界面。
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../../store/authStore';

export const LoginScreen: React.FC = () => {
  const loginWithBackend = useAuthStore((state) => state.loginWithBackend);

  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = account.trim().length > 0 && password.length > 0 && !loading;

  const handleLogin = async () => {
    if (!account.trim() || !password) {
      setError('请输入账号和密码');
      return;
    }

    setError(null);
    setLoading(true);
    const result = await loginWithBackend(account.trim(), password);
    setLoading(false);

    if (!result.success) {
      setError(result.error.message);
    }
    // 成功后 isLoggedIn 变 true，RootNavigator 自动切到 MainTabs
  };

  return (
    <SafeAreaView className="flex-1 bg-paper">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="px-6"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 w-full self-center" style={{ maxWidth: 420 }}>
            {/* 品牌与标题 */}
            <View className="pt-10">
              <View className="w-11 h-11 rounded-[14px] border border-line bg-surface items-center justify-center flex-row">
                <View className="w-2 h-2 rounded-full bg-ida mr-1" />
                <View className="w-2 h-2 rounded-full bg-idb" />
              </View>
              <Text className="text-[11px] text-muted tracking-[2px] mt-4">
                ICTL · 两个人的空间
              </Text>
              <Text className="text-[32px] text-ink font-serif mt-1.5">
                欢迎回来
              </Text>
              <Text className="text-[13px] text-muted mt-2">
                登录后进入你们的共享空间。
              </Text>
            </View>

            {/* 登录表单 */}
            <View className="mt-9">
              <Text className="text-[11px] text-muted tracking-[1px] mb-2">
                账号
              </Text>
              <TextInput
                value={account}
                onChangeText={(text) => {
                  setAccount(text);
                  if (error) setError(null);
                }}
                placeholder="请输入账号"
                placeholderTextColor="#B3ACA0"
                autoCapitalize="none"
                autoCorrect={false}
                className="h-12 bg-surface border border-line rounded-xl px-3.5 text-[14px] text-ink"
              />

              <Text className="text-[11px] text-muted tracking-[1px] mb-2 mt-5">
                密码
              </Text>
              <View className="h-12 bg-surface border border-line rounded-xl px-3.5 flex-row items-center">
                <TextInput
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (error) setError(null);
                  }}
                  placeholder="请输入密码"
                  placeholderTextColor="#B3ACA0"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onSubmitEditing={handleLogin}
                  className="flex-1 text-[14px] text-ink"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((prev) => !prev)}
                  className="pl-3 py-1"
                >
                  <Text className="text-[11px] text-muted">
                    {showPassword ? '隐藏' : '显示'}
                  </Text>
                </TouchableOpacity>
              </View>

              {error ? (
                <Text className="text-[12px] text-idb mt-3">{error}</Text>
              ) : null}

              <TouchableOpacity
                onPress={handleLogin}
                disabled={!canSubmit}
                className={`h-12 rounded-xl mt-7 items-center justify-center ${
                  canSubmit ? 'bg-clay active:opacity-90' : 'bg-clay/40'
                }`}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-white text-[14px] tracking-[1px]">
                    登录
                  </Text>
                )}
              </TouchableOpacity>

              <Text className="text-[11px] text-[#A9A296] leading-relaxed mt-4">
                账号由部署时预设，只有你们两个人可以登录。
                {'\n'}
                忘记密码需要联系部署者重置，暂未提供自助找回。
              </Text>
            </View>

            <View className="flex-1" />
            <Text className="text-[10.5px] text-[#B3ACA0] tracking-[1px] pb-7">
              ICTL · v0.1.0
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
