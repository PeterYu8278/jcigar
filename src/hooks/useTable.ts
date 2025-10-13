/**
 * 表格 Hook
 * 提供统一的表格逻辑（分页、排序、筛选、选择）
 */

import { useState, useMemo, useCallback } from 'react'
import type { TablePaginationConfig } from 'antd'
import type { FilterValue, SorterResult, TableCurrentDataSource } from 'antd/es/table/interface'

/**
 * 表格配置
 */
export interface UseTableConfig<T = any> {
  /** 初始数据 */
  initialData?: T[]
  /** 初始页码 */
  initialPage?: number
  /** 初始每页条数 */
  initialPageSize?: number
  /** 初始排序字段 */
  initialSortField?: string
  /** 初始排序顺序 */
  initialSortOrder?: 'ascend' | 'descend' | null
  /** 是否启用前端分页 */
  clientSidePagination?: boolean
  /** 是否启用前端排序 */
  clientSideSorting?: boolean
  /** 是否启用前端筛选 */
  clientSideFiltering?: boolean
}

/**
 * 表格状态
 */
export interface UseTableState<T = any> {
  /** 原始数据 */
  data: T[]
  /** 处理后的数据（分页、排序、筛选后） */
  displayData: T[]
  /** 当前页码 */
  currentPage: number
  /** 每页条数 */
  pageSize: number
  /** 总数据量 */
  total: number
  /** 加载状态 */
  loading: boolean
  /** 选中的行键 */
  selectedRowKeys: React.Key[]
  /** 选中的行数据 */
  selectedRows: T[]
  /** 排序字段 */
  sortField: string | null
  /** 排序顺序 */
  sortOrder: 'ascend' | 'descend' | null
  /** 筛选条件 */
  filters: Record<string, FilterValue | null>
}

/**
 * 表格操作
 */
export interface UseTableActions<T = any> {
  /** 设置数据 */
  setData: (data: T[]) => void
  /** 设置加载状态 */
  setLoading: (loading: boolean) => void
  /** 改变页码 */
  changePage: (page: number) => void
  /** 改变每页条数 */
  changePageSize: (pageSize: number) => void
  /** 改变排序 */
  changeSort: (field: string | null, order: 'ascend' | 'descend' | null) => void
  /** 改变筛选 */
  changeFilters: (filters: Record<string, FilterValue | null>) => void
  /** 选择行 */
  selectRows: (keys: React.Key[], rows: T[]) => void
  /** 清空选择 */
  clearSelection: () => void
  /** 刷新数据 */
  refresh: () => void
  /** 重置表格状态 */
  reset: () => void
  /** Ant Design Table onChange 处理器 */
  handleTableChange: (
    pagination: TablePaginationConfig,
    filters: Record<string, FilterValue | null>,
    sorter: SorterResult<T> | SorterResult<T>[],
    extra: TableCurrentDataSource<T>
  ) => void
}

/**
 * 表格 Hook 返回值
 */
export interface UseTableReturn<T = any> extends UseTableState<T>, UseTableActions<T> {
  /** Ant Design Table 分页配置 */
  pagination: TablePaginationConfig | false
  /** Ant Design Table rowSelection 配置 */
  rowSelection: {
    selectedRowKeys: React.Key[]
    onChange: (selectedRowKeys: React.Key[], selectedRows: T[]) => void
  }
}

/**
 * 表格 Hook
 * 
 * @example
 * ```tsx
 * const {
 *   data,
 *   displayData,
 *   loading,
 *   selectedRowKeys,
 *   pagination,
 *   rowSelection,
 *   handleTableChange,
 *   setData,
 *   setLoading,
 *   clearSelection
 * } = useTable<User>({
 *   initialPageSize: 20,
 *   clientSidePagination: true
 * })
 * 
 * // 加载数据
 * useEffect(() => {
 *   loadData()
 * }, [])
 * 
 * const loadData = async () => {
 *   setLoading(true)
 *   const result = await getUserList()
 *   if (result.success) {
 *     setData(result.data)
 *   }
 *   setLoading(false)
 * }
 * 
 * // 使用表格
 * <Table
 *   dataSource={displayData}
 *   loading={loading}
 *   pagination={pagination}
 *   rowSelection={rowSelection}
 *   onChange={handleTableChange}
 * />
 * ```
 */
export function useTable<T = any>(config: UseTableConfig<T> = {}): UseTableReturn<T> {
  const {
    initialData = [],
    initialPage = 1,
    initialPageSize = 10,
    initialSortField = null,
    initialSortOrder = null,
    clientSidePagination = true,
    clientSideSorting = true,
    clientSideFiltering = true
  } = config

  // 状态
  const [data, setData] = useState<T[]>(initialData)
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [pageSize, setPageSize] = useState(initialPageSize)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [selectedRows, setSelectedRows] = useState<T[]>([])
  const [sortField, setSortField] = useState<string | null>(initialSortField)
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend' | null>(initialSortOrder)
  const [filters, setFilters] = useState<Record<string, FilterValue | null>>({})

  /**
   * 处理排序
   */
  const sortedData = useMemo(() => {
    if (!clientSideSorting || !sortField || !sortOrder) {
      return data
    }

    return [...data].sort((a: any, b: any) => {
      const aValue = a[sortField]
      const bValue = b[sortField]

      if (aValue === bValue) return 0

      const compareResult = aValue > bValue ? 1 : -1
      return sortOrder === 'ascend' ? compareResult : -compareResult
    })
  }, [data, sortField, sortOrder, clientSideSorting])

  /**
   * 处理筛选
   */
  const filteredData = useMemo(() => {
    if (!clientSideFiltering || Object.keys(filters).length === 0) {
      return sortedData
    }

    return sortedData.filter((item: any) => {
      return Object.entries(filters).every(([key, value]) => {
        if (!value || value.length === 0) return true
        return value.includes(item[key])
      })
    })
  }, [sortedData, filters, clientSideFiltering])

  /**
   * 总数据量
   */
  const total = filteredData.length

  /**
   * 处理分页
   */
  const displayData = useMemo(() => {
    if (!clientSidePagination) {
      return filteredData
    }

    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return filteredData.slice(startIndex, endIndex)
  }, [filteredData, currentPage, pageSize, clientSidePagination])

  /**
   * 改变页码
   */
  const changePage = useCallback((page: number) => {
    setCurrentPage(page)
  }, [])

  /**
   * 改变每页条数
   */
  const changePageSize = useCallback((size: number) => {
    setPageSize(size)
    setCurrentPage(1) // 重置到第一页
  }, [])

  /**
   * 改变排序
   */
  const changeSort = useCallback((field: string | null, order: 'ascend' | 'descend' | null) => {
    setSortField(field)
    setSortOrder(order)
  }, [])

  /**
   * 改变筛选
   */
  const changeFilters = useCallback((newFilters: Record<string, FilterValue | null>) => {
    setFilters(newFilters)
    setCurrentPage(1) // 重置到第一页
  }, [])

  /**
   * 选择行
   */
  const selectRows = useCallback((keys: React.Key[], rows: T[]) => {
    setSelectedRowKeys(keys)
    setSelectedRows(rows)
  }, [])

  /**
   * 清空选择
   */
  const clearSelection = useCallback(() => {
    setSelectedRowKeys([])
    setSelectedRows([])
  }, [])

  /**
   * 刷新数据（保持当前状态）
   */
  const refresh = useCallback(() => {
    // 触发数据重新加载的逻辑由调用方实现
    // 这里只是提供一个接口
  }, [])

  /**
   * 重置表格状态
   */
  const reset = useCallback(() => {
    setCurrentPage(initialPage)
    setPageSize(initialPageSize)
    setSortField(initialSortField)
    setSortOrder(initialSortOrder)
    setFilters({})
    clearSelection()
  }, [initialPage, initialPageSize, initialSortField, initialSortOrder, clearSelection])

  /**
   * Ant Design Table onChange 处理器
   */
  const handleTableChange = useCallback(
    (
      pagination: TablePaginationConfig,
      filters: Record<string, FilterValue | null>,
      sorter: SorterResult<T> | SorterResult<T>[]
    ) => {
      // 处理分页
      if (pagination.current) {
        changePage(pagination.current)
      }
      if (pagination.pageSize) {
        changePageSize(pagination.pageSize)
      }

      // 处理排序
      const sorterResult = Array.isArray(sorter) ? sorter[0] : sorter
      if (sorterResult) {
        changeSort(
          sorterResult.field as string | null,
          sorterResult.order as 'ascend' | 'descend' | null
        )
      }

      // 处理筛选
      changeFilters(filters)
    },
    [changePage, changePageSize, changeSort, changeFilters]
  )

  /**
   * Ant Design 分页配置
   */
  const pagination: TablePaginationConfig | false = clientSidePagination
    ? {
        current: currentPage,
        pageSize: pageSize,
        total: total,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total) => `共 ${total} 条`,
        pageSizeOptions: ['10', '20', '50', '100']
      }
    : false

  /**
   * Ant Design rowSelection 配置
   */
  const rowSelection = {
    selectedRowKeys,
    onChange: selectRows
  }

  return {
    // 状态
    data,
    displayData,
    currentPage,
    pageSize,
    total,
    loading,
    selectedRowKeys,
    selectedRows,
    sortField,
    sortOrder,
    filters,
    
    // 操作
    setData,
    setLoading,
    changePage,
    changePageSize,
    changeSort,
    changeFilters,
    selectRows,
    clearSelection,
    refresh,
    reset,
    handleTableChange,
    
    // Ant Design 配置
    pagination,
    rowSelection
  }
}

