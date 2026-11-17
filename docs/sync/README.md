# 前后端对齐目录

本目录存放 PM/PD 的接口契约交接物，编号 `MAP-<module>-vN`，与 PRD 同版。

```
docs/sync/
├── type-mapping.md   # 前端字段 ↔ 后端字段、转换规则
└── ws-events.md      # 后端 WS 事件名 ↔ 前端事件名、结论
```

规则：

- AC 涉及字段或 WS 事件时，PRD 必须引用本目录对应文件；缺失视为 Draft，不得交接。
- 契约变更由 PM/PD 统一升版；UI Agent 与执行者不得私自改字段名或事件名。
- 后端能力做不到时走 `TECH_BLOCKER` 回 PM，不在本目录"先改再说"。
- 后端仓库不复制本目录，通过 `../ICTL-specialApplication/docs/sync/` 读取。
