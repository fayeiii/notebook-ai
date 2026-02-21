/**
 * 将日记格式化为 AI 分析用输入
 * 仅包含元数据（如 fileName），不含 base64 以节省 token
 */

import { Note, Attachment, AttachmentForAI, NoteForAI, BlockForAI, StoredBlock } from '../types';

/** 格式化单个附件（仅元数据） */
function formatAttachmentForAI(a: Attachment): AttachmentForAI {
  return {
    id: a.id,
    type: a.type,
    fileName: a.fileName,
    fileSize: a.fileSize,
    mimeType: a.mimeType,
    duration: a.duration,
  };
}

/** 单条笔记的 AI 输入格式（blocks 保留图片在正文中的位置） */
export function formatNoteForAI(note: Note, blocksOverride?: StoredBlock[]): NoteForAI {
  const attachments = note.attachments.map(formatAttachmentForAI);
  const attachmentMap = new Map(attachments.map((a) => [a.id, a]));

  const storedBlocks = blocksOverride ?? note.blocks;
  let blocks: BlockForAI[] | undefined;
  if (storedBlocks && storedBlocks.length > 0) {
    blocks = storedBlocks.map((b) => {
      if (b.kind === 'text') return { kind: 'text' as const, text: b.text };
      const att = attachmentMap.get(b.attachment.id) ?? formatAttachmentForAI(b.attachment);
      return { kind: 'media' as const, attachment: att };
    });
  }

  return {
    id: note.id,
    folderId: note.folderId,
    title: note.title,
    content: note.content,
    blocks,
    attachments,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}

/** 多条笔记的 AI 输入格式 */
export function formatNotesForAI(notes: Note[]): { notes: NoteForAI[]; totalCount: number } {
  return {
    notes: notes.map((n) => formatNoteForAI(n)),
    totalCount: notes.length,
  };
}

/** 打印到控制台，便于调试 */
export function printForAI(data: object, label = 'AI 输入'): void {
  const json = JSON.stringify(data, null, 2);
  console.log(`\n========== ${label} ==========\n${json}\n====================================\n`);
}
