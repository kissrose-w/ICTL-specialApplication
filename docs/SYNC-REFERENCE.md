# 前后端字段映射与 WS 事件对齐速查表

> **开发者参照卡**：写代码时查这个，不用翻完整规划文档。

---

## 1. 身份映射（固定值，固化在前端）

| 前端 FixedUserId | 后端 username | 后端默认 UUID |
|-----------------|-------------|-------------|
| `'user_a'` | `'user_a'` | `00000000-0000-0000-0000-000000000001` |
| `'user_b'` | `'user_b'` | `00000000-0000-0000-0000-000000000002` |

转换函数（需在前端新增）：
```typescript
// userIdMapper.ts
export function fixedToUuid(fixed: FixedUserId, map: Record<FixedUserId, string>): string {
  return map[fixed];
}
export function uuidToFixed(uuid: string, map: Record<FixedUserId, string>): FixedUserId {
  return Object.entries(map).find(([, v]) => v === uuid)?.[0] ?? 'user_a';
}
```

---

## 2. TodoItem 字段映射

| 前端字段 | 类型 | 后端字段 | 转换方式 |
|---------|------|---------|---------|
| `id` | `string` | `id` (UUID) | **直接用**（后端生成） |
| `title` | `string` | `title` | **直接用** |
| `description?` | `string` | `description` | **直接用**（后端可能 null） |
| `creatorId` | `FixedUserId` | `creatorId` (UUID) | ⚠️ 需 UUID↔FixedUserId 转换 |
| `assignedToId` | `FixedUserId` | `assigneeId` (UUID \| null) | ⚠️ **字段名不同** + UUID 转换 |
| `completed` | `boolean` | `isCompleted` | ⚠️ **字段名不同** |
| `completedBy?` | `FixedUserId` | _(无对应字段)_ | ⚠️ **后端没有这个字段**，前端需从 WS sender 推断 |
| `completedAt?` | `string` | `completedAt` | **直接用** |
| `dueDate?` | `string` | `dueAt` | ⚠️ **字段名不同** |
| `nudgeCount` | `number` | _(无对应字段)_ | ⚠️ **后端没有**，前端本地累加 |
| `lastNudgeAt?` | `string` | _(无对应字段)_ | ⚠️ **后端没有**，前端本地 |
| `createdAt` | `string` | `createdAt` | **直接用** |
| `updatedAt` | `string` | `updatedAt` | **直接用** |
| `syncStatus` | `'synced'\|'pending'\|'conflict'` | _(无对应字段)_ | ⚠️ **纯前端本地状态**，不上传 |
| _(无)_ | | `priority` | 后端有 `low/normal/high/urgent`，前端暂不用 |
| _(无)_ | | `repeatRule` | 后端有，前端暂不用 |
| _(无)_ | | `metadata` (JSONB) | 后端有，前端暂不用 |

---

## 3. NoteItem 字段映射

| 前端字段 | 类型 | 后端字段 | 转换方式 |
|---------|------|---------|---------|
| `id` | `string` | `id` (UUID) | 直接用 |
| `title` | `string` | `title` | 直接用 |
| `content` | `string` | `content` | 直接用 |
| `authorId` | `FixedUserId` | `authorId` (UUID) | ⚠️ UUID↔FixedUserId |
| `isPinned` | `boolean` | `isPinned` | 直接用 |
| `metadata` | `Record<string, unknown>` | `metadata` (JSONB) | 直接用 |
| `createdAt` / `updatedAt` | `string` | 同名 | 直接用 |

---

## 4. WebSocket 事件对齐

### 4.1 客户端 → 服务端（前端发的）

| 前端发什么 | 后端认什么 | 说明 |
|-----------|-----------|------|
| `PING` | `PING` | 心跳探测 |
| `NUDGE` | `NUDGE` | 快速拍一拍（不经 HTTP） |
| _(无)_ | ❌ 前端不该发上线消息 | 后端连接成功会自动发 HEARTBEAT_PONG |

### 4.2 服务端 → 客户端（后端广播的）

| 后端事件名 | 前端当前名 | 前端需做 | 数据结构 `data` |
|-----------|-----------|---------|----------------|
| `TODO_CREATED` | ✅ 同名 | 接收 → mergeRemoteTodos | 完整 `TodoItem` 对象 |
| `TODO_UPDATED` | ✅ 同名 | 接收 → mergeRemoteTodos | 完整 `TodoItem` 对象 |
| `TODO_DELETED` | ❌ 未定义 | **新增 case** → deleteRemoteTodo | `{ id: string }` |
| `TODO_NUDGED` | ❌ `NUDGE_RECEIVED` | 改名 + 改结构 | `{ todoId, todoTitle, senderNickname, message }` |
| `PARTNER_STATUS` | ❌ `PARTNER_ONLINE` | 改名 + 改结构 | `{ online: boolean, userId }` |
| `NOTE_CREATED` | ❌ 未定义 | **新增** | 完整 `NoteItem` 对象 |
| `NOTE_UPDATED` | ❌ 未定义 | **新增** | 完整 `NoteItem` 对象 |
| `NOTE_DELETED` | ❌ 未定义 | **新增** | `{ id: string }` |
| `REMINDER_ALERT` | ❌ 未定义 | **新增**（Phase 5 用） | `{ id, title, body, itemType }` |
| `HEARTBEAT_PONG` | ❌ 未定义 | **新增**（连接状态） | `{ ok: true }` 或 `onlineStatus` |

---

## 5. REST API 调用速查

所有请求 Header：
```
Authorization: Bearer <authStore.authToken>
Content-Type: application/json
```

| 用途 | Method | URL | Body |
|------|--------|-----|------|
| **登录** | POST | `/api/auth/login` | `{ userId: 'user_a', password: 'xxx' }` |
| **取当前身份 + 伴侣在线** | GET | `/api/auth/me` | - |
| **待办列表** | GET | `/api/todos` | - |
| **创建待办** | POST | `/api/todos` | `{ title, description?, assigneeId?, dueAt?, priority?, metadata? }` |
| **更新待办** | PATCH | `/api/todos/:id` | `{ title?, isCompleted?, assigneeId?, ... }` |
| **删除待办** | DELETE | `/api/todos/:id` | - |
| **催一下对方** | POST | `/api/todos/:id/nudge` | `{ message? }` |
| **便签列表** | GET | `/api/notes` | - |
| **创建便签** | POST | `/api/notes` | `{ title, content, isPinned?, metadata? }` |
| **更新便签** | PATCH | `/api/notes/:id` | `{ title?, content?, isPinned? }` |
| **删除便签** | DELETE | `/api/notes/:id` | - |
| **提醒列表** | GET | `/api/reminders` | - |
| **创建提醒** | POST | `/api/reminders` | `{ todoId?, targetUserId, triggerAt }` |
| **删除提醒** | DELETE | `/api/reminders/:id` | - |

### 注意
- `creatorId` 不需要前端传，后端从 JWT 自动取
- `assigneeId` / `targetUserId` 必须传**后端 UUID**（不是前端 FixedUserId）
- WebSocket 连接：`ws://localhost:3000/ws?token=<JWT>`

---

## 6. 快速转换函数（建议实现）

```typescript
// src/utils/apiMapper.ts

import { TodoItem, FixedUserId } from '../types/todo';

// 前端 TodoItem → 后端 POST /api/todos body
export function toBackendCreateTodo(todo: {
  title: string;
  description?: string;
  creatorFixed: FixedUserId;
  assigneeFixed: FixedUserId;
  userIdMap: Record<FixedUserId, string>;
}) {
  return {
    title: todo.title,
    description: todo.description ?? null,
    assigneeId: todo.userIdMap[todo.assigneeFixed], // 后端 UUID
    // creatorId 不传，后端从 JWT 取
  };
}

// 后端返回的 TodoItem → 前端 TodoItem
export function fromBackendTodo(
  backend: BackendTodoRaw,
  userIdMap: Record<FixedUserId, string>
): TodoItem {
  const uuidToFixed = Object.fromEntries(
    Object.entries(userIdMap).map(([k, v]) => [v, k])
  ) as Record<string, FixedUserId>;

  return {
    id: backend.id,
    title: backend.title,
    description: backend.description ?? undefined,
    creatorId: uuidToFixed[backend.creatorId] ?? 'user_a',
    assignedToId: backend.assigneeId
      ? (uuidToFixed[backend.assigneeId] ?? 'user_a')
      : uuidToFixed[backend.creatorId] ?? 'user_a',
    completed: backend.isCompleted,
    completedAt: backend.completedAt ?? undefined,
    dueDate: backend.dueAt ?? undefined,
    // 以下为纯前端字段，后端没有，给默认值
    nudgeCount: 0,
    syncStatus: 'synced',
    createdAt: backend.createdAt,
    updatedAt: backend.updatedAt,
  };
}
```
