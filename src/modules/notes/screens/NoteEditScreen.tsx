/**
 * Phase 4 — 便签编辑页
 *
 * 新建 (noteId undefined) vs 编辑 (noteId 有值)
 * 乐观更新 + async REST — 复用 noteStore.addNote / updateNoteLocal
 *
 * 设计对齐（docs/ui/proposal/ui-proposal.html）：
 *   - 头部：返回 → 标题 → 置顶 / 删除 / 保存
 *   - 标题 22px 宋体，正文 14px 行高 1.95
 *   - 底部常驻脏态与字数
 */

import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNoteStore } from '../store/noteStore';
import type { SpaceStackParamList } from '../../../types/navigation';

type Props = NativeStackScreenProps<SpaceStackParamList, 'NoteEdit'>;

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export const NoteEditScreen: React.FC<Props> = ({ navigation, route }) => {
  const { noteId } = route.params;
  const isEditing = !!noteId;

  const notes = useNoteStore((state) => state.notes);
  const addNote = useNoteStore((state) => state.addNote);
  const updateNoteLocal = useNoteStore((state) => state.updateNoteLocal);
  const deleteNote = useNoteStore((state) => state.deleteNote);
  const togglePin = useNoteStore((state) => state.togglePin);

  const existingNote = noteId ? notes.find((n) => n.id === noteId) : undefined;

  const [title, setTitle] = useState(existingNote?.title ?? '');
  const [content, setContent] = useState(existingNote?.content ?? '');
  const [isPinned, setIsPinned] = useState(existingNote?.isPinned ?? false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setIsDirty(
      title.trim() !== (existingNote?.title ?? '') ||
        content.trim() !== (existingNote?.content ?? '') ||
        isPinned !== (existingNote?.isPinned ?? false)
    );
  }, [title, content, isPinned, existingNote]);

  const hasInput = !!title.trim() || !!content.trim();
  const canSave = isEditing ? isDirty : hasInput;

  const handleSave = () => {
    if (!hasInput) {
      Alert.alert('提示', '便签标题或内容至少填写一项');
      return;
    }

    if (isEditing && noteId) {
      updateNoteLocal(noteId, {
        title: title.trim() || '无标题',
        content: content.trim(),
        isPinned,
      });
    } else {
      addNote({
        title: title.trim() || '无标题',
        content: content.trim(),
        isPinned,
      });
    }
    navigation.goBack();
  };

  const handleDelete = () => {
    if (!noteId) return;
    Alert.alert('删除便签', '确定要删除这条便签吗？Partner 也会同步删除。', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          deleteNote(noteId);
          navigation.goBack();
        },
      },
    ]);
  };

  const handleBack = () => {
    if (isDirty) {
      Alert.alert('未保存', '有更改未保存，确定离开？', [
        { text: '取消', style: 'cancel' },
        { text: '离开', style: 'destructive', onPress: () => navigation.goBack() },
      ]);
    } else {
      navigation.goBack();
    }
  };

  const handleTogglePin = () => {
    if (isEditing && noteId) {
      togglePin(noteId);
    }
    setIsPinned((prev) => !prev);
  };

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top']}>
      <View className="px-[22px] flex-1">
        {/* 头部操作 */}
        <View className="flex-row items-center justify-between py-3 border-b border-line">
          <TouchableOpacity onPress={handleBack} className="-ml-1 py-1 pr-2">
            <ChevronLeft size={22} color="#5C564C" strokeWidth={1.6} />
          </TouchableOpacity>

          <Text className="text-[12.5px] text-muted tracking-[0.5px]">
            {isEditing ? '编辑便签' : '新建便签'}
          </Text>

          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={handleTogglePin}
              className={`rounded-full px-2 py-[3px] border ${
                isPinned ? 'bg-clay-soft border-clay-border' : 'border-line'
              }`}
            >
              <Text className={`text-[11px] ${isPinned ? 'text-clay' : 'text-muted'}`}>
                {isPinned ? '已置顶' : '置顶'}
              </Text>
            </TouchableOpacity>

            {isEditing && noteId ? (
              <TouchableOpacity onPress={handleDelete} className="ml-3 py-1">
                <Text className="text-[11px] text-[#A9A296]">删除</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              onPress={handleSave}
              disabled={!canSave}
              className={`ml-3 rounded-lg px-[11px] py-[6px] ${canSave ? 'bg-clay' : 'bg-[#E4DFD5]'}`}
            >
              <Text className="text-[11px] text-white">保存</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 标题 */}
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="标题"
          placeholderTextColor="#B3ACA0"
          className="text-[22px] text-ink py-4 border-b border-line"
          style={{ fontFamily: 'serif', fontWeight: '600' }}
        />

        {/* 正文 */}
        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder={'开始写点什么…\n\n心愿单、购物清单、重要日期、给 Partner 的留言…'}
          placeholderTextColor="#B3ACA0"
          multiline
          textAlignVertical="top"
          className="flex-1 text-[14px] text-ink-2 py-4"
          style={{ lineHeight: 27 }}
        />

        {/* 底部状态 */}
        <View className="flex-row items-center justify-between pt-3 border-t border-line mb-3">
          <Text className={`text-[10.5px] ${isDirty ? 'text-warn' : 'text-[#A9A296]'}`}>
            {isDirty
              ? '已修改 · 未保存'
              : isEditing && existingNote
              ? `已保存 · ${formatTime(existingNote.updatedAt)}`
              : '尚未保存'}
          </Text>
          <Text className="text-[10.5px] text-[#A9A296]">{content.length} 字</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};
