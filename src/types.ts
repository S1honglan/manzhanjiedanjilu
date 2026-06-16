// 订单状态
export type OrderStatus = '预付定金' | '工作中' | '交付'

// 客户订单
export interface ClientOrder {
  id: string
  projectId: string        // 所属漫展项目 ID
  character: string        // 拍摄角色（卡片大标题）
  customerName: string     // 客户昵称
  photoCount: number       // 拍摄张数
  price: number            // 全款价格
  deposit: number          // 客户付的定金
  totalIncome: number      // 全部收入
  status: OrderStatus      // 订单状态
  note: string             // 备注
  createdAt: string        // 创建时间
  updatedAt: string        // 更新时间
}

// 项目卡片颜色选项（基于整体配色）
export const PROJECT_COLORS = [
  { name: '默认白', value: '#ffffff' },
  { name: '暖灰', value: '#edefed' },
  { name: '淡绿', value: '#e2eae3' },
  { name: '灰蓝', value: '#e3e8ee' },
  { name: '淡蓝', value: '#e5eff6' },
  { name: '浅湖蓝', value: '#ecf4f8' }
]

// 暗色模式下项目卡片背景映射
export function getDarkCardBg(lightColor: string): string {
  const map: Record<string, string> = {
    '#ffffff': '#292d31',
    '#edefed': '#292d31',
    '#e2eae3': '#28302b',
    '#e3e8ee': '#282d32',
    '#e5eff6': '#272e33',
    '#ecf4f8': '#272e33'
  }
  return map[lightColor] || '#292d31'
}

// 漫展项目
export interface ExpoProject {
  id: string
  name: string             // 漫展名称
  date: string             // 漫展日期（YYYY-MM-DD）
  color: string            // 卡片背景色（hex）
  orders: ClientOrder[]    // 该项目下的客户订单
  createdAt: string
  updatedAt: string
}
