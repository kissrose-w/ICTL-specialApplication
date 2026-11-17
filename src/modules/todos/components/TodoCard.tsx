import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Check } from 'lucide-react-native';
import { TodoItem } from '../../../types/todo';
import { FIXED_USERS, FixedUserId } from '../../../config/users';

interface TodoCardProps {
  todo: TodoItem;
  currentUserId: FixedUserId;
  isLast?: boolean;
  onToggle: (id: string) => void;
  onNudge: (id: string) => void;
}

export const TodoCard: React.FC<TodoCardProps> = ({
  todo,
  currentUserId,
  isLast = false,
  onToggle,
  onNudge,
}) => {
  const isAssignedToMe = todo.assignedToId === currentUserId;
  const assignee = FIXED_USERS[todo.assignedToId];
  const completedByMe = todo.completedBy === currentUserId;

  return (
    <View
      className={`flex-row items-start py-[15px] ${isLast ? '' : 'border-b border-line'}`}
    >
      <TouchableOpacity
        onPress={() => onToggle(todo.id)}
        className={`w-5 h-5 rounded-full items-center justify-center mt-0.5 border ${
          todo.completed ? 'bg-ink border-ink' : 'bg-surface border-[#C9C2B5]'
        }`}
        style={{ borderWidth: todo.completed ? 1 : 1.4 }}
      >
        {todo.completed && <Check size={11} color="#FFFFFF" strokeWidth={2.6} />}
      </TouchableOpacity>

      <View className="flex-1 min-w-0 ml-3">
        <Text
          className={`text-[14.5px] leading-[21px] ${
            todo.completed ? 'line-through text-[#A9A296]' : 'text-ink'
          }`}
        >
          {todo.title}
        </Text>

        {todo.description ? (
          <Text className="text-[12px] text-muted mt-1">{todo.description}</Text>
        ) : null}

        <View className="flex-row items-center flex-wrap mt-[5px]">
          {todo.completed ? (
            <View className="flex-row items-center">
              <View
                className="w-1.5 h-1.5 rounded-full mr-1.5"
                style={{ backgroundColor: completedByMe ? '#4A7196' : '#A85A6B' }}
              />
              <Text className="text-[11px] text-muted">
                {completedByMe ? '我' : 'Partner'} · 今天完成
              </Text>
            </View>
          ) : (
            <View className="flex-row items-center">
              <View
                className="w-1.5 h-1.5 rounded-full mr-1.5"
                style={{ backgroundColor: assignee.badgeColor }}
              />
              <Text className="text-[11px] text-muted">
                {isAssignedToMe ? '我的任务' : '给 Partner'}
              </Text>
            </View>
          )}

          {todo.syncStatus === 'pending' ? (
            <Text className="text-[11px] text-warn ml-1.5">· 待同步</Text>
          ) : null}
        </View>
      </View>

      {!todo.completed && !isAssignedToMe ? (
        <TouchableOpacity onPress={() => onNudge(todo.id)} className="ml-2 pt-0.5 px-1">
          <Text className="text-[11.5px] text-clay">
            提醒{todo.nudgeCount > 0 ? ` ${todo.nudgeCount}` : ''}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};
