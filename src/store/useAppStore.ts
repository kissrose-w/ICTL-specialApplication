import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from './storage';

interface AppState {
  count: number;
  userName: string;
  isDarkMode: boolean;
  increment: () => void;
  decrement: () => void;
  resetCount: () => void;
  setUserName: (name: string) => void;
  toggleDarkMode: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      count: 0,
      userName: 'Developer',
      isDarkMode: false,
      increment: () => set((state) => ({ count: state.count + 1 })),
      decrement: () => set((state) => ({ count: state.count - 1 })),
      resetCount: () => set({ count: 0 }),
      setUserName: (userName) => set({ userName }),
      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
    }),
    {
      name: 'app-state-storage',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
