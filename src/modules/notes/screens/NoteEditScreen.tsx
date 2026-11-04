/**
 * Phase 4 — 便签编辑页
 * 
 * 新建 (noteId undefined) vs 编辑 (noteId 有值)
 * 乐观更新 + async REST — 复用 noteStore.addNote / updateNoteLocal
 */

import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Save, Pin, Trash2 } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNoteStore } from '../store/noteStore';
import type { SpaceStackParamList } from '../../../types/navigation';

type Props = NativeStackScreenProps<SpaceStackParamList, 'NoteEdit'>;

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

  const handleSave = () => {
    if (!title.trim() && !content.trim()) {
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
    Alert.alert('删除便签', '确定要删除这条便签吗？伴侣也会同步删除。', [
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

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="px-4 py-3 border-b border-slate-200 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => (isDirty ? Alert.alert('未保存', '有更改未保存，确定离开？', [
            { text: '取消', style: 'cancel' },
            { text: '离开', style: 'destructive', onPress: () => navigation.goBack() },
          ]) : navigation.goBack())}
          className="w-9 h-9 items-center justify-center -ml-2"
        >
          <ArrowLeft size={22} color="#334155" />
        </TouchableOpacity>

        <Text className="text-base font-bold text-slate-800">
          {isEditing ? '编辑便签' : '新建便签'}
        </Text>

        <View className="flex-row items-center">
          {isEditing && noteId && (
            <TouchableOpacity
              onPress={handleDelete}
              className="w-9 h-9 items-center justify-center mr-1"
            >
              <Trash2 size={18} color="#ef4444" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => {
              if (isEditing && noteId) {
                togglePin(noteId);
                setIsPinned((prev) => !prev); // 乐观更新本地 UI
              } else {
                setIsPinned((prev) => !prev);
              }
            }}
            className={`w-9 h-9 items-center justify-center mr-1 ${
              isPinned ? 'bg-amber-100 rounded-lg' : ''
            }`}
          >
            <Pin size={18} color={isPinned ? '#f59e0b' : '#94a3b8'} fill={isPinned ? '#f59e0b' : 'none'} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSave}
            disabled={!isDirty && !isEditing}
            className={`w-9 h-9 rounded-lg items-center justify-center ${
              isDirty || !isEditing ? 'bg-amber-500' : 'bg-slate-200'
            }`}
          >
            <Save size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Edit Body */}
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        {/* Title */}
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="标题"
          placeholderTextColor="#94a3b8"
          className="text-xl font-black text-slate-800 py-2 border-b border-slate-100"
        />

        {/* Content */}
        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder="开始写点什么...\n\n心愿单、购物清单、重要日期、给TA的留言..."
          placeholderTextColor="#cbd5e1"
          multiline
          textAlignVertical="top"
          className="text-base text-slate-700 leading-relaxed py-3 min-h-[300px]"
        />
      </ScrollView>
    </SafeAreaView>
  );
};
