import React from 'react'
import { SearchOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'

interface StatusFilterDropdownProps {
  setSelectedKeys: (keys: React.Key[]) => void
  selectedKeys: React.Key[]
  confirm: (options?: { closeDropdown?: boolean }) => void
  clearFilters?: () => void
}

const StatusFilterDropdown: React.FC<StatusFilterDropdownProps> = ({
  setSelectedKeys,
  selectedKeys,
  confirm,
  clearFilters
}) => {
  const { t } = useTranslation()

  const statusOptions = [
    { key: undefined, label: t('common.all') },
    { key: 'draft', label: t('events.draft') },
    { key: 'published', label: t('events.published') },
    { key: 'ongoing', label: t('events.ongoing') },
    { key: 'completed', label: t('events.completed') },
    { key: 'cancelled', label: t('events.cancelled') }
  ]

  return (
    <div style={{ padding: 8 }} onClick={(e) => e.stopPropagation()}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 140 }}>
        {statusOptions.map((option) => (
          <button 
            key={option.key || 'all'}
            style={{ 
              padding: '4px 8px', 
              borderRadius: 4, 
              fontSize: 12, 
              cursor: 'pointer', 
              transition: 'all 0.2s ease',
              ...(selectedKeys[0] === option.key ? 
                { background: 'linear-gradient(to right,#FDE08D,#C48D3A)', color: '#111', fontWeight: 600 } : 
                { background: 'transparent', color: '#666' }
              )
            }} 
            onClick={() => { 
              if (option.key === undefined) {
                setSelectedKeys([])
                clearFilters?.()
              } else {
                setSelectedKeys([option.key])
              }
              confirm({ closeDropdown: true }) 
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default StatusFilterDropdown
