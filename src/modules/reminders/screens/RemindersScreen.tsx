/**
 * Phase 5 — 精准提醒与倒数日
 *
 * 设计对齐（docs/ui/proposal/ui-proposal.html）：
 *   - 安静面板承载纪念日倒计时（宋体大数字，不用渐变）
 *   - 两个轻量创建入口：给自己设 / 给 Partner 设
 *   - 即将到来改为「日期 + 标题 + 身份点」连续行
 *   - 原生闹钟测试移出主界面（见「我的 › 开发工具」）
 */

import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Modal, Pressable, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlarmClock } from 'lucide-react-native';
import { useReminderStore } from '../store/reminderStore';
import { FIXED_USERS, type FixedUserId } from '../../../config/users';
import { useAuthStore } from '../../../store/authStore';

function formatTrigger(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日 ${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes()
  ).padStart(2, '0')}`;
}

export const RemindersScreen: React.FC = () => {
  const reminders = useReminderStore((state) => state.reminders);
  const addReminder = useReminderStore((state) => state.addReminder);
  const deleteReminder = useReminderStore((state) => state.deleteReminder);
  const myId = useAuthStore((state) => state.currentUserId) ?? 'user_a';
  const partnerId = myId === 'user_a' ? 'user_b' : 'user_a';

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalTarget, setModalTarget] = useState<FixedUserId>(myId);
  const [modalDateTime, setModalDateTime] = useState('');
  const [modalTitle, setModalTitle] = useState('');

  /** 过滤未来 + pending 的提醒，按 triggerAt 升序（最近的在最上面） */
  const upcomingReminders = useMemo(() => {
    return reminders
      .filter((r) => r.status !== 'sent' && r.status !== 'cancelled')
      .sort((a, b) => new Date(a.triggerAt).getTime() - new Date(b.triggerAt).getTime());
  }, [reminders]);

  const openCreateModal = (targetUser: FixedUserId) => {
    setModalTarget(targetUser);
    setModalTitle('');
    // 默认: 5 分钟后（本地时间，避免 toISOString 的 UTC 偏移）
    const in5min = new Date(Date.now() + 5 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    setModalDateTime(
      `${in5min.getFullYear()}-${pad(in5min.getMonth() + 1)}-${pad(in5min.getDate())}T${pad(
        in5min.getHours()
      )}:${pad(in5min.getMinutes())}`
    );
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
      title:
        modalTitle.trim() ||
        (modalTarget === myId ? '我的专属提醒' : 'Partner 的专属提醒'),
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

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top']}>
      <View className="px-[22px] flex-1">
        {/* 页头 */}
        <View className="pt-2">
          <Text className="text-[11px] text-muted tracking-[1px]">不错过两个人的小事</Text>
          <View className="flex-row items-end justify-between mt-1">
            <Text
              className="text-[30px] text-ink leading-[34px]"
              style={{ fontFamily: 'serif', fontWeight: '600' }}
            >
              提醒
            </Text>
            <TouchableOpacity onPress={() => openCreateModal(myId)} className="pb-1">
              <Text className="text-[12px] text-clay">+ 新建</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          className="flex-1 mt-[18px]"
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {/* 纪念日面板 */}
          <View className="border border-line bg-[#FBFAF6] rounded-2xl px-5 py-5 mb-[22px]">
            <Text className="text-[11px] text-muted tracking-[1.5px]">在一起</Text>
            <View className="flex-row items-baseline mt-2">
              <Text
                className="text-[56px] text-ink leading-[56px] tracking-[-1px]"
                style={{ fontFamily: 'serif' }}
              >
                520
              </Text>
              <Text className="text-[13px] text-muted ml-2">天</Text>
            </View>
            <Text className="text-[11.5px] text-muted mt-3 pt-3 border-t border-line">
              距离下一个整百天 · 80 天
            </Text>
          </View>

          {/* 两个创建入口 */}
          <View className="flex-row mb-6">
            <TouchableOpacity
              onPress={() => openCreateModal(myId)}
              className="flex-1 mr-[5px] flex-row items-center justify-center border border-line bg-surface rounded-xl py-[11px]"
            >
              <View className="w-1.5 h-1.5 rounded-full bg-ida mr-1.5" />
              <Text className="text-[12.5px] text-ink-2">给自己设</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => openCreateModal(partnerId)}
              className="flex-1 ml-[5px] flex-row items-center justify-center border border-line bg-surface rounded-xl py-[11px]"
            >
              <View className="w-1.5 h-1.5 rounded-full bg-idb mr-1.5" />
              <Text className="text-[12.5px] text-ink-2">给 Partner 设</Text>
            </TouchableOpacity>
          </View>

          {/* 即将到来 */}
          <View className="flex-row items-baseline justify-between mb-1.5">
            <Text className="text-[13px] font-semibold text-ink">即将到来</Text>
            <Text className="text-[11px] text-muted">{upcomingReminders.length}</Text>
          </View>

          {upcomingReminders.length === 0 ? (
            <Text className="text-[12.5px] text-muted py-[18px] border-b border-line">
              还没有提醒。新建第一条，让它替你们记住。
            </Text>
          ) : (
            upcomingReminders.map((r, index) => {
              const targetUser = FIXED_USERS[r.targetUserId];
              const isMine = r.targetUserId === myId;
              return (
                <View
                  key={r.id}
                  className={`flex-row items-center py-[15px] ${
                    index === upcomingReminders.length - 1 ? '' : 'border-b border-line'
                  }`}
                >
                  <View className="flex-1 min-w-0">
                    <Text className="text-[14.5px] text-ink leading-[21px]">
                      {r.title || '专属提醒'}
                    </Text>
                    <View className="flex-row items-center mt-[5px]">
                      <View
                        className="w-1.5 h-1.5 rounded-full mr-1.5"
                        style={{ backgroundColor: targetUser.badgeColor }}
                      />
                      <Text className="text-[11px] text-muted">
                        {isMine ? '给自己' : '给 Partner'} · {formatTrigger(r.triggerAt)}
                      </Text>
                      {r.localAlarmScheduled ? (
                        <AlarmClock size={11} color="#A9A296" className="ml-1.5" />
                      ) : null}
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteReminder(r.id)} className="ml-2 py-1 px-1">
                    <Text className="text-[11px] text-[#A9A296]">取消</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}

          <Text className="text-[11px] text-[#A9A296] mt-4">
            开发工具与原生闹钟测试已移至「我的 › 开发工具」
          </Text>
        </ScrollView>
      </View>

      {/* 创建提醒 */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <Pressable className="flex-1 bg-black/40 justify-end" onPress={() => setShowCreateModal(false)}>
          <Pressable className="bg-surface rounded-t-3xl px-5 pt-5 pb-6" onPress={() => {}}>
            <Text className="text-lg font-semibold text-ink mb-4">创建提醒</Text>

            <View className="flex-row mb-4">
              <TouchableOpacity
                onPress={() => setModalTarget(myId)}
                className={`flex-1 py-2.5 rounded-xl mr-[5px] border ${
                  modalTarget === myId ? 'bg-clay-soft border-clay' : 'border-line'
                }`}
              >
                <Text
                  className="text-center text-[13px]"
                  style={{ color: modalTarget === myId ? '#A95D44' : '#857E73' }}
                >
                  提醒我自己
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setModalTarget(partnerId)}
                className={`flex-1 py-2.5 rounded-xl ml-[5px] border ${
                  modalTarget === partnerId ? 'bg-clay-soft border-clay' : 'border-line'
                }`}
              >
                <Text
                  className="text-center text-[13px]"
                  style={{ color: modalTarget === partnerId ? '#A95D44' : '#857E73' }}
                >
                  提醒 Partner
                </Text>
              </TouchableOpacity>
            </View>

            <Text className="text-[11px] text-muted mb-1.5">提醒标题（可选）</Text>
            <TextInput
              value={modalTitle}
              onChangeText={setModalTitle}
              placeholder="例如: 下班路上买牛奶"
              placeholderTextColor="#A9A296"
              className="border border-line rounded-xl px-3 py-2.5 text-[14px] text-ink mb-3"
            />

            <Text className="text-[11px] text-muted mb-1.5">触发时间 (YYYY-MM-DDTHH:mm)</Text>
            <TextInput
              value={modalDateTime}
              onChangeText={setModalDateTime}
              placeholder="2025-12-31T18:00"
              placeholderTextColor="#A9A296"
              className="border border-line rounded-xl px-3 py-2.5 text-[14px] text-ink mb-4"
            />

            <TouchableOpacity onPress={handleCreateReminder} className="bg-clay rounded-xl py-3">
              <Text className="text-white text-[15px] text-center">创建提醒</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowCreateModal(false)} className="py-3">
              <Text className="text-muted text-[13px] text-center">取消</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};
