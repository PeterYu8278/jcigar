import dayjs from 'dayjs'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { AppConfig, InvoiceTemplateConfig, InvoiceTextStyle, Order, OrderInvoiceMeta } from '@/types'

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

const toNum = (val: any, fallback: number): number => {
  const n = Number(val)
  return Number.isFinite(n) ? n : fallback
}

const fontStyleOf = (s?: InvoiceTextStyle) => {
  const bold = !!s?.bold
  const italic = !!s?.italic
  if (bold && italic) return 'bolditalic'
  if (bold) return 'bold'
  if (italic) return 'italic'
  return 'normal'
}

const applyTextStyle = (doc: jsPDF, s?: InvoiceTextStyle, fallbackSize = 10) => {
  doc.setFont('helvetica', fontStyleOf(s) as any)
  doc.setFontSize(toNum(s?.fontSize, fallbackSize))
}

const textWithUnderline = (
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  opts: { align?: 'left' | 'center' | 'right' } = {},
  s?: InvoiceTextStyle
) => {
  const align = opts.align || 'left'
  doc.text(text, x, y, { align })
  if (!s?.underline) return
  const w = doc.getTextWidth(text)
  const startX = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x
  const endX = startX + w
  doc.setLineWidth(0.2)
  doc.line(startX, y + 1.2, endX, y + 1.2)
}

export interface InvoicePdfPayload {
  order: Order
  invoice: OrderInvoiceMeta
  appConfig?: AppConfig | null
  currencySymbol?: string // default: RM
  filename?: string
}

const defaultTemplate: InvoiceTemplateConfig = {
  version: 1,
  layout: {
    marginMm: 12,
    rightBoxWidthMm: 80,
    infoBoxHeightMm: 34,
    footerYmm: 268,
    signatureYmm: 283,
    blocks: {
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
    },
  },
  labels: {
    invoiceTitle: 'INVOICE',
    yourRef: 'Your Ref.',
    ourDoNo: 'Our D/O No',
    terms: 'Terms',
    date: 'Date',
    page: 'Page',
    pageValue: '1 of 1',
    notes: 'Notes :',
    total: 'Total',
    eoe: 'E. & O.E',
    computerGenerated: 'COMPUTER GENERATED INVOICE',
    noSignature: 'NO SIGNATURE REQUIRED',
    ackReceipt: 'Acknowledgment of receipt',
    forCompany: 'FOR',
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
    layout: {
      ...defaultTemplate.layout,
      ...(tpl.layout || {}),
      blocks: {
        ...(defaultTemplate.layout?.blocks || {}),
        ...((tpl.layout as any)?.blocks || {}),
      },
    },
    labels: { ...defaultTemplate.labels, ...(tpl.labels || {}) },
    table: { ...defaultTemplate.table, ...(tpl.table || {}), headers: { ...defaultTemplate.table?.headers, ...(tpl.table?.headers || {}) } },
    show: { ...defaultTemplate.show, ...(tpl.show || {}) },
  }
}

const buildInvoicePdfDoc = (payload: InvoicePdfPayload) => {
  const { order, invoice, appConfig } = payload
  const seller = { ...defaultSellerProfile, ...(appConfig?.invoice || {}) }
  const template = mergeTemplate(appConfig?.invoiceTemplate)
  const currencySymbol = payload.currencySymbol || template.table?.currencySymbol || 'RM'

  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
    compress: true,
  })

  // Page metrics
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = toNum(template.layout?.marginMm, 12)
  const contentWidth = pageWidth - margin * 2
  const rawBlocks = (template.layout?.blocks || defaultTemplate.layout?.blocks) as NonNullable<NonNullable<InvoiceTemplateConfig['layout']>['blocks']>
  const blocks = {
    sellerHeader: {
      x: toNum(rawBlocks?.sellerHeader?.x, 12),
      y: toNum(rawBlocks?.sellerHeader?.y, 12),
      w: toNum(rawBlocks?.sellerHeader?.w, 186),
      h: toNum(rawBlocks?.sellerHeader?.h, 20),
      style: rawBlocks?.sellerHeader?.style,
    },
    invoiceToBox: {
      x: toNum(rawBlocks?.invoiceToBox?.x, 12),
      y: toNum(rawBlocks?.invoiceToBox?.y, 50),
      w: toNum(rawBlocks?.invoiceToBox?.w, 118),
      h: toNum(rawBlocks?.invoiceToBox?.h, 34),
      style: rawBlocks?.invoiceToBox?.style,
    },
    invoiceMetaBox: {
      x: toNum(rawBlocks?.invoiceMetaBox?.x, 130),
      y: toNum(rawBlocks?.invoiceMetaBox?.y, 50),
      w: toNum(rawBlocks?.invoiceMetaBox?.w, 68),
      h: toNum(rawBlocks?.invoiceMetaBox?.h, 34),
      style: rawBlocks?.invoiceMetaBox?.style,
    },
    dividerHeaderToCustomer: {
      x: toNum(rawBlocks?.dividerHeaderToCustomer?.x, 12),
      y: toNum(rawBlocks?.dividerHeaderToCustomer?.y, 40),
      w: toNum(rawBlocks?.dividerHeaderToCustomer?.w, 186),
      h: toNum(rawBlocks?.dividerHeaderToCustomer?.h, 0.5),
      lineWidth: toNum(rawBlocks?.dividerHeaderToCustomer?.lineWidth, 0.2),
      style: rawBlocks?.dividerHeaderToCustomer?.style,
    },
    dividerCustomerToItems: {
      x: toNum(rawBlocks?.dividerCustomerToItems?.x, 12),
      y: toNum(rawBlocks?.dividerCustomerToItems?.y, 90),
      w: toNum(rawBlocks?.dividerCustomerToItems?.w, 186),
      h: toNum(rawBlocks?.dividerCustomerToItems?.h, 0.5),
      lineWidth: toNum(rawBlocks?.dividerCustomerToItems?.lineWidth, 0.2),
      style: rawBlocks?.dividerCustomerToItems?.style,
    },
    itemsTable: {
      x: toNum(rawBlocks?.itemsTable?.x, 12),
      y: toNum(rawBlocks?.itemsTable?.y, 92),
      w: toNum(rawBlocks?.itemsTable?.w, 186),
      h: toNum(rawBlocks?.itemsTable?.h, 120),
      style: rawBlocks?.itemsTable?.style,
    },
    totals: {
      x: toNum(rawBlocks?.totals?.x, 12),
      y: toNum(rawBlocks?.totals?.y, 215),
      w: toNum(rawBlocks?.totals?.w, 186),
      h: toNum(rawBlocks?.totals?.h, 18),
      style: rawBlocks?.totals?.style,
    },
    notes: {
      x: toNum(rawBlocks?.notes?.x, 12),
      y: toNum(rawBlocks?.notes?.y, 235),
      w: toNum(rawBlocks?.notes?.w, 186),
      h: toNum(rawBlocks?.notes?.h, 28),
      style: rawBlocks?.notes?.style,
    },
    footer: {
      x: toNum(rawBlocks?.footer?.x, 12),
      y: toNum(rawBlocks?.footer?.y, 268),
      w: toNum(rawBlocks?.footer?.w, 186),
      h: toNum(rawBlocks?.footer?.h, 10),
      style: rawBlocks?.footer?.style,
    },
    signature: {
      x: toNum(rawBlocks?.signature?.x, 12),
      y: toNum(rawBlocks?.signature?.y, 283),
      w: toNum(rawBlocks?.signature?.w, 186),
      h: toNum(rawBlocks?.signature?.h, 12),
      style: rawBlocks?.signature?.style,
    },
  } as Required<NonNullable<NonNullable<InvoiceTemplateConfig['layout']>['blocks']>>

  // Use blocks' overall bounds as the "content" bounds when drawing full-width lines/text.
  // This makes the PDF align with what users see in the A4 designer (WYSIWYG).
  const all = Object.values(blocks)
  const contentLeftX = toNum(
    all.reduce((min, b) => Math.min(min, toNum((b as any)?.x, margin)), Number.POSITIVE_INFINITY),
    margin
  )
  const contentRightX = toNum(
    all.reduce((max, b) => Math.max(max, toNum((b as any)?.x, margin) + toNum((b as any)?.w, contentWidth)), 0),
    pageWidth - margin
  )
  const contentLineLeftX = Math.max(0, Math.min(pageWidth, contentLeftX))
  const contentLineRightX = Math.max(contentLineLeftX, Math.min(pageWidth, contentRightX))
  const contentLineW = Math.max(10, contentLineRightX - contentLineLeftX)

  const invoiceDate = toDateSafe(invoice.invoiceDate)
  const total = Number(order.total || 0)

  // Typography
  doc.setFont('helvetica', 'normal')

  // Seller header (centered)
  let y = toNum(blocks.sellerHeader.y, 18) + 6
  const headerStyle = blocks.sellerHeader.style
  const nameText = String(seller.sellerName || 'JEP VENTURES SDN BHD')
  const regText = seller.sellerRegNo ? ` (${String(seller.sellerRegNo)})` : ''
  const headerCenterX = toNum(blocks.sellerHeader.x, margin) + (toNum(blocks.sellerHeader.w, contentWidth) / 2)

  // Company name: always bold; Reg No: subscript (smaller + slightly lower baseline)
  const baseHeaderSize = toNum(headerStyle?.fontSize, 10.5)
  const nameStyle: InvoiceTextStyle = { ...(headerStyle || {}), bold: true, fontSize: baseHeaderSize + 3 }
  const regStyle: InvoiceTextStyle = { ...(headerStyle || {}), fontSize: Math.max(6, baseHeaderSize + 3 - 5) }

  applyTextStyle(doc, nameStyle, 14)
  const nameW = doc.getTextWidth(nameText)
  applyTextStyle(doc, regStyle, 9)
  const regW = regText ? doc.getTextWidth(regText) : 0
  const totalW = nameW + regW
  const startX = headerCenterX - totalW / 2

  applyTextStyle(doc, nameStyle, 14)
  doc.text(nameText, startX, y)
  if (regText) {
    applyTextStyle(doc, regStyle, 9)
    doc.text(regText, startX + nameW, y + 1.6) // subscript offset
  }
  if (headerStyle?.underline) {
    doc.setLineWidth(0.2)
    doc.line(startX, y + 1.2, startX + totalW, y + 1.2)
  }

  applyTextStyle(doc, headerStyle, 10.5)
  const addressLines = (seller.sellerAddressLines || []).filter(Boolean)
  addressLines.forEach((line) => {
    y += 5
    textWithUnderline(doc, String(line), headerCenterX, y, { align: 'center' }, headerStyle)
  })

  // Divider: company header ↔ customer info
  const divider1Y = toNum(blocks.dividerHeaderToCustomer?.y, Math.max(y + 10, toNum(blocks.invoiceToBox.y, y + 10) - 6))
  const divider1X = toNum(blocks.dividerHeaderToCustomer?.x, contentLineLeftX)
  const divider1W = Math.max(10, toNum(blocks.dividerHeaderToCustomer?.w, contentLineW))
  const divider1LW = toNum(blocks.dividerHeaderToCustomer?.lineWidth, 0.2)
  y = divider1Y
  doc.setLineWidth(divider1LW)
  doc.line(divider1X, divider1Y, divider1X + divider1W, divider1Y)

  // Boxes row
  const infoBoxY = toNum(blocks.invoiceToBox.y, y + 10)
  const leftBoxX = toNum(blocks.invoiceToBox.x, margin)
  const leftBoxW = toNum(blocks.invoiceToBox.w, contentWidth - toNum(template.layout?.rightBoxWidthMm, 80))
  const rightBoxX = toNum(blocks.invoiceMetaBox.x, leftBoxX + leftBoxW)
  const rightBoxW = toNum(blocks.invoiceMetaBox.w, toNum(template.layout?.rightBoxWidthMm, 80))
  // Respect per-block heights from the A4 designer.
  // (The meta box needs ≥ 40mm height if you want Page on a separate line below Date.)
  const leftBoxH = toNum(blocks.invoiceToBox.h, toNum(template.layout?.infoBoxHeightMm, 34))
  const rightBoxH = toNum(blocks.invoiceMetaBox.h, toNum(template.layout?.infoBoxHeightMm, 34))
  const rowH = Math.max(leftBoxH, rightBoxH)
  doc.rect(leftBoxX, infoBoxY, leftBoxW, leftBoxH)
  doc.rect(rightBoxX, infoBoxY, rightBoxW, rightBoxH)

  // Left: invoice to
  const invoiceToStyle = blocks.invoiceToBox.style
  applyTextStyle(doc, invoiceToStyle, 10)
  const padX = 4
  const topNameY = infoBoxY + 7
  const addrStartY = infoBoxY + 14
  const lineH = 5
  const bottomTelY = infoBoxY + leftBoxH - 6
  const bottomAttnY = bottomTelY - lineH

  // Top: name + address
  textWithUnderline(doc, String(invoice.invoiceTo?.name || ''), leftBoxX + padX, topNameY, {}, invoiceToStyle)
  const invAddr = String(invoice.invoiceTo?.address || '')
  const addrLines = doc.splitTextToSize(invAddr, leftBoxW - 8) as string[]
  const maxAddrLines = Math.max(0, Math.floor((bottomAttnY - addrStartY - 1) / lineH))
  addrLines.slice(0, maxAddrLines).forEach((ln, idx) => {
    textWithUnderline(doc, String(ln), leftBoxX + padX, addrStartY + idx * lineH, {}, invoiceToStyle)
  })

  // Bottom: Attn / TEL pinned to bottom of the block
  textWithUnderline(doc, 'Attn :', leftBoxX + padX, bottomAttnY, {}, invoiceToStyle)
  textWithUnderline(doc, `TEL : ${String(invoice.invoiceTo?.phone || '')}`, leftBoxX + padX, bottomTelY, {}, invoiceToStyle)

  // Right: meta
  const metaStyle = blocks.invoiceMetaBox.style
  applyTextStyle(doc, { ...(metaStyle || {}), fontSize: toNum(metaStyle?.fontSize, 10) + 1 }, 11)
  textWithUnderline(doc, String(template.labels?.invoiceTitle || 'INVOICE'), rightBoxX + 4, infoBoxY + 7, {}, metaStyle)
  applyTextStyle(doc, metaStyle, 10)
  textWithUnderline(doc, ':', rightBoxX + 30, infoBoxY + 7, {}, metaStyle)
  textWithUnderline(doc, String(invoice.invoiceNo || ''), rightBoxX + 34, infoBoxY + 7, {}, metaStyle)
  const metaXLabel = rightBoxX + 4
  const metaXColon = rightBoxX + 30
  const metaXVal = rightBoxX + 34
  textWithUnderline(doc, String(template.labels?.yourRef || 'Your Ref.'), metaXLabel, infoBoxY + 14, {}, metaStyle)
  textWithUnderline(doc, ':', metaXColon, infoBoxY + 14, {}, metaStyle)
  textWithUnderline(doc, String(template.labels?.ourDoNo || 'Our D/O No'), metaXLabel, infoBoxY + 20, {}, metaStyle)
  textWithUnderline(doc, ':', metaXColon, infoBoxY + 20, {}, metaStyle)
  textWithUnderline(doc, String(template.labels?.terms || 'Terms'), metaXLabel, infoBoxY + 26, {}, metaStyle)
  textWithUnderline(doc, ':', metaXColon, infoBoxY + 26, {}, metaStyle)
  textWithUnderline(doc, String(invoice.terms || ''), metaXVal, infoBoxY + 26, {}, metaStyle)
  const dateRowY = infoBoxY + 32
  textWithUnderline(doc, String(template.labels?.date || 'Date'), metaXLabel, dateRowY, {}, metaStyle)
  textWithUnderline(doc, ':', metaXColon, dateRowY, {}, metaStyle)
  textWithUnderline(doc, dayjs(invoiceDate).format('DD/MM/YYYY'), metaXVal, dateRowY, {}, metaStyle)
  if (template.show?.showPage) {
    // Default box height is 34mm; rendering Page on a separate line would overlap Date.
    // Strategy:
    // - If box is tall enough, render Page on its own line.
    // - Otherwise, render "Page: 1 of 1" right-aligned on the Date row.
    if (rightBoxH >= 40) {
      const pageY = infoBoxY + 38
      textWithUnderline(doc, String(template.labels?.page || 'Page'), metaXLabel, pageY, {}, metaStyle)
      textWithUnderline(doc, ':', metaXColon, pageY, {}, metaStyle)
      textWithUnderline(doc, String(template.labels?.pageValue || '1 of 1'), metaXVal, pageY, {}, metaStyle)
    } else {
      const rightEdgeX = rightBoxX + rightBoxW - 4
      const pageInline = `${String(template.labels?.page || 'Page')}: ${String(template.labels?.pageValue || '1 of 1')}`
      textWithUnderline(doc, pageInline, rightEdgeX, dateRowY, { align: 'right' }, metaStyle)
    }
  }

  // Divider: customer info ↔ items table
  const divider2Y = toNum(
    blocks.dividerCustomerToItems?.y,
    Math.max(infoBoxY + rowH + 6, toNum(blocks.itemsTable.y, infoBoxY + rowH + 10) - 6)
  )
  const divider2X = toNum(blocks.dividerCustomerToItems?.x, contentLineLeftX)
  const divider2W = Math.max(10, toNum(blocks.dividerCustomerToItems?.w, contentLineW))
  const divider2LW = toNum(blocks.dividerCustomerToItems?.lineWidth, divider1LW)
  y = divider2Y
  doc.setLineWidth(divider2LW)
  doc.line(divider2X, divider2Y, divider2X + divider2W, divider2Y)

  // Items table
  const tableBlock = blocks.itemsTable
  y = toNum(tableBlock.y, y + 6)
  const items = Array.isArray(order.items) ? order.items : []
  const body = items.map((it, idx) => {
    const qty = Number(it.quantity || 0)
    const unit = Number(it.price || 0)
    const amt = qty * unit
    return [
      String(idx + 1),
      String(it.name || it.cigarId || ''),
      String(qty),
      unit.toFixed(2),
      amt.toFixed(2),
    ]
  })

  autoTable(doc, {
    startY: y,
    margin: tableBlock
      ? {
          left: toNum(tableBlock.x, margin),
          right: Math.max(0, pageWidth - (toNum(tableBlock.x, margin) + toNum(tableBlock.w, contentWidth))),
        }
      : undefined,
    tableWidth: tableBlock ? toNum(tableBlock.w, contentWidth) : 'auto',
    head: [[
      String(template.table?.headers?.no || 'No'),
      String(template.table?.headers?.description || 'Description'),
      String(template.table?.headers?.qty || 'Qty'),
      String(template.table?.headers?.priceUnit || 'Price/Unit'),
      String(template.table?.headers?.amount || 'Amount'),
    ]],
    body,
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: toNum(blocks.itemsTable.style?.fontSize, 10),
      cellPadding: { top: 1.2, right: 1.2, bottom: 1.2, left: 1.2 },
      lineWidth: 0,
      textColor: 0,
    },
    headStyles: {
      fontStyle: fontStyleOf({ ...(blocks.itemsTable.style || {}), bold: true }) as any,
      halign: 'left',
      lineWidth: 0.2,
      lineColor: 0,
    },
    columnStyles: {
      0: { cellWidth: 10 },
      2: { cellWidth: 14, halign: 'right' },
      3: { cellWidth: 26, halign: 'right' },
      4: { cellWidth: 28, halign: 'right' },
    },
    didDrawPage: () => {
      // no-op (single page expected)
    },
  })

  const tableY = (doc as any).lastAutoTable?.finalY ?? y + 10

  // Totals line
  const totalWords = numberToEnglishWords(total)
  const totalsBlock = blocks.totals
  const totalsY = totalsBlock ? toNum(totalsBlock.y, tableY + 10) : (tableY + 10)
  const totalsStyle = blocks.totals.style
  applyTextStyle(doc, totalsStyle, 10)
  const totalsX = totalsBlock ? toNum(totalsBlock.x, contentLineLeftX) : contentLineLeftX
  const totalsW = totalsBlock ? toNum(totalsBlock.w, contentLineW) : contentLineW
  const wordsLines = doc.splitTextToSize(totalWords, Math.max(10, totalsW - 55))
  ;(wordsLines as string[]).forEach((ln, idx) => {
    textWithUnderline(doc, String(ln), totalsX, totalsY + idx * 5, {}, totalsStyle)
  })

  // Total box on right
  const boxW = 40
  const boxX = totalsX + totalsW - boxW
  const totalBoxY = totalsY - 5
  doc.rect(boxX, totalBoxY, boxW, 10)
  applyTextStyle(doc, totalsStyle, 10)
  textWithUnderline(doc, String(template.labels?.total || 'Total'), boxX - 8, totalsY + 1, { align: 'right' }, totalsStyle)
  textWithUnderline(doc, `${currencySymbol} ${total.toFixed(2)}`, boxX + boxW - 2, totalsY + 1, { align: 'right' }, totalsStyle)

  // Notes + bank
  const notesBlock = blocks.notes
  let notesY = notesBlock ? toNum(notesBlock.y, totalsY + Math.max(8, wordsLines.length * 5) + 8) : (totalsY + Math.max(8, wordsLines.length * 5) + 8)
  if (template.show?.showNotes) {
    const notesStyle = blocks.notes.style
    applyTextStyle(doc, notesStyle, 10)
    const notesX = notesBlock ? toNum(notesBlock.x, margin) : margin
    textWithUnderline(doc, String(template.labels?.notes || 'Notes :'), notesX, notesY, {}, notesStyle)

    const notes = (seller.notes || []).filter(Boolean)
    notes.forEach((n, i) => {
      notesY += 5
      textWithUnderline(doc, `${i + 1}. ${String(n)}`, notesX, notesY, {}, notesStyle)
    })

    if (template.show?.showBank && (seller.bankName || seller.bankAccountNo)) {
      notesY += 8
      applyTextStyle(doc, { ...(notesStyle || {}), bold: true }, 10)
      textWithUnderline(doc, String(seller.sellerName || 'JEP VENTURES SDN BHD'), notesX, notesY, {}, { ...(notesStyle || {}), bold: true })
      applyTextStyle(doc, notesStyle, 10)
      notesY += 5
      if (seller.bankName) textWithUnderline(doc, `Bank : ${String(seller.bankName)}`, notesX, notesY, {}, notesStyle)
      notesY += 5
      if (seller.bankAccountNo) textWithUnderline(doc, `Account No: ${String(seller.bankAccountNo)}`, notesX, notesY, {}, notesStyle)
    }
  }

  // Footer
  if (template.show?.showFooter) {
    const footerY = toNum(blocks.footer?.y, toNum(template.layout?.footerYmm, 268))
    const footerX = toNum(blocks.footer?.x, margin)
    const footerW = Math.max(10, toNum(blocks.footer?.w, contentWidth))
    const footerCenterX = footerX + footerW / 2
    const footerRightX = footerX + footerW
    const footerStyle = blocks.footer.style
    applyTextStyle(doc, footerStyle, 10)
    textWithUnderline(doc, String(template.labels?.eoe || 'E. & O.E'), footerCenterX, footerY, { align: 'center' }, footerStyle)
    textWithUnderline(doc, String(template.labels?.computerGenerated || 'COMPUTER GENERATED INVOICE'), footerRightX, footerY - 4, { align: 'right' }, footerStyle)
    textWithUnderline(doc, String(template.labels?.noSignature || 'NO SIGNATURE REQUIRED'), footerRightX, footerY + 1, { align: 'right' }, footerStyle)
  }

  // Signature lines
  if (template.show?.showSignature) {
    const sigY = toNum(blocks.signature?.y, toNum(template.layout?.signatureYmm, 283))
    const sigX = toNum(blocks.signature?.x, contentLineLeftX)
    const sigW = Math.max(10, toNum(blocks.signature?.w, contentLineW))
    const sigMidX = sigX + sigW / 2
    const sigLineGap = 8
    const lineY = sigY + 1.5
    doc.setLineWidth(0.2)
    doc.line(sigX, lineY, sigMidX - sigLineGap, lineY)
    doc.line(sigMidX + sigLineGap, lineY, sigX + sigW, lineY)
    const sigStyle = blocks.signature.style
    applyTextStyle(doc, sigStyle, 10)
    textWithUnderline(doc, String(template.labels?.ackReceipt || 'Acknowledgment of receipt'), sigX + (sigW / 4), lineY + 5, { align: 'center' }, sigStyle)
    textWithUnderline(doc, `${String(template.labels?.forCompany || 'FOR')}   ${String(seller.sellerName || 'JEP VENTURES SDN BHD')}`, sigX + (sigW * 3 / 4), lineY + 5, { align: 'center' }, sigStyle)
  }

  const filename = payload.filename || `${String(invoice.invoiceNo || 'invoice').replaceAll(/[\\/:*?"<>|]/g, '-')}.pdf`
  return { doc, filename }
}

export const generateInvoicePdfAndDownload = (payload: InvoicePdfPayload) => {
  const { doc, filename } = buildInvoicePdfDoc(payload)
  doc.save(filename)
}

export const openInvoicePdfPreview = (payload: InvoicePdfPayload): boolean => {
  if (typeof window === 'undefined') return false
  const { doc } = buildInvoicePdfDoc(payload)
  try {
    const blob = doc.output('blob') as Blob
    const url = URL.createObjectURL(blob)
    const w = window.open(url, '_blank', 'noopener,noreferrer')
    if (!w) {
      URL.revokeObjectURL(url)
      return false
    }
    // best-effort cleanup after tab loads
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    return true
  } catch {
    return false
  }
}


