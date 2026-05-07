import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
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
 * 核心逻辑：100% 调用发票模板组件生成 PDF
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

    // 4. 捕获 DOM 为 Canvas
    const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
      scale: 2, // 提高清晰度
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    })

    // 5. 将 Canvas 转为 PDF
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4'
    })

    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)

    // 6. 下载
    const filename = payload.filename || `${String(invoice.invoiceNo || 'invoice').replaceAll(/[\\/:*?"<>|]/g, '-')}.pdf`
    pdf.save(filename)

    // 7. 清理
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


