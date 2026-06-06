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
      message.error(t('roomManagement.loadFailed'));
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
      message.error(t('roomManagement.loadBookingsFailed'));
    } finally {
      setLoadingBookings(false);
    }
  };

  const handleAdminCancelBooking = async (bookingId: string) => {
    try {
      setLoadingBookings(true);
      const result = await cancelBooking(bookingId);
      if (result.success) {
        message.success(t('roomManagement.cancelSuccess'));
        loadDailyBookings();
      } else {
        message.error(t('roomManagement.cancelFailed') + (result as any).error);
      }
    } catch (error: any) {
      message.error(t('roomManagement.cancelFailed') + error.message);
    } finally {
      setLoadingBookings(false);
    }
  };

  const handleAdminCheckInBooking = async (bookingId: string) => {
    try {
      setLoadingBookings(true);
      const result = await checkInBooking(bookingId);
      if (result.success) {
        message.success(t('roomManagement.checkInSuccess'));
        loadDailyBookings();
      } else {
        message.error(t('roomManagement.checkInFailed') + (result as any).error);
      }
    } catch (error: any) {
      message.error(t('roomManagement.checkInFailed') + error.message);
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
        message.success(t('common.success', 'Success'));
        loadData();
      } else {
        message.error(t('common.error', 'Error') + ': ' + (result as any).error);
      }
    } catch (error) {
      message.error(t('common.error', 'Error'));
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
          message.success(t('roomManagement.updateSuccess'));
          setModalVisible(false);
          loadData();
        } else {
          message.error(t('roomManagement.updateFailed') + result.error);
        }
      } else {
        const result = await createRoom(roomData);
        if (result.success) {
          message.success(t('roomManagement.createSuccess'));
          setModalVisible(false);
          loadData();
        } else {
          message.error(t('roomManagement.createFailed') + result.error);
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
      title: t('roomManagement.store'),
      dataIndex: 'storeId',
      key: 'storeId',
      render: (storeId: string) => <Text style={{ color: '#fff' }}>{getStoreName(storeId)}</Text>
    },
    {
      title: t('roomManagement.roomName'),
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <Text strong style={{ color: '#FFD700' }}>{name}</Text>
    },
    {
      title: t('roomManagement.fee'),
      dataIndex: 'fee',
      key: 'fee',
      render: (fee: number) => <Text style={{ color: '#fff' }}>RM {fee}</Text>
    },
    {
      title: t('roomManagement.bookingRange'),
      key: 'bookingRange',
      render: (_: any, record: Room) => (
        <Tag color="gold" style={{ background: 'rgba(244,175,37,0.1)', border: '1px solid rgba(244,175,37,0.3)', color: '#FFD700' }}>
          {record.bookingStart || '10:00'} - {record.bookingEnd || '22:00'}
        </Tag>
      )
    },
    {
      title: t('roomManagement.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? t('roomManagement.active') : t('roomManagement.inactive')}
        </Tag>
      )
    },
    {
      title: t('roomManagement.actions'),
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
            {t('common.edit')}
          </Button>
          <Popconfirm
            title={t('roomManagement.deleteRoomConfirm')}
            onConfirm={() => record.id && handleDeleteRoom(record.id)}
            okText={t('common.confirm')}
            cancelText={t('common.cancel')}
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
              {t('common.delete')}
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const bookingColumns = [
    {
      title: t('roomManagement.store'),
      dataIndex: 'storeId',
      key: 'storeId',
      render: (storeId: string) => <Text style={{ color: '#fff' }}>{getStoreName(storeId)}</Text>
    },
    {
      title: t('roomManagement.roomName'),
      dataIndex: 'roomName',
      key: 'roomName',
      render: (roomName: string) => <Text strong style={{ color: '#FFD700' }}>{roomName}</Text>
    },
    {
      title: t('roomManagement.bookingDate'),
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => <Text style={{ color: '#fff' }}>{date}</Text>
    },
    {
      title: t('roomManagement.bookedBy'),
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
      title: t('roomManagement.bookingSlot'),
      dataIndex: 'timeslot',
      key: 'timeslot',
      render: (timeslot: string) => <Tag color="blue">{timeslot}</Tag>
    },
    {
      title: t('roomManagement.pointsUsed'),
      dataIndex: 'fee',
      key: 'fee',
      render: (fee: number) => <Text style={{ color: '#fff' }}>{fee} {t('roomManagement.points')}</Text>
    },
    {
      title: t('roomManagement.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        if (status === 'checked_in') {
          return <Tag color="gold">{t('roomManagement.statusCheckedIn')}</Tag>;
        }
        return (
          <Tag color={status === 'confirmed' ? 'green' : 'red'}>
            {status === 'confirmed' ? t('roomManagement.statusConfirmed') : t('roomManagement.statusCancelled')}
          </Tag>
        );
      }
    },
    {
      title: t('roomManagement.actions'),
      key: 'action',
      render: (_: any, record: RoomBooking) => (
        record.status === 'confirmed' ? (
          <Space>
            <Popconfirm
              title={t('roomManagement.checkInConfirm')}
              onConfirm={() => record.id && handleAdminCheckInBooking(record.id)}
              okText={t('common.confirm')}
              cancelText={t('common.cancel')}
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
                {t('roomManagement.checkIn')}
              </Button>
            </Popconfirm>
            <Popconfirm
              title={t('roomManagement.cancelBookingConfirm')}
              onConfirm={() => record.id && handleAdminCancelBooking(record.id)}
              okText={t('common.confirm')}
              cancelText={t('common.cancel')}
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
                {t('roomManagement.cancelBooking')}
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
                {t('roomManagement.roomConfigTitle')}
              </span>
            ),
            children: (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
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
                    {t('roomManagement.addRoom')}
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
                {t('roomManagement.viewBookingsTitle')}
              </span>
            ),
            children: (
              <>
                <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ color: '#fff', fontSize: 14 }}>{t('roomManagement.selectDate')}</span>
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
                    {t('roomManagement.refreshRecords')}
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
        title={<span style={{ color: '#FFFFFF' }}>{editingRoom ? t('roomManagement.editRoom') : t('roomManagement.addRoom')}</span>}
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
            label={<span style={{ color: 'rgba(255,255,255,0.85)' }}>{t('roomManagement.store')}</span>}
            rules={[{ required: true, message: t('roomManagement.storeRequired') }]}
          >
            <Select placeholder={t('roomManagement.selectStore')}>
              {stores.map(store => (
                <Select.Option key={store.id} value={store.id}>
                  {store.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="name"
            label={<span style={{ color: 'rgba(255,255,255,0.85)' }}>{t('roomManagement.roomName')}</span>}
            rules={[{ required: true, message: t('roomManagement.roomNameRequired') }]}
          >
            <Input placeholder={t('roomManagement.roomNamePlaceholder')} />
          </Form.Item>

          <Form.Item
            name="fee"
            label={<span style={{ color: 'rgba(255,255,255,0.85)' }}>{t('roomManagement.fee')}</span>}
            rules={[{ required: true, message: t('roomManagement.feeRequired') }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} placeholder={t('roomManagement.feePlaceholder')} />
          </Form.Item>

          <Form.Item
            name="status"
            label={<span style={{ color: 'rgba(255,255,255,0.85)' }}>{t('roomManagement.status')}</span>}
            valuePropName="checked"
            getValueFromEvent={(checked) => checked ? 'active' : 'inactive'}
            getValueProps={(value) => ({ checked: value === 'active' })}
          >
            <Switch checkedChildren={t('roomManagement.active')} unCheckedChildren={t('roomManagement.inactive')} />
          </Form.Item>

          <Form.Item
            name="minBookingHours"
            label={<span style={{ color: 'rgba(255,255,255,0.85)' }}>{t('roomManagement.minBookingHours')}</span>}
            rules={[{ required: true, message: t('roomManagement.minBookingHoursRequired') }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder={t('roomManagement.minBookingHoursPlaceholder')} />
          </Form.Item>

          <Form.Item label={<span style={{ color: 'rgba(255,255,255,0.85)' }}>{t('roomManagement.unavailablePeriods')}</span>}>
            <Form.List name="unavailablePeriods">
              {(fields, { add, remove }) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {fields.map((field, index) => (
                    <div key={field.key} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <Form.Item
                        {...field}
                        name={[field.name, 'start']}
                        rules={[{ required: true, message: t('roomManagement.startTimeRequired') }]}
                        style={{ flex: 1, marginBottom: 0 }}
                      >
                        <Select placeholder={t('roomManagement.startTimePlaceholder')}>
                          {hourOptions.map(h => (
                            <Select.Option key={h} value={h}>{h}</Select.Option>
                          ))}
                        </Select>
                      </Form.Item>
                      <span style={{ color: '#fff' }}>{t('roomManagement.to')}</span>
                      <Form.Item
                        {...field}
                        name={[field.name, 'end']}
                        rules={[
                          { required: true, message: t('roomManagement.endTimeRequired') },
                          ({ getFieldValue }) => ({
                            validator(_, value) {
                              const start = getFieldValue(['unavailablePeriods', field.name, 'start']);
                              if (!value || !start || value > start) {
                                return Promise.resolve();
                              }
                              return Promise.reject(new Error(t('roomManagement.endTimeBeforeStartError')));
                            },
                          }),
                        ]}
                        style={{ flex: 1, marginBottom: 0 }}
                      >
                        <Select placeholder={t('roomManagement.endTimePlaceholder')}>
                          {hourOptions.map(h => (
                            <Select.Option key={h} value={h}>{h}</Select.Option>
                          ))}
                        </Select>
                      </Form.Item>
                      <Button type="link" danger onClick={() => remove(field.name)} style={{ padding: 0 }}>
                        {t('common.delete')}
                      </Button>
                    </div>
                  ))}
                  <Button type="dashed" onClick={() => add()} style={{ width: '100%', color: '#fff', border: '1px dashed rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.02)' }}>
                    {t('roomManagement.addUnavailablePeriod')}
                  </Button>
                </div>
              )}
            </Form.List>
          </Form.Item>

          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              name="bookingStart"
              label={<span style={{ color: 'rgba(255,255,255,0.85)' }}>{t('roomManagement.businessStartTime')}</span>}
              rules={[{ required: true, message: t('roomManagement.businessStartTimeRequired') }]}
              style={{ flex: 1 }}
            >
              <Select placeholder={t('roomManagement.startTimePlaceholder')}>
                {hourOptions.map(h => (
                  <Select.Option key={h} value={h}>{h}</Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="bookingEnd"
              label={<span style={{ color: 'rgba(255,255,255,0.85)' }}>{t('roomManagement.businessEndTime')}</span>}
              rules={[
                { required: true, message: t('roomManagement.businessEndTimeRequired') },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const start = getFieldValue('bookingStart');
                    if (!value || !start || value > start) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error(t('roomManagement.endTimeBeforeStartError')));
                  },
                }),
              ]}
              style={{ flex: 1 }}
            >
              <Select placeholder={t('roomManagement.endTimePlaceholder')}>
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
