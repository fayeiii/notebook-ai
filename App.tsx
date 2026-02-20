/**
 * AI 复盘助手 - 日记 APP
 * Apple 备忘录风格 (Expo)
 */

import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Navigation from './src/navigation';

// 注入全局 CSS（仅 Web）：去除 textarea/input 的浏览器默认边框和 outline
if (Platform.OS === 'web') {
  const style = (document as any).createElement('style');
  style.textContent = `
    textarea, input {
      outline: none !important;
      border: none !important;
      box-shadow: none !important;
      resize: none !important;
      overflow: hidden !important;
    }
  `;
  (document as any).head.appendChild(style);
}

const App: React.FC = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Navigation />
    </GestureHandlerRootView>
  );
};

export default App;
