/**
 * CSV 导出工具
 * 支持导出 CSV 文件
 */

import type { ExcelColumn } from './excel'

export interface CsvExportOptions {
  /** 文件名 */
  filename?: string
  /** 列配置 */
  columns: ExcelColumn[]
  /** 数据 */
  data: any[]
  /** 是否包含表头 */
  includeHeaders?: boolean
  /** 分隔符 */
  delimiter?: string
  /** 是否使用 BOM（解决中文乱码） */
  useBOM?: boolean
}

/**
 * 导出 CSV 文件
 * 
 * @param options - 导出选项
 * 
 * @example
 * ```tsx
 * exportToCSV({
 *   filename: 'users.csv',
 *   columns: [
 *     { header: 'ID', key: 'id' },
 *     { header: '姓名', key: 'name' },
 *     { header: '邮箱', key: 'email' }
 *   ],
 *   data: users
 * })
 * ```
 */
export function exportToCSV(options: CsvExportOptions): void {
  const {
    filename = 'export.csv',
    columns,
    data,
    includeHeaders = true,
    delimiter = ',',
    useBOM = true
  } = options

  try {
    const csvContent: string[] = []

    // 添加表头
    if (includeHeaders) {
      const headers = columns.map(col => escapeCSVValue(col.header))
      csvContent.push(headers.join(delimiter))
    }

    // 添加数据行
    data.forEach(row => {
      const values = columns.map(col => {
        const value = row[col.key]
        const formattedValue = col.format ? col.format(value, row) : value
        return escapeCSVValue(formattedValue)
      })
      csvContent.push(values.join(delimiter))
    })

    // 组合 CSV 内容
    let csv = csvContent.join('\n')

    // 添加 BOM（解决中文乱码问题）
    if (useBOM) {
      csv = '\uFEFF' + csv
    }

    // 创建 Blob 并下载
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    downloadBlob(blob, filename)
  } catch (error) {
    console.error('CSV 导出失败:', error)
    throw new Error('CSV 导出失败')
  }
}

/**
 * 转义 CSV 值
 */
function escapeCSVValue(value: any): string {
  if (value === null || value === undefined) {
    return ''
  }

  const stringValue = String(value)

  // 如果包含逗号、引号或换行符，需要用引号包裹
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }

  return stringValue
}

/**
 * 从 CSV 文件导入数据
 * 
 * @param file - CSV 文件
 * @param options - 导入选项
 * @returns Promise<导入的数据>
 * 
 * @example
 * ```tsx
 * const handleFileChange = async (file: File) => {
 *   try {
 *     const data = await importFromCSV(file, {
 *       columns: [
 *         { header: 'ID', key: 'id' },
 *         { header: '姓名', key: 'name' }
 *       ]
 *     })
 *     console.log('导入数据:', data)
 *   } catch (error) {
 *     message.error('导入失败')
 *   }
 * }
 * ```
 */
export function importFromCSV(
  file: File,
  options?: {
    columns?: ExcelColumn[]
    delimiter?: string
    skipRows?: number
  }
): Promise<any[]> {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          const text = e.target?.result as string
          const delimiter = options?.delimiter || ','
          const skipRows = options?.skipRows || 0

          // 解析 CSV
          const lines = text.split('\n').filter(line => line.trim())
          
          if (lines.length <= skipRows) {
            resolve([])
            return
          }

          // 获取表头
          const headers = parseCSVLine(lines[skipRows], delimiter)

          // 解析数据行
          const data: any[] = []
          for (let i = skipRows + 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i], delimiter)
            const row: any = {}
            
            headers.forEach((header, index) => {
              row[header] = values[index] || ''
            })

            data.push(row)
          }

          resolve(data)
        } catch (error) {
          reject(error)
        }
      }

      reader.onerror = () => {
        reject(new Error('文件读取失败'))
      }

      reader.readAsText(file, 'UTF-8')
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * 解析 CSV 行
 */
function parseCSVLine(line: string, delimiter: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // 转义的引号
        current += '"'
        i++
      } else {
        // 切换引号状态
        inQuotes = !inQuotes
      }
    } else if (char === delimiter && !inQuotes) {
      // 遇到分隔符（不在引号内）
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  // 添加最后一个值
  values.push(current.trim())

  return values
}

/**
 * 下载 Blob
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default exportToCSV

