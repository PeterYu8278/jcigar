import React, { useState } from 'react'
import { Space, Select, Button, Upload, message } from 'antd'
import { CheckCircleOutlined, DownloadOutlined, UploadOutlined } from '@ant-design/icons'
import type { Event, User, Cigar } from '../../types'
import ParticipantsList from './ParticipantsList'
import ParticipantsSummary from './ParticipantsSummary'
import { registerForEvent, createOrdersFromEventAllocations, updateDocument, COLLECTIONS, getEvents } from '../../services/firebase/firestore'
import { useTranslation } from 'react-i18next'

const { Option } = Select

interface EventParticipantsManagerProps {
  event: Event
  participantsUsers: User[]
  cigars: Cigar[]
  onEventUpdate: (event: Event) => void
  getCigarPriceById: (id: string) => number
}

const EventParticipantsManager: React.FC<EventParticipantsManagerProps> = ({
  event,
  participantsUsers,
  cigars,
  onEventUpdate,
  getCigarPriceById
}) => {
  const { t } = useTranslation()
  const [manualAddValue, setManualAddValue] = useState<string>('')
  const [manualAddLoading, setManualAddLoading] = useState(false)
  const [participantsLoading, setParticipantsLoading] = useState(false)
  const [allocSaving, setAllocSaving] = useState<string | null>(null)

  const handleAddParticipant = async () => {
    if (!event) return
    const raw = manualAddValue.trim()
    if (!raw) return
    setManualAddLoading(true)
    try {
      let userId = raw
      const byId = participantsUsers.find(u => u.id === raw)
      if (!byId) {
        if (raw.includes('@')) {
          const match = participantsUsers.find(u => u.email?.toLowerCase() === raw.toLowerCase())
          if (!match) { message.error(t('common.userNotFound')); return }
          userId = match.id
        } else if (/^\+?\d[\d\s-]{5,}$/.test(raw)) {
          const match = participantsUsers.find(u => ((u as any)?.profile?.phone || '').replace(/\s|-/g,'') === raw.replace(/\s|-/g,''))
          if (!match) { message.error(t('common.userNotFound')); return }
          userId = match.id
        } else {
          const matches = participantsUsers.filter(u => (u.displayName || '').toLowerCase().includes(raw.toLowerCase()))
          if (matches.length === 1) userId = matches[0].id
          else { message.info(t('common.pleaseSelectUniqueUser')); return }
        }
      }
      const res = await registerForEvent((event as any).id, userId)
      if ((res as any)?.success) {
        message.success(t('common.participantAdded'))
        const list = await getEvents()
        const next = list.find((e: any) => e.id === (event as any).id) as any
        onEventUpdate(next)
        setManualAddValue('')
      } else {
        message.error(t('common.addFailed'))
      }
    } finally {
      setManualAddLoading(false)
    }
  }

  const handleCreateOrders = async () => {
    if (!event) return
    const orderResult = await createOrdersFromEventAllocations((event as any).id);
    if (orderResult.success) {
      if (orderResult.createdOrders > 0) {
        message.success(`${t('common.ordersCreated')} ${orderResult.createdOrders} ${t('common.forEvent')}`);
      } else {
        message.info(t('common.noParticipantsAssignedCigars'));
      }
    } else {
      message.error(t('common.createOrdersFailed') + (orderResult.error?.message || t('common.unknownError')));
    }
  }

  const handleExportAllocations = () => {
    if (!event) return
    const header = ['userId','displayName','phone','email','cigarName','quantity','amount']
    const rows = (((event as any)?.participants?.registered || []) as string[]).map((id) => {
      const u = participantsUsers.find(x => x.id === id)
      const alloc = (event as any)?.allocations?.[id]
      const cigar = cigars.find(c => c.id === alloc?.cigarId)
      return [
        id, 
        u?.displayName || '', 
        (u as any)?.profile?.phone || '',
        u?.email || '',
        cigar?.name || '',
        alloc?.quantity || 0,
        alloc?.amount || 0
      ]
    })
    const csv = [header.join(','), ...rows.map(r => r.map(x => `"${String(x ?? '').replace(/"/g,'""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `participants-${(event as any)?.title || 'event'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportParticipants = async (file: File) => {
    if (!event) return false
    const text = await file.text()
    const lines = text.split(/\r?\n/).filter(Boolean)
    const ids = lines.slice(1).map(l => l.split(',')[0].replace(/(^\"|\"$)/g,'')).filter(Boolean)
    const uniq = Array.from(new Set(ids))
    const merged = Array.from(new Set([...(event as any)?.participants?.registered || [], ...uniq]))
    await updateDocument(COLLECTIONS.EVENTS, (event as any).id, { 'participants.registered': merged } as any)
    message.success(`${t('common.imported')} ${uniq.length} ${t('common.items')}`)
    const list = await getEvents()
    const next = list.find((e: any) => e.id === (event as any).id) as any
    onEventUpdate(next)
    return false
  }

  return (
    <div>
      <div style={{ marginBottom: 12, color: '#666' }}>
        {t('common.registered')}: {((event as any)?.participants?.registered || []).length} / {(event as any)?.participants?.maxParticipants || 0}
      </div>
      
      <div style={{ marginBottom: 16 }}>
        <Space.Compact style={{ width: '100%' }}>
          <Select
            showSearch
            allowClear
            placeholder={t('common.pleaseInputNameEmailPhoneOrUserId')}
            style={{ width: '100%' }}
            value={manualAddValue || undefined}
            onSearch={(val) => setManualAddValue(val)}
            onChange={(val) => setManualAddValue(val || '')}
            onSelect={(val) => setManualAddValue(String(val))}
            filterOption={(input, option) => {
              const keyword = (input || '').toLowerCase()
              const searchable = String((option as any)?.searchText || '').toLowerCase()
              return searchable.includes(keyword)
            }}
            notFoundContent={manualAddValue && manualAddValue.trim() !== '' ? t('common.noMatch') : t('common.noData')}
            options={(manualAddValue && manualAddValue.trim() !== '' ? participantsUsers : []).map(u => {
              const isRegistered = ((event as any)?.participants?.registered || []).includes(u.id)
              return {
                value: u.id,
                searchText: `${u.displayName || ''} ${(u as any)?.profile?.phone || ''} ${u.email || ''} ${u.id}`.trim(),
                label: (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ flex: 1, textAlign: 'left' }}>{u.displayName || t('common.unnamed')}</span>
                    <span style={{ flex: 2, textAlign: 'left', color: '#999', fontSize: '12px' }}>
                      {(u as any)?.profile?.phone || t('common.noPhone')}
                    </span>
                    <span style={{ flex: 6, textAlign: 'left', color: '#999', fontSize: '12px' }}>
                      {u.email || t('common.noEmail')}
                    </span>
                    {isRegistered && (
                      <CheckCircleOutlined style={{ color: '#52c41a', marginLeft: 8 }} />
                    )}
                  </div>
                )
              }
            })}
          />
          <button 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8, 
              padding: '8px 16px', 
              borderRadius: 8, 
              background: 'linear-gradient(to right,#FDE08D,#C48D3A)', 
              color: '#111', 
              fontWeight: 600, 
              cursor: 'pointer', 
              transition: 'all 0.2s ease', 
              opacity: manualAddLoading ? 0.6 : 1 
            }}
            disabled={manualAddLoading}
            onClick={handleAddParticipant}
          >
            {manualAddLoading ? '...' : t('common.add')}
          </button>
        </Space.Compact>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Space>
          <button 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8, 
              padding: '8px 16px', 
              borderRadius: 8, 
              background: 'linear-gradient(to right,#FDE08D,#C48D3A)', 
              color: '#111', 
              fontWeight: 600, 
              cursor: 'pointer', 
              transition: 'all 0.2s ease' 
            }}
            onClick={handleCreateOrders}
          >
            <CheckCircleOutlined />
            {t('common.createOrders')}
          </button>
          <button 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8, 
              padding: '8px 16px', 
              borderRadius: 8, 
              background: 'rgba(255,255,255,0.1)', 
              color: '#ccc', 
              cursor: 'pointer', 
              transition: 'all 0.2s ease' 
            }}
            onClick={handleExportAllocations}
          >
            <DownloadOutlined />
            {t('common.exportAllocations')}
          </button>
          <Upload
            accept=".csv"
            beforeUpload={handleImportParticipants}
            showUploadList={false}
          >
            <button style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8, 
              padding: '8px 16px', 
              borderRadius: 8, 
              background: 'rgba(255,255,255,0.1)', 
              color: '#ccc', 
              cursor: 'pointer', 
              transition: 'all 0.2s ease' 
            }}>
              <UploadOutlined />
              {t('common.importParticipants')}
            </button>
          </Upload>
        </Space>
      </div>

      {/* 左右并排布局 */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        {/* 左侧：参与者列表 */}
        <div style={{ flex: 1 }}>
          <div style={{ 
            maxHeight: 400, 
            width: '600px',
            overflow: 'none', 
            border: '1px solid #f0f0f0', 
            borderRadius: 6,
            background: '#fafafa'
          }}>
            <ParticipantsList
              event={event}
              participantsUsers={participantsUsers}
              cigars={cigars}
              participantsLoading={participantsLoading}
              allocSaving={allocSaving}
              onEventUpdate={onEventUpdate}
              onAllocSavingChange={setAllocSaving}
              getCigarPriceById={getCigarPriceById}
            />
          </div>
        </div>
        
        {/* 右侧：产品类别统计 */}
        <div style={{ flex: 1 }}>
          <ParticipantsSummary
            event={event}
            getCigarPriceById={getCigarPriceById}
            cigars={cigars}
          />
        </div>
      </div>
    </div>
  )
}

export default EventParticipantsManager
