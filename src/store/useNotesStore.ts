/**
 * Zustand 状态管理
 * 管理文件夹和笔记的 CRUD 操作
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Folder, Note, Attachment, SortType, SortOrder } from '../types';

// 简易 UUID 生成
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
};

const now = () => new Date().toISOString();

/** 默认文件夹 */
const DEFAULT_FOLDERS: Folder[] = [
  {
    id: 'all-notes',
    name: '所有笔记',
    icon: 'doc.text',
    color: '#007AFF',
    isPinned: true,
    isDefault: true,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'default',
    name: '日记',
    icon: 'book',
    color: '#FF9500',
    isPinned: false,
    isDefault: true,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'work',
    name: '工作',
    icon: 'briefcase',
    color: '#34C759',
    isPinned: false,
    isDefault: false,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'life',
    name: '生活',
    icon: 'heart',
    color: '#FF2D55',
    isPinned: false,
    isDefault: false,
    createdAt: now(),
    updatedAt: now(),
  },
];

interface NotesState {
  folders: Folder[];
  notes: Note[];
  searchQuery: string;
  sortType: SortType;
  sortOrder: SortOrder;

  // 文件夹操作
  addFolder: (name: string, color: string, icon: string) => Folder;
  updateFolder: (id: string, updates: Partial<Omit<Folder, 'id' | 'isDefault' | 'createdAt'>>) => void;
  deleteFolder: (id: string) => void;
  togglePinFolder: (id: string) => void;

  // 笔记操作
  addNote: (folderId: string) => Note;
  updateNote: (id: string, updates: Partial<Omit<Note, 'id' | 'createdAt'>>) => void;
  deleteNote: (id: string) => void;
  togglePinNote: (id: string) => void;
  moveNote: (noteId: string, targetFolderId: string) => void;

  // 附件操作
  addAttachment: (noteId: string, attachment: Omit<Attachment, 'id' | 'createdAt'>) => void;
  removeAttachment: (noteId: string, attachmentId: string) => void;

  // 查询
  getNotesInFolder: (folderId: string) => Note[];
  getNoteById: (id: string) => Note | undefined;
  getFolderById: (id: string) => Folder | undefined;
  getNotesCount: (folderId: string) => number;
  searchNotes: (query: string) => Note[];

  // 设置
  setSearchQuery: (query: string) => void;
  setSortType: (type: SortType) => void;
  setSortOrder: (order: SortOrder) => void;
}

const sortNotes = (notes: Note[], sortType: SortType, sortOrder: SortOrder): Note[] => {
  const sorted = [...notes].sort((a, b) => {
    // 置顶的排在前面
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    let comparison = 0;
    switch (sortType) {
      case 'updatedAt':
        comparison = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        break;
      case 'createdAt':
        comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        break;
      case 'title':
        comparison = a.title.localeCompare(b.title, 'zh-CN');
        break;
    }
    return sortOrder === 'desc' ? comparison : -comparison;
  });
  return sorted;
};

export const useNotesStore = create<NotesState>()(
  persist(
    (set, get) => ({
      folders: DEFAULT_FOLDERS,
      notes: [],
      searchQuery: '',
      sortType: 'updatedAt',
      sortOrder: 'desc',

      // ========== 文件夹操作 ==========
      addFolder: (name, color, icon) => {
        const folder: Folder = {
          id: generateId(),
          name,
          icon,
          color,
          isPinned: false,
          isDefault: false,
          createdAt: now(),
          updatedAt: now(),
        };
        set((state) => ({ folders: [...state.folders, folder] }));
        return folder;
      },

      updateFolder: (id, updates) => {
        set((state) => ({
          folders: state.folders.map((f) =>
            f.id === id ? { ...f, ...updates, updatedAt: now() } : f
          ),
        }));
      },

      deleteFolder: (id) => {
        const state = get();
        const folder = state.folders.find((f) => f.id === id);
        if (folder?.isDefault) return; // 不能删除默认文件夹

        set((state) => ({
          folders: state.folders.filter((f) => f.id !== id),
          // 将该文件夹下的笔记移动到默认文件夹
          notes: state.notes.map((n) =>
            n.folderId === id ? { ...n, folderId: 'default', updatedAt: now() } : n
          ),
        }));
      },

      togglePinFolder: (id) => {
        set((state) => ({
          folders: state.folders.map((f) =>
            f.id === id ? { ...f, isPinned: !f.isPinned, updatedAt: now() } : f
          ),
        }));
      },

      // ========== 笔记操作 ==========
      addNote: (folderId) => {
        const note: Note = {
          id: generateId(),
          folderId,
          title: '',
          content: '',
          attachments: [],
          isPinned: false,
          createdAt: now(),
          updatedAt: now(),
        };
        set((state) => ({ notes: [note, ...state.notes] }));
        return note;
      },

      updateNote: (id, updates) => {
        set((state) => ({
          notes: state.notes.map((n) =>
            n.id === id ? { ...n, ...updates, updatedAt: now() } : n
          ),
        }));
      },

      deleteNote: (id) => {
        set((state) => ({
          notes: state.notes.filter((n) => n.id !== id),
        }));
      },

      togglePinNote: (id) => {
        set((state) => ({
          notes: state.notes.map((n) =>
            n.id === id ? { ...n, isPinned: !n.isPinned, updatedAt: now() } : n
          ),
        }));
      },

      moveNote: (noteId, targetFolderId) => {
        set((state) => ({
          notes: state.notes.map((n) =>
            n.id === noteId ? { ...n, folderId: targetFolderId, updatedAt: now() } : n
          ),
        }));
      },

      // ========== 附件操作 ==========
      addAttachment: (noteId, attachment) => {
        const newAttachment: Attachment = {
          ...attachment,
          id: generateId(),
          createdAt: now(),
        };
        set((state) => ({
          notes: state.notes.map((n) =>
            n.id === noteId
              ? {
                  ...n,
                  attachments: [...n.attachments, newAttachment],
                  updatedAt: now(),
                }
              : n
          ),
        }));
      },

      removeAttachment: (noteId, attachmentId) => {
        set((state) => ({
          notes: state.notes.map((n) =>
            n.id === noteId
              ? {
                  ...n,
                  attachments: n.attachments.filter((a) => a.id !== attachmentId),
                  updatedAt: now(),
                }
              : n
          ),
        }));
      },

      // ========== 查询 ==========
      getNotesInFolder: (folderId) => {
        const state = get();
        let notes: Note[];
        if (folderId === 'all-notes') {
          notes = state.notes;
        } else {
          notes = state.notes.filter((n) => n.folderId === folderId);
        }
        return sortNotes(notes, state.sortType, state.sortOrder);
      },

      getNoteById: (id) => {
        return get().notes.find((n) => n.id === id);
      },

      getFolderById: (id) => {
        return get().folders.find((f) => f.id === id);
      },

      getNotesCount: (folderId) => {
        if (folderId === 'all-notes') return get().notes.length;
        return get().notes.filter((n) => n.folderId === folderId).length;
      },

      searchNotes: (query) => {
        const state = get();
        if (!query.trim()) return [];
        const lowerQuery = query.toLowerCase();
        return state.notes.filter(
          (n) =>
            n.title.toLowerCase().includes(lowerQuery) ||
            n.content.toLowerCase().includes(lowerQuery)
        );
      },

      // ========== 设置 ==========
      setSearchQuery: (query) => set({ searchQuery: query }),
      setSortType: (type) => set({ sortType: type }),
      setSortOrder: (order) => set({ sortOrder: order }),
    }),
    {
      name: 'notebook-ai-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        folders: state.folders,
        notes: state.notes,
        sortType: state.sortType,
        sortOrder: state.sortOrder,
      }),
    }
  )
);
