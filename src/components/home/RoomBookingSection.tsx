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
  const [loadingBookings, setLoadingBookings] = useState(false);
  
  // Modal states
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [bookingInProgress, setBookingInProgress] = useState(false);

  // Generate date options for the next 7 days
  const dateOptions = Array.from({ length: 7 }, (_, i) => {
    const d = dayjs().add(i, 'day');
    return {
      value: d.format('YYYY-MM-DD'),
      label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.format('ddd'),
      dateLabel: d.format('D MMM'),
    };
  });

  useEffect(() => {
    loadRooms();
  }, []);

  useEffect(() => {
    if (selectedRoom) {
      loadBookings(selectedDate, selectedRoom.id);
    }
  }, [selectedDate, selectedRoom]);

  const loadRooms = async () => {
    setLoading(true);
    try {
      const [roomsData, storesData] = await Promise.all([
        getActiveRooms(),
        getAllStores()
      ]);
      setRooms(roomsData);
      setStores(storesData);
    } catch (error) {
      console.error('Failed to load rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBookings = async (date: string, roomId?: string) => {
    setLoadingBookings(true);
    try {
      const data = await getBookingsByDate(date, roomId);
      setBookings(data);
    } catch (error) {
      console.error('Failed to load bookings:', error);
    } finally {
      setLoadingBookings(false);
    }
  };

  const getStoreName = (storeId: string) => {
    const store = stores.find(s => s.id === storeId);
    return store?.name || '';
  };

  const isSlotBooked = (timeslot: string) => {
    return bookings.some(b => b.timeslot === timeslot);
  };

  const isSlotBookedByMe = (timeslot: string) => {
    return bookings.some(b => b.timeslot === timeslot && b.userId === user?.id);
  };

  const isSlotPast = (timeslot: string) => {
    if (selectedDate !== dayjs().format('YYYY-MM-DD')) return false;
    const parts = timeslot.split('-').map(s => s.trim());
    if (parts.length < 2) return false;
    const endTime = parts[1];
    const [hours, minutes] = endTime.split(':').map(Number);
    const now = dayjs();
    const slotEnd = dayjs().hour(hours === 0 ? 24 : hours).minute(minutes || 0);
    return now.isAfter(slotEnd);
  };

  const handleOpenBookingModal = (room: Room) => {
    if (!user?.id) {
      message.warning('Please login first');
      return;
    }
    setSelectedRoom(room);
    setSelectedDate(dayjs().format('YYYY-MM-DD'));
    setSelectedSlot(null);
  };

  const handleCloseBookingModal = () => {
    setSelectedRoom(null);
    setSelectedSlot(null);
  };

  const handleConfirmBooking = async () => {
    if (!selectedRoom || !selectedSlot) {
      message.warning('Please select a time slot');
      return;
    }

    const userPoints = user?.membership?.points || 0;
    const fee = selectedRoom.fee || 0;

    if (userPoints < fee) {
      message.error('积分余额不足 (Insufficient points)');
      return;
    }

    setBookingInProgress(true);
    try {
      const result = await createBooking({
        roomId: selectedRoom.id!,
        roomName: selectedRoom.name,
        storeId: selectedRoom.storeId,
        userId: user!.id,
        userName: user!.displayName || user!.email || '',
        date: selectedDate,
        timeslot: selectedSlot,
        fee,
        status: 'confirmed',
      });

      if (result.success) {
        message.success('Booking confirmed! 🎉');
        handleCloseBookingModal();
      } else {
        message.error((result as any).error || 'Booking failed');
      }
    } catch (error: any) {
      message.error(error.message || 'Booking failed, please try again');
    } finally {
      setBookingInProgress(false);
    }
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
      {/* Title */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
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

      {/* Rooms List - directly displayed as cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rooms.map(room => {
          const storeName = getStoreName(room.storeId);
          return (
            <div
              key={room.id}
              onClick={() => handleOpenBookingModal(room)}
              style={{
                background: 'linear-gradient(135deg, rgba(26,26,26,0.95), rgba(40,35,25,0.9))',
                border: '1px solid rgba(244,175,37,0.2)',
                borderRadius: 16,
                padding: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(244,175,37,0.5)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(244,175,37,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(244,175,37,0.2)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                {/* Icon */}
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, rgba(244,175,37,0.15), rgba(196,141,58,0.15))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  border: '1px solid rgba(244,175,37,0.25)',
                }}>
                  <span style={{ fontSize: 22 }}>🚪</span>
                </div>

                {/* Details */}
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: '#fff',
                    marginBottom: 3,
                  }}>
                    {room.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    {storeName && (
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
                        <EnvironmentOutlined style={{ marginRight: 3 }} />
                        {storeName}
                      </span>
                    )}
                    <span style={{
                      fontSize: 11,
                      color: '#FFD700',
                      fontWeight: 600,
                    }}>
                      {room.fee} 积分 (Points)
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <Button
                type="primary"
                style={{
                  background: 'linear-gradient(to right, #FDE08D, #C48D3A)',
                  border: 'none',
                  color: '#111',
                  fontWeight: 700,
                  borderRadius: 8,
                  fontSize: 12,
                  padding: '4px 12px',
                  height: 'auto'
                }}
              >
                预订 (Book)
              </Button>
            </div>
          );
        })}
      </div>

      {/* Booking Date & Slot Selection Modal */}
      <Modal
        open={selectedRoom !== null}
        onCancel={handleCloseBookingModal}
        title={
          <div style={{ color: '#fff', fontSize: 17, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 10 }}>
            🚪 预订包厢 - {selectedRoom?.name}
          </div>
        }
        footer={null}
        centered
        destroyOnClose
        width={420}
        styles={{
          content: {
            background: 'linear-gradient(180deg, #1f1b14 0%, #15130f 100%)',
            border: '1px solid rgba(244,175,37,0.4)',
            borderRadius: 20,
            padding: 24,
          },
          mask: {
            backdropFilter: 'blur(4px)',
          }
        }}
      >
        {selectedRoom && (
          <div>
            {/* Store & Price Summary */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: 13 }}>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>
                <EnvironmentOutlined style={{ marginRight: 4 }} />
                {getStoreName(selectedRoom.storeId)}
              </span>
              <span style={{ color: '#FFD700', fontWeight: 700 }}>
                费用: {selectedRoom.fee} 积分
              </span>
            </div>

            {/* Date Picker inside Modal */}
            <div style={{ marginBottom: 12, fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
              选择日期 (Select Date)
            </div>
            <div style={{
              display: 'flex',
              gap: 8,
              marginBottom: 20,
              overflowX: 'auto',
              paddingBottom: 6,
              scrollbarWidth: 'none',
            }}>
              {dateOptions.map(opt => {
                const isSelected = selectedDate === opt.value;
                return (
                  <div
                    key={opt.value}
                    onClick={() => {
                      setSelectedDate(opt.value);
                      setSelectedSlot(null);
                    }}
                    style={{
                      minWidth: 64,
                      padding: '8px 10px',
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
                      fontSize: 10,
                      fontWeight: 600,
                      color: isSelected ? '#111' : 'rgba(255,255,255,0.5)',
                      marginBottom: 2,
                    }}>
                      {opt.label}
                    </div>
                    <div style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: isSelected ? '#111' : '#fff',
                    }}>
                      {opt.dateLabel}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Timeslot Selector */}
            <div style={{ marginBottom: 10, fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
              选择时段 (Select Timeslot)
            </div>
            {loadingBookings ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <Spin size="small" />
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
                marginBottom: 24,
                maxHeight: 220,
                overflowY: 'auto',
                paddingRight: 4,
              }}>
                {selectedRoom.timeslots.map((slot, idx) => {
                  const booked = isSlotBooked(slot);
                  const bookedByMe = isSlotBookedByMe(slot);
                  const past = isSlotPast(slot);
                  const disabled = booked || past;
                  const isSelected = selectedSlot === slot;

                  return (
                    <div
                      key={idx}
                      onClick={() => !disabled && setSelectedSlot(slot)}
                      style={{
                        padding: '12px 10px',
                        borderRadius: 12,
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.2s ease',
                        background: bookedByMe
                          ? 'linear-gradient(135deg, rgba(52,211,153,0.15), rgba(52,211,153,0.08))'
                          : isSelected
                            ? 'linear-gradient(135deg, rgba(244,175,37,0.25), rgba(196,141,58,0.25))'
                            : booked
                              ? 'rgba(248,113,113,0.06)'
                              : past
                                ? 'rgba(255,255,255,0.03)'
                                : 'rgba(255,255,255,0.06)',
                        border: bookedByMe
                          ? '1px solid rgba(52,211,153,0.35)'
                          : isSelected
                            ? '1px solid #FFD700'
                            : booked
                              ? '1px solid rgba(248,113,113,0.15)'
                              : past
                                ? '1px solid rgba(255,255,255,0.04)'
                                : '1px solid rgba(244,175,37,0.2)',
                        opacity: past ? 0.45 : 1,
                      }}
                    >
                      <div style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: bookedByMe
                          ? '#34d399'
                          : isSelected
                            ? '#FFD700'
                            : booked
                              ? 'rgba(248,113,113,0.7)'
                              : past
                                ? 'rgba(255,255,255,0.3)'
                                : '#fff',
                        marginBottom: 4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4
                      }}>
                        <ClockCircleOutlined style={{ fontSize: 10 }} />
                        {slot}
                      </div>
                      <div style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: bookedByMe
                          ? '#34d399'
                          : isSelected
                            ? '#FFD700'
                            : booked
                              ? 'rgba(248,113,113,0.6)'
                              : past
                                ? 'rgba(255,255,255,0.25)'
                                : 'rgba(255,255,255,0.4)',
                      }}>
                        {bookedByMe ? (
                          <><CheckCircleOutlined style={{ marginRight: 2 }} />My Booking</>
                        ) : booked ? (
                          'Booked'
                        ) : past ? (
                          'Passed'
                        ) : isSelected ? (
                          'Selected'
                        ) : (
                          'Available'
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* User Points & Balance status */}
            <div style={{
              background: 'rgba(255,255,255,0.04)',
              borderRadius: 12,
              padding: 12,
              marginBottom: 24,
              border: '1px solid rgba(255,255,255,0.08)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>您的可用积分 (Your Points):</span>
                <span style={{ color: '#fff', fontWeight: 600 }}>{user?.membership?.points || 0} 积分</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>扣除积分 (Deduction):</span>
                <span style={{ color: '#FFD700', fontWeight: 700 }}>-{selectedRoom.fee} 积分</span>
              </div>
              {user && user.membership && (user.membership.points || 0) < selectedRoom.fee && (
                <div style={{ color: '#f87171', fontSize: 11, marginTop: 8, fontWeight: 600, textAlign: 'center' }}>
                  ⚠️ 积分余额不足 (Insufficient points balance)
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: 12 }}>
              <Button
                onClick={handleCloseBookingModal}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff',
                  borderRadius: 10,
                  height: 40,
                  fontWeight: 600
                }}
              >
                取消 (Cancel)
              </Button>
              <Button
                type="primary"
                onClick={handleConfirmBooking}
                loading={bookingInProgress}
                disabled={
                  !selectedSlot || 
                  (user?.membership?.points || 0) < selectedRoom.fee
                }
                style={{
                  flex: 2,
                  background: 'linear-gradient(to right, #FDE08D, #C48D3A)',
                  border: 'none',
                  color: '#111',
                  borderRadius: 10,
                  height: 40,
                  fontWeight: 700
                }}
              >
                确认预订 (Confirm)
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
