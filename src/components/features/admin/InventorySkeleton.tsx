import React from 'react'
import { Skeleton, Card, Space } from 'antd'

export const InventorySkeleton: React.FC<{ isMobile?: boolean }> = ({ isMobile }) => {
  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 0' }}>
        {[1, 2, 3].map((i) => (
          <div 
            key={i} 
            style={{ 
              border: '1px solid rgba(244,175,37,0.2)', 
              borderRadius: 16, 
              overflow: 'hidden', 
              background: 'rgba(0,0,0,0.2)',
              padding: 12
            }}
          >
            <div style={{ display: 'flex', gap: 12 }}>
              <Skeleton.Button active style={{ width: 60, height: 80, borderRadius: 10 }} />
              <div style={{ flex: 1 }}>
                <Skeleton active paragraph={{ rows: 2 }} title={false} />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {[1, 2].map((i) => (
        <div key={i} style={{ border: '1px solid rgba(244,175,37,0.2)', borderRadius: 12, overflow: 'hidden' }}>
          <Skeleton.Button active style={{ width: '100%', height: 40 }} />
          <div style={{ padding: 12 }}>
            <Skeleton active paragraph={{ rows: 5 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export const InventoryLogSkeleton: React.FC<{ isMobile?: boolean }> = ({ isMobile }) => {
  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[1, 2, 3, 4].map((i) => (
          <div 
            key={i} 
            style={{ 
              borderRadius: 12, 
              border: '1px solid rgba(255,255,255,0.1)', 
              background: 'rgba(255,255,255,0.05)', 
              padding: 12 
            }}
          >
            <Skeleton active paragraph={{ rows: 1 }} title={{ width: '60%' }} />
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
