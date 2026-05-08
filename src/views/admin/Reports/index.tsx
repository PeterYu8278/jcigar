import React, { useState } from 'react'
import { Card, Button, Row, Col, Typography, Space, message, DatePicker, Tag, Divider } from 'antd'
import { 
  FileExcelOutlined, 
  TeamOutlined, 
  DatabaseOutlined, 
  ShoppingCartOutlined, 
  CalendarOutlined,
  DownloadOutlined,
  BarChartOutlined
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import * as XLSX from 'xlsx'
import dayjs from 'dayjs'
import { 
  getUsers, 
  getCigars, 
  getAllOrders, 
  getEvents, 
  getAllInventoryMovements,
  getAllInboundOrders,
  getAllOutboundOrders
} from '../../../services/firebase/firestore'
import { useAuthStore } from '../../../store/modules/auth'

const { Title, Text, Paragraph } = Typography
const { RangePicker } = DatePicker

const AdminReports: React.FC = () => {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const [exporting, setExporting] = useState<string | null>(null)
  
  // Date range states
  const [orderRange, setOrderRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)
  const [eventRange, setEventRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)

  const downloadExcel = (data: any[], fileName: string, sheetName: string) => {
    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
    XLSX.writeFile(workbook, `${fileName}_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`)
  }

  const exportMembers = async () => {
    setExporting('members')
    try {
      const users = await getUsers()
      const exportData = users.map(u => ({
        'Member ID': u.memberId || '-',
        'Name': u.displayName || '-',
        'Email': u.email || '-',
        'Phone': (u as any).phone || (u as any).profile?.phone || '-',
        'Role': u.role || 'member',
        'Level': u.membership?.level || 'bronze',
        'Points': u.membership?.points || 0,
        'Created At': u.createdAt ? dayjs((u.createdAt as any)?.toDate?.() || u.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'
      }))
      downloadExcel(exportData, 'Members_Report', 'Members')
      message.success(t('messages.operationSuccess'))
    } catch (error) {
      console.error('Export members error:', error)
      message.error(t('messages.operationFailed'))
    } finally {
      setExporting(null)
    }
  }

  const exportInventory = async () => {
    setExporting('inventory')
    try {
      const [cigars, movements, inOrders, outOrders] = await Promise.all([
        getCigars(),
        getAllInventoryMovements(),
        getAllInboundOrders(),
        getAllOutboundOrders()
      ])

      // Compute stock using the same logic as AdminInventory
      const stockMap = new Map<string, number>()
      for (const m of movements) {
        const id = m.cigarId
        if (!id || (m.itemType && m.itemType !== 'cigar')) continue

        // Filter out cancelled orders
        if (m.inboundOrderId) {
          const order = inOrders.find(o => o.id === m.inboundOrderId)
          if (order && order.status === 'cancelled') continue
        }
        if (m.outboundOrderId) {
          const order = outOrders.find(o => o.id === m.outboundOrderId)
          if (order && order.status === 'cancelled') continue
        }

        const qty = Number.isFinite(m.quantity) ? Math.floor(m.quantity) : 0
        const prev = stockMap.get(id) ?? 0
        stockMap.set(id, m.type === 'in' ? prev + qty : prev - qty)
      }

      const exportData = cigars.map(c => ({
        'Brand': c.brand || '-',
        'Product Name': c.name || '-',
        'Origin': c.origin || '-',
        'Specification': c.size || '-',
        'Price': c.price || 0,
        'Stock': stockMap.get(c.id) ?? 0,
        'Unit': t('shop.sticks'),
        'Created At': c.createdAt ? dayjs((c.createdAt as any)?.toDate?.() || c.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'
      }))
      downloadExcel(exportData, 'Inventory_Report', 'Inventory')
      message.success(t('messages.operationSuccess'))
    } catch (error) {
      console.error('Export inventory error:', error)
      message.error(t('messages.operationFailed'))
    } finally {
      setExporting(null)
    }
  }

  const exportOrders = async () => {
    setExporting('orders')
    try {
      let orders = await getAllOrders()
      
      // Filter by date range if selected
      if (orderRange) {
        const [start, end] = orderRange
        orders = orders.filter(o => {
          const date = dayjs((o.createdAt as any)?.toDate?.() || o.createdAt)
          return date.isAfter(start.startOf('day')) && date.isBefore(end.endOf('day'))
        })
      }

      const exportData = orders.map(o => ({
        'Order ID': o.id,
        'Order No': o.orderNo || '-',
        'Customer': o.userId,
        'Total Amount': o.total || 0,
        'Status': o.status,
        'Payment Method': o.payment?.method || '-',
        'Created At': o.createdAt ? dayjs((o.createdAt as any)?.toDate?.() || o.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-',
        'Items': o.items?.map(i => `${i.name} x${i.quantity}`).join('; ') || '-'
      }))
      downloadExcel(exportData, 'Orders_Report', 'Orders')
      message.success(t('messages.operationSuccess'))
    } catch (error) {
      console.error('Export orders error:', error)
      message.error(t('messages.operationFailed'))
    } finally {
      setExporting(null)
    }
  }

  const exportEvents = async () => {
    setExporting('events')
    try {
      let events = await getEvents()

      // Filter by date range if selected
      if (eventRange) {
        const [start, end] = eventRange
        events = events.filter(e => {
          const date = dayjs((e.schedule?.startDate as any)?.toDate?.() || e.schedule?.startDate)
          return date.isAfter(start.startOf('day')) && date.isBefore(end.endOf('day'))
        })
      }

      const exportData = events.map(e => ({
        'Event Name': e.title,
        'Organizer': e.organizerId || '-',
        'Location': e.location?.name || '-',
        'Start Time': e.schedule?.startDate ? dayjs((e.schedule.startDate as any)?.toDate?.() || e.schedule.startDate).format('YYYY-MM-DD HH:mm:ss') : '-',
        'End Time': e.schedule?.endDate ? dayjs((e.schedule.endDate as any)?.toDate?.() || e.schedule.endDate).format('YYYY-MM-DD HH:mm:ss') : '-',
        'Participants': e.participants?.registered?.length || 0,
        'Capacity': e.participants?.maxParticipants || '-',
        'Status': e.status,
        'Fee': e.participants?.fee || 0
      }))
      downloadExcel(exportData, 'Events_Report', 'Events')
      message.success(t('messages.operationSuccess'))
    } catch (error) {
      console.error('Export events error:', error)
      message.error(t('messages.operationFailed'))
    } finally {
      setExporting(null)
    }
  }

  const reportCards = [
    {
      key: 'members',
      title: t('navigation.users'),
      icon: <TeamOutlined style={{ fontSize: 32, color: '#f4af25' }} />,
      description: 'Export all member records including points, level and contact info.',
      action: exportMembers,
      color: '#f4af25'
    },
    {
      key: 'inventory',
      title: t('navigation.inventory'),
      icon: <DatabaseOutlined style={{ fontSize: 32, color: '#52c41a' }} />,
      description: 'Export current cigar stock levels, prices and specifications.',
      action: exportInventory,
      color: '#52c41a'
    },
    {
      key: 'orders',
      title: t('navigation.orders'),
      icon: <ShoppingCartOutlined style={{ fontSize: 32, color: '#1890ff' }} />,
      description: 'Export sales orders with customer info, amount and status.',
      action: exportOrders,
      hasFilter: true,
      range: orderRange,
      setRange: setOrderRange,
      color: '#1890ff'
    },
    {
      key: 'events',
      title: t('navigation.events'),
      icon: <CalendarOutlined style={{ fontSize: 32, color: '#eb2f96' }} />,
      description: 'Export event history, participant counts and revenue.',
      action: exportEvents,
      hasFilter: true,
      range: eventRange,
      setRange: setEventRange,
      color: '#eb2f96'
    }
  ]

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <Title level={2} style={{ color: '#f4af25', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
          <BarChartOutlined /> {t('navigation.reports')}
        </Title>
        <Paragraph style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: 16 }}>
          Generate and download detailed Excel reports for various business operations.
        </Paragraph>
      </div>

      <Row gutter={[24, 24]}>
        {reportCards.map(card => (
          <Col xs={24} sm={12} key={card.key}>
            <Card
              hoverable
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: `1px solid rgba(255, 255, 255, 0.1)`,
                borderRadius: 16,
                backdropFilter: 'blur(10px)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}
              styles={{
                body: { padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ 
                  background: `rgba(${card.color === '#f4af25' ? '244, 175, 37' : card.color === '#52c41a' ? '82, 196, 26' : card.color === '#1890ff' ? '24, 144, 255' : '235, 47, 150'}, 0.1)`, 
                  padding: 16, 
                  borderRadius: 12 
                }}>
                  {card.icon}
                </div>
                <Tag color={card.color} style={{ margin: 0, borderRadius: 4, fontWeight: 600 }}>EXCEL</Tag>
              </div>

              <Title level={4} style={{ color: '#FFFFFF', marginBottom: 8 }}>{card.title}</Title>
              <Paragraph style={{ color: 'rgba(255, 255, 255, 0.5)', marginBottom: 24, fontSize: 14 }}>
                {card.description}
              </Paragraph>

              <div style={{ marginTop: 'auto' }}>
                {card.hasFilter && (
                  <div style={{ marginBottom: 16 }}>
                    <Text style={{ color: 'rgba(255, 255, 255, 0.45)', display: 'block', fontSize: 12, marginBottom: 8 }}>
                      DATE RANGE (OPTIONAL)
                    </Text>
                    <RangePicker 
                      className="points-config-form"
                      style={{ width: '100%' }}
                      onChange={(dates) => card.setRange(dates as any)}
                    />
                  </div>
                )}
                
                <Button 
                  type="primary" 
                  icon={<DownloadOutlined />} 
                  block
                  loading={exporting === card.key}
                  onClick={card.action}
                  style={{
                    background: `linear-gradient(135deg, ${card.color} 0%, ${card.color}dd 100%)`,
                    border: 'none',
                    height: 48,
                    borderRadius: 12,
                    fontWeight: 700,
                    boxShadow: `0 4px 14px 0 rgba(0, 0, 0, 0.25)`
                  }}
                >
                  {t('common.exportReport')}
                </Button>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Divider style={{ borderColor: 'rgba(255, 255, 255, 0.05)', margin: '48px 0' }} />
      
      <div style={{ textAlign: 'center' }}>
        <Text style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: 12 }}>
          © {dayjs().year()} {t('common.appName') || 'Cigar Club'}. All rights reserved. Professional Operations Portal.
        </Text>
      </div>
    </div>
  )
}

export default AdminReports
