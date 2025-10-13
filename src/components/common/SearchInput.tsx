import React, { useState, useCallback, useEffect } from 'react'
import { Input } from 'antd'
import { SearchOutlined, CloseCircleOutlined } from '@ant-design/icons'
import type { InputProps } from 'antd'

interface SearchInputProps extends Omit<InputProps, 'onChange'> {
  /** 搜索回调 */
  onSearch?: (value: string) => void
  /** 变化回调 */
  onChange?: (value: string) => void
  /** 清空回调 */
  onClear?: () => void
  /** 防抖延迟（毫秒） */
  debounceDelay?: number
  /** 是否自动聚焦 */
  autoFocus?: boolean
  /** 是否显示清空按钮 */
  showClear?: boolean
  /** 最小搜索长度（小于此长度不触发搜索） */
  minLength?: number
  /** 是否在输入时实时搜索 */
  searchOnChange?: boolean
}

/**
 * 搜索输入框组件
 * 
 * @example
 * ```tsx
 * // 基础用法
 * <SearchInput
 *   placeholder="搜索用户..."
 *   onSearch={handleSearch}
 * />
 * 
 * // 实时搜索（防抖）
 * <SearchInput
 *   placeholder="搜索..."
 *   onSearch={handleSearch}
 *   searchOnChange
 *   debounceDelay={500}
 * />
 * 
 * // 带清空按钮
 * <SearchInput
 *   placeholder="搜索..."
 *   onSearch={handleSearch}
 *   onClear={handleClear}
 *   showClear
 * />
 * ```
 */
const SearchInput: React.FC<SearchInputProps> = ({
  onSearch,
  onChange,
  onClear,
  debounceDelay = 300,
  autoFocus = false,
  showClear = true,
  minLength = 0,
  searchOnChange = false,
  placeholder = '请输入搜索关键词',
  ...restProps
}) => {
  const [value, setValue] = useState('')
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null)

  /**
   * 执行搜索
   */
  const executeSearch = useCallback(
    (searchValue: string) => {
      // 检查最小长度
      if (searchValue.length > 0 && searchValue.length < minLength) {
        return
      }

      if (onSearch) {
        onSearch(searchValue)
      }
    },
    [onSearch, minLength]
  )

  /**
   * 处理输入变化
   */
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      setValue(newValue)

      // 触发 onChange 回调
      if (onChange) {
        onChange(newValue)
      }

      // 实时搜索（带防抖）
      if (searchOnChange) {
        // 清除之前的定时器
        if (debounceTimer) {
          clearTimeout(debounceTimer)
        }

        // 设置新的定时器
        const timer = setTimeout(() => {
          executeSearch(newValue)
        }, debounceDelay)

        setDebounceTimer(timer)
      }
    },
    [onChange, searchOnChange, debounceTimer, debounceDelay, executeSearch]
  )

  /**
   * 处理按下回车键
   */
  const handlePressEnter = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const inputValue = (e.target as HTMLInputElement).value
      executeSearch(inputValue)
    },
    [executeSearch]
  )

  /**
   * 处理点击搜索图标
   */
  const handleSearchClick = useCallback(() => {
    executeSearch(value)
  }, [value, executeSearch])

  /**
   * 处理清空
   */
  const handleClear = useCallback(() => {
    setValue('')
    
    if (onChange) {
      onChange('')
    }

    if (onClear) {
      onClear()
    }

    if (onSearch) {
      onSearch('')
    }
  }, [onChange, onClear, onSearch])

  /**
   * 清理定时器
   */
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
    }
  }, [debounceTimer])

  return (
    <Input
      value={value}
      onChange={handleChange}
      onPressEnter={handlePressEnter}
      placeholder={placeholder}
      autoFocus={autoFocus}
      prefix={<SearchOutlined style={{ color: 'rgba(255, 255, 255, 0.45)' }} />}
      suffix={
        showClear && value ? (
          <CloseCircleOutlined
            style={{
              color: 'rgba(255, 255, 255, 0.45)',
              cursor: 'pointer'
            }}
            onClick={handleClear}
          />
        ) : null
      }
      {...restProps}
    />
  )
}

/**
 * 搜索框（带搜索按钮）
 * 
 * @example
 * ```tsx
 * <SearchInputWithButton
 *   placeholder="搜索用户..."
 *   onSearch={handleSearch}
 *   buttonText="搜索"
 * />
 * ```
 */
interface SearchInputWithButtonProps extends SearchInputProps {
  /** 搜索按钮文字 */
  buttonText?: string
  /** 按钮加载状态 */
  buttonLoading?: boolean
}

export const SearchInputWithButton: React.FC<SearchInputWithButtonProps> = ({
  onSearch,
  buttonText = '搜索',
  buttonLoading = false,
  ...restProps
}) => {
  return (
    <Input.Search
      placeholder={restProps.placeholder || '请输入搜索关键词'}
      enterButton={buttonText}
      loading={buttonLoading}
      onSearch={onSearch}
      {...restProps}
    />
  )
}

export default SearchInput

