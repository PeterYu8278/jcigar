// 全局类型定义

// 用户相关类型
export interface User {
  id: string;
  email: string;
  displayName: string;
  role: 'admin' | 'member' | 'guest' | 'vip' | 'developer';
  
  // 扁平化的常用属性（向后兼容）
  photoURL?: string;
  phone?: string;
  address?: string;
  status?: 'active' | 'inactive' | 'suspended';
  lastActive?: Date;
  
  // 会员编号（唯一标识，用于引荐码）
  // 格式：6位Base36编码（0-9, A-Z），基于 userId hash 生成
  // 示例：3K7Y2W, 1A2B3C, 000001（全数字情况）
  memberId?: string;
  
  // 会员信息（对象形式）
  membership?: {
    level: 'bronze' | 'silver' | 'gold' | 'platinum';
    joinDate?: Date;
    lastActive?: Date;
    points?: number;
    referralPoints?: number;  // 引荐获得的积分（从 referral.referrals[].firstReloadReward 计算总和）
    totalVisitHours?: number;  // 累计驻店时长（小时）
    lastCheckInAt?: Date;      // 最后一次check-in时间
    currentVisitSessionId?: string; // 当前进行中的visit session ID
    nextFirstVisitWaiverExpiresAt?: Date; // 续费后首次驻店免扣费到期时间
  };
  
  // 引荐信息
  referral?: {
    referredBy?: string | null;       // 引荐人的 memberId（不是 userId）
    referredByUserId?: string | null; // 引荐人的 userId（方便查询）
    referralDate?: Date | null;       // 被引荐日期
    referrals: Array<{
      userId: string;                 // 被引荐人的 userId
      userName?: string;              // 被引荐人的姓名
      memberId?: string;              // 被引荐人的 memberId
      firstReloadReward?: number;     // 首充奖励积分（仅记录首充奖励）
      firstReloadDate?: Date;         // 首充日期
      firstReloadRecordId?: string;   // 首充记录 ID
    }>;
    totalReferred: number;            // 累计引荐人数
    activeReferrals: number;          // 活跃引荐人数（已完成首单）
  };
  
  // 用户配置
  profile?: {
    avatar?: string;
    phone?: string;
  };
  // 用户偏好设置（根级别）
    preferences?: {
    locale?: string;              // 语言设置（'zh' | 'en' | 'zh-CN' | 'en-US'）
    notifications?: boolean;      // 主开关：开启通知
    pushNotifications?: {
      types?: {
        activity?: boolean;      // 活动提醒
        points?: boolean;        // 积分变动
        order?: boolean;         // 订单状态
        marketing?: boolean;     // 营销推广
      };
      quietHours?: {
        enabled?: boolean;
        start?: string;          // HH:mm 格式，如 "22:00"
        end?: string;            // HH:mm 格式，如 "09:00"
      };
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

// 推送通知记录（已废弃，保留用于向后兼容）
export interface PushNotificationRecord {
  id: string;
  title: string;
  body: string;
  type: 'activity' | 'points' | 'order' | 'marketing' | 'system';
  targetUsers?: string[];  // 目标用户ID列表（空表示全部用户）
  targetTopics?: string[]; // 目标主题列表
  data?: Record<string, string>; // 额外数据
  clickAction?: string;    // 点击后跳转的路径
  sentAt?: Date;          // 发送时间
  scheduledFor?: Date;    // 定时发送时间
  status: 'pending' | 'sending' | 'completed' | 'failed';
  stats?: {
    total: number;
    sent: number;
    failed: number;
  };
  createdAt: Date;
  createdBy: string;
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
  construction?: {
    wrapper?: string;  // 茄衣（最外层烟叶）
    binder?: string;   // 茄套（中间层烟叶）
    filler?: string;   // 茄芯（填充烟叶）
  };
  tastingNotes?: {
    foot?: string[];   // 脚部（前1/3）品吸笔记
    body?: string[];   // 主体（中1/3）品吸笔记
    head?: string[];   // 头部（后1/3）品吸笔记
  };
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
export type UserRole = 'guest' | 'member' | 'vip' | 'admin' | 'developer';

// 功能可见性配置
export interface FeatureVisibilityConfig {
  id: string; // 'default'
  features: {
    [featureKey: string]: {
      visible: boolean;        // 是否可见
      description: string;     // 功能描述
      category: 'frontend' | 'admin'; // 分类
      route: string;           // 路由路径
      icon?: string;           // 图标名称
      updatedAt: Date;
      updatedBy: string;       // 最后更新的开发者ID
    }
  };
  updatedAt: Date;
  updatedBy: string;
}

// 应用配置类型
export interface AppConfig {
  id: string; // 'default'
  logoUrl?: string;        // Logo URL
  appName?: string;        // 应用名称（例如：Cigar Club）
  hideFooter?: boolean;    // 是否隐藏 Footer
  colorTheme?: ColorThemeConfig;  // 颜色主题配置
  whapi?: import('./whapi').WhapiConfig;  // Whapi.Cloud WhatsApp 配置
  whapiTemplates?: import('./whapi').MessageTemplate[];  // 消息模板
  auth?: {
    disableGoogleLogin?: boolean;  // 禁用 Google 登录
    disableEmailLogin?: boolean;   // 禁用电邮登录
  };
  gemini?: {
    models?: string[];  // Gemini API 模型列表
  };
  updatedAt: Date;
  updatedBy: string;       // 最后更新的开发者ID
}

// 颜色主题配置
export interface ColorThemeConfig {
  primaryButton: {
    startColor: string;  // 渐变起始色
    endColor: string;    // 渐变结束色
  };
  secondaryButton: {
    backgroundColor: string;
    borderColor: string;
    textColor: string;
  };
  warningButton: {
    backgroundColor: string;
    borderColor: string;
    textColor: string;
  };
  border: {
    primary: string;
    secondary: string;
  };
  tag: {
    success: {
      backgroundColor: string;
      textColor: string;
      borderColor: string;
    };
    warning: {
      backgroundColor: string;
      textColor: string;
      borderColor: string;
    };
    error: {
      backgroundColor: string;
      textColor: string;
      borderColor: string;
    };
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
  icon: {
    primary: string;
  };
}

export interface Permission {
  canManageFeatures?: boolean; // 管理功能可见性（仅开发者）
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
  
  // 购买相关积分
  purchase: {
    perRinggit: number;        // 每消费1马币获得积分
  };
  
  // 充值相关积分
  reload: {
    referrerFirstReload: number; // 被引荐人首次充值，引荐人获得积分
    referredFirstReload: number; // 被引荐人首次充值，被引荐人获得积分
  };
  
  // 活动相关积分
  event: {
    registration: number;      // 活动报名积分
  };
  
  // 驻店时长费用
  visit: {
    hourlyRate: number;        // 每小时扣除积分
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
  source: 'reload' | 'membership_fee' | 'visit';  // 来源
  description: string;      // 描述
  relatedId?: string;       // 关联ID（订单ID、活动ID、驻店记录ID、年费记录ID、充值记录ID等）
  balance?: number;         // 操作后余额
  createdAt: Date;
  createdBy?: string;       // 创建人（管理员手动调整时）
}

// 驻店记录类型（Check-in/Check-out）
export interface VisitSession {
  id: string;
  userId: string;
  userName?: string;
  
  // Check-in
  checkInAt: Date;
  checkInBy: string; // 管理员ID
  
  // Check-out (可选，忘记时为空)
  checkOutAt?: Date;
  checkOutBy?: string; // 管理员ID
  
  // 时长计算
  durationMinutes?: number; // 实际驻店时长（分钟）
  durationHours?: number;   // 计费时长（小时，向上取整）
  calculatedAt?: Date;      // 计算时间
  
  // 兑换项（必须在check-in到check-out之间设定）
  redemptions?: Array<{
    recordId?: string;      // 关联的 redemptionRecords 中的记录项ID（用于更新）
    cigarId: string;
    cigarName: string;
    quantity: number;
    redeemedAt: Date;
    redeemedBy: string; // 管理员ID或用户ID（用户发起时）
  }>;
  
  // 费用结算
  pointsDeducted?: number;  // 扣除的积分
  pointsRecordId?: string;  // 关联的积分记录ID
  
  // 兑换订单关联
  orderId?: string;         // 关联的兑换订单ID（金额为0）
  outboundOrderId?: string; // 关联的出库订单ID
  
  // 状态
  status: 'pending' | 'completed' | 'expired'; // expired = 忘记check-out后自动结算
  
  // 特殊标记
  isFirstVisitAfterRenewal?: boolean; // 续费后首次驻店（不扣费）
  
  createdAt: Date;
  updatedAt: Date;
}

// 会员年费配置
export interface MembershipFeeConfig {
  id: string; // 'default'
  
  // 年费配置（按日期范围）
  annualFees: Array<{
    startDate: Date;  // 生效开始日期
    endDate?: Date;   // 生效结束日期（可选，为空表示永久生效）
    amount: number;   // 年费金额（积分）
    rate: number;     // 每小时扣除积分
  }>;
  
  updatedAt: Date;
  updatedBy: string;
}

// 会员年费记录
export interface MembershipFeeRecord {
  id: string;
  userId: string;
  userName?: string;
  
  // 扣费信息
  amount: number;              // 年费金额
  dueDate: Date;              // 应扣费日期（基于开通/续费日期+1年）
  deductedAt?: Date;          // 实际扣费时间
  pointsRecordId?: string;    // 关联的积分记录ID
  
  // 状态
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  
  // 开通/续费信息
  renewalType: 'initial' | 'renewal'; // 首次开通 | 续费
  previousDueDate?: Date;             // 上次到期日（续费时）
  
  createdAt: Date;
  updatedAt: Date;
}

// 充值记录
export interface ReloadRecord {
  id: string;
  userId: string;
  userName?: string;
  
  // 充值信息
  requestedAmount: number;    // 用户请求的金额（RM）
  pointsEquivalent: number;   // 对应的积分（基于汇率）
  
  // 状态
  status: 'pending' | 'completed' | 'rejected';
  
  // 管理员验证
  verifiedAt?: Date;
  verifiedBy?: string;
  verificationProof?: string; // 凭证URL（管理员上传）
  adminNotes?: string;
  
  // 积分记录关联
  pointsRecordId?: string;    // 验证后创建的积分记录ID
  
  createdAt: Date;
  updatedAt: Date;
}

// 兑换配置
export interface RedemptionConfig {
  id: string; // 'default'
  
  // 默认限额
  dailyLimit: number;        // 每日限额
  totalLimit: number;        // 总限额
  hourlyLimit?: number;      // 每小时限额（可选）
  
  // 时长里程碑奖励（提高限额）
  milestoneRewards: Array<{
    hoursRequired: number;   // 累计时长要求（小时）
    dailyLimitBonus: number; // 每日限额加成
    totalLimitBonus?: number; // 总限额加成（可选）
  }>;
  
  // 兑换截止时间
  cutoffTime: string;        // "23:00" (HH:mm格式)
  
  updatedAt: Date;
  updatedBy: string;
}

// 单个兑换记录项
export interface RedemptionRecordItem {
  id: string;                // 记录项的唯一ID（用于更新和删除）
  userId: string;
  userName?: string;
  cigarId: string;
  cigarName: string;
  quantity: number;
  
  // 状态
  status: 'pending' | 'completed';  // pending: 用户发起，等待管理员选择雪茄；completed: 管理员已确认
  
  // 限额追踪
  dayKey: string;            // "2025-10-28" (YYYY-MM-DD)
  hourKey?: string;          // "2025-10-28-14" (YYYY-MM-DD-HH) 如果有每小时限额
  redemptionIndex: number;   // 当日第几次兑换
  
  redeemedAt: Date;
  redeemedBy: string;        // 用户ID（用户发起）或管理员ID（管理员创建/确认）
  
  createdAt: Date;
  updatedAt?: Date;          // 管理员更新时的时间
}

// 兑换记录文档（按 visitSessionId 组织）
export interface RedemptionRecordDocument {
  id: string;                // 文档ID = visitSessionId
  visitSessionId: string;    // 关联的驻店记录ID（与文档ID相同）
  userId: string;            // 用户ID（冗余字段，便于查询）
  userName?: string;         // 用户名（冗余字段）
  redemptions: RedemptionRecordItem[];  // 该 session 的所有兑换记录
  createdAt: Date;           // 文档创建时间
  updatedAt: Date;           // 文档最后更新时间
}

// 向后兼容：RedemptionRecord 作为查询函数返回的单个记录项类型
// 包含 visitSessionId 字段以便于使用
export type RedemptionRecord = RedemptionRecordItem & {
  visitSessionId: string;    // 添加 visitSessionId 字段以保持兼容性
}

// 引荐记录（存储在 users/{referrerId}/referrals/{referredUserId} 子集合中）
export interface ReferralRecord {
  id: string;                // 被引荐人的 userId（作为文档 ID）
  referredUserId: string;    // 被引荐人的 userId
  referredUserName?: string; // 被引荐人的姓名
  referredUserMemberId?: string; // 被引荐人的 memberId
  
  // 开通会员信息
  membershipActivatedAt?: Date; // 首次开通会员日期
  
  // 首充奖励信息
  firstReloadReward?: number;   // 被引荐人首充时，引荐人获得的奖励积分
  firstReloadAt?: Date;         // 首次充值日期
  firstReloadRecordId?: string; // 首次充值记录 ID
  
  createdAt: Date;              // 引荐关系建立日期
  updatedAt: Date;              // 最后更新时间
}

