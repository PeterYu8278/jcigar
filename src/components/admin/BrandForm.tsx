// 品牌表单组件示例
import React from 'react'
import { Form, Input, Select, InputNumber, Button, Card, Space } from 'antd'
import { useTranslation } from 'react-i18next'
import ImageUpload from '../common/ImageUpload'
import type { Brand } from '../../types'

const { Option } = Select
const { TextArea } = Input

interface BrandFormProps {
  initialValues?: Partial<Brand>
  onSubmit: (values: Partial<Brand>) => void
  loading?: boolean
}

const BrandForm: React.FC<BrandFormProps> = ({
  initialValues,
  onSubmit,
  loading = false
}) => {
  const { t } = useTranslation()
  const [form] = Form.useForm()

  const handleSubmit = (values: any) => {
    onSubmit(values)
  }

  return (
    <Card title={initialValues?.id ? t('inventory.editBrand') : t('inventory.addBrand')}>
      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onFinish={handleSubmit}
      >
        <Form.Item
          label={t('inventory.brandName')}
          name="name"
          rules={[{ required: true, message: t('inventory.brandNameRequired') }]}
        >
          <Input placeholder={t('inventory.pleaseInputBrandName')} />
        </Form.Item>

        <Form.Item
          label={t('inventory.brandDescription')}
          name="description"
        >
          <TextArea 
            rows={4} 
            placeholder={t('inventory.pleaseInputBrandDescription')}
          />
        </Form.Item>

        <Form.Item
          label={t('inventory.brandLogo')}
          name="logo"
        >
          <ImageUpload
            folder="brands"
            maxSize={2 * 1024 * 1024} // 2MB
            width={120}
            height={120}
            showPreview={true}
          />
        </Form.Item>

        <Form.Item
          label={t('inventory.brandWebsite')}
          name="website"
          rules={[
            { type: 'url', message: t('inventory.brandWebsiteInvalid') }
          ]}
        >
          <Input placeholder="https://example.com" />
        </Form.Item>

        <Form.Item
          label={t('inventory.brandCountry')}
          name="country"
          rules={[{ required: true, message: t('inventory.brandCountryRequired') }]}
        >
          <Input placeholder={t('inventory.pleaseInputBrandCountry')} />
        </Form.Item>

        <Form.Item
          label={t('inventory.foundedYear')}
          name="foundedYear"
          rules={[
            { type: 'number', min: 1800, max: new Date().getFullYear(), message: t('inventory.foundedYearInvalid') }
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            placeholder={t('inventory.pleaseInputFoundedYear')}
            min={1800}
            max={new Date().getFullYear()}
          />
        </Form.Item>

        <Form.Item
          label={t('inventory.brandStatus')}
          name="status"
          initialValue="active"
        >
          <Select>
            <Option value="active">{t('inventory.active')}</Option>
            <Option value="inactive">{t('inventory.inactive')}</Option>
          </Select>
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              {initialValues?.id ? t('common.save') : t('common.add')}
            </Button>
            <Button onClick={() => form.resetFields()}>
              {t('common.reset')}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  )
}

export default BrandForm
