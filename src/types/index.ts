// 全局类型定义

// 用户相关类型
export interface User {
  id: string;
  email: string;
  displayName: string;
  role: 'admin' | 'member' | 'guest';
  
  // 扁平化的常用属性（向后兼容）
  photoURL?: string;
  phone?: string;
  address?: string;
  status?: 'active' | 'inactive' | 'suspended';
  lastActive?: Date;
  
  // 会员编号（唯一标识，用于引荐码）
  memberId?: string;  // 格式：M000001, M000002...
  
  // 会员信息（对象形式）
  membership?: {
    level: 'bronze' | 'silver' | 'gold' | 'platinum';
    joinDate?: Date;
    lastActive?: Date;
    points?: number;
    referralPoints?: number;  // 引荐获得的积分
  };
  
  // 引荐信息
  referral?: {
    referredBy?: string | null;       // 引荐人的 memberId（不是 userId）
    referredByUserId?: string | null; // 引荐人的 userId（方便查询）
    referralDate?: Date | null;       // 被引荐日期
    referrals: string[];              // 我引荐的人的 userId 列表
    totalReferred: number;            // 累计引荐人数
    activeReferrals: number;          // 活跃引荐人数（已完成首单）
  };
  
  // 用户配置
  profile?: {
    avatar?: string;
    phone?: string;
    preferences?: {
      language: 'zh' | 'en';
      notifications: boolean;
    };
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
    checkedIn?: string[]; // 已签到的 user IDs
    maxParticipants: number;
    fee: number;
  };
  cigars: {
    featured: string[]; // cigar IDs
    tasting: string[]; // cigar IDs
  };
  image?: string; // 活动图片URL
  coverImage?: string; // 活动封面图片URL（别名）
  status: 'draft' | 'published' | 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  isPrivate?: boolean; // 是否为私人活动
  createdAt: Date;
  updatedAt: Date;
}

// 订单类型
export interface Order {
  id: string;
  orderNo?: string; // 订单编号
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
  // 类别可选（已移除前端依赖）
  type?: 'sale' | 'purchase' | 'event_fee' | 'refund';
  amount: number;
  currency?: 'RM' | 'USD' | 'CNY';
  description: string;
  relatedId?: string; // order ID or event ID
  relatedOrders?: Array<{ orderId: string; amount: number }>; // multiple related orders and allocated amount
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

// 积分配置类型
export interface PointsConfig {
  id: string;  // 固定为 'default'
  
  // 注册相关积分
  registration: {
    base: number;              // 基础注册积分
    withReferral: number;      // 被引荐注册积分
    referrerReward: number;    // 引荐人奖励积分
  };
  
  // 购买相关积分
  purchase: {
    firstOrder: number;        // 首次购买奖励
    perRinggit: number;        // 每消费1马币获得积分
    referrerFirstOrder: number; // 被引荐人首次购买，引荐人获得积分
  };
  
  // 活动相关积分
  event: {
    registration: number;      // 活动报名积分
    checkIn: number;           // 活动签到积分
    completion: number;        // 完成活动积分
  };
  
  // 其他积分
  other: {
    profileComplete: number;   // 完善资料积分
    firstLogin: number;        // 首次登录积分
    dailyCheckIn: number;      // 每日签到积分
  };
  
  updatedAt: Date;
  updatedBy: string;  // 更新人的 userId
}

// 积分记录类型
export interface PointsRecord {
  id: string;
  userId: string;           // 用户ID
  userName?: string;        // 用户名（冗余字段，方便查询）
  type: 'earn' | 'spend';   // 获得 | 消费
  amount: number;           // 积分数量
  source: 'registration' | 'referral' | 'purchase' | 'event' | 'profile' | 'checkin' | 'admin' | 'other';  // 来源
  description: string;      // 描述
  relatedId?: string;       // 关联ID（订单ID、活动ID等）
  balance?: number;         // 操作后余额
  createdAt: Date;
  createdBy?: string;       // 创建人（管理员手动调整时）
}
