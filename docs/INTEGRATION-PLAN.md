# 前后端对接规划文档

> **状态**：规划中（PM Agent 产出，待 UI Agent 审核，然后进入实现）  
> **版本**：v1.0  
> **涉及仓库**：`ICTL-specialApplication`（前端）、`ICTL-duo-Back`（后端）  
> **核心原则**：零注册、零配对、离线优先、双人同步

---

## 1. 全局执行顺序（按依赖关系排列）

```
Phase 0 — 用户身份映射层（基础基础设施）
    │
    ▼
Phase 1 — Auth 对接（mock-token → 真实 JWT）
    │
    ▼
Phase 2 — WebSocket 对接（URL + 事件名 + 数据结构）
    │
    ▼
Phase 3 — Todos CRUD 对接（本地 store → 后端 REST + WS 广播）
    │
    ▼
Phase 4 — Notes 模块全栈（SpaceScreen 入口 → 完整页面）
    │
    ▼
Phase 5 — Reminders 打通（前端表单 → 后端 cron → 双通道推送）
```

---

## 2. Phase 0 — 用户身份映射层

### 2.1 核心决策

**前端继续使用 `'user_a' / 'user_b'` 字符串作为内部身份标识，不换 UUID。**

理由：
1. 后端 Auth 登录接口同时接受 username 和 UUID（`isAllowedUser` 双检查），前端用 `'user_a'` 就能登录
2. 前端整个 UI 层（TodoCard 的 `assignedToId`、UserBadge、Settings）都用 `FixedUserId` 做条件渲染，换 UUID 意味着全量改 UI 判断逻辑
3. 后端返回真实 UUID 后存进 authStore，发 REST API 时前端传 UUID 作为 creatorId/assigneeId

### 2.2 映射表（固化在前端）

| 前端内部标识 | 后端 username | 后端默认 UUID | 密码 (dev) | 后端 JWT role |
|-------------|-------------|-------------|-----------|--------------|
| `'user_a'` | `'user_a'` | `00000000-0000-0000-0000-000000000001` | `duo_secret_a_123` | `duo_partner` |
| `'user_b'` | `'user_b'` | `00000000-0000-0000-0000-000000000002` | `duo_secret_b_456` | `duo_partner` |

### 2.3 前端需新增的配置文件

**新建** `src/config/apiConfig.ts`：

```typescript
// 后端地址（开发期默认 localhost，生产改为真实域名）
export const API_BASE_URL = 'http://localhost:3000';
export const WS_BASE_URL = 'ws://localhost:3000';

// 固定双用户 credentials（dev 用，生产可移到 env）
export const USER_CREDENTIALS = {
  user_a: { userId: 'user_a', password: 'duo_secret_a_123' },
  user_b: { userId: 'user_b', password: 'duo_secret_b_456' },
};

// 前端内部 FixedUserId ↔ 后端 UUID 的固化映射
// 登录成功后由后端返回填充，这里只做初始默认
export const DEFAULT_USER_ID_MAP: Record<'user_a' | 'user_b', string> = {
  user_a: '00000000-0000-0000-0000-000000000001',
  user_b: '00000000-0000-0000-0000-000000000002',
};
```

**改动** `src/types/todo.ts` — 新增接口适配层：

```typescript
// 前端内部类型（保持 FixedUserId，不换）
export interface TodoItem { ... assignedToId: FixedUserId; ... }

// 转换函数（发请求前调一次）
export function toBackendTodo(todo: TodoItem): BackendTodo { ... }
export function fromBackendTodo(backend: BackendTodo, idMap: Record<...>): TodoItem { ... }
```

---

## 3. Phase 1 — Auth 对接

### 3.1 当前前端状态
- `authStore` 默认 `currentUserId: 'user_a'` + `authToken: 'mock-token-user-a'`
- `UserSelectScreen` 只有 2 张卡片点击切换身份，**没有密码输入**
- `api/queryClient.ts` 配置好了 React Query 但**没有 auth API 函数**

### 3.2 后端已就绪
- `POST /api/auth/login` — 接受 `{ userId, password }`，返回 `{ token, user, partner }`
- `GET /api/auth/me` — 需要 Bearer Token，返回当前身份 + 伴侣在线状态

### 3.3 改动清单

#### 3.3.1 `src/api/authApi.ts`（新建）

```typescript
// 封装 login() / getMe() / logout()
// POST /api/auth/login { userId, password } → { token, user, partner }
// GET  /api/auth/me  Header: Authorization: Bearer <token>
```

#### 3.3.2 `src/store/authStore.ts`（修改）

当前是：
```typescript
currentUserId: 'user_a',
authToken: 'mock-token-user-a',
```

改为：
```typescript
currentUserId: FixedUserId | null,   // 登录成功后才设
authToken: string | null,            // login() 成功后填入 JWT
serverUserUuid: string | null,       // 后端返回的真实 UUID
partnerServerUuid: string | null,    // 后端返回的伴侣 UUID
isLoggedIn: boolean,

// Actions 新增:
loginWithBackend(userId: FixedUserId): Promise<void>   // 调 authApi.login()
fetchPartnerOnlineStatus(): Promise<void>              // 调 authApi.getMe()
```

#### 3.3.3 `modules/auth/screens/UserSelectScreen.tsx`（修改）

当前是点击卡片直接 `loginAs('user_a')`，无密码输入。

**方案决策**：PM 建议保持极简设计——因为是固定双人私有 App，**密码输入可以放在点击后弹窗**，而不是常驻在首屏。用户流程：
```
启动 App → 看到两张卡片 → 点击 "我 (User A)" 
→ 弹出极简密码输入框（1个输入框 + 确认按钮）
→ 输入 duoo_secret_a_123
→ 调 POST /api/auth/login → 成功 → 进入主页
→ 失败 → 提示 "密码错误"
```

### 3.4 Acceptance Criteria

- [ ] 点击身份卡片 → 弹出密码输入
- [ ] 输入正确密码 → 后端返回 200 + JWT → 写入 authStore → 进入 MainTabs
- [ ] 输入错误密码 → 后端 401 → 提示"密码错误"，留在选择页
- [ ] 重启 App → 本地 MMKV 记住上次登录 → 直接进 MainTabs（token 未过期）
- [ ] 退出登录 → authStore 清空 → 回到 UserSelectScreen
- [ ] 登录成功后 token 能调用 `GET /api/auth/me`

---

## 4. Phase 2 — WebSocket 对接

### 4.1 对齐表（前端当前 vs 后端真实）

#### 4.1.1 连接握手

| 项 | 前端当前 | 后端真实 | 改动 |
|----|---------|---------|------|
| URL | `wss://api.example.com/duo-sync` | `ws://localhost:3000/ws?token=<JWT>` | ✅ 改 URL 格式，加 token |
| 鉴权 | 无 | Query 参数 `?token=JWT` 或 `Sec-WebSocket-Protocol` header | ✅ login 成功后用 authStore.authToken 连接 |
| 握手成功后 | 前端自己发 PARTNER_ONLINE | 后端自动发 HEARTBEAT_PONG + onlineStatus | ✅ 前端删除自动发的上线消息 |
| 心跳 | 无 | 服务端每 30s 发 ping，客户端需 pong | ✅ 前端加 pong 响应 |

#### 4.1.2 事件类型

| 后端事件 | 前端当前 | 数据结构 | 前端需要 |
|---------|---------|---------|---------|
| `TODO_CREATED` | ✅ `TODO_CREATED` | `data: TodoItem 完整对象` | ✅ 接收 → mergeRemoteTodos |
| `TODO_UPDATED` | ✅ `TODO_UPDATED` | `data: TodoItem 完整对象` | ✅ 接收 → mergeRemoteTodos |
| `TODO_DELETED` | ❌ 未定义 | `data: { id: string }` | ⚠️ **新增** |
| `TODO_NUDGED` | ❌ `NUDGE_RECEIVED` | `data: { todoId, todoTitle, senderNickname, message }` | ⚠️ 改名 + 结构调整 |
| `PARTNER_STATUS` | ❌ `PARTNER_ONLINE` | `data: { online: boolean, userId }` | ⚠️ 改名 + 结构调整 |
| `REMINDER_ALERT` | ❌ 未定义 | `data: { id, title, body, itemType }` | ⚠️ **新增**（Phase 5 用） |
| `HEARTBEAT_PONG` | ❌ 未定义 | `data: { ok: true }` 或 `onlineStatus` | ⚠️ **新增**（连接状态显示） |
| `NOTE_CREATED/UPDATED/DELETED` | ❌ 未定义 | `data: NoteItem` | ⚠️ **新增**（Phase 4 用） |

#### 4.1.3 数据结构差异

**后端 TodoItem 完整字段**：
```json
{
  "id": "uuid",
  "creatorId": "后端UUID",
  "assigneeId": "后端UUID | null",
  "title": "...",
  "description": "...",
  "dueAt": "ISO timestamp | null",
  "isCompleted": false,
  "completedAt": "ISO timestamp | null",
  "priority": "normal",
  "repeatRule": null,
  "metadata": {},
  "createdAt": "ISO timestamp",
  "updatedAt": "ISO timestamp"
}
```

**前端 TodoItem 字段**：
```typescript
{
  id: string,
  title: string,
  description?: string,
  creatorId: FixedUserId,       // ← 需 UUID→FixedUserId 转换
  assignedToId: FixedUserId,    // ← 后端叫 assigneeId，且是 UUID
  completed: boolean,           // ← 后端叫 isCompleted
  completedBy?: FixedUserId,    // ← 后端没这个字段（隐含在 creator/assignee 里）
  completedAt?: string,
  nudgeCount: number,           // ← 后端没这个字段
  lastNudgeAt?: string,         // ← 后端没这个字段
  dueDate?: string,             // ← 后端叫 dueAt
  createdAt: string,
  updatedAt: string,
  syncStatus: 'synced' | 'pending' | 'conflict', // ← 后端没这个字段
}
```

**PM 决策**：不做一对一硬改。在 WS 消息处理器里加一个 `fromBackendTodo()` 转换函数，字段名差异和 UUID→FixedUserId 都在这个函数里解决。前端内部类型保持不变。

### 4.2 改动清单

#### 4.2.1 `src/services/realtime/websocket.ts`（重写核心逻辑）

```
connect(serverUrl) → 改为 connectWithAuth(token)
  - URL 改为 `${WS_BASE_URL}/ws?token=${token}`
  - onopen 不再自动发 PARTNER_ONLINE
  - 新增 onmessage case: TODO_DELETED / REMINDER_ALERT / HEARTBEAT_PONG / NOTE_*
  - RealtimeEventType 枚举对齐后端 WsEventType
  - handleIncomingEvent 里加 fromBackendTodo() 转换
  - 心跳: 收到 ping 自动回 pong，或收到 HEARTBEAT_PONG 更新连接状态
```

#### 4.2.2 `src/modules/todos/store/todoStore.ts`（新增 merge 能力）

```
mergeRemoteTodos(todos: TodoItem[]) 当前已实现，保持不动
新增: deleteRemoteTodo(id: string)  // 处理后端 TODO_DELETED
```

#### 4.2.3 `src/types/ws.ts`（新建，统一 WS 事件类型）

```typescript
// 严格对齐后端 src/types/index.ts 的 WsEventType
export type WsEventType =
  | 'TODO_CREATED' | 'TODO_UPDATED' | 'TODO_DELETED' | 'TODO_NUDGED'
  | 'NOTE_CREATED' | 'NOTE_UPDATED' | 'NOTE_DELETED'
  | 'REMINDER_CREATED' | 'REMINDER_ALERT'
  | 'PARTNER_STATUS' | 'HEARTBEAT_PONG';

export interface WsMessage<T = unknown> {
  type: WsEventType;
  sender: string;    // 'system' 或 后端 UUID
  timestamp: string;
  data: T;
}
```

### 4.3 Acceptance Criteria

- [ ] Auth 成功后 → 用 JWT 自动连接 WS → onopen 收到 HEARTBEAT_PONG + onlineStatus
- [ ] 伴侣在线状态指示灯能显示（基于 PARTNER_STATUS 事件）
- [ ] 收到 TODO_CREATED → mergeRemoteTodos → 列表自动刷新
- [ ] 收到 TODO_NUDGED → 弹出 Toast + 震动
- [ ] 收到 TODO_DELETED → todo 从本地列表消失
- [ ] WS 断开 → 5s 自动重连（保持当前逻辑）
- [ ] **断线期间对方发的消息重连后补拉** —— ⚠️ 后端不持久化，前端需在重连后 `GET /api/todos` 全量刷新

---

## 5. Phase 3 — Todos CRUD 对接

### 5.1 当前前端数据流
```
addTodo() → Zustand (乐观更新 + MMKV) → ✅ 本地 UI 立即响应
         → ❌ 没有调 REST API
         → ❌ 没有发 WS 广播
```

### 5.2 目标数据流（离线优先 + 后端同步）
```
addTodo() → ① Zustand 乐观更新 (syncStatus=pending) ✅ 本地 UI 立即响应
         → ② REST POST /api/todos (携带 creatorId=后端UUID, assigneeId=后端UUID)
              成功 → Zustand.updateSyncStatus('synced')
              失败 → Zustand 保持 pending，存入 retryQueue
         → ③ WS 广播由后端自动做（POST 成功后后端会 broadcastToPartner）
```

### 5.3 改动清单

#### 5.3.1 `src/api/todosApi.ts`（新建）

```typescript
// createTodo(data) → POST /api/todos
// listTodos()      → GET /api/todos
// updateTodo(id, data) → PATCH /api/todos/:id
// deleteTodo(id)   → DELETE /api/todos/:id
// nudgeTodo(id, message) → POST /api/todos/:id/nudge
// 所有请求 Header: Authorization: Bearer <authToken>
```

#### 5.3.2 `src/modules/todos/store/todoStore.ts`（重构 addTodo / toggleTodo / nudgeTodo）

```
addTodo({ title, description, assignedToId })
  → ① 创建本地 TodoItem (syncStatus=pending)
  → ② async: todosApi.createTodo({
        title, description,
        creatorId: mapFixedToUuid(currentUserId),
        assigneeId: mapFixedToUuid(assignedToId),
     })
     .then(res → updateSyncStatus(id, 'synced'))
     .catch(err → 存入 retryQueue (不阻塞 UI))

toggleTodo(id, operatorId)
  → ① 乐观更新 completed
  → ② async: todosApi.updateTodo(id, { isCompleted: !completed })

nudgeTodo(id)
  → ① 本地 nudgeCount+1
  → ② async: todosApi.nudgeTodo(id, { message: '...' })
  → ③ WS 由后端自动 broadcastToPartner（前端不用发）
```

#### 5.3.3 离线重试队列（简易实现）

当前 store 已有 `syncStatus: 'pending' | 'synced' | 'conflict'`。新增：
- App 启动时 → 扫一遍 pending 的 todo → 逐个重试 POST / PATCH
- WS 重连成功时 → 触发同样的重试

### 5.4 Acceptance Criteria

- [ ] 创建待办 → 本地 UI 100ms 内出现（乐观更新）
- [ ] 3s 内后端落库，伴侣 WS 在线时 < 100ms 收到 TODO_CREATED
- [ ] 伴侣端收到广播 → mergeRemoteTodos → 自动出现在伴侣列表
- [ ] 勾选完成 → 本地立即翻转 → 伴侣端自动看到完成态
- [ ] 催一下 → 本地 nudgeCount+1 → 伴侣端震动+弹窗
- [ ] 断网时创建 → 本地 pending → 重连后自动上报 → 后端落库
- [ ] 全量刷新能力：WS 重连后自动 `GET /api/todos` 做一次全量同步

---

## 6. Phase 4 — Notes 模块（新模块）

### 6.1 后端已就绪
- `GET /api/notes`（置顶优先 + 更新时间倒序）
- `POST /api/notes`（创建，authorId 由后端从 JWT 提取）
- `PATCH /api/notes/:id`（更新内容/置顶）
- `DELETE /api/notes/:id`（删除）
- WS: `NOTE_CREATED / NOTE_UPDATED / NOTE_DELETED` 伴侣广播

### 6.2 前端现状
- `SpaceScreen.tsx` 只有 4 张入口卡片，点击无跳转
- 无 types/note.ts、无 store/noteStore.ts、无 notes API 封装

### 6.3 新建文件清单

```
src/
├── api/
│   └── notesApi.ts          ← 新建
├── types/
│   └── note.ts              ← 新建
├── modules/notes/
│   ├── store/
│   │   └── noteStore.ts     ← 新建 (Zustand + persist)
│   └── screens/
│       ├── NotesListScreen.tsx    ← 新建（列表 + 置顶标记 + 空状态）
│       └── NoteEditScreen.tsx     ← 新建（创建/编辑 + 置顶开关）
```

### 6.4 后端 Note 字段 → 前端 Note 字段映射

| 后端字段 | 类型 | 前端字段 | 说明 |
|---------|------|---------|------|
| `id` | UUID | `id: string` | 直接用 |
| `authorId` | UUID | `authorId: FixedUserId` | UUID→FixedUserId 转换 |
| `title` | string | `title: string` | 直接用 |
| `content` | string | `content: string` | 直接用 |
| `isPinned` | boolean | `isPinned: boolean` | 直接用 |
| `metadata` | JSONB | `metadata: Record<string, unknown>` | 直接用 |
| `createdAt` | ISO string | `createdAt: string` | 直接用 |
| `updatedAt` | ISO string | `updatedAt: string` | 直接用 |

### 6.5 改动清单（已有文件）

```
SpaceScreen.tsx — 点击便签卡片 → navigate('NotesList')
MainTabNavigator.tsx — 可选方案：把 Notes 升为独立 Tab，或保持在 Space 内
```

### 6.6 Acceptance Criteria

- [ ] Space 页 → 点击便签卡片 → 进入 Notes 列表
- [ ] 列表按置顶优先 + 更新时间倒序
- [ ] 点 "+" → 进入编辑页 → 输入标题+内容 → 保存 → POST /api/notes → 列表出现
- [ ] 伴侣在线时 → < 100ms 收到 NOTE_CREATED → 伴侣列表自动出现
- [ ] 点已有的便签 → 进入编辑 → 修改 → 保存 → PATCH /api/notes
- [ ] 置顶开关 → PATCH → 列表重新排序
- [ ] 左滑 / 长按 → 删除 → DELETE /api/notes → 伴侣收到 NOTE_DELETED

---

## 7. Phase 5 — Reminders 打通

### 7.1 后端已就绪
- `POST /api/reminders { todoId, targetUserId, triggerAt }` → 创建 reminder
- `node-cron` 每分钟扫描 → REMINDER_ALERT WS 广播 + 可选 Webhook 离线推送
- `GET /api/reminders` / `DELETE /api/reminders/:id`

### 7.2 前端现状
- `RemindersScreen` 只有纪念日卡片 + AlarmManager 原生测试按钮
- 没有 reminderStore、没有 reminders API、没有创建 reminder 的 UI

### 7.3 新建/改动文件

```
src/
├── api/
│   └── remindersApi.ts      ← 新建
├── types/
│   └── reminder.ts          ← 新建
├── modules/reminders/
│   └── store/
│       └── reminderStore.ts ← 新建
```

RemindersScreen 内新增：
- 关联 Todo 的 reminder 创建入口
- 独立定时 reminder 创建表单（目标用户选择 + 时间选择器）
- 已创建 reminder 列表（状态：pending / sent / cancelled）

### 7.4 数据流

```
前端创建 reminder → POST /api/reminders { todoId, targetUserId(后端UUID), triggerAt }
                  → 后端返回 { status: 'pending' }
                  → node-cron 每分钟扫描
                  → triggerAt <= NOW 时
                  → 后端发 REMINDER_ALERT WS 广播
                  → 伴侣离线时 → WEBHOOK_PUSH_URL 触发 Bark/PushDeer
```

---

## 8. 后端改动评估（是否需要改后端）

| Phase | 后端需改吗 | 说明 |
|-------|----------|------|
| Phase 0 映射 | ❌ 不用 | 后端已支持 username 登录 |
| Phase 1 Auth | ❌ 不用 | API 已就绪 |
| Phase 2 WS | ❌ 不用 | Gateway 已就绪 |
| Phase 3 Todos | ❌ 不用 | CRUD + Nudge + 广播已就绪 |
| Phase 4 Notes | ❌ 不用 | CRUD + 广播已就绪 |
| Phase 5 Reminders | ❌ 不用 | CRUD + cron + 双通道推送已就绪 |

**结论：Phase 0~5 全部不需要改后端，只改前端。**

---

## 9. 风险与已知限制

| 风险 | 影响 | 缓解方案 |
|------|------|---------|
| **WS 断线期间消息丢失** | 伴侣离线期间发的 Todos/Notes，重连后看不到 | 前端 WS 重连成功后自动 `GET /api/todos` + `GET /api/notes` 全量刷新 |
| **后端内存降级模式** | PostgreSQL 挂了 → DuoRepository 切内存 Map → 重启后端数据丢失 | 开发期可接受；生产需确保 PG 常驻 |
| **node-cron 精度** | 每分钟扫描，Reminder 触发延迟 ≤ 60s | PM 已告知用户；要精准到秒需改用 AlarmManager 原生唤醒 + Webhook |
| **UserSelectScreen 密码明文** | 固定双人私有 App，安全风险可接受 | 后续可换 bcrypt hash（后端已支持明文/哈希双模式） |
| **批量重连请求风暴** | WS 重连后同时 GET todos + notes + reminders | 可做 Promise.all 或加延迟错开 |
