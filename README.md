# AI 复盘助手 APP

记录 + AI 复盘一体化工具，Apple 备忘录风格，支持文件夹管理、富文本记录和多格式附件。

## 技术栈

- **框架**: React Native + Expo (SDK 52)
- **语言**: TypeScript
- **状态管理**: Zustand + AsyncStorage 持久化
- **导航**: React Navigation (Native Stack)
- **附件**: expo-image-picker / expo-document-picker / expo-av

## 环境要求

- Node.js >= 18（推荐使用 [nvm](https://github.com/nvm-sh/nvm) 或 [nvm-windows](https://github.com/coreybutler/nvm-windows) 管理）
- npm >= 9

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器
npx expo start
```

启动后可选择运行方式：

| 按键 | 操作 |
|------|------|
| `w`  | 在浏览器中打开 Web 版 |
| `a`  | 在 Android 模拟器/设备运行 |
| `i`  | 在 iOS 模拟器运行（仅 macOS） |
| `r`  | 重新加载 |
| `j`  | 打开调试器 |

## 手机预览

1. 手机安装 [Expo Go](https://expo.dev/go)（iOS / Android）
2. 扫描终端中的 QR 码即可实时预览

## 常用命令

```bash
# 启动开发服务器
npx expo start

# 启动并自动打开 Web
npx expo start --web

# 清除缓存启动
npx expo start --clear

# 安装 Expo 兼容版本的包
npx expo install <package-name>

# 生成原生工程（需要时）
npx expo prebuild

# 构建 iOS（仅 macOS + Xcode）
npx expo run:ios

# 构建 Android（需 Android Studio）
npx expo run:android
```

## 项目结构

```
├── app/                  # Expo Router 入口
│   ├── _layout.tsx
│   └── index.tsx
├── src/
│   ├── navigation/       # 导航配置
│   ├── screens/          # 页面组件
│   │   ├── FoldersScreen.tsx      # 文件夹列表
│   │   ├── NotesListScreen.tsx    # 笔记列表
│   │   └── NoteEditorScreen.tsx   # 笔记编辑
│   ├── store/            # Zustand 状态管理
│   ├── theme/            # 主题配置（Apple 风格）
│   └── types/            # TypeScript 类型定义
├── App.tsx               # 根组件
├── app.json              # Expo 配置
└── package.json
```

## Windows 用户注意

如果使用 nvm-windows，用户名路径包含空格可能导致问题，建议将 nvm 安装到 `C:\nvm`，nodejs 符号链接设为 `C:\nodejs`。
