import dayjs from 'dayjs'
import type { AppConfig, Order, OrderInvoiceMeta } from '@/types'

type SellerProfile = NonNullable<AppConfig['invoice']>

const defaultSellerProfile: SellerProfile = {
  sellerName: 'JEP VENTURES SDN BHD',
  sellerRegNo: '',
  sellerAddressLines: [],
  sellerPhone: '',
  sellerFax: '',
  bankName: '',
  bankAccountNo: '',
  notes: [],
}

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

// 简化版英文金额转文字（覆盖常见账单金额范围）
const numberToEnglishWords = (amount: number) => {
  const ones = [
    'ZERO','ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT','NINE','TEN',
    'ELEVEN','TWELVE','THIRTEEN','FOURTEEN','FIFTEEN','SIXTEEN','SEVENTEEN','EIGHTEEN','NINETEEN'
  ]
  const tens = ['','', 'TWENTY','THIRTY','FORTY','FIFTY','SIXTY','SEVENTY','EIGHTY','NINETY']

  const toWordsUnder1000 = (n: number): string => {
    const parts: string[] = []
    const hundred = Math.floor(n / 100)
    const rest = n % 100
    if (hundred > 0) parts.push(`${ones[hundred]} HUNDRED`)
    if (rest > 0) {
      if (rest < 20) parts.push(ones[rest])
      else {
        const t = Math.floor(rest / 10)
        const o = rest % 10
        parts.push(o ? `${tens[t]}-${ones[o]}` : tens[t])
      }
    }
    return parts.join(' ')
  }

  const toWords = (n: number): string => {
    if (n === 0) return 'ZERO'
    const parts: string[] = []
    const millions = Math.floor(n / 1_000_000)
    const thousands = Math.floor((n % 1_000_000) / 1_000)
    const remainder = n % 1_000
    if (millions) parts.push(`${toWordsUnder1000(millions)} MILLION`)
    if (thousands) parts.push(`${toWordsUnder1000(thousands)} THOUSAND`)
    if (remainder) parts.push(toWordsUnder1000(remainder))
    return parts.join(' ')
  }

  const safe = Number.isFinite(amount) ? amount : 0
  const ringgit = Math.floor(safe)
  const cents = Math.round((safe - ringgit) * 100)
  const ringgitWords = toWords(ringgit)
  const centsWords = toWords(cents)
  return `RINGGIT MALAYSIA : ${ringgitWords}${cents > 0 ? ` AND ${centsWords} CENTS` : ''}`
}

export interface InvoicePrintPayload {
  order: Order
  invoice: OrderInvoiceMeta
  appConfig?: AppConfig | null
  currencySymbol?: string // default: RM
  autoPrint?: boolean
}

export const openInvoicePrintWindow = (payload: InvoicePrintPayload): boolean => {
  if (typeof window === 'undefined') return false

  const w = window.open('', '_blank', 'noopener,noreferrer')
  if (!w) return false

  const { order, invoice, appConfig, currencySymbol = 'RM', autoPrint = true } = payload
  const seller = { ...defaultSellerProfile, ...(appConfig?.invoice || {}) }

  const createdDate = order.createdAt
    ? (typeof (order.createdAt as any)?.toDate === 'function' ? (order.createdAt as any).toDate() : (order.createdAt as any))
    : new Date()

  const invoiceDate = typeof (invoice.invoiceDate as any)?.toDate === 'function'
    ? (invoice.invoiceDate as any).toDate()
    : new Date(invoice.invoiceDate)

  const items = Array.isArray(order.items) ? order.items : []
  const rowsHtml = items
    .map((it, idx) => {
      const qty = Number(it.quantity || 0)
      const unit = Number(it.price || 0)
      const amount = qty * unit
      return `
        <tr>
          <td class="c-no">${idx + 1}</td>
          <td class="c-desc">${escapeHtml(String(it.name || it.cigarId || ''))}</td>
          <td class="c-qty">${qty}</td>
          <td class="c-unit">${unit.toFixed(2)}</td>
          <td class="c-amt">${amount.toFixed(2)}</td>
        </tr>
      `
    })
    .join('')

  const total = Number(order.total || 0)
  const totalWords = numberToEnglishWords(total)

  const sellerAddressLines = (seller.sellerAddressLines || []).filter(Boolean)
  const sellerReg = seller.sellerRegNo ? ` (${seller.sellerRegNo})` : ''

  const notes: string[] = (seller.notes || []).filter(Boolean)

  const html = `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Invoice ${escapeHtml(invoice.invoiceNo)}</title>
      <style>
        @page { size: A4; margin: 12mm; }
        html, body { margin: 0; padding: 0; }
        body { font-family: Arial, Helvetica, sans-serif; color: #000; }
        .page { width: 210mm; min-height: 297mm; padding: 12mm; box-sizing: border-box; }
        .row { display: flex; justify-content: space-between; gap: 12mm; }
        .seller { text-align: center; margin-top: 6mm; }
        .seller .name { font-weight: 700; letter-spacing: 0.2mm; }
        .seller .line { font-size: 12px; line-height: 1.35; }
        .divider { border-top: 1px solid #000; margin: 8mm 0; }
        .box { border: 1px solid #000; padding: 4mm; min-height: 22mm; }
        .box-title { font-weight: 700; margin-bottom: 3mm; }
        .meta { font-size: 12px; line-height: 1.6; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        thead th { border-bottom: 1px solid #000; padding: 2mm 1mm; text-align: left; }
        tbody td { padding: 2mm 1mm; vertical-align: top; }
        .c-no { width: 10mm; }
        .c-qty { width: 16mm; text-align: right; }
        .c-unit { width: 28mm; text-align: right; }
        .c-amt { width: 30mm; text-align: right; }
        .totals { display: flex; justify-content: space-between; align-items: center; margin-top: 6mm; font-size: 12px; }
        .total-box { border: 1px solid #000; padding: 2mm 4mm; min-width: 40mm; text-align: right; font-weight: 700; }
        .notes { margin-top: 6mm; font-size: 12px; }
        .notes .label { font-weight: 700; margin-bottom: 2mm; }
        .foot { display: flex; justify-content: space-between; margin-top: 10mm; font-size: 12px; }
        .sig { margin-top: 10mm; display: flex; justify-content: space-between; gap: 12mm; font-size: 12px; }
        .sig .line { border-top: 1px solid #000; padding-top: 2mm; text-align: center; width: 70mm; }
        .right { text-align: right; }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="seller">
          <div class="name">${escapeHtml(seller.sellerName || 'JEP VENTURES SDN BHD')}${escapeHtml(sellerReg)}</div>
          ${sellerAddressLines.map(l => `<div class="line">${escapeHtml(l)}</div>`).join('')}
        </div>

        <div class="divider"></div>

        <div class="row">
          <div class="box" style="flex: 1;">
            <div class="box-title">${escapeHtml(invoice.invoiceTo.name || '')}</div>
            <div class="meta">Attn : </div>
            <div class="meta">TEL : ${escapeHtml(invoice.invoiceTo.phone || '')}</div>
            <div class="meta">${escapeHtml(invoice.invoiceTo.address || '')}</div>
          </div>
          <div class="box" style="width: 80mm;">
            <div class="meta"><b>INVOICE</b> : <b>${escapeHtml(invoice.invoiceNo)}</b></div>
            <div class="meta">Your Ref. : </div>
            <div class="meta">Our D/O No : </div>
            <div class="meta">Terms : ${escapeHtml(invoice.terms || '')}</div>
            <div class="meta">Date : ${escapeHtml(dayjs(invoiceDate).format('DD/MM/YYYY'))}</div>
            <div class="meta">Page : 1 of 1</div>
          </div>
        </div>

        <div class="divider"></div>

        <table>
          <thead>
            <tr>
              <th class="c-no">No</th>
              <th>Description</th>
              <th class="c-qty right">Qty</th>
              <th class="c-unit right">Price/Unit</th>
              <th class="c-amt right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="totals">
          <div>${escapeHtml(totalWords)}</div>
          <div>
            <span style="margin-right: 6mm;">Total</span>
            <span class="total-box">${escapeHtml(currencySymbol)} ${total.toFixed(2)}</span>
          </div>
        </div>

        <div class="notes">
          <div class="label">Notes :</div>
          <ol style="margin: 0; padding-left: 18px;">
            ${notes.map(n => `<li>${escapeHtml(n)}</li>`).join('')}
          </ol>
          ${(seller.bankName || seller.bankAccountNo) ? `
            <div style="margin-top: 4mm;">
              <div><b>${escapeHtml(seller.sellerName || 'JEP VENTURES SDN BHD')}</b></div>
              <div>Bank : ${escapeHtml(seller.bankName || '')}</div>
              <div>Account No: ${escapeHtml(seller.bankAccountNo || '')}</div>
            </div>
          ` : ''}
        </div>

        <div class="foot">
          <div>E. & O.E</div>
          <div class="right">
            <div>COMPUTER GENERATED INVOICE</div>
            <div>NO SIGNATURE REQUIRED</div>
          </div>
        </div>

        <div class="sig">
          <div class="line">Acknowledgment of receipt</div>
          <div class="line">FOR &nbsp;&nbsp; ${escapeHtml(seller.sellerName || 'JEP VENTURES SDN BHD')}</div>
        </div>

        <div style="display:none">${escapeHtml(dayjs(createdDate).toISOString())}</div>
      </div>
      ${autoPrint ? `<script>window.addEventListener('load', () => { setTimeout(() => { window.print(); }, 250); });</script>` : ''}
    </body>
  </html>`

  w.document.open()
  w.document.write(html)
  w.document.close()
  return true
}


