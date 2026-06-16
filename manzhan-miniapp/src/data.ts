// ============ 类型定义 ============

export type OrderStatus = '预付定金' | '工作中' | '交付'

export interface ClientOrder {
  id: string
  projectId: string
  character: string
  customerName: string
  photoCount: number
  price: number
  deposit: number
  totalIncome: number
  status: OrderStatus
  note: string
  createdAt: string
  updatedAt: string
}

export interface ExpoProject {
  id: string
  name: string
  date: string
  orders: ClientOrder[]
  createdAt: string
  updatedAt: string
}

// ============ 示例数据 ============

const now = new Date().toISOString()

export const initialProjects: ExpoProject[] = [
  {
    id: 'proj-1',
    name: 'CP30 魔都同人祭',
    date: '2026-07-15',
    orders: [
      {
        id: 'order-1', projectId: 'proj-1',
        character: '2B（尼尔：自动人形）',
        customerName: '月色',
        photoCount: 120, price: 880, deposit: 400, totalIncome: 880,
        status: '交付', note: '高清数字版 + 精修 10 张',
        createdAt: now, updatedAt: now
      },
      {
        id: 'order-2', projectId: 'proj-1',
        character: '八重神子（原神）',
        customerName: '星空',
        photoCount: 95, price: 720, deposit: 0, totalIncome: 720,
        status: '工作中', note: '等待客户精修要求',
        createdAt: now, updatedAt: now
      }
    ],
    createdAt: now, updatedAt: now
  },
  {
    id: 'proj-2',
    name: '萤火虫动漫嘉年华',
    date: '2026-08-20',
    orders: [
      {
        id: 'order-3', projectId: 'proj-2',
        character: '雷电将军（原神）',
        customerName: '晚风',
        photoCount: 60, price: 500, deposit: 200, totalIncome: 500,
        status: '预付定金', note: '',
        createdAt: now, updatedAt: now
      }
    ],
    createdAt: now, updatedAt: now
  }
]

// ============ 存储层 ============

const STORAGE_KEY = 'expo-projects'

export function loadProjects(): ExpoProject[] {
  try {
    // @ts-ignore
    const data = Taro.getStorageSync(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function saveProjects(projects: ExpoProject[]): void {
  try {
    // @ts-ignore
    Taro.setStorageSync(STORAGE_KEY, JSON.stringify(projects))
  } catch (e) {
    console.error('保存失败:', e)
  }
}
