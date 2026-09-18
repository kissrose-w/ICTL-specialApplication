import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlarmClock, Calendar, Zap, BellRing } from 'lucide-react-native';
import { alarmBridge } from '../../../native-bridge/alarmBridge';

export const RemindersScreen: React.FC = () => {
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
    <SafeAreaView className="flex-1 bg-slate-100">
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Header */}
        <View className="mb-5">
          <Text className="text-xl font-black text-slate-800">精准提醒与倒数日</Text>
          <Text className="text-xs text-slate-500 mt-1">
            Android AlarmManager 后台精准唤醒 · 桌面倒数
          </Text>
        </View>

        {/* Anniversary Countdown Cards */}
        <View className="bg-gradient-to-r from-rose-500 to-pink-500 rounded-2xl p-5 mb-5 shadow-sm">
          <View className="flex-row items-center justify-between">
            <Text className="text-white text-base font-bold">相识恋爱纪念日</Text>
            <Calendar size={18} color="#ffffff" />
          </View>
          <View className="flex-row items-baseline mt-4">
            <Text className="text-white text-4xl font-extrabold">520</Text>
            <Text className="text-rose-100 text-sm ml-2">天</Text>
          </View>
          <Text className="text-rose-100 text-xs mt-2">下一个整百天倒计时：80 天</Text>
        </View>

        {/* Native Alarm Bridge Test Card */}
        <View className="bg-white rounded-2xl p-5 mb-5 border border-slate-200 shadow-sm">
          <View className="flex-row items-center mb-2">
            <AlarmClock size={20} color="#2563eb" />
            <Text className="text-base font-bold text-slate-800 ml-2">
              Android 原生强提醒通道
            </Text>
          </View>
          <Text className="text-xs text-slate-500 mb-4 leading-relaxed">
            利用 Kotlin 原生模块接入系统 `AlarmManager.setExactAndAllowWhileIdle`，支持低功耗休眠模式下的精准闹铃与全屏唤醒。
          </Text>

          <TouchableOpacity
            onPress={triggerTestAlarm}
            className="flex-row items-center justify-center bg-blue-600 rounded-xl py-3 active:bg-blue-700"
          >
            <BellRing size={16} color="#ffffff" />
            <Text className="text-white font-bold text-sm ml-2">
              测试 5 秒后原生精准唤醒
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
