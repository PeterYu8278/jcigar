import React from 'react'
import type { Event } from '../../types'
import { useTranslation } from 'react-i18next'

interface ParticipantsSummaryProps {
  event: Event | null
  getCigarPriceById: (cigarId: string) => number
}

const ParticipantsSummary: React.FC<ParticipantsSummaryProps> = ({
  event,
  getCigarPriceById
}) => {
  const { t } = useTranslation()
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
        {t('participants.totalAmount')}：RM{totalAmount}
      </div>
      <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
        {t('participants.participantsCount', { count: registeredParticipants.length })}
      </div>
    </div>
  )
}

export default ParticipantsSummary
