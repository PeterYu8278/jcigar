import React, { useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { Button, DatePicker, Form, Input, Modal, Select, Space, Table, Tag, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useTranslation } from 'react-i18next'
import type { AppConfig, Cigar, Order, OrderInvoiceMeta, User } from '@/types'
import { useAuthStore } from '@/store/modules/auth'
import { getAppConfig } from '@/services/firebase/appConfig'
import { COLLECTIONS, updateDocument } from '@/services/firebase/firestore'
import { generateInvoicePdfAndDownload, openInvoicePdfPreview } from '@/utils/invoicePdf'
import { getStatusColor, getStatusText, getUserName, getUserPhone } from './helpers'

type InvoiceFormValues = {
  invoiceNo: string
  invoiceDate: dayjs.Dayjs
  invoiceToName: string
  invoiceToAddress: string
  invoiceToPhone: string
  terms: string
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
  onRefresh: () => Promise<void>
}

export const InvoiceManagementTab: React.FC<InvoiceManagementTabProps> = ({
  orders,
  users,
  cigars,
  appConfig,
  loading,
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
    generateInvoicePdfAndDownload({
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
      render: (v: number) => `RM${Number(v || 0).toFixed(2)}`,
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
    generateInvoicePdfAndDownload({
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
    <div style={{ paddingTop: 8 }}>
      <Space style={{ marginBottom: 12 }} wrap>
        <Select
          value={invoiceFilter}
          onChange={setInvoiceFilter}
          style={{ width: 180 }}
          options={[
            { value: 'all', label: t('ordersAdmin.invoice.filterAll') },
            { value: 'invoiced', label: t('ordersAdmin.invoice.filterInvoiced') },
            { value: 'notInvoiced', label: t('ordersAdmin.invoice.filterNotInvoiced') },
          ]}
        />
        <Button
          disabled={selectedRowKeys.length !== 1}
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
            })
            setModalOpen(true)
          }}
        >
          {t('ordersAdmin.invoice.generate')}
        </Button>
      </Space>

      <Table
        columns={columns}
        dataSource={filteredOrders}
        rowKey="id"
        loading={loading}
        rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
        pagination={{ pageSize: 20 }}
        scroll={{ x: 'max-content', y: 'calc(100vh - 360px)' }}
      />

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
        destroyOnClose
      >
        <div style={{ marginBottom: 8, fontSize: 12, opacity: 0.8 }}>
          {t('ordersAdmin.invoice.printHint')}
        </div>
        <Form form={form} layout="vertical">
          <Form.Item
            label={t('ordersAdmin.invoice.invoiceNo')}
            name="invoiceNo"
            rules={[{ required: true, message: t('ordersAdmin.invoice.invoiceNoRequired') }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={t('ordersAdmin.invoice.invoiceDate')}
            name="invoiceDate"
            rules={[{ required: true, message: t('ordersAdmin.invoice.invoiceDateRequired') }]}
          >
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item
            label={t('ordersAdmin.invoice.invoiceTo')}
            name="invoiceToName"
            rules={[{ required: true, message: t('ordersAdmin.invoice.invoiceToRequired') }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={t('ordersAdmin.invoice.phone')}
            name="invoiceToPhone"
            rules={[{ required: true, message: t('ordersAdmin.invoice.phoneRequired') }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={t('ordersAdmin.invoice.address')}
            name="invoiceToAddress"
            rules={[{ required: true, message: t('ordersAdmin.invoice.addressRequired') }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item label={t('ordersAdmin.invoice.terms')} name="terms">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default InvoiceManagementTab


