import { ExpoProject, ClientOrder } from './types'

// 创建订单的辅助函数
function makeOrder(overrides: Partial<ClientOrder> & { id: string; projectId: string; character: string; customerName: string }): ClientOrder {
  const now = new Date().toISOString()
  return {
    photoCount: 0,
    deposit: 0,
    totalIncome: 0,
    timeStart: '',
    timeEnd: '',
    status: '预付定金',
    note: '',
    createdAt: now,
    updatedAt: now,
    ...overrides
  }
}

// 初始示例数据：两个漫展项目，每个下面有几个订单
export const initialProjects: ExpoProject[] = [
  {
    id: 'proj-1',
    name: 'CP30 魔都同人祭',
    date: '2026-07-15',
    dateEnd: '2026-07-16',
    color: '#ffffff',
    orders: [
      makeOrder({ id: 'order-1', projectId: 'proj-1', character: '2B（尼尔：自动人形）', customerName: '月色', photoCount: 120, deposit: 400, totalIncome: 880, status: '交付', note: '高清数字版 + 精修 10 张' }),
      makeOrder({ id: 'order-2', projectId: 'proj-1', character: '八重神子（原神）', customerName: '星空', photoCount: 95, deposit: 0, totalIncome: 720, status: '工作中', note: '等待客户精修要求' }),
      makeOrder({ id: 'order-3', projectId: 'proj-1', character: '阿梅莉亚（欧米伽魔族）', customerName: '晨曦', photoCount: 180, deposit: 600, totalIncome: 1200, status: '预付定金', note: '下周三前交付所有素材' })
    ],
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'proj-2',
    name: '萤火虫动漫嘉年华',
    date: '2026-08-20',
    dateEnd: '',
    color: '#e8f2fc',
    orders: [
      makeOrder({ id: 'order-4', projectId: 'proj-2', character: '雷电将军（原神）', customerName: '晚风', photoCount: 60, deposit: 200, totalIncome: 500, status: '预付定金', note: '' })
    ],
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString()
  }
]
