import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Modal, Form, Input, InputNumber, Select, Switch, message, Typography, Popconfirm, Tabs, DatePicker } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CalendarOutlined, AppstoreOutlined } from '@ant-design/icons';
import { getAllRooms, createRoom, updateRoom, deleteRoom, Room, getBookingsByDate, cancelBooking, RoomBooking, checkInBooking } from '../../services/firebase/rooms';
import { getAllStores } from '../../services/firebase/stores';
import { useTranslation } from 'react-i18next';
import { Store } from '../../types';
import dayjs from 'dayjs';

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

  const [viewDate, setViewDate] = useState<dayjs.Dayjs>(dayjs());
  const [dailyBookings, setDailyBookings] = useState<RoomBooking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  useEffect(() => {
    loadDailyBookings();
  }, [viewDate]);

  const loadDailyBookings = async () => {
    setLoadingBookings(true);
    try {
      const formattedDate = viewDate.format('YYYY-MM-DD');
      const bookingsData = await getBookingsByDate(formattedDate);
      setDailyBookings(bookingsData);
    } catch (error) {
      console.error('Failed to load daily bookings:', error);
      message.error('加载预约记录失败');
    } finally {
      setLoadingBookings(false);
    }
  };

  const handleAdminCancelBooking = async (bookingId: string) => {
    try {
      setLoadingBookings(true);
      const result = await cancelBooking(bookingId);
      if (result.success) {
        message.success('取消预约成功');
        loadDailyBookings();
      } else {
        message.error('取消失败: ' + (result as any).error);
      }
    } catch (error: any) {
      message.error('取消失败: ' + error.message);
    } finally {
      setLoadingBookings(false);
    }
  };

  const handleAdminCheckInBooking = async (bookingId: string) => {
    try {
      setLoadingBookings(true);
      const result = await checkInBooking(bookingId);
      if (result.success) {
        message.success('办理签到成功');
        loadDailyBookings();
      } else {
        message.error('签到失败: ' + (result as any).error);
      }
    } catch (error: any) {
      message.error('签到失败: ' + error.message);
    } finally {
      setLoadingBookings(false);
    }
  };

  const handleAddRoom = () => {
    setEditingRoom(null);
    form.resetFields();
    form.setFieldsValue({
      status: 'active',
      bookingStart: '10:00',
      bookingEnd: '22:00',
      fee: 50,
      minBookingHours: 2,
      unavailablePeriods: []
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
      bookingStart: room.bookingStart || '10:00',
      bookingEnd: room.bookingEnd || '22:00',
      fee: room.fee || 0,
      minBookingHours: room.minBookingHours || 2,
      unavailablePeriods: room.unavailablePeriods || []
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
        message.error('删除失败: ' + (result as any).error);
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
        bookingStart: values.bookingStart,
        bookingEnd: values.bookingEnd,
        timeslots: [`${values.bookingStart} - ${values.bookingEnd}`], // compatibility
        fee: values.fee || 0,
        minBookingHours: values.minBookingHours || 2,
        unavailablePeriods: values.unavailablePeriods || []
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

  const hourOptions = Array.from({ length: 25 }, (_, i) => {
    const h = String(i).padStart(2, '0');
    return `${h}:00`;
  });

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
      title: '营业时间范围',
      key: 'bookingRange',
      render: (_: any, record: Room) => (
        <Tag color="gold" style={{ background: 'rgba(244,175,37,0.1)', border: '1px solid rgba(244,175,37,0.3)', color: '#FFD700' }}>
          {record.bookingStart || '10:00'} - {record.bookingEnd || '22:00'}
        </Tag>
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

  const bookingColumns = [
    {
      title: '门店',
      dataIndex: 'storeId',
      key: 'storeId',
      render: (storeId: string) => <Text style={{ color: '#fff' }}>{getStoreName(storeId)}</Text>
    },
    {
      title: '包厢/房间名称',
      dataIndex: 'roomName',
      key: 'roomName',
      render: (roomName: string) => <Text strong style={{ color: '#FFD700' }}>{roomName}</Text>
    },
    {
      title: '预约日期',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => <Text style={{ color: '#fff' }}>{date}</Text>
    },
    {
      title: '预订人',
      dataIndex: 'userName',
      key: 'userName',
      render: (userName: string, record: RoomBooking) => (
        <div style={{ color: '#fff' }}>
          <div>{userName}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>ID: {record.userId}</div>
        </div>
      )
    },
    {
      title: '预约时段',
      dataIndex: 'timeslot',
      key: 'timeslot',
      render: (timeslot: string) => <Tag color="blue">{timeslot}</Tag>
    },
    {
      title: '所用积分',
      dataIndex: 'fee',
      key: 'fee',
      render: (fee: number) => <Text style={{ color: '#fff' }}>{fee} 积分</Text>
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        if (status === 'checked_in') {
          return <Tag color="gold">已入座/已签到</Tag>;
        }
        return (
          <Tag color={status === 'confirmed' ? 'green' : 'red'}>
            {status === 'confirmed' ? '已确认 (未签到)' : '已取消'}
          </Tag>
        );
      }
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: RoomBooking) => (
        record.status === 'confirmed' ? (
          <Space>
            <Popconfirm
              title="确定办理签到并扣除剩余 50% 积分吗？"
              onConfirm={() => record.id && handleAdminCheckInBooking(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button
                size="small"
                type="primary"
                style={{
                  background: 'linear-gradient(to right, #FDE08D, #C48D3A)',
                  border: 'none',
                  color: '#111',
                  fontWeight: 600
                }}
              >
                办理签到
              </Button>
            </Popconfirm>
            <Popconfirm
              title="确定要取消这个预约吗？已扣除的 50% 积分订金将不退还。"
              onConfirm={() => record.id && handleAdminCancelBooking(record.id)}
              okText="确定"
              cancelText="取消"
              okButtonProps={{ danger: true }}
            >
              <Button
                size="small"
                danger
                style={{
                  background: 'rgba(255, 77, 79, 0.1)',
                  border: '1px solid rgba(255, 77, 79, 0.2)',
                  color: '#ff4d4f'
                }}
              >
                取消预约
              </Button>
            </Popconfirm>
          </Space>
        ) : null
      )
    }
  ];

  return (
    <div style={{ marginTop: 16 }}>
      <Tabs
        defaultActiveKey="1"
        items={[
          {
            key: '1',
            label: (
              <span style={{ color: '#fff' }}>
                <AppstoreOutlined />
                房间配置管理
              </span>
            ),
            children: (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Text style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                    在此管理各门店房间/包厢名称、营业时间范围及预订费用配置。
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
              </>
            )
          },
          {
            key: '2',
            label: (
              <span style={{ color: '#fff' }}>
                <CalendarOutlined />
                预约记录查看
              </span>
            ),
            children: (
              <>
                <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ color: '#fff', fontSize: 14 }}>选择日期：</span>
                  <DatePicker
                    value={viewDate}
                    onChange={(date) => date && setViewDate(date)}
                    allowClear={false}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#fff'
                    }}
                  />
                  <Button
                    onClick={loadDailyBookings}
                    loading={loadingBookings}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: '#fff',
                      border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}
                  >
                    刷新记录
                  </Button>
                </div>

                <Table
                  dataSource={dailyBookings}
                  columns={bookingColumns}
                  rowKey="id"
                  loading={loadingBookings}
                  pagination={{ pageSize: 10 }}
                  style={{ background: 'transparent' }}
                  className="points-config-form"
                />
              </>
            )
          }
        ]}
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

          <Form.Item
            name="minBookingHours"
            label={<span style={{ color: 'rgba(255,255,255,0.85)' }}>最低预约小时数 (Min Booking Hours)</span>}
            rules={[{ required: true, message: '请输入最低预约小时数' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="例如: 2" />
          </Form.Item>

          <Form.Item label={<span style={{ color: 'rgba(255,255,255,0.85)' }}>不可预约时段 (Unavailable Periods)</span>}>
            <Form.List name="unavailablePeriods">
              {(fields, { add, remove }) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {fields.map((field, index) => (
                    <div key={field.key} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <Form.Item
                        {...field}
                        name={[field.name, 'start']}
                        rules={[{ required: true, message: '请选择开始时间' }]}
                        style={{ flex: 1, marginBottom: 0 }}
                      >
                        <Select placeholder="开始时间">
                          {hourOptions.map(h => (
                            <Select.Option key={h} value={h}>{h}</Select.Option>
                          ))}
                        </Select>
                      </Form.Item>
                      <span style={{ color: '#fff' }}>至</span>
                      <Form.Item
                        {...field}
                        name={[field.name, 'end']}
                        rules={[
                          { required: true, message: '请选择结束时间' },
                          ({ getFieldValue }) => ({
                            validator(_, value) {
                              const start = getFieldValue(['unavailablePeriods', field.name, 'start']);
                              if (!value || !start || value > start) {
                                  return Promise.resolve();
                              }
                              return Promise.reject(new Error('结束时间必须晚于开始时间'));
                            },
                          }),
                        ]}
                        style={{ flex: 1, marginBottom: 0 }}
                      >
                        <Select placeholder="结束时间">
                          {hourOptions.map(h => (
                            <Select.Option key={h} value={h}>{h}</Select.Option>
                          ))}
                        </Select>
                      </Form.Item>
                      <Button type="link" danger onClick={() => remove(field.name)} style={{ padding: 0 }}>
                        删除
                      </Button>
                    </div>
                  ))}
                  <Button type="dashed" onClick={() => add()} style={{ width: '100%', color: '#fff', border: '1px dashed rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.02)' }}>
                    + 添加不可预约时段
                  </Button>
                </div>
              )}
            </Form.List>
          </Form.Item>

          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              name="bookingStart"
              label={<span style={{ color: 'rgba(255,255,255,0.85)' }}>营业开始时间 (Start Time)</span>}
              rules={[{ required: true, message: '请选择营业开始时间' }]}
              style={{ flex: 1 }}
            >
              <Select placeholder="选择开始时间">
                {hourOptions.map(h => (
                  <Select.Option key={h} value={h}>{h}</Select.Option>
                ))}
              </Select>
            </Form.Item>
            
            <Form.Item
              name="bookingEnd"
              label={<span style={{ color: 'rgba(255,255,255,0.85)' }}>营业结束时间 (End Time)</span>}
              rules={[
                { required: true, message: '请选择营业结束时间' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const start = getFieldValue('bookingStart');
                    if (!value || !start || value > start) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('结束时间必须晚于开始时间'));
                  },
                }),
              ]}
              style={{ flex: 1 }}
            >
              <Select placeholder="选择结束时间">
                {hourOptions.map(h => (
                  <Select.Option key={h} value={h}>{h}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};
