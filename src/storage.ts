import { ExpoProject, ClientOrder } from './types'

const STORAGE_KEY = 'expo-projects'

// 加载所有漫展项目
export function loadProjects(): ExpoProject[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('加载项目数据失败:', error)
    return []
  }
}

// 保存所有漫展项目
export function saveProjects(projects: ExpoProject[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
  } catch (error) {
    console.error('保存项目数据失败:', error)
  }
}

// 添加一个项目
export function addProject(projects: ExpoProject[], project: ExpoProject): ExpoProject[] {
  const updated = [...projects, project]
  saveProjects(updated)
  return updated
}

// 更新一个项目
export function updateProject(projects: ExpoProject[], updatedProject: ExpoProject): ExpoProject[] {
  const updated = projects.map((p) => (p.id === updatedProject.id ? updatedProject : p))
  saveProjects(updated)
  return updated
}

// 删除一个项目（及其下所有订单）
export function deleteProject(projects: ExpoProject[], projectId: string): ExpoProject[] {
  const updated = projects.filter((p) => p.id !== projectId)
  saveProjects(updated)
  return updated
}

// 在指定项目下添加订单
export function addOrder(projects: ExpoProject[], projectId: string, order: ClientOrder): ExpoProject[] {
  const updated = projects.map((p) => {
    if (p.id === projectId) {
      return { ...p, orders: [...p.orders, order], updatedAt: new Date().toISOString() }
    }
    return p
  })
  saveProjects(updated)
  return updated
}

// 更新指定订单
export function updateOrder(projects: ExpoProject[], projectId: string, updatedOrder: ClientOrder): ExpoProject[] {
  const updated = projects.map((p) => {
    if (p.id === projectId) {
      return {
        ...p,
        orders: p.orders.map((o) => (o.id === updatedOrder.id ? updatedOrder : o)),
        updatedAt: new Date().toISOString()
      }
    }
    return p
  })
  saveProjects(updated)
  return updated
}

// 删除指定订单
export function deleteOrder(projects: ExpoProject[], projectId: string, orderId: string): ExpoProject[] {
  const updated = projects.map((p) => {
    if (p.id === projectId) {
      return {
        ...p,
        orders: p.orders.filter((o) => o.id !== orderId),
        updatedAt: new Date().toISOString()
      }
    }
    return p
  })
  saveProjects(updated)
  return updated
}
