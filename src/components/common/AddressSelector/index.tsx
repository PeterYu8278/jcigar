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
  Radio,
  Empty,
  Checkbox
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
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingAddress, setEditingAddress] = useState<Address | null>(null)
  const [form] = Form.useForm()
  const isMobile = typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false

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
      message.error('加载地址失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingAddress(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (address: Address) => {
    setEditingAddress(address)
    form.setFieldsValue({
      name: address.name,
      phone: address.phone,
      province: address.province,
      city: address.city,
      district: address.district,
      detail: address.detail,
      postalCode: address.postalCode,
      isDefault: address.isDefault
    })
    setModalVisible(true)
  }

  const handleDelete = async (addressId: string) => {
    if (!user?.id) return
    
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个地址吗？',
      onOk: async () => {
        const result = await deleteAddress(user.id, addressId)
        if (result.success) {
          message.success('删除成功')
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
        message.success(editingAddress ? '更新成功' : '创建成功')
        setModalVisible(false)
        await loadAddresses()
        // 如果是新创建的地址且设为默认，自动选中
        if (!editingAddress && addressData.isDefault && result.addressId) {
          onChange?.(result.addressId)
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
        <Empty description="暂无地址，请先创建地址" />
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
            placeholder="请选择收货地址"
            style={{ width: '100%' }}
            notFoundContent={addresses.length === 0 ? '暂无地址' : undefined}
          >
            {addresses.map(addr => (
              <Select.Option key={addr.id} value={addr.id}>
                {addr.isDefault && '[默认] '}
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
              新建地址
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
        title={<span style={{ color: '#F4AF25', fontWeight: 'bold' }}>{editingAddress ? '编辑地址' : '新建地址'}</span>}
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
        <Form form={form} layout="vertical" className="dark-theme-form">
          <Form.Item
            name="name"
            label={<span style={{ color: '#fff' }}>收货人姓名</span>}
            rules={[{ required: true, message: '请输入收货人姓名' }]}
          >
            <Input 
              placeholder="请输入收货人姓名"
            />
          </Form.Item>
          
          <Form.Item
            name="phone"
            label={<span style={{ color: '#fff' }}>联系电话</span>}
            rules={[
              { required: true, message: '请输入联系电话' },
              { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' }
            ]}
          >
            <Input 
              placeholder="请输入手机号"
            />
          </Form.Item>

          <Form.Item
            name="isSelf"
            valuePropName="checked"
            initialValue={true}
          >
            <Checkbox style={{ color: '#fff' }}>
              收货人姓名和联系号码是否本人
            </Checkbox>
          </Form.Item>
          
          <Form.Item
            name="province"
            label={<span style={{ color: '#fff' }}>省/直辖市</span>}
            rules={[{ required: true, message: '请输入省/直辖市' }]}
          >
            <Input 
              placeholder="请输入省/直辖市"
            />
          </Form.Item>
          
          <Form.Item
            name="city"
            label={<span style={{ color: '#fff' }}>市</span>}
            rules={[{ required: true, message: '请输入市' }]}
          >
            <Input 
              placeholder="请输入市"
            />
          </Form.Item>
          
          <Form.Item
            name="district"
            label={<span style={{ color: '#fff' }}>区/县</span>}
            rules={[{ required: true, message: '请输入区/县' }]}
          >
            <Input 
              placeholder="请输入区/县"
            />
          </Form.Item>
          
          <Form.Item
            name="detail"
            label={<span style={{ color: '#fff' }}>详细地址</span>}
            rules={[{ required: true, message: '请输入详细地址' }]}
          >
            <Input.TextArea 
              rows={2} 
              placeholder="请输入详细地址"
            />
          </Form.Item>
          
          <Form.Item
            name="postalCode"
            label={<span style={{ color: '#fff' }}>邮编</span>}
          >
            <Input 
              placeholder="请输入邮编（可选）"
            />
          </Form.Item>
          
          <Form.Item
            name="isDefault"
            initialValue={addresses.length === 0}
          >
            <Radio.Group>
              <Radio value={true} style={{ color: '#fff' }}>设为默认地址</Radio>
              <Radio value={false} style={{ color: '#fff' }}>不设为默认</Radio>
            </Radio.Group>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

