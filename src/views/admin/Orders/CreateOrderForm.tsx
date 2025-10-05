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
  const itemsWatch = Form.useWatch('items', form)

  const computeSummary = () => {
    const items = Array.isArray(itemsWatch) ? itemsWatch : []
    let totalQty = 0
    let totalAmount = 0
    const lines: Array<{ key: string; name: string; qty: number; unit: number; sum: number }> = []
    for (const it of items) {
      const qty = Number(it?.quantity || 0)
      const unit = Number(it?.price || 0)
      if (qty <= 0) continue
      const id = String(it?.cigarId || '')
      const name = id ? (cigars.find(c => c.id === id)?.name || id) : t('ordersAdmin.customFee')
      const sum = qty * unit
      totalQty += qty
      totalAmount += sum
      lines.push({ key: id || `fee-${lines.length}`, name, qty, unit, sum })
    }
    return { totalQty, totalAmount, lines }
  }

  const handleSubmit = async (values: any) => {
    const userId: string = values.userId
    const items: { cigarId?: string; quantity: number; price?: number }[] = (values.items || [])
      .filter((it: any) => (it?.quantity > 0) && (it?.price > 0 || it?.cigarId))
    
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
      const res = await createDirectSaleOrder({ userId, items, note: values.note, createdAt })
      
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
        createdAt: dayjs().startOf('day') 
      }}
    >
      <Form.Item label={t('ordersAdmin.orderDate')} name="createdAt">
        <DatePicker 
          style={{ width: '100%' }} 
          format="YYYY-MM-DD"
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
            {fields.map((field) => {
              const { key, ...restField } = field as any
              return (
              <div key={`create-${key}`} style={{ display: 'flex', alignItems: 'baseline', marginBottom: 8, gap: 8 }}>
                <Form.Item
                  {...restField}
                  name={[field.name, 'cigarId']}
                  fieldKey={[field.fieldKey!, 'cigarId'] as any}
                  rules={[{ required: false }]}
                  style={{ minWidth: 280, marginBottom: 0 }}
                >
                  <Select 
                    placeholder={t('ordersAdmin.selectItem') + ' / ' + t('ordersAdmin.customFee')}
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
                  {...restField}
                  name={[field.name, 'quantity']}
                  fieldKey={[field.fieldKey!, 'quantity'] as any}
                  rules={[{ required: true, message: t('ordersAdmin.pleaseEnterQuantity') }]}
                  style={{ minWidth: 100, marginBottom: 0 }}
                >
                  <InputNumber min={1} placeholder={t('ordersAdmin.quantity')} />
                </Form.Item>
                
                <Form.Item
                  {...restField}
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
            )})}
            <Form.Item>
              <Button 
                type="dashed" 
                onClick={() => add({ quantity: 1, price: 0 })} 
                icon={<PlusOutlined />}
              >
                {t('ordersAdmin.addItem')}
              </Button>
            </Form.Item>

            {/* 统计汇总 */}
            {(() => {
              const s = computeSummary()
              return (
                <div style={{ marginTop: 12, padding: 12, border: '1px dashed #d9d9d9', borderRadius: 6, background: '#fafafa' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <strong>{t('participants.productCategories')}</strong>
                    <span>{t('participants.totalAmount')}: RM{s.totalAmount.toFixed(2)}</span>
                  </div>
                  <div style={{ maxHeight: 160, overflow: 'auto' }}>
                    {s.lines.length === 0 ? (
                      <div style={{ color: '#999' }}>{t('common.noData')}</div>
                    ) : (
                      s.lines.map(line => (
                        <div key={line.key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px dashed #eee' }}>
                          <span style={{ flex: 2 }}>{line.name}</span>
                          <span style={{ flex: 1, textAlign: 'right' }}>× {line.qty}</span>
                          <span style={{ flex: 1, textAlign: 'right' }}>RM{line.unit.toFixed(2)}</span>
                          <span style={{ flex: 1, textAlign: 'right', fontWeight: 600 }}>RM{line.sum.toFixed(2)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            })()}
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

      {/* Actions */}
      <Form.Item>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={onCancel}>{t('common.cancel')}</Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            {t('common.create')}
          </Button>
        </div>
      </Form.Item>
    </Form>
  )
}

export default CreateOrderForm
