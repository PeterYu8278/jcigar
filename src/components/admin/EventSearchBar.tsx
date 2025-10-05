import React from 'react'
import { Input, DatePicker, Space } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'

const { Search } = Input

interface EventSearchBarProps {
  keyword: string
  onKeywordChange: (keyword: string) => void
  statusFilter?: string
  onStatusFilterChange: (status: string | undefined) => void
  onReset: () => void
  isMobile?: boolean
}

const EventSearchBar: React.FC<EventSearchBarProps> = ({
  keyword,
  onKeywordChange,
  statusFilter,
  onStatusFilterChange,
  onReset,
  isMobile = false
}) => {
  const { t } = useTranslation()

  if (isMobile) {
    return (
      <div style={{ padding: '0 4px', marginBottom: 12 }}>
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <Search
            placeholder={t('common.searchPlaceholder')}
            allowClear
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          <button 
            onClick={() => onStatusFilterChange(undefined)}
            style={statusFilter === undefined ? 
              { padding: '6px 12px', borderRadius: 6, background: 'linear-gradient(to right,#FDE08D,#C48D3A)', color: '#221c10', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease' } : 
              { padding: '6px 12px', borderRadius: 6, background: 'rgba(255,255,255,0.1)', color: '#ccc', cursor: 'pointer', transition: 'all 0.2s ease' }
            }
          >
            {t('common.all')}
          </button>
          <button 
            onClick={() => onStatusFilterChange('published')}
            style={statusFilter === 'published' ? 
              { padding: '6px 12px', borderRadius: 6, background: 'linear-gradient(to right,#FDE08D,#C48D3A)', color: '#221c10', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease' } : 
              { padding: '6px 12px', borderRadius: 6, background: 'rgba(255,255,255,0.1)', color: '#ccc', cursor: 'pointer', transition: 'all 0.2s ease' }
            }
          >
            {t('events.upcoming')}
          </button>
          <button 
            onClick={() => onStatusFilterChange('ongoing')}
            style={statusFilter === 'ongoing' ? 
              { padding: '6px 12px', borderRadius: 6, background: 'linear-gradient(to right,#FDE08D,#C48D3A)', color: '#221c10', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease' } : 
              { padding: '6px 12px', borderRadius: 6, background: 'rgba(255,255,255,0.1)', color: '#ccc', cursor: 'pointer', transition: 'all 0.2s ease' }
            }
          >
            {t('events.ongoing')}
          </button>
          <button 
            onClick={() => onStatusFilterChange('completed')}
            style={statusFilter === 'completed' ? 
              { padding: '6px 12px', borderRadius: 6, background: 'linear-gradient(to right,#FDE08D,#C48D3A)', color: '#221c10', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease' } : 
              { padding: '6px 12px', borderRadius: 6, background: 'rgba(255,255,255,0.1)', color: '#ccc', cursor: 'pointer', transition: 'all 0.2s ease' }
            }
          >
            {t('events.completed')}
          </button>
          <button 
            onClick={() => onStatusFilterChange('draft')}
            style={statusFilter === 'draft' ? 
              { padding: '6px 12px', borderRadius: 6, background: 'linear-gradient(to right,#FDE08D,#C48D3A)', color: '#221c10', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease' } : 
              { padding: '6px 12px', borderRadius: 6, background: 'rgba(255,255,255,0.1)', color: '#ccc', cursor: 'pointer', transition: 'all 0.2s ease' }
            }
          >
            {t('events.draft')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ marginBottom: 16, padding: '16px', background: '#fafafa', borderRadius: '6px' }}>
      <Space size="middle" wrap>
        <Search
          placeholder={t('events.searchByNameOrOrganizer')}
          allowClear
          style={{ width: 300 }}
          prefix={<SearchOutlined />}
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
        />
        <DatePicker placeholder={t('events.startDate')} />
        <DatePicker placeholder={t('events.endDate')} />
        <button 
          onClick={onReset} 
          style={{ padding: '8px 16px', borderRadius: 8, background: '#fff', color: '#000', cursor: 'pointer', transition: 'all 0.2s ease' }}
        >
          {t('common.resetFilters')}
        </button>
      </Space>
    </div>
  )
}

export default EventSearchBar
