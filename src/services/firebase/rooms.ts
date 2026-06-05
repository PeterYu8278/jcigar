import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  Timestamp,
  runTransaction
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { convertFirestoreTimestamps } from './auth';
import { GLOBAL_COLLECTIONS } from '../../config/globalCollections';

const ROOMS_COLLECTION = 'rooms';
const ROOM_BOOKINGS_COLLECTION = 'roomBookings';

export interface Room {
  id?: string;
  storeId: string;
  name: string;
  status: 'active' | 'inactive';
  timeslots: string[]; // e.g. ["09:00 - 12:00", "12:00 - 15:00"]
  fee: number; // Booking fee
  createdAt?: Date;
  updatedAt?: Date;
}

export interface RoomBooking {
  id?: string;
  roomId: string;
  roomName: string;
  storeId: string;
  userId: string;
  userName?: string;
  date: string; // YYYY-MM-DD
  timeslot: string; // e.g. "09:00 - 12:00"
  fee: number;
  status: 'confirmed' | 'cancelled';
  createdAt?: Date;
  updatedAt?: Date;
}

// 过滤掉 undefined 的字段，防止 Firestore 报错
const stripUndefined = (obj: Record<string, any>): Record<string, any> => {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
};

export const getAllRooms = async (storeId?: string) => {
  try {
    let q;
    if (storeId) {
      q = query(collection(db, ROOMS_COLLECTION), where('storeId', '==', storeId));
    } else {
      q = query(collection(db, ROOMS_COLLECTION));
    }
    const querySnapshot = await getDocs(q);
    const rooms = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertFirestoreTimestamps(doc.data())
    })) as Room[];
    return rooms.sort((a, b) => {
      const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tB - tA;
    });
  } catch (error) {
    console.error('[Rooms Service] getAllRooms error:', error);
    return [];
  }
};

/**
 * 获取活跃房间/包厢
 */
export const getActiveRooms = async () => {
  try {
    const q = query(
      collection(db, ROOMS_COLLECTION),
      where('status', '==', 'active')
    );
    const querySnapshot = await getDocs(q);
    const rooms = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertFirestoreTimestamps(doc.data())
    })) as Room[];
    return rooms.sort((a, b) => {
      const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tB - tA;
    });
  } catch (error) {
    console.error('[Rooms Service] getActiveRooms error:', error);
    return [];
  }
};

/**
 * 创建房间/包厢
 */
export const createRoom = async (roomData: Omit<Room, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const now = new Date();
    const docRef = await addDoc(collection(db, ROOMS_COLLECTION), {
      ...stripUndefined(roomData as Record<string, any>),
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now)
    });
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error('[Rooms Service] createRoom error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 更新房间/包厢
 */
export const updateRoom = async (roomId: string, roomData: Partial<Omit<Room, 'id' | 'createdAt' | 'updatedAt'>>) => {
  try {
    const docRef = doc(db, ROOMS_COLLECTION, roomId);
    await updateDoc(docRef, {
      ...stripUndefined(roomData as Record<string, any>),
      updatedAt: Timestamp.fromDate(new Date())
    });
    return { success: true };
  } catch (error: any) {
    console.error('[Rooms Service] updateRoom error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 删除房间/包厢
 */
export const deleteRoom = async (roomId: string) => {
  try {
    const docRef = doc(db, ROOMS_COLLECTION, roomId);
    await deleteDoc(docRef);
    return { success: true };
  } catch (error: any) {
    console.error('[Rooms Service] deleteRoom error:', error);
    return { success: false, error: error.message };
  }
};

// ========== Room Bookings ==========

/**
 * 获取指定日期的所有预订（用于判断时段是否已被预订）
 */
export const getBookingsByDate = async (date: string, roomId?: string) => {
  try {
    let q;
    if (roomId) {
      q = query(
        collection(db, ROOM_BOOKINGS_COLLECTION),
        where('date', '==', date),
        where('roomId', '==', roomId),
        where('status', '==', 'confirmed')
      );
    } else {
      q = query(
        collection(db, ROOM_BOOKINGS_COLLECTION),
        where('date', '==', date),
        where('status', '==', 'confirmed')
      );
    }
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertFirestoreTimestamps(doc.data())
    })) as RoomBooking[];
  } catch (error) {
    console.error('[Rooms Service] getBookingsByDate error:', error);
    return [];
  }
};

export const getUserBookings = async (userId: string) => {
  try {
    const q = query(
      collection(db, ROOM_BOOKINGS_COLLECTION),
      where('userId', '==', userId),
      where('status', '==', 'confirmed')
    );
    const querySnapshot = await getDocs(q);
    const bookings = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertFirestoreTimestamps(doc.data())
    })) as RoomBooking[];
    return bookings.sort((a, b) => b.date.localeCompare(a.date));
  } catch (error) {
    console.error('[Rooms Service] getUserBookings error:', error);
    return [];
  }
};

export const createBooking = async (bookingData: Omit<RoomBooking, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const now = new Date();
    
    // Deterministic ID to prevent concurrent double-booking
    const bookingDocId = `${bookingData.roomId}_${bookingData.date}_${bookingData.timeslot.replace(/[\s:-]+/g, '_')}`;
    const bookingDocRef = doc(db, ROOM_BOOKINGS_COLLECTION, bookingDocId);
    
    const userDocRef = doc(db, GLOBAL_COLLECTIONS.USERS, bookingData.userId);
    
    const result = await runTransaction(db, async (transaction) => {
      // 1. Check booking slot conflict
      const bookingSnap = await transaction.get(bookingDocRef);
      if (bookingSnap.exists()) {
        const data = bookingSnap.data();
        if (data.status === 'confirmed') {
          throw new Error('该时段已被预订');
        }
      }
      
      // 2. Check user points
      const userSnap = await transaction.get(userDocRef);
      if (!userSnap.exists()) {
        throw new Error('用户不存在');
      }
      
      const userData = userSnap.data();
      const currentPoints = userData.membership?.points || 0;
      const fee = bookingData.fee || 0;
      
      if (currentPoints < fee) {
        throw new Error('积分余额不足');
      }
      
      const newPoints = currentPoints - fee;
      
      // 3. Deduct points from user
      transaction.update(userDocRef, {
        'membership.points': newPoints,
        updatedAt: Timestamp.fromDate(now)
      });
      
      // 4. Create points record (generate random ID and set)
      const pointsRecordRef = doc(collection(db, GLOBAL_COLLECTIONS.POINTS_RECORDS));
      const pointsRecordData = {
        userId: bookingData.userId,
        userName: bookingData.userName || userData.displayName || '',
        type: 'spend',
        amount: fee,
        source: 'visit',
        description: `房间预订: ${bookingData.roomName} (${bookingData.date} ${bookingData.timeslot})`,
        relatedId: bookingDocId,
        balance: newPoints,
        createdAt: Timestamp.fromDate(now)
      };
      transaction.set(pointsRecordRef, pointsRecordData);
      
      // 5. Create the booking document
      const bookingDocData = {
        ...stripUndefined(bookingData as Record<string, any>),
        status: 'confirmed',
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now)
      };
      transaction.set(bookingDocRef, bookingDocData);
      
      return { success: true, id: bookingDocId };
    });
    
    return result;
  } catch (error: any) {
    console.error('[Rooms Service] createBooking error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 取消预订
 */
export const cancelBooking = async (bookingId: string) => {
  try {
    const docRef = doc(db, ROOM_BOOKINGS_COLLECTION, bookingId);
    await updateDoc(docRef, {
      status: 'cancelled',
      updatedAt: Timestamp.fromDate(new Date())
    });
    return { success: true };
  } catch (error: any) {
    console.error('[Rooms Service] cancelBooking error:', error);
    return { success: false, error: error.message };
  }
};
