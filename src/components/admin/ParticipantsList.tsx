import React, { useMemo } from 'react'
import { Spin, Select, InputNumber, Button, Modal, message } from 'antd'
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
    <div style={{ padding: 8 }}>
      {registeredParticipants.map((uid: string, index: number) => {
        const user = participantsUsers.find(x => x.id === uid)
        const allocation = (event as any)?.allocations?.[uid]
        const cigar = cigars.find(c => c.id === allocation?.cigarId)
        
        return (
          <div 
            key={uid} 
            style={{ 
              padding: '8px 8px',
              marginBottom: 6,
              background: '#fff',
              borderRadius: 6,
              border: '1px solid #e8e8e8',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          >
            {/* 第一行：序号 + 名字和电话号码 */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8, 
              marginBottom: 8
            }}>
              <div style={{ width: 40, textAlign: 'center', color: '#999', fontSize: 11 }}>
                #{index + 1}
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 500, color: '#666', fontSize: 13 }}>
                  {user ? user.displayName : t('participants.unknownUser')}
                </span>
                <span style={{ fontSize: 11, color: '#999' }}>
                  {user ? ((user as any)?.profile?.phone || user.email || uid) : uid}
                </span>
              </div>
            </div>
            
            {/* 第二行：产品选择 + 数量 + 价钱 + 删除按键 */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8 
            }}>
              <div style={{ width: 300, flexShrink: 0 }}>
                <Select
                  placeholder={t('participants.selectCigarModel')}
                  style={{ width: '100%' }}
                  value={allocation?.cigarId}
                  showSearch
                  optionFilterProp="children"
                  size="small"
                  onChange={async (val) => {
                    const current = (event as any)?.allocations?.[uid] || {}
                    const quantity = current?.quantity || 1
                    const unitPrice = getCigarPriceById(val)
                    const totalAmount = unitPrice * quantity
                    const updated = { ...(event as any).allocations, [uid]: { ...current, cigarId: val, unitPrice, amount: totalAmount } }
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
              <div style={{ width: 80, flexShrink: 0 }}>
                <InputNumber
                  min={1}
                  max={99}
                  value={allocation?.quantity || 1}
                  size="small"
                  onChange={async (val) => {
                    const current = (event as any)?.allocations?.[uid] || {}
                    const qty = Number(val) || 1
                    const unitPrice = current?.unitPrice != null ? current.unitPrice : getCigarPriceById(current?.cigarId)
                    const totalAmount = unitPrice * qty
                    const updated = { ...(event as any).allocations, [uid]: { ...current, quantity: qty, amount: totalAmount } }
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
                    if (allocation?.unitPrice != null) return allocation.unitPrice
                    return getCigarPriceById(allocation?.cigarId)
                  })()}
                  onChange={async (val) => {
                    const current = (event as any)?.allocations?.[uid] || {}
                    const unitPrice = Number(val) || 0
                    const quantity = current?.quantity || 1
                    const totalAmount = unitPrice * quantity
                    const updated = { ...(event as any).allocations, [uid]: { ...current, amount: totalAmount, unitPrice } }
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
                    console.log('Delete button clicked for user:', uid)
                    console.log('Current event:', event)
                    console.log('Current participants:', registeredParticipants)
                    
                    // 先测试简单的确认对话框
                    const confirmed = window.confirm(`确定要删除参与者 ${uid} 吗？`)
                    console.log('Window confirm result:', confirmed)
                    
                    if (confirmed) {
                      console.log('User confirmed deletion, starting delete process for user:', uid)
                      try {
                        // 立即从本地状态中移除参与者
                        const updatedParticipants = registeredParticipants.filter((id: string) => id !== uid)
                        const updatedAllocations = { ...(event as any).allocations }
                        delete updatedAllocations[uid]
                        
                        console.log('Updated participants:', updatedParticipants)
                        console.log('Updated allocations:', updatedAllocations)
                        
                        // 创建更新后的事件对象
                        const updatedEvent = { 
                          ...event, 
                          participants: { ...(event as any).participants, registered: updatedParticipants },
                          allocations: updatedAllocations
                        } as Event
                        
                        console.log('Calling onEventUpdate with:', updatedEvent)
                        
                        // 立即更新UI状态
                        onEventUpdate(updatedEvent)
                        
                        // 显示成功消息
                        message.success(t('participants.removed'))
                        
                        // 异步更新数据库（不阻塞UI）
                        try {
                          const res = await unregisterFromEvent((event as any).id, uid)
                          if (!(res as any)?.success) {
                            console.warn('Database sync failed, but UI already updated:', (res as any)?.error)
                            // 可以选择显示一个警告，但不回滚UI状态
                            message.warning('参与者已从界面移除，但数据库同步失败')
                          }
                        } catch (dbError) {
                          console.warn('Database sync error:', dbError)
                          message.warning('参与者已从界面移除，但数据库同步失败')
                        }
                      } catch (error) {
                        console.error('Error in delete process:', error)
                        message.error(t('participants.removeFailed') + ': ' + (error as Error).message)
                      }
                    } else {
                      console.log('User cancelled deletion for user:', uid)
                    }
                  }}
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default ParticipantsList
