import React from 'react'
import { Skeleton, Card, Space, Divider } from 'antd'

export const OrderSkeleton: React.FC<{ isMobile?: boolean }> = ({ isMobile }) => {
  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[1, 2, 3].map((i) => (
          <div 
            key={i} 
            style={{ 
              border: '1px solid rgba(255,255,255,0.1)', 
              borderRadius: 16, 
              background: 'rgba(255,255,255,0.05)',
              padding: 16
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <Skeleton.Button active size="small" style={{ width: 100 }} />
              <Skeleton.Button active size="small" style={{ width: 60 }} />
            </div>
            <Skeleton active paragraph={{ rows: 2 }} title={false} />
            <Divider style={{ margin: '12px 0', borderColor: 'rgba(255,255,255,0.1)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Skeleton.Button active size="small" style={{ width: 80 }} />
              <Skeleton.Button active size="small" style={{ width: 80 }} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="points-config-form">
      <Skeleton active paragraph={{ rows: 10 }} />
    </div>
  )
}

export const StatsSkeleton: React.FC = () => {
  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: 24, overflowX: 'auto', paddingBottom: 8 }}>
      {[1, 2, 3, 4].map((i) => (
        <div 
          key={i} 
          style={{ 
            minWidth: 140, 
            flex: 1, 
            padding: 16, 
            background: 'rgba(255,255,255,0.05)', 
            borderRadius: 12, 
            border: '1px solid rgba(255,255,255,0.1)' 
          }}
        >
          <Skeleton active paragraph={{ rows: 1 }} title={{ width: '40%' }} />
        </div>
      ))}
    </div>
  )
}
