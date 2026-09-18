import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Check, Bell, Clock, CloudOff } from 'lucide-react-native';
import { TodoItem } from '../../../types/todo';
import { FIXED_USERS, FixedUserId } from '../../../config/users';

interface TodoCardProps {
  todo: TodoItem;
  currentUserId: FixedUserId;
  onToggle: (id: string) => void;
  onNudge: (id: string) => void;
}

export const TodoCard: React.FC<TodoCardProps> = ({
  todo,
  currentUserId,
  onToggle,
  onNudge,
}) => {
  const isAssignedToMe = todo.assignedToId === currentUserId;
  const assignee = FIXED_USERS[todo.assignedToId];
  const creator = FIXED_USERS[todo.creatorId];
  const completedByUser = todo.completedBy ? FIXED_USERS[todo.completedBy] : null;

  return (
    <View
      className={`p-4 mb-3 rounded-2xl border transition-all ${
        todo.completed
          ? 'bg-slate-50 border-slate-200 opacity-60'
          : 'bg-white border-slate-200 shadow-sm'
      }`}
    >
      <View className="flex-row items-start justify-between">
        {/* Toggle Checkbox */}
        <TouchableOpacity
          onPress={() => onToggle(todo.id)}
          className={`w-7 h-7 rounded-lg items-center justify-center mr-3 mt-0.5 border ${
            todo.completed
              ? 'bg-emerald-500 border-emerald-500'
              : 'border-slate-300 bg-white'
          }`}
        >
          {todo.completed && <Check size={16} color="#ffffff" strokeWidth={3} />}
        </TouchableOpacity>

        {/* Content */}
        <View className="flex-1 mr-2">
          <Text
            className={`text-base font-semibold ${
              todo.completed ? 'line-through text-slate-400' : 'text-slate-800'
            }`}
          >
            {todo.title}
          </Text>

          {todo.description ? (
            <Text className="text-xs text-slate-500 mt-1">{todo.description}</Text>
          ) : null}

          {/* Badges & Meta */}
          <View className="flex-row flex-wrap items-center mt-3 gap-2">
            {/* Assignee Badge */}
            <View
              className={`px-2.5 py-1 rounded-full flex-row items-center ${
                isAssignedToMe ? 'bg-blue-50' : 'bg-rose-50'
              }`}
            >
              <View
                className="w-2 h-2 rounded-full mr-1.5"
                style={{ backgroundColor: assignee.badgeColor }}
              />
              <Text
                className={`text-xs font-medium ${
                  isAssignedToMe ? 'text-blue-700' : 'text-rose-700'
                }`}
              >
                {isAssignedToMe ? '我的任务' : `指派给 ${assignee.name}`}
              </Text>
            </View>

            {/* Completed By Badge */}
            {todo.completed && completedByUser && (
              <View className="px-2 py-0.5 rounded bg-emerald-50">
                <Text className="text-xs text-emerald-600">
                  {completedByUser.name} 完成
                </Text>
              </View>
            )}

            {/* Offline Pending Badge */}
            {todo.syncStatus === 'pending' && (
              <View className="flex-row items-center px-2 py-0.5 rounded bg-amber-50">
                <CloudOff size={11} color="#d97706" />
                <Text className="text-[10px] text-amber-600 ml-1">本地待同步</Text>
              </View>
            )}
          </View>
        </View>

        {/* Nudge / Action Button (仅当任务未完成且指派给对方时可用) */}
        {!todo.completed && !isAssignedToMe && (
          <TouchableOpacity
            onPress={() => onNudge(todo.id)}
            className="flex-row items-center bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl active:bg-rose-100"
          >
            <Bell size={13} color="#e11d48" />
            <Text className="text-xs font-bold text-rose-600 ml-1">
              催一下 {todo.nudgeCount > 0 ? `(${todo.nudgeCount})` : ''}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};
