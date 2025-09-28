import React from 'react'
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
    <div style={{ padding: 12 }}>
      {registeredParticipants.map((uid: string, index: number) => {
        const user = participantsUsers.find(x => x.id === uid)
        const allocation = (event as any)?.allocations?.[uid]
        const cigar = cigars.find(c => c.id === allocation?.cigarId)
        
        return (
          <div 
            key={uid} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 12, 
              padding: '12px 16px',
              marginBottom: 8,
              background: '#fff',
              borderRadius: 6,
              border: '1px solid #e8e8e8',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          >
            <div style={{ minWidth: 40, textAlign: 'center', color: '#999', fontSize: 12 }}>
              #{index + 1}
            </div>
            <div style={{ minWidth: 150, flex: 1 }}>
              <div style={{ fontWeight: 500, color: '#666', marginBottom: 4 }}>
                {user ? user.displayName : t('participants.unknownUser')}
              </div>
              <div style={{ fontSize: 12, color: '#666' }}>
                {user ? ((user as any)?.profile?.phone || user.email || uid) : uid}
              </div>
            </div>
            <div style={{ minWidth: 220 }}>
              <Select
                placeholder={t('participants.selectCigarModel')}
                style={{ width: '100%' }}
                value={allocation?.cigarId}
                onChange={async (val) => {
                  const current = (event as any)?.allocations?.[uid]
                  const quantity = current?.quantity || 1
                  const amount = getCigarPriceById(val) * quantity
                  const updated = { ...(event as any).allocations, [uid]: { ...current, cigarId: val, amount } }
                  onAllocSavingChange(uid)
                  await updateDocument(COLLECTIONS.EVENTS, (event as any).id, { allocations: updated } as any)
                  onEventUpdate({ ...event, allocations: updated } as Event)
                  onAllocSavingChange(null)
                }}
                options={cigars.map(c => ({ 
                  label: `${c.name} (${c.size}) - RM${c.price}`, 
                  value: c.id 
                }))}
              />
            </div>
            <div style={{ minWidth: 100 }}>
              <InputNumber
                min={1}
                max={99}
                value={allocation?.quantity || 1}
                onChange={async (val) => {
                  const current = (event as any)?.allocations?.[uid] || {}
                  const qty = Number(val) || 1
                  const amount = getCigarPriceById(current?.cigarId) * qty
                  const updated = { ...(event as any).allocations, [uid]: { ...current, quantity: qty, amount } }
                  onAllocSavingChange(uid)
                  await updateDocument(COLLECTIONS.EVENTS, (event as any).id, { allocations: updated } as any)
                  onEventUpdate({ ...event, allocations: updated } as Event)
                  onAllocSavingChange(null)
                }}
                style={{ width: '100%' }}
                addonAfter={<span style={{ color: '#666' }}>{t('participants.pieces')}</span>}
              />
            </div>
            <div style={{ minWidth: 80, textAlign: 'right' }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#fa541c' }}>
                RM{(() => {
                  if (allocation?.amount != null) return allocation.amount
                  const qty = allocation?.quantity || 1
                  return getCigarPriceById(allocation?.cigarId) * qty
                })()}
              </div>
            </div>
            <div style={{ minWidth: 140, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
              {allocSaving === uid ? (
                <Spin size="small" />
              ) : (
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
              )}
              <Button 
                size="small" 
                danger 
                icon={<DeleteOutlined />}
                onClick={async () => {
                  Modal.confirm({
                    title: t('participants.removeParticipant'),
                    content: t('participants.confirmRemoveParticipant'),
                    okButtonProps: { danger: true },
                    onOk: async () => {
                      const res = await unregisterFromEvent((event as any).id, uid)
                      if ((res as any)?.success) {
                        message.success(t('participants.removed'))
                        // 刷新事件数据
                        const updatedParticipants = registeredParticipants.filter((id: string) => id !== uid)
                        const updatedAllocations = { ...(event as any).allocations }
                        delete updatedAllocations[uid]
                        onEventUpdate({ 
                          ...event, 
                          participants: { ...(event as any).participants, registered: updatedParticipants },
                          allocations: updatedAllocations
                        } as Event)
                      } else {
                        message.error(t('participants.removeFailed'))
                      }
                    }
                  })
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default ParticipantsList
