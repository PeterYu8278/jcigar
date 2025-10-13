/**
 * 通用数据表格组件
 * 提供统一的数据展示、分页、排序、筛选功能
 */

import React, { useMemo, useState } from 'react'
import { Table, Space, Button, Input, Select, Tag, Tooltip } from 'antd'
import type { TableProps, ColumnsType } from 'antd/es/table'
import { SearchOutlined, ReloadOutlined, DownloadOutlined, SettingOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { formatDate } from '../../utils/format'

const { Search } = Input
const { Option } = Select

export interface DataTableColumn<T = any> extends ColumnsType<T>[0] {
  searchable?: boolean
  filterable?: boolean
  exportable?: boolean
}

export interface DataTableProps<T = any> extends Omit<TableProps<T>, 'columns'> {
  // 数据相关
  data: T[]
  columns: DataTableColumn<T>[]
  loading?: boolean
  
  // 搜索功能
  searchable?: boolean
  searchPlaceholder?: string
  searchFields?: string[]
  
  // 筛选功能
  filterable?: boolean
  filters?: {
    key: string
    label: string
    options: { label: string; value: any }[]
  }[]
  
  // 批量操作
  batchActions?: {
    key: string
    label: string
    icon?: React.ReactNode
    action: (selectedRows: T[]) => void
    danger?: boolean
  }[]
  
  // 工具栏
  toolbar?: {
    title?: string
    actions?: React.ReactNode[]
    showRefresh?: boolean
    showExport?: boolean
    showSettings?: boolean
  }
  
  // 分页
  pagination?: {
    current?: number
    pageSize?: number
    total?: number
    showSizeChanger?: boolean
    showQuickJumper?: boolean
    showTotal?: (total: number, range: [number, number]) => string
  }
  
  // 行选择
  rowSelection?: any | false
  
  // 样式
  size?: 'small' | 'middle' | 'large'
  bordered?: boolean
  scroll?: { x?: number | string; y?: number | string }
  
  // 事件
  onRefresh?: () => void
  onExport?: (data: T[]) => void
  onRowClick?: (record: T, index: number) => void
}

const DataTable = <T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  searchable = true,
  searchPlaceholder,
  searchFields,
  filterable = false,
  filters = [],
  batchActions = [],
  toolbar,
  pagination,
  rowSelection,
  size = 'middle',
  bordered = false,
  scroll,
  onRefresh,
  onExport,
  onRowClick,
  ...tableProps
}: DataTableProps<T>) => {
  const { t } = useTranslation()
  
  // 状态管理
  const [searchText, setSearchText] = useState('')
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({})
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  
  // 处理搜索字段
  const getSearchFields = () => {
    if (searchFields) return searchFields
    return columns
      .filter(col => col.searchable !== false)
      .map(col => String(col.dataIndex || ''))
      .filter(Boolean)
  }
  
  // 过滤数据
  const filteredData = useMemo(() => {
    let result = [...data]
    
    // 搜索过滤
    if (searchText) {
      const searchFields = getSearchFields()
      result = result.filter(record => {
        return searchFields.some(field => {
          const value = record[field]
          if (value == null) return false
          return String(value).toLowerCase().includes(searchText.toLowerCase())
        })
      })
    }
    
    // 筛选过滤
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        result = result.filter(record => {
          const recordValue = record[key]
          return Array.isArray(value) ? value.includes(recordValue) : recordValue === value
        })
      }
    })
    
    return result
  }, [data, searchText, activeFilters, searchFields, columns])
  
  // 处理列渲染
  const processedColumns = useMemo(() => {
    return columns.map(col => {
      const processedCol = { ...col }
      
      // 默认渲染函数
      if (!processedCol.render) {
        processedCol.render = (value: any) => {
          if (value == null) return '-'
          
          // 日期类型
          if (value instanceof Date) {
            return formatDate(value)
          }
          
          // 时间戳
          if (typeof value === 'number' && value > 1000000000000) {
            return formatDate(new Date(value))
          }
          
          // 布尔类型
          if (typeof value === 'boolean') {
            return (
              <Tag color={value ? 'green' : 'red'}>
                {value ? t('common.yes') : t('common.no')}
              </Tag>
            )
          }
          
          // 状态类型
          if (typeof value === 'string' && ['pending', 'confirmed', 'cancelled', 'active', 'inactive'].includes(value)) {
            const colorMap: Record<string, string> = {
              pending: 'orange',
              confirmed: 'green',
              cancelled: 'red',
              active: 'green',
              inactive: 'red'
            }
            return (
              <Tag color={colorMap[value] || 'default'}>
                {t(`common.${value}`) || value}
              </Tag>
            )
          }
          
          return String(value)
        }
      }
      
      return processedCol
    })
  }, [columns, t])
  
  // 工具栏渲染
  const renderToolbar = () => {
    if (!toolbar && !searchable && !filterable && batchActions.length === 0) {
      return null
    }
    
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 16,
        padding: '12px 0',
        borderBottom: '1px solid var(--cigar-border-primary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {toolbar?.title && (
            <h3 style={{ margin: 0, color: 'var(--cigar-text-primary)' }}>
              {toolbar.title}
            </h3>
          )}
          
          {/* 搜索框 */}
          {searchable && (
            <Search
              placeholder={searchPlaceholder || t('common.searchPlaceholder')}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 300 }}
              allowClear
            />
          )}
          
          {/* 筛选器 */}
          {filterable && filters.map(filter => (
            <Select
              key={filter.key}
              placeholder={filter.label}
              value={activeFilters[filter.key]}
              onChange={(value) => setActiveFilters(prev => ({ ...prev, [filter.key]: value }))}
              style={{ width: 150 }}
              allowClear
            >
              {filter.options.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          ))}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* 批量操作 */}
          {batchActions.length > 0 && selectedRowKeys.length > 0 && (
            <Space>
              {batchActions.map(action => (
                <Button
                  key={action.key}
                  icon={action.icon}
                  danger={action.danger}
                  onClick={() => {
                    const selectedRows = data.filter((_, index) => selectedRowKeys.includes(index))
                    action.action(selectedRows)
                  }}
                  size="small"
                >
                  {action.label} ({selectedRowKeys.length})
                </Button>
              ))}
            </Space>
          )}
          
          {/* 工具栏操作 */}
          {toolbar?.actions && (
            <Space>
              {toolbar.actions}
            </Space>
          )}
          
          {/* 默认操作 */}
          <Space>
            {toolbar?.showRefresh !== false && (
              <Tooltip title={t('common.refresh')}>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={onRefresh}
                  loading={loading}
                  size="small"
                />
              </Tooltip>
            )}
            
            {toolbar?.showExport && onExport && (
              <Tooltip title={t('common.export')}>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={() => onExport(filteredData)}
                  size="small"
                />
              </Tooltip>
            )}
            
            {toolbar?.showSettings && (
              <Tooltip title={t('common.settings')}>
                <Button
                  icon={<SettingOutlined />}
                  size="small"
                />
              </Tooltip>
            )}
          </Space>
        </div>
      </div>
    )
  }
  
  // 分页配置
  const paginationConfig = pagination ? {
    current: pagination.current || 1,
    pageSize: pagination.pageSize || 10,
    total: pagination.total || filteredData.length,
    showSizeChanger: pagination.showSizeChanger !== false,
    showQuickJumper: pagination.showQuickJumper !== false,
    showTotal: pagination.showTotal || ((total: number, range: [number, number]) =>
      t('common.paginationTotal', { start: range[0], end: range[1], total })
    )
  } : false
  
  // 行选择配置
  const rowSelectionConfig = rowSelection === false ? undefined : {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
    ...rowSelection
  }
  
  return (
    <div>
      {renderToolbar()}
      
      <Table<T>
        {...tableProps}
        dataSource={filteredData}
        columns={processedColumns}
        loading={loading}
        pagination={paginationConfig}
        rowSelection={rowSelectionConfig}
        size={size}
        bordered={bordered}
        scroll={scroll}
        onRow={(record, index) => ({
          onClick: () => onRowClick?.(record, index || 0),
          style: { cursor: onRowClick ? 'pointer' : 'default' }
        })}
        rowKey="id"
      />
    </div>
  )
}

export default DataTable
