import React from 'react'
import dayjs from 'dayjs'
import { Form, Select, DatePicker, InputNumber, Input, Button } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
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
    // 分组统计（仅对有 cigarId 的商品进行分组展示，自定义费用不计入分组）
    const brandGroups = new Map<string, Array<{ key: string; name: string; qty: number; unit: number; sum: number }>>()
    const productSubtotal = { amount: 0, qty: 0 }
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
      if (id) {
        const cigar = cigars.find(c => c.id === id)
        const brand = cigar?.brand || 'Others'
        const arr = brandGroups.get(brand) || []
        arr.push({ key: id, name, qty, unit, sum })
        brandGroups.set(brand, arr)
        productSubtotal.amount += sum
        productSubtotal.qty += qty
      }
    }
    return { totalQty, totalAmount, lines, brandGroups, productSubtotal }
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
      layout="horizontal"
      labelAlign="left"
      colon={false}
      labelCol={{ flex: '120px' }}
      wrapperCol={{ flex: 'auto' }} 
      onFinish={handleSubmit}
      initialValues={{
        items: [{ cigarId: undefined, quantity: 1, price: 0 }], 
        paymentMethod: 'bank_transfer', 
        createdAt: dayjs().startOf('day') 
      }}
      id="createOrderForm"
    >
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
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
              <div key={`create-${key}`} style={{ display: 'flex', alignItems: 'center', marginBottom: 8, gap: 12 }}>
                <Form.Item
                  {...restField}
                  name={[field.name, 'cigarId']}
                  fieldKey={[field.fieldKey!, 'cigarId'] as any}
                  rules={[{ required: false }]}
                  style={{ width: 300, marginBottom: 0 }}
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
                  style={{ width: 120, marginBottom: 0 }}
                >
                  <InputNumber min={1} placeholder={t('ordersAdmin.quantity')} />
                </Form.Item>
                
                <Form.Item
                  {...restField}
                  name={[field.name, 'price']}
                  fieldKey={[field.fieldKey!, 'price'] as any}
                  rules={[{ required: true, message: t('ordersAdmin.pleaseEnterPrice') }]}
                  style={{ width: 140, marginBottom: 0 }}
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
                  <Button danger type="text" icon={<DeleteOutlined />} onClick={() => remove(field.name)} style={{ marginLeft: 12 }} />
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

          {/* Actions moved to Modal footer */}
        </div>

        {/* Right summary column */}
        <div style={{ width: 320 }}>
          {(() => {
            const s = computeSummary()
            return (
              <div style={{ position: 'sticky', top: 0 }}>
                <div style={{ marginBottom: 12, padding: 12, border: '1px dashed #d9d9d9', borderRadius: 6, background: '#fafafa' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <strong>{t('participants.productCategories')}</strong>
                  </div>
                  <div style={{ maxHeight: 320, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {s.brandGroups.size === 0 ? (
                      <div style={{ color: '#999' }}>{t('common.noData')}</div>
                    ) : (
                      Array.from(s.brandGroups.entries()).map(([brand, rows]) => (
                        <div key={brand} style={{ border: '1px solid #eee', borderRadius: 6, overflow: 'hidden' }}>
                          <div style={{ padding: '6px 8px', fontWeight: 600, background: '#f7f7f7' }}>{brand}</div>
                          <div>
                            {rows.map(r => (
                              <div key={`${brand}-${r.key}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 8px', borderBottom: '1px dashed #f0f0f0' }}>
                                <span style={{ flex: 2 }}>{r.name}</span>
                                <span style={{ flex: 1, textAlign: 'right' }}>× {r.qty}</span>
                                <span style={{ flex: 1, textAlign: 'right' }}>RM{r.unit.toFixed(2)}</span>
                                <span style={{ flex: 1, textAlign: 'right', fontWeight: 600 }}>RM{r.sum.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div style={{ borderTop: '1px dashed #e8e8e8', marginTop: 8, paddingTop: 8 }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600 }}>{t('participants.productsSubtotal')}</span>
                    <span style={{ fontWeight: 700 }}>RM{s.productSubtotal.amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      </div>
    </Form>
  )
}

export default CreateOrderForm
