# CLAUDE 指引文档

## 项目标准文件路径

- `docs/requirements.md`：项目需求说明及功能定义。
- `docs/technical-spec.md`：技术实现方案与规范。
- `docs/design-guidelines.md`：视觉设计与交互规范。
- `docs/development-standards.md`：开发流程、版本控制、代码规范、测试标准。
- `docs/development-plan.md`：分阶段开发执行计划，详细步骤与里程碑。

## 开发日志

- 开发日志目录：`development-logs/`
- 每日开发结束后自动创建 `YYYY-MM-DD.md`，记录已完成事项与次日待办。
- 可直接使用 Bash 创建日志文件，无需依赖 PowerShell 脚本。

## 工作说明

1. 先阅读 `docs/requirements.md`，确认当前开发目标。
2. 按 `docs/technical-spec.md` 选择技术实现方式。
3. 遵循 `docs/design-guidelines.md` 进行 UI 与样式实现。
4. 根据 `docs/development-standards.md` 规范开发和版本控制。
5. 参考 `docs/development-plan.md` 了解当前处于哪个开发阶段。
6. 每日开发结束后，更新 `development-logs/YYYY-MM-DD.md`，备注已完成内容与次日待办。

## 任务推进原则

- 项目应稳步推进，不要一次性做太多。
- 先确保核心功能稳定，再逐步扩展。
- 每次开发应有明确目标和边界。
- 每完成一个阶段后，验证功能正常再进行下一阶段。
- 遇到问题及时记录，并在文档中更新相关方案。
