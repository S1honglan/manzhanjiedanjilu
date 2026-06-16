# 技术规范

## 目标平台

- Web 响应式应用，支持电脑端浏览器和手机端浏览器。
- 兼容主流现代浏览器（Chrome、Edge、Safari、Firefox 最新版）。

## 技术栈

- 前端框架：React + Vite + TypeScript
- 样式：Plain CSS（使用 CSS 变量管理主题色）
- 数据存储：浏览器 localStorage
- 无需后端服务器，纯前端应用

## 数据结构设计

### 漫展项目（ExpoProject）

```typescript
interface ExpoProject {
  id: string            // 唯一标识，如 'proj-1700000000000'
  name: string          // 漫展名称，如 'CP30'
  date: string          // 漫展日期，格式 'YYYY-MM-DD'
  orders: ClientOrder[] // 该项目下的客户订单列表
  createdAt: string     // 创建时间 ISO string
  updatedAt: string     // 更新时间 ISO string
}
```

### 客户订单（ClientOrder）

```typescript
type OrderStatus = '预付定金' | '工作中' | '交付'

interface ClientOrder {
  id: string         // 唯一标识
  projectId: string  // 所属项目 ID
  character: string  // 拍摄角色（卡片大标题）
  customerName: string // 客户昵称
  photoCount: number // 拍摄张数
  price: number      // 全款价格
  deposit: number    // 客户付的定金
  totalIncome: number // 全部收入（这个订单的总收入）
  status: OrderStatus // 订单状态
  note: string       // 备注
  createdAt: string  // 创建时间
  updatedAt: string  // 更新时间
}
```

### 数据存储方案

- 使用单一 localStorage key：`expo-projects`
- 值存储 `ExpoProject[]` 的 JSON 序列化
- 启动时从 localStorage 读取，每次修改后自动保存

## 组件树结构

```
App
├── Header（顶部标题栏）
├── HomePage（首页：项目卡片网格）
│   ├── ProjectCard[]（项目卡片列表）
│   └── NewProjectForm（新建项目表单/模态框）
├── ProjectPage（项目内页：订单卡片列表）
│   ├── SearchFilterBar（搜索筛选栏）
│   ├── OrderCard[]（订单卡片列表）
│   └── OrderForm（新建/编辑订单表单）
└── BottomNav（底部导航：手机端）
```

## 页面路由

本期不使用路由库，采用状态切换式导航：
- `view: 'home'` → HomePage
- `view: 'project'` + `activeProject` → ProjectPage
- 表单以模态框/抽屉面板形式覆盖

## 响应式布局策略

- 断点：**768px**
- 桌面端（≥768px）：项目卡片 2-3 列网格，订单卡片 2 列网格
- 手机端（<768px）：单列卡片列表，底部导航栏固定
- 使用 CSS media query + 弹性布局

## 搜索与筛选实现

### 搜索
- 实时过滤，无需按回车
- 搜索范围：角色名、客户昵称
- 大小写不敏感

### 筛选
- 状态筛选：全部 / 预付定金 / 工作中 / 交付
- 日期筛选：按漫展日期范围筛选（可选，后期完善）

## 第一期不做的功能

- ❌ Excel 导入导出（保留技术选型 xlsx 库，代码后续添加）
- ❌ 统计分析看板
- ❌ 后端 API 对接
