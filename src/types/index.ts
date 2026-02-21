/**
 * 数据类型定义
 */

/** 附件类型 */
export type AttachmentType = 'image' | 'video' | 'audio' | 'file';

/** 附件数据（存储格式，uri 为本地路径） */
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

/** AI 输入用的附件格式（仅元数据，不含 base64/uri 以节省 token） */
export interface AttachmentForAI {
  id: string;
  type: AttachmentType;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  duration?: number;
}

/** AI 输入用的块格式（保留文字与附件的交错顺序） */
export type BlockForAI =
  | { kind: 'text'; text: string }
  | { kind: 'media'; attachment: AttachmentForAI };

/** AI 输入用的笔记格式（blocks 保留图片位置） */
export interface NoteForAI {
  id: string;
  folderId: string;
  title: string;
  content: string;
  /** 块结构，保留文字与图片在正文中的交错顺序；无 blocks 时用 attachments */
  blocks?: BlockForAI[];
  attachments: AttachmentForAI[];
  createdAt: string;
  updatedAt: string;
}

/** 可序列化的块（用于持久化，保留文字与附件的交错顺序） */
export type StoredBlock =
  | { kind: 'text'; text: string }
  | { kind: 'media'; attachment: Attachment };

/** 日记笔记 */
export interface Note {
  id: string;
  folderId: string;
  title: string;
  content: string;
  attachments: Attachment[];
  /** 块结构，保留文字与附件的交错顺序；无此字段时用 content+attachments 兼容旧数据 */
  blocks?: StoredBlock[];
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
