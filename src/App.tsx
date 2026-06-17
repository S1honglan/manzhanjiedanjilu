import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { ExpoProject, ClientOrder, OrderStatus, PROJECT_COLORS, getDarkCardBg } from './types'
import { initialProjects } from './data'
import { loadProjects, saveProjects } from './storage'
import './App.css'

// ==================== 类型 ====================

interface OrderFormData {
  character: string
  customerName: string
  timeStart: string
  timeEnd: string
  photoCount: number
  deposit: number
  totalIncome: number
  status: OrderStatus
  note: string
}

function orderToForm(order: ClientOrder): OrderFormData {
  return {
    character: order.character,
    customerName: order.customerName,
    timeStart: order.timeStart || '',
    timeEnd: order.timeEnd || '',
    photoCount: order.photoCount,
    deposit: order.deposit,
    totalIncome: order.totalIncome,
    status: order.status,
    note: order.note
  }
}

function formatTimeRange(start: string, end: string): string {
  if (!start && !end) return ''
  if (start && !end) return start
  if (!start && end) return end
  return `${start}—${end}`
}

// ==================== App ====================

function App() {
  const [projects, setProjects] = useState<ExpoProject[]>([])
  const [activeProject, setActiveProject] = useState<ExpoProject | null>(null)

  // ---- 主题 ----
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem('dark-mode') === '1' } catch { return false }
  })
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('dark-mode', darkMode ? '1' : '0')
  }, [darkMode])

  // ---- 项目表单 ----
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [editingProject, setEditingProject] = useState<ExpoProject | null>(null)
  const [projectFormName, setProjectFormName] = useState('')
  const [projectFormDate, setProjectFormDate] = useState('')
  const [projectFormColor, setProjectFormColor] = useState('#ffffff')
  const [projectFormOrders, setProjectFormOrders] = useState<ClientOrder[]>([])

  // ---- 项目删除确认 ----
  const [deleteProjectTarget, setDeleteProjectTarget] = useState<ExpoProject | null>(null)

  // ---- 订单表单 ----
  const [showOrderForm, setShowOrderForm] = useState(false)
  const [editingOrder, setEditingOrder] = useState<ClientOrder | null>(null)
  const [orderForm, setOrderForm] = useState<OrderFormData>({
    character: '', customerName: '', timeStart: '', timeEnd: '', photoCount: 0,
    deposit: 0, totalIncome: 0,
    status: '预付定金', note: ''
  })

  // ---- 订单删除确认 ----
  const [deleteOrderTarget, setDeleteOrderTarget] = useState<ClientOrder | null>(null)

  const [orderDeleteConfirm, setOrderDeleteConfirm] = useState(false)

  // ---- 搜索 ----
  const [globalSearch, setGlobalSearch] = useState('')
  const [localSearch, setLocalSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderStatus | '全部'>('全部')
  const [showUnfinishedOnly, setShowUnfinishedOnly] = useState(false)

  // 卡片状态展开
  const [expandStatusId, setExpandStatusId] = useState<string | null>(null)

  const [sortBy, setSortBy] = useState<string>('default')

  // ---- 手机端 UI 状态 ----
  const [showGlobalSearchPanel, setShowGlobalSearchPanel] = useState(false)
  const [showSortPopover, setShowSortPopover] = useState(false)
  const [showLocalSearchPanel, setShowLocalSearchPanel] = useState(false)
  const [showStatusPopover, setShowStatusPopover] = useState(false)
  const statusBtnRef = useRef<HTMLButtonElement | null>(null)

  // ---- 排序后的项目列表 ----
  const sortedProjects = useMemo(() => {
    const list = projects.map(p => ({ ...p, orderCount: p.orders.length, income: p.orders.reduce((s, o) => s + o.totalIncome, 0), unfinished: p.orders.filter(o => o.status !== '交付').length }))
    switch (sortBy) {
      case 'date-asc': return [...list].sort((a, b) => a.date.localeCompare(b.date))
      case 'date-desc': return [...list].sort((a, b) => b.date.localeCompare(a.date))
      case 'orders-asc': return [...list].sort((a, b) => a.orderCount - b.orderCount)
      case 'orders-desc': return [...list].sort((a, b) => b.orderCount - a.orderCount)
      case 'income-asc': return [...list].sort((a, b) => a.income - b.income)
      case 'income-desc': return [...list].sort((a, b) => b.income - a.income)
      default: return list
    }
  }, [projects, sortBy])

  // ---- 未完成订单列表 ----
  const unfinishedOrders = useMemo(() => {
    if (!showUnfinishedOnly) return []
    const res: { order: ClientOrder; projectName: string; projectId: string }[] = []
    for (const p of projects) {
      for (const o of p.orders) {
        if (o.status !== '交付') { res.push({ order: o, projectName: p.name, projectId: p.id }) }
      }
    }
    return res.sort((a, b) => b.order.createdAt.localeCompare(a.order.createdAt))
  }, [projects, showUnfinishedOnly])

  // 滑动返回
  const touchStartX = useRef(0)

  // 初始化
  useEffect(() => {
    const saved = loadProjects()
    if (saved.length > 0) setProjects(saved)
    else { setProjects(initialProjects); saveProjects(initialProjects) }
  }, [])

  // 聚合数据
  const dashboard = useMemo(() => {
    let totalOrders = 0, totalIncome = 0, unfinished = 0
    for (const p of projects) {
      totalOrders += p.orders.length
      for (const o of p.orders) { totalIncome += o.totalIncome; if (o.status !== '交付') unfinished++ }
    }
    return { totalOrders, totalIncome, unfinished }
  }, [projects])

  // 全局搜索
  const globalResults = useMemo(() => {
    const text = globalSearch.toLowerCase().trim(); if (!text) return []
    const res: { order: ClientOrder; projectName: string; projectId: string }[] = []
    for (const p of projects) for (const o of p.orders) if (o.character.toLowerCase().includes(text) || o.customerName.toLowerCase().includes(text) || o.note.toLowerCase().includes(text)) res.push({ order: o, projectName: p.name, projectId: p.id })
    return res
  }, [projects, globalSearch])

  // 项目内搜索
  function getFilteredOrders(): ClientOrder[] {
    if (!activeProject) return []
    return activeProject.orders.filter(o => {
      const t = localSearch.toLowerCase().trim()
      const m = !t || o.character.toLowerCase().includes(t) || o.customerName.toLowerCase().includes(t) || o.note.toLowerCase().includes(t)
      return m && (statusFilter === '全部' || o.status === statusFilter)
    })
  }

  // ---- 工具 ----
  function refresh() { setProjects(loadProjects()) }
  function syncActiveProject() { if (!activeProject) return; const f = loadProjects().find(p => p.id === activeProject.id); if (f) setActiveProject(f) }
  function handleBackHome() { setActiveProject(null); setLocalSearch(''); setStatusFilter('全部'); setShowUnfinishedOnly(false) }
  function enterProject(projectId: string) { const f = loadProjects().find(p => p.id === projectId); setActiveProject(f || null); setShowUnfinishedOnly(false) }

  // 滑动返回
  const handleTouchStart = useCallback((e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX }, [])
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.changedTouches[0].clientX - touchStartX.current > 80 && touchStartX.current < 40 && activeProject) handleBackHome()
  }, [activeProject])

  // ============ 项目 CRUD ============
  function openNewProjectForm() { setEditingProject(null); setProjectFormName(''); setProjectFormDate(''); setProjectFormColor('#ffffff'); setProjectFormOrders([]); setShowProjectForm(true) }
  function openEditProjectForm(project: ExpoProject) { setEditingProject(project); setProjectFormName(project.name); setProjectFormDate(project.date); setProjectFormColor(project.color || '#ffffff'); setProjectFormOrders([...project.orders]); setShowProjectForm(true) }

  function handleSaveProject() {
    if (!projectFormName.trim() || !projectFormDate) return
    const now = new Date().toISOString(); const all = loadProjects()
    if (editingProject) {
      const i = all.findIndex(p => p.id === editingProject.id)
      if (i !== -1) all[i] = { ...all[i], name: projectFormName.trim(), date: projectFormDate, color: projectFormColor, updatedAt: now }
    } else {
      all.push({ id: `proj-${Date.now()}`, name: projectFormName.trim(), date: projectFormDate, color: projectFormColor, orders: [], createdAt: now, updatedAt: now })
    }
    saveProjects(all); refresh(); syncActiveProject(); setShowProjectForm(false); setEditingProject(null)
  }

  function confirmDeleteProjectFromEdit() { if (editingProject) setDeleteProjectTarget(editingProject) }
  function confirmDeleteProject() {
    if (!deleteProjectTarget) return
    const all = loadProjects().filter(p => p.id !== deleteProjectTarget.id)
    saveProjects(all); refresh(); setDeleteProjectTarget(null); setShowProjectForm(false); setEditingProject(null)
    if (activeProject?.id === deleteProjectTarget.id) setActiveProject(null)
  }

  // ============ 订单 CRUD ============
  function openNewOrderForm() { setEditingOrder(null); setOrderForm({ character: '', customerName: '', timeStart: '', timeEnd: '', photoCount: 0, deposit: 0, totalIncome: 0, status: '预付定金', note: '' }); setShowOrderForm(true) }
  function openEditOrderForm(order: ClientOrder) { setEditingOrder(order); setOrderForm(orderToForm(order)); setShowOrderForm(true) }

  function handleSaveOrder() {
    if (!activeProject || !orderForm.character.trim()) return
    const now = new Date().toISOString(); const all = loadProjects(); const i = all.findIndex(p => p.id === activeProject.id); if (i === -1) return
    if (editingOrder) all[i].orders = all[i].orders.map(o => o.id === editingOrder.id ? { ...o, ...orderForm, updatedAt: now } : o)
    else all[i].orders.push({ ...orderForm, id: `order-${Date.now()}`, projectId: activeProject.id, createdAt: now, updatedAt: now })
    all[i].updatedAt = now; saveProjects(all); refresh(); syncActiveProject(); setShowOrderForm(false); setEditingOrder(null)
  }

  function confirmDeleteOrder() {
    if (!activeProject || !deleteOrderTarget) return
    const all = loadProjects(); const i = all.findIndex(p => p.id === activeProject.id); if (i === -1) return
    all[i].orders = all[i].orders.filter(o => o.id !== deleteOrderTarget.id); all[i].updatedAt = new Date().toISOString()
    saveProjects(all); refresh(); syncActiveProject(); setDeleteOrderTarget(null)
  }

  // 卡片上直接改状态
  function handleCardStatusChange(orderId: string, newStatus: OrderStatus) {
    if (!activeProject) return
    const all = loadProjects(); const i = all.findIndex(p => p.id === activeProject.id); if (i === -1) return
    all[i].orders = all[i].orders.map(o => o.id === orderId ? { ...o, status: newStatus, updatedAt: new Date().toISOString() } : o)
    all[i].updatedAt = new Date().toISOString(); saveProjects(all); refresh(); syncActiveProject(); setExpandStatusId(null)
  }

  // ============ 渲染 ============

  return (
    <div className="app-shell" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <header className="topbar">
        <div className="brand">漫展接单记录</div>
        <button className="dark-toggle" onClick={() => setDarkMode(!darkMode)} title={darkMode ? '切换亮色' : '切换暗色'}>
          {darkMode ? '☀️' : '🌙'}
        </button>
      </header>

      {/* ============================== 首页 ============================== */}
      {!activeProject && !showUnfinishedOnly && (
        <section className="home-page">
          {/* ---- 核心数据面板 ---- */}
          <div className="dashboard-card">
            <div className="dashboard-main-row">
              <div className="dashboard-main-item" onClick={() => {}}>
                <div className="dashboard-big-value">{dashboard.totalOrders}</div>
                <div className="dashboard-big-label">总订单</div>
              </div>
              <div className="dashboard-divider" />
              <div className="dashboard-main-item">
                <div className="dashboard-big-value">¥{dashboard.totalIncome.toLocaleString()}</div>
                <div className="dashboard-big-label">总收入</div>
              </div>
            </div>
            <div className="dashboard-sub-row" onClick={() => setShowUnfinishedOnly(true)}>
              <div className="dashboard-sub-value">{dashboard.unfinished} 个未完成</div>
              <span className="dashboard-sub-arrow">›</span>
            </div>
          </div>

          {/* ---- 工具栏 ---- */}
          <div className="toolbar">
            <button className="tool-btn" onClick={() => { setShowSortPopover(!showSortPopover); setShowGlobalSearchPanel(false) }}>↕</button>
            <button className="tool-btn" onClick={() => { setShowGlobalSearchPanel(!showGlobalSearchPanel); setShowSortPopover(false) }}>🔍</button>
            <div className="toolbar-spacer" />
            <button className="btn primary" onClick={openNewProjectForm}>+ 新建项目</button>
          </div>

          {/* ---- 排序浮窗 ---- */}
          {showSortPopover && (
            <div className="popover">
              {[{ v: 'default', l: '默认排序' }, { v: 'date-asc', l: '时间升序' }, { v: 'date-desc', l: '时间降序' }, { v: 'orders-desc', l: '订单降序' }, { v: 'orders-asc', l: '订单升序' }, { v: 'income-desc', l: '金额降序' }, { v: 'income-asc', l: '金额升序' }]
                .map(o => (<div key={o.v} className={`popover-item ${sortBy === o.v ? 'popover-item-sel' : ''}`} onClick={() => { setSortBy(o.v); setShowSortPopover(false) }}>{o.l}</div>))}
            </div>
          )}

          {/* ---- 手机端全局搜索面板 ---- */}
          {showGlobalSearchPanel && (
            <div className="search-panel-bar">
              <input className="search-input" type="text" placeholder="搜索角色名、昵称、备注..." value={globalSearch} onChange={e => setGlobalSearch(e.target.value)} autoFocus />
              {globalSearch.trim() && <button className="btn secondary btn-sm" onClick={() => setGlobalSearch('')}>清除</button>}
            </div>
          )}

          {/* ---- 桌面搜索栏 ---- */}
          <div className="global-search-bar">
            <input className="search-input" type="text" placeholder="搜索订单（角色名、昵称、备注）..." value={globalSearch} onChange={e => setGlobalSearch(e.target.value)} />
            {globalSearch.trim() && <button className="btn secondary btn-sm" onClick={() => setGlobalSearch('')}>清除</button>}
          </div>

          {/* ---- 全局搜索结果 ---- */}
          {globalSearch.trim() ? (
            <>
              <div className="search-result-hint">找到 {globalResults.length} 个匹配订单</div>
              {globalResults.length === 0 ? <div className="empty-hint">没有匹配的订单</div> : (
                <div className="order-grid">
                  {globalResults.map(({ order, projectName, projectId }) => (
                    <div key={order.id} className="order-card" onClick={() => enterProject(projectId)}>
                      <div className="order-card-row"><div className="order-character">{order.character}</div><div className={`status-tag status-${order.status}`}>{order.status}</div></div>
                      <div className="order-card-meta">
                        {order.customerName && <span>👤 {order.customerName}</span>}{(order.timeStart || order.timeEnd) && <span>🕐 {formatTimeRange(order.timeStart, order.timeEnd)}</span>}<span>📷 {order.photoCount}张</span>{order.deposit > 0 && <span>定 ¥{order.deposit}</span>}<span>收 ¥{order.totalIncome}</span>
                      </div>
                      <div className="order-card-meta" style={{ marginTop: 2 }}><span>📂 {projectName}</span></div>
                      {order.note && <div className="order-note">{order.note}</div>}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {sortedProjects.length === 0 ? <div className="empty-hint">还没有项目，点击「+ 新建项目」开始吧</div> : (
                <div className="project-grid">
                  {sortedProjects.map(project => {
                    const orderCount = project.orders.length
                    const income = project.orders.reduce((s, o) => s + o.totalIncome, 0)
                    const unfinished = project.orders.filter(o => o.status !== '交付').length
                    return (
                      <div key={project.id} className="project-card" onClick={() => enterProject(project.id)} style={{ background: darkMode ? getDarkCardBg(project.color) : (project.color || '#ffffff') }}>
                        <div className="project-card-body">
                          <div className="project-card-name">{project.name}</div>
                          <div className="project-card-meta-row">
                            <span>📅 {project.date}</span>
                            <span className="project-card-stat">{orderCount} 单</span>
                            <span className="project-card-income">¥{income.toLocaleString()}</span>
                            {unfinished > 0 && <span className="project-card-unfinished">{unfinished} 未完成</span>}
                          </div>
                        </div>
                        <button className="project-menu-btn" title="编辑" onClick={e => { e.stopPropagation(); openEditProjectForm(project) }}>⋯</button>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* ============================== 未完成面板 ============================== */}
      {showUnfinishedOnly && (
        <section className="unfinished-page">
          <div className="section-header">
            <button className="btn secondary" onClick={() => setShowUnfinishedOnly(false)}>← 返回</button>
            <div style={{ flex: 1 }}><div className="section-label">未完成订单</div><div className="section-date">{dashboard.unfinished} 个待处理</div></div>
          </div>
          {unfinishedOrders.length === 0 ? <div className="empty-hint">没有未完成订单 🎉</div> : (
            <div className="order-grid">
              {unfinishedOrders.map(({ order, projectName, projectId }) => (
                <div key={order.id} className="order-card" onClick={() => enterProject(projectId)}>
                  <div className="order-card-row"><div className="order-character">{order.character}</div><div className={`status-tag status-${order.status}`}>{order.status}</div></div>
                  <div className="order-card-meta">{order.customerName && <span>👤 {order.customerName}</span>}{(order.timeStart || order.timeEnd) && <span>🕐 {formatTimeRange(order.timeStart, order.timeEnd)}</span>}<span>📷 {order.photoCount}张</span>{order.deposit > 0 && <span>定 ¥{order.deposit}</span>}<span>收 ¥{order.totalIncome}</span></div>
                  <div className="order-card-meta" style={{ marginTop: 2 }}><span>📂 {projectName}</span></div>
                  {order.note && <div className="order-note">{order.note}</div>}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ============================== 项目内页 ============================== */}
      {activeProject && (
        <section className="project-page">
          <div className="section-header">
            <button className="btn secondary" onClick={handleBackHome}>← 返回</button>
            <div style={{ flex: 1 }}><div className="section-label">{activeProject.name}</div><div className="section-date">📅 {activeProject.date}</div></div>
            <button className="btn primary" onClick={openNewOrderForm}>+ 新建订单</button>
          </div>

          {/* 手机端：搜索筛选工具栏 */}
          <div className="toolbar toolbar-sm">
            <button className="tool-btn" onClick={() => { setShowLocalSearchPanel(!showLocalSearchPanel); setShowStatusPopover(false) }}>🔍</button>
            <button className="tool-btn" ref={statusBtnRef} onClick={() => { setShowStatusPopover(!showStatusPopover); setShowLocalSearchPanel(false) }}>☰</button>
            <span className="toolbar-hint">{statusFilter}</span>
            <div className="toolbar-spacer" />
          </div>

          {/* 手机端：搜索面板 */}
          {showLocalSearchPanel && (
            <div className="search-panel">
              <input className="search-input" type="text" placeholder="搜索角色名、昵称、备注..." value={localSearch} onChange={e => setLocalSearch(e.target.value)} autoFocus />
              {localSearch && <button className="btn secondary btn-sm" onClick={() => setLocalSearch('')}>清除</button>}
            </div>
          )}

          {/* 桌面端：搜索栏+状态筛选 */}
          <div className="project-search-bar desktop-only">
            <input className="search-input" type="text" placeholder="搜索订单（角色名、昵称、备注）..." value={localSearch} onChange={e => setLocalSearch(e.target.value)} />
            {localSearch && <button className="btn secondary btn-sm" onClick={() => setLocalSearch('')}>清除</button>}
            <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value as OrderStatus | '全部')}>
              <option value="全部">全部状态</option>
              <option value="预付定金">预付定金</option>
              <option value="工作中">工作中</option>
              <option value="交付">交付</option>
            </select>
          </div>

          {showStatusPopover && (
            <div className="popover">
              {( ['全部', '预付定金', '工作中', '交付'] as const ).map(s => (<div key={s} className={`popover-item ${statusFilter === s ? 'popover-item-sel' : ''}`} onClick={() => { setStatusFilter(s); setShowStatusPopover(false) }}>{s}</div>))}
            </div>
          )}

          {/* 桌面端：搜索栏+状态筛选 */}
          <div className="project-search-bar desktop-only">
            <input className="search-input" type="text" placeholder="搜索订单（角色名、昵称、备注）..." value={localSearch} onChange={e => setLocalSearch(e.target.value)} />
            {localSearch && <button className="btn secondary btn-sm" onClick={() => setLocalSearch('')}>清除</button>}
            <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value as OrderStatus | '全部')}>
              <option value="全部">全部状态</option>
              <option value="预付定金">预付定金</option>
              <option value="工作中">工作中</option>
              <option value="交付">交付</option>
            </select>
          </div>

          {getFilteredOrders().length === 0 ? (<div className="empty-hint">{localSearch || statusFilter !== '全部' ? '没有匹配的订单' : '暂无订单，点击「+ 新建订单」添加'}</div>) : (
            <div className="order-grid">
              {getFilteredOrders().map(order => {
                const isExpanded = expandStatusId === order.id
                return (
                  <div key={order.id} className={`order-card ${isExpanded ? 'order-card-expanded' : ''}`}>
                    <div className="order-card-row">
                      <div className="order-character" onClick={() => openEditOrderForm(order)}>{order.character}</div>
                      <div className={`status-tag status-${order.status}`} onClick={() => setExpandStatusId(isExpanded ? null : order.id)}>{order.status} {isExpanded ? '▲' : '▼'}</div>
                    </div>
                    <div className="order-card-meta" onClick={() => openEditOrderForm(order)}>
                      {order.customerName && <span>👤 {order.customerName}</span>}
                      {(order.timeStart || order.timeEnd) && <span>🕐 {formatTimeRange(order.timeStart, order.timeEnd)}</span>}
                      <span>📷 {order.photoCount}张</span>
                      {order.deposit > 0 && <span>定 ¥{order.deposit}</span>}<span>收 ¥{order.totalIncome}</span>
                    </div>
                    {order.note && <div className="order-note" onClick={() => openEditOrderForm(order)}>{order.note}</div>}
                    {isExpanded && (
                      <div className="status-expand">
                        <div className="status-expand-label">更改状态：</div>
                        <div className="status-expand-options">
                          {(['预付定金', '工作中', '交付'] as OrderStatus[]).map(s => (
                            <div key={s} className={`status-choice ${order.status === s ? 'status-choice-active' : ''}`} onClick={() => handleCardStatusChange(order.id, s)}>{s}</div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="order-card-footer">
                      <button className="btn btn-sm btn-secondary" onClick={() => openEditOrderForm(order)}>编辑</button>
                      <button className="btn btn-sm btn-secondary" style={{ marginLeft: 6 }} onClick={e => { e.stopPropagation(); setDeleteOrderTarget(order) }}>删除</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* ============================== 模态框 ============================== */}

      {/* ---- 项目表单 ---- */}
      {showProjectForm && (
        <div className="modal-backdrop" onClick={() => setShowProjectForm(false)}>
          <div className="modal-panel" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title">{editingProject ? '编辑项目' : '新建项目'}</div><button className="icon-btn" onClick={() => setShowProjectForm(false)}>×</button></div>
            <div className="modal-body">
              <div className="form-group"><label>漫展名称 *</label><input type="text" placeholder="如：CP30 魔都同人祭" value={projectFormName} onChange={e => setProjectFormName(e.target.value)} autoFocus /></div>
              <div className="form-group"><label>漫展日期 *</label><input type="date" value={projectFormDate} onChange={e => setProjectFormDate(e.target.value)} /></div>
              <div className="form-group"><label>卡片颜色</label>
                <div className="color-picker">
                  {PROJECT_COLORS.map(c => (
                    <div key={c.value} className={`color-swatch ${projectFormColor === c.value ? 'color-swatch-sel' : ''}`} style={{ background: c.value }} title={c.name} onClick={() => setProjectFormColor(c.value)} />
                  ))}
                </div>
              </div>
              {editingProject && (
                <div className="project-edit-info">
                  <div className="project-edit-stats"><span>📋 {projectFormOrders.length} 个订单</span><span>💰 ¥{projectFormOrders.reduce((s, o) => s + o.totalIncome, 0).toLocaleString()}</span></div>
                  <button className="btn btn-danger" onClick={confirmDeleteProjectFromEdit}>删除此项目</button>
                </div>
              )}
            </div>
            <div className="modal-footer"><button className="btn secondary" onClick={() => setShowProjectForm(false)}>取消</button><button className="btn primary" onClick={handleSaveProject} disabled={!projectFormName.trim() || !projectFormDate}>{editingProject ? '保存' : '创建'}</button></div>
          </div>
        </div>
      )}

      {/* ---- 项目删除确认 ---- */}
      {deleteProjectTarget && (
        <div className="modal-backdrop" onClick={() => setDeleteProjectTarget(null)}>
          <div className="modal-panel modal-confirm" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title">确认删除</div></div>
            <div className="modal-body"><p>确定要删除「<strong>{deleteProjectTarget.name}</strong>」吗？</p><p className="text-secondary">该项目下的 <strong>{deleteProjectTarget.orders.length}</strong> 个订单也会一并删除，不可撤销。</p></div>
            <div className="modal-footer"><button className="btn secondary" onClick={() => setDeleteProjectTarget(null)}>取消</button><button className="btn btn-danger" onClick={confirmDeleteProject}>确认删除</button></div>
          </div>
        </div>
      )}

      {/* ---- 订单表单 ---- */}
      {showOrderForm && (
        <div className="modal-backdrop" onClick={() => setShowOrderForm(false)}>
          <div className="modal-panel modal-order" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editingOrder ? '编辑订单' : '新建订单'}</div>
              <button className="icon-btn" onClick={() => setShowOrderForm(false)}>×</button>
            </div>

            <div className="modal-body order-form-body">
              {/* ===== 1. 拍摄角色 — 物品名称区域 ===== */}
              <div className="of-field">
                <label className="of-label">拍摄角色 <span className="of-required">*</span></label>
                <input
                  className="of-input of-input-lg"
                  type="text"
                  placeholder="如：雷电将军（原神）"
                  value={orderForm.character}
                  onChange={e => setOrderForm({ ...orderForm, character: e.target.value })}
                  autoFocus
                />
              </div>

              {/* ===== 2. 客户昵称 | 拍摄张数 ===== */}
              <div className="of-row">
                <div className="of-field of-flex-1">
                  <label className="of-label">客户昵称</label>
                  <input
                    className="of-input"
                    type="text"
                    placeholder="如：晚风"
                    value={orderForm.customerName}
                    onChange={e => setOrderForm({ ...orderForm, customerName: e.target.value })}
                  />
                </div>
                <div className="of-field of-flex-1">
                  <label className="of-label">拍摄张数</label>
                  <input
                    className="of-input"
                    type="number"
                    placeholder="0"
                    value={orderForm.photoCount || ''}
                    onChange={e => setOrderForm({ ...orderForm, photoCount: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {/* ===== 3. 定金 | 全部收入 ===== */}
              <div className="of-row">
                <div className="of-field of-flex-1">
                  <label className="of-label">定金 (¥)</label>
                  <input
                    className="of-input"
                    type="number"
                    placeholder="0"
                    value={orderForm.deposit || ''}
                    onChange={e => setOrderForm({ ...orderForm, deposit: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="of-field of-flex-1">
                  <label className="of-label">全部收入 (¥)</label>
                  <input
                    className="of-input"
                    type="number"
                    placeholder="0"
                    value={orderForm.totalIncome || ''}
                    onChange={e => setOrderForm({ ...orderForm, totalIncome: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {/* ===== 4. 附加项 — 备注区域 ===== */}
              {editingOrder ? (
                <div className="of-extra-section">
                  <div className="of-extra-header">附加项</div>
                  <div className="of-extra-row">
                    <input
                      className="of-input of-extra-input"
                      type="text"
                      placeholder="备注说明…"
                      value={orderForm.note}
                      onChange={e => setOrderForm({ ...orderForm, note: e.target.value })}
                    />
                  </div>
                </div>
              ) : (
                <div className="of-field">
                  <label className="of-label">备注</label>
                  <input
                    className="of-input"
                    type="text"
                    placeholder="补充说明（可选）"
                    value={orderForm.note}
                    onChange={e => setOrderForm({ ...orderForm, note: e.target.value })}
                  />
                </div>
              )}

              {/* ===== 5. 开始时间 | 结束时间 ===== */}
              <div className="of-row">
                <div className="of-field of-flex-1">
                  <label className="of-label">开始时间</label>
                  <input
                    className="of-input"
                    type="time"
                    value={orderForm.timeStart}
                    onChange={e => setOrderForm({ ...orderForm, timeStart: e.target.value })}
                  />
                </div>
                <div className="of-field of-flex-1">
                  <label className="of-label">结束时间 <span className="of-optional">(选填)</span></label>
                  <input
                    className="of-input"
                    type="time"
                    value={orderForm.timeEnd}
                    onChange={e => setOrderForm({ ...orderForm, timeEnd: e.target.value })}
                  />
                </div>
              </div>

              {/* ===== 6. 订单状态 — 分段按钮组 ===== */}
              <div className="of-field">
                <label className="of-label">订单状态</label>
                <div className="of-segmented">
                  {(['预付定金', '工作中', '交付'] as OrderStatus[]).map(s => (
                    <button
                      key={s}
                      type="button"
                      className={`of-seg-btn ${orderForm.status === s ? 'of-seg-sel' : ''}`}
                      onClick={() => setOrderForm({ ...orderForm, status: s })}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer order-form-footer">
              {editingOrder && (
                orderDeleteConfirm ? (
                  <div className="of-del-confirm">
                    <span>确定删除此订单？</span>
                    <button className="btn btn-danger btn-sm" onClick={confirmDeleteOrder}>确认</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setOrderDeleteConfirm(false)}>取消</button>
                  </div>
                ) : (
                  <button className="btn btn-danger-outline btn-sm" onClick={() => setOrderDeleteConfirm(true)}>删除此订单</button>
                )
              )}
              <div className="of-footer-btns">
                <button className="btn secondary" onClick={() => setShowOrderForm(false)}>取消</button>
                <button className="btn primary" onClick={handleSaveOrder} disabled={!orderForm.character.trim()}>
                  {editingOrder ? '保存' : '添加'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---- 订单删除确认 ---- */}
      {deleteOrderTarget && (
        <div className="modal-backdrop" onClick={() => setDeleteOrderTarget(null)}>
          <div className="modal-panel modal-confirm" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title">确认删除</div></div>
            <div className="modal-body"><p>确定要删除「<strong>{deleteOrderTarget.character}</strong>」的订单吗？</p><p className="text-secondary">此操作不可撤销。</p></div>
            <div className="modal-footer"><button className="btn secondary" onClick={() => setDeleteOrderTarget(null)}>取消</button><button className="btn btn-danger" onClick={confirmDeleteOrder}>确认删除</button></div>
          </div>
        </div>
      )}

    </div>
  )
}

export default App
