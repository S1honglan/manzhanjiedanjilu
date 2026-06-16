# 开发标准

## 开发流程

1. 先阅读 `docs/requirements.md`，确认当前开发目标。
2. 参考 `docs/technical-spec.md` 选定技术实现方式。
3. 按 `docs/design-guidelines.md` 规范进行界面设计和样式实现。
4. 按 `docs/development-plan.md` 确认当前所处阶段。
5. 开发完成后，记录变更并更新相关文档。

## 版本控制

- 使用 Git 管理代码。
- 一个阶段一条分支，完成后合并到 master。
- 提交信息简洁明确，使用 `feat:`、`fix:`、`docs:`、`refactor:` 前缀。

## 代码规范

- 使用一致命名：
  - 组件文件/目录：`PascalCase`（如 `OrderCard.tsx`、`ProjectCard.tsx`）
  - 类型/接口：`PascalCase`
  - 函数/变量：`camelCase`
- 组件职责单一，避免冗长文件（单个文件不超过 300 行为宜）。
- 样式每个组件独立 CSS 文件或集中管理，使用 CSS 变量保持一致性。
- 避免 any 类型，优先使用明确类型定义。

## 数据管理

- 所有数据通过 `src/storage.ts` 读写 localStorage。
- 数据结构变更时需做好兼容处理。
- 提供示例数据的脚本/文件，方便开发测试。

## 测试与校验

- 每个阶段完成后手动验证核心流程：
  - 阶段 2：项目新建/编辑/删除
  - 阶段 3：订单新建/编辑/删除
  - 阶段 4：搜索筛选正常工作
  - 阶段 5：桌面+手机端整体回归
- 确保响应式布局在手机和桌面上均可正常使用。
- 发现 bug 及时记录并在开发日志中标注。

## 开发日志

- 开发日志存放在 `development-logs/`。
- 每日开发结束后创建 `YYYY-MM-DD.md`。
- 每个日志包含"已完成事项"和"待办事项"。
- 日志模板：

  ```markdown
  # 开发日志 - YYYY-MM-DD

  ## 已完成事项
  - 

  ## 待办事项
  - 
  ```

## 文档更新

- 需求变更时更新 `docs/requirements.md`。
- 技术方案调整时更新 `docs/technical-spec.md`。
- UI 样式或配色调整时更新 `docs/design-guidelines.md`。
- 流程和规范调整时更新 `docs/development-standards.md`。
- 阶段进度变化时更新 `docs/development-plan.md`。
