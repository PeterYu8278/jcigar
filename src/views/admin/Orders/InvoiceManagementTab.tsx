import React, { useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { Button, DatePicker, Form, Input, Modal, Select, Space, Table, Tag, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useTranslation } from 'react-i18next'
import type { AppConfig, Cigar, Order, OrderInvoiceMeta, User } from '@/types'
import { useAuthStore } from '@/store/modules/auth'
import { getAppConfig } from '@/services/firebase/appConfig'
import { COLLECTIONS, updateDocument } from '@/services/firebase/firestore'
import { generateInvoicePdfAndDownload, openInvoicePdfPreview } from '@/utils/invoicePdfRenderer'
import { getStatusColor, getStatusText, getUserName, getUserPhone } from './helpers'

type InvoiceFormValues = {
  invoiceNo: string
  invoiceDate: dayjs.Dayjs
  invoiceToName: string
  invoiceToAddress: string
  invoiceToPhone: string
  terms: string
  yourRef: string
  ourDoNo: string
}

const padLeft = (value: string, len: number) => value.padStart(len, '0')

const guessInvoiceNo = (order: Order, date: Date) => {
  const orderNo = String(order.orderNo || '').trim()
  const digits = orderNo.replaceAll(/\D/g, '')
  if (digits) return `IV-${padLeft(digits, 5)}`
  const short = String(order.id || '').replaceAll(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6)
  return `IV-${dayjs(date).format('YYMMDD')}-${short || '000000'}`
}

const toDateSafe = (val: any): Date => {
  if (!val) return new Date()
  if (val instanceof Date && !isNaN(val.getTime())) return val
  if (typeof val?.toDate === 'function') {
    const d = val.toDate()
    return d instanceof Date && !isNaN(d.getTime()) ? d : new Date()
  }
  const d = new Date(val)
  return isNaN(d.getTime()) ? new Date() : d
}

interface InvoiceManagementTabProps {
  orders: Order[]
  users: User[]
  cigars: Cigar[]
  appConfig: AppConfig | null
  loading: boolean
  isMobile: boolean
  onRefresh: () => Promise<void>
}

export const InvoiceManagementTab: React.FC<InvoiceManagementTabProps> = ({
  orders,
  users,
  cigars,
  appConfig,
  loading,
  isMobile,
  onRefresh,
}) => {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [invoiceFilter, setInvoiceFilter] = useState<'all' | 'invoiced' | 'notInvoiced'>('all')
  const [activeOrder, setActiveOrder] = useState<Order | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm<InvoiceFormValues>()
  const [latestAppConfig, setLatestAppConfig] = useState<AppConfig | null>(null)

  const resolveAppConfig = async (): Promise<AppConfig | null> => {
    try {
      const cfg = await getAppConfig()
      if (cfg) {
        setLatestAppConfig(cfg)
        return cfg
      }
    } catch {
      // ignore; fall back to prop/state
    }
    return latestAppConfig || appConfig || null
  }

  const enrichOrderItems = (order: Order): Order => ({
    ...order,
    items: (order.items || []).map(it => {
      const cigar = cigars.find(c => c.id === it.cigarId)
      return { ...it, name: it.name || cigar?.name || it.cigarId }
    }),
  })

  const previewInvoicePdf = async (order: Order, inv: OrderInvoiceMeta) => {
    const cfg = await resolveAppConfig()
    const ok = openInvoicePdfPreview({
      order: enrichOrderItems(order),
      invoice: inv,
      appConfig: cfg,
      filename: `${inv.invoiceNo}.pdf`,
    })
    if (!ok) message.warning(t('ordersAdmin.invoice.previewFailed'))
  }

  const downloadInvoicePdf = async (order: Order, inv: OrderInvoiceMeta) => {
    const cfg = await resolveAppConfig()
    await generateInvoicePdfAndDownload({
      order: enrichOrderItems(order),
      invoice: inv,
      appConfig: cfg,
      filename: `${inv.invoiceNo}.pdf`,
    })
  }

  const filteredOrders = useMemo(() => {
    if (invoiceFilter === 'all') return orders
    if (invoiceFilter === 'invoiced') return orders.filter(o => !!(o as any)?.invoice)
    return orders.filter(o => !(o as any)?.invoice)
  }, [orders, invoiceFilter])

  const columns: ColumnsType<Order> = useMemo(() => [
    {
      title: t('ordersAdmin.orderId'),
      dataIndex: 'id',
      key: 'id',
      width: 180,
      render: (id: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{id}</span>,
    },
    {
      title: t('ordersAdmin.user'),
      dataIndex: 'userId',
      key: 'userId',
      render: (userId: string) => (
        <div>
          <div style={{ fontWeight: 700 }}>{getUserName(userId, users)}</div>
          <div style={{ fontSize: 12, opacity: 0.75 }}>{getUserPhone(userId, users) || '-'}</div>
        </div>
      ),
    },
    {
      title: t('ordersAdmin.totalAmount'),
      dataIndex: 'total',
      key: 'total',
      width: 140,
      render: (v: number) => <span style={{ fontWeight: 800, color: '#f4af25' }}>RM{Number(v || 0).toFixed(2)}</span>,
    },
    {
      title: t('ordersAdmin.status.title'),
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (_: any, record: Order) => (
        <Tag color={getStatusColor(record.status)}>{getStatusText(record.status, t)}</Tag>
      ),
    },
    {
      title: t('ordersAdmin.invoice.status'),
      key: 'invoice',
      width: 140,
      render: (_: any, record: Order) => {
        const inv = (record as any)?.invoice as OrderInvoiceMeta | undefined
        if (!inv) return <Tag>{t('ordersAdmin.invoice.notGenerated')}</Tag>
        return (
          <Space size={6}>
            <Tag color="green">{t('ordersAdmin.invoice.generated')}</Tag>
            <Button
              size="small"
              type="link"
              style={{ padding: 0, height: 'auto', fontFamily: 'monospace', fontSize: 12 }}
              onClick={async () => {
                await previewInvoicePdf(record, inv)
              }}
            >
              {inv.invoiceNo}
            </Button>
          </Space>
        )
      }
    },
    {
      title: t('ordersAdmin.actions'),
      key: 'actions',
      width: 200,
      render: (_: any, record: Order) => (
        <Space>
          <Button
            size="small"
            type="default"
            style={{
              background: 'rgba(255,255,255,0.1)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.2)'
            }}
            onClick={async () => {
              const inv = (record as any)?.invoice as OrderInvoiceMeta | undefined
              if (!inv) {
                message.info(t('ordersAdmin.invoice.needGenerateFirst'))
                return
              }
              await previewInvoicePdf(record, inv)
            }}
          >
            {t('ordersAdmin.invoice.view')}
          </Button>
          <Button
            size="small"
            type="default"
            style={{
              background: 'rgba(255,255,255,0.1)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.2)'
            }}
            onClick={async () => {
              const inv = (record as any)?.invoice as OrderInvoiceMeta | undefined
              if (!inv) {
                message.info(t('ordersAdmin.invoice.needGenerateFirst'))
                return
              }
              await downloadInvoicePdf(record, inv)
            }}
          >
            {t('ordersAdmin.invoice.print')}
          </Button>
          <Button
            size="small"
            type="primary"
            style={{
              background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
              border: 'none',
              color: '#111',
              fontWeight: 700
            }}
            onClick={() => {
              setActiveOrder(record)
              const inv = (record as any)?.invoice as OrderInvoiceMeta | undefined
              const defaultDate = inv?.invoiceDate ? dayjs(toDateSafe(inv.invoiceDate)) : dayjs()
              form.setFieldsValue({
                invoiceNo: inv?.invoiceNo || guessInvoiceNo(record, defaultDate.toDate()),
                invoiceDate: defaultDate,
                invoiceToName: inv?.invoiceTo?.name || getUserName(record.userId, users),
                invoiceToAddress: inv?.invoiceTo?.address || (record as any)?.shipping?.address || '',
                invoiceToPhone: inv?.invoiceTo?.phone || getUserPhone(record.userId, users) || '',
                terms: inv?.terms || 'CASH',
                yourRef: inv?.yourRef || '',
                ourDoNo: inv?.ourDoNo || '',
              })
              setModalOpen(true)
            }}
          >
            {t('ordersAdmin.invoice.generate')}
          </Button>
        </Space>
      ),
    },
  ], [t, users, cigars, appConfig, form, user?.id])

  const generateAndPrint = async () => {
    if (!activeOrder) return
    const values = await form.validateFields()
    const invoiceDate = values.invoiceDate?.toDate?.() ? values.invoiceDate.toDate() : dayjs(values.invoiceDate).toDate()
    const invoice: OrderInvoiceMeta = {
      invoiceNo: values.invoiceNo.trim(),
      invoiceDate,
      invoiceTo: {
        name: values.invoiceToName.trim(),
        address: values.invoiceToAddress.trim(),
        phone: values.invoiceToPhone.trim(),
      },
      terms: values.terms?.trim() || 'CASH',
      yourRef: values.yourRef?.trim() || '',
      ourDoNo: values.ourDoNo?.trim() || '',
      generatedAt: new Date(),
      generatedBy: user?.id || '',
    }

    // 写回订单（仅管理员路径可写）
    const res = await updateDocument<Order>(COLLECTIONS.ORDERS, activeOrder.id, {
      invoice,
    } as any)
    if (!res.success) {
      message.error(t('ordersAdmin.invoice.saveFailed'))
      return
    }

    await onRefresh()

    const cfg = await resolveAppConfig()
    await generateInvoicePdfAndDownload({
      order: enrichOrderItems({ ...activeOrder, invoice }),
      invoice,
      appConfig: cfg,
      filename: `${invoice.invoiceNo}.pdf`,
    })
    message.success(t('ordersAdmin.invoice.generatedAndOpened'))
    setModalOpen(false)
    setActiveOrder(null)
    setSelectedRowKeys([])
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{
        marginBottom: 10,
        padding: isMobile ? '0' : '16px',
        background: isMobile ? 'transparent' : 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        border: isMobile ? 'none' : '1px solid rgba(244, 175, 37, 0.6)',
        backdropFilter: isMobile ? 'none' : 'blur(10px)',
        flexShrink: 0
      }}>
        {!isMobile ? (
          <Space size="middle">
            <Select
              value={invoiceFilter}
              onChange={setInvoiceFilter}
              style={{ width: 180 }}
              className="points-config-form"
              options={[
                { value: 'all', label: t('ordersAdmin.invoice.filterAll') },
                { value: 'invoiced', label: t('ordersAdmin.invoice.filterInvoiced') },
                { value: 'notInvoiced', label: t('ordersAdmin.invoice.filterNotInvoiced') },
              ]}
            />
            <Button
              disabled={selectedRowKeys.length !== 1}
              className="points-config-form"
              style={{
                background: selectedRowKeys.length === 1 ? 'linear-gradient(to right,#FDE08D,#C48D3A)' : 'rgba(255,255,255,0.1)',
                border: 'none',
                color: selectedRowKeys.length === 1 ? '#111' : 'rgba(255,255,255,0.3)',
                fontWeight: 700
              }}
              onClick={() => {
                if (selectedRowKeys.length !== 1) {
                  message.info(t('ordersAdmin.invoice.selectOneOrder'))
                  return
                }
                const id = String(selectedRowKeys[0])
                const order = filteredOrders.find(o => o.id === id)
                if (!order) return
                setActiveOrder(order)
                const inv = (order as any)?.invoice as OrderInvoiceMeta | undefined
                const defaultDate = inv?.invoiceDate ? dayjs(toDateSafe(inv.invoiceDate)) : dayjs()
                form.setFieldsValue({
                  invoiceNo: inv?.invoiceNo || guessInvoiceNo(order, defaultDate.toDate()),
                  invoiceDate: defaultDate,
                  invoiceToName: inv?.invoiceTo?.name || getUserName(order.userId, users),
                  invoiceToAddress: inv?.invoiceTo?.address || (order as any)?.shipping?.address || '',
                  invoiceToPhone: inv?.invoiceTo?.phone || getUserPhone(order.userId, users) || '',
                  terms: inv?.terms || 'CASH',
                  yourRef: inv?.yourRef || '',
                  ourDoNo: inv?.ourDoNo || '',
                })
                setModalOpen(true)
              }}
            >
              {t('ordersAdmin.invoice.generate')}
            </Button>
          </Space>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Select
              value={invoiceFilter}
              onChange={setInvoiceFilter}
              style={{ width: '100%' }}
              className="points-config-form"
              options={[
                { value: 'all', label: t('ordersAdmin.invoice.filterAll') },
                { value: 'invoiced', label: t('ordersAdmin.invoice.filterInvoiced') },
                { value: 'notInvoiced', label: t('ordersAdmin.invoice.filterNotInvoiced') },
              ]}
            />
            {selectedRowKeys.length === 1 && (
              <Button
                block
                className="points-config-form"
                style={{
                  background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
                  border: 'none',
                  color: '#111',
                  fontWeight: 700
                }}
                onClick={() => {
                  const id = String(selectedRowKeys[0])
                  const order = filteredOrders.find(o => o.id === id)
                  if (!order) return
                  setActiveOrder(order)
                  const inv = (order as any)?.invoice as OrderInvoiceMeta | undefined
                  const defaultDate = inv?.invoiceDate ? dayjs(toDateSafe(inv.invoiceDate)) : dayjs()
                  form.setFieldsValue({
                    invoiceNo: inv?.invoiceNo || guessInvoiceNo(order, defaultDate.toDate()),
                    invoiceDate: defaultDate,
                    invoiceToName: inv?.invoiceTo?.name || getUserName(order.userId, users),
                    invoiceToAddress: inv?.invoiceTo?.address || (order as any)?.shipping?.address || '',
                    invoiceToPhone: inv?.invoiceTo?.phone || getUserPhone(order.userId, users) || '',
                    terms: inv?.terms || 'CASH',
                    yourRef: inv?.yourRef || '',
                    ourDoNo: inv?.ourDoNo || '',
                  })
                  setModalOpen(true)
                }}
              >
                {t('ordersAdmin.invoice.generateSelected')}
              </Button>
            )}
          </div>
        )}
      </div>

      {!isMobile ? (
        <div className="points-config-form">
          <Table
            columns={columns}
            dataSource={filteredOrders}
            rowKey="id"
            loading={loading}
            rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
            pagination={{ pageSize: 20 }}
            scroll={{ x: 'max-content', y: 'calc(100vh - 400px)' }}
            style={{
              background: 'transparent',
              borderRadius: 12,
              border: '1px solid rgba(244, 175, 37, 0.2)',
              overflow: 'hidden'
            }}
          />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', flex: 1, paddingBottom: 16 }}>
          {filteredOrders.map(record => {
            const inv = (record as any)?.invoice as OrderInvoiceMeta | undefined
            return (
              <div key={record.id} style={{
                border: '1px solid rgba(244,175,37,0.2)',
                borderRadius: 12,
                padding: 12,
                background: 'rgba(34,28,16,0.5)',
                backdropFilter: 'blur(10px)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace' }}>
                    {record.id.substring(0, 30)}
                  </div>
                  <Tag color={getStatusColor(record.status)} style={{ margin: 0 }}>
                    {getStatusText(record.status, t)}
                  </Tag>
                </div>

                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{getUserName(record.userId, users)}</div>
                  <div style={{ fontSize: 11, opacity: 0.6, color: '#fff' }}>{getUserPhone(record.userId, users) || '-'}</div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#f4af25' }}>RM{Number(record.total || 0).toFixed(2)}</div>
                  {inv ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Tag color="green" style={{ margin: 0 }}>{t('ordersAdmin.invoice.generated')}</Tag>
                      <span style={{ fontSize: 11, color: '#FDE08D', fontFamily: 'monospace' }}>{inv.invoiceNo}</span>
                    </div>
                  ) : (
                    <Tag style={{ margin: 0 }}>{t('ordersAdmin.invoice.notGenerated')}</Tag>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button
                      style={{
                        flex: 1,
                        height: 36,
                        background: 'rgba(255,255,255,0.1)',
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600
                      }}
                      onClick={async () => {
                        if (!inv) { message.info(t('ordersAdmin.invoice.needGenerateFirst')); return }
                        await previewInvoicePdf(record, inv)
                      }}
                    >
                      {t('ordersAdmin.invoice.view')}
                    </Button>
                    <Button
                      style={{
                        flex: 1,
                        height: 36,
                        background: 'rgba(255,255,255,0.1)',
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600
                      }}
                      onClick={async () => {
                        if (!inv) { message.info(t('ordersAdmin.invoice.needGenerateFirst')); return }
                        await downloadInvoicePdf(record, inv)
                      }}
                    >
                      {t('ordersAdmin.invoice.print')}
                    </Button>
                  </div>
                  <Button
                    type="primary"
                    style={{
                      width: '100%',
                      height: 42,
                      background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
                      border: 'none',
                      color: '#111',
                      fontWeight: 700,
                      borderRadius: 8,
                      fontSize: 14,
                      boxShadow: '0 4px 12px rgba(196, 141, 58, 0.2)'
                    }}
                    onClick={() => {
                      setActiveOrder(record)
                      const defaultDate = inv?.invoiceDate ? dayjs(toDateSafe(inv.invoiceDate)) : dayjs()
                      form.setFieldsValue({
                        invoiceNo: inv?.invoiceNo || guessInvoiceNo(record, defaultDate.toDate()),
                        invoiceDate: defaultDate,
                        invoiceToName: inv?.invoiceTo?.name || getUserName(record.userId, users),
                        invoiceToAddress: inv?.invoiceTo?.address || (record as any)?.shipping?.address || '',
                        invoiceToPhone: inv?.invoiceTo?.phone || getUserPhone(record.userId, users) || '',
                        terms: inv?.terms || 'CASH',
                        yourRef: inv?.yourRef || '',
                        ourDoNo: inv?.ourDoNo || '',
                      })
                      setModalOpen(true)
                    }}
                  >
                    {t('ordersAdmin.invoice.generate')}
                  </Button>
                </div>
              </div>
            )
          })}
          {filteredOrders.length === 0 && (
            <div style={{ color: 'rgba(255, 255, 255, 0.6)', textAlign: 'center', padding: '24px 0' }}>{t('common.noData')}</div>
          )}
        </div>
      )}

      <Modal
        title={t('ordersAdmin.invoice.modalTitle')}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false)
          setActiveOrder(null)
        }}
        onOk={generateAndPrint}
        okText={t('ordersAdmin.invoice.downloadPdf')}
        cancelText={t('common.cancel')}
        width={isMobile ? '100%' : 600}
        style={{ top: isMobile ? 0 : 100 }}
        styles={{
          mask: {
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          },
          content: {
            background: isMobile ? 'linear-gradient(180deg, #221c10 0%, #181611 100%)' : '#1a1a1a',
            color: '#fff',
            border: isMobile ? 'none' : '1px solid rgba(244,175,37,0.3)',
            borderRadius: isMobile ? 0 : 12,
            height: isMobile ? '100vh' : 'auto',
            padding: isMobile ? '12px' : '24px'
          },
          header: {
            background: 'transparent',
            borderBottom: '1px solid rgba(244, 175, 37, 0.6)'
          },
          body: {
            background: 'transparent'
          },
          footer: {
            background: 'transparent',
            borderTop: '1px solid rgba(244, 175, 37, 0.6)'
          }
        }}
      >
        <div style={{ marginBottom: 16, fontSize: 13, color: 'rgba(255, 255, 255, 0.6)' }}>
          {t('ordersAdmin.invoice.printHint')}
        </div>
        <Form
          form={form}
          layout="horizontal"
          labelCol={{ span: 6 }}
          wrapperCol={{ span: 18 }}
          labelAlign="left"
        >
          <Form.Item
            label={<span style={{ color: '#fff' }}>{t('ordersAdmin.invoice.invoiceNo')}</span>}
            name="invoiceNo"
            rules={[{ required: true, message: t('ordersAdmin.invoice.invoiceNoRequired') }]}
          >
            <Input className="points-config-form" />
          </Form.Item>
          <Form.Item
            label={<span style={{ color: '#fff' }}>{t('ordersAdmin.invoice.invoiceDate')}</span>}
            name="invoiceDate"
            rules={[{ required: true, message: t('ordersAdmin.invoice.invoiceDateRequired') }]}
          >
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" className="points-config-form" />
          </Form.Item>
          <Form.Item
            label={<span style={{ color: '#fff' }}>{t('ordersAdmin.invoice.invoiceTo')}</span>}
            name="invoiceToName"
            rules={[{ required: true, message: t('ordersAdmin.invoice.invoiceToRequired') }]}
          >
            <Input className="points-config-form" />
          </Form.Item>
          <Form.Item
            label={<span style={{ color: '#fff' }}>{t('ordersAdmin.invoice.phone')}</span>}
            name="invoiceToPhone"
            rules={[{ required: true, message: t('ordersAdmin.invoice.phoneRequired') }]}
          >
            <Input className="points-config-form" />
          </Form.Item>
          <Form.Item
            label={<span style={{ color: '#fff' }}>{t('ordersAdmin.invoice.terms')}</span>}
            name="terms"
            rules={[{ required: true, message: t('ordersAdmin.invoice.termsRequired') }]}
          >
            <Input className="points-config-form" />
          </Form.Item>
          <Form.Item label={<span style={{ color: '#fff' }}>Your Ref.</span>} name="yourRef">
            <Input className="points-config-form" />
          </Form.Item>
          <Form.Item label={<span style={{ color: '#fff' }}>Our D/O No</span>} name="ourDoNo">
            <Input className="points-config-form" />
          </Form.Item>
          <Form.Item
            label={<span style={{ color: '#fff' }}>{t('ordersAdmin.invoice.address')}</span>}
            name="invoiceToAddress"
            rules={[{ required: true, message: t('ordersAdmin.invoice.addressRequired') }]}
            layout="vertical"
            labelCol={{ span: 24 }}
            wrapperCol={{ span: 24 }}
          >
            <Input.TextArea rows={3} className="points-config-form" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default InvoiceManagementTab


