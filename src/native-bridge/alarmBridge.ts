import { NativeModules, Platform } from 'react-native';

interface AlarmBridgeModuleType {
  scheduleExactAlarm: (
    alarmId: string,
    triggerTimestamp: number,
    title: string,
    message: string,
    isFullScreenWakeup: boolean
  ) => Promise<boolean>;
  cancelAlarm: (alarmId: string) => Promise<boolean>;
  canScheduleExactAlarms: () => Promise<boolean>;
}

const { AlarmBridgeModule } = NativeModules;

/**
 * Android 后台精准闹钟 (AlarmManager.setExactAndAllowWhileIdle) 桥接层
 * 支持到点全屏强提醒或系统高优先级震动唤醒
 */
export const alarmBridge = {
  scheduleExactAlarm: async (params: {
    alarmId: string;
    triggerTimestamp: number;
    title: string;
    message: string;
    isFullScreenWakeup?: boolean;
  }): Promise<boolean> => {
    if (Platform.OS !== 'android') return false;

    try {
      if (AlarmBridgeModule?.scheduleExactAlarm) {
        return await AlarmBridgeModule.scheduleExactAlarm(
          params.alarmId,
          params.triggerTimestamp,
          params.title,
          params.message,
          params.isFullScreenWakeup ?? false
        );
      }
      console.log('[AlarmBridge] (Stub) Scheduled exact alarm:', params);
      return true;
    } catch (err) {
      console.warn('[AlarmBridge] Error scheduling exact alarm:', err);
      return false;
    }
  },

  cancelAlarm: async (alarmId: string): Promise<boolean> => {
    if (Platform.OS !== 'android') return false;

    try {
      if (AlarmBridgeModule?.cancelAlarm) {
        return await AlarmBridgeModule.cancelAlarm(alarmId);
      }
      console.log('[AlarmBridge] (Stub) Cancelled alarm:', alarmId);
      return true;
    } catch (err) {
      console.warn('[AlarmBridge] Error cancelling alarm:', err);
      return false;
    }
  },

  canScheduleExactAlarms: async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return false;

    try {
      if (AlarmBridgeModule?.canScheduleExactAlarms) {
        return await AlarmBridgeModule.canScheduleExactAlarms();
      }
      return true;
    } catch {
      return false;
    }
  },
};
