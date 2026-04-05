import React, { forwardRef, useMemo } from 'react'
import type { InvoiceTemplateConfig, InvoiceTextStyle } from '@/types'

const A4 = { w: 210, h: 297 } // mm
const MM_TO_PX = 96 / 25.4

type Blocks = NonNullable<NonNullable<InvoiceTemplateConfig['layout']>['blocks']>

export type InvoiceA4PreviewModel = {
  seller: {
    name: string
    regNo?: string
    addressLines: string[]
    phone?: string
    fax?: string
  }
  invoice: {
    invoiceNo: string
    invoiceDate: string
    terms?: string
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

const cssTextStyle = (s?: InvoiceTextStyle, fallback = 10) => {
  const fontSize = (typeof s?.fontSize === 'number' && Number.isFinite(s.fontSize)) ? s.fontSize : fallback
  return {
    // visually closer to jsPDF default rendering
    fontSize: `${Math.max(8, Math.round(fontSize * (96 / 72)))}px`,
    fontWeight: s?.bold ? 700 : 400,
    fontStyle: s?.italic ? 'italic' : 'normal',
    textDecoration: s?.underline ? 'underline' : 'none',
    lineHeight: 1.2,
    color: '#000',
    wordBreak: 'break-word' as const,
    whiteSpace: 'pre-wrap' as const,
  }
}

const blockKeys: Array<keyof Blocks> = [
  'sellerHeader',
  'dividerHeaderToCustomer',
  'invoiceToBox',
  'invoiceMetaBox',
  'dividerCustomerToItems',
  'itemsTable',
  'totals',
  'notes',
  'footer',
  'signature',
]

export interface InvoiceA4RenderProps {
  blocks: Blocks
  preview: InvoiceA4PreviewModel
}

export const InvoiceA4Render = forwardRef<HTMLDivElement, InvoiceA4RenderProps>(({ blocks, preview }, ref) => {
  const pagePx = useMemo(() => ({ w: Math.round(A4.w * MM_TO_PX), h: Math.round(A4.h * MM_TO_PX) }), [])
  const p = preview

  return (
    <div
      ref={ref}
      style={{
        width: `${pagePx.w}px`,
        height: `${pagePx.h}px`,
        background: '#fff',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {blockKeys.map((k) => {
        const b: any = (blocks as any)?.[k]
        if (!b) return null
        const x = Math.round(Number(b.x || 0) * MM_TO_PX)
        const y = Math.round(Number(b.y || 0) * MM_TO_PX)
        const w = Math.round(Number(b.w || 0) * MM_TO_PX)
        const h = Math.max(2, Math.round(Number(b.h || 0) * MM_TO_PX))

        const styleBase: React.CSSProperties = {
          position: 'absolute',
          left: x,
          top: y,
          width: w,
          height: h,
          boxSizing: 'border-box',
        }

        if (k === 'dividerHeaderToCustomer' || k === 'dividerCustomerToItems') {
          const lw = Math.max(1, Math.round(Number(b.lineWidth || 0.2) * MM_TO_PX))
          return (
            <div key={String(k)} style={styleBase}>
              <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', borderTop: `${lw}px solid #000`, transform: 'translateY(-50%)' }} />
            </div>
          )
        }

        if (k === 'sellerHeader') {
          const s: InvoiceTextStyle | undefined = b.style
          return (
            <div key={String(k)} style={{ ...styleBase, padding: 0 }}>
              <div style={{ ...cssTextStyle(s, 10.5), textAlign: 'center' }}>
                <div>
                  <span style={{ fontWeight: 800 }}>{p.seller.name}</span>
                  {p.seller.regNo ? (
                    <span style={{ fontSize: '0.72em', verticalAlign: 'sub', marginLeft: 4 }}>
                      ({p.seller.regNo})
                    </span>
                  ) : null}
                </div>
                {p.seller.addressLines.map((ln, idx) => (
                  <div key={idx}>{ln}</div>
                ))}
              </div>
            </div>
          )
        }

        if (k === 'invoiceToBox') {
          const s: InvoiceTextStyle | undefined = b.style
          return (
            <div key={String(k)} style={{ ...styleBase, padding: 0 }}>
              <div style={{ ...cssTextStyle(s, 10), height: '100%', display: 'flex', flexDirection: 'column', padding: 0 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{p.invoice.invoiceTo.name}</div>
                  <div style={{ marginTop: 2 }}>{p.invoice.invoiceTo.address}</div>
                </div>
                <div style={{ marginTop: 'auto' }}>
                  <div>Attn :</div>
                  <div>TEL : {p.invoice.invoiceTo.phone}</div>
                </div>
              </div>
            </div>
          )
        }

        if (k === 'invoiceMetaBox') {
          const s: InvoiceTextStyle | undefined = b.style
          return (
            <div key={String(k)} style={{ ...styleBase, padding: 0 }}>
              <div style={{ ...cssTextStyle(s, 10), padding: 0 }}>
                <div style={{ fontWeight: 800 }}>{p.labels.invoiceTitle}</div>
                <div>: {p.invoice.invoiceNo}</div>
                <div style={{ marginTop: 4 }}>Terms : {p.invoice.terms || ''}</div>
                <div>Date : {p.invoice.invoiceDate}</div>
                <div>Page : {p.invoice.page || '1 of 1'}</div>
              </div>
            </div>
          )
        }

        if (k === 'itemsTable') {
          const s: InvoiceTextStyle | undefined = b.style
          const rows = p.order.items.slice(0, 10)
          return (
            <div key={String(k)} style={{ ...styleBase, padding: 0 }}>
              <div style={{ ...cssTextStyle(s, 10), height: '100%' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '28px 1fr 44px 70px 70px',
                  gap: 4,
                  fontWeight: 800,
                  borderBottom: '1px solid rgba(0,0,0,0.65)',
                  paddingBottom: 4,
                  marginBottom: 4,
                }}>
                  <div>{p.labels.thNo}</div>
                  <div>{p.labels.thDesc}</div>
                  <div style={{ textAlign: 'right' }}>{p.labels.thQty}</div>
                  <div style={{ textAlign: 'right' }}>{p.labels.thPrice}</div>
                  <div style={{ textAlign: 'right' }}>{p.labels.thAmount}</div>
                </div>
                {rows.map((r, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '28px 1fr 44px 70px 70px',
                      gap: 4,
                      padding: '2px 0',
                      borderBottom: '1px dotted rgba(0,0,0,0.18)',
                    }}
                  >
                    <div>{idx + 1}</div>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
                    <div style={{ textAlign: 'right' }}>{r.qty}</div>
                    <div style={{ textAlign: 'right' }}>{r.unit.toFixed(2)}</div>
                    <div style={{ textAlign: 'right' }}>{(r.qty * r.unit).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>
          )
        }

        if (k === 'totals') {
          const s: InvoiceTextStyle | undefined = b.style
          return (
            <div key={String(k)} style={{ ...styleBase, padding: 0 }}>
              <div style={cssTextStyle(s, 10)}>
                <div style={{ opacity: 0.85 }}>{p.order.totalWords || 'RINGGIT MALAYSIA : ...'}</div>
                <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                  <div>Total</div>
                  <div>{p.order.currencySymbol} {p.order.total.toFixed(2)}</div>
                </div>
              </div>
            </div>
          )
        }

        if (k === 'notes') {
          const s: InvoiceTextStyle | undefined = b.style
          return (
            <div key={String(k)} style={{ ...styleBase, padding: 0 }}>
              <div style={cssTextStyle(s, 10)}>
                <div style={{ fontWeight: 800 }}>Notes :</div>
                {p.notes.slice(0, 8).map((n, idx) => (
                  <div key={idx}>{idx + 1}. {n}</div>
                ))}
                {(p.bank?.bankName || p.bank?.bankAccountNo) && (
                  <div style={{ marginTop: 6 }}>
                    {p.bank.bankName && <div>Bank : {p.bank.bankName}</div>}
                    {p.bank.bankAccountNo && <div>Account No: {p.bank.bankAccountNo}</div>}
                  </div>
                )}
              </div>
            </div>
          )
        }

        if (k === 'footer') {
          const s: InvoiceTextStyle | undefined = b.style
          return (
            <div key={String(k)} style={{ ...styleBase, padding: 0 }}>
              <div style={{ ...cssTextStyle(s, 10), display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ flex: 1, textAlign: 'center' }}>E. & O.E</div>
                <div style={{ textAlign: 'right' }}>
                  <div>COMPUTER GENERATED INVOICE</div>
                  <div>NO SIGNATURE REQUIRED</div>
                </div>
              </div>
            </div>
          )
        }

        if (k === 'signature') {
          const s: InvoiceTextStyle | undefined = b.style
          return (
            <div key={String(k)} style={{ ...styleBase, padding: 0 }}>
              <div style={{ ...cssTextStyle(s, 10), height: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div style={{ width: '48%' }}>
                  <div style={{ borderTop: '1px solid rgba(0,0,0,0.65)', marginBottom: 4 }} />
                  <div style={{ textAlign: 'center' }}>Acknowledgment of receipt</div>
                </div>
                <div style={{ width: '48%' }}>
                  <div style={{ borderTop: '1px solid rgba(0,0,0,0.65)', marginBottom: 4 }} />
                  <div style={{ textAlign: 'center' }}>FOR {p.seller.name}</div>
                </div>
              </div>
            </div>
          )
        }

        return null
      })}
    </div>
  )
})

InvoiceA4Render.displayName = 'InvoiceA4Render'

export default InvoiceA4Render


