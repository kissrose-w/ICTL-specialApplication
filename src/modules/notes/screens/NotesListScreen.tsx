/**
 * Phase 4 — 共享便签列表
 *
 * 设计对齐（docs/ui/proposal/ui-proposal.html）：
 *   - 标题区 + 右上「+ 新建」，与提醒页一致
 *   - 连续条目代替白卡；置顶 / 署名 / 日期保留
 */

import React from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FileText } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNoteStore } from '../store/noteStore';
import { useAuthStore } from '../../../store/authStore';
import { FIXED_USERS } from '../../../config/users';
import type { SpaceStackParamList } from '../../../types/navigation';

type Props = NativeStackScreenProps<SpaceStackParamList, 'NotesList'>;

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

export const NotesListScreen: React.FC<Props> = ({ navigation }) => {
  const notes = useNoteStore((state) => state.notes);
  const currentUserId = useAuthStore((state) => state.currentUserId) || 'user_a';

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top']}>
      <View className="px-[22px] flex-1">
        {/* 页头 */}
        <View className="pt-2">
          <Text className="text-[11px] text-muted tracking-[1px]">两个人一起记下的</Text>
          <View className="flex-row items-end justify-between mt-1">
            <Text
              className="text-[30px] text-ink leading-[34px]"
              style={{ fontFamily: 'serif', fontWeight: '600' }}
            >
              便签
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('NoteEdit', { noteId: undefined })}
              className="pb-1"
            >
              <Text className="text-[12px] text-clay">+ 新建</Text>
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          className="flex-1 mt-[6px]"
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => {
            const author = FIXED_USERS[item.authorId];
            const isMine = item.authorId === currentUserId;
            return (
              <TouchableOpacity
                onPress={() => navigation.navigate('NoteEdit', { noteId: item.id })}
                activeOpacity={0.7}
                className="py-4 border-b border-line"
              >
                <View className="flex-row items-center mb-[5px]">
                  <Text className="text-[15px] font-semibold text-ink mr-2" numberOfLines={1}>
                    {item.title.trim() || '无标题便签'}
                  </Text>
                  {item.isPinned ? (
                    <View className="rounded-full border border-clay-border bg-clay-soft px-[7px] py-[2px]">
                      <Text className="text-[9.5px] text-clay">置顶</Text>
                    </View>
                  ) : null}
                </View>

                <Text className="text-[12.5px] text-muted leading-[19px]" numberOfLines={2}>
                  {item.content}
                </Text>

                <View className="flex-row items-center justify-between mt-2.5">
                  <View className="flex-row items-center">
                    <View
                      className="w-1.5 h-1.5 rounded-full mr-1.5"
                      style={{ backgroundColor: author.badgeColor }}
                    />
                    <Text className="text-[10.5px] text-[#A9A296]">
                      {isMine ? '我' : 'Partner'} · 共享
                    </Text>
                    {item.syncStatus === 'pending' ? (
                      <Text className="text-[10.5px] text-warn ml-1.5">· 待同步</Text>
                    ) : null}
                  </View>
                  <Text className="text-[10.5px] text-[#A9A296]">{formatDate(item.updatedAt)}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center pb-16 pt-24">
              <View className="w-[52px] h-[52px] rounded-full border border-line bg-surface items-center justify-center mb-4">
                <FileText size={20} color="#B3ACA0" strokeWidth={1.4} />
              </View>
              <Text className="text-[15px] font-semibold text-ink mb-1.5">还没有便签</Text>
              <Text className="text-[12px] text-muted leading-[22px] text-center">
                想说的话、要买的东西，{'\n'}都可以写在这里，两个人一起看。
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
};
