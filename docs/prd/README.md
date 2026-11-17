# PRD 与 UI Brief 目录

本目录存放 PM/PD Agent 的交接物。下游（UI Agent、执行者）只认这里的 `Approved` 文档。

## 目录结构

```
docs/prd/
└── <module>/
    ├── prd.md        # PRD-<module>-vN
    └── ui-brief.md   # UIB-<module>-vN（与 PRD 同版）
```

## 硬性规则

- 每份文档头部必须有：编号、版本、状态（`Draft` / `Approved` / `Blocked`）、变更记录。
- `Approved` 只能由用户（产品拍板人）给出；PM/PD 不得自批，Draft 不得交给下游。
- PRD 的验收标准必须逐条编号 `AC-01…`；状态清单中的每个状态都要对应到 AC。
- UI Brief 只描述业务语义（页面/入口、字段、状态、身份可见性、术语、业务结果），禁止出现颜色、圆角、像素、动效数值、控件位置、图标选择。
- 优先级只在 `docs/agents/pm-pd-agent.md` 第 2.3 节维护，本目录不复制优先级表。
- 修改必须升版并在文末追加变更记录；旧版标 `Superseded`。

模板与判定规则见 `docs/agents/pm-pd-agent.md` 第 4.2、4.6、4.7 节。
