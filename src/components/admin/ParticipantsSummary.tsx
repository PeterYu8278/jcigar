import React, { useMemo } from 'react'
import type { Event, Cigar } from '../../types'
import { useTranslation } from 'react-i18next'

interface ParticipantsSummaryProps {
  event: Event | null
  getCigarPriceById: (cigarId: string) => number
  cigars?: Cigar[]
}

const ParticipantsSummary: React.FC<ParticipantsSummaryProps> = ({
  event,
  getCigarPriceById,
  cigars = []
}) => {
  const { t } = useTranslation()
  
  // 计算产品类别统计 - 必须在所有条件检查之前调用useMemo
  const categoryStats = useMemo(() => {
    if (!event) return []
    
    const registeredParticipants = (event as any)?.participants?.registered || []
    if (registeredParticipants.length === 0) return []
    const stats: Record<string, { 
      count: number; 
      totalQuantity: number; 
      totalAmount: number;
      products: Record<string, { count: number; totalQuantity: number; totalAmount: number }>
    }> = {}
    
    registeredParticipants.forEach((uid: string) => {
      const allocation = (event as any)?.allocations?.[uid]
      if (!allocation?.cigarId) return
      
      const cigar = cigars.find(c => c.id === allocation.cigarId)
      const category = cigar?.brand || 'Unknown'
      const productName = cigar?.name || 'Unknown Product'
      const quantity = allocation?.quantity || 1
      const amount = allocation?.amount != null ? allocation.amount : getCigarPriceById(allocation.cigarId) * quantity
      
      if (!stats[category]) {
        stats[category] = { 
          count: 0, 
          totalQuantity: 0, 
          totalAmount: 0,
          products: {}
        }
      }
      
      if (!stats[category].products[productName]) {
        stats[category].products[productName] = { count: 0, totalQuantity: 0, totalAmount: 0 }
      }
      
      stats[category].count += 1
      stats[category].totalQuantity += quantity
      stats[category].totalAmount += amount
      
      stats[category].products[productName].count += 1
      stats[category].products[productName].totalQuantity += quantity
      stats[category].products[productName].totalAmount += amount
    })
    
    return Object.entries(stats).sort((a, b) => b[1].totalAmount - a[1].totalAmount)
  }, [event, cigars, getCigarPriceById])

  // 计算总金额
  const totalAmount = useMemo(() => {
    if (!event) return 0
    
    const registeredParticipants = (event as any)?.participants?.registered || []
    return registeredParticipants.reduce((sum: number, uid: string) => {
      const allocation = (event as any)?.allocations?.[uid]
      if (allocation?.amount != null) return sum + allocation.amount
      const qty = allocation?.quantity || 1
      return sum + (getCigarPriceById(allocation?.cigarId) * qty)
    }, 0)
  }, [event, getCigarPriceById])

  // 条件渲染 - 在所有Hooks调用之后
  if (!event) return null
  
  const registeredParticipants = (event as any)?.participants?.registered || []
  if (registeredParticipants.length === 0) return null

  return (
    <div style={{ 
      marginTop: 16, 
      padding: 16, 
      background: '#f6ffed', 
      border: '1px solid #b7eb8f', 
      borderRadius: 6
    }}>
      {/* 产品类别统计 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#389e0d', marginBottom: 8 }}>
          {t('participants.productCategories')}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {categoryStats.map(([category, stats]) => (
            <div key={category} style={{ 
              border: '1px solid rgba(82, 196, 26, 0.2)',
              borderRadius: 6,
              overflow: 'hidden'
            }}>
              {/* 类别汇总 */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '8px 12px',
                background: 'rgba(82, 196, 26, 0.1)',
                fontSize: 12
              }}>
                <div style={{ fontWeight: 600, color: '#389e0d' }}>
                  {category}
                </div>
                <div style={{ display: 'flex', gap: 16, color: '#666' }}>
                  <span style={{ fontWeight: 600, color: '#fa541c' }}>RM{stats.totalAmount}</span>
                </div>
              </div>
              
              {/* 产品明细 */}
              <div style={{ padding: '8px 12px', background: '#fff' }}>
                {Object.entries(stats.products).map(([productName, productStats]) => (
                  <div key={productName} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '4px 0',
                    fontSize: 11,
                    borderBottom: '1px solid #f0f0f0'
                  }}>
                    <div style={{ color: '#666', flex: 1 }}>
                      {productName}
                    </div>
                    <div style={{ display: 'flex', gap: 12, color: '#999' }}>
                      <span>{productStats.count}人</span>
                      <span>{productStats.totalQuantity}支</span>
                      <span style={{ fontWeight: 500, color: '#fa541c' }}>RM{productStats.totalAmount}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* 总计 */}
      <div style={{ 
        paddingTop: 12, 
        borderTop: '1px solid #b7eb8f',
        textAlign: 'right'
      }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: '#389e0d' }}>
          {t('participants.totalAmount')}：RM{totalAmount.toFixed(2)}
        </div>
        <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
          {t('participants.participantsCount', { count: registeredParticipants.length })}
        </div>
      </div>
    </div>
  )
}

export default ParticipantsSummary
