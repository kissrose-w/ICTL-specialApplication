# UI 规范目录

本目录存放 UI Agent 的交付物，编号 `UI-<module>-vN`。

## 目录结构

```
docs/ui/
├── components.md        # 组件规范清单（Props / 变体 / 状态）
├── tokens.md            # 设计 Token 与 Tailwind class 映射
├── interactions.md      # 交互模式与动效参数（伪代码，不含可运行实现）
├── current/
│   └── screenshots/     # 现状截图（稳定命名 01-…，供提案引用）
├── proposal/            # 设计提案（自包含 HTML，不入 App 构建）
└── <module>/
    └── wireframe.md     # 页面线框图 + 状态覆盖矩阵（映射 AC）
```

截图与设计提案一律落在本目录内，不写到两个仓库之外的路径。

## 硬性规则

- 文档头必须有：编号、版本、状态（`Draft` / `Ready` / `Blocked`）、上游 PRD/UIB/MAP 版本、变更记录。
- 只接 `Approved` PRD + 同版 UI Brief + 类型映射；缺件回 PM（`SCOPE_CREEP`），不得自行补业务。
- 每个页面必须有状态覆盖矩阵：PRD 的每个状态 × 视觉呈现 × 覆盖的 `AC-xx`；缺一个状态不得标 `Ready`。
- 不得新增/删除业务状态；不得定义优先级或模块是否开发。
- 不写可运行代码；"代码示例"只能是伪代码、参数与 class 示意。

详细要求见 `docs/agents/ui-agent.md` 第 3.6 节。
