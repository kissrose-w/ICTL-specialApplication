import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ListChecks, Bell, Home, User } from 'lucide-react-native';
import { TodosScreen } from '../modules/todos/screens/TodosScreen';
import { RemindersScreen } from '../modules/reminders/screens/RemindersScreen';
import { SpaceScreen } from '../modules/space/screens/SpaceScreen';
import { NotesListScreen } from '../modules/notes/screens/NotesListScreen';
import { NoteEditScreen } from '../modules/notes/screens/NoteEditScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { PAGE_NAME } from '../config/pageNaming';
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
        tabBarActiveTintColor: '#1E1C18',
        tabBarInactiveTintColor: '#857E73',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E4DFD5',
          height: 70,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tab.Screen
        name="Todos"
        component={TodosScreen}
        options={{
          tabBarLabel: PAGE_NAME,
          tabBarIcon: ({ color, size }) => <ListChecks color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Reminders"
        component={RemindersScreen}
        options={{
          tabBarLabel: '提醒',
          tabBarIcon: ({ color, size }) => <Bell color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Space"
        component={SpaceStackNavigator}
        options={{
          tabBarLabel: '空间',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: '我的',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
};
