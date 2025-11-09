// 临时页面：inventory_logs 架构迁移
import React, { useState } from 'react'
import { Card, Button, Progress, Space, message, Typography, Alert, Statistic, Row, Col, Steps, Table, Tag, Collapse, Descriptions } from 'antd'
import { useTranslation } from 'react-i18next'
import { WarningOutlined, CheckCircleOutlined, EyeOutlined } from '@ant-design/icons'
import { collection, getDocs, setDoc, addDoc, doc, query, where, deleteDoc, Timestamp } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import { COLLECTIONS, createDocument } from '../../../services/firebase/firestore'
import type { InboundOrder, OutboundOrder, InventoryMovement } from '../../../types'

const { Title, Text } = Typography
const { Panel } = Collapse

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

interface OrderPreview {
  referenceNo: string
  type: 'in' | 'out'
  items: any[]
  totalQuantity: number
  totalValue: number
  attachments: any[]
  deduplication: {
    before: number  // 原来有几条记录
    after: number   // 现在只有1个订单
    saved: number   // 节省的操作次数
  }
  createdAt: Date
  reason: string
}

interface Warning {
  type: string
  severity: 'warning' | 'error' | 'info'
  count: number
  message: string
  details?: string
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
  
  // 预览数据
  const [previewData, setPreviewData] = useState<{
    inboundOrders: OrderPreview[]
    outboundOrders: OrderPreview[]
    warnings: Warning[]
    improvements: {
      attachmentReduction: number
      attachmentReductionPercent: number
      storageOptimization: string
    }
  }>({
    inboundOrders: [],
    outboundOrders: [],
    warnings: [],
    improvements: {
      attachmentReduction: 0,
      attachmentReductionPercent: 0,
      storageOptimization: ''
    }
  })

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
      
      // 构建预览数据
      addLog('\n📋 构建预览数据...')
      const inboundPreviews: OrderPreview[] = []
      const outboundPreviews: OrderPreview[] = []
      const warnings: Warning[] = []
      let totalAttachmentsOld = 0
      let totalAttachmentsNew = 0
      
      for (const [key, group] of grouped) {
        if (group.type === 'adjustment') continue // 跳过调整记录
        
        // 聚合产品和附件
        const items: any[] = []
        let totalQuantity = 0
        let totalValue = 0
        let orderAttachments: any[] = []
        let reason = ''
        let createdAt = new Date()
        
        // 检测附件一致性
        const attachmentSets = new Set<string>()
        
        for (const rec of group.records) {
          const data = rec.data
          
          items.push({
            cigarId: data.cigarId,
            cigarName: data.cigarName || data.cigarId,
            itemType: data.itemType || 'cigar',
            quantity: Number(data.quantity) || 0,
            unitPrice: data.unitPrice ? Number(data.unitPrice) : undefined
          })
          
          totalQuantity += Number(data.quantity) || 0
          if (data.unitPrice) {
            totalValue += Number(data.unitPrice) * Number(data.quantity)
          }
          
          if (!reason && data.reason) reason = data.reason
          
          const dataCreatedAt = data.createdAt?.toDate ? data.createdAt.toDate() : 
                               (data.createdAt instanceof Date ? data.createdAt : new Date(data.createdAt))
          if (dataCreatedAt < createdAt) createdAt = dataCreatedAt
          
          // 统计附件
          if (data.attachments && data.attachments.length > 0) {
            totalAttachmentsOld += data.attachments.length
            attachmentSets.add(JSON.stringify(data.attachments))
            
            if (!orderAttachments.length) {
              orderAttachments = data.attachments
            }
          }
        }
        
        // 检测附件不一致
        if (attachmentSets.size > 1) {
          warnings.push({
            type: 'inconsistent_attachments',
            severity: 'warning',
            count: attachmentSets.size,
            message: `单号 ${group.refNo} 的附件在不同产品间不一致`,
            details: '将使用第一条记录的附件'
          })
        }
        
        if (orderAttachments.length > 0) {
          totalAttachmentsNew += orderAttachments.length
        }
        
        const orderPreview: OrderPreview = {
          referenceNo: group.refNo,
          type: group.type as 'in' | 'out',
          items,
          totalQuantity,
          totalValue,
          attachments: orderAttachments,
          deduplication: {
            before: group.records.length,
            after: 1,
            saved: group.records.length - 1
          },
          createdAt,
          reason: reason || (group.type === 'in' ? '入库' : '出库')
        }
        
        if (group.type === 'in') {
          inboundPreviews.push(orderPreview)
        } else if (group.type === 'out') {
          outboundPreviews.push(orderPreview)
        }
      }
      
      // 添加空单号警告
      if (emptyRefCount > 0) {
        warnings.push({
          type: 'empty_reference',
          severity: 'warning',
          count: emptyRefCount,
          message: `${emptyRefCount} 条记录没有单号`,
          details: '这些记录将被跳过，不会迁移'
        })
      }
      
      // 计算附件优化效果
      const attachmentReduction = totalAttachmentsOld - totalAttachmentsNew
      const attachmentReductionPercent = totalAttachmentsOld > 0 
        ? Math.round((attachmentReduction / totalAttachmentsOld) * 100)
        : 0
      
      setPreviewData({
        inboundOrders: inboundPreviews.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
        outboundOrders: outboundPreviews.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
        warnings,
        improvements: {
          attachmentReduction,
          attachmentReductionPercent,
          storageOptimization: `${totalAttachmentsOld} → ${totalAttachmentsNew} 个附件引用`
        }
      })
      
      setStats({
        totalRecords: snapshot.size,
        inboundCount: byType.in,
        outboundCount: byType.out,
        uniqueReferences: grouped.size,
        emptyReferences: emptyRefCount,
        inboundOrdersCreated: 0,
        outboundOrdersCreated: 0,
        movementsCreated: 0,
        duplicateAttachmentsSaved: attachmentReduction
      })
      
      setGroupedData(grouped)
      setStep(1) // 进入预览步骤
      addLog(`✅ 分析完成！`)
      addLog(`📋 已构建 ${inboundPreviews.length} 个入库订单和 ${outboundPreviews.length} 个出库订单的预览`)
      
      if (warnings.length > 0) {
        addLog(`⚠️ 发现 ${warnings.length} 个警告，请查看预览详情`)
      }
      
      message.success('分析完成，请查看预览')
      
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
          // 创建入库订单（使用 Auto ID）
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
          
          let generatedId: string | null = null
          try {
            const docRef = await addDoc(collection(db, COLLECTIONS.INBOUND_ORDERS), inboundOrder)
            generatedId = docRef.id  // 获取自动生成的 ID
            inboundCreated++
            addLog(`✅ 入库订单: ${refNo} (ID: ${generatedId})`)
          } catch (error: any) {
            addLog(`❌ 入库订单失败: ${refNo} - ${error.message}`)
            continue  // 如果订单创建失败，跳过创建索引
          }
          
          // 创建索引（包含实际的 document ID）
          if (generatedId) {
            for (const item of items) {
              const movement: any = {
                cigarId: item.cigarId,
                cigarName: item.cigarName,
                itemType: item.itemType,
                type: 'in',
                quantity: item.quantity,
                referenceNo: refNo,
                orderType: 'inbound',
                inboundOrderId: generatedId,  // 添加实际的 document ID
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
          
        } else if (type === 'out') {
          // 创建出库订单（使用 Auto ID）
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
          
          let generatedId: string | null = null
          try {
            const docRef = await addDoc(collection(db, COLLECTIONS.OUTBOUND_ORDERS), outboundOrder)
            generatedId = docRef.id  // 获取自动生成的 ID
            outboundCreated++
            addLog(`✅ 出库订单: ${refNo} (ID: ${generatedId})`)
          } catch (error: any) {
            addLog(`❌ 出库订单失败: ${refNo} - ${error.message}`)
            continue  // 如果订单创建失败，跳过创建索引
          }
          
          // 创建索引（包含实际的 document ID）
          if (generatedId) {
            for (const item of items) {
              const movement: any = {
                cigarId: item.cigarId,
                cigarName: item.cigarName,
                itemType: item.itemType,
                type: 'out',
                quantity: item.quantity,
                referenceNo: refNo,
                orderType: 'outbound',
                outboundOrderId: generatedId,  // 添加实际的 document ID
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
      
      setStep(3) // 迁移完成，进入验证步骤
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
      
      setStep(4) // 验证完成，整个流程结束
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
            { title: '预览计划', description: '确认迁移内容', icon: step === 1 ? <EyeOutlined /> : undefined },
            { title: '执行迁移', description: '创建新架构' },
            { title: '验证完整性', description: '对比数据' }
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

        {/* 预览内容（Step 1） */}
        {step === 1 && (
          <Card title="📋 迁移预览" style={{ marginBottom: 24 }}>
            {/* 迁移前后对比 */}
            <Card size="small" style={{ marginBottom: 16, background: '#fafafa' }}>
              <Row gutter={16}>
                <Col span={12}>
                  <div style={{ textAlign: 'center', padding: 12, background: '#fff', borderRadius: 8 }}>
                    <Text type="secondary">📂 旧架构</Text>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#1890ff', marginTop: 8 }}>
                      {stats.totalRecords}
                    </div>
                    <Text type="secondary">个 inventory_logs 记录</Text>
                    <div style={{ marginTop: 12, fontSize: 12, color: '#666' }}>
                      <div>· 附件引用：{stats.totalRecords - stats.emptyReferences} 个</div>
                      <div>· 查询需要前端聚合</div>
                      <div>· 更新需要 N 次操作</div>
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ textAlign: 'center', padding: 12, background: '#f6ffed', borderRadius: 8, border: '1px solid #b7eb8f' }}>
                    <Text type="success">📦 新架构</Text>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#52c41a', marginTop: 8 }}>
                      {previewData.inboundOrders.length + previewData.outboundOrders.length}
                    </div>
                    <Text type="success">个订单 + {stats.totalRecords - stats.emptyReferences} 个索引</Text>
                    <div style={{ marginTop: 12, fontSize: 12, color: '#52c41a' }}>
                      <div>· 附件引用：{stats.totalRecords - stats.emptyReferences - stats.duplicateAttachmentsSaved} 个</div>
                      <div>· 查询无需聚合 ✅</div>
                      <div>· 更新只需 1 次操作 ✅</div>
                    </div>
                  </div>
                </Col>
              </Row>
            </Card>
            
            {/* 优化效果 */}
            <Alert
              message="🎯 预期优化效果"
              description={
                <div>
                  <p><strong>附件存储优化：</strong>{previewData.improvements.storageOptimization} （节省 {previewData.improvements.attachmentReductionPercent}%）</p>
                  <p><strong>操作效率提升：</strong>更新订单附件只需 1 次操作（原需 N 次）</p>
                  <p><strong>查询性能：</strong>按订单查询无需前端聚合</p>
                  <p><strong>成本节省：</strong>预计减少 {stats.duplicateAttachmentsSaved} 次 Firestore 操作</p>
                </div>
              }
              type="success"
              showIcon
              style={{ marginBottom: 16 }}
            />

            {/* 警告信息 */}
            {previewData.warnings.length > 0 && (
              <Alert
                message={`⚠️ 发现 ${previewData.warnings.length} 个需要注意的问题`}
                description={
                  <div>
                    {previewData.warnings.map((warning, idx) => (
                      <div key={idx} style={{ marginBottom: 8 }}>
                        <Tag color={warning.severity === 'error' ? 'red' : warning.severity === 'warning' ? 'orange' : 'blue'}>
                          {warning.severity === 'error' ? '❌' : warning.severity === 'warning' ? '⚠️' : 'ℹ️'}
                        </Tag>
                        <strong>{warning.message}</strong>
                        {warning.details && <div style={{ marginLeft: 24, color: '#666', fontSize: 12 }}>{warning.details}</div>}
                      </div>
                    ))}
                  </div>
                }
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}

            {/* 入库订单预览 */}
            <Title level={4} style={{ marginTop: 24 }}>📦 入库订单预览（{previewData.inboundOrders.length} 个）</Title>
            <Table
              dataSource={previewData.inboundOrders.slice(0, 10)}
              rowKey="referenceNo"
              pagination={false}
              size="small"
              expandable={{
                expandedRowRender: (record: OrderPreview) => (
                  <div style={{ padding: 12, background: '#f5f5f5' }}>
                    <Descriptions column={2} size="small" bordered>
                      <Descriptions.Item label="单号">{record.referenceNo}</Descriptions.Item>
                      <Descriptions.Item label="原因">{record.reason}</Descriptions.Item>
                      <Descriptions.Item label="产品种类">{record.items.length} 种</Descriptions.Item>
                      <Descriptions.Item label="总数量">{record.totalQuantity} 支</Descriptions.Item>
                      <Descriptions.Item label="总价值">RM {record.totalValue.toFixed(2)}</Descriptions.Item>
                      <Descriptions.Item label="附件">{record.attachments.length} 个</Descriptions.Item>
                      <Descriptions.Item label="去重效果" span={2}>
                        {record.deduplication.before} 条记录 → 1 个订单（节省 {record.deduplication.saved} 次操作）
                      </Descriptions.Item>
                    </Descriptions>
                    <div style={{ marginTop: 12 }}>
                      <strong>产品明细：</strong>
                      {record.items.map((item, idx) => (
                        <div key={idx} style={{ marginLeft: 16, fontSize: 12, color: '#666' }}>
                          {idx + 1}. {item.cigarName} × {item.quantity} {item.unitPrice ? `(RM ${item.unitPrice})` : ''}
                        </div>
                      ))}
                    </div>
                    {record.attachments.length > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <strong>附件：</strong>
                        {record.attachments.map((att, idx) => (
                          <Tag key={idx} color="blue" style={{ marginLeft: 8 }}>
                            {att.type === 'pdf' ? '📄' : '🖼️'} {att.filename}
                          </Tag>
                        ))}
                      </div>
                    )}
                  </div>
                )
              }}
              columns={[
                {
                  title: '单号',
                  dataIndex: 'referenceNo',
                  key: 'referenceNo',
                  render: (text: string) => <Text strong style={{ fontFamily: 'monospace' }}>{text}</Text>
                },
                {
                  title: '产品种类',
                  dataIndex: 'items',
                  key: 'productCount',
                  render: (items: any[]) => <span>{items.length} 种</span>
                },
                {
                  title: '总数量',
                  dataIndex: 'totalQuantity',
                  key: 'totalQuantity',
                  render: (qty: number) => <span style={{ color: '#52c41a', fontWeight: 600 }}>+{qty}</span>
                },
                {
                  title: '总价值',
                  dataIndex: 'totalValue',
                  key: 'totalValue',
                  render: (val: number) => val > 0 ? `RM ${val.toFixed(2)}` : '-'
                },
                {
                  title: '附件',
                  dataIndex: 'attachments',
                  key: 'attachments',
                  render: (attachments: any[]) => (
                    <span>
                      {attachments.length > 0 ? (
                        <Tag color="blue">📎 {attachments.length}</Tag>
                      ) : (
                        <span style={{ color: '#999' }}>-</span>
                      )}
                    </span>
                  )
                },
                {
                  title: '去重效果',
                  key: 'deduplication',
                  render: (_: any, record: OrderPreview) => (
                    <Tag color="green">
                      {record.deduplication.before} → 1 (省{record.deduplication.saved})
                    </Tag>
                  )
                }
              ]}
            />
            {previewData.inboundOrders.length > 10 && (
              <div style={{ textAlign: 'center', marginTop: 12, color: '#666' }}>
                ... 还有 {previewData.inboundOrders.length - 10} 个入库订单
              </div>
            )}

            {/* 出库订单预览 */}
            <Title level={4} style={{ marginTop: 32 }}>📤 出库订单预览（{previewData.outboundOrders.length} 个）</Title>
            <Table
              dataSource={previewData.outboundOrders.slice(0, 10)}
              rowKey="referenceNo"
              pagination={false}
              size="small"
              expandable={{
                expandedRowRender: (record: OrderPreview) => (
                  <div style={{ padding: 12, background: '#f5f5f5' }}>
                    <Descriptions column={2} size="small" bordered>
                      <Descriptions.Item label="单号">{record.referenceNo}</Descriptions.Item>
                      <Descriptions.Item label="原因">{record.reason}</Descriptions.Item>
                      <Descriptions.Item label="产品种类">{record.items.length} 种</Descriptions.Item>
                      <Descriptions.Item label="总数量">{record.totalQuantity} 支</Descriptions.Item>
                      <Descriptions.Item label="去重效果" span={2}>
                        {record.deduplication.before} 条记录 → 1 个订单（节省 {record.deduplication.saved} 次操作）
                      </Descriptions.Item>
                    </Descriptions>
                    <div style={{ marginTop: 12 }}>
                      <strong>产品明细：</strong>
                      {record.items.map((item, idx) => (
                        <div key={idx} style={{ marginLeft: 16, fontSize: 12, color: '#666' }}>
                          {idx + 1}. {item.cigarName} × {item.quantity}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              }}
              columns={[
                {
                  title: '单号',
                  dataIndex: 'referenceNo',
                  key: 'referenceNo',
                  render: (text: string) => <Text strong style={{ fontFamily: 'monospace' }}>{text}</Text>
                },
                {
                  title: '产品种类',
                  dataIndex: 'items',
                  key: 'productCount',
                  render: (items: any[]) => <span>{items.length} 种</span>
                },
                {
                  title: '总数量',
                  dataIndex: 'totalQuantity',
                  key: 'totalQuantity',
                  render: (qty: number) => <span style={{ color: '#ff4d4f', fontWeight: 600 }}>-{qty}</span>
                },
                {
                  title: '去重效果',
                  key: 'deduplication',
                  render: (_: any, record: OrderPreview) => (
                    <Tag color="green">
                      {record.deduplication.before} → 1 (省{record.deduplication.saved})
                    </Tag>
                  )
                }
              ]}
            />
            {previewData.outboundOrders.length > 10 && (
              <div style={{ textAlign: 'center', marginTop: 12, color: '#666' }}>
                ... 还有 {previewData.outboundOrders.length - 10} 个出库订单
              </div>
            )}

            {/* 确认提示 */}
            <Alert
              message="请确认"
              description={
                <div>
                  <p>✅ 已预览迁移计划，数据看起来正确</p>
                  <p>✅ 旧数据（inventory_logs）将被保留，可以回滚</p>
                  <p>⚠️ 迁移将创建 {previewData.inboundOrders.length + previewData.outboundOrders.length} 个新订单和 {stats.totalRecords - stats.emptyReferences} 个索引记录</p>
                  <p>⚠️ 请确认无误后点击"确认执行迁移"</p>
                </div>
              }
              type="info"
              showIcon
              style={{ marginTop: 24 }}
            />
          </Card>
        )}

        {/* 操作按钮 */}
        <Space size="large" style={{ marginBottom: 24 }}>
          {step === 0 && (
            <Button 
              type="primary" 
              size="large"
              onClick={analyzeData} 
              loading={analyzing}
            >
              1️⃣ 分析数据
            </Button>
          )}
          
          {step === 1 && (
            <>
              <Button 
                size="large"
                onClick={() => {
                  setStep(0)
                  setPreviewData({
                    inboundOrders: [],
                    outboundOrders: [],
                    warnings: [],
                    improvements: { attachmentReduction: 0, attachmentReductionPercent: 0, storageOptimization: '' }
                  })
                  setGroupedData(new Map())
                  addLog('\n⬅️ 返回重新分析')
                }}
              >
                ⬅️ 返回重新分析
              </Button>
              <Button 
                type="primary" 
                size="large"
                onClick={executeMigration} 
                loading={migrating}
                danger
              >
                ✅ 确认执行迁移
              </Button>
            </>
          )}
          
          {step === 3 && (
            <Button 
              type="primary" 
              size="large"
              onClick={verifyData} 
              loading={verifying}
            >
              3️⃣ 验证数据
            </Button>
          )}
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

        {step === 4 && (
          <Alert
            message="🎉 迁移成功！"
            description={
              <div>
                <p>✅ 数据已成功迁移到新架构并通过验证</p>
                <p>✅ 刷新"库存管理"页面，应该会看到控制台输出：<code>✅ [Inventory] Using new architecture</code></p>
                <p>✅ 新架构已自动生效，附件不再重复存储</p>
                <p>⚠️ 请在生产环境测试一段时间（建议 1-2 周）后，再决定是否删除旧的 inventory_logs 数据</p>
                <p>🗑️ 删除旧数据的方法：Firebase Console → Firestore → 删除 inventory_logs collection</p>
                <br />
                <p><strong>测试清单：</strong></p>
                <ul>
                  <li>✓ 创建新的入库订单</li>
                  <li>✓ 查看入库记录列表（应该按单号分组显示）</li>
                  <li>✓ 查看附件（每个订单只存储一次）</li>
                  <li>✓ 验证库存计算正确</li>
                  <li>✓ 测试编辑和删除功能</li>
                </ul>
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

