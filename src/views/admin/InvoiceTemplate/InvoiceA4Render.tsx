import React, { forwardRef, useMemo } from 'react'
import dayjs from 'dayjs'
import { INVOICE_COLORS } from '@/utils/invoiceTheme'
import { numberToEnglishWords } from '@/utils/format/numberFormat'

const A4 = { w: 210, h: 297 } // mm
const MM_TO_PX = 96 / 25.4

/**
 * Estimated heights (mm) for layout budget calculation.
 * These are approximate and tuned for the current template design.
 */
const LAYOUT = {
  pagePadding: 15,       // top + bottom padding each side
  header: 30,            // dark header band
  title: 14,             // "INVOICE" title
  customerInfo: 40,      // customer info + metadata block
  tableHeader: 12,       // ITEM DETAILS section header + thead
  tableRowBase: 8,       // base height per item row (single-line)
  tableRowLineExtra: 4,  // extra height per additional line in pre-wrap name
  totalBox: 18,          // total box
  remarksBank: 55,       // remarks + bank + total words (generous)
  footer: 12,            // footer text
}

const ITEMS_PER_PAGE_FIRST = 8   // conservative default for first page
const ITEMS_PER_PAGE_CONT = 12   // continuation pages have no remarks/footer


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
      invoiceDate: dayjs(invoice.invoiceDate).format('DD MMM YYYY'),
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

/**
 * Estimate how many text lines an item name will take (accounts for \n in pre-wrap).
 */
const estimateItemLines = (name: string): number => {
  return Math.max(1, (name || '').split('\n').length)
}

/**
 * Compute the available mm budget for item rows on a given page type.
 * A4 total content height = 297 - 15*2 = 267mm
 */
const computeAvailableHeight = (isLastPage: boolean): number => {
  const contentH = A4.h - LAYOUT.pagePadding * 2
  const fixedH = LAYOUT.header + LAYOUT.title + LAYOUT.customerInfo + LAYOUT.tableHeader
  const bottomH = isLastPage
    ? (LAYOUT.totalBox + LAYOUT.remarksBank + LAYOUT.footer)
    : LAYOUT.footer // non-last pages only have a tiny footer
  return contentH - fixedH - bottomH
}

/**
 * Split items across pages, respecting available height budgets.
 */
const paginateItems = (
  items: Array<{ name: string; qty: number; unit: number }>
): Array<Array<{ item: { name: string; qty: number; unit: number }; globalIndex: number }>> => {
  if (items.length === 0) return [[]]

  const pages: Array<Array<{ item: { name: string; qty: number; unit: number }; globalIndex: number }>> = []
  let currentPage: Array<{ item: { name: string; qty: number; unit: number }; globalIndex: number }> = []
  let usedHeight = 0
  let isFirstPage = true

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const lines = estimateItemLines(item.name)
    const rowH = LAYOUT.tableRowBase + (lines - 1) * LAYOUT.tableRowLineExtra

    // Determine if this is possibly the last page (optimistic: assume remaining items fit)
    // We'll adjust after the loop
    const availH = isFirstPage
      ? computeAvailableHeight(pages.length === 0 && i === items.length - 1)
      : computeAvailableHeight(false)

    if (usedHeight + rowH > availH && currentPage.length > 0) {
      // Current page is full, push it and start a new one
      pages.push(currentPage)
      currentPage = []
      usedHeight = 0
      isFirstPage = false
    }

    currentPage.push({ item, globalIndex: i })
    usedHeight += rowH
  }

  if (currentPage.length > 0) {
    pages.push(currentPage)
  }

  // Now re-check: if the last page doesn't have enough room for footer/remarks,
  // we may need to move some items. But since we used conservative estimates, 
  // let's do a final pass: the last page needs more bottom space.
  if (pages.length > 1) {
    const lastPage = pages[pages.length - 1]
    let lastPageUsed = lastPage.reduce((sum, entry) => {
      const lines = estimateItemLines(entry.item.name)
      return sum + LAYOUT.tableRowBase + (lines - 1) * LAYOUT.tableRowLineExtra
    }, 0)
    const lastPageAvail = computeAvailableHeight(true)

    // If last page items exceed available height with footer, move overflow back
    while (lastPageUsed > lastPageAvail && lastPage.length > 1) {
      const moved = lastPage.shift()!
      pages[pages.length - 2].push(moved)
      const movedLines = estimateItemLines(moved.item.name)
      lastPageUsed -= LAYOUT.tableRowBase + (movedLines - 1) * LAYOUT.tableRowLineExtra
    }
  }

  return pages
}

// ─────────────────────────────────────────────────────────────────────────────
// Reusable sub-components for each page
// ─────────────────────────────────────────────────────────────────────────────

const PageHeader: React.FC<{ p: InvoiceA4PreviewModel }> = ({ p }) => (
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
)

const PageTitle: React.FC<{ title: string }> = ({ title }) => (
  <div style={{ textAlign: 'center', marginBottom: '5mm' }}>
    <div style={{ fontSize: '20pt', fontWeight: 'bold', color: colors.textMain, textTransform: 'uppercase' }}>
      {title}
    </div>
  </div>
)

const CustomerInfo: React.FC<{ p: InvoiceA4PreviewModel; pageLabel: string }> = ({ p, pageLabel }) => (
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

        <div style={{ flex: 1, minHeight: '12mm' }} />

        <div style={{ display: 'grid', gridTemplateColumns: '25mm 1fr', rowGap: '0mm' }}>
          <div style={{ color: colors.textSecondary }}>Phone</div>
          <div>{p.invoice.invoiceTo.phone}</div>
        </div>
      </div>

      {/* Right Column: Metadata */}
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
        <div style={{ fontWeight: 'bold' }}>{pageLabel}</div>
      </div>
    </div>
  </div>
)

const ItemTable: React.FC<{
  items: Array<{ item: { name: string; qty: number; unit: number }; globalIndex: number }>
  labels: InvoiceA4PreviewModel['labels']
}> = ({ items, labels }) => (
  <div style={{ flex: 1 }}>
    <SectionHeader title="ITEM DETAILS" />
    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '4mm', fontSize: '9pt' }}>
      <thead>
        <tr style={{ background: colors.lightGray, color: colors.textSecondary, textAlign: 'left' }}>
          <th style={{ padding: '3mm', width: '10mm', borderBottom: `0.2mm solid ${colors.borderGray}` }}>{labels.thNo}</th>
          <th style={{ padding: '3mm', borderBottom: `0.2mm solid ${colors.borderGray}` }}>{labels.thDesc}</th>
          <th style={{ padding: '3mm', textAlign: 'right', borderBottom: `0.2mm solid ${colors.borderGray}` }}>{labels.thQty}</th>
          <th style={{ padding: '3mm', textAlign: 'right', borderBottom: `0.2mm solid ${colors.borderGray}` }}>{labels.thPrice}</th>
          <th style={{ padding: '3mm', textAlign: 'right', borderBottom: `0.2mm solid ${colors.borderGray}` }}>{labels.thAmount}</th>
        </tr>
      </thead>
      <tbody>
        {items.map((entry, idx) => (
          <tr key={entry.globalIndex} style={{ background: idx % 2 === 1 ? '#FCFDFE' : 'transparent' }}>
            <td style={{ padding: '3mm', borderBottom: `0.1mm solid ${colors.borderGray}` }}>{entry.globalIndex + 1}</td>
            <td style={{ padding: '3mm', borderBottom: `0.1mm solid ${colors.borderGray}`, whiteSpace: 'pre-wrap' }}>{entry.item.name}</td>
            <td style={{ padding: '3mm', textAlign: 'right', borderBottom: `0.1mm solid ${colors.borderGray}` }}>{entry.item.qty}</td>
            <td style={{ padding: '3mm', textAlign: 'right', borderBottom: `0.1mm solid ${colors.borderGray}` }}>
              {entry.item.unit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </td>
            <td style={{ padding: '3mm', textAlign: 'right', fontWeight: 'bold', borderBottom: `0.1mm solid ${colors.borderGray}` }}>
              {(entry.item.qty * entry.item.unit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

const TotalBox: React.FC<{ p: InvoiceA4PreviewModel }> = ({ p }) => (
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
)

const RemarksAndBank: React.FC<{ p: InvoiceA4PreviewModel }> = ({ p }) => (
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
)

const PageFooter: React.FC = () => (
  <div style={{ textAlign: 'center', marginTop: '10mm', fontSize: '7pt', color: colors.textSecondary }}>
    <div style={{ marginTop: '1mm' }}>This is a computer-generated document and no signature is required.</div>
  </div>
)

export const InvoiceA4Render = forwardRef<HTMLDivElement, InvoiceA4RenderProps>(({ preview }, ref) => {
  const pagePx = useMemo(() => ({ w: Math.round(A4.w * MM_TO_PX), h: Math.round(A4.h * MM_TO_PX) }), [])
  const p = preview

  const pages = useMemo(() => paginateItems(p.order.items), [p.order.items])
  const totalPages = pages.length

  const pageStyle: React.CSSProperties = {
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
  }

  return (
    <div ref={ref} className="invoice-a4-pages">
      {pages.map((pageItems, pageIdx) => {
        const isLastPage = pageIdx === totalPages - 1
        const pageLabel = `${pageIdx + 1} of ${totalPages}`

        return (
          <div
            key={pageIdx}
            style={{
              ...pageStyle,
              marginBottom: isLastPage ? 0 : '10mm',
            }}
            data-page-index={pageIdx}
          >
            {/* 1. Header (Dark) */}
            <PageHeader p={p} />

            {/* 2. Main Title */}
            <PageTitle title={p.labels.invoiceTitle} />

            {/* 3. Customer Info */}
            <CustomerInfo p={p} pageLabel={pageLabel} />

            {/* 4. Item Details Table */}
            <ItemTable items={pageItems} labels={p.labels} />

            {/* 5. Last page only: Total Box + Remarks & Bank */}
            {isLastPage && (
              <>
                <TotalBox p={p} />
                <RemarksAndBank p={p} />
              </>
            )}

            {/* 6. Footer */}
            <PageFooter />
          </div>
        )
      })}
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
