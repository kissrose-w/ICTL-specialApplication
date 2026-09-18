import { createMMKV } from 'react-native-mmkv';
import { StateStorage } from 'zustand/middleware';

export const storage = createMMKV({
  id: 'ictl-app-storage',
});

export const mmkvStorage: StateStorage = {
  setItem: (name: string, value: string) => {
    storage.set(name, value);
  },
  getItem: (name: string) => {
    const value = storage.getString(name);
    return value ?? null;
  },
  removeItem: (name: string) => {
    storage.remove(name);
  },
};
