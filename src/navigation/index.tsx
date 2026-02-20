/**
 * 导航配置
 * iOS 风格的导航栈
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { Colors, Typography } from '../theme';

import FoldersScreen from '../screens/FoldersScreen';
import NotesListScreen from '../screens/NotesListScreen';
import NoteEditorScreen from '../screens/NoteEditorScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const Navigation: React.FC = () => {
  return (
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: Colors.groupedBackground,
          },
          headerTintColor: Colors.primary,
          headerTitleStyle: {
            fontSize: Typography.sizes.headline,
            fontWeight: Typography.weights.semibold,
            color: Colors.label,
          },
          headerShadowVisible: false,
          headerBackTitle: '返回',
          animation: 'default',
          contentStyle: {
            backgroundColor: Colors.groupedBackground,
          },
        }}
      >
        <Stack.Screen
          name="Folders"
          component={FoldersScreen}
          options={{
            title: '文件夹',
            headerLargeTitle: true,
            headerLargeTitleStyle: {
              fontSize: Typography.sizes.largeTitle,
              fontWeight: Typography.weights.bold,
              color: Colors.label,
            },
            headerSearchBarOptions: {
              placeholder: '搜索',
              cancelButtonText: '取消',
              hideWhenScrolling: true,
            },
          }}
        />
        <Stack.Screen
          name="NotesList"
          component={NotesListScreen}
          options={({ route }) => ({
            title: route.params.folderName,
            headerLargeTitle: true,
            headerLargeTitleStyle: {
              fontSize: Typography.sizes.largeTitle,
              fontWeight: Typography.weights.bold,
              color: Colors.label,
            },
          })}
        />
        <Stack.Screen
          name="NoteEditor"
          component={NoteEditorScreen}
          options={{
            title: '',
            headerBackTitle: '返回',
            presentation: 'card',
          }}
        />
      </Stack.Navigator>
  );
};

export default Navigation;
