/**
 * 模拟电脑端界面布局组件
 */
import React from 'react';
import { Layout, Space, Typography, Avatar, Tag, Input } from 'antd';
import {
  HomeOutlined,
  CalendarOutlined,
  ShoppingOutlined,
  UserOutlined,
  BellOutlined,
  SettingOutlined,
  StarOutlined,
  SearchOutlined,
  DownOutlined,
} from '@ant-design/icons';
import type { ColorThemeConfig } from '../../types';

const { Header, Sider, Content, Footer } = Layout;
const { Text } = Typography;

interface MockDesktopLayoutProps {
  colorTheme: ColorThemeConfig;
  onElementClick: (
    type: 'primaryButton' | 'secondaryButton' | 'warningButton' | 'border' | 'tag' | 'text' | 'icon'
  ) => void;
}

const MockDesktopLayout: React.FC<MockDesktopLayoutProps> = ({
  colorTheme,
  onElementClick,
}) => {
  return (
    <div
      style={{
        background: '#0a0a0a',
        borderRadius: 8,
        overflow: 'hidden',
        border: `1px solid ${colorTheme.border.primary}`,
      }}
    >
      <Layout style={{ background: 'transparent', minHeight: 600 }}>
        {/* Header */}
        <Header
          style={{
            height: 64,
            lineHeight: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
            padding: '0 24px',
            borderBottom: `2px solid ${colorTheme.border.primary}`,
            position: 'relative',
          }}
        >
          <Space size={12} align="center">
            <HomeOutlined
              style={{
                color: colorTheme.icon.primary,
                fontSize: 20,
                cursor: 'pointer',
              }}
              onClick={() => onElementClick('icon')}
              title="点击编辑图标颜色"
            />
            <Text style={{ color: colorTheme.text.primary, fontSize: 16, fontWeight: 600 }}>
              Gentlemen Club
            </Text>
          </Space>
          <Space size="middle" align="center">
            <BellOutlined
              style={{
                color: colorTheme.icon.primary,
                fontSize: 18,
                cursor: 'pointer',
              }}
              onClick={() => onElementClick('icon')}
              title="点击编辑图标颜色"
            />
            <StarOutlined
              style={{
                color: colorTheme.icon.primary,
                fontSize: 18,
                cursor: 'pointer',
              }}
              onClick={() => onElementClick('icon')}
              title="点击编辑图标颜色"
            />
            <SettingOutlined
              style={{
                color: colorTheme.icon.primary,
                fontSize: 18,
                cursor: 'pointer',
              }}
              onClick={() => onElementClick('icon')}
              title="点击编辑图标颜色"
            />
            <div
              title="点击编辑图标颜色"
              onClick={() => onElementClick('icon')}
            >
              <Avatar
                size={32}
                icon={<UserOutlined />}
                style={{
                  border: `2px solid ${colorTheme.icon.primary}`,
                  cursor: 'pointer',
                }}
              />
            </div>
          </Space>
        </Header>

        <Layout style={{ background: 'transparent' }}>
          {/* Sider */}
          <Sider
            width={200}
            style={{
              background: 'linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%)',
              borderRight: `1px solid ${colorTheme.border.primary}`,
              padding: '16px 0',
            }}
          >
            <div style={{ padding: '0 16px' }}>
              <div
                style={{
                  padding: '12px 16px',
                  marginBottom: 8,
                  borderRadius: 8,
                  background: 'rgba(255, 215, 0, 0.1)',
                  border: `1px solid ${colorTheme.border.secondary}`,
                  cursor: 'pointer',
                }}
                onClick={() => onElementClick('border')}
                title="点击编辑边框颜色"
              >
                <Space>
                  <HomeOutlined
                    style={{ color: colorTheme.icon.primary }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onElementClick('icon');
                    }}
                  />
                  <Text style={{ color: colorTheme.text.primary }}>首页</Text>
                </Space>
              </div>
              <div
                style={{
                  padding: '12px 16px',
                  marginBottom: 8,
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
                onClick={() => onElementClick('border')}
                title="点击编辑边框颜色"
              >
                <Space>
                  <CalendarOutlined
                    style={{ color: colorTheme.icon.primary }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onElementClick('icon');
                    }}
                  />
                  <Text style={{ color: colorTheme.text.secondary }}>活动</Text>
                </Space>
              </div>
              <div
                style={{
                  padding: '12px 16px',
                  marginBottom: 8,
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
                onClick={() => onElementClick('border')}
                title="点击编辑边框颜色"
              >
                <Space>
                  <ShoppingOutlined
                    style={{ color: colorTheme.icon.primary }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onElementClick('icon');
                    }}
                  />
                  <Text style={{ color: colorTheme.text.secondary }}>商店</Text>
                </Space>
              </div>
              <div
                style={{
                  padding: '12px 16px',
                  marginBottom: 8,
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
                onClick={() => onElementClick('border')}
                title="点击编辑边框颜色"
              >
                <Space>
                  <UserOutlined
                    style={{ color: colorTheme.icon.primary }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onElementClick('icon');
                    }}
                  />
                  <Text style={{ color: colorTheme.text.secondary }}>个人</Text>
                </Space>
              </div>
            </div>
          </Sider>

          {/* Content */}
          <Content
            style={{
              padding: 24,
              background: 'radial-gradient(ellipse at top, #3c2f1a, #121212)',
              minHeight: 500,
            }}
          >
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 12,
                padding: 24,
                border: `1px solid ${colorTheme.border.primary}`,
              }}
            >
              {/* 标题 */}
              <Text
                style={{
                  color: colorTheme.text.primary,
                  fontSize: 24,
                  fontWeight: 600,
                  display: 'block',
                  marginBottom: 16,
                  cursor: 'pointer',
                }}
                onClick={() => onElementClick('text')}
                title="点击编辑主要文字颜色"
              >
                欢迎回来
              </Text>

              {/* 文字示例 */}
              <div style={{ marginBottom: 24 }}>
                <Text
                  style={{
                    color: colorTheme.text.primary,
                    display: 'block',
                    marginBottom: 8,
                    cursor: 'pointer',
                  }}
                  onClick={() => onElementClick('text')}
                  title="点击编辑主要文字颜色"
                >
                  这是主要文字 (text.primary)
                </Text>
                <Text
                  style={{
                    color: colorTheme.text.secondary,
                    display: 'block',
                    marginBottom: 8,
                    cursor: 'pointer',
                  }}
                  onClick={() => onElementClick('text')}
                  title="点击编辑次要文字颜色"
                >
                  这是次要文字 (text.secondary)
                </Text>
                <Text
                  style={{
                    color: colorTheme.text.tertiary,
                    display: 'block',
                    marginBottom: 8,
                    cursor: 'pointer',
                  }}
                  onClick={() => onElementClick('text')}
                  title="点击编辑第三级文字颜色"
                >
                  这是第三级文字 (text.tertiary)
                </Text>
              </div>

              {/* 搜索框示例 */}
              <div style={{ marginBottom: 24 }}>
                <Input
                  placeholder="搜索..."
                  prefix={<SearchOutlined style={{ color: colorTheme.icon.primary }} />}
                  style={{
                    background: colorTheme.secondaryButton.backgroundColor,
                    border: `1px solid ${colorTheme.border.secondary}`,
                    color: colorTheme.text.primary,
                    maxWidth: 300,
                    cursor: 'pointer',
                  }}
                  onClick={() => onElementClick('border')}
                  title="点击编辑输入框边框颜色"
                />
              </div>

              {/* 输入框示例 */}
              <div style={{ marginBottom: 24 }}>
                <Input
                  placeholder="请输入内容"
                  style={{
                    background: colorTheme.secondaryButton.backgroundColor,
                    border: `1px solid ${colorTheme.border.secondary}`,
                    color: colorTheme.text.primary,
                    maxWidth: 300,
                    cursor: 'pointer',
                  }}
                  onClick={() => onElementClick('border')}
                  title="点击编辑输入框边框颜色"
                />
              </div>

              {/* 下拉框示例 */}
              <div style={{ marginBottom: 24, position: 'relative' }}>
                <div
                  style={{
                    position: 'relative',
                    width: 300,
                  }}
                >
                  <div
                    style={{
                      padding: '4px 11px',
                      background: colorTheme.secondaryButton.backgroundColor,
                      border: `1px solid ${colorTheme.border.secondary}`,
                      borderRadius: 6,
                      color: colorTheme.text.tertiary,
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                    onClick={() => onElementClick('border')}
                    title="点击编辑下拉框边框颜色"
                  >
                    <span>请选择</span>
                    <DownOutlined
                      style={{
                        color: colorTheme.icon.primary,
                        fontSize: 12,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onElementClick('icon');
                      }}
                    />
                  </div>
                  {/* 下拉选项预览 */}
                  <div
                    style={{
                      marginTop: 4,
                      background: colorTheme.secondaryButton.backgroundColor,
                      border: `1px solid ${colorTheme.border.secondary}`,
                      borderRadius: 6,
                      padding: '4px 0',
                      maxHeight: 120,
                      overflow: 'hidden',
                    }}
                    onClick={() => onElementClick('border')}
                    title="点击编辑下拉选项边框颜色"
                  >
                    <div
                      style={{
                        padding: '8px 12px',
                        color: colorTheme.text.primary,
                        cursor: 'pointer',
                        borderBottom: `1px solid ${colorTheme.border.secondary}`,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onElementClick('text');
                      }}
                      title="点击编辑下拉选项文字颜色"
                    >
                      选项 1
                    </div>
                    <div
                      style={{
                        padding: '8px 12px',
                        color: colorTheme.text.primary,
                        cursor: 'pointer',
                        borderBottom: `1px solid ${colorTheme.border.secondary}`,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onElementClick('text');
                      }}
                      title="点击编辑下拉选项文字颜色"
                    >
                      选项 2
                    </div>
                    <div
                      style={{
                        padding: '8px 12px',
                        color: colorTheme.text.primary,
                        cursor: 'pointer',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onElementClick('text');
                      }}
                      title="点击编辑下拉选项文字颜色"
                    >
                      选项 3
                    </div>
                  </div>
                </div>
              </div>

              {/* 按钮示例 */}
              <Space size="middle" style={{ marginBottom: 24 }}>
                <button
                  type="button"
                  style={{
                    background: `linear-gradient(to right, ${colorTheme.primaryButton.startColor}, ${colorTheme.primaryButton.endColor})`,
                    color: '#111',
                    fontWeight: 600,
                    padding: '6px 16px',
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                  onClick={() => onElementClick('primaryButton')}
                  title="点击编辑主按键颜色"
                >
                  立即参与
                </button>
                <button
                  type="button"
                  style={{
                    background: colorTheme.secondaryButton.backgroundColor,
                    color: colorTheme.secondaryButton.textColor,
                    padding: '6px 16px',
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                  onClick={() => onElementClick('secondaryButton')}
                  title="点击编辑次按键颜色"
                >
                  查看详情
                </button>
                <button
                  type="button"
                  style={{
                    background: colorTheme.warningButton.backgroundColor,
                    color: colorTheme.warningButton.textColor,
                    padding: '6px 16px',
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                  onClick={() => onElementClick('warningButton')}
                  title="点击编辑警告按键颜色"
                >
                  警告
                </button>
              </Space>

              {/* Toggle 示例 */}
              <div style={{ marginBottom: 24 }}>
                <Text
                  style={{
                    color: colorTheme.text.secondary,
                    fontSize: 14,
                    display: 'block',
                    marginBottom: 12,
                  }}
                >
                  状态切换
                </Text>
                <Space size="large">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span
                      style={{ color: colorTheme.text.primary, fontWeight: 500, cursor: 'pointer' }}
                      onClick={() => onElementClick('text')}
                      title="点击编辑文字颜色"
                    >
                      通知提醒
                    </span>
                    <div
                      style={{
                        width: 52,
                        height: 28,
                        borderRadius: 16,
                        padding: 3,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        background: `linear-gradient(to right, ${colorTheme.primaryButton.startColor}, ${colorTheme.primaryButton.endColor})`,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      onClick={() => onElementClick('primaryButton')}
                      title="点击编辑主按键颜色"
                    >
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          background: '#fff',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span
                      style={{ color: colorTheme.text.primary, fontWeight: 500, cursor: 'pointer' }}
                      onClick={() => onElementClick('text')}
                      title="点击编辑文字颜色"
                    >
                      深色模式
                    </span>
                    <div
                      style={{
                        width: 52,
                        height: 28,
                        borderRadius: 16,
                        padding: 3,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        background: colorTheme.secondaryButton.backgroundColor,                        
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      onClick={() => onElementClick('secondaryButton')}
                      title="点击编辑次按键颜色"
                    >
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          background: colorTheme.secondaryButton.textColor,
                          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                        }}
                      />
                    </div>
                  </div>
                </Space>
              </div>

              {/* 标签示例 */}
              <Space size="middle" style={{ marginBottom: 24 }}>
                <Tag
                  style={{
                    background: colorTheme.tag.success.backgroundColor,
                    color: colorTheme.tag.success.textColor,
                    border: `1px solid ${colorTheme.tag.success.textColor}`,
                    borderRadius: '4px',
                    padding: '2px 8px',
                    cursor: 'pointer',
                  }}
                  onClick={() => onElementClick('tag')}
                  title="点击编辑标签颜色"
                >
                  成功
                </Tag>
                <Tag
                  style={{
                    background: colorTheme.tag.warning.backgroundColor,
                    color: colorTheme.tag.warning.textColor,
                    border: `1px solid ${colorTheme.tag.warning.textColor}`,
                    borderRadius: '4px',
                    padding: '2px 8px',
                    cursor: 'pointer',
                  }}
                  onClick={() => onElementClick('tag')}
                  title="点击编辑标签颜色"
                >
                  警告
                </Tag>
                <Tag
                  style={{
                    background: colorTheme.tag.error.backgroundColor,
                    color: colorTheme.tag.error.textColor,
                    border: `1px solid ${colorTheme.tag.error.textColor}`,
                    borderRadius: '4px',
                    padding: '2px 8px',
                    cursor: 'pointer',
                  }}
                  onClick={() => onElementClick('tag')}
                  title="点击编辑标签颜色"
                >
                  错误
                </Tag>
              </Space>

              {/* 图标示例 */}
              <Space size="large" style={{ marginBottom: 24 }}>
                <StarOutlined
                  style={{
                    color: colorTheme.icon.primary,
                    fontSize: 24,
                    cursor: 'pointer',
                  }}
                  onClick={() => onElementClick('icon')}
                  title="点击编辑图标颜色"
                />
                <BellOutlined
                  style={{
                    color: colorTheme.icon.primary,
                    fontSize: 24,
                    cursor: 'pointer',
                  }}
                  onClick={() => onElementClick('icon')}
                  title="点击编辑图标颜色"
                />
                <span
                  style={{
                    color: colorTheme.icon.primary,
                    fontSize: 24,
                    cursor: 'pointer',
                  }}
                  onClick={() => onElementClick('icon')}
                  title="点击编辑图标颜色"
                >
                  ✓
                </span>
                <span
                  style={{
                    color: colorTheme.icon.primary,
                    fontSize: 24,
                    cursor: 'pointer',
                  }}
                  onClick={() => onElementClick('icon')}
                  title="点击编辑图标颜色"
                >
                  ✗
                </span>
              </Space>

              {/* 边框示例 */}
              <div
                style={{
                  padding: 16,
                  border: `1px solid ${colorTheme.border.primary}`,
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.05)',
                  marginBottom: 16,
                  cursor: 'pointer',
                }}
                onClick={() => onElementClick('border')}
                title="点击编辑主边框颜色"
              >
                <Text style={{ color: colorTheme.text.secondary }}>
                  内容区域 (主边框: border.primary)
                </Text>
              </div>
              <div
                style={{
                  padding: 16,
                  border: `1px solid ${colorTheme.border.secondary}`,
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.03)',
                  cursor: 'pointer',
                }}
                onClick={() => onElementClick('border')}
                title="点击编辑次边框颜色"
              >
                <Text style={{ color: colorTheme.text.tertiary }}>
                  内容区域 (次边框: border.secondary)
                </Text>
              </div>
            </div>
          </Content>
        </Layout>

        {/* Footer */}
        <Footer
          style={{
            textAlign: 'center',
            background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)',
            borderTop: `2px solid ${colorTheme.border.primary}`,
            padding: '16px 24px',
          }}
        >
          <Text
            style={{
              color: colorTheme.text.secondary,
              cursor: 'pointer',
            }}
            onClick={() => onElementClick('text')}
            title="点击编辑次要文字颜色"
          >
            © 2024 Gentlemen Club. All rights reserved.
          </Text>
        </Footer>
      </Layout>
    </div>
  );
};

export default MockDesktopLayout;

