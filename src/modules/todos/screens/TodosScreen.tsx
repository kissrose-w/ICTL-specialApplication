import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, User, Users, CheckCircle2, Send } from 'lucide-react-native';
import { useTodoStore } from '../store/todoStore';
import { useAuthStore } from '../../../store/authStore';
import { TodoCard } from '../components/TodoCard';
import { TodoFilterType } from '../../../types/todo';
import { FIXED_USERS, FixedUserId } from '../../../config/users';
import { glanceBridge } from '../../../native-bridge/glanceBridge';

export const TodosScreen: React.FC = () => {
  const currentUserId = useAuthStore((state) => state.currentUserId) || 'user_a';
  const currentUser = FIXED_USERS[currentUserId];
  const partnerUser = currentUserId === 'user_a' ? FIXED_USERS.user_b : FIXED_USERS.user_a;

  const [activeFilter, setActiveFilter] = useState<TodoFilterType>('all');
  const [newTitle, setNewTitle] = useState('');
  const [assignedTo, setAssignedTo] = useState<FixedUserId>(currentUserId);

  const {
    todos,
    addTodo,
    toggleTodo,
    nudgeTodo,
    getFilteredTodos,
  } = useTodoStore();

  const filteredTodos = getFilteredTodos(activeFilter, currentUserId);

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
      creatorId: currentUserId,
      assignedToId: assignedTo,
    });
    setNewTitle('');
    triggerWidgetSync();
  };

  const handleToggle = (id: string) => {
    toggleTodo(id, currentUserId);
    triggerWidgetSync();
  };

  const handleNudge = (id: string) => {
    nudgeTodo(id);
    Alert.alert('催办已发送', `已向 ${partnerUser.name} 发送催办提醒！`);
    triggerWidgetSync();
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-100">
      {/* Top Header */}
      <View className="px-5 pt-3 pb-4 bg-white border-b border-slate-200">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-xl font-black text-slate-800 tracking-tight">
              双人待办协同
            </Text>
            <Text className="text-xs text-slate-500 mt-0.5">
              共享空间 · 无需配对 · 实时同步
            </Text>
          </View>
          <View className="flex-row items-center space-x-1.5">
            <View
              className="px-2.5 py-1 rounded-full border border-blue-200"
              style={{ backgroundColor: '#eff6ff' }}
            >
              <Text className="text-xs font-bold text-blue-700">{currentUser.name}</Text>
            </View>
            <Text className="text-slate-300 mx-1">&</Text>
            <View
              className="px-2.5 py-1 rounded-full border border-rose-200"
              style={{ backgroundColor: '#fff1f2' }}
            >
              <Text className="text-xs font-bold text-rose-700">{partnerUser.name}</Text>
            </View>
          </View>
        </View>

        {/* Filter Segment Tabs */}
        <View className="flex-row bg-slate-100 p-1 rounded-xl mt-4">
          {(
            [
              { key: 'all', label: '全部待办' },
              { key: 'mine', label: '我的' },
              { key: 'partner', label: 'TA的' },
              { key: 'completed', label: '已完成' },
            ] as const
          ).map((tab) => {
            const isActive = activeFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveFilter(tab.key)}
                className={`flex-1 py-1.5 rounded-lg items-center ${
                  isActive ? 'bg-white shadow-sm' : ''
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    isActive ? 'text-slate-900' : 'text-slate-500'
                  }`}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Quick Add Section */}
      <View className="p-4 bg-white border-b border-slate-200">
        <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
          <TextInput
            value={newTitle}
            onChangeText={setNewTitle}
            placeholder={`新建待办，指派给${assignedTo === currentUserId ? '我' : partnerUser.name}...`}
            className="flex-1 text-sm text-slate-800"
            onSubmitEditing={handleCreateTodo}
          />

          {/* Quick Assign Switcher */}
          <TouchableOpacity
            onPress={() =>
              setAssignedTo(assignedTo === currentUserId ? partnerUser.id : currentUserId)
            }
            className={`flex-row items-center px-2.5 py-1 rounded-lg mr-2 ${
              assignedTo === currentUserId ? 'bg-blue-100' : 'bg-rose-100'
            }`}
          >
            <User size={12} color={assignedTo === currentUserId ? '#1d4ed8' : '#be123c'} />
            <Text
              className={`text-xs font-bold ml-1 ${
                assignedTo === currentUserId ? 'text-blue-800' : 'text-rose-800'
              }`}
            >
              {assignedTo === currentUserId ? '我' : 'TA'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleCreateTodo}
            disabled={!newTitle.trim()}
            className={`w-8 h-8 rounded-lg items-center justify-center ${
              newTitle.trim() ? 'bg-slate-900' : 'bg-slate-300'
            }`}
          >
            <Send size={15} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Todo List */}
      <FlatList
        data={filteredTodos}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <TodoCard
            todo={item}
            currentUserId={currentUserId}
            onToggle={handleToggle}
            onNudge={handleNudge}
          />
        )}
        ListEmptyComponent={
          <View className="items-center justify-center py-16">
            <CheckCircle2 size={40} color="#cbd5e1" />
            <Text className="text-slate-400 text-sm mt-3">暂无待办事项，轻松一下吧！</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};
