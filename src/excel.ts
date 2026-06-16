import * as XLSX from 'xlsx'
import { ExpoProject, ClientOrder, OrderStatus } from './types'

// 有效订单状态
const VALID_STATUSES: OrderStatus[] = ['预付定金', '工作中', '交付']

// 用于识别表头的关键词
const HEADER_KEYWORDS = ['漫展', '角色', '张数', '价格', '定金', 'CN', '昵称', '时间', '备注', '联系方式']

// Excel 日期序列号基准（1900-01-01）
function excelSerialToDate(serial: number): string {
  // Excel 日期序列号，以 1900-01-01 为 1（注意 Excel 的闰年 bug：第 60 天是 1900-02-29，实际不存在）
  const base = new Date(1899, 11, 30) // 1899-12-30
  const d = new Date(base.getTime() + serial * 86400000)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// 检查一个值是否是 Excel 日期序列号（0.3 ~ 50000 之间的浮点数，且小数部分像是时间比例）
function looksLikeExcelDate(val: any): boolean {
  if (typeof val !== 'number') return false
  return val > 0.3 && val < 100000
}

// 从字符串中提取日期信息
function extractDateFromText(text: string): string {
  if (!text) return ''
  // 尝试匹配 "DAY1(x月x号)" 或 "DAY1(x.x号)"
  const dayMatch = text.match(/DAY\d*[（(]([^）)]+)[）)]/)
  if (dayMatch) {
    // 返回日期的文字描述作为参考
    return dayMatch[1]
  }
  // 尝试匹配纯日期格式 YYYY-MM-DD 或 YY.M.DD 或 YYYY/MM/DD
  const dateMatch = text.match(/(\d{2,4})[.\-/](\d{1,2})[.\-/](\d{1,2})/)
  if (dateMatch) {
    const y = dateMatch[1].length === 2 ? `20${dateMatch[1]}` : dateMatch[1]
    const m = dateMatch[2].padStart(2, '0')
    const d = dateMatch[3].padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  return ''
}

// 从文本中提取数字（处理 "4张", "4~6", "4-6" 等格式）— 返回第一个数字
function parseNumberFromText(val: any): number {
  if (typeof val === 'number') return Math.max(0, val)
  if (!val) return 0
  const s = String(val).trim()
  const match = s.match(/(\d+)/)
  return match ? parseInt(match[1]) : 0
}

// 解析金额
function parseAmount(val: any): number {
  if (typeof val === 'number') return Math.max(0, val)
  if (!val) return 0
  const n = parseFloat(String(val).replace(/[¥,]/g, ''))
  return isNaN(n) ? 0 : Math.max(0, n)
}

// 标准化漫展名称（去掉多余空格、数字前缀等）
function normalizeExpoName(raw: string): string {
  return raw
    .replace(/^\d+\.?\d*/, '')    // 去掉开头的数字（如 "8.11"）
    .replace(/^[.\s]+/, '')       // 去掉开头的点号和空格
    .trim()
    .replace(/\s+/g, ' ')
}

// 检查一行是否像表头行
function looksLikeHeaderRow(row: Record<string, any>): boolean {
  const values = Object.values(row).map((v) => String(v || '').trim())
  let matchCount = 0
  for (const v of values) {
    if (HEADER_KEYWORDS.some((kw) => v.includes(kw))) matchCount++
  }
  return matchCount >= 4
}

// 检查一行是否有"漫展"关键词（可能是分组标题行，需要跳过）
function isGroupHeaderRow(row: Record<string, any>): boolean {
  const firstVal = String(Object.values(row)[0] || '').trim()
  return firstVal === '漫展' || firstVal.startsWith('DAY')
}

interface ParsedRow {
  projectName: string
  projectDate: string
  character: string
  customerName: string
  photoCount: number
  price: number
  deposit: number
  totalIncome: number
  status: OrderStatus
  note: string
}

/**
 * 从单个工作表解析订单行
 */
function parseSheet(
  sheetName: string,
  rawRows: Record<string, any>[]
): { rows: ParsedRow[]; expoName: string; errors: string[] } {
  const errors: string[] = []
  if (rawRows.length === 0) return { rows: [], expoName: sheetName.trim(), errors }

  // 第一步：找到表头行
  let headerRowIdx = -1
  for (let i = 0; i < Math.min(rawRows.length, 5); i++) {
    if (looksLikeHeaderRow(rawRows[i])) {
      headerRowIdx = i
      break
    }
  }

  if (headerRowIdx === -1) {
    // 不报错，可能是空表
    return { rows: [], expoName: sheetName.trim(), errors: [`"${sheetName}": 未找到表头行`] }
  }

  const headerRow = rawRows[headerRowIdx]

  // 建立列映射：关键词 → 列key
  const colMap: Record<string, string> = {} // 关键词 → 原始列key
  for (const key of Object.keys(headerRow)) {
    const cell = String(headerRow[key] || '').trim()
    for (const kw of ['漫展', '角色', '备注', 'CN', '张数', '定金', '价格', '联系方式', '时间', '昵称']) {
      if (cell === kw || cell.includes(kw)) {
        colMap[kw] = key
        break
      }
    }
  }

  // 额外匹配：如果列名不完全精确，尝试更宽松匹配
  if (!colMap['张数']) {
    for (const key of Object.keys(headerRow)) {
      const cell = String(headerRow[key] || '').trim()
      if (cell.includes('张') && !colMap['张数']) colMap['张数'] = key
      if ((cell.includes('价') || cell === '金额') && !colMap['价格']) colMap['价格'] = key
      if (cell.includes('定') && !colMap['定金']) colMap['定金'] = key
      if (cell.includes('角') && !colMap['角色']) colMap['角色'] = key
      if ((cell.includes('备') || cell.includes('注')) && !colMap['备注']) colMap['备注'] = key
    }
  }

  // 从表名推断漫展名称
  const expoName = normalizeExpoName(sheetName)
  if (!expoName) {
    errors.push(`"${sheetName}": 无法推断漫展名称，已跳过`)
    return { rows: [], expoName: '', errors }
  }

  // 第二步：解析数据行
  const parsedRows: ParsedRow[] = []
  let currentDate = '' // 记录最近遇到的日期（DAY1 标记），用于填充后续行

  for (let i = headerRowIdx + 1; i < rawRows.length; i++) {
    const row = rawRows[i]

    // 跳过表头重复行
    if (looksLikeHeaderRow(row)) continue
    // 跳过分组标题行（仅有"漫展"文本的行）
    if (isGroupHeaderRow(row) && !(colMap['角色'] && String(row[colMap['角色']] || '').trim())) continue

    // 提取日期：优先从有"时间"列取值，否则从第一列DAY文本
    let rowDate = ''
    if (colMap['时间']) {
      const timeVal = row[colMap['时间']]
      if (looksLikeExcelDate(timeVal)) {
        rowDate = excelSerialToDate(timeVal)
      } else if (timeVal) {
        const extracted = extractDateFromText(String(timeVal))
        if (extracted) rowDate = extracted
      }
    }

    // 从第一列或"漫展"列提取日期文本
    if (!rowDate) {
      const firstColKey = Object.keys(row)[0]
      const firstVal = String(row[firstColKey] || '').trim()
      if (colMap['漫展']) {
        const expoVal = String(row[colMap['漫展']] || '').trim()
        const extracted = extractDateFromText(expoVal) || extractDateFromText(firstVal)
        if (extracted) rowDate = extracted
      } else {
        const extracted = extractDateFromText(firstVal)
        if (extracted) rowDate = extracted
      }
    }

    if (rowDate) currentDate = rowDate

    // 提取角色
    const character = colMap['角色'] ? String(row[colMap['角色']] || '').trim() : ''
    if (!character) continue // 没有角色名的行跳过

    // 跳过汇总行
    if (character.includes('合计') || character.includes('总计') || character === '合计金额') continue

    // 客户昵称
    const customerName = colMap['CN'] ? String(row[colMap['CN']] || '').trim() : ''

    // 张数（处理 "4张"、"4~6" 等格式）
    const photoCount = colMap['张数'] ? parseNumberFromText(row[colMap['张数']]) : 0

    // 价格
    const price = colMap['价格'] ? parseAmount(row[colMap['价格']]) : 0

    // 定金
    const deposit = colMap['定金'] ? parseAmount(row[colMap['定金']]) : 0

    // 备注
    const note = colMap['备注'] ? String(row[colMap['备注']] || '').trim() : ''

    // 全部收入默认等于价格
    const totalIncome = price

    // 从备注或其他列提取订单状态信息
    let status: OrderStatus = '预付定金'
    // 检查额外状态列（部分表格在备注后有状态列）
    const extraKeys = Object.keys(row).filter(
      (k) => !Object.values(colMap).includes(k) && String(row[k] || '').trim()
    )
    const statusTexts = extraKeys.map((k) => String(row[k] || '').trim()).filter(Boolean)
    for (const st of statusTexts) {
      if (st === '已完成') { status = '交付'; break }
      if (st === '未付尾款') { status = '预付定金'; break }
      if (st === '未返图') { status = '工作中'; break }
      if (st === '已付未返图') { status = '工作中'; break }
    }

    // 有角色名和定金但状态仍是"预付定金"的，考虑升级
    if (customerName && deposit > 0 && status === '预付定金') {
      // 保持预付定金
    }
    if (customerName && deposit > 0 && price > 0 && deposit >= price) {
      status = '交付'
    }

    parsedRows.push({
      projectName: expoName,
      projectDate: currentDate,
      character,
      customerName,
      photoCount,
      price,
      deposit,
      totalIncome,
      status,
      note
    })
  }

  return { rows: parsedRows, expoName, errors }
}

/**
 * 导入 Excel 文件，与现有项目合并。
 * 遍历所有工作表，每个工作表解析为一个漫展项目。
 */
export function importProjectsFromExcel(
  file: File,
  existingProjects: ExpoProject[]
): Promise<{ projects: ExpoProject[]; newProjects: number; newOrders: number; errors: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetNames = workbook.SheetNames.filter((n) => n !== '工作表1') // 跳过空默认表

        if (sheetNames.length === 0) {
          reject(new Error('Excel 文件中没有找到有效的工作表'))
          return
        }

        const allErrors: string[] = []
        const allParsedRows: ParsedRow[] = []

        // 遍历每个工作表
        for (const sheetName of sheetNames) {
          const worksheet = workbook.Sheets[sheetName]

          // 如果表头在非首行，用 sheet_to_json 的 header 选项不好处理。
          // 改用更底层的方式：先获取所有单元格，按行组织，再找表头行。
          const sheetData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' })

          if (sheetData.length === 0) continue

          const { rows, expoName, errors } = parseSheet(sheetName, sheetData)
          allErrors.push(...errors.map((e) => `[${sheetName}] ${e}`))

          if (rows.length > 0) {
            allParsedRows.push(...rows)
          }
        }

        if (allParsedRows.length === 0) {
          const errMsg = `没有解析到有效订单数据。\n${allErrors.slice(0, 5).join('\n')}`
          reject(new Error(errMsg))
          return
        }

        // 第三步：按「漫展名称」分组为项目（合并同名）
        const projectMap = new Map<string, { project: ExpoProject; rows: ParsedRow[] }>()

        // 先克隆现有项目
        const mergedProjects: ExpoProject[] = existingProjects.map((p) => ({
          ...p,
          orders: p.orders.map((o) => ({ ...o }))
        }))

        const existingIndex = new Map<string, number>()
        for (let i = 0; i < mergedProjects.length; i++) {
          existingIndex.set(mergedProjects[i].name, i)
        }

        let newProjectsCount = 0

        for (const row of allParsedRows) {
          const nameKey = row.projectName

          if (!projectMap.has(nameKey)) {
            if (existingIndex.has(nameKey)) {
              const idx = existingIndex.get(nameKey)!
              projectMap.set(nameKey, { project: mergedProjects[idx], rows: [] })
            } else {
              const now = new Date().toISOString()
              const newProject: ExpoProject = {
                id: `proj-${Date.now()}-${newProjectsCount}`,
                name: nameKey,
                date: row.projectDate || '',
                color: '#ffffff',
                orders: [],
                createdAt: now,
                updatedAt: now
              }
              mergedProjects.push(newProject)
              existingIndex.set(nameKey, mergedProjects.length - 1)
              projectMap.set(nameKey, { project: newProject, rows: [] })
              newProjectsCount++
            }
          }
          projectMap.get(nameKey)!.rows.push(row)
        }

        // 第四步：将解析的行转为订单
        const now = new Date().toISOString()
        let newOrdersCount = 0

        for (const [, { project, rows }] of projectMap) {
          // 使用行数据中最常见的有意义的日期
          if (!project.date || project.date.length < 4) {
            const bestDate = rows.find((r) => r.projectDate && r.projectDate.length >= 4)
            if (bestDate) project.date = bestDate.projectDate
          }

          for (const row of rows) {
            const newOrder: ClientOrder = {
              id: `order-${Date.now()}-${newOrdersCount}`,
              projectId: project.id,
              character: row.character,
              customerName: row.customerName,
              photoCount: row.photoCount,
              price: row.price,
              deposit: row.deposit,
              totalIncome: row.totalIncome,
              status: row.status,
              note: row.note,
              createdAt: now,
              updatedAt: now
            }
            project.orders.push(newOrder)
            newOrdersCount++
          }
          project.updatedAt = now
        }

        resolve({
          projects: mergedProjects,
          newProjects: newProjectsCount,
          newOrders: newOrdersCount,
          errors: allErrors
        })
      } catch (error) {
        reject(error instanceof Error ? error : new Error('解析 Excel 文件失败'))
      }
    }

    reader.onerror = () => reject(new Error('读取 Excel 文件失败'))
    reader.readAsArrayBuffer(file)
  })
}
