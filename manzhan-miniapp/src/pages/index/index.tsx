// ============ 核心页面入口 ============

import { useCallback, useEffect, useMemo, useState } from 'react'
import { View, Text, Input, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { ExpoProject, ClientOrder, OrderStatus, initialProjects, loadProjects, saveProjects } from '../../data'
import './index.scss'

interface OrderFormData {
  character: string
  customerName: string
  photoCount: number
  price: number
  deposit: number
  totalIncome: number
  status: OrderStatus
  note: string
}

const STATUS_OPTIONS: OrderStatus[] = ['预付定金', '工作中', '交付']

const STATUS_CLASS_MAP: Record<OrderStatus, string> = {
  '预付定金': 's-prepay',
  '工作中': 's-working',
  '交付': 's-done'
}

const EMPTY_ORDER_FORM: OrderFormData = {
  character: '', customerName: '', photoCount: 0,
  price: 0, deposit: 0, totalIncome: 0,
  status: '预付定金', note: ''
}

export default function Index() {
  const [projects, setProjects] = useState<ExpoProject[]>([])
  const [view, setView] = useState<'home' | 'project'>('home')
  const [activeProject, setActiveProject] = useState<ExpoProject | null>(null)

  // 全局搜索
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderStatus | '全部'>('全部')

  // 项目表单
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [editingProject, setEditingProject] = useState<ExpoProject | null>(null)
  const [pjName, setPjName] = useState('')
  const [pjDate, setPjDate] = useState('')
  const [pjDeleteConfirm, setPjDeleteConfirm] = useState(false)

  // 订单表单
  const [showOrderForm, setShowOrderForm] = useState(false)
  const [editingOrder, setEditingOrder] = useState<ClientOrder | null>(null)
  const [of, setOf] = useState<OrderFormData>(EMPTY_ORDER_FORM)
  const [orderDeleteConfirm, setOrderDeleteConfirm] = useState(false)

  // 初始化
  useEffect(() => {
    const saved = loadProjects()
    setProjects(saved.length > 0 ? saved : initialProjects)
    if (saved.length === 0) saveProjects(initialProjects)
  }, [])

  const refresh = useCallback(() => setProjects(loadProjects()), [])

  // 计算
  const dashboard = useMemo(() => {
    let totalOrders = 0, totalIncome = 0, unfinished = 0
    for (const p of projects) {
      totalOrders += p.orders.length
      for (const o of p.orders) {
        totalIncome += o.totalIncome
        if (o.status !== '交付') unfinished++
      }
    }
    return { totalOrders, totalIncome, unfinished }
  }, [projects])

  const globalResults = useMemo(() => {
    const text = searchText.trim().toLowerCase()
    if (!text) return []
    const res: { order: ClientOrder; projectName: string; projectId: string }[] = []
    for (const p of projects) {
      for (const o of p.orders) {
        if (o.character.toLowerCase().includes(text) || o.customerName.toLowerCase().includes(text) || o.note.toLowerCase().includes(text)) {
          res.push({ order: o, projectName: p.name, projectId: p.id })
        }
      }
    }
    return res
  }, [projects, searchText])

  const filteredOrders = useMemo(() => {
    if (!activeProject) return []
    return activeProject.orders.filter((o) => {
      const t = searchText.trim().toLowerCase()
      const m = !t || o.character.toLowerCase().includes(t) || o.customerName.toLowerCase().includes(t)
      return m && (statusFilter === '全部' || o.status === statusFilter)
    })
  }, [activeProject, searchText, statusFilter])

  // ===== 项目 CRUD =====
  function openNewProject() {
    setEditingProject(null)
    setPjName(''); setPjDate('')
    setShowProjectForm(true)
  }

  function openEditProject(p: ExpoProject) {
    setEditingProject(p)
    setPjName(p.name); setPjDate(p.date)
    setShowProjectForm(true)
  }

  function saveProject() {
    if (!pjName.trim() || !pjDate) return
    const all = loadProjects()
    const now = new Date().toISOString()
    if (editingProject) {
      const i = all.findIndex((x) => x.id === editingProject.id)
      if (i !== -1) all[i] = { ...all[i], name: pjName.trim(), date: pjDate, updatedAt: now }
    } else {
      all.push({ id: `p-${Date.now()}`, name: pjName.trim(), date: pjDate, orders: [], createdAt: now, updatedAt: now })
    }
    saveProjects(all)
    refresh()
    setShowProjectForm(false)
  }

  function deleteProject() {
    if (!editingProject) return
    const all = loadProjects().filter((x) => x.id !== editingProject.id)
    saveProjects(all)
    refresh()
    setShowProjectForm(false)
    setPjDeleteConfirm(false)
    if (activeProject?.id === editingProject.id) { setActiveProject(null); setView('home') }
  }

  // ===== 订单 CRUD =====
  function openNewOrder() {
    setEditingOrder(null)
    setOf(EMPTY_ORDER_FORM)
    setShowOrderForm(true)
  }

  function openEditOrder(o: ClientOrder) {
    setEditingOrder(o)
    setOf({ character: o.character, customerName: o.customerName, photoCount: o.photoCount, price: o.price, deposit: o.deposit, totalIncome: o.totalIncome, status: o.status, note: o.note })
    setShowOrderForm(true)
  }

  function saveOrder() {
    if (!activeProject || !of.character.trim() || !of.customerName.trim()) return
    const all = loadProjects()
    const i = all.findIndex((x) => x.id === activeProject.id)
    if (i === -1) return
    const now = new Date().toISOString()
    if (editingOrder) {
      all[i].orders = all[i].orders.map((x) => x.id === editingOrder.id ? { ...x, ...of, updatedAt: now } : x)
    } else {
      all[i].orders.push({ ...of, id: `o-${Date.now()}`, projectId: activeProject.id, createdAt: now, updatedAt: now })
    }
    all[i].updatedAt = now
    saveProjects(all)
    refresh()
    // sync active
    setActiveProject(all[i])
    setShowOrderForm(false)
  }

  function deleteOrder() {
    if (!activeProject || !editingOrder) return
    const all = loadProjects()
    const i = all.findIndex((x) => x.id === activeProject.id)
    if (i === -1) return
    all[i].orders = all[i].orders.filter((x) => x.id !== editingOrder.id)
    all[i].updatedAt = new Date().toISOString()
    saveProjects(all)
    refresh()
    setActiveProject(all[i])
    setShowOrderForm(false)
    setOrderDeleteConfirm(false)
  }

  // ====== UI Helpers ======
  function enterProject(id: string) {
    const p = loadProjects().find((x) => x.id === id)
    if (p) { setActiveProject(p); setView('project'); setSearchText(''); setStatusFilter('全部') }
  }

  function goHome() {
    setView('home'); setActiveProject(null); setSearchText(''); setStatusFilter('全部')
  }

  const projectsWithStats = useMemo(() => projects.map((p) => ({
    ...p,
    orderCount: p.orders.length,
    income: p.orders.reduce((s, o) => s + o.totalIncome, 0)
  })), [projects])

  // ====== 渲染 ======
  return (
    <View className='app'>
      {/* ============ 首页 ============ */}
      {view === 'home' && (
        <View className='page'>
          {/* 数据面板 */}
          <View className='dash'>
            <View className='dash-item'><Text className='dash-val'>{dashboard.totalOrders}</Text><Text className='dash-lbl'>总订单</Text></View>
            <View className='dash-item'><Text className='dash-val'>¥{dashboard.totalIncome.toLocaleString()}</Text><Text className='dash-lbl'>总收入</Text></View>
            <View className='dash-item dash-warn'><Text className='dash-val'>{dashboard.unfinished}</Text><Text className='dash-lbl'>未完成</Text></View>
          </View>

          {/* 搜索 */}
          <View className='search-bar'>
            <Input className='s-input' placeholder='搜索订单（角色、昵称）...' value={searchText} onInput={(e) => setSearchText(e.detail.value)} />
            {!!searchText && <Text className='s-clear' onClick={() => setSearchText('')}>✕</Text>}
          </View>

          {/* 搜索结果 or 项目列表 */}
          {searchText ? (
            <ScrollView className='list' scrollY>
              <Text className='hint'>找到 {globalResults.length} 个匹配订单</Text>
              {globalResults.map(({ order, projectName, projectId }) => (
                <View key={order.id} className='ocard' onClick={() => enterProject(projectId)}>
                  <View className='ocard-hd'><Text className='ocard-ch'>{order.character}</Text><Text className={`stag ${STATUS_CLASS_MAP[order.status]}`}>{order.status}</Text></View>
                  <View className='ocard-info'><Text className='ocard-lbl'>客户</Text><Text>{order.customerName}</Text></View>
                  <View className='ocard-info'><Text className='ocard-lbl'>项目</Text><Text>{projectName}</Text></View>
                  <View className='ocard-info'><Text className='ocard-lbl'>张数</Text><Text>{order.photoCount} 张</Text></View>
                  <View className='ocard-info'><Text className='ocard-lbl'>定金/收入</Text><Text>¥{order.deposit} / ¥{order.totalIncome}</Text></View>
                  {!!order.note && <View className='ocard-note'>{order.note}</View>}
                </View>
              ))}
            </ScrollView>
          ) : (
            <ScrollView className='list' scrollY>
              <View className='hdr'>
                <Text className='hdr-tit'>漫展项目</Text>
                <View className='btn btn-prim' onClick={openNewProject}><Text>+ 新建</Text></View>
              </View>
              {projectsWithStats.map((p) => (
                <View key={p.id} className='pcard' onClick={() => enterProject(p.id)}>
                  <View className='pcard-left'>
                    <Text className='pcard-name'>{p.name}</Text>
                    <Text className='pcard-date'>📅 {p.date}</Text>
                    <Text className='pcard-stat'>{p.orderCount} 单 · ¥{p.income.toLocaleString()}</Text>
                  </View>
                  <View className='pcard-dot' onClick={(e) => { e.stopPropagation(); openEditProject(p) }}><Text>⋯</Text></View>
                </View>
              ))}
              {projects.length === 0 && <Text className='empty'>点击「+ 新建」添加项目</Text>}
              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </View>
      )}

      {/* ============ 项目内页 ============ */}
      {view === 'project' && activeProject && (
        <View className='page'>
          <View className='hdr'>
            <View className='btn btn-sec' onClick={goHome}><Text>← 返回</Text></View>
            <View className='hdr-info'>
              <Text className='hdr-tit'>{activeProject.name}</Text>
              <Text className='hdr-date'>📅 {activeProject.date}</Text>
            </View>
            <View className='btn btn-prim' onClick={openNewOrder}><Text>+ 订单</Text></View>
          </View>

          {/* 筛选 */}
          <View className='fbar'>
            <Input className='s-input' placeholder='搜索角色、昵称...' value={searchText} onInput={(e) => setSearchText(e.detail.value)} />
            <View className='fselect' onClick={() => {
              const opts = ['全部', '预付定金', '工作中', '交付']
              Taro.showActionSheet({ itemList: opts, success: (res) => setStatusFilter(opts[res.tapIndex] as any) })
            }}>
              <Text>{statusFilter}</Text>
            </View>
          </View>

          <ScrollView className='list' scrollY>
            {filteredOrders.map((o) => (
              <View key={o.id} className='ocard' onClick={() => openEditOrder(o)}>
                <View className='ocard-hd'><Text className='ocard-ch'>{o.character}</Text><Text className={`stag ${STATUS_CLASS_MAP[o.status]}`}>{o.status}</Text></View>
                <View className='ocard-grid'>
                  <View className='ocard-info'><Text className='ocard-lbl'>客户</Text><Text>{o.customerName}</Text></View>
                  <View className='ocard-info'><Text className='ocard-lbl'>张数</Text><Text>{o.photoCount}</Text></View>
                  <View className='ocard-info'><Text className='ocard-lbl'>全款</Text><Text>¥{o.price}</Text></View>
                  <View className='ocard-info'><Text className='ocard-lbl'>定金</Text><Text>¥{o.deposit}</Text></View>
                  <View className='ocard-info'><Text className='ocard-lbl'>总收入</Text><Text>¥{o.totalIncome}</Text></View>
                </View>
                {!!o.note && <View className='ocard-note'>{o.note}</View>}
              </View>
            ))}
            {filteredOrders.length === 0 && <Text className='empty'>暂无订单</Text>}
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      )}

      {/* ============ 项目表单弹窗 ============ */}
      {showProjectForm && (
        <View className='modal'>
          <View className='modal-content'>
            <View className='modal-hd'><Text className='modal-tit'>{editingProject ? '编辑项目' : '新建项目'}</Text><Text className='modal-x' onClick={() => setShowProjectForm(false)}>✕</Text></View>
            <View className='modal-body'>
              <View className='fg'><Text className='fg-lbl'>漫展名称 *</Text><Input className='fg-inp' placeholder='如：CP30 魔都同人祭' value={pjName} onInput={(e) => setPjName(e.detail.value)} /></View>
              <View className='fg'><Text className='fg-lbl'>漫展日期 *</Text><Input className='fg-inp' type='text' placeholder='如：2026-07-15' value={pjDate} onInput={(e) => setPjDate(e.detail.value)} /></View>
              {editingProject && (
                <View className='pj-info'>
                  <Text className='pj-info-txt'>📋 {editingProject.orders.length} 单 · ¥{editingProject.orders.reduce((s, o) => s + o.totalIncome, 0).toLocaleString()}</Text>
                  {pjDeleteConfirm ? (
                    <View className='pj-del-confirm'>
                      <Text className='pj-del-msg'>确定删除？</Text>
                      <View className='btn btn-danger' onClick={deleteProject}><Text>确认</Text></View>
                      <View className='btn btn-sec' onClick={() => setPjDeleteConfirm(false)}><Text>取消</Text></View>
                    </View>
                  ) : (
                    <View className='btn btn-danger' onClick={() => setPjDeleteConfirm(true)}><Text>删除此项目</Text></View>
                  )}
                </View>
              )}
            </View>
            <View className='modal-ft'>
              <View className='btn btn-sec' onClick={() => setShowProjectForm(false)}><Text>取消</Text></View>
              <View className='btn btn-prim' onClick={saveProject}><Text>{editingProject ? '保存' : '创建'}</Text></View>
            </View>
          </View>
        </View>
      )}

      {/* ============ 订单表单弹窗 ============ */}
      {showOrderForm && (
        <View className='modal'>
          <View className='modal-content'>
            <View className='modal-hd'><Text className='modal-tit'>{editingOrder ? '编辑订单' : '新建订单'}</Text><Text className='modal-x' onClick={() => setShowOrderForm(false)}>✕</Text></View>
            <ScrollView scrollY className='modal-scroll'>
              <View className='modal-body'>
                <View className='fg'><Text className='fg-lbl'>拍摄角色 *</Text><Input className='fg-inp' placeholder='如：雷电将军' value={of.character} onInput={(e) => setOf({ ...of, character: e.detail.value })} /></View>
                <View className='fg'><Text className='fg-lbl'>客户昵称 *</Text><Input className='fg-inp' placeholder='如：晚风' value={of.customerName} onInput={(e) => setOf({ ...of, customerName: e.detail.value })} /></View>
                <View className='fg-row'>
                  <View className='fg fg-half'><Text className='fg-lbl'>张数</Text><Input className='fg-inp' type='number' value={String(of.photoCount || '')} onInput={(e) => setOf({ ...of, photoCount: parseInt(e.detail.value) || 0 })} /></View>
                  <View className='fg fg-half'><Text className='fg-lbl'>全款 (¥)</Text><Input className='fg-inp' type='digit' value={String(of.price || '')} onInput={(e) => setOf({ ...of, price: parseFloat(e.detail.value) || 0 })} /></View>
                </View>
                <View className='fg-row'>
                  <View className='fg fg-half'><Text className='fg-lbl'>定金 (¥)</Text><Input className='fg-inp' type='digit' value={String(of.deposit || '')} onInput={(e) => setOf({ ...of, deposit: parseFloat(e.detail.value) || 0 })} /></View>
                  <View className='fg fg-half'><Text className='fg-lbl'>总收入 (¥)</Text><Input className='fg-inp' type='digit' value={String(of.totalIncome || '')} onInput={(e) => setOf({ ...of, totalIncome: parseFloat(e.detail.value) || 0 })} /></View>
                </View>
                <View className='fg'>
                  <Text className='fg-lbl'>状态</Text>
                  <View className='fg-status'>
                    {STATUS_OPTIONS.map((s) => (
                      <View key={s} className={`stag ${STATUS_CLASS_MAP[s]} ${of.status === s ? 'stag-sel' : ''}`} onClick={() => setOf({ ...of, status: s })}><Text>{s}</Text></View>
                    ))}
                  </View>
                </View>
                <View className='fg'><Text className='fg-lbl'>备注</Text><Input className='fg-inp' placeholder='补充说明' value={of.note} onInput={(e) => setOf({ ...of, note: e.detail.value })} /></View>

                {editingOrder && (orderDeleteConfirm ? (
                  <View className='pj-del-confirm'>
                    <Text className='pj-del-msg'>确定要删除此订单？</Text>
                    <View className='btn btn-danger' onClick={deleteOrder}><Text>确认</Text></View>
                    <View className='btn btn-sec' onClick={() => setOrderDeleteConfirm(false)}><Text>取消</Text></View>
                  </View>
                ) : (
                  <View className='btn btn-danger' onClick={() => setOrderDeleteConfirm(true)} style={{ marginTop: 20 }}><Text>删除此订单</Text></View>
                ))}
              </View>
            </ScrollView>
            <View className='modal-ft'>
              <View className='btn btn-sec' onClick={() => setShowOrderForm(false)}><Text>取消</Text></View>
              <View className='btn btn-prim' onClick={saveOrder}><Text>{editingOrder ? '保存' : '添加'}</Text></View>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}
