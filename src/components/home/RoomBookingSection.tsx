import React, { useState, useEffect } from 'react';
import { message, Modal, Spin, Tag, Button } from 'antd';
import { CalendarOutlined, ClockCircleOutlined, CheckCircleOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { getActiveRooms, getBookingsByDate, createBooking, type Room, type RoomBooking } from '../../services/firebase/rooms';
import { getAllStores } from '../../services/firebase/stores';
import { useAuthStore } from '../../store/modules/auth';
import type { Store } from '../../types';
import dayjs from 'dayjs';

interface RoomBookingSectionProps {
  style?: React.CSSProperties;
}

export const RoomBookingSection: React.FC<RoomBookingSectionProps> = ({ style }) => {
  const { user } = useAuthStore();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [bookings, setBookings] = useState<RoomBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);

  // 生成接下来 7 天的日期
  const dateOptions = Array.from({ length: 7 }, (_, i) => {
    const d = dayjs().add(i, 'day');
    return {
      value: d.format('YYYY-MM-DD'),
      label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.format('ddd'),
      dateLabel: d.format('D MMM'),
    };
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadBookings(selectedDate);
  }, [selectedDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [roomsData, storesData] = await Promise.all([
        getActiveRooms(),
        getAllStores()
      ]);
      setRooms(roomsData);
      setStores(storesData);
      await loadBookings(selectedDate);
    } catch (error) {
      console.error('Failed to load rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBookings = async (date: string) => {
    try {
      const data = await getBookingsByDate(date);
      setBookings(data);
    } catch (error) {
      console.error('Failed to load bookings:', error);
    }
  };

  const getStoreName = (storeId: string) => {
    const store = stores.find(s => s.id === storeId);
    return store?.name || '';
  };

  const isSlotBooked = (roomId: string, timeslot: string) => {
    return bookings.some(b => b.roomId === roomId && b.timeslot === timeslot);
  };

  const isSlotBookedByMe = (roomId: string, timeslot: string) => {
    return bookings.some(b => b.roomId === roomId && b.timeslot === timeslot && b.userId === user?.id);
  };

  const isSlotPast = (timeslot: string) => {
    if (selectedDate !== dayjs().format('YYYY-MM-DD')) return false;
    // 从timeslot中提取结束时间来判断是否已过
    const parts = timeslot.split('-').map(s => s.trim());
    if (parts.length < 2) return false;
    const endTime = parts[1];
    const [hours, minutes] = endTime.split(':').map(Number);
    const now = dayjs();
    const slotEnd = dayjs().hour(hours === 0 ? 24 : hours).minute(minutes || 0);
    return now.isAfter(slotEnd);
  };

  const handleBookSlot = async (room: Room, timeslot: string) => {
    if (!user?.id) {
      message.warning('Please login first');
      return;
    }

    if (isSlotBooked(room.id!, timeslot)) {
      if (isSlotBookedByMe(room.id!, timeslot)) {
        message.info('You already booked this slot');
      } else {
        message.warning('This slot is already booked');
      }
      return;
    }

    if (isSlotPast(timeslot)) {
      message.warning('This time slot has already passed');
      return;
    }

    Modal.confirm({
      title: <span style={{ color: '#fff' }}>Confirm Booking</span>,
      content: (
        <div style={{ color: 'rgba(255,255,255,0.85)' }}>
          <div style={{ marginBottom: 8 }}><strong>{room.name}</strong></div>
          <div style={{ marginBottom: 4 }}>📅 {dayjs(selectedDate).format('D MMM YYYY (ddd)')}</div>
          <div style={{ marginBottom: 4 }}>🕐 {timeslot}</div>
          {room.fee > 0 && <div style={{ marginBottom: 4 }}>💰 RM {room.fee}</div>}
        </div>
      ),
      okText: 'Confirm',
      cancelText: 'Cancel',
      centered: true,
      okButtonProps: {
        style: {
          background: 'linear-gradient(to right, #FDE08D, #C48D3A)',
          border: 'none',
          color: '#111',
          fontWeight: 700
        }
      },
      cancelButtonProps: {
        style: {
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.2)',
          color: '#fff'
        }
      },
      styles: {
        content: {
          background: 'linear-gradient(180deg, #221c10 0%, #181611 100%)',
          border: '1px solid rgba(244,175,37,0.6)',
        },
        header: { background: 'transparent', borderBottom: '1px solid rgba(244,175,37,0.3)' },
        body: { background: 'transparent' },
        footer: { background: 'transparent', borderTop: '1px solid rgba(244,175,37,0.3)' },
      },
      onOk: async () => {
        setBookingInProgress(true);
        try {
          const result = await createBooking({
            roomId: room.id!,
            roomName: room.name,
            storeId: room.storeId,
            userId: user.id,
            userName: user.displayName || user.email || '',
            date: selectedDate,
            timeslot,
            fee: room.fee,
            status: 'confirmed',
          });

          if (result.success) {
            message.success('Booking confirmed! 🎉');
            await loadBookings(selectedDate);
          } else {
            message.error(result.error || 'Booking failed');
          }
        } catch (error) {
          message.error('Booking failed, please try again');
        } finally {
          setBookingInProgress(false);
        }
      }
    });
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0', ...style }}>
        <Spin />
      </div>
    );
  }

  if (rooms.length === 0) {
    const isAdminOrDeveloper = user?.role === 'admin' || user?.role === 'developer';
    return (
      <div style={{
        marginBottom: 24,
        padding: '24px',
        borderRadius: 16,
        background: 'linear-gradient(135deg, rgba(26,26,26,0.95), rgba(40,35,25,0.9))',
        border: '1px solid rgba(244,175,37,0.2)',
        textAlign: 'center',
        ...style
      }}>
        <CalendarOutlined style={{ fontSize: 32, color: '#FFD700', marginBottom: 12 }} />
        <h3 style={{ margin: '0 0 8px', color: '#fff', fontSize: 16, fontWeight: 700 }}>Rooms Booking</h3>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, margin: '0 0 16px' }}>
          暂无可用房间，请联系管理员配置。 (No rooms available for booking)
        </p>
        {isAdminOrDeveloper && (
          <Button
            type="primary"
            onClick={() => window.location.href = '/admin/visit-sessions'}
            style={{
              background: 'linear-gradient(to right, #FDE08D, #C48D3A)',
              border: 'none',
              color: '#111',
              fontWeight: 700,
              borderRadius: 8
            }}
          >
            去配置房间 (Go to Settings)
          </Button>
        )}
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 24, ...style }}>
      {/* 标题 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
      }}>
        <h3 style={{
          margin: 0,
          fontSize: 18,
          fontWeight: 700,
          color: '#f8f8f8'
        }}>
          <CalendarOutlined style={{ marginRight: 8, color: '#FFD700' }} />
          Rooms Booking
        </h3>
      </div>

      {/* 日期选择器 - 横向滚动 */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 16,
        overflowX: 'auto',
        paddingBottom: 4,
        scrollbarWidth: 'none',
      }}>
        {dateOptions.map(opt => {
          const isSelected = selectedDate === opt.value;
          return (
            <div
              key={opt.value}
              onClick={() => setSelectedDate(opt.value)}
              style={{
                minWidth: 64,
                padding: '8px 12px',
                borderRadius: 12,
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.25s ease',
                background: isSelected
                  ? 'linear-gradient(135deg, #FDE08D, #C48D3A)'
                  : 'rgba(255,255,255,0.06)',
                border: isSelected
                  ? '1px solid transparent'
                  : '1px solid rgba(255,255,255,0.1)',
                flexShrink: 0,
              }}
            >
              <div style={{
                fontSize: 11,
                fontWeight: 600,
                color: isSelected ? '#111' : 'rgba(255,255,255,0.5)',
                marginBottom: 2,
              }}>
                {opt.label}
              </div>
              <div style={{
                fontSize: 13,
                fontWeight: 700,
                color: isSelected ? '#111' : '#fff',
              }}>
                {opt.dateLabel}
              </div>
            </div>
          );
        })}
      </div>

      {/* 房间列表 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rooms.map(room => {
          const isExpanded = expandedRoom === room.id;
          const storeName = getStoreName(room.storeId);
          const bookedCount = room.timeslots.filter(ts => isSlotBooked(room.id!, ts)).length;
          const availableCount = room.timeslots.length - bookedCount;

          return (
            <div
              key={room.id}
              style={{
                background: 'linear-gradient(135deg, rgba(26,26,26,0.95), rgba(40,35,25,0.9))',
                border: '1px solid rgba(244,175,37,0.2)',
                borderRadius: 16,
                overflow: 'hidden',
                transition: 'all 0.3s ease',
              }}
            >
              {/* 房间头部 - 可点击展开 */}
              <div
                onClick={() => setExpandedRoom(isExpanded ? null : (room.id || null))}
                style={{
                  padding: '14px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  transition: 'background 0.2s',
                }}
              >
                {/* 房间图标 */}
                <div style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, rgba(244,175,37,0.15), rgba(196,141,58,0.15))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  border: '1px solid rgba(244,175,37,0.25)',
                }}>
                  <span style={{ fontSize: 20 }}>🚪</span>
                </div>

                {/* 房间信息 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: '#fff',
                    marginBottom: 3,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {room.name}
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    flexWrap: 'wrap',
                  }}>
                    {storeName && (
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
                        <EnvironmentOutlined style={{ marginRight: 3 }} />
                        {storeName}
                      </span>
                    )}
                    {room.fee > 0 && (
                      <span style={{
                        fontSize: 11,
                        color: '#FFD700',
                        fontWeight: 600,
                      }}>
                        RM {room.fee}
                      </span>
                    )}
                  </div>
                </div>

                {/* 可用数量 + 展开箭头 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{
                    fontSize: 11,
                    padding: '3px 8px',
                    borderRadius: 6,
                    background: availableCount > 0
                      ? 'rgba(52,211,153,0.15)'
                      : 'rgba(248,113,113,0.15)',
                    color: availableCount > 0 ? '#34d399' : '#f87171',
                    fontWeight: 600,
                  }}>
                    {availableCount}/{room.timeslots.length}
                  </span>
                  <span style={{
                    color: 'rgba(244,175,37,0.6)',
                    fontSize: 14,
                    transition: 'transform 0.25s ease',
                    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0)',
                    display: 'inline-block',
                  }}>
                    ›
                  </span>
                </div>
              </div>

              {/* 展开的时段选择 */}
              {isExpanded && (
                <div style={{
                  padding: '4px 16px 16px',
                  borderTop: '1px solid rgba(244,175,37,0.1)',
                }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                    gap: 8,
                    marginTop: 10,
                  }}>
                    {room.timeslots.map((slot, idx) => {
                      const booked = isSlotBooked(room.id!, slot);
                      const bookedByMe = isSlotBookedByMe(room.id!, slot);
                      const past = isSlotPast(slot);
                      const disabled = booked || past;

                      return (
                        <div
                          key={idx}
                          onClick={() => !disabled && handleBookSlot(room, slot)}
                          style={{
                            padding: '10px 12px',
                            borderRadius: 10,
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            textAlign: 'center',
                            transition: 'all 0.2s ease',
                            background: bookedByMe
                              ? 'linear-gradient(135deg, rgba(52,211,153,0.2), rgba(52,211,153,0.1))'
                              : booked
                                ? 'rgba(248,113,113,0.08)'
                                : past
                                  ? 'rgba(255,255,255,0.03)'
                                  : 'rgba(255,255,255,0.06)',
                            border: bookedByMe
                              ? '1px solid rgba(52,211,153,0.4)'
                              : booked
                                ? '1px solid rgba(248,113,113,0.2)'
                                : past
                                  ? '1px solid rgba(255,255,255,0.05)'
                                  : '1px solid rgba(244,175,37,0.2)',
                            opacity: past ? 0.4 : 1,
                            position: 'relative',
                          }}
                          onMouseEnter={(e) => {
                            if (!disabled) {
                              e.currentTarget.style.background = 'rgba(244,175,37,0.12)';
                              e.currentTarget.style.borderColor = 'rgba(244,175,37,0.5)';
                              e.currentTarget.style.transform = 'scale(1.02)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!disabled) {
                              e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                              e.currentTarget.style.borderColor = 'rgba(244,175,37,0.2)';
                              e.currentTarget.style.transform = 'scale(1)';
                            }
                          }}
                        >
                          <div style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: bookedByMe
                              ? '#34d399'
                              : booked
                                ? 'rgba(248,113,113,0.7)'
                                : past
                                  ? 'rgba(255,255,255,0.3)'
                                  : '#fff',
                            marginBottom: 3,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4,
                          }}>
                            <ClockCircleOutlined style={{ fontSize: 10 }} />
                            {slot}
                          </div>
                          <div style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: bookedByMe
                              ? '#34d399'
                              : booked
                                ? 'rgba(248,113,113,0.6)'
                                : past
                                  ? 'rgba(255,255,255,0.25)'
                                  : 'rgba(244,175,37,0.7)',
                          }}>
                            {bookedByMe ? (
                              <><CheckCircleOutlined style={{ marginRight: 3 }} />My Booking</>
                            ) : booked ? (
                              'Booked'
                            ) : past ? (
                              'Passed'
                            ) : (
                              'Available'
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
