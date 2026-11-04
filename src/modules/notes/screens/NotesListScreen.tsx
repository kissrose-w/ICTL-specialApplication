/**
 * Phase 4 — 私密便签列表
 * 
 * 置顶优先 + 更新时间倒序（noteStore.sortForDisplay 已处理）
 * 点击卡片 → NoteEditScreen
 * "+" → 新建便签
 */

import React from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Pin, FileText } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNoteStore } from '../store/noteStore';
import { FIXED_USERS } from '../../../config/users';
import type { SpaceStackParamList } from '../../../types/navigation';

type Props = NativeStackScreenProps<SpaceStackParamList, 'NotesList'>;

export const NotesListScreen: React.FC<Props> = ({ navigation }) => {
  const notes = useNoteStore((state) => state.notes);

  return (
    <SafeAreaView className="flex-1 bg-slate-100">
      {/* Header */}
      <View className="px-5 pt-3 pb-4 bg-white border-b border-slate-200 flex-row items-center justify-between">
        <View>
          <Text className="text-xl font-black text-slate-800 tracking-tight">
            私密便签
          </Text>
          <Text className="text-xs text-slate-500 mt-0.5">
            两人共享 · 置顶优先 · 实时同步
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('NoteEdit', { noteId: undefined })}
          className="w-9 h-9 bg-amber-500 rounded-xl items-center justify-center active:bg-amber-600"
        >
          <Plus size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Note List */}
      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => {
          const author = FIXED_USERS[item.authorId];
          return (
            <TouchableOpacity
              onPress={() => navigation.navigate('NoteEdit', { noteId: item.id })}
              className={`p-4 mb-3 rounded-2xl border bg-white shadow-sm ${
                item.isPinned ? 'border-amber-300' : 'border-slate-200'
              }`}
            >
              {/* Top row: title + pin */}
              <View className="flex-row items-start justify-between mb-2">
                <Text
                  className={`flex-1 text-base font-semibold text-slate-800 mr-2 ${
                    !item.title ? 'text-slate-400 italic' : ''
                  }`}
                  numberOfLines={1}
                >
                  {item.title.trim() || '无标题便签'}
                </Text>
                {item.isPinned && (
                  <Pin size={14} color="#f59e0b" fill="#f59e0b" />
                )}
              </View>

              {/* Content preview */}
              <Text className="text-sm text-slate-500 leading-relaxed" numberOfLines={3}>
                {item.content}
              </Text>

              {/* Footer */}
              <View className="flex-row items-center justify-between mt-3 pt-2 border-t border-slate-100">
                <View className="flex-row items-center">
                  <View
                    className="w-4 h-4 rounded items-center justify-center mr-1.5"
                    style={{ backgroundColor: author.badgeColor }}
                  >
                    <Text className="text-[9px] font-bold text-white">
                      {author.id === 'user_a' ? 'A' : 'B'}
                    </Text>
                  </View>
                  <Text className="text-xs text-slate-400">{author.name} · 共享</Text>
                </View>
                <Text className="text-[10px] text-slate-400">
                  {new Date(item.updatedAt).toLocaleDateString()}
                </Text>
              </View>

              {/* Pending badge */}
              {item.syncStatus === 'pending' && (
                <View className="absolute top-2 right-2">
                  <Text className="text-[9px] text-amber-600 font-bold">同步中</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View className="items-center justify-center py-16">
            <FileText size={40} color="#cbd5e1" />
            <Text className="text-slate-400 text-sm mt-3">还没有便签，点右上角 + 创建</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};
