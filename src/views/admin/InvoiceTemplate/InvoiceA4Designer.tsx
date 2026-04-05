import React, { useMemo, useState } from 'react'
import { Rnd } from 'react-rnd'
import { Card, Col, InputNumber, Row, Segmented, Space, Switch } from 'antd'
import type { InvoiceTemplateConfig, InvoiceTextStyle } from '@/types'

const A4 = { w: 210, h: 297 } // mm
const MM_TO_PX = 96 / 25.4
const PX_TO_MM = 25.4 / 96
const PT_TO_PX = 96 / 72

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

type BlockRect = { x: number; y: number; w: number; h: number; style?: InvoiceTextStyle; lineWidth?: number }
type BlockId =
  | 'sellerHeader'
  | 'dividerHeaderToCustomer'
  | 'invoiceToBox'
  | 'invoiceMetaBox'
  | 'dividerCustomerToItems'
  | 'itemsTable'
  | 'totals'
  | 'notes'
  | 'footer'
  | 'signature'
type Blocks = Record<BlockId, BlockRect>

const blockLabel: Record<BlockId, string> = {
  sellerHeader: 'Header',
  dividerHeaderToCustomer: 'Divider (Header → Customer)',
  invoiceToBox: 'Invoice To',
  invoiceMetaBox: 'Invoice Meta',
  dividerCustomerToItems: 'Divider (Customer → Items)',
  itemsTable: 'Items Table',
  totals: 'Totals',
  notes: 'Notes',
  footer: 'Footer',
  signature: 'Signature',
}

const getDefaultBlocks = (): Blocks => ({
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
})

export interface InvoiceA4DesignerProps {
  blocks?: InvoiceTemplateConfig['layout'] extends infer L
    ? L extends { blocks?: infer B }
      ? B
      : never
    : never
  onChange: (next: Blocks) => void
  preview?: {
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
}

export const InvoiceA4Designer: React.FC<InvoiceA4DesignerProps> = ({ blocks, onChange, preview }) => {
  const [scaleMode, setScaleMode] = useState<'100%' | '75%' | '50%'>('75%')
  const scale = scaleMode === '100%' ? 1 : scaleMode === '75%' ? 0.75 : 0.5
  const pagePx = useMemo(() => ({ w: Math.round(A4.w * MM_TO_PX), h: Math.round(A4.h * MM_TO_PX) }), [])
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [gridMm, setGridMm] = useState<number>(1)
  const gridPx = useMemo(() => Math.max(1, Math.round(clamp(gridMm, 0.5, 20) * MM_TO_PX)), [gridMm])

  const mergedBlocks = useMemo<Blocks>(() => {
    const base = getDefaultBlocks()
    const input = (blocks || {}) as Partial<Blocks>
    return {
      ...base,
      ...Object.fromEntries(Object.entries(input).filter(([, v]) => !!v)) as Partial<Blocks>,
    } as Blocks
  }, [blocks])

  const [selected, setSelected] = useState<BlockId>('invoiceToBox')

  const selectedBlock = mergedBlocks[selected]

  const mmToPx = (mm: number) => Math.round(mm * MM_TO_PX)
  const ptToPx = (pt: number) => Math.round(pt * PT_TO_PX)

  const cssTextStyle = (s?: InvoiceTextStyle, fallback = 10) => {
    const fontSize = (typeof s?.fontSize === 'number' && Number.isFinite(s.fontSize)) ? s.fontSize : fallback
    return {
      // jsPDF uses pt for font size (even when unit=mm). Align browser preview by pt→px (96/72).
      fontSize: `${Math.max(8, ptToPx(fontSize))}px`,
      fontWeight: s?.bold ? 700 : 400,
      fontStyle: s?.italic ? 'italic' : 'normal',
      textDecoration: s?.underline ? 'underline' : 'none',
      // In PDF we advance lines by ~5mm in multiple sections.
      lineHeight: `${Math.max(12, mmToPx(5))}px`,
      fontFamily: 'Helvetica, Arial, sans-serif',
      color: '#000',
      wordBreak: 'break-word' as const,
      whiteSpace: 'pre-wrap' as const,
    }
  }

  const renderPreview = (id: BlockId, b: BlockRect) => {
    const p = preview
    // Keep inner padding in mm to match PDF drawing offsets (typically +4mm).
    const pad = mmToPx(4)
    const titlePill = (
      <div style={{
        position: 'absolute',
        left: 6,
        top: 6,
        background: 'rgba(255,255,255,0.85)',
        border: '1px solid rgba(0,0,0,0.12)',
        borderRadius: 6,
        padding: '2px 6px',
        fontSize: 11,
        fontWeight: 700,
      }}>
        {blockLabel[id]}
      </div>
    )

    if (!p) {
      return (
        <div style={{ padding: 6, fontSize: 12, color: '#000' }}>
          <div style={{ fontWeight: 700 }}>{blockLabel[id]}</div>
          <div style={{ opacity: 0.7, marginTop: 2 }}>
            {id === 'itemsTable' ? 'Table preview' : 'Drag / Resize'}
          </div>
        </div>
      )
    }

    if (id === 'sellerHeader') {
      return (
        <div style={{ position: 'relative', height: '100%', padding: pad }}>
          {titlePill}
          <div style={{ ...cssTextStyle(b.style, 10.5), textAlign: 'center' }}>
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

    if (id === 'invoiceToBox') {
      const boxHpx = mmToPx(b.h)
      const topNameYpx = mmToPx(7)
      const addrStartYpx = mmToPx(14)
      const lineHpx = mmToPx(5)
      const bottomTelOffPx = mmToPx(6)
      const bottomAttnOffPx = mmToPx(11)
      const addrMaxHpx = Math.max(0, boxHpx - addrStartYpx - bottomAttnOffPx - mmToPx(1))

      return (
        <div style={{ position: 'relative', height: '100%', padding: pad }}>
          {titlePill}
          <div style={{ ...cssTextStyle(b.style, 10), position: 'relative', height: '100%' }}>
            {/* Top: name */}
            <div style={{ position: 'absolute', left: 0, right: 0, top: topNameYpx }}>
              <div style={{ fontWeight: 700 }}>{p.invoice.invoiceTo.name}</div>
            </div>

            {/* Address block (clipped so it never overlaps bottom Attn/TEL) */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: addrStartYpx,
                height: addrMaxHpx,
                overflow: 'hidden',
              }}
            >
              <div style={{ whiteSpace: 'pre-wrap' }}>{p.invoice.invoiceTo.address}</div>
            </div>

            {/* Bottom: Attn / TEL pinned */}
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: bottomAttnOffPx - lineHpx }}>
              <div>Attn :</div>
            </div>
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: bottomTelOffPx }}>
              <div>TEL : {p.invoice.invoiceTo.phone}</div>
            </div>
          </div>
        </div>
      )
    }

    if (id === 'invoiceMetaBox') {
      const isTall = b.h >= 40
      return (
        <div style={{ position: 'relative', height: '100%', padding: pad }}>
          {titlePill}
          <div style={{ ...cssTextStyle(b.style, 10), position: 'relative', height: '100%' }}>
            <div style={{ position: 'absolute', left: 0, top: mmToPx(7), fontWeight: 800 }}>
              {p.labels.invoiceTitle}
            </div>
            <div style={{ position: 'absolute', left: mmToPx(26), top: mmToPx(7) }}>: {p.invoice.invoiceNo}</div>

            <div style={{ position: 'absolute', left: 0, top: mmToPx(26) }}>Terms : {p.invoice.terms || ''}</div>

            <div style={{ position: 'absolute', left: 0, top: mmToPx(32) }}>
              <span>Date : {p.invoice.invoiceDate}</span>
              {!isTall ? (
                <span style={{ float: 'right' }}>Page : {p.invoice.page || '1 of 1'}</span>
              ) : null}
            </div>
            {isTall ? (
              <div style={{ position: 'absolute', left: 0, top: mmToPx(38) }}>Page : {p.invoice.page || '1 of 1'}</div>
            ) : null}
          </div>
        </div>
      )
    }

    if (id === 'itemsTable') {
      const rows = p.order.items.slice(0, 5)
      return (
        <div style={{ position: 'relative', height: '100%', padding: pad }}>
          {titlePill}
          <div style={{ ...cssTextStyle(b.style, 10), overflow: 'hidden' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '28px 1fr 44px 70px 70px',
              gap: 4,
              fontWeight: 800,
              borderBottom: '1px solid rgba(0,0,0,0.35)',
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

    if (id === 'totals') {
      return (
        <div style={{ position: 'relative', height: '100%', padding: pad }}>
          {titlePill}
          <div style={cssTextStyle(b.style, 10)}>
            <div style={{ opacity: 0.85 }}>{p.order.totalWords || 'RINGGIT MALAYSIA : ...'}</div>
            <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
              <div>Total</div>
              <div>{p.order.currencySymbol} {p.order.total.toFixed(2)}</div>
            </div>
          </div>
        </div>
      )
    }

    if (id === 'notes') {
      return (
        <div style={{ position: 'relative', height: '100%', padding: pad }}>
          {titlePill}
          <div style={cssTextStyle(b.style, 10)}>
            <div style={{ fontWeight: 800 }}>Notes :</div>
            {p.notes.slice(0, 4).map((n, idx) => (
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

    if (id === 'footer') {
      return (
        <div style={{ position: 'relative', height: '100%', padding: pad }}>
          {titlePill}
          <div style={{ ...cssTextStyle(b.style, 10), display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ flex: 1, textAlign: 'center' }}>E. & O.E</div>
            <div style={{ textAlign: 'right' }}>
              <div>COMPUTER GENERATED INVOICE</div>
              <div>NO SIGNATURE REQUIRED</div>
            </div>
          </div>
        </div>
      )
    }

    if (id === 'signature') {
      return (
        <div style={{ position: 'relative', height: '100%', padding: pad }}>
          {titlePill}
          <div style={{ ...cssTextStyle(b.style, 10), height: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
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

    // divider blocks handled elsewhere
    return (
      <div style={{ padding: 6, fontSize: 12, color: '#000' }}>
        <div style={{ fontWeight: 700 }}>{blockLabel[id]}</div>
      </div>
    )
  }

  const snapMm = (n: number) => {
    const step = clamp(gridMm, 0.5, 20)
    return Math.round(n / step) * step
  }

  const updateBlock = (id: BlockId, patch: Partial<BlockRect>) => {
    const prev = mergedBlocks[id]
    const nextX = clamp(patch.x ?? prev.x, 0, A4.w)
    const nextY = clamp(patch.y ?? prev.y, 0, A4.h)
    const nextW = clamp(patch.w ?? prev.w, 10, A4.w)
    const isDivider = id === 'dividerHeaderToCustomer' || id === 'dividerCustomerToItems'
    const nextH = isDivider ? 0.5 : clamp(patch.h ?? prev.h, 6, A4.h)
    const next = {
      ...mergedBlocks,
      [id]: {
        x: snapToGrid ? snapMm(nextX) : nextX,
        y: snapToGrid ? snapMm(nextY) : nextY,
        w: snapToGrid ? snapMm(nextW) : nextW,
        h: snapToGrid ? snapMm(nextH) : nextH,
        lineWidth: patch.lineWidth ?? prev.lineWidth,
        style: {
          ...(prev.style || {}),
          ...(patch.style || {}),
        },
      },
    } as Blocks
    onChange(next)
  }

  return (
    <Row gutter={[12, 12]}>
      <Col xs={24} lg={16}>
        <Card
          title={
            <Space>
              <span>A4 Designer</span>
              <Segmented
                value={scaleMode}
                onChange={(v) => setScaleMode(v as any)}
                options={['100%', '75%', '50%']}
              />
            </Space>
          }
          styles={{ body: { display: 'flex', justifyContent: 'center' } }}
        >
          {/* Scale wrapper: keeps bounds correct (parent is unscaled canvas) */}
          <div
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top center',
            }}
          >
            <div
              style={{
                width: `${pagePx.w}px`,
                height: `${pagePx.h}px`,
                background: '#fff',
                border: '1px solid rgba(0,0,0,0.15)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                position: 'relative',
              }}
            >
              {/* grid */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage:
                    'linear-gradient(to right, rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.04) 1px, transparent 1px)',
                  backgroundSize: `${Math.round(10 * MM_TO_PX)}px ${Math.round(10 * MM_TO_PX)}px`,
                  pointerEvents: 'none',
                }}
              />

              {(Object.keys(mergedBlocks) as BlockId[]).map((id) => {
                const b = mergedBlocks[id]
                const isSel = selected === id
                const isDivider = id === 'dividerHeaderToCustomer' || id === 'dividerCustomerToItems'
                const px = {
                  x: Math.round(b.x * MM_TO_PX),
                  y: Math.round(b.y * MM_TO_PX),
                  w: Math.round(b.w * MM_TO_PX),
                  h: Math.max(2, Math.round((isDivider ? 0.5 : b.h) * MM_TO_PX)),
                }
                return (
                  <Rnd
                    key={id}
                    scale={scale}
                    size={{ width: px.w, height: px.h }}
                    position={{ x: px.x, y: px.y }}
                    onDragStart={() => setSelected(id)}
                    onResizeStart={() => setSelected(id)}
                    bounds="parent"
                    enableResizing={isDivider ? {
                      top: false,
                      right: true,
                      bottom: false,
                      left: true,
                      topRight: false,
                      bottomRight: false,
                      bottomLeft: false,
                      topLeft: false,
                    } : {
                      top: true,
                      right: true,
                      bottom: true,
                      left: true,
                      topRight: true,
                      bottomRight: true,
                      bottomLeft: true,
                      topLeft: true,
                    }}
                    dragGrid={snapToGrid ? [gridPx, gridPx] : [1, 1]}
                    resizeGrid={snapToGrid ? [gridPx, gridPx] : [1, 1]}
                    style={{
                      border: isDivider
                        ? (isSel ? '2px solid #1677ff' : '1px dashed rgba(0,0,0,0.25)')
                        : (isSel ? '2px solid #1677ff' : '1px dashed rgba(0,0,0,0.35)'),
                      background: isDivider
                        ? 'transparent'
                        : (isSel ? 'rgba(22,119,255,0.06)' : 'rgba(0,0,0,0.02)'),
                      boxSizing: 'border-box',
                      cursor: 'move',
                      overflow: 'hidden',
                    }}
                    onDragStop={(_, d) => {
                      updateBlock(id, {
                        x: Math.round((d.x * PX_TO_MM) * 100) / 100,
                        y: Math.round((d.y * PX_TO_MM) * 100) / 100,
                      })
                    }}
                    onResizeStop={(_, __, ref, delta, position) => {
                      updateBlock(id, {
                        x: Math.round((position.x * PX_TO_MM) * 100) / 100,
                        y: Math.round((position.y * PX_TO_MM) * 100) / 100,
                        w: Math.round((ref.offsetWidth * PX_TO_MM) * 100) / 100,
                        h: Math.round((ref.offsetHeight * PX_TO_MM) * 100) / 100,
                      })
                    }}
                  >
                    {isDivider ? (
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          top: '50%',
                          height: 0,
                          borderTop: `${Math.max(1, Math.round((b.lineWidth || 0.2) * MM_TO_PX))}px solid rgba(0,0,0,0.65)`,
                          transform: 'translateY(-50%)',
                        }}
                      />
                    ) : (
                      renderPreview(id, b)
                    )}
                  </Rnd>
                )
              })}
            </div>
          </div>
        </Card>
      </Col>

      <Col xs={24} lg={8}>
        <Card title="Properties">
          <div style={{ marginBottom: 8, fontWeight: 700 }}>{blockLabel[selected]}</div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Grid snap</div>
            <Row gutter={8} align="middle">
              <Col span={12}>
                <Switch checked={snapToGrid} onChange={setSnapToGrid} />
              </Col>
              <Col span={12}>
                <InputNumber
                  value={gridMm}
                  min={0.5}
                  max={20}
                  step={0.5}
                  style={{ width: '100%' }}
                  onChange={(v) => setGridMm(Number(v || 1))}
                  addonAfter="mm"
                  disabled={!snapToGrid}
                />
              </Col>
            </Row>
          </div>
          <Row gutter={8}>
            <Col span={12}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>x (mm)</div>
              <InputNumber
                value={selectedBlock.x}
                min={0}
                max={A4.w}
                step={snapToGrid ? gridMm : 0.1}
                style={{ width: '100%' }}
                onChange={(v) => updateBlock(selected, { x: Number(v) })}
              />
            </Col>
            <Col span={12}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>y (mm)</div>
              <InputNumber
                value={selectedBlock.y}
                min={0}
                max={A4.h}
                step={snapToGrid ? gridMm : 0.1}
                style={{ width: '100%' }}
                onChange={(v) => updateBlock(selected, { y: Number(v) })}
              />
            </Col>
            <Col span={12} style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>w (mm)</div>
              <InputNumber
                value={selectedBlock.w}
                min={10}
                max={A4.w}
                step={snapToGrid ? gridMm : 0.1}
                style={{ width: '100%' }}
                onChange={(v) => updateBlock(selected, { w: Number(v) })}
              />
            </Col>
            <Col span={12} style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>h (mm)</div>
              <InputNumber
                value={selectedBlock.h}
                min={6}
                max={A4.h}
                step={snapToGrid ? gridMm : 0.1}
                style={{ width: '100%' }}
                onChange={(v) => updateBlock(selected, { h: Number(v) })}
              />
            </Col>
          </Row>
          <div style={{ marginTop: 12, fontWeight: 700 }}>Text</div>
          <Row gutter={8} style={{ marginTop: 8 }}>
            <Col span={12}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>fontSize</div>
              <InputNumber
                value={selectedBlock.style?.fontSize ?? 10}
                min={6}
                max={24}
                style={{ width: '100%' }}
                onChange={(v) => updateBlock(selected, { style: { fontSize: Number(v) } })}
              />
            </Col>
            <Col span={12}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>bold</div>
              <Switch
                checked={!!selectedBlock.style?.bold}
                onChange={(checked) => updateBlock(selected, { style: { bold: checked } })}
              />
            </Col>
            <Col span={12} style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>italic</div>
              <Switch
                checked={!!selectedBlock.style?.italic}
                onChange={(checked) => updateBlock(selected, { style: { italic: checked } })}
              />
            </Col>
            <Col span={12} style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>underline</div>
              <Switch
                checked={!!selectedBlock.style?.underline}
                onChange={(checked) => updateBlock(selected, { style: { underline: checked } })}
              />
            </Col>
          </Row>
          {(selected === 'dividerHeaderToCustomer' || selected === 'dividerCustomerToItems') && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Divider</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>lineWidth (mm)</div>
              <InputNumber
                value={selectedBlock.lineWidth ?? 0.2}
                min={0.05}
                max={1}
                step={0.05}
                style={{ width: '100%' }}
                onChange={(v) => updateBlock(selected, { lineWidth: Number(v || 0.2) })}
              />
            </div>
          )}
          <div style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>
            Tip: click a block to select, then drag/resize on the canvas.
          </div>
        </Card>
      </Col>
    </Row>
  )
}

export default InvoiceA4Designer


