import { createRoot } from 'react-dom/client'
import React from 'react'
import { InvoiceA4Render, mapBusinessDataToInvoiceModel } from '@/views/admin/InvoiceTemplate/InvoiceA4Render'
import { numberToEnglishWords } from '@/utils/format/numberFormat'
import type { AppConfig, Order, OrderInvoiceMeta } from '@/types'

export interface InvoicePdfPayload {
  order: Order
  invoice: OrderInvoiceMeta
  appConfig?: AppConfig | null
  currencySymbol?: string
  filename?: string
}

/**
 * 核心逻辑：100% 调用发票模板组件生成 PDF（支持多页）
 * 通过在内存中渲染 React 组件并捕获 canvas 实现
 */
export const generateInvoicePdfAndDownload = async (payload: InvoicePdfPayload) => {
  const { order, invoice, appConfig } = payload
  const currencySymbol = payload.currencySymbol || appConfig?.invoiceTemplate?.table?.currencySymbol || 'RM'

  // 1. 使用共享的映射函数准备数据
  const previewModel = mapBusinessDataToInvoiceModel(
    order,
    invoice,
    appConfig,
    appConfig?.invoiceTemplate || {},
    currencySymbol
  )

  // 2. 创建隐藏的渲染容器
  const container = document.createElement('div')
  container.style.position = 'absolute'
  container.style.left = '-9999px'
  container.style.top = '-9999px'
  document.body.appendChild(container)

  try {
    // 3. 在后台渲染模板组件
    const root = createRoot(container)

    // 我们需要等待渲染完成和图片加载
    await new Promise<void>((resolve) => {
      root.render(
        <div style={{ padding: '0', margin: '0', background: 'white' }}>
          <InvoiceA4Render
            preview={previewModel}
            ref={() => {
              // 给一点时间让图片（如 Logo）加载
              setTimeout(resolve, 500)
            }}
          />
        </div>
      )
    })

    // 4. 动态加载重型库
    const [jsPDF, html2canvas] = await Promise.all([
      import('jspdf').then(m => m.default || m.jsPDF),
      import('html2canvas').then(m => m.default)
    ])

    // 5. 查找所有页面 div（每个 data-page-index 代表一页）
    const pageDivs = container.querySelectorAll('[data-page-index]')
    const pageElements = pageDivs.length > 0
      ? Array.from(pageDivs) as HTMLElement[]
      : [container.firstElementChild as HTMLElement] // fallback: single page

    // 6. 创建 PDF
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4'
    })

    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()

    for (let i = 0; i < pageElements.length; i++) {
      const pageEl = pageElements[i]

      const canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      })

      const imgData = canvas.toDataURL('image/png')

      if (i > 0) {
        pdf.addPage()
      }

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
    }

    // 7. 下载
    const filename = payload.filename || `${String(invoice.invoiceNo || 'invoice').replaceAll(/[\\/:*?"<>|]/g, '-')}.pdf`
    pdf.save(filename)

    // 8. 清理
    root.unmount()
  } finally {
    document.body.removeChild(container)
  }
}

/**
 * 提供与之前一致的接口，但内部逻辑已改为 100% 复用模板
 */
export const openInvoicePdfPreview = async (payload: InvoicePdfPayload): Promise<boolean> => {
  // 由于采用了 Canvas 捕获方案，预览可以直接调用下载
  // 或者在此处实现弹出新窗口显示 Blob
  await generateInvoicePdfAndDownload(payload)
  return true
}
