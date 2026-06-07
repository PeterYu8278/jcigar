import React, { useState, useEffect } from 'react';
import { message, Modal, Spin, Tag, Button, Select, Slider } from 'antd';
import { CalendarOutlined, ClockCircleOutlined, CheckCircleOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { getActiveRooms, getBookingsByDate, createBooking, type Room, type RoomBooking } from '../../services/firebase/rooms';
import { getAllStores } from '../../services/firebase/stores';
import { useAuthStore } from '../../store/modules/auth';
import { useTranslation } from 'react-i18next';
import { Store } from '../../types';
import dayjs from 'dayjs';

interface RoomBookingSectionProps {
  style?: React.CSSProperties;
}

export const RoomBookingSection: React.FC<RoomBookingSectionProps> = ({ style }) => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [bookings, setBookings] = useState<RoomBooking[]>([]);
  const [allDayBookings, setAllDayBookings] = useState<RoomBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(false);

  // Modal states
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [endTime, setEndTime] = useState<string | null>(null);
  const [bookingInProgress, setBookingInProgress] = useState(false);

  // Time conversion helper functions
  const timeToMinutes = (timeStr: string): number => {
    const parts = timeStr.split(':').map(Number);
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  };

  const minutesToTime = (mins: number): string => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  // Get booked intervals for checking overlaps
  const getBookedIntervals = () => {
    return bookings
      .filter(b => b.status === 'confirmed')
      .map(b => {
        const parts = b.timeslot.split('-').map(s => s.trim());
        return {
          start: timeToMinutes(parts[0]),
          end: timeToMinutes(parts[1])
        };
      });
  };

  // Check if candidate start time has passed for today
  const isTimePast = (timeStr: string) => {
    if (selectedDate !== dayjs().format('YYYY-MM-DD')) return false;
    const [hours, minutes] = timeStr.split(':').map(Number);
    const now = dayjs();
    const slotTime = dayjs().hour(hours).minute(minutes || 0);
    return now.isAfter(slotTime);
  };

  // Grid Selection states
  const [sliderValue, setSliderValue] = useState<[number, number] | null>(null);
  const [selectedStartPoint, setSelectedStartPoint] = useState<number | null>(null);
  const [isRangeFinalized, setIsRangeFinalized] = useState<boolean>(false);

  // Reset selection when room or date changes, or pre-populate if user has an existing booking
  useEffect(() => {
    if (selectedRoom) {
      const myExistingBooking = bookings.find(b => b.userId === user?.id && b.status === 'confirmed');
      if (myExistingBooking) {
        const parts = myExistingBooking.timeslot.split('-').map(s => s.trim());
        const startH = timeToMinutes(parts[0]) / 60;
        const endH = timeToMinutes(parts[1]) / 60;
        setSliderValue([startH, endH]);
        setStartTime(parts[0]);
        setEndTime(parts[1]);
        setSelectedStartPoint(startH);
        setIsRangeFinalized(true);
      } else {
        setSliderValue(null);
        setStartTime(null);
        setEndTime(null);
        setSelectedStartPoint(null);
        setIsRangeFinalized(false);
      }
    }
  }, [selectedRoom, selectedDate, bookings]);

  // Check if current slider selection is invalid (overlaps with booked or past hours, or less than configured minimum hours duration)
  const isSliderValueInvalid = () => {
    if (!sliderValue || !selectedRoom) return true;

    // Minimum hours check (configured per room, default to 2)
    const minHours = selectedRoom.minBookingHours || 2;
    const hours = sliderValue[1] - sliderValue[0];
    if (hours < minHours) return true;

    const startMins = sliderValue[0] * 60;
    const endMins = sliderValue[1] * 60;

    // 1. Check overlaps with already booked intervals (excluding current user's own bookings to allow extension)
    const bookedByOthers = bookings
      .filter(b => (b.status === 'confirmed' || b.status === 'checked_in') && b.userId !== user?.id)
      .map(b => {
        const parts = b.timeslot.split('-').map(s => s.trim());
        return {
          start: timeToMinutes(parts[0]),
          end: timeToMinutes(parts[1])
        };
      });

    // Add unavailable periods to treat them as booked
    if (selectedRoom.unavailablePeriods) {
      selectedRoom.unavailablePeriods.forEach(p => {
        bookedByOthers.push({
          start: timeToMinutes(p.start),
          end: timeToMinutes(p.end)
        });
      });
    }

    const hasOverlap = bookedByOthers.some(interval => startMins < interval.end && interval.start < endMins);
    if (hasOverlap) return true;

    // 2. Check if selected start time has already passed for today
    for (let h = sliderValue[0]; h < sliderValue[1]; h++) {
      if (isTimePast(`${String(h + 1).padStart(2, '0')}:00`)) {
        return true;
      }
    }

    return false;
  };

  // Click handler to select start and end times via repeat clicks or instant extensions
  const handleCellClick = (h: number) => {
    if (!selectedRoom) return;
    const startMins = h * 60;
    const endMins = (h + 1) * 60;

    // Find bookings by other users
    const bookedByOthers = bookings
      .filter(b => (b.status === 'confirmed' || b.status === 'checked_in') && b.userId !== user?.id)
      .map(b => {
        const parts = b.timeslot.split('-').map(s => s.trim());
        return {
          start: timeToMinutes(parts[0]),
          end: timeToMinutes(parts[1])
        };
      });

    // Add unavailable periods to treat them as booked/unavailable
    if (selectedRoom.unavailablePeriods) {
      selectedRoom.unavailablePeriods.forEach(p => {
        bookedByOthers.push({
          start: timeToMinutes(p.start),
          end: timeToMinutes(p.end)
        });
      });
    }

    const isBookedByOthers = bookedByOthers.some(interval => startMins < interval.end && interval.start < endMins);
    const isPast = isTimePast(`${String(h + 1).padStart(2, '0')}:00`);
    if (isBookedByOthers || isPast) {
      message.warning('该时段不可预约 (This slot is unavailable)');
      return;
    }

    // Check if current user has an existing booking on this day
    const myExistingBooking = bookings.find(b => b.userId === user?.id && b.status === 'confirmed');

    if (myExistingBooking) {
      const parts = myExistingBooking.timeslot.split('-').map(s => s.trim());
      const existStart = timeToMinutes(parts[0]) / 60;
      const existEnd = timeToMinutes(parts[1]) / 60;

      const currentStart = sliderValue ? sliderValue[0] : existStart;
      const currentEnd = sliderValue ? sliderValue[1] : existEnd;

      if (h < existStart) {
        // 1. Advance the start time: check conflicts on path [h, existStart]
        let hasConflict = false;
        for (let checkH = h; checkH < existStart; checkH++) {
          const checkStartMins = checkH * 60;
          const checkEndMins = (checkH + 1) * 60;
          const checkBookedByOthers = bookedByOthers.some(interval => checkStartMins < interval.end && interval.start < checkEndMins);
          const checkPast = isTimePast(`${String(checkH + 1).padStart(2, '0')}:00`);
          if (checkBookedByOthers || checkPast) {
            hasConflict = true;
            break;
          }
        }

        if (hasConflict) {
          message.warning('延长的起始时段存在已被占用或过期的格子，无法延长。');
        } else {
          setSliderValue([h, currentEnd]);
          setStartTime(`${String(h).padStart(2, '0')}:00`);
          setEndTime(`${String(currentEnd).padStart(2, '0')}:00`);
        }
      } else {
        // 2. Extend the end time: check conflicts on path [existEnd, h + 1]
        let hasConflict = false;
        for (let checkH = existEnd; checkH < h + 1; checkH++) {
          const checkStartMins = checkH * 60;
          const checkEndMins = (checkH + 1) * 60;
          const checkBookedByOthers = bookedByOthers.some(interval => checkStartMins < interval.end && interval.start < checkEndMins);
          const checkPast = isTimePast(`${String(checkH + 1).padStart(2, '0')}:00`);
          if (checkBookedByOthers || checkPast) {
            hasConflict = true;
            break;
          }
        }

        if (hasConflict) {
          message.warning('延长的结束时段存在已被占用或过期的格子，无法延长。');
        } else {
          setSliderValue([currentStart, h + 1]);
          setStartTime(`${String(currentStart).padStart(2, '0')}:00`);
          setEndTime(`${String(h + 1).padStart(2, '0')}:00`);
        }
      }
    } else {
      // Normal booking: first click start, second click end
      if (selectedStartPoint === null || isRangeFinalized) {
        setSelectedStartPoint(h);
        setSliderValue([h, h + 1]);
        setStartTime(`${String(h).padStart(2, '0')}:00`);
        setEndTime(`${String(h + 1).padStart(2, '0')}:00`);
        setIsRangeFinalized(false);
      } else {
        if (h < selectedStartPoint) {
          // Reset start point
          setSelectedStartPoint(h);
          setSliderValue([h, h + 1]);
          setStartTime(`${String(h).padStart(2, '0')}:00`);
          setEndTime(`${String(h + 1).padStart(2, '0')}:00`);
          setIsRangeFinalized(false);
        } else {
          let hasConflict = false;
          const newStart = selectedStartPoint;
          const newEnd = h + 1;
          for (let checkH = newStart; checkH < newEnd; checkH++) {
            const checkStartMins = checkH * 60;
            const checkEndMins = (checkH + 1) * 60;
            const checkBookedByOthers = bookedByOthers.some(interval => checkStartMins < interval.end && interval.start < checkEndMins);
            const checkPast = isTimePast(`${String(checkH + 1).padStart(2, '0')}:00`);
            if (checkBookedByOthers || checkPast) {
              hasConflict = true;
              break;
            }
          }

          if (hasConflict) {
            setSelectedStartPoint(h);
            setSliderValue([h, h + 1]);
            setStartTime(`${String(h).padStart(2, '0')}:00`);
            setEndTime(`${String(h + 1).padStart(2, '0')}:00`);
            setIsRangeFinalized(false);
          } else {
            setSliderValue([newStart, newEnd]);
            setStartTime(`${String(newStart).padStart(2, '0')}:00`);
            setEndTime(`${String(newEnd).padStart(2, '0')}:00`);
            setIsRangeFinalized(true);
          }
        }
      }
    }
  };

  // Generate date options for the next 7 days
  const dateOptions = Array.from({ length: 7 }, (_, i) => {
    const d = dayjs().add(i, 'day');
    return {
      value: d.format('YYYY-MM-DD'),
      label: i === 0 ? t('roomBooking.today') : i === 1 ? t('roomBooking.tomorrow') : d.format('ddd'),
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

  useEffect(() => {
    const fetchAllDayBookings = async () => {
      try {
        const data = await getBookingsByDate(selectedDate);
        setAllDayBookings(data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchAllDayBookings();
  }, [selectedDate]);

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



  const handleOpenBookingModal = (room: Room | null) => {
    if (!user?.id) {
      message.warning(t('auth.pleaseLogin') || 'Please login first');
      return;
    }
    
    // Check if there is an active booking today for this user to prioritize
    const existingToday = allDayBookings.find(
      b => b.userId === user?.id && (b.status === 'confirmed' || b.status === 'checked_in')
    );

    if (room) {
      setSelectedRoom(room);
      setSelectedStoreId(room.storeId);
    } else if (existingToday) {
      const bookedRoom = rooms.find(r => r.id === existingToday.roomId);
      if (bookedRoom) {
        setSelectedRoom(bookedRoom);
        setSelectedStoreId(bookedRoom.storeId);
      } else {
        const firstStoreId = stores.length > 0 ? stores[0].id : null;
        setSelectedStoreId(firstStoreId);
        if (firstStoreId) {
          const activeStoreRooms = rooms.filter(r => r.storeId === firstStoreId && r.status === 'active');
          setSelectedRoom(activeStoreRooms.length > 0 ? activeStoreRooms[0] : null);
        } else {
          setSelectedRoom(null);
        }
      }
    } else {
      const firstStoreId = stores.length > 0 ? stores[0].id : null;
      setSelectedStoreId(firstStoreId);
      if (firstStoreId) {
        const activeStoreRooms = rooms.filter(r => r.storeId === firstStoreId && r.status === 'active');
        setSelectedRoom(activeStoreRooms.length > 0 ? activeStoreRooms[0] : null);
      } else {
        setSelectedRoom(null);
      }
    }
    setSelectedDate(dayjs().format('YYYY-MM-DD'));
    setSelectedSlot(null);
    setStartTime(null);
    setEndTime(null);
  };

  const handleCloseBookingModal = () => {
    setSelectedRoom(null);
    setSelectedStoreId(null);
    setSelectedSlot(null);
    setStartTime(null);
    setEndTime(null);
  };

  const handleStoreChange = (storeId: string) => {
    setSelectedStoreId(storeId);
    const storeRooms = rooms.filter(r => r.storeId === storeId && r.status === 'active');
    if (storeRooms.length > 0) {
      setSelectedRoom(storeRooms[0]);
    } else {
      setSelectedRoom(null);
    }
    setSelectedSlot(null);
    setStartTime(null);
    setEndTime(null);
  };

  const handleRoomSelectChange = (roomId: string) => {
    const room = rooms.find(r => r.id === roomId) || null;
    setSelectedRoom(room);
    setSelectedSlot(null);
    setStartTime(null);
    setEndTime(null);
  };

  const calculateHours = (timeslot: string): number => {
    const parts = timeslot.split('-').map(s => s.trim());
    if (parts.length < 2) return 0;
    const startMins = timeToMinutes(parts[0]);
    const endMins = timeToMinutes(parts[1]);
    return (endMins - startMins) / 60;
  };

  const handleConfirmBooking = async () => {
    if (!selectedRoom || !startTime || !endTime || !sliderValue) {
      message.warning('Please select start and end times');
      return;
    }

    const minHours = selectedRoom.minBookingHours || 2;
    const hours = sliderValue[1] - sliderValue[0];
    if (hours < minHours) {
      message.error(`最低预约时间为 ${minHours} 小时 (Minimum booking duration is ${minHours} hours)`);
      return;
    }

    const totalFee = hours * selectedRoom.fee;
    const depositFee = Math.round(totalFee * 0.5);

    // Find if user has an existing booking to determine points delta
    const myExistingBooking = bookings.find(b => b.userId === user?.id && b.status === 'confirmed');
    const oldPaidFee = myExistingBooking
      ? (myExistingBooking.paidFee || Math.round((calculateHours(myExistingBooking.timeslot) * selectedRoom.fee) * 0.5))
      : 0;

    const netPointsRequired = Math.max(0, depositFee - oldPaidFee);
    const userPoints = user?.membership?.points || 0;

    if (userPoints < netPointsRequired) {
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
        timeslot: `${startTime} - ${endTime}`,
        fee: totalFee,
        paidFee: depositFee,
        status: 'confirmed',
      });

      if (result.success) {
        message.success(t('roomBooking.bookingSuccess'));
        try {
          const updatedBookings = await getBookingsByDate(selectedDate);
          setAllDayBookings(updatedBookings);
        } catch (e) {
          console.error(e);
        }
        handleCloseBookingModal();
      } else {
        message.error((result as any).error || t('roomBooking.bookingFailed'));
      }
    } catch (error: any) {
      message.error(error.message || t('roomBooking.bookingFailed'));
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
        <h3 style={{ margin: '0 0 8px', color: '#fff', fontSize: 16, fontWeight: 700 }}>{t('roomBooking.title')}</h3>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, margin: '0 0 16px' }}>
          {t('roomBooking.noRoomsAvailable')}
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
            {t('roomBooking.goToSettings')}
          </Button>
        )}
      </div>
    );
  }

  const myActiveBookingToday = allDayBookings.find(
    b => b.userId === user?.id && (b.status === 'confirmed' || b.status === 'checked_in')
  );

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
          {t('roomBooking.title')}
        </h3>
      </div>

      {/* Unified Private Room Booking Entry */}
      <div
        onClick={() => handleOpenBookingModal(null)}
        style={{
          background: 'linear-gradient(135deg, rgba(26,26,26,0.95), rgba(40,35,25,0.9))',
          border: '1px solid rgba(244,175,37,0.25)',
          borderRadius: 16,
          padding: '16px 20px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          transition: 'all 0.3s ease',
          boxShadow: '0 4px 15px rgba(244,175,37,0.08)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'rgba(244,175,37,0.5)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(244,175,37,0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(244,175,37,0.25)';
          e.currentTarget.style.boxShadow = '0 4px 15px rgba(244,175,37,0.08)';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: 'linear-gradient(135deg, rgba(244,175,37,0.15), rgba(196,141,58,0.15))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            border: '1px solid rgba(244,175,37,0.25)',
          }}>
            <span style={{ fontSize: 24 }}>🚪</span>
          </div>

          <div style={{ minWidth: 0 }}>
            <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#fff' }}>
              {t('roomBooking.unifiedTitle')}
            </h4>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {t('roomBooking.unifiedSubTitle')}
            </p>
            {myActiveBookingToday && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#52c41a' }} />
                <span style={{ fontSize: 11, color: '#52c41a', fontWeight: 600 }}>
                  {t('roomBooking.legendMyBooking')}: {myActiveBookingToday.roomName} ({myActiveBookingToday.timeslot})
                </span>
              </div>
            )}
          </div>
        </div>

        <Button
          type="primary"
          style={{
            background: 'linear-gradient(to right, #FDE08D, #C48D3A)',
            border: 'none',
            color: '#111',
            fontWeight: 700,
            borderRadius: 8,
            fontSize: 13,
            padding: '6px 16px',
            height: 'auto',
            flexShrink: 0
          }}
        >
          {t('roomBooking.unifiedBtn')}
        </Button>
      </div>

      {/* Booking Date & Slot Selection Modal */}
      <Modal
        open={selectedStoreId !== null}
        onCancel={handleCloseBookingModal}
        title={null}
        footer={null}
        centered
        destroyOnClose
        width={420}
        styles={{
          content: {
            background: 'linear-gradient(180deg, #1f1b14 0%, #15130f 100%)',
            border: '1px solid rgba(244,175,37,0.4)',
            borderRadius: 20,
            padding: '12px 16px',
            maxHeight: '95vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          },
          body: {
            background: 'transparent',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            overflow: 'hidden',
            marginTop: 0
          },
          mask: {
            backdropFilter: 'blur(4px)',
          }
        }}
      >
        {selectedStoreId && (() => {
          const open = selectedRoom ? (selectedRoom.bookingStart ? parseInt(selectedRoom.bookingStart.split(':')[0], 10) : 10) : 10;
          const close = selectedRoom ? (selectedRoom.bookingEnd ? parseInt(selectedRoom.bookingEnd.split(':')[0], 10) : 22) : 22;
          
          // Calculate values for User Points & Balance status
          const hours = sliderValue ? (sliderValue[1] - sliderValue[0]) : 0;
          const totalFee = selectedRoom ? hours * selectedRoom.fee : 0;
          const depositFee = Math.round(totalFee * 0.5);
          
          const myExistingBooking = bookings.find(b => b.userId === user?.id && b.status === 'confirmed');
          const oldPaidFee = myExistingBooking
            ? (myExistingBooking.paidFee || Math.round((calculateHours(myExistingBooking.timeslot) * (selectedRoom?.fee || 0)) * 0.5))
            : 0;
          const netPointsRequired = Math.max(0, depositFee - oldPaidFee);
          const userPoints = user?.membership?.points || 0;
          const minHours = selectedRoom?.minBookingHours || 2;
          const isInsufficient = userPoints < netPointsRequired;
          const isMinDurationInvalid = hours > 0 && hours < minHours;

          return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: 'calc(95vh - 24px)', overflow: 'hidden' }}>
              {/* Image Banner */}
              <div style={{
                margin: '-12px -16px 12px -16px',
                width: 'calc(100% + 32px)',
                height: 110,
                overflow: 'hidden',
                position: 'relative',
                flexShrink: 0,
              }}>
                <img
                  src="https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=600&q=80"
                  alt="Cigar Lounge"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                  }}
                />
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 40%, rgba(21,19,15,1) 100%)',
                }} />
              </div>

              {/* Title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 6, flexShrink: 0 }}>
                <span style={{ fontSize: 16 }}>🚪</span>
                <span style={{ color: '#fff', fontSize: 15, fontWeight: 700 }}>{t('roomBooking.unifiedTitle')}</span>
              </div>

              {/* Scrollable Container */}
              <div style={{
                overflowY: 'auto',
                overflowX: 'hidden',
                flex: 1,
                paddingRight: 4,
                marginBottom: 10,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}>
                {/* Store & Room Selectors */}
                <div className="points-config-form" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
                      {t('roomBooking.selectStore')}
                    </div>
                    <Select
                      value={selectedStoreId || undefined}
                      onChange={handleStoreChange}
                      style={{ width: '100%', height: 32 }}
                      placeholder={t('roomBooking.selectStore')}
                      options={stores.map(s => ({ value: s.id, label: s.name }))}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
                      {t('roomBooking.selectRoom')}
                    </div>
                    <Select
                      value={selectedRoom?.id || undefined}
                      onChange={handleRoomSelectChange}
                      style={{ width: '100%', height: 32 }}
                      placeholder={t('roomBooking.selectRoom')}
                      disabled={!selectedStoreId}
                      options={rooms.filter(r => r.storeId === selectedStoreId && r.status === 'active').map(r => ({ value: r.id, label: r.name }))}
                    />
                  </div>
                </div>

                {!selectedRoom ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: 'rgba(255,255,255,0.5)' }}>
                    {t('roomBooking.noRoomsAvailable')}
                  </div>
                ) : (
                  <>
                    {/* Date Picker inside Modal */}
                    <div>
                      <div style={{ marginBottom: 6, fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
                        {t('roomBooking.selectDate')}
                      </div>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, 1fr)',
                        gap: 4,
                        marginBottom: 4,
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
                                padding: '4px 2px',
                                borderRadius: 8,
                                cursor: 'pointer',
                                textAlign: 'center',
                                transition: 'all 0.25s ease',
                                background: isSelected
                                  ? 'linear-gradient(135deg, #FDE08D, #C48D3A)'
                                  : 'rgba(255,255,255,0.06)',
                                border: isSelected
                                  ? '1px solid transparent'
                                  : '1px solid rgba(255,255,255,0.1)',
                              }}
                            >
                              <div style={{
                                  fontSize: 9,
                                  fontWeight: 600,
                                  color: isSelected ? '#111' : 'rgba(255,255,255,0.5)',
                                  marginBottom: 1,
                                }}>
                                {opt.label}
                              </div>
                              <div style={{
                                  fontSize: 9,
                                  fontWeight: 700,
                                  color: isSelected ? '#111' : '#fff',
                                }}>
                                {opt.dateLabel}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Clickable Hourly Grid Selector */}
                    <div>
                      <div style={{ marginBottom: 6, fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
                        {t('roomBooking.selectTimeslot')}
                      </div>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: 6,
                        marginBottom: 4
                      }}>
                        {(() => {
                          const segments = [];
                          for (let h = open; h < close; h++) {
                            const startMins = h * 60;
                            const endMins = (h + 1) * 60;

                            // Find matching booking to determine ownership
                            const matchingBooking = bookings.find(b => {
                              if (b.status !== 'confirmed' && b.status !== 'checked_in') return false;
                              const parts = b.timeslot.split('-').map(s => s.trim());
                              const bStart = timeToMinutes(parts[0]);
                              const bEnd = timeToMinutes(parts[1]);
                              return startMins >= bStart && endMins <= bEnd;
                            });

                            const isUnavailable = selectedRoom.unavailablePeriods?.some(p => {
                              const pStart = timeToMinutes(p.start);
                              const pEnd = timeToMinutes(p.end);
                              return startMins >= pStart && endMins <= pEnd;
                            });

                            let isBookedByOthers = false;
                            let isBookedByMe = false;
                            let isCheckedInByMe = false;

                            if (matchingBooking) {
                              if (matchingBooking.userId === user?.id) {
                                if (matchingBooking.status === 'checked_in') {
                                  isCheckedInByMe = true;
                                } else {
                                  isBookedByMe = true;
                                }
                              } else {
                                isBookedByOthers = true;
                              }
                            }

                            const isPast = isTimePast(`${String(h + 1).padStart(2, '0')}:00`);
                            const isSlotSelected = sliderValue && h >= sliderValue[0] && h < sliderValue[1];

                            segments.push(
                              <div
                                key={h}
                                onClick={() => {
                                  if (isPast || isBookedByOthers || isUnavailable) return;
                                  handleCellClick(h);
                                }}
                                style={{
                                  padding: '6px 2px',
                                  borderRadius: 8,
                                  cursor: (isPast || isBookedByOthers || isUnavailable) ? 'not-allowed' : 'pointer',
                                  textAlign: 'center',
                                  transition: 'all 0.2s ease',
                                  border: isSlotSelected
                                    ? '1px solid #FFD700'
                                    : '1px solid rgba(255,255,255,0.06)',
                                  background: isSlotSelected
                                    ? 'rgba(254,224,141,0.15)'
                                    : isCheckedInByMe
                                    ? 'rgba(212,175,55,0.12)'
                                    : isBookedByMe
                                    ? 'rgba(82,196,26,0.1)'
                                    : isBookedByOthers
                                    ? 'rgba(255,77,79,0.05)'
                                    : isUnavailable
                                    ? 'rgba(255,255,255,0.03)'
                                    : isPast
                                    ? 'rgba(255,255,255,0.02)'
                                    : 'rgba(255,255,255,0.04)',
                                }}
                              >
                                <div style={{
                                  fontSize: 9,
                                  fontWeight: 600,
                                  color: isSlotSelected
                                    ? '#FFD700'
                                    : isCheckedInByMe
                                    ? '#D4AF37'
                                    : isBookedByMe
                                    ? '#52c41a'
                                    : (isPast || isBookedByOthers || isUnavailable)
                                    ? 'rgba(255,255,255,0.2)'
                                    : '#fff',
                                  textDecoration: (isPast || isBookedByOthers) ? 'line-through' : 'none'
                                }}>
                                  {`${String(h).padStart(2, '0')}:00`}
                                </div>
                                <div style={{
                                  fontSize: 7,
                                  marginTop: 1,
                                  color: isSlotSelected
                                    ? '#FFD700'
                                    : isCheckedInByMe
                                    ? '#D4AF37'
                                    : isBookedByMe
                                    ? '#52c41a'
                                    : isBookedByOthers
                                    ? '#ff4d4f'
                                    : isUnavailable
                                    ? 'rgba(255,255,255,0.25)'
                                    : isPast
                                    ? 'rgba(255,255,255,0.15)'
                                    : 'rgba(255,255,255,0.4)',
                                  fontWeight: (isSlotSelected || isBookedByMe || isCheckedInByMe) ? 600 : 400
                                }}>
                                  {isSlotSelected
                                    ? t('roomBooking.statusSelected')
                                    : isCheckedInByMe
                                    ? t('roomBooking.statusCheckedIn')
                                    : isBookedByMe
                                    ? t('roomBooking.statusMyBooking')
                                    : isBookedByOthers
                                    ? t('roomBooking.statusBooked')
                                    : isUnavailable
                                    ? t('roomBooking.statusUnavailable')
                                    : isPast
                                    ? t('roomBooking.statusPast')
                                    : t('roomBooking.statusAvailable')}
                                </div>
                              </div>
                            );
                          }
                          return segments;
                        })()}
                      </div>

                      {/* Color keys legend */}
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, fontSize: 8, color: 'rgba(255,255,255,0.4)', marginTop: 4, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ width: 6, height: 6, borderRadius: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }} />
                          <span>{t('roomBooking.legendAvailable')}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ width: 6, height: 6, borderRadius: 1, background: 'rgba(255,77,79,0.05)', border: '1px solid rgba(255,77,79,0.2)' }} />
                          <span>{t('roomBooking.legendBooked')}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ width: 6, height: 6, borderRadius: 1, background: 'rgba(82,196,26,0.1)', border: '1px solid rgba(82,196,26,0.3)' }} />
                          <span>{t('roomBooking.legendMyBooking')}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ width: 6, height: 6, borderRadius: 1, background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)' }} />
                          <span>{t('roomBooking.legendCheckedIn')}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ width: 6, height: 6, borderRadius: 1, background: 'rgba(254,224,141,0.15)', border: '1px solid #FFD700' }} />
                          <span>{t('roomBooking.legendSelected')}</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Sticky Footer Container */}
              {selectedRoom && (
                <div style={{ flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* User Points & Balance status */}
                  <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: 12,
                    padding: '8px 12px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6
                  }}>
                    {/* Top Row: Rate and Available Points */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 6 }}>
                      <div>
                        <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, display: 'block' }}>{t('roomBooking.hourlyRateLabel')}</span>
                        <span style={{ color: '#fff', fontWeight: 600, fontSize: 12 }}>{selectedRoom.fee} {t('roomBooking.pointsPerHour')}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, display: 'block' }}>{t('roomBooking.availablePointsLabel')}</span>
                        <span style={{ color: '#FFD700', fontWeight: 700, fontSize: 12 }}>{userPoints} {t('roomBooking.points')}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {/* Duration and Total */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                        <span style={{ color: 'rgba(255,255,255,0.6)' }}>{t('roomBooking.duration')}</span>
                        <span style={{ color: '#fff', fontWeight: 500 }}>
                          {hours > 0 ? t('roomBooking.hoursTotal', { hours, total: totalFee }) : '-'}
                        </span>
                      </div>

                      {/* Paid Deposit */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                        <span style={{ color: 'rgba(255,255,255,0.6)' }}>{t('roomBooking.paidDeposit')}</span>
                        <span style={{ color: 'rgba(255,255,255,0.8)' }}>
                          {myExistingBooking ? `${oldPaidFee} ${t('roomBooking.points')}` : '-'}
                        </span>
                      </div>

                      {/* Deposit Required / Net Deposit Required */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                        <span style={{ color: 'rgba(255,255,255,0.6)' }}>
                          {myExistingBooking ? t('roomBooking.netDepositRequired') : t('roomBooking.depositRequired')}
                        </span>
                        <span style={{ color: '#FFD700', fontWeight: 700, fontSize: 13 }}>
                          {hours > 0 
                            ? (myExistingBooking ? `${netPointsRequired} ${t('roomBooking.points')}` : `${depositFee} ${t('roomBooking.points')}`)
                            : '-'
                          }
                        </span>
                      </div>

                      {/* Check-in Balance */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                        <span style={{ color: 'rgba(255,255,255,0.45)' }}>{t('roomBooking.balanceAtCheckin')}</span>
                        <span style={{ color: 'rgba(255,255,255,0.6)' }}>
                          {hours > 0 ? `${totalFee - depositFee} ${t('roomBooking.points')}` : '-'}
                        </span>
                      </div>
                    </div>

                    {isMinDurationInvalid && (
                      <div style={{ color: '#f87171', fontSize: 10, marginTop: 2, fontWeight: 600, textAlign: 'center' }}>
                        {t('roomBooking.minBookingHoursError', { count: minHours })}
                      </div>
                    )}
                    {isInsufficient && !isMinDurationInvalid && (
                      <div style={{ color: '#f87171', fontSize: 10, marginTop: 2, fontWeight: 600, textAlign: 'center' }}>
                        {t('roomBooking.insufficientPointsError')}
                      </div>
                    )}
                  </div>

                  {/* Modal Actions */}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <Button
                      onClick={handleCloseBookingModal}
                      style={{
                        flex: 1,
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: '#fff',
                        borderRadius: 10,
                        height: 36,
                        fontWeight: 600,
                        fontSize: 13
                      }}
                    >
                      {t('common.cancel')}
                    </Button>
                    <Button
                      type="primary"
                      onClick={handleConfirmBooking}
                      loading={bookingInProgress}
                      disabled={
                        isSliderValueInvalid() ||
                        isInsufficient
                      }
                      style={{
                        flex: 2,
                        background: 'linear-gradient(to right, #FDE08D, #C48D3A)',
                        border: 'none',
                        color: '#111',
                        borderRadius: 10,
                        height: 36,
                        fontWeight: 700,
                        fontSize: 13
                      }}
                    >
                      {t('roomBooking.confirmBooking')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};
