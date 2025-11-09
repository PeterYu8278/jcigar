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
    name?: string; // 雪茄名称（可选，用于显示）
    quantity: number;
    price: number;
  }[];
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'completed' | 'cancelled';
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

// 库存变动记录类型（旧架构，保留用于向后兼容）
export interface InventoryLog {
  id: string;
  cigarId: string;
  cigarName?: string;     // 雪茄名称（冗余字段，避免雪茄删除后无法显示历史记录）
  itemType?: 'cigar' | 'activity' | 'gift' | 'service' | 'other'; // 项目类型（未指定时默认为雪茄）
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reason: string;
  referenceNo?: string;
  operatorId: string;
  userId?: string;        // 关联的顾客ID（出库时）
  userName?: string;      // 关联的顾客名称（冗余字段）
  attachments?: Array<{   // 附件（订单PDF或图片）
    url: string;          // Cloudinary URL
    type: 'pdf' | 'image'; // 文件类型
    filename: string;      // 原始文件名
    uploadedAt: Date;      // 上传时间
  }>;
  createdAt: Date;
}

// 入库订单类型（新架构 - 订单维度）
export interface InboundOrder {
  id: string;                   // 单号作为 document ID
  referenceNo: string;          // 单号（冗余，便于显示）
  type: 'purchase' | 'return' | 'adjustment' | 'other'; // 入库类型
  reason: string;               // 原因
  
  // 产品明细
  items: Array<{
    cigarId: string;            // 产品ID（雪茄或特殊前缀）
    cigarName: string;          // 产品名称
    itemType: 'cigar' | 'activity' | 'gift' | 'service' | 'other';
    quantity: number;           // 数量
    unitPrice?: number;         // 单价
    subtotal?: number;          // 小计
  }>;
  
  // 金额汇总
  totalQuantity: number;        // 总数量
  totalValue: number;           // 总价值
  
  // 附件（订单级别，不重复）
  attachments?: Array<{
    url: string;
    type: 'pdf' | 'image';
    filename: string;
    uploadedAt: Date;
  }>;
  
  // 供应商信息（可选）
  supplier?: {
    name: string;
    contact?: string;
    phone?: string;
  };
  
  // 状态和审计
  status: 'pending' | 'completed' | 'cancelled';
  operatorId: string;           // 操作人
  notes?: string;               // 备注
  
  // 时间戳
  createdAt: Date;
  updatedAt: Date;
}

// 出库订单类型（新架构 - 订单维度）
export interface OutboundOrder {
  id: string;                   // 单号作为 document ID
  referenceNo: string;          // 单号
  type: 'sale' | 'event' | 'transfer' | 'other'; // 出库类型
  reason: string;
  
  // 产品明细
  items: Array<{
    cigarId: string;
    cigarName: string;
    itemType: 'cigar' | 'activity' | 'gift' | 'service' | 'other';
    quantity: number;
    unitPrice?: number;
    subtotal?: number;
  }>;
  
  // 金额汇总
  totalQuantity: number;
  totalValue: number;
  
  // 关联信息
  orderId?: string;             // 关联的销售订单ID
  userId?: string;              // 关联的顾客ID
  userName?: string;            // 关联的顾客名称
  eventId?: string;             // 关联的活动ID
  
  // 状态和审计
  status: 'pending' | 'completed' | 'cancelled';
  operatorId: string;
  notes?: string;
  
  // 时间戳
  createdAt: Date;
  updatedAt: Date;
}

// 库存变动索引表（新架构 - 产品维度，用于快速查询）
export interface InventoryMovement {
  id: string;                   // 自动生成的ID
  cigarId: string;              // 产品ID
  cigarName: string;            // 产品名称
  itemType: 'cigar' | 'activity' | 'gift' | 'service' | 'other';
  type: 'in' | 'out';           // 入库/出库
  quantity: number;             // 数量
  
  // 指向主表的外键
  referenceNo: string;          // 单号（用于显示和搜索）
  orderType: 'inbound' | 'outbound'; // 订单类型
  inboundOrderId?: string;      // 入库订单的 Document ID（精确访问）
  outboundOrderId?: string;     // 出库订单的 Document ID（精确访问）
  
  // 冗余字段（用于快速显示，避免二次查询）
  reason?: string;              // 原因
  unitPrice?: number;           // 单价
  
  // 时间戳
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
