import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CheckSquare, Bell, Heart, Settings } from 'lucide-react-native';
import { TodosScreen } from '../modules/todos/screens/TodosScreen';
import { RemindersScreen } from '../modules/reminders/screens/RemindersScreen';
import { SpaceScreen } from '../modules/space/screens/SpaceScreen';
import { NotesListScreen } from '../modules/notes/screens/NotesListScreen';
import { NoteEditScreen } from '../modules/notes/screens/NoteEditScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import type { MainTabParamList, SpaceStackParamList } from '../types/navigation';

const Tab = createBottomTabNavigator<MainTabParamList>();
const SpaceStack = createNativeStackNavigator<SpaceStackParamList>();

/** Space Tab 内部嵌套 Stack — 便签、账本、纪念日、照片墙都从这里进 */
function SpaceStackNavigator() {
  return (
    <SpaceStack.Navigator screenOptions={{ headerShown: false }}>
      <SpaceStack.Screen name="SpaceHome" component={SpaceScreen} />
      <SpaceStack.Screen
        name="NotesList"
        component={NotesListScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <SpaceStack.Screen
        name="NoteEdit"
        component={NoteEditScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </SpaceStack.Navigator>
  );
}

export const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e2e8f0',
          height: 62,
          paddingBottom: 8,
          paddingTop: 8,
        },
      }}
    >
      <Tab.Screen
        name="Todos"
        component={TodosScreen}
        options={{
          tabBarLabel: '待办协同',
          tabBarIcon: ({ color, size }) => <CheckSquare color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Reminders"
        component={RemindersScreen}
        options={{
          tabBarLabel: '精准提醒',
          tabBarIcon: ({ color, size }) => <Bell color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Space"
        component={SpaceStackNavigator}
        options={{
          tabBarLabel: '双人空间',
          tabBarIcon: ({ color, size }) => <Heart color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: '设置',
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
};
