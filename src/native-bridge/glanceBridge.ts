import { NativeModules, Platform } from 'react-native';
import { TodoItem } from '../types/todo';

interface GlanceWidgetModuleType {
  updateWidgetData: (payloadJson: string) => Promise<boolean>;
  requestWidgetUpdate: () => Promise<boolean>;
}

const { GlanceWidgetModule } = NativeModules;

export interface WidgetPayload {
  lastUpdated: string;
  userAName: string;
  userBName: string;
  userAPendingCount: number;
  userBPendingCount: number;
  topTodos: Array<{
    id: string;
    title: string;
    assignedToName: string;
    nudgeCount: number;
  }>;
}

/**
 * Android 桌面小组件 (Jetpack Compose Glance) 数据同步桥接
 */
export const glanceBridge = {
  syncWidgetData: async (payload: WidgetPayload): Promise<boolean> => {
    if (Platform.OS !== 'android') return false;

    try {
      if (GlanceWidgetModule?.updateWidgetData) {
        return await GlanceWidgetModule.updateWidgetData(JSON.stringify(payload));
      }
      console.log('[GlanceBridge] (Stub) Widget data sync payload:', payload);
      return true;
    } catch (err) {
      console.warn('[GlanceBridge] Failed to update widget data:', err);
      return false;
    }
  },

  notifyWidgetRefresh: async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return false;

    try {
      if (GlanceWidgetModule?.requestWidgetUpdate) {
        return await GlanceWidgetModule.requestWidgetUpdate();
      }
      return true;
    } catch (err) {
      console.warn('[GlanceBridge] Failed to request widget refresh:', err);
      return false;
    }
  },
};
