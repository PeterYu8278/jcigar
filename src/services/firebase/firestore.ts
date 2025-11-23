// Firestore数据库服务
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  setDoc,
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  arrayUnion,
  arrayRemove,
  FieldValue
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { User, Brand, Cigar, Event, Order, Transaction, InboundOrder, OutboundOrder, InventoryMovement } from '../../types';

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
  INBOUND_ORDERS: 'inbound_orders',
  OUTBOUND_ORDERS: 'outbound_orders',
  INVENTORY_MOVEMENTS: 'inventory_movements',
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
    console.error('🔷 ❌ createDocument ERROR:', error)
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
    
    // 处理点符号路径：Firestore 的 updateDoc 支持点符号路径，但需要确保值不是 undefined
    // 对于点符号路径的键，直接传递给 updateDoc，不经过 sanitizeForFirestore
    const dotNotationFields: Record<string, any> = {};
    const regularFields: Record<string, any> = {};
    
    Object.keys(data).forEach(key => {
      if (key.includes('.')) {
        // 点符号路径：直接使用，但确保值不是 undefined
        const value = (data as any)[key];
        if (value !== undefined) {
          dotNotationFields[key] = value;
        }
      } else {
        // 普通字段：使用 sanitizeForFirestore 处理
        regularFields[key] = (data as any)[key];
      }
    });
    
    const sanitized = sanitizeForFirestore(regularFields);
    
    // 合并点符号路径字段和普通字段
    const finalUpdateData = {
      ...sanitized,
      ...dotNotationFields,
      updatedAt: new Date(),
    };
    
    await updateDoc(docRef, finalUpdateData);
    
    return { success: true };
  } catch (error) {
    console.error('[updateDocument] Error:', error);
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
    // 获取所有活动，然后在内存中过滤（避免 Firestore 复合索引问题）
    const allEvents = await getEvents();
    const now = new Date();
    
    return allEvents
      .filter((event: Event) => {
        // 检查活动是否有 schedule 和 startDate
        if (!event.schedule || !event.schedule.startDate) return false;
        
        // 将 startDate 转换为 Date 对象
        let startDate: Date;
        if (event.schedule.startDate instanceof Date) {
          startDate = event.schedule.startDate;
        } else if ((event.schedule.startDate as any)?.toDate) {
          // Firestore Timestamp
          startDate = (event.schedule.startDate as any).toDate();
        } else {
          // 字符串或其他格式
          startDate = new Date(event.schedule.startDate);
        }
        
        // 过滤出未来的活动（不包括已取消的）
        return startDate >= now && event.status !== 'cancelled';
      })
      .sort((a, b) => {
        // 按开始日期升序排序
        const dateA = a.schedule.startDate instanceof Date 
          ? a.schedule.startDate 
          : (a.schedule.startDate as any)?.toDate 
            ? (a.schedule.startDate as any).toDate() 
            : new Date(a.schedule.startDate);
        const dateB = b.schedule.startDate instanceof Date 
          ? b.schedule.startDate 
          : (b.schedule.startDate as any)?.toDate 
            ? (b.schedule.startDate as any).toDate() 
            : new Date(b.schedule.startDate);
        return dateA.getTime() - dateB.getTime();
      });
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

// 获取用户参与的活动（已报名 + 已签到）
export const getEventsByUser = async (userId: string): Promise<Event[]> => {
  try {
    // 获取所有活动，然后在内存中过滤用户参与的活动
    const allEvents = await getEvents();
    
    return allEvents
      .filter((event: Event) => {
        const registered = event.participants?.registered || [];
        const checkedIn = event.participants?.checkedIn || [];
        // 用户在已报名或已签到列表中
        return registered.includes(userId) || checkedIn.includes(userId);
      })
      .sort((a, b) => {
        // 按开始日期降序排序（最新的在前）
        const dateA = a.schedule.startDate instanceof Date 
          ? a.schedule.startDate 
          : (a.schedule.startDate as any)?.toDate 
            ? (a.schedule.startDate as any).toDate() 
            : new Date(a.schedule.startDate);
        const dateB = b.schedule.startDate instanceof Date 
          ? b.schedule.startDate 
          : (b.schedule.startDate as any)?.toDate 
            ? (b.schedule.startDate as any).toDate() 
            : new Date(b.schedule.startDate);
        return dateB.getTime() - dateA.getTime();
      });
  } catch (error) {
    return [];
  }
};

// 订单相关操作
export const getOrdersByUser = async (userId: string): Promise<Order[]> => {
  try {
    // 只用 where，不用 orderBy（避免 Firestore 复合索引问题）
    const q = query(
      collection(db, COLLECTIONS.ORDERS), 
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    const orders = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
    
    // 在内存中按创建时间降序排序
    return orders.sort((a, b) => {
      const dateA = a.createdAt instanceof Date 
        ? a.createdAt 
        : (a.createdAt as any)?.toDate 
          ? (a.createdAt as any).toDate() 
          : new Date(a.createdAt);
      const dateB = b.createdAt instanceof Date 
        ? b.createdAt 
        : (b.createdAt as any)?.toDate 
          ? (b.createdAt as any).toDate() 
          : new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });
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
export const createOrdersFromEventAllocations = async (eventId: string): Promise<{ success: boolean; createdOrders: number; updatedOrders: number; error?: Error }> => {
  try {
    // 获取活动详情
    const event = await getEventById(eventId);
    if (!event) {
      throw new Error('活动不存在');
    }

    // 检查活动是否有雪茄分配
    const allocations = (event as any)?.allocations;
    if (!allocations || Object.keys(allocations).length === 0) {
      return { success: true, createdOrders: 0, updatedOrders: 0 };
    }

    const registeredUsers = (event as any)?.participants?.registered || [];
    let createdOrdersCount = 0;
    let updatedOrdersCount = 0;
    
    // 创建所有分配记录的副本，用于批量更新
    const updatedAllocations = { ...allocations };

    // 为每个参与者创建或更新订单
    for (const userId of registeredUsers) {
      const allocation = allocations[userId];
      if (allocation) {
        // 组装订单行：支持多支雪茄 + 活动费用
        const orderItems: { cigarId: string; quantity: number; price: number }[] = []
        let runningTotal = 0

        // 1) 活动费用行：名称由前端展示，这里用标识符保存，不生成出库
        const feeQty = (allocation as any)?.feeQuantity != null ? Number((allocation as any).feeQuantity) : 1
        const feeUnit = (allocation as any)?.feeUnitPrice != null
          ? Number((allocation as any).feeUnitPrice)
          : Number((event as any)?.participants?.fee || 0)
        if (feeUnit > 0 && feeQty > 0) {
          const feeId = String((event as any)?.title || 'EVENT_FEE')
          orderItems.push({ cigarId: feeId, quantity: feeQty, price: feeUnit })
          runningTotal += feeUnit * feeQty
        }

        // 2) 多行雪茄（新结构）
        const itemRows = (allocation as any)?.items as Array<{ cigarId: string; quantity: number; unitPrice?: number }> | undefined
        if (Array.isArray(itemRows) && itemRows.length > 0) {
          for (const row of itemRows) {
            if (!row?.cigarId || !row?.quantity || row.quantity <= 0) continue
            const rowCigar = await getCigarById(row.cigarId)
            const unitPrice = (row as any)?.unitPrice != null ? Number((row as any).unitPrice) : (rowCigar?.price || 0)
            orderItems.push({ cigarId: String(row.cigarId), quantity: row.quantity, price: unitPrice })
            runningTotal += unitPrice * row.quantity
          }
        } else if ((allocation as any).cigarId && (allocation as any).quantity > 0) {
          // 3) 兼容旧结构：单行雪茄
          const cigar = await getCigarById((allocation as any).cigarId)
          const qty = (allocation as any).quantity || 1
          const unitPrice = (allocation as any).unitPrice != null ? Number((allocation as any).unitPrice) : (cigar?.price || 0)
          if ((allocation as any).cigarId) {
            orderItems.push({ cigarId: String((allocation as any).cigarId), quantity: qty, price: unitPrice })
            runningTotal += unitPrice * qty
          }
        }

        if (orderItems.length > 0) {
          const orderData = {
            userId: userId,
            items: orderItems,
            total: runningTotal,
            status: 'pending' as const,
            source: { type: 'event' as const, eventId },
            payment: {
              method: 'bank_transfer' as const,
              transactionId: `EVENT_${eventId}_${userId}`,
              paidAt: new Date()
            },
            shipping: {
              address: String((event as any)?.title || '活动现场领取')
            },
            createdAt: new Date(),
            updatedAt: new Date()
          };

          let orderId: string;
          let isNewOrder = false;

          // 检查是否已存在订单
          if (allocation.orderId) {
            // 更新现有订单 - 只更新允许的字段
            const updateData = {
              items: orderData.items,
              total: orderData.total,
              status: orderData.status,
              source: orderData.source,
              payment: orderData.payment,
              shipping: orderData.shipping,
              updatedAt: new Date()
            };
            const updateResult = await updateDocument(COLLECTIONS.ORDERS, allocation.orderId, updateData);
            if (updateResult.success) {
              orderId = allocation.orderId;
              updatedOrdersCount++;
            } else {
              continue;
            }
          } else {
            // 创建新订单（自定义ID：ORD-YYYY-MM-0000-E，按活动开始日期）
            const rawStart = (event as any)?.schedule?.startDate
            const startDate: Date = rawStart && typeof (rawStart as any)?.toDate === 'function' 
              ? (rawStart as any).toDate()
              : (rawStart instanceof Date ? rawStart : new Date())
            const year = startDate.getFullYear();
            const month = String(startDate.getMonth() + 1).padStart(2, '0');
            const prefix = `ORD-${year}-${month}-`;
            const startOfMonth = new Date(year, startDate.getMonth(), 1, 0, 0, 0, 0);
            const endOfMonth = new Date(year, startDate.getMonth() + 1, 0, 23, 59, 59, 999);
            const qCount = query(
              collection(db, COLLECTIONS.ORDERS),
              where('createdAt', '>=', startOfMonth),
              where('createdAt', '<=', endOfMonth)
            );
            const snap = await getDocs(qCount);
            let seq = snap.size + 1;
            let newId = `${prefix}${String(seq).padStart(4, '0')}-E`;
            // 防止并发或同批次生成重复ID：若存在则自增直至唯一
            while (true) {
              const exists = await getDoc(doc(db, COLLECTIONS.ORDERS, newId));
              if (!exists.exists()) break;
              seq += 1;
              newId = `${prefix}${String(seq).padStart(4, '0')}-E`;
            }

            const sanitized = sanitizeForFirestore(orderData);
            await setDoc(doc(db, COLLECTIONS.ORDERS, newId), {
              ...sanitized,
              createdAt: (sanitized as any)?.createdAt || new Date(),
              updatedAt: new Date(),
            } as any);
            orderId = newId;
            isNewOrder = true;
            createdOrdersCount++;
          }

          // 如果是新订单，创建出库记录（仅对真实雪茄行生成，不含费用行）
          if (isNewOrder) {
            const outboundItems = []
            let outboundTotalQty = 0
            let outboundTotalValue = 0
            
            for (const it of orderItems) {
              // 仅对真实存在的雪茄生成出库记录（费用行不会匹配到实体雪茄）
              const cigar = await getCigarById(it.cigarId)
              if (!cigar) continue
              
              const outboundItem = {
                cigarId: it.cigarId,
                cigarName: cigar.name,
                itemType: 'cigar' as const,
                quantity: it.quantity,
                unitPrice: it.price,
                subtotal: it.quantity * it.price
              }
              
              outboundItems.push(outboundItem)
              outboundTotalQty += it.quantity
              outboundTotalValue += outboundItem.subtotal
            }
            
            // 创建出库订单
            if (outboundItems.length > 0) {
              const outboundOrderData: Omit<OutboundOrder, 'id' | 'updatedAt'> = {
                referenceNo: orderId,
                type: 'event',
                reason: String((event as any)?.title || '活动订单出库'),
                items: outboundItems,
                totalQuantity: outboundTotalQty,
                totalValue: outboundTotalValue,
                status: 'completed',
                operatorId: 'system',
                createdAt: new Date()
              }
              
              await createOutboundOrder(outboundOrderData)
            }
          }

          // 将订单ID存储到分配记录中（更新副本）
          updatedAllocations[userId] = {
            ...allocation,
            orderId: orderId
          };
        }
      }
    }

    // 批量更新所有分配记录
    await updateDocument(COLLECTIONS.EVENTS, eventId, {
      allocations: updatedAllocations
    } as any);

    return { success: true, createdOrders: createdOrdersCount, updatedOrders: updatedOrdersCount };
  } catch (error) {
    return { success: false, createdOrders: 0, updatedOrders: 0, error: error as Error };
  }
};

// 直接销售创建订单（手动选择用户与商品）
export const createDirectSaleOrder = async (params: { userId: string; items: { cigarId?: string; quantity: number; price?: number }[]; note?: string; createdAt?: Date }) => {
  try {
    const itemsDetailed: { cigarId: string; quantity: number; price: number }[] = []
    let total = 0
    for (const it of params.items) {
      if (!it?.quantity || it.quantity <= 0) continue
      const id = it.cigarId
      if (id) {
        const cigar = await getCigarById(id)
        const unitPrice = it.price != null ? Number(it.price) : (cigar?.price || 0)
        itemsDetailed.push({ cigarId: id, quantity: it.quantity, price: unitPrice })
        total += unitPrice * it.quantity
      } else {
        // 自定义费用行（无 cigarId）
        const unitPrice = Number(it.price || 0)
        if (unitPrice > 0) {
          itemsDetailed.push({ cigarId: `FEE:${Date.now()}`, quantity: it.quantity, price: unitPrice })
          total += unitPrice * it.quantity
        }
      }
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
      shipping: { address: 'Direct Sales' },
      createdAt: params.createdAt || new Date(),
      updatedAt: new Date(),
    }
    // 自定义ID：ORD-YYYY-MM-0000-M
    const now = orderData.createdAt || new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const prefix = `ORD-${year}-${month}-`
    const startOfMonth = new Date(year, now.getMonth(), 1, 0, 0, 0, 0)
    const endOfMonth = new Date(year, now.getMonth() + 1, 0, 23, 59, 59, 999)
    const qCount = query(
      collection(db, COLLECTIONS.ORDERS),
      where('createdAt', '>=', startOfMonth),
      where('createdAt', '<=', endOfMonth)
    )
    const snap = await getDocs(qCount)
    let seq = snap.size + 1
    let newId = `${prefix}${String(seq).padStart(4, '0')}-M`
    // 防止并发或同批次生成重复ID：若存在则自增直至唯一
    while (true) {
      const exists = await getDoc(doc(db, COLLECTIONS.ORDERS, newId))
      if (!exists.exists()) break
      seq += 1
      newId = `${prefix}${String(seq).padStart(4, '0')}-M`
    }

    const sanitized = sanitizeForFirestore(orderData)
    await setDoc(doc(db, COLLECTIONS.ORDERS, newId), {
      ...sanitized,
      createdAt: (sanitized as any)?.createdAt || new Date(),
      updatedAt: new Date(),
    } as any)
    const result = { success: true, id: newId }
    
    // 如果订单创建成功，创建对应的出库记录
    if (result.success) {
      const outboundItems = []
      let outboundTotalQty = 0
      let outboundTotalValue = 0
      
      for (const item of itemsDetailed) {
        const cigar = await getCigarById(item.cigarId)
        if (!cigar) continue
        
        const outboundItem = {
          cigarId: item.cigarId,
          cigarName: cigar.name,
          itemType: 'cigar' as const,
          quantity: item.quantity,
          unitPrice: item.price,
          subtotal: item.quantity * item.price
        }
        
        outboundItems.push(outboundItem)
        outboundTotalQty += item.quantity
        outboundTotalValue += outboundItem.subtotal
      }
      
      // 创建出库订单
      if (outboundItems.length > 0) {
        const outboundOrderData: Omit<OutboundOrder, 'id' | 'updatedAt'> = {
          referenceNo: result.id,
          type: 'sale',
          reason: '直接销售出库',
          items: outboundItems,
          totalQuantity: outboundTotalQty,
          totalValue: outboundTotalValue,
          status: 'completed',
          operatorId: 'system',
          createdAt: new Date()
        }
        
        await createOutboundOrder(outboundOrderData)
      }
    }
    
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
    // 基于月份生成流水号：TXN-YYYY-MM-0000
    const now = (transactionData as any)?.createdAt instanceof Date ? (transactionData as any).createdAt as Date : new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `TXN-${year}-${month}-`;

    // 统计当月已有记录数量（简单顺序号方案，非强一致性）
    const startOfMonth = new Date(year, now.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(year, now.getMonth() + 1, 0, 23, 59, 59, 999);
    const qCount = query(
      collection(db, COLLECTIONS.TRANSACTIONS),
      where('createdAt', '>=', startOfMonth),
      where('createdAt', '<=', endOfMonth)
    );
    const snap = await getDocs(qCount);
    const seq = snap.size + 1;
    const id = `${prefix}${String(seq).padStart(4, '0')}`;

    // 清洗数据并写入固定ID文档
    const sanitized = sanitizeForFirestore(transactionData);
    const payload = {
      ...sanitized,
      createdAt: (sanitized as any)?.createdAt || new Date(),
      updatedAt: new Date(),
    } as any;
    await setDoc(doc(db, COLLECTIONS.TRANSACTIONS, id), payload);
    return { success: true, id };
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

// ============================================
// 入库/出库订单管理
// ============================================

/**
 * 获取所有入库订单
 */
export const getAllInboundOrders = async (): Promise<InboundOrder[]> => {
  try {
    const q = query(collection(db, COLLECTIONS.INBOUND_ORDERS), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InboundOrder));
  } catch (error) {
    console.error('Error fetching inbound orders:', error);
    return [];
  }
};

/**
 * 按 Document ID 获取单个入库订单（精确查询）
 */
export const getInboundOrderById = async (id: string): Promise<InboundOrder | null> => {
  try {
    const docRef = doc(db, COLLECTIONS.INBOUND_ORDERS, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as InboundOrder;
    }
    return null;
  } catch (error) {
    console.error('Error fetching inbound order:', error);
    return null;
  }
};

/**
 * 按单号查询入库订单（可能返回多个，如果不同供应商使用相同单号）
 */
export const getInboundOrdersByReferenceNo = async (referenceNo: string): Promise<InboundOrder[]> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.INBOUND_ORDERS),
      where('referenceNo', '==', referenceNo),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InboundOrder));
  } catch (error) {
    console.error('Error fetching inbound orders by reference:', error);
    return [];
  }
};

/**
 * 创建入库订单（同时创建 inventory_movements）
 * 使用 Auto ID 以支持不同供应商的相同单号
 */
export const createInboundOrder = async (orderData: Omit<InboundOrder, 'id' | 'updatedAt'>): Promise<string> => {
  try {
    const referenceNo = orderData.referenceNo;
    
    // 1. 检查是否已存在相同单号（可选，如果需要防止重复）
    // 注意：如果允许不同供应商使用相同单号，可以跳过此检查
    // 或添加供应商条件
    
    // 2. 创建入库订单（使用 Auto ID）
    const sanitized = sanitizeForFirestore(orderData);
    const docRef = await addDoc(collection(db, COLLECTIONS.INBOUND_ORDERS), {
      ...sanitized,
      createdAt: orderData.createdAt || new Date(),
      updatedAt: new Date()
    });
    
    const generatedId = docRef.id;  // 自动生成的 Document ID
    
    // 3. 创建对应的 inventory_movements，包含实际的 document ID
    for (const item of orderData.items) {
      const movement = {
        cigarId: item.cigarId,
        cigarName: item.cigarName,
        itemType: item.itemType,
        type: 'in' as const,
        quantity: item.quantity,
        referenceNo: referenceNo,           // 单号（用于显示和搜索）
        orderType: 'inbound' as const,
        inboundOrderId: generatedId,        // 实际的 document ID（用于精确访问）
        reason: orderData.reason,
        unitPrice: item.unitPrice,
        createdAt: orderData.createdAt || new Date()
      };
      
      await createDocument(COLLECTIONS.INVENTORY_MOVEMENTS, movement);
    }
    
    return generatedId;  // 返回自动生成的 ID
  } catch (error) {
    console.error('Error creating inbound order:', error);
    throw error;
  }
};

/**
 * 更新入库订单（使用 Document ID）
 */
export const updateInboundOrder = async (id: string, updates: Partial<InboundOrder>): Promise<void> => {
  try {
    const sanitized = sanitizeForFirestore(updates);
    await updateDoc(doc(db, COLLECTIONS.INBOUND_ORDERS, id), {
      ...sanitized,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Error updating inbound order:', error);
    throw error;
  }
};

/**
 * 删除入库订单（同时删除关联的 inventory_movements）
 * 使用 Document ID
 */
export const deleteInboundOrder = async (id: string): Promise<void> => {
  try {
    
    if (!id || typeof id !== 'string') {
      throw new Error(`无效的订单ID: ${id}`);
    }
    
    // 1. 删除关联的 movements（通过 inboundOrderId）
    const q = query(
      collection(db, COLLECTIONS.INVENTORY_MOVEMENTS),
      where('inboundOrderId', '==', id)
    );
    const snapshot = await getDocs(q);
    await Promise.all(snapshot.docs.map(doc => {
      return deleteDoc(doc.ref);
    }));
    
    // 2. 删除订单
    await deleteDoc(doc(db, COLLECTIONS.INBOUND_ORDERS, id));
  } catch (error) {
    console.error('Error deleting inbound order:', error);
    console.error('Error details:', {
      id,
      message: (error as any)?.message,
      code: (error as any)?.code,
      stack: (error as any)?.stack
    });
    throw error;
  }
};

/**
 * 获取所有出库订单
 */
export const getAllOutboundOrders = async (): Promise<OutboundOrder[]> => {
  try {
    const q = query(collection(db, COLLECTIONS.OUTBOUND_ORDERS), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OutboundOrder));
  } catch (error) {
    console.error('Error fetching outbound orders:', error);
    return [];
  }
};

/**
 * 按 Document ID 获取单个出库订单（精确查询）
 */
export const getOutboundOrderById = async (id: string): Promise<OutboundOrder | null> => {
  try {
    const docRef = doc(db, COLLECTIONS.OUTBOUND_ORDERS, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as OutboundOrder;
    }
    return null;
  } catch (error) {
    console.error('Error fetching outbound order:', error);
    return null;
  }
};

/**
 * 按单号查询出库订单（可能返回多个）
 */
export const getOutboundOrdersByReferenceNo = async (referenceNo: string): Promise<OutboundOrder[]> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.OUTBOUND_ORDERS),
      where('referenceNo', '==', referenceNo),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OutboundOrder));
  } catch (error) {
    console.error('Error fetching outbound orders by reference:', error);
    return [];
  }
};

/**
 * 创建出库订单（同时创建 inventory_movements）
 * 使用 Auto ID 以支持可能的单号重复
 */
export const createOutboundOrder = async (orderData: Omit<OutboundOrder, 'id' | 'updatedAt'>): Promise<string> => {
  try {
    const referenceNo = orderData.referenceNo;
    
    // 1. 创建出库订单（使用 Auto ID）
    const sanitized = sanitizeForFirestore(orderData);
    const docRef = await addDoc(collection(db, COLLECTIONS.OUTBOUND_ORDERS), {
      ...sanitized,
      createdAt: orderData.createdAt || new Date(),
      updatedAt: new Date()
    });
    
    const generatedId = docRef.id;  // 自动生成的 Document ID
    
    // 2. 创建对应的 inventory_movements，包含实际的 document ID
    for (const item of orderData.items) {
      const movement = {
        cigarId: item.cigarId,
        cigarName: item.cigarName,
        itemType: item.itemType,
        type: 'out' as const,
        quantity: item.quantity,
        referenceNo: referenceNo,           // 单号（用于显示和搜索）
        orderType: 'outbound' as const,
        outboundOrderId: generatedId,       // 实际的 document ID（用于精确访问）
        reason: orderData.reason,
        unitPrice: item.unitPrice,
        createdAt: orderData.createdAt || new Date()
      };
      
      await createDocument(COLLECTIONS.INVENTORY_MOVEMENTS, movement);
    }
    
    return generatedId;  // 返回自动生成的 ID
  } catch (error) {
    console.error('Error creating outbound order:', error);
    throw error;
  }
};

/**
 * 删除出库订单（同时删除关联的 inventory_movements）
 * 使用 Document ID
 */
export const deleteOutboundOrder = async (id: string): Promise<void> => {
  try {
    // 1. 删除关联的 movements（通过 outboundOrderId）
    const q = query(
      collection(db, COLLECTIONS.INVENTORY_MOVEMENTS),
      where('outboundOrderId', '==', id)
    );
    const snapshot = await getDocs(q);
    await Promise.all(snapshot.docs.map(doc => deleteDoc(doc.ref)));
    
    // 2. 删除订单
    await deleteDoc(doc(db, COLLECTIONS.OUTBOUND_ORDERS, id));
  } catch (error) {
    console.error('Error deleting outbound order:', error);
    throw error;
  }
};

/**
 * 获取所有库存变动记录（索引表）
 */
export const getAllInventoryMovements = async (): Promise<InventoryMovement[]> => {
  try {
    const q = query(collection(db, COLLECTIONS.INVENTORY_MOVEMENTS), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryMovement));
  } catch (error) {
    console.error('Error fetching inventory movements:', error);
    return [];
  }
};

/**
 * 按产品ID获取库存变动记录
 */
export const getInventoryMovementsByCigarId = async (cigarId: string): Promise<InventoryMovement[]> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.INVENTORY_MOVEMENTS),
      where('cigarId', '==', cigarId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryMovement));
  } catch (error) {
    console.error('Error fetching movements by cigar ID:', error);
    return [];
  }
};

