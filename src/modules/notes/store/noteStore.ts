/**
 * Phase 4 — Notes Store
 * 
 * 乐观更新 + async REST + WS 广播 (后端自动 broadcastToPartner)
 * 对齐 todoStore 的设计模式
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '../../../store/storage';
import type { NoteItem } from '../../../types/note';
import { useAuthStore } from '../../../store/authStore';
import {
  listNotes,
  createNote,
  updateNote,
  deleteNoteApi,
} from '../../../api/notesApi';
import { fromBackendNote, fromBackendNotes } from '../../../utils/apiMapper';

type PendingNoteId = string; // 'local-xxx' 或真实 UUID

function tempId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

interface NoteStoreState {
  notes: NoteItem[];
  // CRUD (乐观更新 + async REST)
  addNote: (params: { title: string; content: string; isPinned?: boolean }) => NoteItem;
  updateNoteLocal: (id: string, updates: Partial<Pick<NoteItem, 'title' | 'content' | 'isPinned'>>) => void;
  deleteNote: (id: string) => void;
  togglePin: (id: string) => void;
  // Merge helpers (WS 广播用)
  mergeRemoteNotes: (remoteNotes: NoteItem[]) => void;
  deleteRemoteNote: (id: string) => void;
  // Sync
  syncFromBackend: () => Promise<void>;
  retryPendingSyncs: () => Promise<void>;
}

/** 后端 listNotes 返回的顺序是 "置顶优先 + 更新时间倒序" —— 这个逻辑交给后端，前端不重排 */
function sortForDisplay(notes: NoteItem[]): NoteItem[] {
  return [...notes].sort((a, b) => {
    // 置顶优先
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    // 同置顶状态按更新时间倒序
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export const useNoteStore = create<NoteStoreState>()(
  persist(
    (set, get) => ({
      notes: [],

      // =====================================================
      // CRUD —— 乐观更新 + async REST
      // =====================================================

      addNote: ({ title, content, isPinned = false }) => {
        const auth = useAuthStore.getState();
        const authorId = auth.currentUserId ?? 'user_a';

        const localNote: NoteItem = {
          id: tempId(),
          authorId,
          title: title.trim(),
          content: content.trim(),
          isPinned,
          metadata: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          syncStatus: 'pending',
        };

        // ① 乐观更新
        set((state) => ({ notes: sortForDisplay([...state.notes, localNote]) }));

        // ② async POST /api/notes
        (async () => {
          try {
            const created = await createNote({
              title: title.trim(),
              content: content.trim(),
              isPinned,
            });
            const backendNote = fromBackendNote(created, auth.userIdMap);

            set((state) => ({
              notes: sortForDisplay(
                state.notes.filter((n) => n.id !== localNote.id).concat([backendNote])
              ),
            }));
          } catch (err) {
            console.warn('[NoteStore] addNote REST failed:', err);
          }
        })();

        return localNote;
      },

      updateNoteLocal: (id, updates) => {
        // ① 乐观更新
        set((state) => ({
          notes: sortForDisplay(
            state.notes.map((n) =>
              n.id === id
                ? { ...n, ...updates, updatedAt: new Date().toISOString(), syncStatus: 'pending' as const }
                : n
            )
          ),
        }));

        // ② async PATCH /api/notes/:id
        (async () => {
          try {
            if (id.startsWith('local-')) {
              console.warn('[NoteStore] updateNoteLocal: still on local temp ID');
              return;
            }
            const updated = await updateNote(id, updates);
            const auth = useAuthStore.getState();
            const backendNote = fromBackendNote(updated, auth.userIdMap);

            set((state) => ({
              notes: sortForDisplay(
                state.notes.map((n) =>
                  n.id === id ? { ...backendNote, syncStatus: 'synced' as const } : n
                )
              ),
            }));
          } catch (err) {
            console.warn('[NoteStore] updateNoteLocal REST failed:', err);
          }
        })();
      },

      deleteNote: (id) => {
        // ① 乐观更新 —— 先从本地移除
        set((state) => ({ notes: state.notes.filter((n) => n.id !== id) }));

        // ② async DELETE /api/notes/:id
        (async () => {
          try {
            if (id.startsWith('local-')) return;
            await deleteNoteApi(id);
          } catch (err) {
            console.warn('[NoteStore] deleteNote REST failed:', err);
          }
        })();
      },

      togglePin: (id) => {
        const note = get().notes.find((n) => n.id === id);
        if (!note) return;
        get().updateNoteLocal(id, { isPinned: !note.isPinned });
      },

      // =====================================================
      // Merge helpers (WS 广播用)
      // =====================================================

      mergeRemoteNotes: (remoteNotes) => {
        set((state) => {
          const map = new Map<string, NoteItem>();
          [...state.notes, ...remoteNotes].forEach((item) => {
            const existing = map.get(item.id);
            if (!existing || new Date(item.updatedAt) > new Date(existing.updatedAt)) {
              map.set(item.id, item);
            }
          });
          return { notes: sortForDisplay(Array.from(map.values())) };
        });
      },

      deleteRemoteNote: (id) => {
        set((state) => ({ notes: state.notes.filter((n) => n.id !== id) }));
      },

      // =====================================================
      // Sync + Retry
      // =====================================================

      syncFromBackend: async () => {
        try {
          const auth = useAuthStore.getState();
          if (!auth.authToken) return;

          const backendNotes = await listNotes();
          const frontendNotes = fromBackendNotes(backendNotes, auth.userIdMap);
          get().mergeRemoteNotes(frontendNotes);
          console.log(`[NoteStore] ✅ syncFromBackend: ${frontendNotes.length} notes synced`);
        } catch (err) {
          console.warn('[NoteStore] syncFromBackend failed:', err);
        }
      },

      retryPendingSyncs: async () => {
        const pending = get().notes.filter((n) => n.syncStatus === 'pending');
        console.log(`[NoteStore] retryPendingSyncs: ${pending.length} pending items`);

        // 临时 ID 的 —— retry createNote
        const tempIdPending = pending.filter((n) => n.id.startsWith('local-'));
        for (const n of tempIdPending) {
          try {
            const auth = useAuthStore.getState();
            const created = await createNote({
              title: n.title,
              content: n.content,
              isPinned: n.isPinned,
            });
            const backendNote = fromBackendNote(created, auth.userIdMap);
            set((state) => ({
              notes: sortForDisplay(
                state.notes.filter((x) => x.id !== n.id).concat([backendNote])
              ),
            }));
            console.log(`[NoteStore] 🔁 Retry createNote succeeded: ${n.id} → ${backendNote.id}`);
          } catch (err) {
            console.warn(`[NoteStore] Retry createNote failed for ${n.id}:`, err);
          }
        }

        // 全量拉取覆盖
        await get().syncFromBackend();
      },
    }),
    {
      name: 'duo-note-storage',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
