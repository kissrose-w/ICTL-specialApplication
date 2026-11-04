/**
 * Phase 5 — 精准提醒与倒数日
 * 
 * 改造自原来的"原生闹钟测试页"：
 *   - 顶部纪念日倒计时卡片（保留）
 *   - 中间提醒列表（新增）
 *   - 创建提醒入口（新增）
 *   - 原生 AlarmManager 精准唤醒（自动联动 reminderStore）
 */

import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Modal, Pressable, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlarmClock, Calendar, Zap, BellRing, Plus, Trash2, Clock, User } from 'lucide-react-native';
import { useReminderStore } from '../store/reminderStore';
import { FIXED_USERS, type FixedUserId } from '../../../config/users';
import { useAuthStore } from '../../../store/authStore';
import { alarmBridge } from '../../../native-bridge/alarmBridge';

export const RemindersScreen: React.FC = () => {
  const reminders = useReminderStore((state) => state.reminders);
  const addReminder = useReminderStore((state) => state.addReminder);
  const deleteReminder = useReminderStore((state) => state.deleteReminder);
  const myId = useAuthStore((state) => state.currentUserId) ?? 'user_a';
  const partnerId = myId === 'user_a' ? 'user_b' : 'user_a';
  const partnerUser = FIXED_USERS[partnerId];

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalTarget, setModalTarget] = useState<FixedUserId>(myId); // 给自己 or 给伴侣
  const [modalDateTime, setModalDateTime] = useState('');
  const [modalTitle, setModalTitle] = useState('');

  /** 过滤未来 + pending 的提醒，按 triggerAt 升序（最近的在最上面） */
  const upcomingReminders = useMemo(() => {
    return reminders
      .filter((r) => r.status !== 'sent' && r.status !== 'cancelled')
      .sort((a, b) => new Date(a.triggerAt).getTime() - new Date(b.triggerAt).getTime());
  }, [reminders]);

  /** 已经过去但还没被 cron 标记 sent 的 */
  const pastReminders = useMemo(() => {
    return reminders.filter((r) => new Date(r.triggerAt).getTime() < Date.now() && r.status === 'pending');
  }, [reminders]);

  const openCreateModal = (targetUser: FixedUserId) => {
    setModalTarget(targetUser);
    setModalTitle('');
    // 默认: 5 分钟后
    const in5min = new Date(Date.now() + 5 * 60 * 1000);
    setModalDateTime(in5min.toISOString().slice(0, 16)); // YYYY-MM-DDTHH:mm
    setShowCreateModal(true);
  };

  const handleCreateReminder = () => {
    if (!modalDateTime) {
      Alert.alert('提示', '请选择触发时间');
      return;
    }
    const triggerAt = new Date(modalDateTime).toISOString();
    if (new Date(triggerAt).getTime() <= Date.now()) {
      Alert.alert('提示', '触发时间必须在未来');
      return;
    }

    addReminder({
      targetUserFixed: modalTarget,
      triggerAt,
      title: modalTitle.trim() || (modalTarget === myId ? '我的专属提醒' : `${FIXED_USERS[modalTarget].name}的专属提醒`),
    });
    setShowCreateModal(false);
  };

  const handleDeleteReminder = (id: string) => {
    Alert.alert('取消提醒', '确定取消这条提醒吗？', [
      { text: '保留', style: 'cancel' },
      {
        text: '取消提醒',
        style: 'destructive',
        onPress: () => deleteReminder(id),
      },
    ]);
  };

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
      {/* Header */}
      <View className="px-5 pt-3 pb-4 bg-white border-b border-slate-200">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-xl font-black text-slate-800 tracking-tight">精准提醒</Text>
            <Text className="text-xs text-slate-500 mt-0.5">Android AlarmManager 精准唤醒 · 桌面倒数</Text>
          </View>
          <TouchableOpacity
            onPress={() => openCreateModal(myId)}
            className="flex-row items-center bg-amber-500 rounded-xl px-3 py-2 active:bg-amber-600"
          >
            <Plus size={16} color="#ffffff" />
            <Text className="text-white text-sm font-bold ml-1">创建</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Anniversary Countdown Cards —— 暂时固定 mock 数据 */}
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

        {/* Create quick-entry: 给自己 / 给TA */}
        <View className="flex-row justify-between mb-4">
          <TouchableOpacity
            onPress={() => openCreateModal(myId)}
            className="flex-1 mr-2 bg-white rounded-xl py-3 px-4 border border-slate-200 flex-row items-center active:bg-slate-50"
          >
            <BellRing size={16} color="#2563eb" />
            <Text className="text-slate-700 text-sm font-bold ml-2">给自己设</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => openCreateModal(partnerId)}
            className="flex-1 ml-2 bg-white rounded-xl py-3 px-4 border border-slate-200 flex-row items-center active:bg-slate-50"
          >
            <User size={16} color="#ec4899" />
            <Text className="text-slate-700 text-sm font-bold ml-2">给{partnerUser.name}设</Text>
          </TouchableOpacity>
        </View>

        {/* Reminder List */}
        <Text className="text-sm font-bold text-slate-600 mb-2">
          即将到来 ({upcomingReminders.length})
        </Text>

        {upcomingReminders.length === 0 ? (
          <View className="bg-white rounded-xl p-6 border border-slate-200 items-center mb-4">
            <Clock size={32} color="#cbd5e1" />
            <Text className="text-slate-400 text-sm mt-3">还没有待触发的提醒</Text>
            <Text className="text-slate-300 text-xs mt-1">点右上角 + 创建你的第一条</Text>
          </View>
        ) : (
          upcomingReminders.map((r) => {
            const targetUser = FIXED_USERS[r.targetUserId];
            const minutesLeft = Math.round((new Date(r.triggerAt).getTime() - Date.now()) / 60000);
            return (
              <View
                key={r.id}
                className="bg-white rounded-xl p-4 border border-slate-200 mb-3 flex-row items-center justify-between"
              >
                <View className="flex-1">
                  <Text className="text-base font-bold text-slate-800">{r.title || '专属提醒'}</Text>
                  <View className="flex-row items-center mt-1">
                    <View
                      className="w-3 h-3 rounded mr-1.5"
                      style={{ backgroundColor: targetUser.badgeColor }}
                    />
                    <Text className="text-xs text-slate-500">
                      给 {targetUser.name} · {new Date(r.triggerAt).toLocaleString()}
                    </Text>
                  </View>
                  <Text className="text-xs text-amber-600 mt-0.5">
                    {minutesLeft >= 60
                      ? `${Math.round(minutesLeft / 60)}小时${minutesLeft % 60}分后`
                      : minutesLeft > 0
                      ? `${minutesLeft}分钟后`
                      : '即将到期'}
                  </Text>
                </View>

                <View className="flex-row items-center">
                  {r.localAlarmScheduled && (
                    <AlarmClock size={14} color="#10b981" className="mr-2" />
                  )}
                  <TouchableOpacity
                    onPress={() => handleDeleteReminder(r.id)}
                    className="w-8 h-8 items-center justify-center"
                  >
                    <Trash2 size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        {/* Test Card —— 开发期保留，验证原生 AlarmManager 链路 */}
        <View className="bg-white rounded-2xl p-5 mt-4 border border-slate-200 shadow-sm">
          <View className="flex-row items-center mb-2">
            <Zap size={18} color="#f59e0b" />
            <Text className="text-base font-bold text-slate-800 ml-2">开发调试</Text>
          </View>
          <Text className="text-xs text-slate-500 mb-3 leading-relaxed">
            验证 Android AlarmManager 原生精准唤醒是否正常（设一个 5 秒后的全屏闹钟）。
          </Text>
          <TouchableOpacity
            onPress={triggerTestAlarm}
            className="flex-row items-center justify-center bg-amber-50 rounded-xl py-3 border border-amber-200"
          >
            <BellRing size={14} color="#f59e0b" />
            <Text className="text-amber-700 font-bold text-sm ml-2">测试 5 秒原生唤醒</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Create Reminder Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <Pressable
          className="flex-1 bg-black/40 justify-end"
          onPress={() => setShowCreateModal(false)}
        >
          <Pressable className="bg-white rounded-t-3xl p-5" onPress={() => {}}>
            <Text className="text-lg font-black text-slate-800 mb-4">创建专属提醒</Text>

            {/* Target user selector */}
            <View className="flex-row mb-4">
              <TouchableOpacity
                onPress={() => setModalTarget(myId)}
                className={`flex-1 py-2.5 rounded-xl mr-2 border ${
                  modalTarget === myId ? 'bg-blue-50 border-blue-500' : 'border-slate-200'
                }`}
              >
                <Text className="text-center font-bold text-sm" style={{ color: modalTarget === myId ? '#2563eb' : '#64748b' }}>
                  提醒我自己
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setModalTarget(partnerId)}
                className={`flex-1 py-2.5 rounded-xl border ${
                  modalTarget === partnerId ? 'bg-pink-50 border-pink-500' : 'border-slate-200'
                }`}
              >
                <Text className="text-center font-bold text-sm" style={{ color: modalTarget === partnerId ? '#ec4899' : '#64748b' }}>
                  提醒{partnerUser.name}
                </Text>
              </TouchableOpacity>
            </View>

            <Text className="text-slate-600 text-xs mb-1.5">提醒标题（可选）</Text>
            <TextInput
              value={modalTitle}
              onChangeText={setModalTitle}
              placeholder="例如: 下班路上买牛奶"
              placeholderTextColor="#94a3b8"
              className="border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 mb-3"
            />

            <Text className="text-slate-600 text-xs mb-1.5">触发时间 (YYYY-MM-DDTHH:mm)</Text>
            <TextInput
              value={modalDateTime}
              onChangeText={setModalDateTime}
              placeholder="2025-12-31T18:00"
              placeholderTextColor="#94a3b8"
              className="border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 mb-4"
            />

            <TouchableOpacity
              onPress={handleCreateReminder}
              className="bg-amber-500 rounded-xl py-3 active:bg-amber-600"
            >
              <Text className="text-white font-bold text-base text-center">创建提醒</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowCreateModal(false)}
              className="py-3 active:bg-slate-50"
            >
              <Text className="text-slate-500 text-sm text-center">取消</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};
