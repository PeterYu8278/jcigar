import React from 'react'
import dayjs from 'dayjs'
import { Form, Select, DatePicker, InputNumber, Input, Button } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import type { User, Cigar } from '../../../types'
import { createDirectSaleOrder } from '../../../services/firebase/firestore'
import { groupCigarsByBrand } from './helpers'

interface CreateOrderFormProps {
  users: User[]
  cigars: Cigar[]
  onCreateSuccess: () => void
  onCreateError: (error: string) => void
  onCancel: () => void
  loading: boolean
}

const CreateOrderForm: React.FC<CreateOrderFormProps> = ({
  users,
  cigars,
  onCreateSuccess,
  onCreateError,
  onCancel,
  loading
}) => {
  const { t } = useTranslation()
  const [form] = Form.useForm()
  const groupedCigars = groupCigarsByBrand(cigars)

  const handleSubmit = async (values: any) => {
    const userId: string = values.userId
    const items: { cigarId: string; quantity: number; price: number }[] = (values.items || [])
      .filter((it: any) => it?.cigarId && it?.quantity > 0 && it?.price > 0)
    
    if (!userId) {
      onCreateError(t('ordersAdmin.pleaseSelectUser'))
      return
    }
    
    if (items.length === 0) {
      onCreateError(t('ordersAdmin.pleaseAddAtLeastOneItem'))
      return
    }
    
    const createdAt: Date = values.createdAt && typeof (values.createdAt as any)?.toDate === 'function' 
      ? (values.createdAt as any).toDate() 
      : dayjs().toDate()

    try {
      const res = await createDirectSaleOrder({ 
        userId, 
        items, 
        note: values.note, 
        createdAt 
      } as any)
      
      if (res.success) {
        onCreateSuccess()
        form.resetFields()
      } else {
        onCreateError(t('ordersAdmin.createFailed'))
      }
    } catch (error) {
      onCreateError(t('ordersAdmin.createFailed'))
    }
  }

  return (
    <Form 
      form={form} 
      layout="vertical" 
      onFinish={handleSubmit}
      initialValues={{
        items: [{ cigarId: undefined, quantity: 1, price: 0 }], 
        paymentMethod: 'bank_transfer', 
        createdAt: dayjs() 
      }}
    >
      <Form.Item label={t('ordersAdmin.orderDate')} name="createdAt">
        <DatePicker 
          style={{ width: '100%' }} 
          showTime={{ format: 'HH:mm' }}
          format="YYYY-MM-DD HH:mm"
        />
      </Form.Item>
      
      <Form.Item 
        label={t('ordersAdmin.selectUser')} 
        name="userId" 
        rules={[{ required: true, message: t('ordersAdmin.pleaseSelectUser') }]}
      > 
        <Select 
          showSearch 
          placeholder={t('ordersAdmin.selectUser')}
          filterOption={(input, option) => {
            const kw = (input || '').toLowerCase()
            const uid = (option as any)?.value as string
            const u = users.find(x => x.id === uid) as any
            const name = (u?.displayName || '').toLowerCase()
            const email = (u?.email || '').toLowerCase()
            const phone = (u?.profile?.phone || '').toLowerCase()
            return !!kw && (name.includes(kw) || email.includes(kw) || phone.includes(kw))
          }}
        >
          {users
            .sort((a, b) => {
              const nameA = (a.displayName || a.email || a.id).toLowerCase()
              const nameB = (b.displayName || b.email || b.id).toLowerCase()
              return nameA.localeCompare(nameB)
            })
            .map(u => (
              <Select.Option key={u.id} value={u.id}>
                {u.displayName} ({(u as any)?.profile?.phone || '-'})
              </Select.Option>
            ))}
        </Select>
      </Form.Item>

      <Form.List name="items">
        {(fields, { add, remove }) => (
          <div>
            {fields.map((field) => (
              <div key={`create-${field.key}`} style={{ display: 'flex', alignItems: 'baseline', marginBottom: 8, gap: 8 }}>
                <Form.Item
                  {...field}
                  name={[field.name, 'cigarId']}
                  fieldKey={[field.fieldKey!, 'cigarId'] as any}
                  rules={[{ required: true, message: t('ordersAdmin.pleaseSelectItem') }]}
                  style={{ minWidth: 280, marginBottom: 0 }}
                >
                  <Select 
                    placeholder={t('ordersAdmin.selectItem')}
                    showSearch
                    optionFilterProp="children"
                    onChange={(cigarId) => {
                      const cigar = cigars.find(c => c.id === cigarId)
                      if (cigar) {
                        form.setFieldValue(['items', field.name, 'price'], cigar.price)
                      }
                    }}
                    filterOption={(input, option) => {
                      const kw = (input || '').toLowerCase()
                      const text = String((option?.children as any) || '').toLowerCase()
                      return text.includes(kw)
                    }}
                  >
                    {groupedCigars.map(group => (
                      <Select.OptGroup key={group.brand} label={group.brand}>
                        {group.list.map(c => (
                          <Select.Option key={c.id} value={c.id}>
                            {c.name} - RM{c.price}
                          </Select.Option>
                        ))}
                      </Select.OptGroup>
                    ))}
                  </Select>
                </Form.Item>
                
                <Form.Item
                  {...field}
                  name={[field.name, 'quantity']}
                  fieldKey={[field.fieldKey!, 'quantity'] as any}
                  rules={[{ required: true, message: t('ordersAdmin.pleaseEnterQuantity') }]}
                  style={{ minWidth: 100, marginBottom: 0 }}
                >
                  <InputNumber min={1} placeholder={t('ordersAdmin.quantity')} />
                </Form.Item>
                
                <Form.Item
                  {...field}
                  name={[field.name, 'price']}
                  fieldKey={[field.fieldKey!, 'price'] as any}
                  rules={[{ required: true, message: t('ordersAdmin.pleaseEnterPrice') }]}
                  style={{ minWidth: 120, marginBottom: 0 }}
                >
                  <InputNumber 
                    min={0} 
                    step={0.01}
                    precision={2}
                    placeholder={t('ordersAdmin.price')}
                    prefix="RM"
                  />
                </Form.Item>
                
                {fields.length > 1 && (
                  <Button danger onClick={() => remove(field.name)}>
                    {t('common.remove')}
                  </Button>
                )}
              </div>
            ))}
            <Form.Item>
              <Button 
                type="dashed" 
                onClick={() => add({ quantity: 1, price: 0 })} 
                icon={<PlusOutlined />}
              >
                {t('ordersAdmin.addItem')}
              </Button>
            </Form.Item>
          </div>
        )}
      </Form.List>

      <Form.Item label={t('ordersAdmin.note')} name="note">
        <Input placeholder={t('ordersAdmin.noteOptional')} />
      </Form.Item>
      
      <Form.Item label={t('ordersAdmin.address')} name="address">
        <Input placeholder={t('ordersAdmin.addressOptional')} />
      </Form.Item>
      
      <Form.Item label={t('ordersAdmin.payment.title')} name="paymentMethod">
        <Select>
          <Select.Option value="bank_transfer">{t('ordersAdmin.payment.bankTransfer')}</Select.Option>
          <Select.Option value="credit">{t('ordersAdmin.payment.credit')}</Select.Option>
          <Select.Option value="paypal">PayPal</Select.Option>
        </Select>
      </Form.Item>
    </Form>
  )
}

export default CreateOrderForm
