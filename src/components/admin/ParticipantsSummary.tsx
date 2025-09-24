import React from 'react'
import type { Event } from '../../types'

interface ParticipantsSummaryProps {
  event: Event | null
  getCigarPriceById: (cigarId: string) => number
}

const ParticipantsSummary: React.FC<ParticipantsSummaryProps> = ({
  event,
  getCigarPriceById
}) => {
  if (!event) return null

  const registeredParticipants = (event as any)?.participants?.registered || []

  if (registeredParticipants.length === 0) return null

  const totalAmount = registeredParticipants.reduce((sum: number, uid: string) => {
    const allocation = (event as any)?.allocations?.[uid]
    if (allocation?.amount != null) return sum + allocation.amount
    const qty = allocation?.quantity || 1
    return sum + (getCigarPriceById(allocation?.cigarId) * qty)
  }, 0)

  return (
    <div style={{ 
      marginTop: 16, 
      padding: 16, 
      background: '#f6ffed', 
      border: '1px solid #b7eb8f', 
      borderRadius: 6,
      textAlign: 'right'
    }}>
      <div style={{ fontSize: 18, fontWeight: 600, color: '#389e0d' }}>
        总金额：RM{totalAmount}
      </div>
      <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
        共 {registeredParticipants.length} 位参与者
      </div>
    </div>
  )
}

export default ParticipantsSummary
