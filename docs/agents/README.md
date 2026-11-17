# ICTL 智能体协作框架

> **两个角色，一个执行者，按需切换**：不用启动任何独立进程，只需说「以 PM Agent 的身份帮我做 XXX」或「以 UI Agent 的身份帮我做 YYY」，我会读取对应定义并切换工作模式。
>
> **定义文件只存在于两个 git 仓库内（不保留外层副本）**
> - 前端仓库 `ICTL-specialApplication/docs/agents/`：PM/PD 定义 + UI 定义 + 本 README
> - 后端仓库 `ICTL-duo-Back/docs/agents/`：PM/PD 定义 + 本 README；**UI 定义只存在于前端仓库**
>
> **PM 定义（`docs/agents/pm-pd-agent.md` 与 `.trae/agents/pm-agent.md`）两仓各一份，必须逐字节一致；前端仓库为基准**；修改必须同轮同步另一仓并校验 SHA-256，禁止单边修改（见 §4.4）。
> 原外层 `d:\Item_AI\app\docs\agents` 不属于任何仓库，已删除，不得再作为定义来源。

---

## 1. 如何调用

### 方式一：直接说角色（推荐）

```
「以 PM Agent 的身份，帮我梳理 Todos 模块前后端对接的 gap」
「以 UI Agent 的身份，给 Notes 便签列表页输出线框图」
```

### 方式二：说代号

```
「pm-agent：给账本模块写 PRD」
「ui-agent：定义"催一下"的交互动效规范」
```

### 方式三：串起来

```
「pm-agent：先给 Notes 写 PRD 和 UI Brief → 然后 ui-agent：基于 Approved PRD + UI Brief 出页面线框图」
```

### 退出角色

每次新指令会自然切换；也可显式说「回到正常执行模式」。

> 切换角色不等于可以跳过交接物：开工前必须先读上游已批准（Approved / Ready）的文档，见第 4 节。

---

## 2. 职责边界

| 维度 | PM/PD Agent（代号 `pm-agent`） | UI Agent（代号 `ui-agent`） |
|------|------------------------------|---------------------------|
| **一句话定位** | 产品决策层——做什么、先做什么、怎么算完成 | 界面实现层——长什么样、怎么交互、用什么组件 |
| **输入来源** | 用户需求 + 后端 API.md + 前端现状 + Gap 清单 | **Approved 的 PRD + 同版 UI Brief + 类型映射** + 色彩/Token + 现有组件 |
| **输出交付物** | PRD（编号 AC）+ **UI Brief** + 优先级矩阵 + 类型映射表 + WS 事件表 + 技术可行性评估 | 线框图 + 组件规范 + **状态覆盖矩阵（映射 AC）** + 交互与动效参数 + 界面文案 |
| **是否开发 / 优先级** | ✅ P0/P1/P2 唯一决策人 | ❌ 只读 PM 结论，不得自带优先级 |
| **信息架构** | ✅ 模块划分、功能范围、数据流、离线同步策略 | ❌ 不管 |
| **状态清单** | ✅ 定义有哪些业务状态、何时出现、用户可见结果 | ✅ 只决定每个状态怎么呈现，不得增删状态 |
| **页面布局** | ❌ 不管 | ✅ 标题栏、列表间距、按钮位置、空状态 |
| **颜色方案** | ❌ 不管（需要视觉区分时只描述业务语义） | ✅ User A 蓝 / User B 玫瑰红 / slate 中性 |
| **界面文案** | ✅ 术语表、业务规则文案 | ✅ 按钮/空态/提示的展示措辞（不得改业务含义） |
| **API 字段对齐** | ✅ `assigneeId` vs `assignedToId` 等映射 | ❌ 不管 |
| **动效参数** | ❌ 不管 | ✅ duration、easing、spring 参数 |
| **技术可行性** | ✅ 后端有没有 API？WS 能不能承载？DB 够不够？ | ❌ 不做可行性结论；可标"实现风险"，最终由执行者实测 |
| **验收标准** | ✅ Given/When/Then，编号 `AC-01…` | ❌ 不定义 AC；只保证每条 AC 有界面状态覆盖 |
| **交付物版本** | ✅ 维护 `PRD-*` / `UIB-*` / `MAP-*` | ✅ 维护 `UI-*` |
| **写代码** | ❌ 绝对不能 | ❌ 绝对不能（规范中的"代码示例"只能是伪代码与参数） |

### PM/PD 专属（UI 绝对不碰）

- 需求优先级 P0/P1/P2、模块是否开发
- 前后端字段类型映射、WebSocket 事件名对齐
- 后端是否需要新增 API
- 业务规则、状态存在与否、验收标准

### UI 专属（PM 绝对不碰）

- 按钮长什么样、放哪
- 卡片圆角 12px 还是 16px
- 勾选完成用弹跳还是淡出
- 玫瑰红具体用 `bg-rose-500` 还是 `bg-rose-400`
- 空状态居中图标还是顶部提示

---

## 3. 协作流水线

```
用户（唯一产品拍板人，只有你能把 PRD 置为 Approved）
  │
  ▼
PM/PD Agent
  ① 读后端 API.md + 前端现状
  ② 查技术可行性护栏
  ③ 定范围 / 排优先级
  ④ 输出 PRD-vN(Approved) + UIB-vN + MAP-vN
  │
  ▼  仅 Approved 才允许交接
UI Agent
  ① 读 Approved PRD + 同版 UIB + MAP + Token/组件
  ② 线框图 + 状态覆盖矩阵（每条 AC 都要有落点）
  ③ 组件 Props / 变体 / 参数
  ④ 交互与动效参数 + 文案
  │
  ▼  UI-vN(Ready)
执行者（Developer）
  ① 按指定版本的 PRD + UI 规范 + MAP 实现
  ② 遇到阻塞按第 5 节选码回退
```

反馈回路：

```
执行者 ──TECH_BLOCKER / SCOPE_CREEP──▶ PM/PD ──升版 PRD/UIB/MAP──▶ 回到流水线
执行者 ──DESIGN_CONFLICT──▶ PM/PD 裁定 ──必要时 UI 升版──▶ 回到流水线
执行者 ──UI_UNCLEAR──▶ UI Agent ──UI-vN+1(Ready)──▶ 继续实现
```

---

## 4. 交接物、版本与开工闸门

### 4.1 交付物清单（单一存放位置）

所有交接物统一放在**前端仓库**（UI Agent 与执行者只在前端）；后端仓库不复制交付物。

| 交付物 | 编号 | 产出方 | 存放位置 | 状态 |
|--------|------|--------|---------|------|
| PRD | `PRD-<module>-vN` | PM/PD | 前端仓库 `docs/prd/<module>/prd.md` | Draft / Approved / Blocked |
| UI Brief | `UIB-<module>-vN` | PM/PD | 前端仓库 `docs/prd/<module>/ui-brief.md` | 随 PRD 同版 |
| 类型映射 / WS 事件 | `MAP-<module>-vN` | PM/PD | 前端仓库 `docs/sync/` | 随 PRD 同版 |
| UI 规范 | `UI-<module>-vN` | UI | 前端仓库 `docs/ui/<module>/` | Draft / Ready / Blocked |
| 优先级矩阵 | — | PM/PD | `pm-pd-agent.md` 第 2.3 节 | 唯一来源，不另存副本 |
| 开放问题 | — | PM/PD | 前端仓库 `docs/open-questions.md` | 未关闭项必须注明卡住哪条 AC |

> 后端仓库的 PM 通过 `../ICTL-specialApplication/docs/...` 读取这些文件，不另存副本。

### 4.2 状态与批准权

- **PRD 的 Approved 只能由用户（产品拍板人）给出**；PM/PD 不得自批，不得把 Draft 直接交给下游。
- UI 规范 Ready 由 UI Agent 声明，前提是上游 PRD 已 Approved。
- 任何修改都升版（vN → vN+1）并在文末追加变更记录；旧版标 `Superseded`。
- 升级关闭以"新版本文档 + 变更记录"为准，口头结论不算。

### 4.3 开工闸门（缺一不可）

| 角色 | 允许开工的最低条件 | 缺件时 |
|------|-------------------|--------|
| UI Agent | `Approved` PRD + 同版 `UIB` + AC 涉及的 `MAP` | 回 PM/PD（`SCOPE_CREEP`），不得自行补业务 |
| 执行者 | `Approved` PRD + `Ready` UI 规范 + `MAP`，并写明引用版本 | 不得开工，按第 5 节选码升级 |
| PM/PD | 用户需求 + 已读 `API.md` / 前端现状 | 先补可行性评估，不得直接写 AC |

### 4.4 PM 定义跨仓同步（硬性）

以下文件在两个仓库必须**逐字节一致**，以前端仓库 `ICTL-specialApplication` 为基准：

- `docs/agents/pm-pd-agent.md`
- `.trae/agents/pm-agent.md`

任何改动：

1. 先改前端仓库版本
2. 立即复制到后端仓库同名路径
3. 用 SHA-256 校验两仓哈希相同；不一致不得提交
4. 两仓 README 不要求逐字节一致（索引与跨仓链接可按仓库调整），但职责边界、交接闸门、升级协议必须语义一致

---

## 5. 升级协议（先分类，再选码）

判定顺序不可跳：

1. 这条业务规则 / 用户可见行为，PRD 写了吗？**没写** → `SCOPE_CREEP`
2. 写了，但后端 / WS / 数据撑不住，或达不到 AC 的精度？→ `TECH_BLOCKER`
3. 撑得住，但违反 UI 硬性规则 / 色彩系统且无法用现有 Token 表达？→ `DESIGN_CONFLICT`
4. 都通过，但 UI 规范缺落地信息？→ `UI_UNCLEAR`

| 升级码 | 唯一触发条件（需同时满足） | 回落给 | 回落方只能做什么 | 关闭条件 |
|--------|---------------------------|--------|-----------------|---------|
| `TECH_BLOCKER` | ① PRD 已明确该行为；② 依赖后端不存在的 API/表/字段/WS 事件，或现有能力达不到 AC 精度（如 node-cron 误差 ≤60s） | **PM/PD** | 放宽/改写 AC，或判本期不做；不得让 UI 或执行者私改契约 | PRD 升版 + `MAP` 更新 |
| `SCOPE_CREEP` | ① 该业务规则或用户可见行为 PRD 未定义；② 不涉及技术能力 | **PM/PD** | 写进 AC，或写进"非目标" | PRD 升版（AC 或非目标更新） |
| `DESIGN_CONFLICT` | ① PRD 已明确且技术可行；② 用户可见结果与 [ui-agent 硬性规则](./ui-agent.md) 或色彩系统冲突；③ 无法用现有 Token 表达 | **PM/PD** | 三选一：改 AC/降级、本期不做、授权 UI 在现有规则内提替代方案；**不得指定颜色/圆角/动效数值** | PRD 升版；若授权替代，UI 规范再升版 |
| `UI_UNCLEAR` | ① PRD 明确、技术可行、无规则冲突；② UI 规范缺执行信息（入口、状态覆盖、Props、class、动效参数、文案、适配） | **UI Agent** | 补规范并升版；不得借机改 PRD 行为或验收标准 | UI 规范升版 |

**不计入升级**：

- 纯前端实现选型、性能、第三方库问题由执行者按现有规范自行决定；只有当它导致某条 AC 无法验证时，才转 `TECH_BLOCKER`。
- UI Agent 怀疑动效不可实现，只能标"实现风险：高/低"，不能代替执行者做可行性结论；实测不可行由执行者发 `TECH_BLOCKER`。

**不允许的绕过**：

- 口头达成一致不算关闭；PM 用"改成紫色/加个动画"关闭 `DESIGN_CONFLICT` 属于越界，UI 应拒绝执行。
- 执行者遇到缺件自行"先做了再说"，视为跳过闸门，验收不予通过。

---

## 6. 当前优先级（唯一来源）

优先级与"做不做"只在 [`pm-pd-agent.md` 第 2.3 节](./pm-pd-agent.md) 维护；本文件**不再复制优先级表**，避免两处漂移。

UI Agent 的模块清单只登记"规范状态"，不得自带 P0/P1；没有 Approved PRD 的模块不得先出规范。

---

## 7. 硬约束速查

### PM/PD 铁律

- ❌ 禁止注册流程、配对码、邀请码
- ❌ 禁止多租户、workspace、space_id
- ❌ 禁止复杂角色权限（ADMIN / USER / OBSERVER）
- ❌ 禁止在 PRD / UI Brief 里写颜色、圆角、动效数值、按钮位置（需要区分时只描述业务语义）
- ✅ 必须评估技术可行性（后端有 API 吗？WS 能承载吗？）
- ✅ 必须明确离线同步策略（乐观更新 + pending 状态）
- ✅ 每个 PRD 必须附同版 UI Brief，AC 必须编号

### UI Agent 铁律

- ❌ 禁止引入 User A（蓝）/ User B（玫瑰红）之外的主色调
- ❌ 禁止深色模式（`app.json` 锁定 `userInterfaceStyle: "light"`）
- ❌ 禁止大面积复杂渐变（仅纪念日卡片可小面积用）
- ❌ 禁止输出优先级、模块是否开发、业务规则或新增业务状态
- ✅ 必须 Tailwind class（动态值除外，禁止裸 inline style）
- ✅ 必须 lucide-react-native 图标
- ✅ 必须 SafeAreaView 适配
- ✅ 每个页面必须有状态覆盖矩阵，并映射到 AC 编号

---

## 8. 文档索引（按仓库）

| 文档 | 位置 | 谁看 |
|------|------|------|
| PM/PD 完整定义 | 本仓库 [`pm-pd-agent.md`](./pm-pd-agent.md) | 做产品决策时读 |
| UI 完整定义 | 本仓库 [`ui-agent.md`](./ui-agent.md)（仅前端仓库持有） | 做界面设计时读 |
| 前端架构 | `ICTL-specialApplication/docs/ARCHITECTURE.md` | 双方都看 |
| 后端 API | `ICTL-duo-Back/docs/API.md` | **PM/PD 必读** |
| 后端架构 | `ICTL-duo-Back/docs/ARCHITECTURE.md` | PM/PD 要看 |
| 后端仓库的 PM 定义 | `ICTL-duo-Back/docs/agents/pm-pd-agent.md` | 与前端版同步，前端版为准 |

---

## 变更记录

| 版本 | 日期 | 变更 |
|------|------|------|
| v2 | 2026-11-17 | 定义文件移入两个 git 仓库；新增交接物/版本/闸门；升级码补触发与关闭条件；删除重复优先级表；UI 规范补最低完备度 |
