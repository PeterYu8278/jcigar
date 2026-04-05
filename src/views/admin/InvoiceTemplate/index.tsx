import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Card, Col, Form, Input, InputNumber, Row, Space, Switch, Tabs, message } from 'antd'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import type { AppConfig, InvoiceTemplateConfig, Order, OrderInvoiceMeta } from '@/types'
import { getAppConfig, updateAppConfig } from '@/services/firebase/appConfig'
import { useAuthStore } from '@/store/modules/auth'
import { openInvoicePdfPreview, generateInvoicePdfAndDownload } from '@/utils/invoicePdf'
import InvoiceA4Designer from './InvoiceA4Designer'
import InvoiceA4Render from './InvoiceA4Render'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

type FormValues = {
  sellerName: string
  sellerRegNo: string
  sellerAddressLines: string
  sellerPhone: string
  sellerFax: string
  bankName: string
  bankAccountNo: string
  notes: string

  marginMm: number
  rightBoxWidthMm: number
  infoBoxHeightMm: number
  footerYmm: number
  signatureYmm: number
  currencySymbol: string

  invoiceTitle: string
  thNo: string
  thDesc: string
  thQty: string
  thPrice: string
  thAmount: string

  showNotes: boolean
  showBank: boolean
  showFooter: boolean
  showSignature: boolean
  showPage: boolean
}

const splitLines = (text: string) =>
  String(text || '')
    .split(/\r?\n/g)
    .map(s => s.trim())
    .filter(Boolean)

const joinLines = (lines?: string[]) => (Array.isArray(lines) ? lines.join('\n') : '')

const defaultBlocks: NonNullable<NonNullable<InvoiceTemplateConfig['layout']>['blocks']> = {
  sellerHeader: { x: 12, y: 12, w: 186, h: 20, style: { fontSize: 10.5, bold: false, italic: false, underline: false } },
  dividerHeaderToCustomer: { x: 12, y: 40, w: 186, h: 0.5, lineWidth: 0.2 },
  invoiceToBox: { x: 12, y: 50, w: 118, h: 34, style: { fontSize: 10, bold: false, italic: false, underline: false } },
  invoiceMetaBox: { x: 130, y: 50, w: 68, h: 34, style: { fontSize: 10, bold: false, italic: false, underline: false } },
  dividerCustomerToItems: { x: 12, y: 90, w: 186, h: 0.5, lineWidth: 0.2 },
  itemsTable: { x: 12, y: 92, w: 186, h: 120, style: { fontSize: 10, bold: false, italic: false, underline: false } },
  totals: { x: 12, y: 215, w: 186, h: 18, style: { fontSize: 10, bold: false, italic: false, underline: false } },
  notes: { x: 12, y: 235, w: 186, h: 28, style: { fontSize: 10, bold: false, italic: false, underline: false } },
  footer: { x: 12, y: 268, w: 186, h: 10, style: { fontSize: 10, bold: false, italic: false, underline: false } },
  signature: { x: 12, y: 283, w: 186, h: 12, style: { fontSize: 10, bold: false, italic: false, underline: false } },
}

const defaultTemplate: InvoiceTemplateConfig = {
  version: 1,
  layout: {
    marginMm: 12,
    rightBoxWidthMm: 80,
    infoBoxHeightMm: 34,
    footerYmm: 268,
    signatureYmm: 283,
  },
  labels: {
    invoiceTitle: 'INVOICE',
  },
  table: {
    headers: {
      no: 'No',
      description: 'Description',
      qty: 'Qty',
      priceUnit: 'Price/Unit',
      amount: 'Amount',
    },
    currencySymbol: 'RM',
  },
  show: {
    showNotes: true,
    showBank: true,
    showFooter: true,
    showSignature: true,
    showPage: true,
  },
}

const mergeTemplate = (tpl?: InvoiceTemplateConfig | null): InvoiceTemplateConfig => {
  if (!tpl) return defaultTemplate
  return {
    ...defaultTemplate,
    ...tpl,
    layout: { ...defaultTemplate.layout, ...(tpl.layout || {}) },
    labels: { ...defaultTemplate.labels, ...(tpl.labels || {}) },
    table: { ...defaultTemplate.table, ...(tpl.table || {}), headers: { ...defaultTemplate.table?.headers, ...(tpl.table?.headers || {}) } },
    show: { ...defaultTemplate.show, ...(tpl.show || {}) },
  }
}

const InvoiceTemplateEditor: React.FC = () => {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const [form] = Form.useForm<FormValues>()
  const [loading, setLoading] = useState(false)
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null)
  const [blocks, setBlocks] = useState<NonNullable<NonNullable<InvoiceTemplateConfig['layout']>['blocks']>>(defaultBlocks)
  const [activeTab, setActiveTab] = useState<'designer' | 'form'>('designer')
  const didHydrateRef = useRef(false)
  const retryTimerRef = useRef<number | null>(null)
  const exportRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const load = async () => {
      // Only hydrate once we successfully fetched app_config (avoid wiping fields when offline).
      if (didHydrateRef.current) return

      const cfg = await getAppConfig()
      if (!cfg) {
        // Retry silently (network/Firestore may be temporarily offline)
        if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current)
        retryTimerRef.current = window.setTimeout(load, 3000)
        return
      }

      didHydrateRef.current = true
      setAppConfig(cfg)
      const tpl = mergeTemplate(cfg.invoiceTemplate)
      setBlocks((tpl.layout?.blocks as any) || defaultBlocks)

      const inv = cfg.invoice || {}
      // Avoid overwriting user's in-progress edits (e.g. tab remount / HMR)
      if (!form.isFieldsTouched(true)) {
        form.setFieldsValue({
          sellerName: inv.sellerName || 'JEP VENTURES SDN BHD',
          sellerRegNo: inv.sellerRegNo || '',
          sellerAddressLines: joinLines(inv.sellerAddressLines),
          sellerPhone: inv.sellerPhone || '',
          sellerFax: inv.sellerFax || '',
          bankName: inv.bankName || '',
          bankAccountNo: inv.bankAccountNo || '',
          notes: joinLines(inv.notes),

          marginMm: Number(tpl.layout?.marginMm ?? 12),
          rightBoxWidthMm: Number(tpl.layout?.rightBoxWidthMm ?? 80),
          infoBoxHeightMm: Number(tpl.layout?.infoBoxHeightMm ?? 34),
          footerYmm: Number(tpl.layout?.footerYmm ?? 268),
          signatureYmm: Number(tpl.layout?.signatureYmm ?? 283),
          currencySymbol: String(tpl.table?.currencySymbol || 'RM'),

          invoiceTitle: String(tpl.labels?.invoiceTitle || 'INVOICE'),
          thNo: String(tpl.table?.headers?.no || 'No'),
          thDesc: String(tpl.table?.headers?.description || 'Description'),
          thQty: String(tpl.table?.headers?.qty || 'Qty'),
          thPrice: String(tpl.table?.headers?.priceUnit || 'Price/Unit'),
          thAmount: String(tpl.table?.headers?.amount || 'Amount'),

          showNotes: !!tpl.show?.showNotes,
          showBank: !!tpl.show?.showBank,
          showFooter: !!tpl.show?.showFooter,
          showSignature: !!tpl.show?.showSignature,
          showPage: !!tpl.show?.showPage,
        })
      }
    }
    load()
    return () => {
      if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current)
    }
  }, [form])

  const buildConfig = async () => {
    const v = await form.validateFields()
    const invoice: NonNullable<AppConfig['invoice']> = {
      sellerName: v.sellerName?.trim() || undefined,
      sellerRegNo: v.sellerRegNo?.trim() || undefined,
      sellerAddressLines: splitLines(v.sellerAddressLines),
      sellerPhone: v.sellerPhone?.trim() || undefined,
      sellerFax: v.sellerFax?.trim() || undefined,
      bankName: v.bankName?.trim() || undefined,
      bankAccountNo: v.bankAccountNo?.trim() || undefined,
      notes: splitLines(v.notes),
    }
    const invoiceTemplate: InvoiceTemplateConfig = {
      version: 1,
      layout: {
        marginMm: Number(v.marginMm),
        rightBoxWidthMm: Number(v.rightBoxWidthMm),
        infoBoxHeightMm: Number(v.infoBoxHeightMm),
        footerYmm: Number(v.footerYmm),
        signatureYmm: Number(v.signatureYmm),
        blocks,
      },
      labels: {
        invoiceTitle: v.invoiceTitle?.trim() || 'INVOICE',
      },
      table: {
        currencySymbol: v.currencySymbol?.trim() || 'RM',
        headers: {
          no: v.thNo?.trim() || 'No',
          description: v.thDesc?.trim() || 'Description',
          qty: v.thQty?.trim() || 'Qty',
          priceUnit: v.thPrice?.trim() || 'Price/Unit',
          amount: v.thAmount?.trim() || 'Amount',
        },
      },
      show: {
        showNotes: !!v.showNotes,
        showBank: !!v.showBank,
        showFooter: !!v.showFooter,
        showSignature: !!v.showSignature,
        showPage: !!v.showPage,
      },
    }
    return { invoice, invoiceTemplate }
  }

  const previewPayload = useMemo(() => {
    const now = new Date()
    const order: Order = {
      id: 'ORDER_SAMPLE_001',
      userId: 'sample',
      items: [
        { cigarId: 'QUINTERRO', name: 'QUINTERRO', quantity: 2, price: 58 },
        { cigarId: 'COHIBA CLUB 10', name: 'COHIBA CLUB 10', quantity: 2, price: 164.25 },
        { cigarId: 'MACANUDO', name: 'MACANUDO INSPIRADO WHITE ROTHCHILD', quantity: 1, price: 33 },
      ],
      total: 58 * 2 + 164.25 * 2 + 33,
      status: 'confirmed',
      payment: { method: 'bank_transfer' },
      shipping: { address: 'DUMMY ADDRESS LINE 1\nDUMMY ADDRESS LINE 2' },
      createdAt: now,
      updatedAt: now,
    }
    const invoice: OrderInvoiceMeta = {
      invoiceNo: 'IV-SAMPLE',
      invoiceDate: now,
      invoiceTo: { name: '822 CIGAR NIGHT', address: 'DUMMY ADDRESS', phone: '0123456789' },
      terms: 'CASH',
      generatedAt: now,
      generatedBy: user?.id || '',
    }
    return { order, invoice }
  }, [user?.id])

  const sellerNameW = Form.useWatch('sellerName', form)
  const sellerRegNoW = Form.useWatch('sellerRegNo', form)
  const sellerAddressLinesW = Form.useWatch('sellerAddressLines', form)
  const sellerPhoneW = Form.useWatch('sellerPhone', form)
  const sellerFaxW = Form.useWatch('sellerFax', form)
  const bankNameW = Form.useWatch('bankName', form)
  const bankAccountNoW = Form.useWatch('bankAccountNo', form)
  const notesW = Form.useWatch('notes', form)
  const invoiceTitleW = Form.useWatch('invoiceTitle', form)
  const thNoW = Form.useWatch('thNo', form)
  const thDescW = Form.useWatch('thDesc', form)
  const thQtyW = Form.useWatch('thQty', form)
  const thPriceW = Form.useWatch('thPrice', form)
  const thAmountW = Form.useWatch('thAmount', form)
  const currencySymbolW = Form.useWatch('currencySymbol', form)

  const designerPreview = useMemo(() => {
    const sellerName = String(sellerNameW || 'JEP VENTURES SDN BHD')
    const sellerRegNo = String(sellerRegNoW || '')
    const addressLines = splitLines(String(sellerAddressLinesW || ''))
    const notes = splitLines(String(notesW || ''))
    return {
      seller: {
        name: sellerName,
        regNo: sellerRegNo || undefined,
        addressLines,
        phone: String(sellerPhoneW || '') || undefined,
        fax: String(sellerFaxW || '') || undefined,
      },
      invoice: {
        invoiceNo: previewPayload.invoice.invoiceNo,
        invoiceDate: dayjs(previewPayload.invoice.invoiceDate).format('DD/MM/YYYY'),
        terms: previewPayload.invoice.terms,
        invoiceTo: {
          name: previewPayload.invoice.invoiceTo.name,
          address: previewPayload.invoice.invoiceTo.address,
          phone: previewPayload.invoice.invoiceTo.phone,
        },
        page: '1 of 1',
      },
      order: {
        items: (previewPayload.order.items || []).map(it => ({
          name: String(it.name || it.cigarId || ''),
          qty: Number(it.quantity || 0),
          unit: Number(it.price || 0),
        })),
        total: Number(previewPayload.order.total || 0),
        currencySymbol: String(currencySymbolW || 'RM'),
        totalWords: undefined,
      },
      labels: {
        invoiceTitle: String(invoiceTitleW || 'INVOICE'),
        thNo: String(thNoW || 'No'),
        thDesc: String(thDescW || 'Description'),
        thQty: String(thQtyW || 'Qty'),
        thPrice: String(thPriceW || 'Price/Unit'),
        thAmount: String(thAmountW || 'Amount'),
      },
      notes,
      bank: {
        bankName: String(bankNameW || '') || undefined,
        bankAccountNo: String(bankAccountNoW || '') || undefined,
      },
    }
  }, [
    sellerNameW,
    sellerRegNoW,
    sellerAddressLinesW,
    sellerPhoneW,
    sellerFaxW,
    bankNameW,
    bankAccountNoW,
    notesW,
    invoiceTitleW,
    thNoW,
    thDescW,
    thQtyW,
    thPriceW,
    thAmountW,
    currencySymbolW,
    previewPayload,
  ])

  const handleSave = async () => {
    setLoading(true)
    try {
      const { invoice, invoiceTemplate } = await buildConfig()
      const res = await updateAppConfig(
        {
          invoice,
          invoiceTemplate,
        },
        user?.id || ''
      )
      if (!res.success) {
        message.error(t('invoiceTemplate.saveFailed'))
        return
      }
      message.success(t('invoiceTemplate.saved'))
      const cfg = await getAppConfig()
      setAppConfig(cfg)
    } catch {
      message.error(t('invoiceTemplate.saveFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handlePreview = async () => {
    // WYSIWYG preview: A4 designer is the source of truth
    try {
      if (!exportRef.current) throw new Error('missing exportRef')
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: '#fff',
        scale: 2,
        useCORS: true,
        logging: false,
      })
      const img = canvas.toDataURL('image/png', 1.0)
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true })
      doc.addImage(img, 'PNG', 0, 0, 210, 297, undefined, 'FAST')

      const blob = doc.output('blob') as Blob
      const url = URL.createObjectURL(blob)
      const w = window.open(url, '_blank', 'noopener,noreferrer')
      if (!w) {
        URL.revokeObjectURL(url)
        throw new Error('popup blocked')
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
      return
    } catch {
      // Fallback: vector PDF (debugging / when canvas capture fails)
      const { invoice, invoiceTemplate } = await buildConfig()
      const cfgForPdf = { invoice, invoiceTemplate } as any
      const ok = openInvoicePdfPreview({
        order: previewPayload.order,
        invoice: previewPayload.invoice,
        appConfig: cfgForPdf,
        filename: 'invoice-preview.pdf',
      })
      if (!ok) message.warning(t('invoiceTemplate.previewFailed'))
    }
  }

  const handleDownload = async () => {
    // WYSIWYG download: A4 designer is the source of truth
    try {
      if (!exportRef.current) throw new Error('missing exportRef')
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: '#fff',
        scale: 2,
        useCORS: true,
        logging: false,
      })
      const img = canvas.toDataURL('image/png', 1.0)
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true })
      doc.addImage(img, 'PNG', 0, 0, 210, 297, undefined, 'FAST')
      doc.save('invoice-preview.pdf')
      return
    } catch {
      // Fallback: vector PDF
      const { invoice, invoiceTemplate } = await buildConfig()
      const cfgForPdf = { invoice, invoiceTemplate } as any
      generateInvoicePdfAndDownload({
        order: previewPayload.order,
        invoice: previewPayload.invoice,
        appConfig: cfgForPdf,
        filename: 'invoice-preview.pdf',
      })
    }
  }

  return (
    <div style={{ padding: 12 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800 }}>{t('invoiceTemplate.title')}</h1>
      <div style={{ opacity: 0.8, marginBottom: 12 }}>{t('invoiceTemplate.subtitle')}</div>

      <Form form={form} layout="vertical">
        {/* Clean hidden render used for WYSIWYG PDF export (no RND handles / guides). */}
        <div style={{ position: 'absolute', left: -100000, top: 0, opacity: 0, pointerEvents: 'none' }}>
          <InvoiceA4Render ref={exportRef} blocks={blocks as any} preview={designerPreview as any} />
        </div>
        <Tabs
          activeKey={activeTab}
          onChange={(k) => setActiveTab(k as any)}
          destroyOnHidden={false}
          items={[
            {
              key: 'designer',
              label: t('invoiceTemplate.tabs.designer', { defaultValue: 'A4 设计器' }),
              children: (
                <InvoiceA4Designer
                  blocks={blocks}
                  onChange={(next) => setBlocks(next)}
                  preview={designerPreview}
                />
              ),
            },
            {
              key: 'form',
              label: t('invoiceTemplate.tabs.form', { defaultValue: '配置表单' }),
              forceRender: true,
              children: (
                <Row gutter={[12, 12]}>
                  <Col xs={24} lg={12}>
                    <Card title={t('invoiceTemplate.seller.title')}>
              <Form.Item label={t('invoiceTemplate.seller.name')} name="sellerName">
                <Input />
              </Form.Item>
              <Form.Item label={t('invoiceTemplate.seller.regNo')} name="sellerRegNo">
                <Input />
              </Form.Item>
              <Form.Item label={t('invoiceTemplate.seller.addressLines')} name="sellerAddressLines">
                <Input.TextArea rows={4} placeholder={t('invoiceTemplate.multiLineHint')} />
              </Form.Item>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item label={t('invoiceTemplate.seller.phone')} name="sellerPhone">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label={t('invoiceTemplate.seller.fax')} name="sellerFax">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item label={t('invoiceTemplate.seller.bankName')} name="bankName">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label={t('invoiceTemplate.seller.bankAccount')} name="bankAccountNo">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label={t('invoiceTemplate.seller.notes')} name="notes">
                <Input.TextArea rows={4} placeholder={t('invoiceTemplate.multiLineHint')} />
              </Form.Item>
                    </Card>
                  </Col>

                  <Col xs={24} lg={12}>
                    <Card title={t('invoiceTemplate.template.title')}>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item label={t('invoiceTemplate.template.marginMm')} name="marginMm">
                    <InputNumber min={6} max={25} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label={t('invoiceTemplate.template.rightBoxWidthMm')} name="rightBoxWidthMm">
                    <InputNumber min={50} max={95} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item label={t('invoiceTemplate.template.infoBoxHeightMm')} name="infoBoxHeightMm">
                    <InputNumber min={24} max={60} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label={t('invoiceTemplate.template.currencySymbol')} name="currencySymbol">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item label={t('invoiceTemplate.template.footerYmm')} name="footerYmm">
                    <InputNumber min={240} max={285} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label={t('invoiceTemplate.template.signatureYmm')} name="signatureYmm">
                    <InputNumber min={250} max={292} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item label={t('invoiceTemplate.template.invoiceTitle')} name="invoiceTitle">
                <Input />
              </Form.Item>

              <Row gutter={12}>
                <Col span={8}>
                  <Form.Item label={t('invoiceTemplate.template.thNo')} name="thNo">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={16}>
                  <Form.Item label={t('invoiceTemplate.template.thDesc')} name="thDesc">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={12}>
                <Col span={8}>
                  <Form.Item label={t('invoiceTemplate.template.thQty')} name="thQty">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label={t('invoiceTemplate.template.thPrice')} name="thPrice">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label={t('invoiceTemplate.template.thAmount')} name="thAmount">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item label={t('invoiceTemplate.template.showNotes')} name="showNotes" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label={t('invoiceTemplate.template.showBank')} name="showBank" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label={t('invoiceTemplate.template.showFooter')} name="showFooter" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label={t('invoiceTemplate.template.showSignature')} name="showSignature" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label={t('invoiceTemplate.template.showPage')} name="showPage" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
              </Row>
                    </Card>
                  </Col>
                </Row>
              ),
            },
          ]}
        />

        <div style={{ marginTop: 12 }}>
          <Space wrap>
            <Button type="primary" onClick={handleSave} loading={loading}>
              {t('common.save')}
            </Button>
            <Button onClick={handlePreview}>
              {t('invoiceTemplate.preview')}
            </Button>
            <Button onClick={handleDownload}>
              {t('invoiceTemplate.downloadPreview')}
            </Button>
          </Space>
          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
            {t('invoiceTemplate.note')}
          </div>
          <div style={{ marginTop: 4, fontSize: 12, opacity: 0.6 }}>
            {t('invoiceTemplate.currentAppName')}: {appConfig?.appName || '-'}
          </div>
        </div>
      </Form>
    </div>
  )
}

export default InvoiceTemplateEditor


