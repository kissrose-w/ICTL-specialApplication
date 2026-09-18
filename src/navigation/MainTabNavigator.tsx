import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CheckSquare, Bell, Heart, Settings } from 'lucide-react-native';
import { TodosScreen } from '../modules/todos/screens/TodosScreen';
import { RemindersScreen } from '../modules/reminders/screens/RemindersScreen';
import { SpaceScreen } from '../modules/space/screens/SpaceScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import type { MainTabParamList } from '../types/navigation';

const Tab = createBottomTabNavigator<MainTabParamList>();

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
        component={SpaceScreen}
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
