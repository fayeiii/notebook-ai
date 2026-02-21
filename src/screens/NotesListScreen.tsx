/**
 * 笔记列表页面
 * Apple 备忘录风格 - 笔记列表展示
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Platform,
  TextInput,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Note } from '../types';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../theme';
import { useNotesStore } from '../store/useNotesStore';
import { format, isToday, isYesterday, isThisWeek, isThisYear } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import { formatNotesForAI, printForAI } from '../utils/formatForAI';

type Props = NativeStackScreenProps<RootStackParamList, 'NotesList'>;

/** 格式化日期显示 */
const formatNoteDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  if (isToday(date)) {
    return format(date, 'HH:mm');
  }
  if (isYesterday(date)) {
    return '昨天';
  }
  if (isThisWeek(date, { weekStartsOn: 1 })) {
    return format(date, 'EEEE', { locale: zhCN });
  }
  if (isThisYear(date)) {
    return format(date, 'M月d日');
  }
  return format(date, 'yyyy/M/d');
};

/** 获取笔记预览文本 */
const getNotePreview = (note: Note): string => {
  const content = note.content.trim();
  if (!content && note.attachments.length > 0) {
    const types: Record<string, string> = {
      image: '图片',
      video: '视频',
      audio: '录音',
      file: '文件',
    };
    return note.attachments.map((a) => types[a.type] || '附件').join('、');
  }
  // 如果有标题，取正文作为预览；否则取第一行之后的内容
  if (note.title.trim()) {
    // 有标题时，正文整体作为预览
    return content.substring(0, 80).replace(/\n/g, ' ') || '无其他内容';
  }
  // 无标题时，第一行当标题，剩余内容作为预览
  const lines = content.split('\n');
  const rest = lines.slice(1).join(' ').trim();
  return rest.substring(0, 80) || '无其他内容';
};

/** 获取笔记标题 */
const getNoteTitle = (note: Note): string => {
  if (note.title.trim()) return note.title;
  const firstLine = note.content.split('\n')[0]?.trim();
  if (firstLine) return firstLine;
  return '新建笔记';
};

const NotesListScreen: React.FC<Props> = ({ navigation, route }) => {
  const { folderId, folderName } = route.params;
  const { getNotesInFolder, addNote, deleteNote, togglePinNote, folders, moveNote } =
    useNotesStore();
  // 订阅 notes 数组变化，确保返回时列表能刷新
  const allNotes = useNotesStore((state) => state.notes);

  const notes = useMemo(() => getNotesInFolder(folderId), [getNotesInFolder, folderId, allNotes]);

  const [searchQuery, setSearchQuery] = useState('');

  // 过滤后的笔记列表
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const q = searchQuery.toLowerCase();
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q)
    );
  }, [notes, searchQuery]);

  // 打印给 AI（调试用，在控制台查看输出）
  const handlePrintForAI = useCallback(() => {
    const data = formatNotesForAI(filteredNotes);
    printForAI(data, `当前文件夹 AI 输入 (${folderName}, ${filteredNotes.length} 条)`);
  }, [filteredNotes, folderName]);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={handlePrintForAI} style={styles.debugBtn}>
          <Text style={styles.debugBtnText}>打印</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, handlePrintForAI]);

  const handleCreateNote = useCallback(() => {
    const targetFolderId = folderId === 'all-notes' ? 'default' : folderId;
    const note = addNote(targetFolderId);
    navigation.navigate('NoteEditor', { noteId: note.id, folderId: targetFolderId });
  }, [folderId, addNote, navigation]);

  const handleNotePress = useCallback(
    (noteId: string) => {
      navigation.navigate('NoteEditor', { noteId, folderId });
    },
    [navigation, folderId]
  );

  const handleDeleteNote = useCallback(
    (noteId: string) => {
      Alert.alert('删除笔记', '确定要删除这条笔记吗？', [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => deleteNote(noteId),
        },
      ]);
    },
    [deleteNote]
  );

  const handleNoteAction = useCallback(
    (note: Note) => {
      const otherFolders = folders.filter(
        (f) => f.id !== 'all-notes' && f.id !== note.folderId
      );

      const moveOptions = otherFolders.map((f) => ({
        text: `移至「${f.name}」`,
        onPress: () => moveNote(note.id, f.id),
      }));

      Alert.alert(getNoteTitle(note), '选择操作', [
        {
          text: note.isPinned ? '取消置顶' : '置顶',
          onPress: () => togglePinNote(note.id),
        },
        ...moveOptions,
        {
          text: '删除',
          style: 'destructive',
          onPress: () => handleDeleteNote(note.id),
        },
        { text: '取消', style: 'cancel' },
      ]);
    },
    [folders, moveNote, togglePinNote, handleDeleteNote]
  );

  const renderNoteItem = useCallback(
    ({ item: note, index }: { item: Note; index: number }) => {
      const title = getNoteTitle(note);
      const preview = getNotePreview(note);
      const dateStr = formatNoteDate(note.updatedAt);
      const hasAttachments = note.attachments.length > 0;

      return (
        <TouchableOpacity
          style={[
            styles.noteItem,
            index === 0 && styles.noteItemFirst,
            index === filteredNotes.length - 1 && styles.noteItemLast,
          ]}
          activeOpacity={0.6}
          onPress={() => handleNotePress(note.id)}
          onLongPress={() => handleNoteAction(note)}
        >
          <View style={styles.noteContent}>
            <View style={styles.noteHeader}>
              <Text style={styles.noteTitle} numberOfLines={1}>
                {note.isPinned ? '📌 ' : ''}
                {title}
              </Text>
            </View>
            <View style={styles.noteSubline}>
              <Text style={styles.noteDate}>{dateStr}</Text>
              <Text style={styles.notePreview} numberOfLines={1}>
                {hasAttachments ? '📎 ' : ''}
                {preview}
              </Text>
            </View>
          </View>
          {/* 图片缩略图 */}
          {note.attachments.some((a) => a.type === 'image') && (
            <View style={styles.thumbnailPlaceholder}>
              <Text style={styles.thumbnailIcon}>🖼️</Text>
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [filteredNotes.length, handleNotePress, handleNoteAction]
  );

  const renderSeparator = useCallback(
    () => <View style={styles.separator} />,
    []
  );

  const renderEmpty = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📝</Text>
        <Text style={styles.emptyTitle}>没有笔记</Text>
        <Text style={styles.emptySubtitle}>点击右上角开始创建</Text>
      </View>
    ),
    []
  );

  return (
    <View style={styles.container}>
      {/* 搜索栏 */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={Colors.tertiaryLabel} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="搜索笔记"
            placeholderTextColor={Colors.placeholderText}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {!!searchQuery && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClear}>
              <Ionicons name="close-circle" size={16} color={Colors.tertiaryLabel} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filteredNotes}
        renderItem={renderNoteItem}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={renderSeparator}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          filteredNotes.length === 0 && styles.emptyListContent,
        ]}
        contentInsetAdjustmentBehavior="automatic"
      />

      {/* 底部新建按钮 */}
      <View style={styles.bottomBar}>
        <Text style={styles.noteCountText}>
          {notes.length > 0 ? `${notes.length} 条笔记` : ''}
        </Text>
        <TouchableOpacity style={styles.composeButton} onPress={handleCreateNote}>
          <Text style={styles.composeIcon}>✏️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.groupedBackground,
  },
  searchContainer: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.groupedBackground,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondarySystemFill,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    height: 36,
  },
  searchIcon: {
    marginRight: Spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.sizes.body,
    color: Colors.label,
    padding: 0,
    height: 36,
  },
  searchClear: {
    padding: 2,
    marginLeft: Spacing.xs,
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: 100,
  },
  emptyListContent: {
    flex: 1,
    justifyContent: 'center',
  },
  headerButton: {
    fontSize: 20,
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.secondaryGroupedBackground,
    minHeight: 68,
  },
  noteItemFirst: {
    borderTopLeftRadius: BorderRadius.md,
    borderTopRightRadius: BorderRadius.md,
  },
  noteItemLast: {
    borderBottomLeftRadius: BorderRadius.md,
    borderBottomRightRadius: BorderRadius.md,
  },
  noteContent: {
    flex: 1,
    marginRight: Spacing.md,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  noteTitle: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
    color: Colors.label,
    flex: 1,
  },
  noteSubline: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noteDate: {
    fontSize: Typography.sizes.subhead,
    fontWeight: Typography.weights.regular,
    color: Colors.tertiaryLabel,
    marginRight: Spacing.sm,
  },
  notePreview: {
    fontSize: Typography.sizes.subhead,
    fontWeight: Typography.weights.regular,
    color: Colors.tertiaryLabel,
    flex: 1,
  },
  thumbnailPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.tertiaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailIcon: {
    fontSize: 22,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.opaqueSeparator,
    marginLeft: Spacing.lg,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: Typography.sizes.title3,
    fontWeight: Typography.weights.semibold,
    color: Colors.label,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: Typography.sizes.subhead,
    color: Colors.tertiaryLabel,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 34 : Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: Colors.groupedBackground,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.opaqueSeparator,
  },
  noteCountText: {
    fontSize: Typography.sizes.footnote,
    color: Colors.tertiaryLabel,
  },
  composeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.medium,
  },
  composeIcon: {
    fontSize: 20,
  },
  debugBtn: {
    padding: 8,
  },
  debugBtnText: {
    fontSize: 13,
    color: Colors.tertiaryLabel,
  },
});

export default NotesListScreen;
