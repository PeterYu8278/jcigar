import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Space, 
  Tag, 
  Modal, 
  Form, 
  Input, 
  Select, 
  message, 
  Typography,
  Divider,
  Row,
  Col,
  Statistic
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  ShopOutlined,
  EnvironmentOutlined,
  PhoneOutlined
} from '@ant-design/icons';
import { 
  getAllStores, 
  createStore, 
  updateStore, 
  deleteStore 
} from '../../../services/firebase/stores';
import type { Store } from '../../../types';

const { Title, Text } = Typography;
const { Option } = Select;

const StoreManagement: React.FC = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    try {
      setLoading(true);
      const data = await getAllStores();
      setStores(data);
    } catch (error) {
      message.error('Failed to load stores');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingStore(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (store: Store) => {
    setEditingStore(store);
    form.setFieldsValue(store);
    setIsModalVisible(true);
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: 'Are you sure you want to delete this store?',
      content: 'This action cannot be undone.',
      onOk: async () => {
        const res = await deleteStore(id);
        if (res.success) {
          message.success('Store deleted');
          loadStores();
        } else {
          message.error(res.error);
        }
      }
    });
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingStore) {
        const res = await updateStore(editingStore.id, values);
        if (res.success) {
          message.success('Store updated');
          setIsModalVisible(false);
          loadStores();
        } else {
          message.error(res.error);
        }
      } else {
        const res = await createStore({
          ...values,
          status: 'active'
        });
        if (res.success) {
          message.success('Store created');
          setIsModalVisible(false);
          loadStores();
        } else {
          message.error(res.error);
        }
      }
    } catch (error) {
      // Form validation error
    }
  };

  const columns = [
    {
      title: 'Store Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => (
        <Space>
          <ShopOutlined style={{ color: '#FDE08D' }} />
          <Text strong style={{ color: '#fff' }}>{text}</Text>
        </Space>
      )
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
      render: (text: string) => (
        <Space>
          <EnvironmentOutlined style={{ color: '#aaa' }} />
          <Text style={{ color: '#ccc' }}>{text}</Text>
        </Space>
      )
    },
    {
      title: 'Contact',
      key: 'contact',
      render: (_: any, record: Store) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {record.phone && <Text style={{ color: '#aaa', fontSize: 12 }}><PhoneOutlined /> {record.phone}</Text>}
          {record.email && <Text style={{ color: '#aaa', fontSize: 12 }}>{record.email}</Text>}
        </div>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'gold' : 'default'}>
          {status.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Store) => (
        <Space>
          <Button 
            type="text" 
            icon={<EditOutlined style={{ color: '#FDE08D' }} />} 
            onClick={() => handleEdit(record)}
          />
          <Button 
            type="text" 
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => handleDelete(record.id)}
          />
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '12px 16px', maxWidth: 1200, margin: '0 auto' }}>
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12}>
          <Title level={2} style={{ 
            backgroundImage: 'linear-gradient(to right,#FDE08D,#C48D3A)', 
            WebkitBackgroundClip: 'text', 
            color: 'transparent',
            margin: 0
          }}>
            Store Management
          </Title>
        </Col>
        <Col xs={24} sm={12} style={{ textAlign: 'right' }}>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleAdd}
            style={{ 
              background: 'linear-gradient(to right,#FDE08D,#C48D3A)', 
              color: '#111', 
              border: 'none',
              fontWeight: 800,
              borderRadius: 20
            }}
          >
            Add New Store
          </Button>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <Statistic 
              title={<span style={{ color: '#aaa' }}>Total Stores</span>}
              value={stores.length} 
              valueStyle={{ color: '#FDE08D' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <Statistic 
              title={<span style={{ color: '#aaa' }}>Active Locations</span>}
              value={stores.filter(s => s.status === 'active').length} 
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: 0 }}>
        <Table
          dataSource={stores}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          className="custom-table"
          style={{ background: 'transparent' }}
        />
      </Card>

      <Modal
        title={<span style={{ color: '#FDE08D' }}>{editingStore ? 'Edit Store' : 'Add New Store'}</span>}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        okText={editingStore ? 'Update' : 'Create'}
        className="dark-modal"
        styles={{
          mask: { backdropFilter: 'blur(4px)' },
          content: { background: '#1a1a1a', color: '#fff' }
        }}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ status: 'active' }}
        >
          <Form.Item
            name="name"
            label={<span style={{ color: '#ccc' }}>Store Name</span>}
            rules={[{ required: true, message: 'Please input store name' }]}
          >
            <Input placeholder="E.g., KL Main Branch" />
          </Form.Item>
          <Form.Item
            name="address"
            label={<span style={{ color: '#ccc' }}>Address</span>}
            rules={[{ required: true, message: 'Please input address' }]}
          >
            <Input.TextArea rows={3} placeholder="Full address" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="phone"
                label={<span style={{ color: '#ccc' }}>Phone</span>}
              >
                <Input placeholder="Contact number" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label={<span style={{ color: '#ccc' }}>Status</span>}
              >
                <Select dropdownStyle={{ background: '#1a1a1a' }}>
                  <Option value="active">Active</Option>
                  <Option value="inactive">Inactive</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="email"
            label={<span style={{ color: '#ccc' }}>Email (Optional)</span>}
          >
            <Input placeholder="Store email" />
          </Form.Item>
        </Form>
      </Modal>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-table .ant-table {
          background: transparent !important;
          color: #fff !important;
        }
        .custom-table .ant-table-thead > tr > th {
          background: rgba(255,255,255,0.05) !important;
          color: #FDE08D !important;
          border-bottom: 1px solid rgba(255,255,255,0.1) !important;
        }
        .custom-table .ant-table-tbody > tr > td {
          border-bottom: 1px solid rgba(255,255,255,0.05) !important;
        }
        .custom-table .ant-table-tbody > tr:hover > td {
          background: rgba(255,255,255,0.02) !important;
        }
        .dark-modal .ant-modal-header, .dark-modal .ant-modal-content {
          background: #1a1a1a !important;
          color: #fff !important;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .dark-modal .ant-modal-title {
          color: #FDE08D !important;
          background: transparent !important;
        }
        .dark-modal .ant-form-item-label > label {
          color: #ccc !important;
        }
        .dark-modal .ant-input, .dark-modal .ant-select-selector {
          background: rgba(255,255,255,0.05) !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          color: #fff !important;
        }
        .ant-modal-close-icon {
          color: #fff !important;
        }
      `}} />
    </div>
  );
};

export default StoreManagement;
