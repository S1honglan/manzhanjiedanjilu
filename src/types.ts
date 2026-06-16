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

// 漫展项目
export interface ExpoProject {
  id: string
  name: string             // 漫展名称
  date: string             // 漫展日期（YYYY-MM-DD）
  orders: ClientOrder[]    // 该项目下的客户订单
  createdAt: string
  updatedAt: string
}
