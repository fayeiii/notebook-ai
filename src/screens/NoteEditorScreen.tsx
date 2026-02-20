/**
 * 笔记编辑页面
 * 块编辑器 - 文字+图片无缝交错，整页书写体验
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ActionSheetIOS,
  Dimensions,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Attachment, AttachmentType } from '../types';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';
import { useNotesStore } from '../store/useNotesStore';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

type Props = NativeStackScreenProps<RootStackParamList, 'NoteEditor'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ─── 块类型定义 ───────────────────────────────────────────────────────────────

type TextBlock = { id: string; kind: 'text'; text: string };
type MediaBlock = { id: string; kind: 'media'; attachment: Attachment };
type Block = TextBlock | MediaBlock;

const uid = () => Math.random().toString(36).slice(2, 10);

const buildBlocks = (content: string, attachments: Attachment[]): Block[] => {
  const blocks: Block[] = [{ id: 'b0', kind: 'text', text: content }];
  attachments.forEach((att) => {
    blocks.push({ id: att.id, kind: 'media', attachment: att });
    blocks.push({ id: uid(), kind: 'text', text: '' });
  });
  return blocks;
};

const extractText = (blocks: Block[]): string =>
  blocks
    .filter((b): b is TextBlock => b.kind === 'text')
    .map((b) => b.text)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const extractAttachments = (blocks: Block[]): Attachment[] =>
  blocks
    .filter((b): b is MediaBlock => b.kind === 'media')
    .map((b) => b.attachment);

// ─── 组件 ──────────────────────────────────────────────────────────────────────

const NoteEditorScreen: React.FC<Props> = ({ navigation, route }) => {
  const { noteId } = route.params;
  const { getNoteById, updateNote, deleteNote } = useNotesStore();

  const note = getNoteById(noteId || '');

  const [title, setTitle] = useState(note?.title || '');
  const [blocks, setBlocks] = useState<Block[]>(() =>
    buildBlocks(note?.content || '', note?.attachments || [])
  );
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  // 每个输入框的动态高度（key: block id 或 'title'）
  const [inputHeights, setInputHeights] = useState<Record<string, number>>({});

  const activeTextBlockId = useRef<string>('b0');
  const inputRefs = useRef<Map<string, TextInput | null>>(new Map());
  const scrollViewRef = useRef<ScrollView>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setHeight = useCallback((id: string, h: number) => {
    setInputHeights((prev) => (prev[id] === h ? prev : { ...prev, [id]: h }));
  }, []);

  // ── 保存 ────────────────────────────────────────────────────────────────────
  const doSave = useCallback(
    (t: string, b: Block[]) => {
      if (!noteId) return;
      updateNote(noteId, {
        title: t,
        content: extractText(b),
        attachments: extractAttachments(b),
      });
    },
    [noteId, updateNote]
  );

  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => doSave(title, blocks), 600);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [title, blocks, doSave]);

  // ── 键盘监听 ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const show = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hide = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const s1 = Keyboard.addListener(show, () => setIsKeyboardVisible(true));
    const s2 = Keyboard.addListener(hide, () => setIsKeyboardVisible(false));
    return () => { s1.remove(); s2.remove(); };
  }, []);

  // ── 保存并返回 ──────────────────────────────────────────────────────────────
  const handleSaveAndGoBack = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    doSave(title, blocks);
    navigation.goBack();
  }, [title, blocks, doSave, navigation]);

  // ── 导航栏 ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerLeft: () => (
        <TouchableOpacity
          onPress={handleSaveAndGoBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.headerBtn}
        >
          <Text style={styles.backIcon}>{'‹'}</Text>
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity
          onPress={handleSaveAndGoBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.confirmBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.confirmIcon}>{'✓'}</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, handleSaveAndGoBack]);

  // ── 清理空笔记 ──────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (noteId) {
        const n = getNoteById(noteId);
        if (n && !n.title.trim() && !n.content.trim() && n.attachments.length === 0) {
          deleteNote(noteId);
        }
      }
    };
  }, [noteId]);

  // ── 修改文字块 ──────────────────────────────────────────────────────────────
  const updateBlockText = useCallback((id: string, text: string) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id && b.kind === 'text' ? { ...b, text } : b))
    );
  }, []);

  // ── 插入媒体块 ──────────────────────────────────────────────────────────────
  const insertMediaBlock = useCallback((attachment: Attachment) => {
    const mediaBlock: MediaBlock = { id: attachment.id, kind: 'media', attachment };
    const afterId = uid();
    const afterTextBlock: TextBlock = { id: afterId, kind: 'text', text: '' };

    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === activeTextBlockId.current);
      const insertAt = idx >= 0 ? idx + 1 : prev.length;
      const next = [...prev];
      next.splice(insertAt, 0, mediaBlock, afterTextBlock);
      return next;
    });

    setTimeout(() => {
      inputRefs.current.get(afterId)?.focus();
      activeTextBlockId.current = afterId;
    }, 150);
  }, []);

  // ── 删除媒体块 ──────────────────────────────────────────────────────────────
  const removeMediaBlock = useCallback((blockId: string) => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === blockId);
      if (idx < 0) return prev;
      const next = [...prev];
      const before = next[idx - 1];
      const after = next[idx + 1];
      if (before?.kind === 'text' && after?.kind === 'text') {
        const merged: TextBlock = {
          id: before.id,
          kind: 'text',
          text: before.text + (before.text && after.text ? '\n' : '') + after.text,
        };
        next.splice(idx - 1, 3, merged);
      } else {
        next.splice(idx, 1);
      }
      return next;
    });
  }, []);

  // ── 相机 ────────────────────────────────────────────────────────────────────
  const handleCamera = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { Alert.alert('权限不足', '请在设置中允许访问相机'); return; }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images', 'videos'], quality: 0.8 });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const type: AttachmentType = asset.type === 'video' ? 'video' : 'image';
        insertMediaBlock({
          id: uid(), type, uri: asset.uri,
          fileName: asset.fileName || `${type}_${Date.now()}`,
          fileSize: asset.fileSize, mimeType: asset.mimeType,
          duration: asset.duration ? asset.duration / 1000 : undefined,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (e) { console.log(e); }
  }, [insertMediaBlock]);

  // ── 相册 ────────────────────────────────────────────────────────────────────
  const handleImagePicker = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert('权限不足', '请在设置中允许访问相册'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'], quality: 0.8,
        allowsMultipleSelection: true, selectionLimit: 9,
      });
      if (!result.canceled && result.assets) {
        result.assets.forEach((asset) => {
          const type: AttachmentType = asset.type === 'video' ? 'video' : 'image';
          insertMediaBlock({
            id: uid(), type, uri: asset.uri,
            fileName: asset.fileName || `${type}_${Date.now()}`,
            fileSize: asset.fileSize, mimeType: asset.mimeType,
            duration: asset.duration ? asset.duration / 1000 : undefined,
            createdAt: new Date().toISOString(),
          });
        });
      }
    } catch (e) { console.log(e); }
  }, [insertMediaBlock]);

  // ── 文件 ────────────────────────────────────────────────────────────────────
  const handleDocumentPicker = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: true, copyToCacheDirectory: true });
      if (!result.canceled && result.assets) {
        result.assets.forEach((file) => {
          insertMediaBlock({
            id: uid(), type: 'file', uri: file.uri,
            fileName: file.name || `file_${Date.now()}`,
            fileSize: file.size || undefined,
            mimeType: file.mimeType || undefined,
            createdAt: new Date().toISOString(),
          });
        });
      }
    } catch (e) { console.log(e); }
  }, [insertMediaBlock]);

  const handleAudioRecord = useCallback(() => {
    Alert.alert('录音', '录音功能开发中，敬请期待');
  }, []);

  // ── 附件选择面板 ────────────────────────────────────────────────────────────
  const showAttachmentPicker = useCallback(() => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['取消', '拍照', '从相册选择', '选择文件', '录音'], cancelButtonIndex: 0 },
        (i) => {
          if (i === 1) handleCamera();
          else if (i === 2) handleImagePicker();
          else if (i === 3) handleDocumentPicker();
          else if (i === 4) handleAudioRecord();
        }
      );
    } else {
      Alert.alert('添加附件', '', [
        { text: '拍照', onPress: handleCamera },
        { text: '从相册选择', onPress: handleImagePicker },
        { text: '选择文件', onPress: handleDocumentPicker },
        { text: '取消', style: 'cancel' },
      ]);
    }
  }, [handleCamera, handleImagePicker, handleDocumentPicker, handleAudioRecord]);

  // ── 渲染媒体块 ──────────────────────────────────────────────────────────────
  const renderMediaBlock = (block: MediaBlock) => {
    const { attachment } = block;

    const onRemove = () =>
      Alert.alert('删除附件', '确定删除此附件？', [
        { text: '取消', style: 'cancel' },
        { text: '删除', style: 'destructive', onPress: () => removeMediaBlock(block.id) },
      ]);

    if (attachment.type === 'image') {
      return (
        <View key={block.id} style={styles.inlineMedia}>
          <Image source={{ uri: attachment.uri }} style={styles.inlineImage} resizeMode="cover" />
          <TouchableOpacity style={styles.removeButton} onPress={onRemove}>
            <Text style={styles.removeIcon}>{'✕'}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (attachment.type === 'video') {
      return (
        <View key={block.id} style={styles.inlineMedia}>
          <View style={[styles.inlineImage, styles.videoPlaceholder]}>
            <Text style={styles.videoPlayIcon}>{'▶️'}</Text>
            {attachment.duration && (
              <Text style={styles.videoDuration}>
                {Math.floor(attachment.duration / 60)}:{String(Math.floor(attachment.duration % 60)).padStart(2, '0')}
              </Text>
            )}
          </View>
          <TouchableOpacity style={styles.removeButton} onPress={onRemove}>
            <Text style={styles.removeIcon}>{'✕'}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View key={block.id} style={styles.inlineFile}>
        <Text style={styles.fileIcon}>{attachment.type === 'audio' ? '🎵' : '📎'}</Text>
        <View style={styles.fileInfo}>
          <Text style={styles.fileName} numberOfLines={1}>{attachment.fileName}</Text>
          {attachment.fileSize && (
            <Text style={styles.fileSize}>{formatFileSize(attachment.fileSize)}</Text>
          )}
        </View>
        <TouchableOpacity onPress={onRemove} style={styles.fileRemoveBtn}>
          <Text style={styles.fileRemoveIcon}>{'✕'}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ── 日期 ────────────────────────────────────────────────────────────────────
  const dateDisplay = note
    ? format(new Date(note.updatedAt), 'yyyy年M月d日 EEEE HH:mm', { locale: zhCN })
    : format(new Date(), 'yyyy年M月d日 EEEE HH:mm', { locale: zhCN });

  // ── 渲染 ────────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={88}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.dateText}>{dateDisplay}</Text>

        {/* 标题 */}
        <TextInput
          style={[
            styles.titleInput,
            webNoOutline as any,
            { height: Math.max(40, inputHeights['title'] || 0) },
          ]}
          placeholder="标题"
          placeholderTextColor={Colors.placeholderText}
          value={title}
          onChangeText={setTitle}
          multiline
          blurOnSubmit
          returnKeyType="next"
          onSubmitEditing={() => {
            const first = blocks.find((b) => b.kind === 'text') as TextBlock | undefined;
            if (first) inputRefs.current.get(first.id)?.focus();
          }}
          underlineColorAndroid="transparent"
          selectionColor={Colors.primary}
          onContentSizeChange={(e) => setHeight('title', e.nativeEvent.contentSize.height)}
        />

        {/* 块编辑区：文字块与媒体块交替排列 */}
        {blocks.map((block, index) => {
          if (block.kind === 'text') {
            const blockHeight = inputHeights[block.id];
            return (
              <TextInput
                key={block.id}
                ref={(r) => inputRefs.current.set(block.id, r)}
                style={[
                  styles.bodyInput,
                  webNoOutline as any,
                  { height: Math.max(200, blockHeight || 0) },
                ]}
                placeholder={index === 0 ? '开始记录...' : ''}
                placeholderTextColor={Colors.placeholderText}
                value={block.text}
                onChangeText={(t) => updateBlockText(block.id, t)}
                multiline
                textAlignVertical="top"
                scrollEnabled={false}
                underlineColorAndroid="transparent"
                selectionColor={Colors.primary}
                onFocus={() => { activeTextBlockId.current = block.id; }}
                onContentSizeChange={(e) => setHeight(block.id, e.nativeEvent.contentSize.height)}
              />
            );
          }
          return renderMediaBlock(block);
        })}

        {/* 底部空白区域：点击聚焦最后一个文字块，实现无限纸张 */}
        <Pressable
          style={styles.bottomTapArea}
          onPress={() => {
            const last = [...blocks].reverse().find((b) => b.kind === 'text') as TextBlock | undefined;
            if (last) inputRefs.current.get(last.id)?.focus();
          }}
        />
      </ScrollView>

      {/* 底部工具栏 */}
      <View style={[styles.toolbar, isKeyboardVisible && styles.toolbarKeyboard]}>
        <View style={styles.toolbarLeft}>
          <TouchableOpacity style={styles.toolButton} onPress={showAttachmentPicker}>
            <Text style={styles.toolIcon}>📎</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolButton} onPress={handleCamera}>
            <Text style={styles.toolIcon}>📷</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolButton} onPress={handleImagePicker}>
            <Text style={styles.toolIcon}>🖼</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolButton} onPress={handleAudioRecord}>
            <Text style={styles.toolIcon}>🎙</Text>
          </TouchableOpacity>
        </View>
        {isKeyboardVisible && (
          <TouchableOpacity style={styles.dismissButton} onPress={() => Keyboard.dismiss()}>
            <Text style={styles.dismissText}>完成</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

// Web 专用：消除 textarea 默认 outline / border / 内部滚动
const webNoOutline = Platform.OS === 'web'
  ? { outline: 'none', resize: 'none', overflow: 'hidden', border: 'none', boxShadow: 'none', WebkitAppearance: 'none' }
  : {};

// ─── 样式 ──────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondaryGroupedBackground,
  },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: 120,
    flexGrow: 1,
  },

  headerBtn: { padding: 4 },
  backIcon: {
    fontSize: 32,
    color: Colors.primary,
    fontWeight: '300' as any,
    lineHeight: 34,
  },
  confirmBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  confirmIcon: {
    fontSize: 18, color: Colors.white,
    fontWeight: Typography.weights.bold,
  },

  dateText: {
    fontSize: Typography.sizes.footnote,
    color: Colors.tertiaryLabel,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },

  // 标题 - 完全透明无边框，高度由 onContentSizeChange 动态控制
  titleInput: {
    fontSize: Typography.sizes.title2,
    fontWeight: Typography.weights.bold,
    color: Colors.label,
    padding: 0,
    margin: 0,
    marginBottom: 4,
    borderWidth: 0,
    backgroundColor: 'transparent',
    minHeight: 40,
  },

  // 正文文字块 - 完全透明无边框，高度由 onContentSizeChange 动态控制
  bodyInput: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.regular,
    color: Colors.label,
    lineHeight: 26,
    padding: 0,
    margin: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    minHeight: 200,   // 初始给足够高度，之后由内容撑开
  },

  // 内联图片/视频
  inlineMedia: {
    marginVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  inlineImage: {
    width: '100%',
    height: (SCREEN_WIDTH - Spacing.xl * 2) * 0.65,
    borderRadius: BorderRadius.md,
  },
  videoPlaceholder: {
    backgroundColor: Colors.tertiaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlayIcon: { fontSize: 40 },
  videoDuration: {
    position: 'absolute', bottom: 8, right: 8,
    fontSize: Typography.sizes.caption2,
    color: Colors.white,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 4, overflow: 'hidden',
  },
  removeButton: {
    position: 'absolute', top: 8, right: 8,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center',
  },
  removeIcon: {
    fontSize: 13, color: Colors.white,
    fontWeight: Typography.weights.bold,
  },

  // 内联文件
  inlineFile: {
    flexDirection: 'row', alignItems: 'center',
    marginVertical: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.tertiaryBackground,
    borderRadius: BorderRadius.sm,
  },
  fileIcon: { fontSize: 28, marginRight: Spacing.md },
  fileInfo: { flex: 1 },
  fileName: {
    fontSize: Typography.sizes.subhead,
    fontWeight: Typography.weights.medium,
    color: Colors.label,
  },
  fileSize: {
    fontSize: Typography.sizes.caption1,
    color: Colors.tertiaryLabel, marginTop: 2,
  },
  fileRemoveBtn: { padding: 4 },
  fileRemoveIcon: { fontSize: 16, color: Colors.tertiaryLabel },

  // 底部空白 - 点击继续写
  bottomTapArea: { flexGrow: 1, minHeight: 400 },

  // 工具栏
  toolbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 34 : Spacing.lg,
    backgroundColor: Colors.secondaryGroupedBackground,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.opaqueSeparator,
  },
  toolbarKeyboard: { paddingBottom: Spacing.md },
  toolbarLeft: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xl,
  },
  toolButton: { padding: Spacing.sm },
  toolIcon: { fontSize: 24 },
  dismissButton: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg },
  dismissText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
    color: Colors.primary,
  },
});

export default NoteEditorScreen;

