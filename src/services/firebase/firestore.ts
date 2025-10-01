// Firestore数据库服务
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { User, Brand, Cigar, Event, Order, Transaction, InventoryLog } from '../../types';

// 清洗数据：移除undefined，转换日期/时间戳，深拷贝数组和对象
const sanitizeForFirestore = (input: any): any => {
  if (input === undefined) return undefined; // 上层会删除该字段
  if (input === null) return null;
  // Firestore Timestamp → Date（保持可排序字段一致性）
  if ((input as any)?.toDate && typeof (input as any).toDate === 'function') {
    const d = (input as any).toDate();
    if (d instanceof Date && !isNaN(d.getTime())) return d;
    return undefined;
  }
  // Date → Date（原样返回，避免JSON序列化丢失）
  if (input instanceof Date) {
    if (!isNaN(input.getTime())) return input;
    return undefined;
  }
  // 原始类型
  if (typeof input !== 'object') return input;
  // 数组
  if (Array.isArray(input)) {
    return input
      .map(sanitizeForFirestore)
      .filter(v => v !== undefined);
  }
  // 对象
  const result: Record<string, any> = {};
  Object.keys(input).forEach((key) => {
    const value = sanitizeForFirestore((input as any)[key]);
    if (value !== undefined) {
      result[key] = value;
    }
  });
  return result;
};

// 集合名称常量
export const COLLECTIONS = {
  USERS: 'users',
  BRANDS: 'brands',
  CIGARS: 'cigars',
  EVENTS: 'events',
  ORDERS: 'orders',
  TRANSACTIONS: 'transactions',
  INVENTORY_LOGS: 'inventory_logs',
} as const;

// 通用CRUD操作
export const createDocument = async <T>(collectionName: string, data: Omit<T, 'id'>) => {
  try {
    const sanitized = sanitizeForFirestore(data);
    const docRef = await addDoc(collection(db, collectionName), {
      ...sanitized,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error as Error };
  }
};

export const getDocument = async <T>(collectionName: string, id: string): Promise<T | null> => {
  try {
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as T;
    }
    return null;
  } catch (error) {
    return null;
  }
};

export const updateDocument = async <T>(collectionName: string, id: string, data: Partial<T>) => {
  try {
    const docRef = doc(db, collectionName, id);
    const sanitized = sanitizeForFirestore(data);
    await updateDoc(docRef, {
      ...sanitized,
      updatedAt: new Date(),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error as Error };
  }
};

export const deleteDocument = async (collectionName: string, id: string) => {
  try {
    await deleteDoc(doc(db, collectionName, id));
    return { success: true };
  } catch (error) {
    return { success: false, error: error as Error };
  }
};

// 用户相关操作
export const getUsers = async (): Promise<User[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.USERS));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  } catch (error) {
    return [];
  }
};

// 兼容命名：仪表板使用 getAllUsers
export const getAllUsers = getUsers;

export const getUserById = async (id: string): Promise<User | null> => {
  return getDocument<User>(COLLECTIONS.USERS, id);
};

export const getUsersByIds = async (ids: string[]): Promise<User[]> => {
  try {
    if (!ids || ids.length === 0) return []
    // Firestore 无法直接 by ids 批量查询非索引字段，此处简化为并发 get
    const tasks = ids.map(id => getUserById(id))
    const results = await Promise.all(tasks)
    return results.filter(Boolean) as User[]
  } catch (error) {
    return []
  }
}

// 品牌相关操作
export const getBrands = async (): Promise<Brand[]> => {
  try {
    const q = query(collection(db, COLLECTIONS.BRANDS), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Brand));
  } catch (error) {
    return [];
  }
};

export const getBrandById = async (id: string): Promise<Brand | null> => {
  return getDocument<Brand>(COLLECTIONS.BRANDS, id);
};

export const getActiveBrands = async (): Promise<Brand[]> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.BRANDS), 
      where('status', '==', 'active'),
      orderBy('name', 'asc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Brand));
  } catch (error) {
    return [];
  }
};

export const getBrandsByCountry = async (country: string): Promise<Brand[]> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.BRANDS), 
      where('country', '==', country),
      orderBy('name', 'asc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Brand));
  } catch (error) {
    return [];
  }
};

// 雪茄相关操作
export const getCigars = async (): Promise<Cigar[]> => {
  try {
    const q = query(collection(db, COLLECTIONS.CIGARS), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cigar));
  } catch (error) {
    return [];
  }
};

export const getCigarById = async (id: string): Promise<Cigar | null> => {
  return getDocument<Cigar>(COLLECTIONS.CIGARS, id);
};

export const getCigarsByBrand = async (brand: string): Promise<Cigar[]> => {
  try {
    const q = query(collection(db, COLLECTIONS.CIGARS), where('brand', '==', brand));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cigar));
  } catch (error) {
    return [];
  }
};

// 活动相关操作
export const getEvents = async (): Promise<Event[]> => {
  try {
    const q = query(collection(db, COLLECTIONS.EVENTS), orderBy('schedule.startDate', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
  } catch (error) {
    return [];
  }
};

export const getEventById = async (id: string): Promise<Event | null> => {
  return getDocument<Event>(COLLECTIONS.EVENTS, id);
};

export const getUpcomingEvents = async (): Promise<Event[]> => {
  try {
    const now = new Date();
    const q = query(
      collection(db, COLLECTIONS.EVENTS), 
      where('schedule.startDate', '>=', now),
      orderBy('schedule.startDate', 'asc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
  } catch (error) {
    return [];
  }
};

// 活动报名/取消报名
export const registerForEvent = async (eventId: string, userId: string) => {
  try {
    const eventRef = doc(db, COLLECTIONS.EVENTS, eventId);
    await updateDoc(eventRef, {
      'participants.registered': arrayUnion(userId),
      updatedAt: new Date(),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error as Error };
  }
};

export const unregisterFromEvent = async (eventId: string, userId: string) => {
  try {
    const eventRef = doc(db, COLLECTIONS.EVENTS, eventId);
    await updateDoc(eventRef, {
      'participants.registered': arrayRemove(userId),
      updatedAt: new Date(),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error as Error };
  }
};

// 订单相关操作
export const getOrdersByUser = async (userId: string): Promise<Order[]> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.ORDERS), 
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
  } catch (error) {
    return [];
  }
};

export const getAllOrders = async (): Promise<Order[]> => {
  try {
    const q = query(collection(db, COLLECTIONS.ORDERS), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
  } catch (error) {
    return [];
  }
};

// 根据活动参与者雪茄分配自动创建订单
export const createOrdersFromEventAllocations = async (eventId: string): Promise<{ success: boolean; createdOrders: number; error?: Error }> => {
  try {
    // 获取活动详情
    const event = await getEventById(eventId);
    if (!event) {
      throw new Error('活动不存在');
    }

    // 检查活动是否有雪茄分配
    const allocations = (event as any)?.allocations;
    if (!allocations || Object.keys(allocations).length === 0) {
      return { success: true, createdOrders: 0 };
    }

    const registeredUsers = (event as any)?.participants?.registered || [];
    let createdOrdersCount = 0;

    // 为每个参与者创建订单
    for (const userId of registeredUsers) {
      const allocation = allocations[userId];
      if (allocation && allocation.cigarId && allocation.quantity > 0) {
        // 获取雪茄信息
        const cigar = await getCigarById(allocation.cigarId);
        if (cigar) {
          // 创建订单
          const orderData = {
            userId: userId,
            items: [{
              cigarId: allocation.cigarId,
              quantity: allocation.quantity,
              price: cigar.price
            }],
            total: cigar.price * allocation.quantity,
            status: 'pending' as const,
            source: { type: 'event' as const, eventId },
            payment: {
              method: 'bank_transfer' as const,
              transactionId: `EVENT_${eventId}_${userId}`,
              paidAt: new Date()
            },
            shipping: {
              address: '活动现场领取'
            },
            createdAt: new Date(),
            updatedAt: new Date()
          };

          const result = await createDocument<Order>(COLLECTIONS.ORDERS, orderData);
          if (result.success) {
            createdOrdersCount++;
          }
        }
      }
    }

    return { success: true, createdOrders: createdOrdersCount };
  } catch (error) {
    return { success: false, createdOrders: 0, error: error as Error };
  }
};

// 直接销售创建订单（手动选择用户与商品）
export const createDirectSaleOrder = async (params: { userId: string; items: { cigarId: string; quantity: number }[]; note?: string }) => {
  try {
    const itemsDetailed = [] as { cigarId: string; quantity: number; price: number }[]
    let total = 0
    for (const it of params.items) {
      if (!it.cigarId || !it.quantity) continue
      const cigar = await getCigarById(it.cigarId)
      if (!cigar) continue
      itemsDetailed.push({ cigarId: it.cigarId, quantity: it.quantity, price: cigar.price })
      total += cigar.price * it.quantity
    }
    if (itemsDetailed.length === 0) {
      throw new Error('无有效商品项')
    }
    const orderData: Omit<Order, 'id'> = {
      userId: params.userId,
      items: itemsDetailed,
      total,
      status: 'pending',
      source: { type: 'direct', note: params.note },
      payment: { method: 'bank_transfer', transactionId: undefined, paidAt: new Date() },
      shipping: { address: '自提/门店' },
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const result = await createDocument<Order>(COLLECTIONS.ORDERS, orderData)
    return result
  } catch (error) {
    return { success: false, error: error as Error }
  }
}

// 财务相关操作
export const getAllTransactions = async (): Promise<Transaction[]> => {
  try {
    const q = query(collection(db, COLLECTIONS.TRANSACTIONS), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
  } catch (error) {
    return [];
  }
};

export const getTransactionsByType = async (type: Transaction['type']): Promise<Transaction[]> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.TRANSACTIONS), 
      where('type', '==', type),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
  } catch (error) {
    return [];
  }
};

export const getTransactionsByDateRange = async (startDate: Date, endDate: Date): Promise<Transaction[]> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.TRANSACTIONS),
      where('createdAt', '>=', startDate),
      where('createdAt', '<=', endDate),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
  } catch (error) {
    return [];
  }
};

export const createTransaction = async (transactionData: Omit<Transaction, 'id'>) => {
  try {
    const result = await createDocument<Transaction>(COLLECTIONS.TRANSACTIONS, transactionData);
    return result;
  } catch (error) {
    return { success: false, error: error as Error };
  }
};

// 库存变动记录相关操作
export const getAllInventoryLogs = async (): Promise<InventoryLog[]> => {
  try {
    const q = query(collection(db, COLLECTIONS.INVENTORY_LOGS), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryLog));
  } catch (error) {
    return [];
  }
};

export const createInventoryLog = async (logData: Omit<InventoryLog, 'id'>) => {
  try {
    const result = await createDocument<InventoryLog>(COLLECTIONS.INVENTORY_LOGS, logData);
    return result;
  } catch (error) {
    return { success: false, error: error as Error };
  }
};

// 实时监听
export const subscribeToCollection = <T>(
  collectionName: string,
  callback: (data: T[]) => void,
  queryConstraints?: any[]
) => {
  const col = collection(db, collectionName);
  const q = queryConstraints && queryConstraints.length > 0 
    ? query(col, ...queryConstraints)
    : col;
  
  return onSnapshot(q, (querySnapshot) => {
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
    callback(data);
  });
};

