/**
 * 地址选择组件
 */

import React, { useState, useEffect } from 'react'
import { 
  Select, 
  Button, 
  Modal, 
  Form, 
  Input, 
  message,
  Space,
  Empty,
  Checkbox,
  Row,
  Col
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { Address } from '../../../types'
import { 
  getUserAddresses, 
  addAddress, 
  updateAddress, 
  deleteAddress,
  setDefaultAddress 
} from '../../../services/firebase/address'
import { useAuthStore } from '../../../store/modules/auth'
import { getModalThemeStyles } from '../../../config/modalTheme'
import { useTranslation } from 'react-i18next'

interface AddressSelectorProps {
  value?: string // 选中的地址ID
  onChange?: (addressId: string | null) => void
  allowCreate?: boolean // 是否允许创建新地址
  showSelect?: boolean // 是否显示地址选择下拉框
  style?: React.CSSProperties
}

export const AddressSelector: React.FC<AddressSelectorProps> = ({
  value,
  onChange,
  allowCreate = true,
  showSelect = true,
  style
}) => {
  const { user } = useAuthStore()
  const { t } = useTranslation()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingAddress, setEditingAddress] = useState<Address | null>(null)
  const [form] = Form.useForm()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia('(max-width: 768px)').matches)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (user?.id) {
      loadAddresses()
    }
  }, [user?.id])

  const loadAddresses = async () => {
    if (!user?.id) return
    
    setLoading(true)
    try {
      const addrList = await getUserAddresses(user.id)
      setAddresses(addrList)
      
      // 如果没有选中地址，自动选择默认地址
      if (!value && addrList.length > 0) {
        const defaultAddr = addrList.find(addr => addr.isDefault) || addrList[0]
        onChange?.(defaultAddr.id)
      }
    } catch (error) {
      message.error(t('address.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingAddress(null)
    form.resetFields()
    // 如果用户信息存在，自动填充姓名和手机号
    const userPhone = (user as any)?.profile?.phone || user?.phone
    if (user?.displayName || userPhone) {
      form.setFieldsValue({
        name: user?.displayName || '',
        phone: userPhone || '',
        isSelf: true
      })
    } else {
      form.setFieldsValue({
        isSelf: true
      })
    }
    setModalVisible(true)
  }

  const handleIsSelfChange = (e: any) => {
    const isSelf = e.target.checked
    if (isSelf && user) {
      // 如果选中"是本人"，自动填充用户信息
      const userPhone = (user as any)?.profile?.phone || user?.phone
      form.setFieldsValue({
        name: user.displayName || '',
        phone: userPhone || ''
      })
    }
  }

  const handleEdit = (address: Address) => {
    setEditingAddress(address)
    // 判断地址的姓名和手机号是否与用户信息匹配
    // 如果用户信息存在，检查姓名和手机号是否都匹配
    let isSelf = false
    if (user) {
      const userPhone = (user as any)?.profile?.phone || user?.phone
      const nameMatch = user.displayName && address.name === user.displayName
      const phoneMatch = userPhone && address.phone === userPhone
      // 如果姓名和手机号都匹配，或者至少有一个匹配且另一个为空，则认为是本人
      isSelf = (nameMatch && phoneMatch) || (nameMatch && !userPhone) || (phoneMatch && !user.displayName)
    }
    form.setFieldsValue({
      name: address.name,
      phone: address.phone,
      province: address.province,
      city: address.city,
      district: address.district,
      detail: address.detail,
      postalCode: address.postalCode,
      isDefault: address.isDefault,
      isSelf: isSelf
    })
    setModalVisible(true)
  }

  const handleDelete = async (addressId: string) => {
    if (!user?.id) return
    
    Modal.confirm({
      title: t('address.deleteConfirm'),
      content: t('address.deleteContent'),
      onOk: async () => {
        const result = await deleteAddress(user.id, addressId)
        if (result.success) {
          message.success(t('address.deleteSuccess'))
          await loadAddresses()
          // 如果删除的是当前选中的地址，清空选择
          if (value === addressId) {
            onChange?.(null)
          }
        } else {
          message.error(result.error?.message || '删除失败')
        }
      }
    })
  }

  const handleSubmit = async () => {
    if (!user?.id) return
    
    try {
      const values = await form.validateFields()
      const addressData = {
        name: values.name,
        phone: values.phone,
        province: values.province,
        city: values.city,
        district: values.district,
        detail: values.detail,
        postalCode: values.postalCode,
        isDefault: values.isDefault || false
      }

      let result
      if (editingAddress) {
        result = await updateAddress(user.id, editingAddress.id, addressData)
      } else {
        result = await addAddress(user.id, addressData)
      }

      if (result.success) {
        message.success(t('address.saveSuccess'))
        setModalVisible(false)
        await loadAddresses()
        // 如果是新创建的地址且设为默认，自动选中
        if (!editingAddress && addressData.isDefault) {
          const addResult = result as { success: boolean; addressId?: string; error?: Error }
          if (addResult.addressId) {
            onChange?.(addResult.addressId)
          }
        }
      } else {
        message.error(result.error?.message || '操作失败')
      }
    } catch (error) {
      // 表单验证失败
    }
  }

  const formatAddress = (address: Address): string => {
    return `${address.province} ${address.city} ${address.district} ${address.detail} (${address.name} ${address.phone})`
  }

  if (addresses.length === 0 && !allowCreate) {
    return (
      <div style={style}>
        <Empty description={t('address.noAddress')} />
      </div>
    )
  }

  return (
    <div style={style}>
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        {showSelect && (
          <Select
            value={value}
            onChange={onChange}
            loading={loading}
            placeholder={t('shop.selectAddress')}
            style={{ width: '100%' }}
            notFoundContent={addresses.length === 0 ? t('address.noAddress') : undefined}
          >
            {addresses.map(addr => (
              <Select.Option key={addr.id} value={addr.id}>
                {addr.isDefault && `[${t('address.default')}] `}
                {formatAddress(addr)}
              </Select.Option>
            ))}
          </Select>
        )}
        
        {allowCreate && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Button 
              type="dashed" 
              icon={<PlusOutlined />} 
              onClick={handleCreate}
              size="small"
              style={{
                borderColor: 'rgba(244, 175, 37, 0.5)',
                color: '#F4AF25',
                background: 'rgba(244, 175, 37, 0.05)'
              }}
            >
              {t('address.addAddress')}
            </Button>
            {showSelect && addresses.map(addr => (
              <Space key={addr.id} size="small">
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => handleEdit(addr)}
                  size="small"
                />
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDelete(addr.id)}
                  size="small"
                />
              </Space>
            ))}
          </div>
        )}
      </Space>

      <Modal
        title={<span style={{ color: '#F4AF25', fontWeight: 'bold' }}>{editingAddress ? t('address.editAddress') : t('address.addAddress')}</span>}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={isMobile ? '90%' : 600}
        styles={getModalThemeStyles(isMobile, true)}
        okButtonProps={{
          style: {
            background: 'linear-gradient(135deg, #FDE08D 0%, #C48D3A 100%)',
            border: 'none',
            color: '#000',
            fontWeight: 'bold'
          }
        }}
        cancelButtonProps={{
          style: {
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#fff'
          }
        }}
      >
        <Form 
          form={form} 
          layout="horizontal" 
          className="dark-theme-form" 
          labelCol={{ flex: isMobile ? '100px' : '120px' }}
          wrapperCol={{ flex: 'auto' }}
          labelWrap
        >
          <Form.Item
            name="isSelf"
            valuePropName="checked"
            initialValue={true}
            label=" "
            colon={false}
          >
            <Checkbox 
              style={{ color: '#fff' }}
              onChange={handleIsSelfChange}
            >
              {t('address.isSelf')}
            </Checkbox>
          </Form.Item>

          <Form.Item
            name="name"
            label={<span style={{ color: '#fff' }}>{t('address.receiverName')}</span>}
            rules={[{ required: true, message: t('address.pleaseInputName') }]}
          >
            <Input 
              placeholder={t('address.pleaseInputName')}
            />
          </Form.Item>
          
          <Form.Item
            name="phone"
            label={<span style={{ color: '#fff' }}>{t('address.contactPhone')}</span>}
            rules={[
              { required: true, message: t('address.pleaseInputPhone') },
              { pattern: /^1[3-9]\d{9}$/, message: t('address.pleaseInputPhoneValid') }
            ]}
          >
            <Input 
              placeholder={t('address.pleaseInputPhone')}
            />
          </Form.Item>

          <Form.Item
            name="isDefault"
            valuePropName="checked"
            initialValue={addresses.length === 0}
            label=" "
            colon={false}
          >
            <Checkbox style={{ color: '#fff' }}>
              {t('address.isDefault')}
            </Checkbox>
          </Form.Item>
          
          <Form.Item
            name="province"
            label={<span style={{ color: '#fff' }}>{t('address.province')}</span>}
            rules={[{ required: true, message: t('address.pleaseSelectProvince') }]}
          >
            <Select 
              placeholder={t('address.pleaseSelectProvince')}
              className="dark-theme-form"
              dropdownClassName="dark-theme-form"
            >
              <Select.Option value="Johor">Johor</Select.Option>
              <Select.Option value="Kedah">Kedah</Select.Option>
              <Select.Option value="Kelantan">Kelantan</Select.Option>
              <Select.Option value="Melaka">Melaka</Select.Option>
              <Select.Option value="Negeri Sembilan">Negeri Sembilan</Select.Option>
              <Select.Option value="Pahang">Pahang</Select.Option>
              <Select.Option value="Perak">Perak</Select.Option>
              <Select.Option value="Perlis">Perlis</Select.Option>
              <Select.Option value="Pulau Pinang">Pulau Pinang</Select.Option>
              <Select.Option value="Sabah">Sabah</Select.Option>
              <Select.Option value="Sarawak">Sarawak</Select.Option>
              <Select.Option value="Selangor">Selangor</Select.Option>
              <Select.Option value="Terengganu">Terengganu</Select.Option>
              <Select.Option value="Wilayah Persekutuan">Wilayah Persekutuan</Select.Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="city"
            label={<span style={{ color: '#fff' }}>{t('address.city')}</span>}
            rules={[{ required: true, message: t('address.pleaseInputCity') }]}
          >
            <Input 
              placeholder={t('address.pleaseInputCity')}
            />
          </Form.Item>
          
          <Form.Item
            name="district"
            label={<span style={{ color: '#fff' }}>{t('address.district')}</span>}
            rules={[{ required: true, message: t('address.pleaseInputDistrict') }]}
          >
            <Input 
              placeholder={t('address.pleaseInputDistrict')}
            />
          </Form.Item>
          
          <Form.Item
            name="detail"
            label={<span style={{ color: '#fff' }}>{t('address.detail')}</span>}
            rules={[{ required: true, message: t('address.pleaseInputDetail') }]}
          >
            <Input.TextArea 
              rows={2} 
              placeholder={t('address.pleaseInputDetail')}
            />
          </Form.Item>
          
          <Form.Item
            name="postalCode"
            label={<span style={{ color: '#fff' }}>{t('address.postalCode')}</span>}
          >
            <Input 
              placeholder={t('address.postalCodeOptional')}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

