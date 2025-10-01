// 全局类型定义

// 用户相关类型
export interface User {
  id: string;
  email: string;
  displayName: string;
  role: 'admin' | 'member' | 'guest';
  profile: {
    avatar?: string;
    phone?: string;
    preferences: {
      language: 'zh' | 'en';
      notifications: boolean;
    };
  };
  membership: {
    level: 'bronze' | 'silver' | 'gold' | 'platinum';
    joinDate: Date;
    lastActive: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

// 品牌类型
export interface Brand {
  id: string;
  name: string;
  description: string;
  logo?: string;
  website?: string;
  country: string;
  foundedYear?: number;
  status: 'active' | 'inactive';
  metadata: {
    totalProducts: number;
    totalSales: number;
    rating: number;
    tags: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

// 雪茄产品类型
export interface Cigar {
  id: string;
  name: string;
  brand: string;
  brandId?: string; // 关联品牌ID
  origin: string;
  size: string;
  strength: 'mild' | 'medium' | 'full';
  price: number;
  images: string[];
  description: string;
  inventory: {
    stock: number;
    reserved: number;
    minStock: number;
  };
  metadata: {
    rating: number;
    reviews: number;
    tags: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

// 聚会活动类型
export interface Event {
  id: string;
  title: string;
  description: string;
  organizerId: string;
  location: {
    name: string;
    address: string;
    coordinates?: { lat: number; lng: number };
  };
  schedule: {
    startDate: Date;
    endDate: Date;
    registrationDeadline: Date;
  };
  participants: {
    registered: string[]; // user IDs
    maxParticipants: number;
    fee: number;
  };
  cigars: {
    featured: string[]; // cigar IDs
    tasting: string[]; // cigar IDs
  };
  image?: string; // 活动图片URL
  status: 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

// 订单类型
export interface Order {
  id: string;
  userId: string;
  items: {
    cigarId: string;
    quantity: number;
    price: number;
  }[];
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  source?: {
    type: 'event' | 'direct';
    eventId?: string; // 当来源为活动时记录
    note?: string;
  };
  payment: {
    method: 'credit' | 'paypal' | 'bank_transfer';
    transactionId?: string;
    paidAt?: Date;
  };
  shipping: {
    address: string;
    trackingNumber?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// 财务记录类型
export interface Transaction {
  id: string;
  type: 'sale' | 'purchase' | 'event_fee' | 'refund';
  amount: number;
  currency: 'RM' | 'USD' | 'CNY';
  description: string;
  relatedId?: string; // order ID or event ID
  userId?: string;
  createdAt: Date;
}

// 库存变动记录类型
export interface InventoryLog {
  id: string;
  cigarId: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reason: string;
  referenceNo?: string;
  operatorId: string;
  createdAt: Date;
}

// 权限类型
export type UserRole = 'guest' | 'member' | 'admin';

export interface Permission {
  canViewEvents: boolean;
  canRegisterEvent: boolean;
  canPurchase: boolean;
  canViewProfile: boolean;
  canCreateEvent: boolean;
  canManageInventory: boolean;
  canManageUsers: boolean;
  canManageOrders: boolean;
  canViewFinance: boolean;
  canSwitchToAdmin: boolean;
}

// 路由权限配置
export interface RoutePermission {
  path: string;
  roles: UserRole[];
  component: React.ComponentType;
}
