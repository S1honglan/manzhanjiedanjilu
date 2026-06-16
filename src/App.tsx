import { useEffect, useState, useMemo, useRef, useCallback, ChangeEvent } from 'react'
import { ExpoProject, ClientOrder, OrderStatus } from './types'
import { initialProjects } from './data'
import { loadProjects, saveProjects } from './storage'
import { importProjectsFromExcel } from './excel'
import './App.css'

// ==================== 类型 ====================

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

function orderToForm(order: ClientOrder): OrderFormData {
  return {
    character: order.character,
    customerName: order.customerName,
    photoCount: order.photoCount,
    price: order.price,
    deposit: order.deposit,
    totalIncome: order.totalIncome,
    status: order.status,
    note: order.note
  }
}

// ==================== App ====================

function App() {
  const [projects, setProjects] = useState<ExpoProject[]>([])
  const [activeProject, setActiveProject] = useState<ExpoProject | null>(null)

  // ---- 项目表单 ----
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [editingProject, setEditingProject] = useState<ExpoProject | null>(null)
  const [projectFormName, setProjectFormName] = useState('')
  const [projectFormDate, setProjectFormDate] = useState('')
  const [projectFormOrders, setProjectFormOrders] = useState<ClientOrder[]>([])

  // ---- 项目删除确认 ----
  const [deleteProjectTarget, setDeleteProjectTarget] = useState<ExpoProject | null>(null)

  // ---- 订单表单 ----
  const [showOrderForm, setShowOrderForm] = useState(false)
  const [editingOrder, setEditingOrder] = useState<ClientOrder | null>(null)
  const [orderForm, setOrderForm] = useState<OrderFormData>({
    character: '', customerName: '', photoCount: 0,
    price: 0, deposit: 0, totalIncome: 0,
    status: '预付定金', note: ''
  })

  // ---- 订单删除确认 ----
  const [deleteOrderTarget, setDeleteOrderTarget] = useState<ClientOrder | null>(null)

  // ---- 搜索 ----
  const [globalSearch, setGlobalSearch] = useState('')
  const [localSearch, setLocalSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderStatus | '全部'>('全部')

  // ---- 滑动返回 ----
  const touchStartX = useRef(0)

  // ---- Excel 导入 ----
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ newProjects: number; newOrders: number; errors: string[] } | null>(null)
  const importInputRef = useRef<HTMLInputElement | null>(null)

  // ---- 初始化 ----
  useEffect(() => {
    const saved = loadProjects()
    if (saved.length > 0) {
      setProjects(saved)
    } else {
      setProjects(initialProjects)
      saveProjects(initialProjects)
    }
  }, [])

  // ---- 计算聚合数据 ----
  const dashboard = useMemo(() => {
    let totalOrders = 0
    let totalIncome = 0
    let unfinished = 0
    for (const p of projects) {
      totalOrders += p.orders.length
      for (const o of p.orders) {
        totalIncome += o.totalIncome
        if (o.status !== '交付') unfinished++
      }
    }
    return { totalOrders, totalIncome, unfinished }
  }, [projects])

  // ---- 全局搜索（首页） ----
  const globalResults = useMemo(() => {
    const text = globalSearch.toLowerCase().trim()
    if (!text) return []
    const results: { order: ClientOrder; projectName: string; projectId: string }[] = []
    for (const p of projects) {
      for (const o of p.orders) {
        if (
          o.character.toLowerCase().includes(text) ||
          o.customerName.toLowerCase().includes(text) ||
          o.note.toLowerCase().includes(text)
        ) {
          results.push({ order: o, projectName: p.name, projectId: p.id })
        }
      }
    }
    return results
  }, [projects, globalSearch])

  // ---- 项目内搜索 ----
  function getFilteredOrders(): ClientOrder[] {
    if (!activeProject) return []
    return activeProject.orders.filter((order) => {
      const text = localSearch.toLowerCase().trim()
      const matchText =
        !text ||
        order.character.toLowerCase().includes(text) ||
        order.customerName.toLowerCase().includes(text) ||
        order.note.toLowerCase().includes(text)
      const matchStatus = statusFilter === '全部' || order.status === statusFilter
      return matchText && matchStatus
    })
  }

  // ---- 工具 ----
  function refresh() {
    setProjects(loadProjects())
  }

  function syncActiveProject() {
    if (!activeProject) return
    const fresh = loadProjects().find((p) => p.id === activeProject.id)
    if (fresh) setActiveProject(fresh)
  }

  function handleBackHome() {
    setActiveProject(null)
    setLocalSearch('')
    setStatusFilter('全部')
  }

  function enterProject(projectId: string) {
    const fresh = loadProjects().find((p) => p.id === projectId)
    setActiveProject(fresh || null)
  }

  // ---- 滑动返回 ----
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const diff = e.changedTouches[0].clientX - touchStartX.current
    // 从左往右滑动超过 80px 且起点靠左边缘
    if (diff > 80 && touchStartX.current < 40 && activeProject) {
      handleBackHome()
    }
  }, [activeProject])

  // ============ 项目 CRUD ============

  function openNewProjectForm() {
    setEditingProject(null)
    setProjectFormName('')
    setProjectFormDate('')
    setProjectFormOrders([])
    setShowProjectForm(true)
  }

  function openEditProjectForm(project: ExpoProject) {
    setEditingProject(project)
    setProjectFormName(project.name)
    setProjectFormDate(project.date)
    setProjectFormOrders([...project.orders])
    setShowProjectForm(true)
  }

  function handleSaveProject() {
    if (!projectFormName.trim() || !projectFormDate) return
    const now = new Date().toISOString()
    const all = loadProjects()

    if (editingProject) {
      const idx = all.findIndex((p) => p.id === editingProject.id)
      if (idx !== -1) {
        all[idx] = {
          ...all[idx],
          name: projectFormName.trim(),
          date: projectFormDate,
          updatedAt: now
        }
      }
    } else {
      all.push({
        id: `proj-${Date.now()}`,
        name: projectFormName.trim(),
        date: projectFormDate,
        orders: [],
        createdAt: now,
        updatedAt: now
      })
    }
    saveProjects(all)
    refresh()
    syncActiveProject()
    setShowProjectForm(false)
    setEditingProject(null)
  }

  function confirmDeleteProjectFromEdit() {
    if (!editingProject) return
    setDeleteProjectTarget(editingProject)
  }

  function confirmDeleteProject() {
    if (!deleteProjectTarget) return
    const all = loadProjects().filter((p) => p.id !== deleteProjectTarget.id)
    saveProjects(all)
    refresh()
    setDeleteProjectTarget(null)
    setShowProjectForm(false)
    setEditingProject(null)
    if (activeProject?.id === deleteProjectTarget.id) setActiveProject(null)
  }

  // ============ 订单 CRUD ============

  function openNewOrderForm() {
    setEditingOrder(null)
    setOrderForm({
      character: '', customerName: '', photoCount: 0,
      price: 0, deposit: 0, totalIncome: 0,
      status: '预付定金', note: ''
    })
    setShowOrderForm(true)
  }

  function openEditOrderForm(order: ClientOrder) {
    setEditingOrder(order)
    setOrderForm(orderToForm(order))
    setShowOrderForm(true)
  }

  function handleSaveOrder() {
    if (!activeProject) return
    if (!orderForm.character.trim() || !orderForm.customerName.trim()) return

    const now = new Date().toISOString()
    const all = loadProjects()
    const projIdx = all.findIndex((p) => p.id === activeProject.id)
    if (projIdx === -1) return

    if (editingOrder) {
      all[projIdx].orders = all[projIdx].orders.map((o) =>
        o.id === editingOrder.id
          ? { ...o, ...orderForm, updatedAt: now }
          : o
      )
    } else {
      all[projIdx].orders.push({
        ...orderForm,
        id: `order-${Date.now()}`,
        projectId: activeProject.id,
        createdAt: now,
        updatedAt: now
      })
    }
    all[projIdx].updatedAt = now
    saveProjects(all)
    refresh()
    syncActiveProject()
    setShowOrderForm(false)
    setEditingOrder(null)
  }

  function confirmDeleteOrder() {
    if (!activeProject || !deleteOrderTarget) return
    const all = loadProjects()
    const projIdx = all.findIndex((p) => p.id === activeProject.id)
    if (projIdx === -1) return
    all[projIdx].orders = all[projIdx].orders.filter((o) => o.id !== deleteOrderTarget.id)
    all[projIdx].updatedAt = new Date().toISOString()
    saveProjects(all)
    refresh()
    syncActiveProject()
    setDeleteOrderTarget(null)
  }

  // ============ Excel 导入 ============

  function handleImportClick() {
    importInputRef.current?.click()
  }

  async function handleImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportResult(null)
    try {
      const result = await importProjectsFromExcel(file, loadProjects())
      saveProjects(result.projects)
      refresh()
      syncActiveProject()
      setImportResult(result)
      // 3 秒后自动清除提示
      setTimeout(() => setImportResult(null), 5000)
    } catch (error) {
      setImportResult({
        newProjects: 0,
        newOrders: 0,
        errors: [error instanceof Error ? error.message : '导入失败，请检查文件格式']
      })
      setTimeout(() => setImportResult(null), 8000)
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  // ============ 渲染 ============

  return (
    <div
      className="app-shell"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <header className="topbar">
        <div className="brand">漫展接单记录</div>
      </header>

      {/* ============================== 首页 ============================== */}
      {!activeProject && (
        <section className="home-page">
          {/* ---- 核心数据面板 ---- */}
          <div className="dashboard">
            <div className="dashboard-item">
              <div className="dashboard-value">{dashboard.totalOrders}</div>
              <div className="dashboard-label">总订单</div>
            </div>
            <div className="dashboard-item">
              <div className="dashboard-value">¥{dashboard.totalIncome.toLocaleString()}</div>
              <div className="dashboard-label">总收入</div>
            </div>
            <div className="dashboard-item">
              <div className="dashboard-value">{dashboard.unfinished}</div>
              <div className="dashboard-label">未完成</div>
            </div>
          </div>

          {/* ---- 全局搜索栏 ---- */}
          <div className="global-search-bar">
            <input
              className="search-input"
              type="text"
              placeholder="搜索订单（角色名、昵称、备注）..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
            />
            {globalSearch.trim() && (
              <button className="btn secondary btn-sm" onClick={() => setGlobalSearch('')}>
                清除
              </button>
            )}
          </div>

          {/* ---- 全局搜索结果 ---- */}
          {globalSearch.trim() ? (
            <>
              <div className="search-result-hint">
                找到 {globalResults.length} 个匹配订单
              </div>
              {globalResults.length === 0 ? (
                <div className="empty-hint">没有匹配的订单</div>
              ) : (
                <div className="order-grid">
                  {globalResults.map(({ order, projectName, projectId }) => (
                    <div
                      key={order.id}
                      className="order-card"
                      onClick={() => enterProject(projectId)}
                    >
                      <div className="order-card-header">
                        <div className="order-character">{order.character}</div>
                        <div className={`status-tag status-${order.status}`}>
                          {order.status}
                        </div>
                      </div>
                      <div className="order-info-grid">
                        <div className="order-info-item">
                          <span className="order-info-label">昵称</span>
                          <span>{order.customerName}</span>
                        </div>
                        <div className="order-info-item">
                          <span className="order-info-label">张数</span>
                          <span>{order.photoCount} 张</span>
                        </div>
                        <div className="order-info-item">
                          <span className="order-info-label">全款</span>
                          <span>¥{order.price}</span>
                        </div>
                        <div className="order-info-item">
                          <span className="order-info-label">定金</span>
                          <span>¥{order.deposit}</span>
                        </div>
                        <div className="order-info-item" style={{ gridColumn: 'span 2' }}>
                          <span className="order-info-label">所属项目</span>
                          <span>{projectName}</span>
                        </div>
                      </div>
                      {order.note && (
                        <div className="order-note">{order.note}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {/* ---- 导入结果提示 ---- */}
              {importResult && (
                <div className={`import-notice ${importResult.errors.length > 0 ? 'import-notice-warn' : ''}`}>
                  {importResult.errors.length > 0 ? (
                    <>
                      <div className="import-notice-title">⚠️ 导入完成，但存在一些问题</div>
                      <ul className="import-notice-list">
                        {importResult.errors.slice(0, 5).map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                        {importResult.errors.length > 5 && (
                          <li>...还有 {importResult.errors.length - 5} 条错误</li>
                        )}
                      </ul>
                    </>
                  ) : (
                    <div className="import-notice-title">
                      ✅ 导入成功！新增 {importResult.newProjects} 个项目，{importResult.newOrders} 个订单
                    </div>
                  )}
                  <button
                    className="icon-btn import-dismiss"
                    onClick={() => setImportResult(null)}
                  >
                    ×
                  </button>
                </div>
              )}

              {/* ---- 项目列表 ---- */}
              <div className="section-header">
                <div className="section-label">漫展项目</div>
                <div className="section-header-btns">
                  <button className="btn primary" onClick={openNewProjectForm}>
                    + 新建项目
                  </button>
                  <button
                    className="btn secondary"
                    onClick={handleImportClick}
                    disabled={importing}
                  >
                    {importing ? '导入中...' : '📥 导入'}
                  </button>
                </div>
              </div>

              {projects.length === 0 ? (
                <div className="empty-hint">还没有项目，点击「+ 新建项目」开始吧</div>
              ) : (
                <div className="project-grid">
                  {projects.map((project) => {
                    const orderCount = project.orders.length
                    const income = project.orders.reduce((s, o) => s + o.totalIncome, 0)
                    return (
                      <div
                        key={project.id}
                        className="project-card"
                        onClick={() => enterProject(project.id)}
                      >
                        <div className="project-card-body">
                          <div className="project-card-name">{project.name}</div>
                          <div className="project-card-date">📅 {project.date}</div>
                          <div className="project-card-stats">
                            <span>{orderCount} 个订单</span>
                            <span className="project-card-income">¥{income.toLocaleString()}</span>
                          </div>
                        </div>
                        <button
                          className="project-menu-btn"
                          title="编辑"
                          onClick={(e) => {
                            e.stopPropagation()
                            openEditProjectForm(project)
                          }}
                        >
                          ⋯
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* ============================== 项目内页 ============================== */}
      {activeProject && (
        <section className="project-page">
          <div className="section-header">
            <button className="btn secondary" onClick={handleBackHome}>← 返回</button>
            <div style={{ flex: 1 }}>
              <div className="section-label">{activeProject.name}</div>
              <div className="section-date">📅 {activeProject.date}</div>
            </div>
            <button className="btn primary" onClick={openNewOrderForm}>
              + 新建订单
            </button>
          </div>

          {/* 项目内搜索筛选 */}
          <div className="filter-bar">
            <input
              className="search-input"
              type="text"
              placeholder="搜索角色、昵称、备注..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as OrderStatus | '全部')}
            >
              <option value="全部">全部状态</option>
              <option value="预付定金">预付定金</option>
              <option value="工作中">工作中</option>
              <option value="交付">交付</option>
            </select>
          </div>

          {getFilteredOrders().length === 0 ? (
            <div className="empty-hint">
              {localSearch || statusFilter !== '全部'
                ? '没有匹配的订单'
                : '暂无订单，点击「+ 新建订单」添加'}
            </div>
          ) : (
            <div className="order-grid">
              {getFilteredOrders().map((order) => (
                <div
                  key={order.id}
                  className="order-card"
                  onClick={() => openEditOrderForm(order)}
                >
                  <div className="order-card-header">
                    <div className="order-character">{order.character}</div>
                    <div className={`status-tag status-${order.status}`}>
                      {order.status}
                    </div>
                  </div>
                  <div className="order-info-grid">
                    <div className="order-info-item">
                      <span className="order-info-label">昵称</span>
                      <span>{order.customerName}</span>
                    </div>
                    <div className="order-info-item">
                      <span className="order-info-label">张数</span>
                      <span>{order.photoCount} 张</span>
                    </div>
                    <div className="order-info-item">
                      <span className="order-info-label">全款</span>
                      <span>¥{order.price}</span>
                    </div>
                    <div className="order-info-item">
                      <span className="order-info-label">定金</span>
                      <span>¥{order.deposit}</span>
                    </div>
                    <div className="order-info-item">
                      <span className="order-info-label">总收入</span>
                      <span>¥{order.totalIncome}</span>
                    </div>
                  </div>
                  {order.note && (
                    <div className="order-note">{order.note}</div>
                  )}
                  <div className="order-card-footer">
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteOrderTarget(order)
                      }}
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ============================== 模态框 ============================== */}

      {/* ---- 项目表单（含删除按钮） ---- */}
      {showProjectForm && (
        <div className="modal-backdrop" onClick={() => setShowProjectForm(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editingProject ? '编辑项目' : '新建项目'}</div>
              <button className="icon-btn" onClick={() => setShowProjectForm(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>漫展名称 *</label>
                <input
                  type="text"
                  placeholder="如：CP30 魔都同人祭"
                  value={projectFormName}
                  onChange={(e) => setProjectFormName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>漫展日期 *</label>
                <input
                  type="date"
                  value={projectFormDate}
                  onChange={(e) => setProjectFormDate(e.target.value)}
                />
              </div>

              {/* 编辑模式下显示订单数和收入，并提供删除按钮 */}
              {editingProject && (
                <div className="project-edit-info">
                  <div className="project-edit-stats">
                    <span>📋 {projectFormOrders.length} 个订单</span>
                    <span>💰 ¥{projectFormOrders.reduce((s, o) => s + o.totalIncome, 0).toLocaleString()}</span>
                  </div>
                  <button
                    className="btn btn-danger"
                    onClick={confirmDeleteProjectFromEdit}
                  >
                    删除此项目
                  </button>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn secondary" onClick={() => setShowProjectForm(false)}>取消</button>
              <button
                className="btn primary"
                onClick={handleSaveProject}
                disabled={!projectFormName.trim() || !projectFormDate}
              >
                {editingProject ? '保存' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- 项目删除确认（从编辑页触发的二次确认） ---- */}
      {deleteProjectTarget && (
        <div className="modal-backdrop" onClick={() => setDeleteProjectTarget(null)}>
          <div className="modal-panel modal-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">确认删除</div>
            </div>
            <div className="modal-body">
              <p>确定要删除「<strong>{deleteProjectTarget.name}</strong>」吗？</p>
              <p className="text-secondary">
                该项目下的 <strong>{deleteProjectTarget.orders.length}</strong> 个订单也会一并删除，不可撤销。
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn secondary" onClick={() => setDeleteProjectTarget(null)}>取消</button>
              <button className="btn btn-danger" onClick={confirmDeleteProject}>确认删除</button>
            </div>
          </div>
        </div>
      )}

      {/* ---- 订单表单 ---- */}
      {showOrderForm && (
        <div className="modal-backdrop" onClick={() => setShowOrderForm(false)}>
          <div className="modal-panel modal-order" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editingOrder ? '编辑订单' : '新建订单'}</div>
              <button className="icon-btn" onClick={() => setShowOrderForm(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>拍摄角色 *</label>
                <input
                  type="text"
                  placeholder="如：雷电将军（原神）"
                  value={orderForm.character}
                  onChange={(e) => setOrderForm({ ...orderForm, character: e.target.value })}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>客户昵称 *</label>
                <input
                  type="text"
                  placeholder="如：晚风"
                  value={orderForm.customerName}
                  onChange={(e) => setOrderForm({ ...orderForm, customerName: e.target.value })}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>拍摄张数</label>
                  <input
                    type="number"
                    value={orderForm.photoCount || ''}
                    onChange={(e) => setOrderForm({ ...orderForm, photoCount: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="form-group">
                  <label>全款价格 (¥)</label>
                  <input
                    type="number"
                    value={orderForm.price || ''}
                    onChange={(e) => setOrderForm({ ...orderForm, price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>定金 (¥)</label>
                  <input
                    type="number"
                    value={orderForm.deposit || ''}
                    onChange={(e) => setOrderForm({ ...orderForm, deposit: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="form-group">
                  <label>全部收入 (¥)</label>
                  <input
                    type="number"
                    value={orderForm.totalIncome || ''}
                    onChange={(e) => setOrderForm({ ...orderForm, totalIncome: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>订单状态</label>
                  <select
                    value={orderForm.status}
                    onChange={(e) => setOrderForm({ ...orderForm, status: e.target.value as OrderStatus })}
                  >
                    <option value="预付定金">预付定金</option>
                    <option value="工作中">工作中</option>
                    <option value="交付">交付</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>备注</label>
                <input
                  type="text"
                  placeholder="补充说明（可选）"
                  value={orderForm.note}
                  onChange={(e) => setOrderForm({ ...orderForm, note: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn secondary" onClick={() => setShowOrderForm(false)}>取消</button>
              <button
                className="btn primary"
                onClick={handleSaveOrder}
                disabled={!orderForm.character.trim() || !orderForm.customerName.trim()}
              >
                {editingOrder ? '保存' : '添加'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- 订单删除确认 ---- */}
      {deleteOrderTarget && (
        <div className="modal-backdrop" onClick={() => setDeleteOrderTarget(null)}>
          <div className="modal-panel modal-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">确认删除</div>
            </div>
            <div className="modal-body">
              <p>确定要删除「<strong>{deleteOrderTarget.character}</strong>」的订单吗？</p>
              <p className="text-secondary">此操作不可撤销。</p>
            </div>
            <div className="modal-footer">
              <button className="btn secondary" onClick={() => setDeleteOrderTarget(null)}>取消</button>
              <button className="btn btn-danger" onClick={confirmDeleteOrder}>确认删除</button>
            </div>
          </div>
        </div>
      )}

      {/* ---- 隐藏的文件选择器 ---- */}
      <input
        ref={importInputRef}
        type="file"
        accept=".xlsx,.xls"
        style={{ display: 'none' }}
        onChange={handleImportFile}
      />
    </div>
  )
}

export default App
