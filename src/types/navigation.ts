import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type MainTabParamList = {
  Todos: undefined;
  Reminders: undefined;
  Space: NavigatorScreenParams<SpaceStackParamList> | undefined;
  Settings: undefined;
};

/** Space Tab 内部嵌套 Stack */
export type SpaceStackParamList = {
  SpaceHome: undefined;        // 4 张入口卡片的主页
  NotesList: undefined;        // 便签列表
  NoteEdit: { noteId?: string }; // undefined=新建, 有值=编辑
};

export type RootStackParamList = {
  UserSelect: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type MainTabScreenProps<T extends keyof MainTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, T>,
    NativeStackScreenProps<RootStackParamList>
  >;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
