/**
 * 表单布局组件
 * 提供统一的表单布局和样式
 */

import React from 'react'
import { Form, Card, Space, Divider, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import type { FormProps, FormInstance } from 'antd'
import FormField, { FieldConfig } from './FormField'

const { Title, Text } = Typography

export interface FormSection {
  title?: string
  description?: string
  fields: FieldConfig[]
  columns?: number
  collapsible?: boolean
  defaultCollapsed?: boolean
}

export interface FormLayoutProps extends Omit<FormProps, 'children'> {
  // 表单配置
  sections: FormSection[]
  
  // 布局配置
  layout?: 'vertical' | 'horizontal' | 'inline'
  labelCol?: any
  wrapperCol?: any
  
  // 样式配置
  bordered?: boolean
  cardStyle?: React.CSSProperties
  sectionStyle?: React.CSSProperties
  
  // 功能配置
  showSectionDividers?: boolean
  showSectionNumbers?: boolean
  
  // 事件处理
  onValuesChange?: (changedValues: any, allValues: any) => void
  onFieldsChange?: (changedFields: any, allFields: any) => void
}

const FormLayout: React.FC<FormLayoutProps> = ({
  sections,
  layout = 'vertical',
  labelCol,
  wrapperCol,
  bordered = false,
  cardStyle,
  sectionStyle,
  showSectionDividers = true,
  showSectionNumbers = false,
  onValuesChange,
  onFieldsChange,
  ...formProps
}) => {
  const { t } = useTranslation()
  const [form] = Form.useForm()
  
  // 渲染字段
  const renderFields = (fields: FieldConfig[], columns = 1) => {
    if (columns === 1) {
      return fields.map((field, index) => (
        <FormField
          key={field.name || index}
          config={field}
        />
      ))
    }
    
    // 多列布局
    const rows: FieldConfig[][] = []
    for (let i = 0; i < fields.length; i += columns) {
      rows.push(fields.slice(i, i + columns))
    }
    
    return rows.map((row, rowIndex) => (
      <div
        key={rowIndex}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: 16,
          marginBottom: 16
        }}
      >
        {row.map((field, fieldIndex) => (
          <FormField
            key={field.name || fieldIndex}
            config={field}
          />
        ))}
      </div>
    ))
  }
  
  // 渲染表单节
  const renderSection = (section: FormSection, index: number) => {
    const sectionNumber = showSectionNumbers ? `${index + 1}. ` : ''
    const sectionTitle = section.title ? `${sectionNumber}${section.title}` : undefined
    
    const content = (
      <div style={sectionStyle}>
        {sectionTitle && (
          <div style={{ marginBottom: 16 }}>
            <Title level={4} style={{ margin: 0, color: 'var(--cigar-text-primary)' }}>
              {sectionTitle}
            </Title>
            {section.description && (
              <Text type="secondary" style={{ fontSize: 14 }}>
                {section.description}
              </Text>
            )}
          </div>
        )}
        
        {renderFields(section.fields, section.columns)}
      </div>
    )
    
    if (bordered) {
      return (
        <Card
          key={index}
          size="small"
          style={{
            marginBottom: 16,
            background: 'var(--cigar-black-secondary)',
            borderColor: 'var(--cigar-border-primary)',
            ...cardStyle
          }}
        >
          {content}
        </Card>
      )
    }
    
    return (
      <div key={index}>
        {content}
        {showSectionDividers && index < sections.length - 1 && (
          <Divider style={{ margin: '24px 0', borderColor: 'var(--cigar-border-primary)' }} />
        )}
      </div>
    )
  }
  
  return (
    <Form
      {...formProps}
      form={form}
      layout={layout}
      labelCol={labelCol}
      wrapperCol={wrapperCol}
      onValuesChange={onValuesChange}
      onFieldsChange={onFieldsChange}
      className="dark-theme-form"
      style={{
        ...formProps.style,
        background: 'transparent'
      }}
    >
      {sections.map((section, index) => renderSection(section, index))}
    </Form>
  )
}

export default FormLayout
