import React, { useMemo } from 'react'
import { Spin, Select, InputNumber, Button, Modal, message, Tag } from 'antd'
import { CheckCircleOutlined, UserOutlined, DeleteOutlined } from '@ant-design/icons'
import type { User, Cigar, Event } from '../../types'
import { updateDocument, COLLECTIONS, unregisterFromEvent } from '../../services/firebase/firestore'
import { useTranslation } from 'react-i18next'

interface ParticipantsListProps {
  event: Event | null
  participantsUsers: User[]
  cigars: Cigar[]
  participantsLoading: boolean
  allocSaving: string | null
  onEventUpdate: (event: Event) => void
  onAllocSavingChange: (uid: string | null) => void
  getCigarPriceById: (cigarId: string) => number
}

const ParticipantsList: React.FC<ParticipantsListProps> = ({
  event,
  participantsUsers,
  cigars,
  participantsLoading,
  allocSaving,
  onEventUpdate,
  onAllocSavingChange,
  getCigarPriceById
}) => {
  const { t } = useTranslation()
  
  // 产品下拉：按品牌分组，并按品牌与产品名称字母排序
  const groupedCigars = useMemo(() => {
    const brandToList = new Map<string, Cigar[]>()
    cigars.forEach((c) => {
      const brand = (c as any)?.brand || 'Unknown'
      const list = brandToList.get(brand) || []
      list.push(c)
      brandToList.set(brand, list)
    })
    const sorted = Array.from(brandToList.entries())
      .sort((a, b) => a[0].toLowerCase().localeCompare(b[0].toLowerCase()))
      .map(([brand, list]) => ({
        brand,
        list: list.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
      }))
    return sorted
  }, [cigars])
  
  if (!event) return null

  const registeredParticipants = (event as any)?.participants?.registered || []

  if (participantsLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>{t('participants.loadingParticipants')}</div>
      </div>
    )
  }

  if (registeredParticipants.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
        <UserOutlined style={{ fontSize: 48, marginBottom: 16 }} />
        <div>{t('participants.noParticipants')}</div>
      </div>
    )
  }

  return (
    <div style={{ 
      maxHeight: '400px', 
      overflowY: 'auto',
      padding: '8px',
      border: '1px solid #f0f0f0',
      borderRadius: '8px',
      background: '#fafafa'
    }}>
      <div style={{ 
        display: 'grid', 
        gap: '12px',
        padding: '8px'
      }}>
      {registeredParticipants.map((uid: string, index: number) => {
        const user = participantsUsers.find(x => x.id === uid)
        const allocation = (event as any)?.allocations?.[uid]
        const cigar = cigars.find(c => c.id === allocation?.cigarId)
        
        return (
          <div 
            key={uid} 
            style={{ 
                padding: '16px',
              background: '#fff',
                borderRadius: '8px',
              border: '1px solid #e8e8e8',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                transition: 'all 0.2s ease'
            }}
          >
            {/* 第一行：序号 + 名字和电话号码 */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 12, 
              marginBottom: 12
            }}>
              <div style={{ 
                width: 32, 
                height: 32,
                textAlign: 'center', 
                lineHeight: '32px',
                color: '#111', 
                fontSize: 12  
              }}>
                # {index + 1}
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 600, color: '#111', fontSize: 13 }}>
                  {user ? user.displayName : t('participants.unknownUser')}
                </span>
                <span style={{ fontSize: 11, color: '#999' }}>
                  {user ? ((user as any)?.profile?.phone || user.email || uid) : uid}
                </span>
                {/* 订单状态标签 + 订单ID */}
                {allocation?.orderId ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Tag color="green">{t('participants.orderCreated')}</Tag>
                    <span style={{ fontSize: 11, color: '#666' }}>ID: {allocation.orderId}</span>
                  </div>
                ) : (
                  <Tag color="orange">{t('participants.orderPending')}</Tag>
                )}
              </div>
            </div>
            {/* 第二行：活动费用（使用活动名称，可调整数量与费用，保存到 allocations） */}
            {(event as any)?.participants?.fee > 0 && (
              <div
                style={{
                  marginBottom: 8,
                  padding: '8px',
                  background: '#fafafa',
                  border: '1px dashed #e8e8e8',
                  borderRadius: 6,
              display: 'flex', 
              alignItems: 'center', 
              gap: 8 
                }}
              >
                {/* 名称：活动名称（与雪茄分配列宽一致） */}
                <div style={{ width: 210, flexShrink: 0, color: '#666', fontSize: 12, fontWeight: 600 }}>
                  {(event as any)?.title || t('events.fee')}
                </div>
                {/* 数量可调，默认 1 */}
                <div style={{ width: 120, flexShrink: 0 }}>
                  <InputNumber
                    min={1}
                    max={99}
                    size="small"
                    value={(allocation as any)?.feeQuantity || 1}
                    onChange={async (val) => {
                      const qty = Number(val) || 1
                      const unitPrice = (allocation as any)?.feeUnitPrice != null
                        ? Number((allocation as any)?.feeUnitPrice)
                        : Number((event as any)?.participants?.fee || 0)
                      const feeAmount = unitPrice * qty
                      const current = (event as any)?.allocations?.[uid] || {}
                      const updated = { ...(event as any).allocations, [uid]: { ...current, feeQuantity: qty, feeUnitPrice: unitPrice, feeAmount } }
                      onAllocSavingChange(uid)
                      await updateDocument(COLLECTIONS.EVENTS, (event as any).id, { allocations: updated } as any)
                      onEventUpdate({ ...event, allocations: updated } as Event)
                      onAllocSavingChange(null)
                    }}
                    style={{ width: '100%' }}
                    addonAfter={<span style={{ color: '#666', fontSize: 11 }}>{t('participants.pieces')}</span>}
                  />
                </div>
                {/* 费用可调，默认活动 fee */}
                <div style={{ width: 130, flexShrink: 0 }}>
                  <InputNumber
                    min={0}
                    step={0.01}
                    precision={2}
                    size="small"
                    value={(() => {
                      if ((allocation as any)?.feeUnitPrice != null) return Number((allocation as any)?.feeUnitPrice)
                      return Number((event as any)?.participants?.fee || 0)
                    })()}
                    onChange={async (val) => {
                      const unitPrice = Number(val) || 0
                      const qty = (allocation as any)?.feeQuantity || 1
                      const feeAmount = unitPrice * qty
                      const current = (event as any)?.allocations?.[uid] || {}
                      const updated = { ...(event as any).allocations, [uid]: { ...current, feeUnitPrice: unitPrice, feeQuantity: qty, feeAmount } }
                      onAllocSavingChange(uid)
                      await updateDocument(COLLECTIONS.EVENTS, (event as any).id, { allocations: updated } as any)
                      onEventUpdate({ ...event, allocations: updated } as Event)
                      onAllocSavingChange(null)
                    }}
                    style={{ width: '100%' }}
                    addonBefore="RM"
                    placeholder="0.00"
                  />
                </div>
                {/* 末尾占位，保持与删除按钮列对齐 */}
                <div style={{ width: 36, flexShrink: 0 }} />
              </div>
            )}

            {/* 第二行：产品选择 + 数量 + 价钱 + 删除按键（支持多行） */}
            {(() => {
              const items = (allocation as any)?.items as any[] | undefined
              const ensureItemsInit = async () => {
                // 将旧的单一字段迁移为 items 数组
                const current = (event as any)?.allocations?.[uid] || {}
                const baseItem = (current?.cigarId) ? [{
                  cigarId: current.cigarId,
                  quantity: current.quantity || 1,
                  unitPrice: current.unitPrice != null ? current.unitPrice : getCigarPriceById(current.cigarId),
                  amount: (current.unitPrice != null ? current.unitPrice : getCigarPriceById(current.cigarId)) * (current.quantity || 1)
                }] : []
                const updated = { ...(event as any).allocations, [uid]: { ...current, items: baseItem } }
                onAllocSavingChange(uid)
                await updateDocument(COLLECTIONS.EVENTS, (event as any).id, { allocations: updated } as any)
                onEventUpdate({ ...event, allocations: updated } as Event)
                onAllocSavingChange(null)
              }

              const renderRow = (row: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 220, flexShrink: 0 }}>
                <Select
                  placeholder={t('participants.selectCigarModel')}
                  style={{ width: '100%' }}
                      value={row?.cigarId}
                  showSearch
                  optionFilterProp="children"
                  size="small"
                  onChange={async (val) => {
                        const unitPrice = getCigarPriceById(val)
                        const qty = row?.quantity || 1
                        const amount = unitPrice * qty
                    const current = (event as any)?.allocations?.[uid] || {}
                        const nextItems = [...((current?.items as any[]) || [])]
                        nextItems[idx] = { ...(nextItems[idx] || {}), cigarId: val, quantity: qty, unitPrice, amount }
                        const updated = { ...(event as any).allocations, [uid]: { ...current, items: nextItems } }
                    onAllocSavingChange(uid)
                    await updateDocument(COLLECTIONS.EVENTS, (event as any).id, { allocations: updated } as any)
                    onEventUpdate({ ...event, allocations: updated } as Event)
                    onAllocSavingChange(null)
                  }}
                  filterOption={(input, option) => {
                    const kw = (input || '').toLowerCase()
                    const text = String((option?.children as any) || '').toLowerCase()
                    return text.includes(kw)
                  }}
                >
                  {groupedCigars.map(group => (
                    <Select.OptGroup key={group.brand} label={group.brand}>
                      {group.list.map(c => (
                        <Select.Option key={c.id} value={c.id}>{c.name} - RM{c.price}</Select.Option>
                      ))}
                    </Select.OptGroup>
                  ))}
                </Select>
              </div>
                  <div style={{ width: 120 , flexShrink: 0 }}>
                <InputNumber
                  min={1}
                  max={99}
                      value={row?.quantity || 1}
                  size="small"
                  onChange={async (val) => {
                        const qty = Number(val) || 1
                        const unitPrice = row?.unitPrice != null ? row.unitPrice : getCigarPriceById(row?.cigarId)
                        const amount = unitPrice * qty
                    const current = (event as any)?.allocations?.[uid] || {}
                        const nextItems = [...((current?.items as any[]) || [])]
                        nextItems[idx] = { ...(nextItems[idx] || {}), quantity: qty, unitPrice, amount }
                        const updated = { ...(event as any).allocations, [uid]: { ...current, items: nextItems } }
                    onAllocSavingChange(uid)
                    await updateDocument(COLLECTIONS.EVENTS, (event as any).id, { allocations: updated } as any)
                    onEventUpdate({ ...event, allocations: updated } as Event)
                    onAllocSavingChange(null)
                  }}
                  style={{ width: '100%' }}
                  addonAfter={<span style={{ color: '#666', fontSize: 11 }}>{t('participants.pieces')}</span>}
                />
              </div>
              <div style={{ width: 130, flexShrink: 0 }}>
                <InputNumber
                  min={0}
                  step={0.01}
                  precision={2}
                  size="small"
                  value={(() => {
                        if (row?.unitPrice != null) return row.unitPrice
                        return getCigarPriceById(row?.cigarId)
                  })()}
                  onChange={async (val) => {
                        const unitPrice = Number(val) || 0
                        const qty = row?.quantity || 1
                        const amount = unitPrice * qty
                    const current = (event as any)?.allocations?.[uid] || {}
                        const nextItems = [...((current?.items as any[]) || [])]
                        nextItems[idx] = { ...(nextItems[idx] || {}), unitPrice, quantity: qty, amount }
                        const updated = { ...(event as any).allocations, [uid]: { ...current, items: nextItems } }
                    onAllocSavingChange(uid)
                    await updateDocument(COLLECTIONS.EVENTS, (event as any).id, { allocations: updated } as any)
                    onEventUpdate({ ...event, allocations: updated } as Event)
                    onAllocSavingChange(null)
                  }}
                  style={{ width: '100%' }}
                  addonBefore="RM"
                  placeholder="0.00"
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, flexShrink: 0 }}>
                <Button 
                  size="small" 
                  danger 
                  icon={<DeleteOutlined />}
                  style={{ minWidth: 24, height: 24, padding: '0 4px' }}
                  onClick={async () => {
                        const current = (event as any)?.allocations?.[uid] || {}
                        const nextItems = [...((current?.items as any[]) || [])]
                        nextItems.splice(idx, 1)
                        const updated = { ...(event as any).allocations, [uid]: { ...current, items: nextItems } }
                        onAllocSavingChange(uid)
                        await updateDocument(COLLECTIONS.EVENTS, (event as any).id, { allocations: updated } as any)
                        onEventUpdate({ ...event, allocations: updated } as Event)
                        onAllocSavingChange(null)
                  }}
                />
              </div>
            </div>
              )

              if (items && items.length > 0) {
                return (
                  <div>
                    {items.map((row, idx) => renderRow(row, idx))}
                    <div>
                      <Button size="small" onClick={async () => {
                        const current = (event as any)?.allocations?.[uid] || {}
                        const nextItems = [...((current?.items as any[]) || []), { cigarId: undefined, quantity: 1, unitPrice: 0, amount: 0 }]
                        const updated = { ...(event as any).allocations, [uid]: { ...current, items: nextItems } }
                        onAllocSavingChange(uid)
                        await updateDocument(COLLECTIONS.EVENTS, (event as any).id, { allocations: updated } as any)
                        onEventUpdate({ ...event, allocations: updated } as Event)
                        onAllocSavingChange(null)
                      }}>{t('common.add')}</Button>
                    </div>
                  </div>
                )
              }

              // 未初始化 items，显示旧的单行且提供迁移按钮
              return (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ color: '#999', fontSize: 12 }}>{t('participants.orderPending')}</div>
                  <Button size="small" onClick={ensureItemsInit}>{t('common.add')}</Button>
                </div>
              )
            })()}

            
          </div>
        )
      })}
      </div>
    </div>
  )
}

export default ParticipantsList
