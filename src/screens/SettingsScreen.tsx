import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { useTodoStore } from '../modules/todos/store/todoStore';
import { FIXED_USERS } from '../config/users';
import { alarmBridge } from '../native-bridge/alarmBridge';

export const SettingsScreen: React.FC = () => {
  const { currentUserId, partnerOnline, logout } = useAuthStore();
  const todos = useTodoStore((state) => state.todos);

  const myId = currentUserId ?? 'user_a';
  const partnerUser = FIXED_USERS[myId === 'user_a' ? 'user_b' : 'user_a'];
  const pendingCount = todos.filter((t) => t.syncStatus === 'pending').length;

  const triggerTestAlarm = async () => {
    const in5Seconds = Date.now() + 5000;
    const success = await alarmBridge.scheduleExactAlarm({
      alarmId: 'test-alarm-1',
      triggerTimestamp: in5Seconds,
      title: '双人专属强提醒',
      message: '该准备出门啦！',
      isFullScreenWakeup: true,
    });

    if (success) {
      Alert.alert('闹钟已设定', '已向 Android AlarmManager 注册 5 秒后的精准全屏强提醒。');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top']}>
      <View className="px-[22px] flex-1">
        {/* 页头 */}
        <View className="pt-2">
          <Text className="text-[11px] text-muted tracking-[1px]">两个人的空间</Text>
          <View className="flex-row items-end justify-between mt-1">
            <Text
              className="text-[30px] text-ink leading-[34px]"
              style={{ fontFamily: 'serif', fontWeight: '600' }}
            >
              我的
            </Text>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {/* 当前身份（只读） */}
          <View className="flex-row items-center pt-1 pb-4 mt-4 border-b border-line mb-1.5">
            <View
              className={`w-[42px] h-[42px] rounded-full items-center justify-center ${
                myId === 'user_a' ? 'bg-ida-soft' : 'bg-idb-soft'
              }`}
            >
              <Text className={`text-[14px] ${myId === 'user_a' ? 'text-ida' : 'text-idb'}`}>
                {myId === 'user_a' ? 'A' : 'B'}
              </Text>
            </View>
            <View className="ml-3">
              <Text className="text-[14px] font-semibold text-ink">
                我 · User {myId === 'user_a' ? 'A' : 'B'}
              </Text>
              <Text className="text-[11px] text-muted mt-0.5">
                登录后自动识别 · 空间主成员
              </Text>
            </View>
          </View>

          {/* 账号 */}
          <View className="mt-5 mb-[22px]">
            <Text className="text-[10.5px] tracking-[1.2px] text-muted mb-2">账号</Text>
            <View className="flex-row items-center justify-between py-[13px] border-b border-line">
              <Text className="text-[13.5px] text-ink">账号</Text>
              <Text className="text-[12px] text-muted">{myId}</Text>
            </View>
            <View className="flex-row items-center justify-between py-[13px] border-b border-line">
              <Text className="text-[13.5px] text-ink">Partner</Text>
              <View className="flex-row items-center">
                <View className="w-1.5 h-1.5 rounded-full bg-idb mr-1.5" />
                <Text className="text-[12px] text-muted">
                  User {partnerUser.id === 'user_b' ? 'B' : 'A'}
                </Text>
              </View>
            </View>
          </View>

          {/* 同步 */}
          <View className="mb-[22px]">
            <Text className="text-[10.5px] tracking-[1.2px] text-muted mb-2">同步</Text>
            <View className="flex-row items-center justify-between py-[13px] border-b border-line">
              <Text className="text-[13.5px] text-ink">Partner 状态</Text>
              <View className="flex-row items-center">
                <View
                  className="w-1.5 h-1.5 rounded-full mr-1.5"
                  style={{ backgroundColor: partnerOnline ? '#527A63' : '#C9C2B5' }}
                />
                <Text className="text-[12px] text-muted">{partnerOnline ? '在线' : '离线'}</Text>
              </View>
            </View>
            <View className="flex-row items-center justify-between py-[13px] border-b border-line">
              <Text className="text-[13.5px] text-ink">本地缓存</Text>
              <Text className="text-[12px] text-muted">{todos.length} 条待办</Text>
            </View>
            <View className="flex-row items-center justify-between py-[13px] border-b border-line">
              <Text className="text-[13.5px] text-ink">待同步</Text>
              <Text className="text-[12px] text-warn">{pendingCount} 条</Text>
            </View>
          </View>

          {/* 开发工具 */}
          <View className="mb-[22px]">
            <Text className="text-[10.5px] tracking-[1.2px] text-muted mb-2">开发工具</Text>
            <TouchableOpacity
              onPress={triggerTestAlarm}
              className="flex-row items-center justify-between py-[13px] border-b border-line"
            >
              <Text className="text-[13.5px] text-ink">测试 5 秒原生唤醒</Text>
              <Text className="text-[12px] text-muted">›</Text>
            </TouchableOpacity>
          </View>

          {/* 退出登录 */}
          <TouchableOpacity onPress={logout} className="py-[13px]">
            <Text className="text-[13.5px] text-clay">退出登录</Text>
          </TouchableOpacity>

          <Text className="text-[10.5px] text-[#B3ACA0] mt-1">
            账号由预设分配，暂不支持自助注册与找回密码。
          </Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};
