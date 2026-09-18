# ICTL-specialApplication (Duo Space)

> **专属双人私有空间移动端 App**  
> 基于 React Native (Expo SDK 57) + TypeScript + NativeWind v4 + Zustand + MMKV + Jetpack Compose 的跨端工程脚手架。

---

## 核心设计原则

- **完全私有化，零繁琐流程**：绝对无“邀请码、配对码、创建双人空间”等中间流程。两位特定用户的身份在系统层预置与固定，启动后直接进入两人共同的数据空间。
- **离线优先 (Offline-First)**：深度集成基于 C++ JSI 的 `react-native-mmkv` 高速存储，所有待办与数据即刻入库、秒级启动、离线可用，并自动标记待同步状态。
- **双人协同与指派**：待办与事项内置清晰的归属指派（“我” / “TA”）、完成人标记、以及一键“催一下/拍一拍”互动。
- **Android 原生深度扩展**：预留与封装面向 Kotlin + Jetpack Compose (Glance 桌面小组件) 与系统 `AlarmManager` 精确闹钟唤醒的 Native Bridge。
- **实时协同监听**：开机自动维系 WebSocket 长连接，实时感知对方的新建、打勾完成与催办提醒。

---

## 技术栈选型

| 领域 | 选型与版本 | 说明 |
| :--- | :--- | :--- |
| **基础框架** | **Expo (SDK 57)** + **React Native (0.86)** | 支持 Expo Prebuild / Bare 原生扩展 |
| **编程语言** | **TypeScript 6.0** | 严格模式，支持 `@/*` 模块路径映射 |
| **UI 样式方案** | **NativeWind v4.2** + **Tailwind CSS v3.4** | 原子化样式，构建时编译，支持深色模式与原生样式属性 |
| **路由导航** | **React Navigation v7** | Native Stack + Bottom Tabs，强类型路由守卫 |
| **状态与离线存储** | **Zustand v5** + **react-native-mmkv v4** | 响应式状态流 + C++ JSI 高性能键值存储引擎 |
| **服务端数据请求** | **TanStack React Query v5** | 声明式异步缓存与请求管理 |
| **图标与轻量工具** | **Lucide React Native** + **date-fns** | 现代化矢量图标库与日期格式化 |
| **Android 原生扩展** | **Kotlin + Jetpack Compose + Glance** | 桌面小组件与后台精准强提醒唤醒 |

---

## 项目目录结构

```
ICTL-specialApplication/
├── android-native/                     # Android 原生扩展与 Jetpack Compose 配置指南
│   └── compose-setup.md                # Compose / Glance 小组件 / AlarmManager 详细配置与源码
├── assets/                             # 静态资源 (App 图标、启动画面)
├── docs/                               # 深度架构与设计文档
│   └── ARCHITECTURE.md                 # 前端架构设计详解
├── src/
│   ├── api/                            # 服务端接口与 React Query 客户端
│   │   └── queryClient.ts
│   ├── config/
│   │   └── users.ts                    # 预置双人身份 (User A & User B) 核心配置
│   ├── modules/                        # 业务领域模块 (Domain Modules)
│   │   ├── auth/                       # 极简双人登入 (无邀请码，一键选择即进入)
│   │   │   └── screens/
│   │   │       └── UserSelectScreen.tsx
│   │   ├── todos/                      # 待办协同模块
│   │   │   ├── components/
│   │   │   │   └── TodoCard.tsx        # 任务卡片 (双人指派、催办、离线状态)
│   │   │   ├── screens/
│   │   │   │   └── TodosScreen.tsx     # 待办主页 (全部/我的/TA的/已完成、小组件同步)
│   │   │   └── store/
│   │   │       └── todoStore.ts        # 核心待办状态流 (离线持久化、乐观更新)
│   │   ├── reminders/                  # 精准提醒与倒数日
│   │   │   └── screens/
│   │   │       └── RemindersScreen.tsx # 纪念日倒计时、AlarmManager 原生唤醒
│   │   └── space/                      # 双人专属私密空间
│   │       └── screens/
│   │           └── SpaceScreen.tsx     # 私密便签、共同账本、纪念日谱、照片墙
│   ├── native-bridge/                  # Android Kotlin 原生桥接层
│   │   ├── glanceBridge.ts             # Compose Glance 桌面小组件数据通道
│   │   └── alarmBridge.ts              # 系统 AlarmManager 精准强提醒通道
│   ├── navigation/                     # 路由与导航守卫
│   │   ├── MainTabNavigator.tsx        # 底部标签栏 (待办 / 提醒 / 空间 / 设置)
│   │   └── RootNavigator.tsx           # 根导航 (零配对引导，记住身份直接进主页)
│   ├── services/
│   │   └── realtime/                   # WebSocket 实时协同服务
│   │       └── websocket.ts            # 监听对方实时打勾、催办等事件
│   ├── store/                          # 全局基础设施状态
│   │   ├── authStore.ts                # 当前登入身份与持久化 Token/UID
│   │   └── storage.ts                  # MMKV 存储引擎封装
│   └── types/                          # 全局 TypeScript 强类型定义
│       ├── navigation.ts
│       └── todo.ts
├── App.tsx                             # 应用总入口 (注入 Providers、启动 WebSocket)
├── global.css                          # Tailwind CSS 全局基础样式
├── tailwind.config.js                  # NativeWind 样式扫描与 preset 配置
├── metro.config.js                     # Metro 打包配置 (NativeWind 插件)
├── babel.config.js                     # Babel (NativeWind + Reanimated 插件)
├── nativewind-env.d.ts                 # NativeWind 类型提示声明
├── tsconfig.json                       # TS 编译选项与 `@/*` 别名配置
└── package.json                        # 项目依赖清单
```

---

## 快速上手与运行

### 1. 依赖安装

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm start
# 或者直接以 Web 模式启动
npm run web
```

### 3. 多端调试

- **浏览器快速预览**：在终端按 `w`，或执行 `npm run web`，即可在浏览器打开 `http://localhost:8081` 进行全功能体验。
- **Android 模拟器 / 真机**：确保已配置 Android SDK，在终端按 `a` 或运行 `npm run android`。
- **iOS 模拟器 (macOS)**：在终端按 `i` 或运行 `npm run ios`。
- **Expo Go 真机扫码**：手机打开 Expo Go App 扫描终端呈现的二维码。

### 4. 静态检查

```bash
# 执行严格 TypeScript 类型检查
npx tsc --noEmit
```

---

## 详细架构文档

更深入的分层架构、状态机模型、离线优先流转、Android Compose Glance 原生实现与实时消息信令设计，请参阅：
👉 [**前端架构设计与技术实现文档 (docs/ARCHITECTURE.md)**](docs/ARCHITECTURE.md)