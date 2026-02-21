/**
 * 将日记格式化为 AI 分析用输入
 * 用于调试：在控制台打印，验证输出格式
 */

import { Note } from '../types';

/** 单条笔记的 AI 输入格式（不含 uri 等本地路径，便于在控制台查看） */
export function formatNoteForAI(note: Note): object {
  return {
    id: note.id,
    folderId: note.folderId,
    title: note.title,
    content: note.content,
    attachments: note.attachments.map((a) => ({
      id: a.id,
      type: a.type,
      fileName: a.fileName,
      fileSize: a.fileSize,
      mimeType: a.mimeType,
      duration: a.duration,
      // uri 为本地路径，AI 无法直接访问，调试时可选择性包含
      uri: a.uri,
    })),
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}

/** 多条笔记的 AI 输入格式 */
export function formatNotesForAI(notes: Note[]): object {
  return {
    notes: notes.map(formatNoteForAI),
    totalCount: notes.length,
  };
}

/** 打印到控制台，便于调试 */
export function printForAI(data: object, label = 'AI 输入'): void {
  const json = JSON.stringify(data, null, 2);
  console.log(`\n========== ${label} ==========\n${json}\n====================================\n`);
}
