/**
 * 功能定义配置
 * 定义系统中所有可管理的功能及其属性
 */
import type { FeatureVisibilityConfig } from '../types';

export interface FeatureDefinition {
  key: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  route: string;
  category: 'frontend' | 'admin';
  icon: string;
  defaultVisible: boolean;
}

// 功能定义列表
export const FEATURE_DEFINITIONS: FeatureDefinition[] = [
  // 前端功能
  {
    key: 'home',
    name: '首页',
    nameEn: 'Home',
    description: '系统首页，展示主要内容和功能入口',
    descriptionEn: 'System homepage, displaying main content and feature entries',
    route: '/',
    category: 'frontend',
    icon: 'HomeOutlined',
    defaultVisible: true,
  },
  {
    key: 'events',
    name: '活动',
    nameEn: 'Events',
    description: '查看和参与各类活动',
    descriptionEn: 'View and participate in various events',
    route: '/events',
    category: 'frontend',
    icon: 'CalendarOutlined',
    defaultVisible: true,
  },
  {
    key: 'shop',
    name: '商城',
    nameEn: 'Shop',
    description: '浏览和购买雪茄产品',
    descriptionEn: 'Browse and purchase cigar products',
    route: '/shop',
    category: 'frontend',
    icon: 'ShoppingOutlined',
    defaultVisible: true,
  },
  {
    key: 'profile',
    name: '个人中心',
    nameEn: 'Profile',
    description: '查看和管理个人信息',
    descriptionEn: 'View and manage personal information',
    route: '/profile',
    category: 'frontend',
    icon: 'UserOutlined',
    defaultVisible: true,
  },
  {
    key: 'ai-cigar',
    name: 'AI识茄',
    nameEn: 'AI Cigar Recognition',
    description: '使用AI识别雪茄信息',
    descriptionEn: 'Use AI to recognize cigar information',
    route: '/scanner',
    category: 'frontend',
    icon: 'EyeOutlined',
    defaultVisible: true,
  },
  // 管理后台功能
  {
    key: 'dashboard',
    name: '仪表板',
    nameEn: 'Dashboard',
    description: '管理后台首页，展示系统概览',
    descriptionEn: 'Admin dashboard homepage, displaying system overview',
    route: '/admin',
    category: 'admin',
    icon: 'DashboardOutlined',
    defaultVisible: true,
  },
  {
    key: 'users',
    name: '用户管理',
    nameEn: 'User Management',
    description: '管理系统用户和权限',
    descriptionEn: 'Manage system users and permissions',
    route: '/admin/users',
    category: 'admin',
    icon: 'TeamOutlined',
    defaultVisible: true,
  },
  {
    key: 'events-admin',
    name: '活动管理',
    nameEn: 'Event Management',
    description: '创建和管理活动',
    descriptionEn: 'Create and manage events',
    route: '/admin/events',
    category: 'admin',
    icon: 'CalendarOutlined',
    defaultVisible: true,
  },
  {
    key: 'orders',
    name: '订单管理',
    nameEn: 'Order Management',
    description: '查看和处理订单',
    descriptionEn: 'View and process orders',
    route: '/admin/orders',
    category: 'admin',
    icon: 'ShoppingCartOutlined',
    defaultVisible: true,
  },
  {
    key: 'inventory',
    name: '库存管理',
    nameEn: 'Inventory Management',
    description: '管理产品库存',
    descriptionEn: 'Manage product inventory',
    route: '/admin/inventory',
    category: 'admin',
    icon: 'DatabaseOutlined',
    defaultVisible: true,
  },
  {
    key: 'finance',
    name: '财务管理',
    nameEn: 'Finance Management',
    description: '查看财务数据和报表',
    descriptionEn: 'View financial data and reports',
    route: '/admin/finance',
    category: 'admin',
    icon: 'DollarOutlined',
    defaultVisible: true,
  },
  {
    key: 'points-config',
    name: '积分配置',
    nameEn: 'Points Configuration',
    description: '配置积分规则和记录',
    descriptionEn: 'Configure points rules and records',
    route: '/admin/points-config',
    category: 'admin',
    icon: 'TrophyOutlined',
    defaultVisible: true,
  },
  {
    key: 'visit-sessions',
    name: '驻店记录',
    nameEn: 'Visit Sessions',
    description: '管理用户驻店记录',
    descriptionEn: 'Manage user visit session records',
    route: '/admin/visit-sessions',
    category: 'admin',
    icon: 'ClockCircleOutlined',
    defaultVisible: true,
  },
  {
    key: 'performance',
    name: '性能监控',
    nameEn: 'Performance Monitor',
    description: '监控系统性能指标',
    descriptionEn: 'Monitor system performance metrics',
    route: '/admin/performance',
    category: 'admin',
    icon: 'ThunderboltOutlined',
    defaultVisible: true,
  },
];

// 根据路由获取功能键
export const getFeatureKeyByRoute = (route: string): string | null => {
  const feature = FEATURE_DEFINITIONS.find(f => f.route === route);
  return feature?.key || null;
};

// 根据功能键获取功能定义
export const getFeatureByKey = (key: string): FeatureDefinition | undefined => {
  return FEATURE_DEFINITIONS.find(f => f.key === key);
};

// 获取默认功能可见性配置
export const getDefaultFeatureVisibilityConfig = (): Omit<FeatureVisibilityConfig, 'id' | 'updatedAt' | 'updatedBy'> => {
  const features: FeatureVisibilityConfig['features'] = {};
  
  FEATURE_DEFINITIONS.forEach(feature => {
    features[feature.key] = {
      visible: feature.defaultVisible,
      description: feature.description,
      category: feature.category,
      route: feature.route,
      icon: feature.icon,
      updatedAt: new Date(),
      updatedBy: '',
    };
  });
  
  return {
    features,
  };
};

