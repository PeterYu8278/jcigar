/**
 * 统一表单字段组件
 * 提供一致的表单字段渲染和验证
 */

import React from 'react'
import { Form, FormItemProps, Input, Select, DatePicker, InputNumber, Switch, Radio, Checkbox, Upload, Button } from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import type { UploadProps } from 'antd'
import { formatDate } from '../../utils/format'

const { Option } = Select
const { TextArea } = Input
const { RangePicker } = DatePicker
const { Group: RadioGroup } = Radio
const { Group: CheckboxGroup } = Checkbox

// 字段类型
export type FieldType = 
  | 'text'
  | 'password'
  | 'email'
  | 'number'
  | 'textarea'
  | 'select'
  | 'multiselect'
  | 'date'
  | 'daterange'
  | 'datetime'
  | 'switch'
  | 'radio'
  | 'checkbox'
  | 'checkboxgroup'
  | 'upload'
  | 'custom'

// 字段选项
export interface FieldOption {
  label: string
  value: any
  disabled?: boolean
}

// 字段配置
export interface FieldConfig {
  type: FieldType
  name: string
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  readonly?: boolean
  
  // 验证规则
  rules?: any[]
  
  // 字段特定配置
  options?: FieldOption[]
  min?: number
  max?: number
  step?: number
  rows?: number
  showTime?: boolean
  format?: string
  accept?: string
  multiple?: boolean
  
  // 样式配置
  width?: string | number
  className?: string
  
  // 自定义渲染
  render?: (value: any, onChange: (value: any) => void, field: FieldConfig) => React.ReactNode
  
  // 事件处理
  onChange?: (value: any) => void
  onBlur?: (e: React.FocusEvent) => void
  onFocus?: (e: React.FocusEvent) => void
}

export interface FormFieldProps extends Omit<FormItemProps, 'children'> {
  config: FieldConfig
  value?: any
  onChange?: (value: any) => void
  className?: string
}

const FormField: React.FC<FormFieldProps> = ({
  config,
  value,
  onChange,
  className,
  ...formItemProps
}) => {
  const { t } = useTranslation()
  
  // 渲染输入组件
  const renderInput = () => {
    const commonProps = {
      value,
      onChange,
      disabled: config.disabled,
      placeholder: config.placeholder || t(`common.pleaseInput${config.name}`),
      className: config.className
    }
    
    switch (config.type) {
      case 'text':
      case 'email':
        return (
          <Input
            {...commonProps}
            type={config.type}
            onBlur={config.onBlur}
            onFocus={config.onFocus}
          />
        )
      
      case 'password':
        return (
          <Input.Password
            {...commonProps}
            onBlur={config.onBlur}
            onFocus={config.onFocus}
          />
        )
      
      case 'textarea':
        return (
          <TextArea
            {...commonProps}
            rows={config.rows || 4}
            onBlur={config.onBlur}
            onFocus={config.onFocus}
          />
        )
      
      case 'number':
        return (
          <InputNumber
            {...commonProps}
            min={config.min}
            max={config.max}
            step={config.step || 1}
            style={{ width: config.width || '100%' }}
            onBlur={config.onBlur}
            onFocus={config.onFocus}
          />
        )
      
      case 'select':
        return (
          <Select
            {...commonProps}
            style={{ width: config.width || '100%' }}
            onBlur={config.onBlur}
            onFocus={config.onFocus}
          >
            {config.options?.map(option => (
              <Option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </Option>
            ))}
          </Select>
        )
      
      case 'multiselect':
        return (
          <Select
            {...commonProps}
            mode="multiple"
            style={{ width: config.width || '100%' }}
            onBlur={config.onBlur}
            onFocus={config.onFocus}
          >
            {config.options?.map(option => (
              <Option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </Option>
            ))}
          </Select>
        )
      
      case 'date':
        return (
          <DatePicker
            {...commonProps}
            format={config.format || 'YYYY-MM-DD'}
            style={{ width: config.width || '100%' }}
            onBlur={config.onBlur}
            onFocus={config.onFocus}
          />
        )
      
      case 'daterange':
        return (
          <RangePicker
            {...commonProps}
            format={config.format || 'YYYY-MM-DD'}
            style={{ width: config.width || '100%' }}
            onBlur={config.onBlur}
            onFocus={config.onFocus}
          />
        )
      
      case 'datetime':
        return (
          <DatePicker
            {...commonProps}
            showTime
            format={config.format || 'YYYY-MM-DD HH:mm:ss'}
            style={{ width: config.width || '100%' }}
            onBlur={config.onBlur}
            onFocus={config.onFocus}
          />
        )
      
      case 'switch':
        return (
          <Switch
            checked={value}
            onChange={onChange}
            disabled={config.disabled}
          />
        )
      
      case 'radio':
        return (
          <RadioGroup
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            disabled={config.disabled}
          >
            {config.options?.map(option => (
              <Radio key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </Radio>
            ))}
          </RadioGroup>
        )
      
      case 'checkbox':
        return (
          <Checkbox
            checked={value}
            onChange={(e) => onChange?.(e.target.checked)}
            disabled={config.disabled}
          >
            {config.label}
          </Checkbox>
        )
      
      case 'checkboxgroup':
        return (
          <CheckboxGroup
            value={value}
            onChange={onChange}
            disabled={config.disabled}
          >
            {config.options?.map(option => (
              <Checkbox key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </Checkbox>
            ))}
          </CheckboxGroup>
        )
      
      case 'upload':
        const uploadProps: UploadProps = {
          name: 'file',
          multiple: config.multiple,
          accept: config.accept,
          beforeUpload: () => false, // 阻止自动上传
          onChange: (info) => {
            if (config.onChange) {
              config.onChange(info.fileList)
            }
          },
          fileList: value || []
        }
        
        return (
          <Upload {...uploadProps}>
            <Button icon={<UploadOutlined />}>
              {t('common.upload')}
            </Button>
          </Upload>
        )
      
      case 'custom':
        return config.render ? config.render(value, onChange || (() => {}), config) : null
      
      default:
        return null
    }
  }
  
  // 构建表单项属性
  const itemProps: FormItemProps = {
    ...formItemProps,
    label: config.label || formItemProps.label,
    required: config.required || formItemProps.required,
    className: className
  }
  
  // 如果有验证规则，添加到表单项
  if (config.rules && config.rules.length > 0) {
    itemProps.rules = config.rules
  }
  
  return (
    <Form.Item {...itemProps}>
      {renderInput()}
    </Form.Item>
  )
}

export default FormField
