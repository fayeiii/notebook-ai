/**
 * 笔记编辑页面
 * Apple 备忘录风格 - 支持文字输入和附件管理
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
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
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../theme';
import { useNotesStore } from '../store/useNotesStore';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

type Props = NativeStackScreenProps<RootStackParamList, 'NoteEditor'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ATTACHMENT_SIZE = (SCREEN_WIDTH - Spacing.xl * 2 - Spacing.sm * 2) / 3;

/** 附件类型图标 */
const ATTACHMENT_ICONS: Record<AttachmentType, string> = {
  image: '🖼️',
  video: '🎬',
  audio: '🎵',
  file: '📎',
};

/** 文件大小格式化 */
const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const NoteEditorScreen: React.FC<Props> = ({ navigation, route }) => {
  const { noteId, folderId } = route.params;
  const { getNoteById, updateNote, addAttachment, removeAttachment, deleteNote } =
    useNotesStore();

  const note = getNoteById(noteId || '');
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const contentInputRef = useRef<TextInput>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 自动保存
  useEffect(() => {
    if (!noteId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      updateNote(noteId, { title, content });
    }, 500);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [title, content, noteId, updateNote]);

  // 键盘监听
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setIsKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // 配置导航栏
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={handleShare}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.headerBtn}
          >
            <Text style={styles.headerIcon}>📤</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleMore}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.headerBtn}
          >
            <Text style={styles.headerIcon}>⋯</Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, noteId]);

  // 离开页面时保存 & 清理空笔记
  useEffect(() => {
    return () => {
      if (noteId) {
        const currentNote = getNoteById(noteId);
        if (
          currentNote &&
          !currentNote.title.trim() &&
          !currentNote.content.trim() &&
          currentNote.attachments.length === 0
        ) {
          deleteNote(noteId);
        }
      }
    };
  }, [noteId]);

  const handleShare = useCallback(() => {
    Alert.alert('分享', '选择分享方式', [
      { text: '复制文本', onPress: () => {} },
      { text: '导出 PDF', onPress: () => {} },
      { text: '取消', style: 'cancel' },
    ]);
  }, []);

  const handleMore = useCallback(() => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['取消', '置顶', '移到其他文件夹', '删除'],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 3,
        },
        (buttonIndex) => {
          if (buttonIndex === 3 && noteId) {
            Alert.alert('删除笔记', '确定要删除吗？', [
              { text: '取消', style: 'cancel' },
              {
                text: '删除',
                style: 'destructive',
                onPress: () => {
                  deleteNote(noteId);
                  navigation.goBack();
                },
              },
            ]);
          }
        }
      );
    } else {
      Alert.alert('操作', '选择操作', [
        { text: '删除', style: 'destructive', onPress: () => {
          if (noteId) {
            deleteNote(noteId);
            navigation.goBack();
          }
        }},
        { text: '取消', style: 'cancel' },
      ]);
    }
  }, [noteId, deleteNote, navigation]);

  // ========== 附件相关 ==========

  const showAttachmentPicker = useCallback(() => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['取消', '拍照', '从相册选择', '选择文件', '录音'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          switch (buttonIndex) {
            case 1:
              handleCamera();
              break;
            case 2:
              handleImagePicker();
              break;
            case 3:
              handleDocumentPicker();
              break;
            case 4:
              handleAudioRecord();
              break;
          }
        }
      );
    } else {
      Alert.alert('添加附件', '选择添加方式', [
        { text: '拍照', onPress: handleCamera },
        { text: '从相册选择', onPress: handleImagePicker },
        { text: '选择文件', onPress: handleDocumentPicker },
        { text: '录音', onPress: handleAudioRecord },
        { text: '取消', style: 'cancel' },
      ]);
    }
  }, [noteId]);

  const handleCamera = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('权限不足', '请在设置中允许访问相机');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images', 'videos'],
        quality: 0.8,
        videoQuality: 1,
      });
      if (!result.canceled && result.assets && noteId) {
        const asset = result.assets[0];
        const type: AttachmentType = asset.type === 'video' ? 'video' : 'image';
        addAttachment(noteId, {
          type,
          uri: asset.uri,
          fileName: asset.fileName || `${type}_${Date.now()}`,
          fileSize: asset.fileSize,
          mimeType: asset.mimeType,
          duration: asset.duration ? asset.duration / 1000 : undefined,
        });
      }
    } catch (error) {
      console.log('Camera error:', error);
    }
  }, [noteId, addAttachment]);

  const handleImagePicker = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('权限不足', '请在设置中允许访问相册');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: 9,
      });
      if (!result.canceled && result.assets && noteId) {
        result.assets.forEach((asset) => {
          const type: AttachmentType = asset.type === 'video' ? 'video' : 'image';
          addAttachment(noteId, {
            type,
            uri: asset.uri,
            fileName: asset.fileName || `${type}_${Date.now()}`,
            fileSize: asset.fileSize,
            mimeType: asset.mimeType,
            duration: asset.duration ? asset.duration / 1000 : undefined,
          });
        });
      }
    } catch (error) {
      console.log('Image picker error:', error);
    }
  }, [noteId, addAttachment]);

  const handleDocumentPicker = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && noteId) {
        result.assets.forEach((file) => {
          addAttachment(noteId, {
            type: 'file',
            uri: file.uri,
            fileName: file.name || `file_${Date.now()}`,
            fileSize: file.size || undefined,
            mimeType: file.mimeType || undefined,
          });
        });
      }
    } catch (error) {
      console.log('Document picker error:', error);
    }
  }, [noteId, addAttachment]);

  const handleAudioRecord = useCallback(() => {
    // 录音功能占位 - 实际需接入 react-native-audio-recorder-player
    Alert.alert('录音', '录音功能开发中，敬请期待');
  }, []);

  const handleRemoveAttachment = useCallback(
    (attachmentId: string) => {
      Alert.alert('删除附件', '确定要删除这个附件吗？', [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => noteId && removeAttachment(noteId, attachmentId),
        },
      ]);
    },
    [noteId, removeAttachment]
  );

  const renderAttachment = useCallback(
    (attachment: Attachment) => {
      if (attachment.type === 'image') {
        return (
          <TouchableOpacity
            key={attachment.id}
            style={styles.imageAttachment}
            onLongPress={() => handleRemoveAttachment(attachment.id)}
            activeOpacity={0.8}
          >
            <Image
              source={{ uri: attachment.uri }}
              style={styles.attachmentImage}
              resizeMode="cover"
            />
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => handleRemoveAttachment(attachment.id)}
            >
              <Text style={styles.removeIcon}>✕</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        );
      }

      if (attachment.type === 'video') {
        return (
          <TouchableOpacity
            key={attachment.id}
            style={styles.imageAttachment}
            onLongPress={() => handleRemoveAttachment(attachment.id)}
            activeOpacity={0.8}
          >
            <View style={[styles.attachmentImage, styles.videoPlaceholder]}>
              <Text style={styles.videoPlayIcon}>▶️</Text>
              {attachment.duration && (
                <Text style={styles.videoDuration}>
                  {Math.floor(attachment.duration / 60)}:{String(Math.floor(attachment.duration % 60)).padStart(2, '0')}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => handleRemoveAttachment(attachment.id)}
            >
              <Text style={styles.removeIcon}>✕</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        );
      }

      // 文件/音频 - 列表样式
      return (
        <TouchableOpacity
          key={attachment.id}
          style={styles.fileAttachment}
          onLongPress={() => handleRemoveAttachment(attachment.id)}
          activeOpacity={0.7}
        >
          <Text style={styles.fileIcon}>{ATTACHMENT_ICONS[attachment.type]}</Text>
          <View style={styles.fileInfo}>
            <Text style={styles.fileName} numberOfLines={1}>
              {attachment.fileName}
            </Text>
            {attachment.fileSize && (
              <Text style={styles.fileSize}>{formatFileSize(attachment.fileSize)}</Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.fileRemoveBtn}
            onPress={() => handleRemoveAttachment(attachment.id)}
          >
            <Text style={styles.fileRemoveIcon}>✕</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      );
    },
    [handleRemoveAttachment]
  );

  // 分离图片/视频附件和文件/音频附件
  const mediaAttachments = note?.attachments.filter(
    (a) => a.type === 'image' || a.type === 'video'
  ) || [];
  const fileAttachments = note?.attachments.filter(
    (a) => a.type === 'file' || a.type === 'audio'
  ) || [];

  const dateDisplay = note
    ? format(new Date(note.updatedAt), 'yyyy年M月d日 EEEE HH:mm', { locale: zhCN })
    : format(new Date(), 'yyyy年M月d日 EEEE HH:mm', { locale: zhCN });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={88}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        {/* 日期显示 */}
        <Text style={styles.dateText}>{dateDisplay}</Text>

        {/* 标题输入 */}
        <TextInput
          style={styles.titleInput}
          placeholder="标题"
          placeholderTextColor={Colors.placeholderText}
          value={title}
          onChangeText={setTitle}
          multiline={false}
          returnKeyType="next"
          onSubmitEditing={() => contentInputRef.current?.focus()}
          blurOnSubmit={true}
        />

        {/* 正文输入 */}
        <TextInput
          ref={contentInputRef}
          style={styles.contentInput}
          placeholder="开始记录..."
          placeholderTextColor={Colors.placeholderText}
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
          scrollEnabled={false}
        />

        {/* 图片/视频附件网格 */}
        {mediaAttachments.length > 0 && (
          <View style={styles.mediaGrid}>
            {mediaAttachments.map(renderAttachment)}
          </View>
        )}

        {/* 文件/音频附件列表 */}
        {fileAttachments.length > 0 && (
          <View style={styles.fileList}>
            {fileAttachments.map(renderAttachment)}
          </View>
        )}
      </ScrollView>

      {/* 底部工具栏 */}
      <View
        style={[
          styles.toolbar,
          isKeyboardVisible && styles.toolbarKeyboard,
        ]}
      >
        <View style={styles.toolbarLeft}>
          <TouchableOpacity style={styles.toolButton} onPress={showAttachmentPicker}>
            <Text style={styles.toolIcon}>📎</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolButton} onPress={handleCamera}>
            <Text style={styles.toolIcon}>📷</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolButton} onPress={handleImagePicker}>
            <Text style={styles.toolIcon}>🖼️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolButton} onPress={handleAudioRecord}>
            <Text style={styles.toolIcon}>🎙️</Text>
          </TouchableOpacity>
        </View>

        {isKeyboardVisible && (
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={() => Keyboard.dismiss()}
          >
            <Text style={styles.dismissText}>完成</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondaryGroupedBackground,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: 120,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  headerBtn: {
    padding: 4,
  },
  headerIcon: {
    fontSize: 20,
  },
  dateText: {
    fontSize: Typography.sizes.footnote,
    color: Colors.tertiaryLabel,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  titleInput: {
    fontSize: Typography.sizes.title2,
    fontWeight: Typography.weights.bold,
    color: Colors.label,
    paddingVertical: Spacing.sm,
    minHeight: 40,
  },
  contentInput: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.regular,
    color: Colors.label,
    lineHeight: 26,
    paddingVertical: Spacing.sm,
    minHeight: 200,
  },

  // 图片/视频网格
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  imageAttachment: {
    width: ATTACHMENT_SIZE,
    height: ATTACHMENT_SIZE,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  attachmentImage: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    backgroundColor: Colors.tertiaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlayIcon: {
    fontSize: 32,
  },
  videoDuration: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    fontSize: Typography.sizes.caption2,
    color: Colors.white,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeIcon: {
    fontSize: 12,
    color: Colors.white,
    fontWeight: Typography.weights.bold,
  },

  // 文件列表
  fileList: {
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  fileAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.tertiaryBackground,
    borderRadius: BorderRadius.sm,
  },
  fileIcon: {
    fontSize: 28,
    marginRight: Spacing.md,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: Typography.sizes.subhead,
    fontWeight: Typography.weights.medium,
    color: Colors.label,
  },
  fileSize: {
    fontSize: Typography.sizes.caption1,
    color: Colors.tertiaryLabel,
    marginTop: 2,
  },
  fileRemoveBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileRemoveIcon: {
    fontSize: 14,
    color: Colors.tertiaryLabel,
  },

  // 底部工具栏
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 34 : Spacing.lg,
    backgroundColor: Colors.secondaryGroupedBackground,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.opaqueSeparator,
  },
  toolbarKeyboard: {
    paddingBottom: Spacing.md,
  },
  toolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xl,
  },
  toolButton: {
    padding: Spacing.sm,
  },
  toolIcon: {
    fontSize: 24,
  },
  dismissButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  dismissText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
    color: Colors.primary,
  },
});

export default NoteEditorScreen;
