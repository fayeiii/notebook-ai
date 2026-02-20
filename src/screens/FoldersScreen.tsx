/**
 * 文件夹列表页面
 * Apple 备忘录风格 - 文件夹管理
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Pressable,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../theme';
import { useNotesStore } from '../store/useNotesStore';

type Props = NativeStackScreenProps<RootStackParamList, 'Folders'>;

/** 文件夹图标映射 */
const FOLDER_ICONS: Record<string, string> = {
  'doc.text': '📄',
  book: '📔',
  briefcase: '💼',
  heart: '❤️',
  star: '⭐',
  flag: '🚩',
  tag: '🏷️',
  folder: '📁',
  lightbulb: '💡',
  graduationcap: '🎓',
};

const ICON_OPTIONS = Object.keys(FOLDER_ICONS);

const COLOR_OPTIONS = Colors.folderColors;

const FoldersScreen: React.FC<Props> = ({ navigation }) => {
  const { folders, getNotesCount, addFolder, deleteFolder, togglePinFolder } = useNotesStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [selectedIcon, setSelectedIcon] = useState('folder');

  // 分组：置顶 & 其他
  const pinnedFolders = folders.filter((f) => f.isPinned);
  const unpinnedFolders = folders.filter((f) => !f.isPinned);

  const handleCreateFolder = useCallback(() => {
    if (!newFolderName.trim()) {
      Alert.alert('提示', '请输入文件夹名称');
      return;
    }
    addFolder(newFolderName.trim(), selectedColor, selectedIcon);
    setModalVisible(false);
    setNewFolderName('');
    setSelectedColor(COLOR_OPTIONS[0]);
    setSelectedIcon('folder');
  }, [newFolderName, selectedColor, selectedIcon, addFolder]);

  const handleDeleteFolder = useCallback(
    (folderId: string, folderName: string) => {
      Alert.alert('删除文件夹', `确定要删除「${folderName}」吗？\n文件夹内的笔记将移至「日记」`, [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => deleteFolder(folderId),
        },
      ]);
    },
    [deleteFolder]
  );

  const handleFolderPress = useCallback(
    (folderId: string, folderName: string) => {
      navigation.navigate('NotesList', { folderId, folderName });
    },
    [navigation]
  );

  const renderFolderItem = useCallback(
    ({ item: folder }: { item: typeof folders[0] }) => {
      const count = getNotesCount(folder.id);
      return (
        <TouchableOpacity
          style={styles.folderItem}
          activeOpacity={0.6}
          onPress={() => handleFolderPress(folder.id, folder.name)}
          onLongPress={() => {
            if (!folder.isDefault || folder.id !== 'all-notes') {
              Alert.alert(folder.name, '选择操作', [
                {
                  text: folder.isPinned ? '取消置顶' : '置顶',
                  onPress: () => togglePinFolder(folder.id),
                },
                ...(!folder.isDefault
                  ? [
                      {
                        text: '删除',
                        style: 'destructive' as const,
                        onPress: () => handleDeleteFolder(folder.id, folder.name),
                      },
                    ]
                  : []),
                { text: '取消', style: 'cancel' as const },
              ]);
            }
          }}
        >
          <View style={[styles.folderIconContainer, { backgroundColor: folder.color + '18' }]}>
            <Text style={styles.folderIcon}>
              {FOLDER_ICONS[folder.icon] || '📁'}
            </Text>
          </View>
          <View style={styles.folderInfo}>
            <Text style={styles.folderName} numberOfLines={1}>
              {folder.name}
            </Text>
          </View>
          <Text style={styles.folderCount}>{count}</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      );
    },
    [getNotesCount, handleFolderPress, handleDeleteFolder, togglePinFolder]
  );

  const renderSection = (title: string, data: typeof folders) => {
    if (data.length === 0) return null;
    return (
      <View style={styles.section}>
        {title && pinnedFolders.length > 0 && unpinnedFolders.length > 0 && (
          <Text style={styles.sectionHeader}>{title}</Text>
        )}
        <View style={styles.sectionCard}>
          {data.map((folder, index) => (
            <React.Fragment key={folder.id}>
              {renderFolderItem({ item: folder })}
              {index < data.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={[]}
        renderItem={null}
        ListHeaderComponent={
          <>
            {renderSection('', pinnedFolders)}
            {renderSection('文件夹', unpinnedFolders)}
          </>
        }
        contentContainerStyle={styles.listContent}
        contentInsetAdjustmentBehavior="automatic"
      />

      {/* 底部工具栏 */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.newFolderButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.newFolderIcon}>📁</Text>
          <Text style={styles.newFolderText}>新建文件夹</Text>
        </TouchableOpacity>
      </View>

      {/* 新建文件夹弹窗 */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>新建文件夹</Text>

            {/* 文件夹名称输入 */}
            <TextInput
              style={styles.modalInput}
              placeholder="文件夹名称"
              placeholderTextColor={Colors.placeholderText}
              value={newFolderName}
              onChangeText={setNewFolderName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreateFolder}
            />

            {/* 图标选择 */}
            <Text style={styles.modalSubtitle}>选择图标</Text>
            <View style={styles.iconGrid}>
              {ICON_OPTIONS.map((icon) => (
                <TouchableOpacity
                  key={icon}
                  style={[
                    styles.iconOption,
                    selectedIcon === icon && styles.iconOptionSelected,
                  ]}
                  onPress={() => setSelectedIcon(icon)}
                >
                  <Text style={styles.iconOptionText}>{FOLDER_ICONS[icon]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 颜色选择 */}
            <Text style={styles.modalSubtitle}>选择颜色</Text>
            <View style={styles.colorGrid}>
              {COLOR_OPTIONS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    selectedColor === color && styles.colorOptionSelected,
                  ]}
                  onPress={() => setSelectedColor(color)}
                />
              ))}
            </View>

            {/* 按钮 */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmButton,
                  !newFolderName.trim() && styles.modalButtonDisabled,
                ]}
                onPress={handleCreateFolder}
                disabled={!newFolderName.trim()}
              >
                <Text style={styles.modalConfirmText}>创建</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.groupedBackground,
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 100,
  },
  section: {
    marginTop: Spacing.lg,
  },
  sectionHeader: {
    fontSize: Typography.sizes.footnote,
    fontWeight: Typography.weights.regular,
    color: Colors.secondaryLabel,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
    marginLeft: Spacing.lg,
  },
  sectionCard: {
    backgroundColor: Colors.secondaryGroupedBackground,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    ...Shadow.small,
  },
  folderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    minHeight: 52,
  },
  folderIconContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  folderIcon: {
    fontSize: 20,
  },
  folderInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  folderName: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.regular,
    color: Colors.label,
  },
  folderCount: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.regular,
    color: Colors.tertiaryLabel,
    marginRight: Spacing.sm,
  },
  chevron: {
    fontSize: 22,
    color: Colors.tertiaryLabel,
    fontWeight: Typography.weights.medium,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.opaqueSeparator,
    marginLeft: 64,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 34 : Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: Colors.groupedBackground,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.opaqueSeparator,
  },
  newFolderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newFolderIcon: {
    fontSize: 16,
    marginRight: Spacing.xs,
  },
  newFolderText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.regular,
    color: Colors.primary,
  },

  // Modal 样式
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '82%',
    maxWidth: 360,
    backgroundColor: Colors.secondaryGroupedBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xxl,
    ...Shadow.large,
  },
  modalTitle: {
    fontSize: Typography.sizes.headline,
    fontWeight: Typography.weights.semibold,
    color: Colors.label,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  modalInput: {
    height: 44,
    backgroundColor: Colors.tertiaryBackground,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.lg,
    fontSize: Typography.sizes.body,
    color: Colors.label,
    marginBottom: Spacing.lg,
  },
  modalSubtitle: {
    fontSize: Typography.sizes.footnote,
    fontWeight: Typography.weights.medium,
    color: Colors.secondaryLabel,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.tertiaryBackground,
  },
  iconOptionSelected: {
    backgroundColor: Colors.primary + '20',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  iconOptionText: {
    fontSize: 20,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xxl,
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: Colors.white,
    ...Shadow.medium,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  modalCancelButton: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.tertiaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    color: Colors.label,
  },
  modalConfirmButton: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
    color: Colors.white,
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
});

export default FoldersScreen;
