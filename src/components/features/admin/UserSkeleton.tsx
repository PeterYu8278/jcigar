import React from 'react'
import { Card, Skeleton, Space } from 'antd'

export const UserSkeleton: React.FC = () => {
  return (
    <Card
      size="small"
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        marginBottom: 12,
        borderRadius: 12
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Skeleton.Avatar active size={40} shape="circle" />
        <div style={{ flex: 1 }}>
          <Skeleton
            active
            paragraph={{ rows: 1, width: '60%' }}
            title={{ width: '40%' }}
          />
        </div>
      </div>
    </Card>
  )
}

export const UserSkeletonList: React.FC<{ count?: number }> = ({ count = 5 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <UserSkeleton key={i} />
      ))}
    </>
  )
}
