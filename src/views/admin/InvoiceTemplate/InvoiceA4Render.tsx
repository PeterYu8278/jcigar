import React, { forwardRef, useMemo } from 'react'
import dayjs from 'dayjs'
import { INVOICE_COLORS } from '@/utils/invoiceTheme'
import { numberToEnglishWords } from '@/utils/format/numberFormat'

const A4 = { w: 210, h: 297 } // mm
const MM_TO_PX = 96 / 25.4


const colors = {
  primary: INVOICE_COLORS.primary.hex,
  secondary: INVOICE_COLORS.secondary.hex,
  lightGray: INVOICE_COLORS.lightGray.hex,
  borderGray: INVOICE_COLORS.borderGray.hex,
  textMain: INVOICE_COLORS.textMain.hex,
  textSecondary: INVOICE_COLORS.textSecondary.hex,
}

export type InvoiceA4PreviewModel = {
  seller: {
    name: string
    regNo?: string
    addressLines: string[]
    phone?: string
    logoUrl?: string
  }
  invoice: {
    invoiceNo: string
    invoiceDate: string
    terms?: string
    yourRef?: string
    ourDoNo?: string
    invoiceTo: { name: string; address: string; phone: string }
    page?: string
  }
  order: {
    items: Array<{ name: string; qty: number; unit: number }>
    total: number
    currencySymbol: string
    totalWords?: string
  }
  labels: {
    invoiceTitle: string
    thNo: string
    thDesc: string
    thQty: string
    thPrice: string
    thAmount: string
  }
  notes: string[]
  bank?: { bankName?: string; bankAccountNo?: string }
}

/**
 * 核心数据映射函数：将业务对象映射为 UI 渲染模型
 */
export const mapBusinessDataToInvoiceModel = (
  order: any, 
  invoice: any, 
  appConfig: any, 
  template: any,
  currencySymbol: string
): InvoiceA4PreviewModel => {
  const seller = { 
    name: appConfig?.invoice?.sellerName || 'JEP Ventures Sdn Bhd',
    regNo: appConfig?.invoice?.sellerRegNo,
    addressLines: appConfig?.invoice?.sellerAddressLines || [],
    phone: appConfig?.invoice?.sellerPhone,
    logoUrl: appConfig?.logoUrl,
  }

  return {
    seller,
    invoice: {
      invoiceNo: invoice.invoiceNo,
      invoiceDate: dayjs(invoice.invoiceDate).format('DD/MM/YYYY'),
      terms: invoice.terms,
      yourRef: invoice.yourRef,
      ourDoNo: invoice.ourDoNo,
      invoiceTo: {
        name: invoice.invoiceTo.name,
        address: invoice.invoiceTo.address,
        phone: invoice.invoiceTo.phone
      },
      page: '1 of 1',
    },
    order: {
      items: (order.items || []).map((it: any) => ({
        name: it.name || it.cigarId,
        qty: Number(it.quantity || 0),
        unit: Number(it.price || 0)
      })),
      total: Number(order.total || 0),
      currencySymbol,
      totalWords: `RINGGIT MALAYSIA : ${numberToEnglishWords(Number(order.total || 0))}`
    },
    labels: {
      invoiceTitle: template.labels?.invoiceTitle || 'INVOICE',
      thNo: template.table?.headers?.no || 'No',
      thDesc: template.table?.headers?.description || 'Description',
      thQty: template.table?.headers?.qty || 'Qty',
      thPrice: template.table?.headers?.priceUnit || 'Price/Unit',
      thAmount: template.table?.headers?.amount || 'Amount',
    },
    notes: appConfig?.invoice?.notes || [],
    bank: {
      bankName: appConfig?.invoice?.bankName,
      bankAccountNo: appConfig?.invoice?.bankAccountNo
    }
  }
}

export interface InvoiceA4RenderProps {
  preview: InvoiceA4PreviewModel
}

export const InvoiceA4Render = forwardRef<HTMLDivElement, InvoiceA4RenderProps>(({ preview }, ref) => {
  const pagePx = useMemo(() => ({ w: Math.round(A4.w * MM_TO_PX), h: Math.round(A4.h * MM_TO_PX) }), [])
  const p = preview

  return (
    <div
      ref={ref}
      style={{
        width: pagePx.w,
        height: pagePx.h,
        padding: '15mm',
        background: '#fff',
        fontFamily: 'Helvetica, Arial, sans-serif',
        color: colors.textMain,
        position: 'relative',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 1. Header (Dark) */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        marginBottom: '20px',
        background: colors.primary,
        margin: '-15mm -15mm 5mm -15mm',
        padding: '10mm 15mm',
        color: '#fff'
      }}>
        {p.seller.logoUrl ? (
          <img
            src={p.seller.logoUrl}
            alt="Logo"
            style={{ height: '15mm', marginRight: '8mm' }}
          />
        ) : (
          <div style={{ marginRight: '8mm' }}>
            <div style={{ fontSize: '22pt', fontWeight: 'bold', lineHeight: 1 }}>
              <span style={{ color: '#fff' }}>{p.seller.name?.split(' ')[0] || 'JEP'} </span>
              <span style={{ color: colors.secondary }}>{p.seller.name?.split(' ').slice(1).join(' ') || 'Ventures'}</span>
            </div>
          </div>
        )}
        <div style={{ flex: 1 }}>
          {!p.seller.logoUrl && <div style={{ height: '2mm' }} />}
          <div style={{ fontSize: '14pt', fontWeight: 'bold', marginBottom: '1mm', color: '#fff', display: 'flex', alignItems: 'baseline', gap: '2mm' }}>
            {p.seller.name}
            {p.seller.regNo && (
              <span style={{ fontSize: '8pt', fontWeight: 'normal', color: '#CBD5E1' }}>
                ({p.seller.regNo})
              </span>
            )}
          </div>
          <div style={{ fontSize: '8pt', color: '#CBD5E1', marginBottom: '0.5mm' }}>
            {p.seller.addressLines.join(', ')}
          </div>
          {p.seller.phone && (
            <div style={{ fontSize: '8pt', color: '#CBD5E1' }}>
              Phone: {p.seller.phone}
            </div>
          )}
        </div>
      </div>

      {/* 2. Main Title */}
      <div style={{ textAlign: 'center', marginBottom: '5mm' }}>
        <div style={{ fontSize: '20pt', fontWeight: 'bold', color: colors.textMain, textTransform: 'uppercase' }}>
          {p.labels.invoiceTitle}
        </div>
      </div>

      {/* 3. Customer Info */}
      <div style={{ marginBottom: '8mm' }}>
        <div style={{ display: 'flex', fontSize: '9pt', marginTop: '0mm' }}>
          {/* Left Column: Customer Details */}
          <div style={{ width: '100mm', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '25mm 1fr', rowGap: '0mm' }}>
              <div style={{ color: colors.textSecondary }}>Name</div>
              <div style={{ fontWeight: 'bold' }}>{p.invoice.invoiceTo.name}</div>

              <div style={{ color: colors.textSecondary }}>Address</div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{p.invoice.invoiceTo.address}</div>
            </div>

            {/* Spacer to push Phone down - will be adjusted by flex if needed, but here we just want it to align with the 6th row */}
            <div style={{ flex: 1, minHeight: '12mm' }} />

            <div style={{ display: 'grid', gridTemplateColumns: '25mm 1fr', rowGap: '0mm' }}>
              <div style={{ color: colors.textSecondary }}>Phone</div>
              <div>{p.invoice.invoiceTo.phone}</div>
            </div>
          </div>

          {/* Right Column: Metadata (Strict spacing) */}
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '25mm 1fr', rowGap: '0mm' }}>
            <div style={{ color: colors.textSecondary }}>Invoice No</div>
            <div style={{ fontWeight: 'bold' }}>{p.invoice.invoiceNo}</div>

            <div style={{ color: colors.textSecondary }}>Date</div>
            <div style={{ fontWeight: 'bold' }}>{p.invoice.invoiceDate}</div>

            <div style={{ color: colors.textSecondary }}>Your Ref.</div>
            <div style={{ fontWeight: 'bold' }}>{p.invoice.yourRef || '-'}</div>

            <div style={{ color: colors.textSecondary }}>Our D/O No</div>
            <div style={{ fontWeight: 'bold' }}>{p.invoice.ourDoNo || '-'}</div>

            <div style={{ color: colors.textSecondary }}>Terms</div>
            <div style={{ fontWeight: 'bold' }}>{p.invoice.terms || 'CASH'}</div>

            <div style={{ color: colors.textSecondary }}>Page</div>
            <div style={{ fontWeight: 'bold' }}>{p.invoice.page || '1 of 1'}</div>
          </div>
        </div>
      </div>

      {/* 4. Table */}
      <div style={{ flex: 1 }}>
        <SectionHeader title="ITEM DETAILS" />
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '4mm', fontSize: '9pt' }}>
          <thead>
            <tr style={{ background: colors.lightGray, color: colors.textSecondary, textAlign: 'left' }}>
              <th style={{ padding: '3mm', width: '10mm', borderBottom: `0.2mm solid ${colors.borderGray}` }}>{p.labels.thNo}</th>
              <th style={{ padding: '3mm', borderBottom: `0.2mm solid ${colors.borderGray}` }}>{p.labels.thDesc}</th>
              <th style={{ padding: '3mm', textAlign: 'right', borderBottom: `0.2mm solid ${colors.borderGray}` }}>{p.labels.thQty}</th>
              <th style={{ padding: '3mm', textAlign: 'right', borderBottom: `0.2mm solid ${colors.borderGray}` }}>{p.labels.thPrice}</th>
              <th style={{ padding: '3mm', textAlign: 'right', borderBottom: `0.2mm solid ${colors.borderGray}` }}>{p.labels.thAmount}</th>
            </tr>
          </thead>
          <tbody>
            {p.order.items.map((item, idx) => (
              <tr key={idx} style={{ background: idx % 2 === 1 ? '#FCFDFE' : 'transparent' }}>
                <td style={{ padding: '3mm', borderBottom: `0.1mm solid ${colors.borderGray}` }}>{idx + 1}</td>
                <td style={{ padding: '3mm', borderBottom: `0.1mm solid ${colors.borderGray}` }}>{item.name}</td>
                <td style={{ padding: '3mm', textAlign: 'right', borderBottom: `0.1mm solid ${colors.borderGray}` }}>{item.qty}</td>
                <td style={{ padding: '3mm', textAlign: 'right', borderBottom: `0.1mm solid ${colors.borderGray}` }}>
                  {item.unit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td style={{ padding: '3mm', textAlign: 'right', fontWeight: 'bold', borderBottom: `0.1mm solid ${colors.borderGray}` }}>
                  {(item.qty * item.unit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Total Box */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '5mm' }}>
          <div style={{
            background: colors.primary,
            color: '#fff',
            width: '65mm',
            padding: '3mm 5mm',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontWeight: 'bold'
          }}>
            <span>TOTAL</span>
            <span style={{ fontSize: '11pt' }}>
              {p.order.currencySymbol} {p.order.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* 5. Remarks & Bank */}
      <div style={{ marginTop: 'auto', paddingTop: '5mm' }}>
        <div style={{ fontSize: '8pt', color: colors.textSecondary, marginBottom: '4mm', fontStyle: 'italic' }}>
          {p.order.totalWords}
        </div>
        {p.notes.length > 0 && (
          <div style={{ marginBottom: '6mm' }}>
            <SectionHeader title="REMARKS" />
            <div style={{ fontSize: '8pt', color: colors.textSecondary, marginTop: '2mm', lineHeight: 1.6 }}>
              {p.notes.map((note, i) => (
                <div key={i}>{i + 1}. {note}</div>
              ))}
            </div>
          </div>
        )}

        {(p.bank?.bankName || p.bank?.bankAccountNo) && (
          <div>
            <SectionHeader title="PAYMENT METHOD" />
            <div style={{
              background: colors.lightGray,
              border: `0.2mm solid ${colors.borderGray}`,
              marginTop: '3mm',
              padding: '4mm',
              display: 'flex',
              gap: '12mm',
              fontSize: '8pt'
            }}>
              <div>
                <div style={{ color: colors.textSecondary, marginBottom: '1mm' }}>Bank Name</div>
                <div style={{ fontWeight: 'bold' }}>{p.bank?.bankName}</div>
              </div>
              <div>
                <div style={{ color: colors.textSecondary, marginBottom: '1mm' }}>Account Holder</div>
                <div style={{ fontWeight: 'bold' }}>{p.seller.name}</div>
              </div>
              <div>
                <div style={{ color: colors.textSecondary, marginBottom: '1mm' }}>Account Number</div>
                <div style={{ fontWeight: 'bold' }}>{p.bank?.bankAccountNo}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 6. Footer */}
      <div style={{ textAlign: 'center', marginTop: '10mm', fontSize: '7pt', color: colors.textSecondary }}>
        <div style={{ marginTop: '1mm' }}>This is a computer-generated document and no signature is required.</div>
      </div>
    </div>
  )
})

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <div style={{ position: 'relative' }}>
    <div style={{ fontSize: '11pt', fontWeight: 'bold', color: colors.textMain }}>{title}</div>
    <div style={{ width: '15mm', height: '0.5mm', background: colors.primary, marginTop: '1mm' }} />
  </div>
)

export default InvoiceA4Render
