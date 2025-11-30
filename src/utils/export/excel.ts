/**
 * Excel 导出工具
 * 支持导出 Excel 文件
 */

import * as XLSX from 'xlsx'
import { formatDate } from '../format'

export interface ExcelColumn {
  /** 列标题 */
  header: string
  /** 数据键 */
  key: string
  /** 列宽度 */
  width?: number
  /** 数据格式化函数 */
  format?: (value: any, row: any) => string | number
}

export interface ExcelExportOptions {
  /** 文件名 */
  filename?: string
  /** 工作表名称 */
  sheetName?: string
  /** 列配置 */
  columns: ExcelColumn[]
  /** 数据 */
  data: any[]
  /** 是否包含表头 */
  includeHeaders?: boolean
  /** 自定义样式 */
  styles?: any
}

/**
 * 导出 Excel 文件
 * 
 * @param options - 导出选项
 * 
 * @example
 * ```tsx
 * exportToExcel({
 *   filename: 'users.xlsx',
 *   sheetName: '用户列表',
 *   columns: [
 *     { header: 'ID', key: 'id', width: 10 },
 *     { header: '姓名', key: 'name', width: 20 },
 *     { 
 *       header: '注册时间', 
 *       key: 'createdAt',
 *       format: (value) => formatDate(value, 'YYYY-MM-DD')
 *     }
 *   ],
 *   data: users
 * })
 * ```
 */
export function exportToExcel(options: ExcelExportOptions): void {
  const {
    filename = 'export.xlsx',
    sheetName = 'Sheet1',
    columns,
    data,
    includeHeaders = true
  } = options

  try {
    // 准备导出数据
    const exportData: any[] = []

    // 添加表头
    if (includeHeaders) {
      const headers: any = {}
      columns.forEach(col => {
        headers[col.key] = col.header
      })
      exportData.push(headers)
    }

    // 添加数据行
    data.forEach(row => {
      const exportRow: any = {}
      columns.forEach(col => {
        const value = row[col.key]
        exportRow[col.key] = col.format ? col.format(value, row) : value
      })
      exportData.push(exportRow)
    })

    // 创建工作簿
    const worksheet = XLSX.utils.json_to_sheet(exportData, { skipHeader: true })

    // 设置列宽
    const colWidths = columns.map(col => ({ wch: col.width || 15 }))
    worksheet['!cols'] = colWidths

    // 创建工作表
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

    // 导出文件
    XLSX.writeFile(workbook, filename)
  } catch (error) {
    throw new Error('Excel 导出失败')
  }
}

/**
 * 导出多个工作表的 Excel 文件
 * 
 * @param filename - 文件名
 * @param sheets - 工作表配置数组
 * 
 * @example
 * ```tsx
 * exportToExcelMultiSheet('report.xlsx', [
 *   {
 *     sheetName: '用户',
 *     columns: userColumns,
 *     data: users
 *   },
 *   {
 *     sheetName: '订单',
 *     columns: orderColumns,
 *     data: orders
 *   }
 * ])
 * ```
 */
export function exportToExcelMultiSheet(
  filename: string,
  sheets: Array<Omit<ExcelExportOptions, 'filename'>>
): void {
  try {
    const workbook = XLSX.utils.book_new()

    sheets.forEach(sheet => {
      const {
        sheetName = 'Sheet',
        columns,
        data,
        includeHeaders = true
      } = sheet

      const exportData: any[] = []

      if (includeHeaders) {
        const headers: any = {}
        columns.forEach(col => {
          headers[col.key] = col.header
        })
        exportData.push(headers)
      }

      data.forEach(row => {
        const exportRow: any = {}
        columns.forEach(col => {
          const value = row[col.key]
          exportRow[col.key] = col.format ? col.format(value, row) : value
        })
        exportData.push(exportRow)
      })

      const worksheet = XLSX.utils.json_to_sheet(exportData, { skipHeader: true })
      const colWidths = columns.map(col => ({ wch: col.width || 15 }))
      worksheet['!cols'] = colWidths

      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
    })

    XLSX.writeFile(workbook, filename)
  } catch (error) {
    throw new Error('Excel 多表导出失败')
  }
}

/**
 * 从 Excel 文件导入数据
 * 
 * @param file - Excel 文件
 * @param options - 导入选项
 * @returns Promise<导入的数据>
 * 
 * @example
 * ```tsx
 * const handleFileChange = async (file: File) => {
 *   try {
 *     const data = await importFromExcel(file, {
 *       sheetName: '用户列表',
 *       columns: userColumns
 *     })
 *     console.log('导入数据:', data)
 *   } catch (error) {
 *     message.error('导入失败')
 *   }
 * }
 * ```
 */
export function importFromExcel(
  file: File,
  options?: {
    sheetName?: string
    columns?: ExcelColumn[]
    skipRows?: number
  }
): Promise<any[]> {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          const data = e.target?.result
          const workbook = XLSX.read(data, { type: 'binary' })

          const sheetName = options?.sheetName || workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]

          if (!worksheet) {
            throw new Error(`找不到工作表: ${sheetName}`)
          }

          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            range: options?.skipRows ? options.skipRows : undefined
          })

          resolve(jsonData)
        } catch (error) {
          reject(error)
        }
      }

      reader.onerror = () => {
        reject(new Error('文件读取失败'))
      }

      reader.readAsBinaryString(file)
    } catch (error) {
      reject(error)
    }
  })
}

export default exportToExcel

