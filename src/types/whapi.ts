/**
 * Whapi.Cloud WhatsApp API 类型定义
 * 基于 OpenAPI 规范: https://panel.whapi.cloud/yaml/openapi.yaml
 */

// Whapi 配置
export interface WhapiConfig {
  apiToken?: string;
  channelId?: string;
  baseUrl?: string; // 默认为 https://gate.whapi.cloud
  enabled?: boolean; // 是否启用 WhatsApp 消息功能
  // 功能开关
  features?: {
    eventReminder?: boolean; // 活动提醒
    vipExpiry?: boolean; // VIP到期提醒
    passwordReset?: boolean; // 重置密码
  };
}

// 消息类型
export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'contacts' | 'template';

// 发送消息请求
export interface SendMessageRequest {
  to: string; // 接收者 WhatsApp ID (格式: 国家代码+号码，如: 60123456789)
  type: MessageType;
  text?: string; // 文本消息内容
  media?: {
    url?: string; // 媒体 URL
    caption?: string; // 媒体说明
  };
  template?: {
    name: string;
    language: string;
    components?: any[];
  };
}

// 发送消息响应
export interface SendMessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  data?: any;
}

// 消息状态
export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed';

// 消息记录
export interface MessageRecord {
  id: string;
  userId: string;
  userName?: string;
  phone: string;
  type: 'event_reminder' | 'vip_expiry' | 'password_reset' | 'test' | 'custom';
  message: string;
  status: MessageStatus;
  messageId?: string; // Whapi 返回的消息 ID
  error?: string;
  createdAt: Date;
  createdBy: string;
}

// 消息模板
export interface MessageTemplate {
  id: string;
  name: string;
  type: 'event_reminder' | 'vip_expiry' | 'password_reset';
  template: string; // 支持变量占位符，如 {{eventName}}, {{userName}}, {{expiryDate}}
  variables: string[]; // 支持的变量列表
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 默认消息模板
export const DEFAULT_MESSAGE_TEMPLATES: Omit<MessageTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: '活动提醒',
    type: 'event_reminder',
    template: '[{{appName}}] 活动提醒\n\n温馨提醒：\n\n您好 {{userName}}，您已报名"{{appName}}"的"{{eventName}}"，期待您的参与!\n\n日期: {{eventDate}}\n时间: {{eventTime}}\n地点: {{eventLocation}}',
    variables: ['userName', 'appName', 'eventName', 'eventDate', 'eventTime', 'eventLocation'],
    enabled: true,
  },
  {
    name: 'VIP到期提醒',
    type: 'vip_expiry',
    template: '[{{appName}}] VIP到期提醒\n\n您好 {{userName}}，您的VIP会员资格将于 {{expiryDate}} 到期。\n\n请及时续费以继续享受会员权益。',
    variables: ['userName', 'appName', 'expiryDate'],
    enabled: true,
  },
  {
    name: '重置密码',
    type: 'password_reset',
    template: '[{{appName}}] 重置密码\n\n您好 {{userName}}，您已申请重置密码。如非本人操作，请忽略此消息。\n\n重置链接：{{resetLink}} (有效期24小时)',
    variables: ['userName', 'appName', 'resetLink'],
    enabled: true,
  },
];

