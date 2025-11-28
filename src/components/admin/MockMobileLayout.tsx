/**
 * 模拟移动端界面布局组件
 */
import React from 'react';
import { Layout, Space, Typography, Avatar, Tag, Input } from 'antd';
import {
  HomeOutlined,
  CalendarOutlined,
  ShoppingOutlined,
  UserOutlined,
  BellOutlined,
  StarOutlined,
  SearchOutlined,
  DownOutlined,
} from '@ant-design/icons';
import type { ColorThemeConfig } from '../../types';

const { Header, Content, Footer } = Layout;
const { Text } = Typography;

interface MockMobileLayoutProps {
  colorTheme: ColorThemeConfig;
  onElementClick: (
    type: 'primaryButton' | 'secondaryButton' | 'warningButton' | 'border' | 'tag' | 'text' | 'icon'
  ) => void;
  appName?: string;
}

const MockMobileLayout: React.FC<MockMobileLayoutProps> = ({
  colorTheme,
  onElementClick,
  appName = '',
}) => {
  return (
    <div
      style={{
        background: '#0a0a0a',
        borderRadius: 8,
        overflow: 'hidden',
        border: `1px solid ${colorTheme.border.primary}`,
        maxWidth: 375,
        margin: '0 auto',
      }}
    >
      <Layout style={{ background: 'transparent', minHeight: 600 }}>
        {/* Header */}
        <Header
          style={{
            height: 56,
            lineHeight: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
            padding: '0 16px',
            borderBottom: `1px solid ${colorTheme.border.primary}`,
          }}
        >
          <Space size={8} align="center">
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
              {appName || 'App Name'}
            </Text>
          </Space>
          <Space size="small" align="center">
            <BellOutlined
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
                size={28}
                icon={<UserOutlined />}
                style={{
                  border: `2px solid ${colorTheme.icon.primary}`,
                  cursor: 'pointer',
                }}
              />
            </div>
          </Space>
        </Header>

        {/* Content */}
        <Content
          style={{
            padding: 16,
            background: 'radial-gradient(ellipse at top, #3c2f1a, #121212)',
            minHeight: 500,
            paddingBottom: 80,
          }}
        >
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: 12,
              padding: 16,
              border: `1px solid ${colorTheme.border.primary}`,
            }}
          >
            {/* 标题 */}
            <Text
              style={{
                color: colorTheme.text.primary,
                fontSize: 20,
                fontWeight: 600,
                display: 'block',
                marginBottom: 12,
                cursor: 'pointer',
              }}
              onClick={() => onElementClick('text')}
              title="点击编辑主要文字颜色"
            >
              首页
            </Text>

            {/* 文字示例 */}
            <div style={{ marginBottom: 20 }}>
              <Text
                style={{
                  color: colorTheme.text.primary,
                  display: 'block',
                  marginBottom: 6,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
                onClick={() => onElementClick('text')}
                title="点击编辑主要文字颜色"
              >
                这是主要文字
              </Text>
              <Text
                style={{
                  color: colorTheme.text.secondary,
                  display: 'block',
                  marginBottom: 6,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
                onClick={() => onElementClick('text')}
                title="点击编辑次要文字颜色"
              >
                这是次要文字
              </Text>
              <Text
                style={{
                  color: colorTheme.text.tertiary,
                  display: 'block',
                  marginBottom: 6,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
                onClick={() => onElementClick('text')}
                title="点击编辑第三级文字颜色"
              >
                这是第三级文字
              </Text>
            </div>

            {/* 搜索框示例 */}
            <div style={{ marginBottom: 20 }}>
              <Input
                placeholder="搜索..."
                prefix={<SearchOutlined style={{ color: colorTheme.icon.primary }} />}
                style={{
                  background: colorTheme.secondaryButton.backgroundColor,
                  border: `1px solid ${colorTheme.border.secondary}`,
                  color: colorTheme.text.primary,
                  width: '100%',
                  cursor: 'pointer',
                }}
                onClick={() => onElementClick('border')}
                title="点击编辑输入框边框颜色"
              />
            </div>

            {/* 输入框示例 */}
            <div style={{ marginBottom: 20 }}>
              <Input
                placeholder="请输入内容"
                style={{
                  background: colorTheme.secondaryButton.backgroundColor,
                  border: `1px solid ${colorTheme.border.secondary}`,
                  color: colorTheme.text.primary,
                  width: '100%',
                  cursor: 'pointer',
                }}
                onClick={() => onElementClick('border')}
                title="点击编辑输入框边框颜色"
              />
            </div>

            {/* 下拉框示例 */}
            <div style={{ marginBottom: 20, position: 'relative' }}>
              <div
                style={{
                  position: 'relative',
                  width: '100%',
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
                    maxHeight: 100,
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
                      fontSize: 13,
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
                      fontSize: 13,
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
                      fontSize: 13,
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
            <Space direction="vertical" size="small" style={{ width: '100%', marginBottom: 20 }}>
              <button
                type="button"
                style={{
                  background: `linear-gradient(to right, ${colorTheme.primaryButton.startColor}, ${colorTheme.primaryButton.endColor})`,
                  color: '#111',
                  fontWeight: 600,
                  padding: '8px 16px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  width: '100%',
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
                  padding: '8px 16px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  width: '100%',
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
                  padding: '8px 16px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  width: '100%',
                }}
                onClick={() => onElementClick('warningButton')}
                title="点击编辑警告按键颜色"
              >
                警告
              </button>
            </Space>

            {/* Toggle 示例 */}
            <div style={{ marginBottom: 20 }}>
              <Text
                style={{
                  color: colorTheme.text.secondary,
                  fontSize: 13,
                  display: 'block',
                  marginBottom: 12,
                }}
              >
                状态切换
              </Text>
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span
                    style={{ color: colorTheme.text.primary, fontWeight: 500, cursor: 'pointer' }}
                    onClick={() => onElementClick('text')}
                    title="点击编辑文字颜色"
                  >
                    推送提醒
                  </span>
                  <div
                    style={{
                      width: 48,
                      height: 26,
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
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: '#fff',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span
                    style={{ color: colorTheme.text.primary, fontWeight: 500, cursor: 'pointer' }}
                    onClick={() => onElementClick('text')}
                    title="点击编辑文字颜色"
                  >
                    深色模式
                  </span>
                  <div
                    style={{
                      width: 48,
                      height: 26,
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
                        width: 20,
                        height: 20,
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
            <Space size="small" wrap style={{ marginBottom: 20 }}>
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
            <Space size="middle" style={{ marginBottom: 20 }}>
              <StarOutlined
                style={{
                  color: colorTheme.icon.primary,
                  fontSize: 20,
                  cursor: 'pointer',
                }}
                onClick={() => onElementClick('icon')}
                title="点击编辑图标颜色"
              />
              <BellOutlined
                style={{
                  color: colorTheme.icon.primary,
                  fontSize: 20,
                  cursor: 'pointer',
                }}
                onClick={() => onElementClick('icon')}
                title="点击编辑图标颜色"
              />
              <span
                style={{
                  color: colorTheme.icon.primary,
                  fontSize: 20,
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
                  fontSize: 20,
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
                padding: 12,
                border: `1px solid ${colorTheme.border.primary}`,
                borderRadius: 8,
                background: 'rgba(255,255,255,0.05)',
                marginBottom: 12,
                cursor: 'pointer',
              }}
              onClick={() => onElementClick('border')}
              title="点击编辑主边框颜色"
            >
              <Text style={{ color: colorTheme.text.secondary, fontSize: 12 }}>
                内容区域 (主边框)
              </Text>
            </div>
            <div
              style={{
                padding: 12,
                border: `1px solid ${colorTheme.border.secondary}`,
                borderRadius: 8,
                background: 'rgba(255,255,255,0.03)',
                cursor: 'pointer',
              }}
              onClick={() => onElementClick('border')}
              title="点击编辑次边框颜色"
            >
              <Text style={{ color: colorTheme.text.tertiary, fontSize: 12 }}>
                内容区域 (次边框)
              </Text>
            </div>
          </div>
        </Content>

        {/* Bottom Navigation */}
        <Footer
          style={{
            position: 'sticky',
            bottom: 0,
            padding: '8px 0',
            background: 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)',
            borderTop: `1px solid ${colorTheme.border.primary}`,
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
            }}
            onClick={() => onElementClick('icon')}
            title="点击编辑图标颜色"
          >
            <HomeOutlined
              style={{
                color: colorTheme.icon.primary,
                fontSize: 20,
                marginBottom: 4,
              }}
            />
            <Text style={{ color: colorTheme.text.secondary, fontSize: 11 }}>首页</Text>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
            }}
            onClick={() => onElementClick('icon')}
            title="点击编辑图标颜色"
          >
            <CalendarOutlined
              style={{
                color: colorTheme.icon.primary,
                fontSize: 20,
                marginBottom: 4,
              }}
            />
            <Text style={{ color: colorTheme.text.secondary, fontSize: 11 }}>活动</Text>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
            }}
            onClick={() => onElementClick('icon')}
            title="点击编辑图标颜色"
          >
            <ShoppingOutlined
              style={{
                color: colorTheme.icon.primary,
                fontSize: 20,
                marginBottom: 4,
              }}
            />
            <Text style={{ color: colorTheme.text.secondary, fontSize: 11 }}>商店</Text>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
            }}
            onClick={() => onElementClick('icon')}
            title="点击编辑图标颜色"
          >
            <UserOutlined
              style={{
                color: colorTheme.icon.primary,
                fontSize: 20,
                marginBottom: 4,
              }}
            />
            <Text style={{ color: colorTheme.text.secondary, fontSize: 11 }}>个人</Text>
          </div>
        </Footer>
      </Layout>
    </div>
  );
};

export default MockMobileLayout;

