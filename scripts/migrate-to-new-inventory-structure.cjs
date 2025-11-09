/**
 * 迁移脚本：将 inventory_logs 重构为新架构
 * 
 * 旧架构：inventory_logs（扁平化，一个产品一条记录）
 * 新架构：
 *   - inbound_orders（入库订单，一个单号一个document）
 *   - outbound_orders（出库订单，一个单号一个document）
 *   - inventory_movements（索引表，用于快速按产品查询）
 */

const admin = require('firebase-admin')
const serviceAccount = require('./serviceAccountKey.json')

// 初始化 Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

// 集合名称
const COLLECTIONS = {
  OLD_LOGS: 'inventory_logs',
  INBOUND_ORDERS: 'inbound_orders',
  OUTBOUND_ORDERS: 'outbound_orders',
  INVENTORY_MOVEMENTS: 'inventory_movements'
}

/**
 * 分析现有数据
 */
async function analyzeData() {
  console.log('🔍 [Migration] Step 1: Analyzing existing data...')
  
  const snapshot = await db.collection(COLLECTIONS.OLD_LOGS).get()
  console.log(`📊 [Migration] Total records: ${snapshot.size}`)
  
  const byType = { in: 0, out: 0, adjustment: 0 }
  const byReference = new Map()
  const emptyReference = []
  
  snapshot.forEach(doc => {
    const data = doc.data()
    const type = data.type
    const refNo = data.referenceNo || ''
    
    // 统计类型
    if (type === 'in') byType.in++
    else if (type === 'out') byType.out++
    else if (type === 'adjustment') byType.adjustment++
    
    // 统计单号
    if (!refNo || refNo.trim() === '') {
      emptyReference.push(doc.id)
    } else {
      const key = `${type}:${refNo}`
      if (!byReference.has(key)) {
        byReference.set(key, { type, refNo, count: 0, records: [] })
      }
      const group = byReference.get(key)
      group.count++
      group.records.push({ id: doc.id, data })
    }
  })
  
  console.log(`📈 [Migration] By type: IN=${byType.in}, OUT=${byType.out}, ADJUSTMENT=${byType.adjustment}`)
  console.log(`📋 [Migration] Unique reference numbers: ${byReference.size}`)
  console.log(`⚠️ [Migration] Records without referenceNo: ${emptyReference.length}`)
  
  // 显示前10个分组
  let count = 0
  for (const [key, group] of byReference) {
    if (count++ >= 10) break
    console.log(`   - ${key}: ${group.count} records`)
  }
  
  return {
    totalRecords: snapshot.size,
    byType,
    byReference,
    emptyReference
  }
}

/**
 * 迁移入库记录
 */
async function migrateInboundRecords(byReference) {
  console.log('\n📦 [Migration] Step 2: Migrating inbound records...')
  
  let ordersCreated = 0
  let movementsCreated = 0
  
  for (const [key, group] of byReference) {
    if (group.type !== 'in') continue
    
    const refNo = group.refNo
    console.log(`\n🔄 [Migration] Processing inbound order: ${refNo} (${group.count} items)`)
    
    // 聚合产品信息
    const items = []
    let totalQuantity = 0
    let totalValue = 0
    let attachments = null
    let reason = ''
    let operatorId = 'system'
    let createdAt = new Date()
    
    for (const rec of group.records) {
      const data = rec.data
      
      items.push({
        cigarId: data.cigarId,
        cigarName: data.cigarName || data.cigarId,
        itemType: data.itemType || 'cigar',
        quantity: Number(data.quantity) || 0,
        unitPrice: data.unitPrice ? Number(data.unitPrice) : undefined,
        subtotal: data.unitPrice ? Number(data.unitPrice) * Number(data.quantity) : undefined
      })
      
      totalQuantity += Number(data.quantity) || 0
      if (data.unitPrice) {
        totalValue += Number(data.unitPrice) * Number(data.quantity)
      }
      
      // 取第一条记录的附件（假设所有记录的附件相同）
      if (!attachments && data.attachments && data.attachments.length > 0) {
        attachments = data.attachments
      }
      
      if (!reason && data.reason) {
        reason = data.reason
      }
      
      if (data.operatorId) {
        operatorId = data.operatorId
      }
      
      // 取最早的创建时间
      const dataCreatedAt = data.createdAt?.toDate ? data.createdAt.toDate() : 
                           (data.createdAt instanceof Date ? data.createdAt : new Date(data.createdAt))
      if (dataCreatedAt < createdAt) {
        createdAt = dataCreatedAt
      }
    }
    
    // 创建 inbound_order
    const inboundOrder = {
      referenceNo: refNo,
      type: 'purchase',
      reason: reason || '入库',
      items,
      totalQuantity,
      totalValue,
      attachments: attachments || undefined,
      status: 'completed',
      operatorId,
      createdAt: admin.firestore.Timestamp.fromDate(createdAt),
      updatedAt: admin.firestore.Timestamp.now()
    }
    
    try {
      await db.collection(COLLECTIONS.INBOUND_ORDERS).doc(refNo).set(inboundOrder)
      ordersCreated++
      console.log(`   ✅ Created inbound_order: ${refNo}`)
    } catch (error) {
      console.error(`   ❌ Failed to create inbound_order: ${refNo}`, error.message)
      continue
    }
    
    // 创建对应的 inventory_movements
    for (const item of items) {
      const movement = {
        cigarId: item.cigarId,
        cigarName: item.cigarName,
        itemType: item.itemType,
        type: 'in',
        quantity: item.quantity,
        referenceNo: refNo,
        orderType: 'inbound',
        reason: reason || undefined,
        unitPrice: item.unitPrice || undefined,
        createdAt: admin.firestore.Timestamp.fromDate(createdAt)
      }
      
      try {
        await db.collection(COLLECTIONS.INVENTORY_MOVEMENTS).add(movement)
        movementsCreated++
      } catch (error) {
        console.error(`   ❌ Failed to create movement for ${item.cigarName}`, error.message)
      }
    }
  }
  
  console.log(`\n✅ [Migration] Inbound records complete:`)
  console.log(`   - Orders created: ${ordersCreated}`)
  console.log(`   - Movements created: ${movementsCreated}`)
  
  return { ordersCreated, movementsCreated }
}

/**
 * 迁移出库记录
 */
async function migrateOutboundRecords(byReference) {
  console.log('\n📤 [Migration] Step 3: Migrating outbound records...')
  
  let ordersCreated = 0
  let movementsCreated = 0
  
  for (const [key, group] of byReference) {
    if (group.type !== 'out') continue
    
    const refNo = group.refNo
    console.log(`\n🔄 [Migration] Processing outbound order: ${refNo} (${group.count} items)`)
    
    // 聚合产品信息
    const items = []
    let totalQuantity = 0
    let totalValue = 0
    let reason = ''
    let operatorId = 'system'
    let userId = undefined
    let userName = undefined
    let createdAt = new Date()
    
    for (const rec of group.records) {
      const data = rec.data
      
      items.push({
        cigarId: data.cigarId,
        cigarName: data.cigarName || data.cigarId,
        itemType: data.itemType || 'cigar',
        quantity: Number(data.quantity) || 0,
        unitPrice: data.unitPrice ? Number(data.unitPrice) : undefined,
        subtotal: data.unitPrice ? Number(data.unitPrice) * Number(data.quantity) : undefined
      })
      
      totalQuantity += Number(data.quantity) || 0
      if (data.unitPrice) {
        totalValue += Number(data.unitPrice) * Number(data.quantity)
      }
      
      if (!reason && data.reason) {
        reason = data.reason
      }
      
      if (data.operatorId) {
        operatorId = data.operatorId
      }
      
      if (data.userId) {
        userId = data.userId
      }
      
      if (data.userName) {
        userName = data.userName
      }
      
      const dataCreatedAt = data.createdAt?.toDate ? data.createdAt.toDate() : 
                           (data.createdAt instanceof Date ? data.createdAt : new Date(data.createdAt))
      if (dataCreatedAt < createdAt) {
        createdAt = dataCreatedAt
      }
    }
    
    // 判断出库类型
    let outboundType = 'other'
    if (reason.includes('活动') || reason.includes('event')) {
      outboundType = 'event'
    } else if (reason.includes('销售') || reason.includes('sale')) {
      outboundType = 'sale'
    }
    
    // 创建 outbound_order
    const outboundOrder = {
      referenceNo: refNo,
      type: outboundType,
      reason: reason || '出库',
      items,
      totalQuantity,
      totalValue,
      orderId: refNo.startsWith('ORD-') ? refNo : undefined,
      userId,
      userName,
      status: 'completed',
      operatorId,
      createdAt: admin.firestore.Timestamp.fromDate(createdAt),
      updatedAt: admin.firestore.Timestamp.now()
    }
    
    try {
      await db.collection(COLLECTIONS.OUTBOUND_ORDERS).doc(refNo).set(outboundOrder)
      ordersCreated++
      console.log(`   ✅ Created outbound_order: ${refNo}`)
    } catch (error) {
      console.error(`   ❌ Failed to create outbound_order: ${refNo}`, error.message)
      continue
    }
    
    // 创建对应的 inventory_movements
    for (const item of items) {
      const movement = {
        cigarId: item.cigarId,
        cigarName: item.cigarName,
        itemType: item.itemType,
        type: 'out',
        quantity: item.quantity,
        referenceNo: refNo,
        orderType: 'outbound',
        reason: reason || undefined,
        unitPrice: item.unitPrice || undefined,
        createdAt: admin.firestore.Timestamp.fromDate(createdAt)
      }
      
      try {
        await db.collection(COLLECTIONS.INVENTORY_MOVEMENTS).add(movement)
        movementsCreated++
      } catch (error) {
        console.error(`   ❌ Failed to create movement for ${item.cigarName}`, error.message)
      }
    }
  }
  
  console.log(`\n✅ [Migration] Outbound records complete:`)
  console.log(`   - Orders created: ${ordersCreated}`)
  console.log(`   - Movements created: ${movementsCreated}`)
  
  return { ordersCreated, movementsCreated }
}

/**
 * 验证数据完整性
 */
async function verifyMigration() {
  console.log('\n🔍 [Migration] Step 4: Verifying data integrity...')
  
  // 1. 统计旧表
  const oldLogs = await db.collection(COLLECTIONS.OLD_LOGS).get()
  const oldTotal = oldLogs.size
  
  // 2. 统计新表
  const inboundOrders = await db.collection(COLLECTIONS.INBOUND_ORDERS).get()
  const outboundOrders = await db.collection(COLLECTIONS.OUTBOUND_ORDERS).get()
  const movements = await db.collection(COLLECTIONS.INVENTORY_MOVEMENTS).get()
  
  console.log(`📊 [Migration] Old structure:`)
  console.log(`   - inventory_logs: ${oldTotal} records`)
  
  console.log(`📊 [Migration] New structure:`)
  console.log(`   - inbound_orders: ${inboundOrders.size} documents`)
  console.log(`   - outbound_orders: ${outboundOrders.size} documents`)
  console.log(`   - inventory_movements: ${movements.size} records`)
  
  // 3. 验证总数量
  if (movements.size !== oldTotal) {
    console.error(`⚠️ [Migration] Record count mismatch!`)
    console.error(`   Expected: ${oldTotal}, Got: ${movements.size}`)
  } else {
    console.log(`✅ [Migration] Record count matches!`)
  }
  
  // 4. 按产品验证库存
  console.log(`\n🧮 [Migration] Verifying stock calculations...`)
  
  const oldStockMap = new Map()
  oldLogs.forEach(doc => {
    const data = doc.data()
    const cigarId = data.cigarId
    const itemType = data.itemType
    
    // 只统计雪茄产品
    if (itemType && itemType !== 'cigar') return
    
    if (!oldStockMap.has(cigarId)) {
      oldStockMap.set(cigarId, 0)
    }
    
    const qty = Number(data.quantity) || 0
    if (data.type === 'in') {
      oldStockMap.set(cigarId, oldStockMap.get(cigarId) + qty)
    } else if (data.type === 'out') {
      oldStockMap.set(cigarId, oldStockMap.get(cigarId) - qty)
    }
  })
  
  const newStockMap = new Map()
  movements.forEach(doc => {
    const data = doc.data()
    const cigarId = data.cigarId
    const itemType = data.itemType
    
    // 只统计雪茄产品
    if (itemType && itemType !== 'cigar') return
    
    if (!newStockMap.has(cigarId)) {
      newStockMap.set(cigarId, 0)
    }
    
    const qty = Number(data.quantity) || 0
    if (data.type === 'in') {
      newStockMap.set(cigarId, newStockMap.get(cigarId) + qty)
    } else if (data.type === 'out') {
      newStockMap.set(cigarId, newStockMap.get(cigarId) - qty)
    }
  })
  
  // 比对库存
  let stockMatches = true
  for (const [cigarId, oldStock] of oldStockMap) {
    const newStock = newStockMap.get(cigarId) || 0
    if (oldStock !== newStock) {
      console.error(`   ❌ Stock mismatch for ${cigarId}: old=${oldStock}, new=${newStock}`)
      stockMatches = false
    }
  }
  
  if (stockMatches) {
    console.log(`✅ [Migration] All stock calculations match!`)
  }
  
  // 5. 验证附件
  console.log(`\n📎 [Migration] Verifying attachments...`)
  
  let oldAttachmentCount = 0
  const oldAttachmentsByRef = new Map()
  
  oldLogs.forEach(doc => {
    const data = doc.data()
    if (data.attachments && data.attachments.length > 0) {
      oldAttachmentCount += data.attachments.length
      const refNo = data.referenceNo || ''
      if (refNo) {
        oldAttachmentsByRef.set(refNo, data.attachments)
      }
    }
  })
  
  let newAttachmentCount = 0
  
  inboundOrders.forEach(doc => {
    const data = doc.data()
    if (data.attachments && data.attachments.length > 0) {
      newAttachmentCount += data.attachments.length
    }
  })
  
  console.log(`   Old: ${oldAttachmentCount} attachments (with duplicates)`)
  console.log(`   New: ${newAttachmentCount} attachments (deduplicated)`)
  console.log(`   Saved: ${oldAttachmentCount - newAttachmentCount} duplicate entries`)
  
  return {
    oldTotal,
    newTotal: movements.size,
    stockMatches,
    attachmentReduction: oldAttachmentCount - newAttachmentCount
  }
}

/**
 * 主执行函数
 */
async function main() {
  console.log('🚀 [Migration] Starting inventory_logs refactoring...\n')
  
  try {
    // Step 1: 分析数据
    const analysis = await analyzeData()
    
    // Step 2: 迁移入库记录
    const inboundResults = await migrateInboundRecords(analysis.byReference)
    
    // Step 3: 迁移出库记录
    const outboundResults = await migrateOutboundRecords(analysis.byReference)
    
    // Step 4: 验证数据
    const verification = await verifyMigration()
    
    // 汇总报告
    console.log('\n' + '='.repeat(60))
    console.log('🎉 [Migration] MIGRATION COMPLETED!')
    console.log('='.repeat(60))
    console.log(`\n📊 Summary:`)
    console.log(`   Inbound Orders: ${inboundResults.ordersCreated}`)
    console.log(`   Outbound Orders: ${outboundResults.ordersCreated}`)
    console.log(`   Inventory Movements: ${inboundResults.movementsCreated + outboundResults.movementsCreated}`)
    console.log(`   Storage Saved: ${verification.attachmentReduction} duplicate attachments`)
    console.log(`\n✅ Data integrity verified: ${verification.stockMatches ? 'PASS' : 'FAIL'}`)
    
    console.log(`\n⚠️ IMPORTANT: Please test the application before deleting old data!`)
    console.log(`   Old data is preserved in: ${COLLECTIONS.OLD_LOGS}`)
    
  } catch (error) {
    console.error('❌ [Migration] Fatal error:', error)
    process.exit(1)
  }
}

// 运行迁移
main()
  .then(() => {
    console.log('\n✅ Migration script completed.')
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Migration script failed:', error)
    process.exit(1)
  })

