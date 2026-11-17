import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Keyboard,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus } from 'lucide-react-native';
import { useTodoStore } from '../store/todoStore';
import { useNoteStore } from '../../notes/store/noteStore';
import { useAuthStore } from '../../../store/authStore';
import { TodoCard } from '../components/TodoCard';
import { TodoFilterType } from '../../../types/todo';
import { FIXED_USERS, FixedUserId } from '../../../config/users';
import { PAGE_NAME } from '../../../config/pageNaming';
import type { MainTabScreenProps } from '../../../types/navigation';
import { glanceBridge } from '../../../native-bridge/glanceBridge';

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

/** 页头眉头：今天 · 11 月 17 日 · 周一 */
function todayLabel() {
  const now = new Date();
  return `今天 · ${now.getMonth() + 1} 月 ${now.getDate()} 日 · ${WEEKDAYS[now.getDay()]}`;
}

function noteDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

/** 待办默认行数：超出后内联「查看全部 N 件」 */
const TODO_PREVIEW_COUNT = 4;
/** 最近便签默认条数 */
const NOTE_PREVIEW_COUNT = 2;

type Props = MainTabScreenProps<'Todos'>;

export const TodosScreen: React.FC<Props> = ({ navigation }) => {
  const currentUserId = useAuthStore((state) => state.currentUserId) || 'user_a';
  const partnerOnline = useAuthStore((state) => state.partnerOnline);
  const partnerUser = currentUserId === 'user_a' ? FIXED_USERS.user_b : FIXED_USERS.user_a;

  const [activeFilter, setActiveFilter] = useState<TodoFilterType>('all');
  const [showAllTodos, setShowAllTodos] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [assignedTo, setAssignedTo] = useState<FixedUserId>(currentUserId);

  // 新建待办面板
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAssignee, setFormAssignee] = useState<FixedUserId>(currentUserId);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    todos,
    addTodo,
    toggleTodo,
    nudgeTodo,
    getFilteredTodos,
  } = useTodoStore();

  const notes = useNoteStore((state) => state.notes);

  const filteredTodos = getFilteredTodos(activeFilter, currentUserId);
  const visibleTodos = showAllTodos
    ? filteredTodos
    : filteredTodos.slice(0, TODO_PREVIEW_COUNT);
  const visibleNotes = notes.slice(0, NOTE_PREVIEW_COUNT);

  const counts = {
    all: getFilteredTodos('all', currentUserId).length,
    mine: getFilteredTodos('mine', currentUserId).length,
    partner: getFilteredTodos('partner', currentUserId).length,
    completed: getFilteredTodos('completed', currentUserId).length,
  };

  const pendingSyncCount = todos.filter((t) => t.syncStatus === 'pending').length;
  const relatedCount = counts.mine + counts.partner;

  // 同步到桌面小组件
  const triggerWidgetSync = () => {
    const userAPending = todos.filter((t) => !t.completed && t.assignedToId === 'user_a').length;
    const userBPending = todos.filter((t) => !t.completed && t.assignedToId === 'user_b').length;
    glanceBridge.syncWidgetData({
      lastUpdated: new Date().toLocaleTimeString(),
      userAName: FIXED_USERS.user_a.name,
      userBName: FIXED_USERS.user_b.name,
      userAPendingCount: userAPending,
      userBPendingCount: userBPending,
      topTodos: todos.slice(0, 3).map((t) => ({
        id: t.id,
        title: t.title,
        assignedToName: FIXED_USERS[t.assignedToId].name,
        nudgeCount: t.nudgeCount,
      })),
    });
  };

  const handleCreateTodo = () => {
    if (!newTitle.trim()) return;
    addTodo({
      title: newTitle.trim(),
      assignedToId: assignedTo,
    });
    setNewTitle('');
    triggerWidgetSync();
  };

  const openCreateModal = () => {
    setFormTitle('');
    setFormDescription('');
    setFormAssignee(currentUserId);
    setFormError(null);
    setSubmitting(false);
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    if (submitting) return;
    setShowCreateModal(false);
    setFormError(null);
  };

  const handleSubmitCreate = () => {
    if (submitting) return;
    if (!formTitle.trim()) {
      setFormError('给这件事起个名字');
      return;
    }

    setFormError(null);
    setSubmitting(true);
    addTodo({
      title: formTitle.trim(),
      description: formDescription.trim() || undefined,
      assignedToId: formAssignee,
    });
    triggerWidgetSync();

    // 乐观创建：给「添加中…」留出可见的一帧，再回到列表
    setTimeout(() => {
      setSubmitting(false);
      setShowCreateModal(false);
      setFormTitle('');
      setFormDescription('');
      setFormError(null);
    }, 220);
  };

  const handleToggle = (id: string) => {
    toggleTodo(id, currentUserId);
    triggerWidgetSync();
  };

  const handleNudge = (id: string) => {
    nudgeTodo(id);
    triggerWidgetSync();
  };

  const openNotesList = () => {
    navigation.navigate('Space', { screen: 'NotesList' });
  };

  const openNoteEditor = (noteId?: string) => {
    navigation.navigate('Space', { screen: 'NoteEdit', params: { noteId } });
  };

  const filters = [
    { key: 'all', label: '全部' },
    { key: 'mine', label: '我的' },
    { key: 'partner', label: 'Partner' },
    { key: 'completed', label: '已完成' },
  ] as const;

  const bothEmpty = todos.length === 0 && notes.length === 0;

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top']}>
      <ScrollView
        className="flex-1 px-[22px]"
        contentContainerStyle={{ paddingBottom: 22 }}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={Keyboard.dismiss}
        showsVerticalScrollIndicator={false}
      >
        {/* 页头：眉头时间 + 大字页名 + 身份点 */}
        <View className="pt-2">
          <Text className="text-[11px] text-muted tracking-[1px]">{todayLabel()}</Text>
          <View className="flex-row items-end justify-between mt-1">
            <Text
              className="text-[30px] text-ink leading-[34px]"
              style={{ fontFamily: 'serif', fontWeight: '600' }}
            >
              {PAGE_NAME}
            </Text>
            <View className="flex-row items-center pb-1">
              <View
                className="w-[26px] h-[26px] rounded-full items-center justify-center border border-line bg-ida-soft"
              >
                <Text className="text-[11px] text-ida">A</Text>
              </View>
              <View
                className="w-[26px] h-[26px] rounded-full items-center justify-center border border-line bg-idb-soft -ml-[9px]"
              >
                <Text className="text-[11px] text-idb">B</Text>
              </View>
              <View className="flex-row items-center ml-1.5">
                <View
                  className="w-[7px] h-[7px] rounded-full mr-1"
                  style={{ backgroundColor: partnerOnline ? '#527A63' : '#C9C2B5' }}
                />
                <Text className="text-[11px] text-muted">
                  {partnerOnline ? '都在' : `${partnerUser.id === 'user_b' ? 'B' : 'A'} 离线`}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 待办小节 */}
        <View className="flex-row items-baseline justify-between mt-[18px]">
          <Text className="text-[13px] font-semibold text-ink">
            待办
            <Text className="text-[11px] font-normal text-muted"> {counts.all} 件未完成</Text>
          </Text>
        </View>

        {/* 筛选：只作用于待办 */}
        <View className="flex-row border-b border-line mt-2">
          {filters.map((f) => {
            const isActive = activeFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => {
                  setActiveFilter(f.key);
                  setShowAllTodos(false);
                }}
                className="mr-[22px] pb-2 relative"
              >
                <Text
                  className={`text-[13px] ${isActive ? 'text-ink font-semibold' : 'text-muted'}`}
                >
                  {f.label}
                  <Text className="text-[10px] text-[#A9A296]"> {counts[f.key]}</Text>
                </Text>
                {isActive ? (
                  <View className="absolute left-0 right-0 bottom-[-1px] h-[2px] bg-ink" />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 快速添加；左侧加号是明确的「新建」入口 */}
        <View className="flex-row items-center py-3 border-b border-line">
          <TouchableOpacity
            onPress={openCreateModal}
            accessibilityLabel="新建待办"
            className="w-[22px] h-[22px] rounded-full border border-line bg-surface items-center justify-center"
          >
            <Plus size={13} color="#5C564C" />
          </TouchableOpacity>
          <TextInput
            value={newTitle}
            onChangeText={setNewTitle}
            placeholder="快速添加一件小事"
            placeholderTextColor="#A9A296"
            className="flex-1 text-[14px] text-ink ml-2.5 outline-none"
            onSubmitEditing={handleCreateTodo}
            returnKeyType="done"
            blurOnSubmit={false}
          />
          <TouchableOpacity
            onPress={() => setAssignedTo(assignedTo === currentUserId ? partnerUser.id : currentUserId)}
            className={`rounded-full px-2.5 py-1 ${assignedTo === currentUserId ? 'bg-ida-soft' : 'bg-idb-soft'}`}
          >
            <Text className={`text-[11px] ${assignedTo === currentUserId ? 'text-ida' : 'text-idb'}`}>
              {assignedTo === currentUserId ? '给自己' : '给 Partner'}
            </Text>
          </TouchableOpacity>
          {newTitle.trim() ? (
            <TouchableOpacity onPress={handleCreateTodo} className="ml-2.5 py-1">
              <Text className="text-[12px] text-clay font-semibold">发送</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* 待办行：默认 4 条 */}
        {visibleTodos.map((item, index) => (
          <TodoCard
            key={item.id}
            todo={item}
            currentUserId={currentUserId}
            isLast={index === visibleTodos.length - 1}
            onToggle={handleToggle}
            onNudge={handleNudge}
          />
        ))}

        {filteredTodos.length === 0 ? (
          <View className="py-3 border-b border-line">
            <Text className="text-[12px] text-muted">
              {todos.length === 0 ? '今天还没有待办，在上面记一件就好。' : '这个筛选下还没有待办。'}
            </Text>
          </View>
        ) : null}

        {filteredTodos.length > TODO_PREVIEW_COUNT ? (
          <TouchableOpacity
            onPress={() => setShowAllTodos((v) => !v)}
            className="py-2.5"
          >
            <Text className="text-[12px] text-clay">
              {showAllTodos ? '收起' : `查看全部 ${filteredTodos.length} 件 ›`}
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* 最近便签 */}
        <View className="flex-row items-baseline justify-between mt-[14px]">
          <Text className="text-[13px] font-semibold text-ink">
            最近便签
            <Text className="text-[11px] font-normal text-muted"> {notes.length} 条</Text>
          </Text>
          <TouchableOpacity onPress={() => openNoteEditor()} className="py-1">
            <Text className="text-[12px] text-clay">+ 写一条</Text>
          </TouchableOpacity>
        </View>

        {notes.length === 0 ? (
          <View className="py-3 border-b border-line">
            <Text className="text-[12px] text-muted">还没有便签，写一条留给对方。</Text>
          </View>
        ) : (
          visibleNotes.map((note, index) => {
            const author = FIXED_USERS[note.authorId];
            const isMine = note.authorId === currentUserId;
            return (
              <TouchableOpacity
                key={note.id}
                activeOpacity={0.7}
                onPress={() => openNoteEditor(note.id)}
                className={`py-2.5 ${
                  index === visibleNotes.length - 1 ? '' : 'border-b border-line'
                }`}
              >
                <View className="flex-row items-center">
                  <Text
                    numberOfLines={1}
                    className="text-[14px] font-semibold text-ink mr-2 shrink"
                  >
                    {note.title.trim() || '无标题便签'}
                  </Text>
                  {note.isPinned ? (
                    <View className="rounded-full border border-clay-border bg-clay-soft px-[7px] py-[2px]">
                      <Text className="text-[9.5px] text-clay">置顶</Text>
                    </View>
                  ) : null}
                </View>

                <Text numberOfLines={1} className="text-[12px] text-muted leading-[19px] mt-0.5">
                  {note.content}
                </Text>

                <View className="flex-row items-center justify-between mt-1.5">
                  <View className="flex-row items-center">
                    <View
                      className="w-1.5 h-1.5 rounded-full mr-1.5"
                      style={{ backgroundColor: author.badgeColor }}
                    />
                    <Text className="text-[10.5px] text-[#A9A296]">
                      {isMine ? '我' : 'Partner'} · 共享
                    </Text>
                    {note.syncStatus === 'pending' ? (
                      <Text className="text-[10.5px] text-warn ml-1.5">· 待同步</Text>
                    ) : null}
                  </View>
                  <Text className="text-[10.5px] text-[#A9A296]">{noteDate(note.updatedAt)}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {notes.length > 0 ? (
          <TouchableOpacity
            onPress={openNotesList}
            className="mt-2.5 h-[34px] rounded-xl border border-line bg-surface items-center justify-center"
          >
            <Text className="text-[12px] text-ink-2">
              查看全部 {notes.length} 条便签 ›
            </Text>
          </TouchableOpacity>
        ) : null}

        {bothEmpty ? (
          <Text className="text-[10.5px] text-[#A9A296] mt-4">
            两个人都还没开口，先从一件小事开始。
          </Text>
        ) : null}

        {todos.length > 0 ? (
          <Text className="text-[10.5px] text-[#A9A296] mt-3">
            {pendingSyncCount > 0
              ? '线下时先在本地记下，连上网络会自动同步。'
              : `全部 ${counts.all} 件 · ${relatedCount} 件与你有关`}
          </Text>
        ) : null}
      </ScrollView>

      {/* 新建待办 · 底部抽屉 */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={closeCreateModal}
      >
        <Pressable className="flex-1 bg-black/40 justify-end" onPress={closeCreateModal}>
          <Pressable className="bg-surface rounded-t-3xl px-5 pt-2.5 pb-6" onPress={() => {}}>
            <View className="w-9 h-1 rounded-full bg-[#DCD7CC] self-center mb-3.5" />
            <Text className="text-[18px] font-semibold text-ink mb-[18px]">新建待办</Text>

            <View className="mb-3.5">
              <Text className="text-[11px] text-muted mb-1.5">标题</Text>
              <TextInput
                value={formTitle}
                onChangeText={(text) => {
                  setFormTitle(text);
                  if (formError) setFormError(null);
                }}
                placeholder="例如：周六上午去取快递"
                placeholderTextColor="#B3ACA0"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSubmitCreate}
                className={`border rounded-xl px-3 text-[14px] text-ink outline-none ${
                  formError ? 'border-clay' : 'border-line'
                }`}
                style={{ height: 46, borderWidth: formError ? 1.5 : 1 }}
              />
              {formError ? (
                <Text className="text-[11.5px] text-clay mt-1.5">{formError}</Text>
              ) : null}
            </View>

            <View className="mb-3.5">
              <Text className="text-[11px] text-muted mb-1.5">补充说明 · 可选</Text>
              <TextInput
                value={formDescription}
                onChangeText={setFormDescription}
                placeholder="地点、时间，或一句想提醒的话"
                placeholderTextColor="#B3ACA0"
                multiline
                textAlignVertical="top"
                className="border border-line rounded-xl px-3 py-3 text-[13px] text-ink-2 outline-none"
                style={{ height: 66, lineHeight: 20 }}
              />
            </View>

            <View className="mb-3.5">
              <Text className="text-[11px] text-muted mb-1.5">归属</Text>
              <View className="flex-row">
                <TouchableOpacity
                  onPress={() => setFormAssignee(currentUserId)}
                  className={`flex-1 flex-row items-center justify-center rounded-xl mr-[5px] border ${
                    formAssignee === currentUserId
                      ? 'bg-clay-soft border-clay'
                      : 'bg-surface border-line'
                  }`}
                  style={{ height: 42 }}
                >
                  <View className="w-1.5 h-1.5 rounded-full bg-ida mr-[7px]" />
                  <Text
                    className="text-[12.5px]"
                    style={{ color: formAssignee === currentUserId ? '#A95D44' : '#857E73' }}
                  >
                    给自己
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setFormAssignee(partnerUser.id)}
                  className={`flex-1 flex-row items-center justify-center rounded-xl ml-[5px] border ${
                    formAssignee === partnerUser.id
                      ? 'bg-clay-soft border-clay'
                      : 'bg-surface border-line'
                  }`}
                  style={{ height: 42 }}
                >
                  <View className="w-1.5 h-1.5 rounded-full bg-idb mr-[7px]" />
                  <Text
                    className="text-[12.5px]"
                    style={{ color: formAssignee === partnerUser.id ? '#A95D44' : '#857E73' }}
                  >
                    给 Partner
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleSubmitCreate}
              disabled={submitting || !formTitle.trim()}
              className={`rounded-xl items-center justify-center mt-1 ${
                submitting
                  ? 'bg-clay/60'
                  : formTitle.trim()
                  ? 'bg-clay'
                  : 'bg-[#E4DFD5]'
              }`}
              style={{ height: 46 }}
            >
              <Text className="text-white text-[14px] tracking-[0.5px]">
                {submitting ? '添加中…' : '添加待办'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={closeCreateModal} disabled={submitting} className="pt-3">
              <Text className="text-[12.5px] text-muted text-center">取消</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};
