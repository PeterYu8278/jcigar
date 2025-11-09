// 临时页面：inventory_logs 架构迁移
import React, { useState } from 'react'
import { Card, Button, Progress, Space, message, Typography, Alert, Statistic, Row, Col, Steps } from 'antd'
import { useTranslation } from 'react-i18next'
import { collection, getDocs, setDoc, doc, query, where, deleteDoc, Timestamp } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import { COLLECTIONS, createDocument } from '../../../services/firebase/firestore'
import type { InboundOrder, OutboundOrder, InventoryMovement } from '../../../types'

const { Title, Text } = Typography

interface MigrationStats {
  totalRecords: number
  inboundCount: number
  outboundCount: number
  uniqueReferences: number
  emptyReferences: number
  inboundOrdersCreated: number
  outboundOrdersCreated: number
  movementsCreated: number
  duplicateAttachmentsSaved: number
}

const InventoryMigration: React.FC = () => {
  const { t } = useTranslation()
  const [step, setStep] = useState(0)
  const [analyzing, setAnalyzing] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [stats, setStats] = useState<MigrationStats>({
    totalRecords: 0,
    inboundCount: 0,
    outboundCount: 0,
    uniqueReferences: 0,
    emptyReferences: 0,
    inboundOrdersCreated: 0,
    outboundOrdersCreated: 0,
    movementsCreated: 0,
    duplicateAttachmentsSaved: 0
  })
  const [logs, setLogs] = useState<string[]>([])
  const [groupedData, setGroupedData] = useState<Map<string, any>>(new Map())

  const addLog = (msg: string) => {
    console.log(msg)
    setLogs(prev => [...prev, msg])
  }

  // Step 1: 分析现有数据
  const analyzeData = async () => {
    setAnalyzing(true)
    setLogs([])
    addLog('🔍 [Step 1] 开始分析现有数据...')
    
    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.INVENTORY_LOGS))
      addLog(`📊 获取到 ${snapshot.size} 条记录`)
      
      const byType = { in: 0, out: 0, adjustment: 0 }
      const grouped = new Map<string, {
        type: 'in' | 'out' | 'adjustment'
        refNo: string
        records: any[]
      }>()
      let emptyRefCount = 0
      
      snapshot.forEach(docSnap => {
        const data = docSnap.data()
        const type = data.type as 'in' | 'out' | 'adjustment'
        const refNo = data.referenceNo || ''
        
        // 统计类型
        if (type === 'in') byType.in++
        else if (type === 'out') byType.out++
        else if (type === 'adjustment') byType.adjustment++
        
        // 分组
        if (!refNo || refNo.trim() === '') {
          emptyRefCount++
        } else {
          const key = `${type}:${refNo}`
          if (!grouped.has(key)) {
            grouped.set(key, { type, refNo, records: [] })
          }
          grouped.get(key)!.records.push({
            id: docSnap.id,
            data: { ...data, createdAt: data.createdAt }
          })
        }
      })
      
      addLog(`📈 类型统计: 入库=${byType.in}, 出库=${byType.out}, 调整=${byType.adjustment}`)
      addLog(`📋 唯一单号: ${grouped.size}`)
      addLog(`⚠️ 无单号记录: ${emptyRefCount}`)
      
      // 显示前10个分组
      let count = 0
      for (const [key, group] of grouped) {
        if (count++ >= 10) break
        addLog(`   - ${key}: ${group.records.length} 条记录`)
      }
      
      setStats({
        totalRecords: snapshot.size,
        inboundCount: byType.in,
        outboundCount: byType.out,
        uniqueReferences: grouped.size,
        emptyReferences: emptyRefCount,
        inboundOrdersCreated: 0,
        outboundOrdersCreated: 0,
        movementsCreated: 0,
        duplicateAttachmentsSaved: 0
      })
      
      setGroupedData(grouped)
      setStep(1)
      addLog('✅ 分析完成！')
      
    } catch (error: any) {
      addLog(`❌ 分析失败: ${error.message}`)
      message.error('分析失败')
    } finally {
      setAnalyzing(false)
    }
  }

  // Step 2: 执行迁移
  const executeMigration = async () => {
    setMigrating(true)
    addLog('\n📦 [Step 2] 开始迁移数据...')
    
    try {
      let inboundCreated = 0
      let outboundCreated = 0
      let movementsCreated = 0
      let duplicatesSaved = 0
      let processed = 0
      const total = groupedData.size
      
      for (const [key, group] of groupedData) {
        processed++
        setProgress(Math.round((processed / total) * 100))
        
        const { type, refNo, records } = group
        
        // 聚合产品信息
        const items: any[] = []
        let totalQuantity = 0
        let totalValue = 0
        let attachments: any = null
        let reason = ''
        let operatorId = 'system'
        let userId: string | undefined
        let userName: string | undefined
        let createdAt = new Date()
        
        for (const rec of records) {
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
          
          // 取第一条记录的附件
          if (!attachments && data.attachments && data.attachments.length > 0) {
            attachments = data.attachments
            // 计算节省的重复附件数
            duplicatesSaved += data.attachments.length * (records.length - 1)
          }
          
          if (!reason && data.reason) reason = data.reason
          if (data.operatorId) operatorId = data.operatorId
          if (data.userId) userId = data.userId
          if (data.userName) userName = data.userName
          
          // 取最早的时间
          const dataCreatedAt = data.createdAt?.toDate ? data.createdAt.toDate() : 
                               (data.createdAt instanceof Date ? data.createdAt : new Date(data.createdAt))
          if (dataCreatedAt < createdAt) createdAt = dataCreatedAt
        }
        
        if (type === 'in') {
          // 创建入库订单
          const inboundOrder: any = {
            referenceNo: refNo,
            type: 'purchase',
            reason: reason || '入库',
            items,
            totalQuantity,
            totalValue,
            attachments: attachments || undefined,
            status: 'completed',
            operatorId,
            createdAt: Timestamp.fromDate(createdAt),
            updatedAt: Timestamp.now()
          }
          
          try {
            await setDoc(doc(db, COLLECTIONS.INBOUND_ORDERS, refNo), inboundOrder)
            inboundCreated++
            addLog(`✅ 入库订单: ${refNo}`)
          } catch (error: any) {
            addLog(`❌ 入库订单失败: ${refNo} - ${error.message}`)
          }
          
          // 创建索引
          for (const item of items) {
            const movement: any = {
              cigarId: item.cigarId,
              cigarName: item.cigarName,
              itemType: item.itemType,
              type: 'in',
              quantity: item.quantity,
              referenceNo: refNo,
              orderType: 'inbound',
              reason: reason || undefined,
              unitPrice: item.unitPrice || undefined,
              createdAt: Timestamp.fromDate(createdAt)
            }
            
            try {
              await createDocument(COLLECTIONS.INVENTORY_MOVEMENTS, movement)
              movementsCreated++
            } catch (error: any) {
              addLog(`❌ 索引创建失败: ${item.cigarName}`)
            }
          }
          
        } else if (type === 'out') {
          // 创建出库订单
          let outboundType = 'other'
          if (reason.includes('活动') || reason.includes('event')) {
            outboundType = 'event'
          } else if (reason.includes('销售') || reason.includes('sale')) {
            outboundType = 'sale'
          }
          
          const outboundOrder: any = {
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
            createdAt: Timestamp.fromDate(createdAt),
            updatedAt: Timestamp.now()
          }
          
          try {
            await setDoc(doc(db, COLLECTIONS.OUTBOUND_ORDERS, refNo), outboundOrder)
            outboundCreated++
            addLog(`✅ 出库订单: ${refNo}`)
          } catch (error: any) {
            addLog(`❌ 出库订单失败: ${refNo} - ${error.message}`)
          }
          
          // 创建索引
          for (const item of items) {
            const movement: any = {
              cigarId: item.cigarId,
              cigarName: item.cigarName,
              itemType: item.itemType,
              type: 'out',
              quantity: item.quantity,
              referenceNo: refNo,
              orderType: 'outbound',
              reason: reason || undefined,
              unitPrice: item.unitPrice || undefined,
              createdAt: Timestamp.fromDate(createdAt)
            }
            
            try {
              await createDocument(COLLECTIONS.INVENTORY_MOVEMENTS, movement)
              movementsCreated++
            } catch (error: any) {
              addLog(`❌ 索引创建失败: ${item.cigarName}`)
            }
          }
        }
        
        // 每处理5个订单暂停一下，避免配额限制
        if (processed % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
      
      setStats(prev => ({
        ...prev,
        inboundOrdersCreated: inboundCreated,
        outboundOrdersCreated: outboundCreated,
        movementsCreated,
        duplicateAttachmentsSaved: duplicatesSaved
      }))
      
      setStep(2)
      addLog(`\n✅ 迁移完成:`)
      addLog(`   - 入库订单: ${inboundCreated}`)
      addLog(`   - 出库订单: ${outboundCreated}`)
      addLog(`   - 索引记录: ${movementsCreated}`)
      addLog(`   - 节省附件: ${duplicatesSaved} 个`)
      
      message.success('迁移完成！')
      
    } catch (error: any) {
      addLog(`❌ 迁移失败: ${error.message}`)
      message.error(`迁移失败: ${error.message}`)
    } finally {
      setMigrating(false)
    }
  }

  // Step 3: 验证数据
  const verifyData = async () => {
    setVerifying(true)
    addLog('\n🔍 [Step 3] 验证数据完整性...')
    
    try {
      // 统计旧表
      const oldLogs = await getDocs(collection(db, COLLECTIONS.INVENTORY_LOGS))
      
      // 统计新表
      const inboundOrders = await getDocs(collection(db, COLLECTIONS.INBOUND_ORDERS))
      const outboundOrders = await getDocs(collection(db, COLLECTIONS.OUTBOUND_ORDERS))
      const movements = await getDocs(collection(db, COLLECTIONS.INVENTORY_MOVEMENTS))
      
      addLog(`📊 旧架构: inventory_logs = ${oldLogs.size}`)
      addLog(`📊 新架构:`)
      addLog(`   - inbound_orders = ${inboundOrders.size}`)
      addLog(`   - outbound_orders = ${outboundOrders.size}`)
      addLog(`   - inventory_movements = ${movements.size}`)
      
      // 验证记录数量
      if (movements.size !== oldLogs.size) {
        addLog(`⚠️ 记录数量不匹配: 预期 ${oldLogs.size}, 实际 ${movements.size}`)
      } else {
        addLog(`✅ 记录数量匹配！`)
      }
      
      // 验证库存计算
      addLog('\n🧮 验证库存计算...')
      
      const oldStockMap = new Map<string, number>()
      oldLogs.forEach(docSnap => {
        const data = docSnap.data()
        const cigarId = data.cigarId
        const itemType = data.itemType
        
        // 只统计雪茄产品
        if (itemType && itemType !== 'cigar') return
        
        const qty = Number(data.quantity) || 0
        const current = oldStockMap.get(cigarId) || 0
        if (data.type === 'in') {
          oldStockMap.set(cigarId, current + qty)
        } else if (data.type === 'out') {
          oldStockMap.set(cigarId, current - qty)
        }
      })
      
      const newStockMap = new Map<string, number>()
      movements.forEach(docSnap => {
        const data = docSnap.data()
        const cigarId = data.cigarId
        const itemType = data.itemType
        
        // 只统计雪茄产品
        if (itemType && itemType !== 'cigar') return
        
        const qty = Number(data.quantity) || 0
        const current = newStockMap.get(cigarId) || 0
        if (data.type === 'in') {
          newStockMap.set(cigarId, current + qty)
        } else if (data.type === 'out') {
          newStockMap.set(cigarId, current - qty)
        }
      })
      
      let stockMatches = true
      let mismatchCount = 0
      for (const [cigarId, oldStock] of oldStockMap) {
        const newStock = newStockMap.get(cigarId) || 0
        if (oldStock !== newStock) {
          addLog(`❌ 库存不匹配 ${cigarId}: 旧=${oldStock}, 新=${newStock}`)
          stockMatches = false
          mismatchCount++
        }
      }
      
      if (stockMatches) {
        addLog(`✅ 所有产品库存计算匹配！`)
      } else {
        addLog(`⚠️ 发现 ${mismatchCount} 个产品库存不匹配`)
      }
      
      setStep(3)
      addLog('\n🎉 验证完成！')
      
      if (stockMatches && movements.size === oldLogs.size) {
        message.success('数据验证通过！可以安全使用新架构')
      } else {
        message.warning('验证发现问题，请检查日志')
      }
      
    } catch (error: any) {
      addLog(`❌ 验证失败: ${error.message}`)
      message.error(`验证失败: ${error.message}`)
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Title level={2}>📦 库存架构迁移工具</Title>
        <Alert
          message="重要说明"
          description={
            <div>
              <p><strong>迁移目的：</strong>将 inventory_logs（扁平结构）重构为 inbound_orders + outbound_orders + inventory_movements（订单+索引结构）</p>
              <p><strong>主要改进：</strong></p>
              <ul>
                <li>附件存储在订单级别，不重复（节省存储和操作成本）</li>
                <li>订单级别的原子操作（更新一次即可）</li>
                <li>更符合业务逻辑（一个订单=一个document）</li>
                <li>查询性能优化（按产品或按订单都很快）</li>
              </ul>
              <p><strong>安全措施：</strong>旧数据 (inventory_logs) 会保留，迁移后可验证并手动删除</p>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <Steps
          current={step}
          items={[
            { title: '分析数据', description: '扫描现有记录' },
            { title: '执行迁移', description: '创建新架构' },
            { title: '验证完整性', description: '对比数据' },
            { title: '完成', description: '迁移成功' }
          ]}
          style={{ marginBottom: 32 }}
        />

        {/* 统计信息 */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic title="总记录数" value={stats.totalRecords} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="入库记录" value={stats.inboundCount} valueStyle={{ color: '#52c41a' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="出库记录" value={stats.outboundCount} valueStyle={{ color: '#ff4d4f' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="唯一单号" value={stats.uniqueReferences} />
            </Card>
          </Col>
        </Row>

        {step >= 1 && (
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Card>
                <Statistic title="入库订单" value={stats.inboundOrdersCreated} suffix={`/ ${stats.inboundCount > 0 ? '?' : '0'}`} />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic title="出库订单" value={stats.outboundOrdersCreated} suffix={`/ ${stats.outboundCount > 0 ? '?' : '0'}`} />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic title="索引记录" value={stats.movementsCreated} suffix={`/ ${stats.totalRecords}`} />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic 
                  title="节省附件" 
                  value={stats.duplicateAttachmentsSaved} 
                  valueStyle={{ color: '#1890ff' }}
                  suffix="个"
                />
              </Card>
            </Col>
          </Row>
        )}

        {/* 进度条 */}
        {migrating && (
          <div style={{ marginBottom: 24 }}>
            <Text>迁移进度：</Text>
            <Progress percent={progress} status="active" />
          </div>
        )}

        {/* 操作按钮 */}
        <Space size="large" style={{ marginBottom: 24 }}>
          <Button 
            type="primary" 
            size="large"
            onClick={analyzeData} 
            loading={analyzing}
            disabled={step > 0}
          >
            1️⃣ 分析数据
          </Button>
          
          <Button 
            type="primary" 
            size="large"
            onClick={executeMigration} 
            loading={migrating}
            disabled={step !== 1}
          >
            2️⃣ 执行迁移
          </Button>
          
          <Button 
            type="primary" 
            size="large"
            onClick={verifyData} 
            loading={verifying}
            disabled={step !== 2}
          >
            3️⃣ 验证数据
          </Button>
        </Space>

        {/* 日志输出 */}
        <Card 
          title="执行日志" 
          style={{ marginTop: 24 }}
          bodyStyle={{ 
            maxHeight: 400, 
            overflow: 'auto', 
            background: '#000', 
            color: '#0f0',
            fontFamily: 'monospace',
            fontSize: 12
          }}
        >
          {logs.length === 0 ? (
            <Text style={{ color: '#666' }}>等待执行...</Text>
          ) : (
            logs.map((log, idx) => (
              <div key={idx}>{log}</div>
            ))
          )}
        </Card>

        {step === 3 && (
          <Alert
            message="迁移成功！"
            description={
              <div>
                <p>✅ 数据已成功迁移到新架构</p>
                <p>✅ 刷新"库存管理"页面，应该会看到控制台输出：<code>✅ [Inventory] Using new architecture</code></p>
                <p>⚠️ 请在生产环境测试一段时间后，再决定是否删除旧的 inventory_logs 数据</p>
                <p>🗑️ 删除旧数据的方法：Firebase Console → Firestore → 删除 inventory_logs collection</p>
              </div>
            }
            type="success"
            showIcon
            style={{ marginTop: 24 }}
          />
        )}
      </Card>
    </div>
  )
}

export default InventoryMigration

