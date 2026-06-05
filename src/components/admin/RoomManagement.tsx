import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Modal, Form, Input, InputNumber, Select, Switch, message, Typography, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { getAllRooms, createRoom, updateRoom, deleteRoom, Room } from '../../services/firebase/rooms';
import { getAllStores } from '../../services/firebase/stores';
import { useTranslation } from 'react-i18next';
import { Store } from '../../types';

const { Title, Text } = Typography;

export const RoomManagement: React.FC = () => {
  const { t } = useTranslation();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [roomsData, storesData] = await Promise.all([
        getAllRooms(),
        getAllStores()
      ]);
      setRooms(roomsData);
      setStores(storesData);
    } catch (error) {
      console.error('Failed to load rooms/stores:', error);
      message.error('加载房间和门店数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRoom = () => {
    setEditingRoom(null);
    form.resetFields();
    form.setFieldsValue({
      status: 'active',
      timeslots: ['09:00 - 12:00', '12:00 - 15:00', '15:00 - 18:00', '18:00 - 21:00', '21:00 - 00:00'],
      fee: 50
    });
    setModalVisible(true);
  };

  const handleEditRoom = (room: Room) => {
    setEditingRoom(room);
    form.resetFields();
    form.setFieldsValue({
      storeId: room.storeId,
      name: room.name,
      status: room.status,
      timeslots: room.timeslots || [],
      fee: room.fee || 0
    });
    setModalVisible(true);
  };

  const handleDeleteRoom = async (id: string) => {
    try {
      const result = await deleteRoom(id);
      if (result.success) {
        message.success('删除成功');
        loadData();
      } else {
        message.error('删除失败: ' + result.error);
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const roomData = {
        storeId: values.storeId,
        name: values.name,
        status: values.status,
        timeslots: values.timeslots || [],
        fee: values.fee || 0
      };

      if (editingRoom && editingRoom.id) {
        const result = await updateRoom(editingRoom.id, roomData);
        if (result.success) {
          message.success('更新房间成功');
          setModalVisible(false);
          loadData();
        } else {
          message.error('更新失败: ' + result.error);
        }
      } else {
        const result = await createRoom(roomData);
        if (result.success) {
          message.success('创建房间成功');
          setModalVisible(false);
          loadData();
        } else {
          message.error('创建失败: ' + result.error);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStoreName = (storeId: string) => {
    const store = stores.find(s => s.id === storeId);
    return store ? store.name : storeId;
  };

  const columns = [
    {
      title: '门店',
      dataIndex: 'storeId',
      key: 'storeId',
      render: (storeId: string) => <Text style={{ color: '#fff' }}>{getStoreName(storeId)}</Text>
    },
    {
      title: '房间/包厢名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <Text strong style={{ color: '#FFD700' }}>{name}</Text>
    },
    {
      title: '费用 (RM)',
      dataIndex: 'fee',
      key: 'fee',
      render: (fee: number) => <Text style={{ color: '#fff' }}>RM {fee}</Text>
    },
    {
      title: '预约时段',
      dataIndex: 'timeslots',
      key: 'timeslots',
      render: (timeslots: string[]) => (
        <Space size={[0, 4]} wrap>
          {timeslots && timeslots.map((slot, index) => (
            <Tag key={index} color="gold" style={{ background: 'rgba(244,175,37,0.1)', border: '1px solid rgba(244,175,37,0.3)', color: '#FFD700' }}>
              {slot}
            </Tag>
          ))}
        </Space>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? '启用' : '禁用'}
        </Tag>
      )
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Room) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditRoom(record)}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#FFFFFF'
            }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个房间吗？"
            onConfirm={() => record.id && handleDeleteRoom(record.id)}
            okText="确定"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              style={{
                background: 'rgba(255, 77, 79, 0.1)',
                border: '1px solid rgba(255, 77, 79, 0.2)',
                color: '#ff4d4f'
              }}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
          在此管理各门店房间/包厢名称、预订时段及预订费用配置。
        </Text>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAddRoom}
          style={{
            background: 'linear-gradient(to right, #FDE08D, #C48D3A)',
            border: 'none',
            color: '#111',
            fontWeight: 700,
            boxShadow: '0 4px 15px rgba(244,175,37,0.35)'
          }}
        >
          添加房间
        </Button>
      </div>

      <Table
        dataSource={rooms}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        style={{ background: 'transparent' }}
        className="points-config-form"
      />

      <Modal
        title={<span style={{ color: '#FFFFFF' }}>{editingRoom ? '编辑房间' : '添加房间'}</span>}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSave}
        confirmLoading={loading}
        okButtonProps={{
          style: {
            background: 'linear-gradient(to right, #FDE08D, #C48D3A)',
            border: 'none',
            color: '#111',
            fontWeight: 700
          }
        }}
        cancelButtonProps={{
          style: {
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#FFFFFF'
          }
        }}
        styles={{
          content: {
            background: 'linear-gradient(180deg, #221c10 0%, #181611 100%)',
            border: '1px solid rgba(244, 175, 37, 0.6)'
          },
          header: {
            background: 'transparent',
            borderBottom: '1px solid rgba(244, 175, 37, 0.6)'
          },
          body: {
            background: 'transparent',
            paddingTop: 16
          },
          footer: {
            background: 'transparent',
            borderTop: '1px solid rgba(244, 175, 37, 0.6)'
          }
        }}
        width={600}
      >
        <Form form={form} layout="vertical" className="points-config-form">
          <Form.Item
            name="storeId"
            label={<span style={{ color: 'rgba(255,255,255,0.85)' }}>所属门店</span>}
            rules={[{ required: true, message: '请选择门店' }]}
          >
            <Select placeholder="选择所属门店">
              {stores.map(store => (
                <Select.Option key={store.id} value={store.id}>
                  {store.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="name"
            label={<span style={{ color: 'rgba(255,255,255,0.85)' }}>房间/包厢名称</span>}
            rules={[{ required: true, message: '请输入房间/包厢名称' }]}
          >
            <Input placeholder="例如: 尊享VIP房, 大厅8号座" />
          </Form.Item>

          <Form.Item
            name="fee"
            label={<span style={{ color: 'rgba(255,255,255,0.85)' }}>预订费用 (RM)</span>}
            rules={[{ required: true, message: '请输入预订费用' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} placeholder="每场次或每小时费用" />
          </Form.Item>

          <Form.Item
            name="status"
            label={<span style={{ color: 'rgba(255,255,255,0.85)' }}>状态</span>}
            valuePropName="checked"
            getValueFromEvent={(checked) => checked ? 'active' : 'inactive'}
            getValueProps={(value) => ({ checked: value === 'active' })}
          >
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>

          <Form.List name="timeslots">
            {(fields, { add, remove }) => (
              <>
                <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'rgba(255,255,255,0.85)' }}>预约时段设定</span>
                  <Button type="dashed" size="small" onClick={() => add()} icon={<PlusOutlined />}>
                    添加时段
                  </Button>
                </div>
                {fields.map((field, index) => (
                  <Space key={field.key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item
                      {...field}
                      rules={[{ required: true, message: '请输入时段描述' }]}
                      style={{ flex: 1, marginBottom: 0, minWidth: 400 }}
                    >
                      <Input placeholder="时段描述，如 09:00 - 12:00 或 9AM - 1PM" />
                    </Form.Item>
                    <Button
                      type="link"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => remove(field.name)}
                      disabled={fields.length === 1}
                    />
                  </Space>
                ))}
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  );
};
