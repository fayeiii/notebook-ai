/**
 * 将日记格式化为 AI 分析用输入
 * 图片转为 base64，便于 AI 直接分析
 */

import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { Note, Attachment } from '../types';

/** 将图片 URI 转为 base64 data URI */
async function uriToBase64(uri: string, mimeType?: string): Promise<string | null> {
  try {
    if (uri.startsWith('data:')) return uri;
    if (Platform.OS === 'web' && (uri.startsWith('blob:') || uri.startsWith('http'))) {
      const res = await fetch(uri);
      const blob = await res.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const mime = mimeType || 'image/jpeg';
    return `data:${mime};base64,${base64}`;
  } catch {
    return null;
  }
}

/** 格式化单个附件（图片转 base64 data URI） */
async function formatAttachmentForAI(a: Attachment): Promise<object> {
  const base: Record<string, unknown> = {
    id: a.id,
    type: a.type,
    fileName: a.fileName,
    fileSize: a.fileSize,
    mimeType: a.mimeType,
    duration: a.duration,
  };
  if (a.type === 'image' && a.uri) {
    const dataUri = await uriToBase64(a.uri, a.mimeType);
    base.base64 = dataUri; // data:image/jpeg;base64,xxx 格式，AI 可直接使用
    if (!dataUri) base.uri = a.uri;
  } else {
    base.uri = a.uri;
  }
  return base;
}

/** 单条笔记的 AI 输入格式（图片为 base64） */
export async function formatNoteForAI(note: Note): Promise<object> {
  const attachments = await Promise.all(note.attachments.map(formatAttachmentForAI));
  return {
    id: note.id,
    folderId: note.folderId,
    title: note.title,
    content: note.content,
    attachments,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}

/** 多条笔记的 AI 输入格式 */
export async function formatNotesForAI(notes: Note[]): Promise<object> {
  const formattedNotes = await Promise.all(notes.map(formatNoteForAI));
  return {
    notes: formattedNotes,
    totalCount: notes.length,
  };
}

/** 打印到控制台，便于调试 */
export function printForAI(data: object, label = 'AI 输入'): void {
  const json = JSON.stringify(data, null, 2);
  console.log(`\n========== ${label} ==========\n${json}\n====================================\n`);
}
