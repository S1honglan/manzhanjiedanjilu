import { ExpoProject, ClientOrder } from './types'

const STORAGE_KEY = 'expo-projects'

function normalizeProject(p: any): ExpoProject {
  return { ...p, color: p.color || '#ffffff' }
}

export function loadProjects(): ExpoProject[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data).map(normalizeProject) : []
  } catch (error) {
    console.error('加载项目数据失败:', error)
    return []
  }
}

export function saveProjects(projects: ExpoProject[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(projects)) } catch (e) { console.error('保存失败:', e) }
}

export function addProject(projects: ExpoProject[], project: ExpoProject): ExpoProject[] { const u = [...projects, project]; saveProjects(u); return u }
export function updateProject(projects: ExpoProject[], p: ExpoProject): ExpoProject[] { const u = projects.map(x => x.id === p.id ? p : x); saveProjects(u); return u }
export function deleteProject(projects: ExpoProject[], id: string): ExpoProject[] { const u = projects.filter(x => x.id !== id); saveProjects(u); return u }
export function addOrder(projects: ExpoProject[], pid: string, o: ClientOrder): ExpoProject[] { const u = projects.map(p => p.id === pid ? { ...p, orders: [...p.orders, o], updatedAt: new Date().toISOString() } : p); saveProjects(u); return u }
export function updateOrder(projects: ExpoProject[], pid: string, o: ClientOrder): ExpoProject[] { const u = projects.map(p => p.id === pid ? { ...p, orders: p.orders.map(x => x.id === o.id ? o : x), updatedAt: new Date().toISOString() } : p); saveProjects(u); return u }
export function deleteOrder(projects: ExpoProject[], pid: string, oid: string): ExpoProject[] { const u = projects.map(p => p.id === pid ? { ...p, orders: p.orders.filter(x => x.id !== oid), updatedAt: new Date().toISOString() } : p); saveProjects(u); return u }
