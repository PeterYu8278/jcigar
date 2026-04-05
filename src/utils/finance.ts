/**
 * 财务计算工具类 - 专门处理 FIFO 利润计算
 */
import dayjs from 'dayjs'
import { InventoryMovement } from '../types'

export interface ProfitRecord {
  id: string
  referenceNo: string
  cigarId: string
  cigarName: string
  date: Date
  revenue: number  // 销售额
  cogs: number     // 成本 (Cost of Goods Sold)
  profit: number   // 利润
  quantity: number
}

interface StockBatch {
  quantity: number
  unitPrice: number
  date: Date
}

/**
 * 使用 FIFO (先进先出) 算法计算所有订单的利润
 * @param movements 库存变动记录 (必须包含入库成本和出库售价)
 */
export const calculateFifoProfit = (movements: InventoryMovement[]): ProfitRecord[] => {
  // 辅助函数：安全转换任何可能的日期格式为 Date 对象
  const toDateObj = (val: any): Date => {
    if (!val) return new Date()
    if (val && typeof val.toDate === 'function') return val.toDate()
    const d = val instanceof Date ? val : new Date(val)
    return isNaN(d.getTime()) ? new Date() : d
  }

  // 1. 按时间正序排列所有变动
  const sortedMovements = [...movements].sort((a, b) => {
    const timeA = toDateObj(a.createdAt).getTime()
    const timeB = toDateObj(b.createdAt).getTime()
    return timeA - timeB
  })

  // 1. 获取每个产品的“兜底成本”（回溯或预览整个序列中的参考价格）
  const productReferenceCosts = new Map<string, number>()
  sortedMovements.forEach(m => {
    if (m.type === 'in' && m.unitPrice) {
      // 记录最后一次见到的入库价作为该产品的参考成本
      productReferenceCosts.set(m.cigarId, Number(m.unitPrice))
    }
  })

  // 如果某些产品还没有记录到入库（可能是先销售后补单），再次尝试找该产品的第一个入库价
  const missingCosts = new Set([...movements.map(m => m.cigarId)])
  productReferenceCosts.forEach((_, id) => missingCosts.delete(id))
  if (missingCosts.size > 0) {
    sortedMovements.forEach(m => {
      if (m.type === 'in' && missingCosts.has(m.cigarId) && m.unitPrice) {
        productReferenceCosts.set(m.cigarId, Number(m.unitPrice))
        missingCosts.delete(m.cigarId)
      }
    })
  }

  // 每个产品的库存池 (队列)
  const stockPools = new Map<string, StockBatch[]>()
  const profitRecords: ProfitRecord[] = []
  
  // 实时追踪当前的“最新入库成本”用于预见性补偿
  const currentPriceAnchor = new Map<string, number>()

  // 2. 遍历变动日志运行 FIFO 引擎
  sortedMovements.forEach((m) => {
    const cigarId = m.cigarId
    const qty = Number(m.quantity || 0)
    const unitPrice = Number(m.unitPrice || 0)
    const moveDate = toDateObj(m.createdAt)

    if (m.type === 'in') {
      // 【入库】添加进成本池，并更新当前价格锚点
      currentPriceAnchor.set(cigarId, unitPrice)
      const pool = stockPools.get(cigarId) || []
      pool.push({
        quantity: qty,
        unitPrice: unitPrice,
        date: moveDate
      })
      stockPools.set(cigarId, pool)
    } else if (m.type === 'out') {
      // 【出库】匹配成本计算利润
      let remainingToMatch = qty
      let totalCost = 0
      const pool = stockPools.get(cigarId) || []

      // 3. 核心逻辑：从池子中按 FIFO 扣除成本
      while (remainingToMatch > 0 && pool.length > 0) {
        const batch = pool[0]
        const take = Math.min(remainingToMatch, batch.quantity)
        
        totalCost += take * batch.unitPrice
        batch.quantity -= take
        remainingToMatch -= take

        if (batch.quantity <= 0) {
          pool.shift()
        }
      }

      // 4. 处理负库存（预先出货）：如果池子空了但还有剩余数量
      if (remainingToMatch > 0) {
        // 尝试获取兜底成本：1. 当前已知的最新入库价 -> 2. 全局搜寻到的参考价 -> 3. 0
        const fallbackCost = currentPriceAnchor.get(cigarId) ?? productReferenceCosts.get(cigarId) ?? 0
        totalCost += remainingToMatch * fallbackCost
      }

      const revenue = qty * unitPrice
      profitRecords.push({
        id: m.id,
        referenceNo: m.referenceNo,
        cigarId: m.cigarId,
        cigarName: m.cigarName,
        date: moveDate,
        revenue,
        cogs: totalCost,
        profit: revenue - totalCost,
        quantity: qty
      })
    }
  })

  return profitRecords
}

/**
 * 按周期统计利润
 */
export const aggregateProfitByPeriod = (records: ProfitRecord[], period: 'day' | 'week' | 'month' = 'day') => {
  const stats = new Map<string, { revenue: number, profit: number, cogs: number, count: number }>()
  
  records.forEach(r => {
    const date = dayjs(r.date)
    let key = ''
    
    if (period === 'day') key = date.format('YYYY-MM-DD')
    else if (period === 'week') key = date.startOf('week').format('YYYY-MM-DD')
    else if (period === 'month') key = date.format('YYYY-MM')
    
    const existing = stats.get(key) || { revenue: 0, profit: 0, cogs: 0, count: 0 }
    stats.set(key, {
      revenue: existing.revenue + r.revenue,
      profit: existing.profit + r.profit,
      cogs: existing.cogs + r.cogs,
      count: existing.count + 1
    })
  })

  return Array.from(stats.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date))
}
