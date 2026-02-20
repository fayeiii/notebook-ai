/**
 * 数据类型定义
 */

/** 附件类型 */
export type AttachmentType = 'image' | 'video' | 'audio' | 'file';

/** 附件数据 */
export interface Attachment {
  id: string;
  type: AttachmentType;
  uri: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  duration?: number; // 音频/视频时长（秒）
  thumbnailUri?: string;
  createdAt: string;
}

/** 日记笔记 */
export interface Note {
  id: string;
  folderId: string;
  title: string;
  content: string;
  attachments: Attachment[];
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 文件夹 */
export interface Folder {
  id: string;
  name: string;
  icon: string;
  color: string;
  isPinned: boolean;
  isDefault: boolean; // 默认文件夹不可删除
  createdAt: string;
  updatedAt: string;
}

/** 排序方式 */
export type SortType = 'updatedAt' | 'createdAt' | 'title';
export type SortOrder = 'asc' | 'desc';

/** 导航参数类型 */
export type RootStackParamList = {
  Folders: undefined;
  NotesList: { folderId: string; folderName: string };
  NoteEditor: { noteId?: string; folderId: string };
};
