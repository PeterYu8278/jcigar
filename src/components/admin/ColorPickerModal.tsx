/**
 * 颜色选择器弹窗组件
 * 用于编辑颜色配置
 */
import React, { useState, useEffect } from 'react';
import { Modal, ColorPicker, Input, Button, Space, Typography, Row, Col, Tag } from 'antd';
import type { ColorThemeConfig } from '../../types';

const { Text } = Typography;

export interface ColorPickerModalProps {
  open: boolean;
  title: string;
  type: 'primaryButton' | 'secondaryButton' | 'warningButton' | 'border' | 'tag' | 'text' | 'icon';
  colorTheme: ColorThemeConfig;
  onCancel: () => void;
  onConfirm: (colors: Partial<ColorThemeConfig>) => void;
}

const ColorPickerModal: React.FC<ColorPickerModalProps> = ({
  open,
  title,
  type,
  colorTheme,
  onCancel,
  onConfirm,
}) => {
  // 根据类型初始化颜色状态
  const getInitialColors = (): Record<string, string> => {
    switch (type) {
      case 'primaryButton':
        return {
          startColor: colorTheme.primaryButton.startColor,
          endColor: colorTheme.primaryButton.endColor,
        };
      case 'secondaryButton':
        return {
          backgroundColor: colorTheme.secondaryButton.backgroundColor,
          borderColor: colorTheme.secondaryButton.borderColor,
          textColor: colorTheme.secondaryButton.textColor,
        };
      case 'warningButton':
        return {
          backgroundColor: colorTheme.warningButton.backgroundColor,
          borderColor: colorTheme.warningButton.borderColor,
          textColor: colorTheme.warningButton.textColor,
        };
      case 'border':
        return {
          primary: colorTheme.border.primary,
          secondary: colorTheme.border.secondary,
        };
      case 'tag':
        return {
          successBackground: colorTheme.tag.success.backgroundColor,
          successText: colorTheme.tag.success.textColor,
          warningBackground: colorTheme.tag.warning.backgroundColor,
          warningText: colorTheme.tag.warning.textColor,
          errorBackground: colorTheme.tag.error.backgroundColor,
          errorText: colorTheme.tag.error.textColor,
        };
      case 'text':
        return {
          primary: colorTheme.text.primary,
          secondary: colorTheme.text.secondary,
          tertiary: colorTheme.text.tertiary,
        };
      case 'icon':
        return {
          primary: colorTheme.icon.primary,
        };
      default:
        return {};
    }
  };

  const [colors, setColors] = useState<Record<string, string>>(getInitialColors());

  useEffect(() => {
    if (open) {
      setColors(getInitialColors());
    }
  }, [open, colorTheme, type]);

  const handleColorChange = (key: string, color: string) => {
    setColors(prev => ({ ...prev, [key]: color }));
  };

  const handleConfirm = () => {
    let updatedColors: Partial<ColorThemeConfig> = {};

    switch (type) {
      case 'primaryButton':
        updatedColors = {
          primaryButton: {
            startColor: colors.startColor,
            endColor: colors.endColor,
          },
        };
        break;
      case 'secondaryButton':
        updatedColors = {
          secondaryButton: {
            backgroundColor: colors.backgroundColor,
            borderColor: colors.borderColor,
            textColor: colors.textColor,
          },
        };
        break;
      case 'warningButton':
        updatedColors = {
          warningButton: {
            backgroundColor: colors.backgroundColor,
            borderColor: colors.borderColor,
            textColor: colors.textColor,
          },
        };
        break;
      case 'border':
        updatedColors = {
          border: {
            primary: colors.primary,
            secondary: colors.secondary,
          },
        };
        break;
      case 'tag':
        updatedColors = {
          tag: {
            success: {
              backgroundColor: colors.successBackground,
              textColor: colors.successText,
              borderColor: colors.successBorderColor,
            },
            warning: {
              backgroundColor: colors.warningBackground,
              textColor: colors.warningText,
              borderColor: colors.warningBorderColor,
            },
            error: {
              backgroundColor: colors.errorBackground,
              textColor: colors.errorText,
              borderColor: colors.errorBorderColor,
            },
          },
        };
        break;
      case 'text':
        updatedColors = {
          text: {
            primary: colors.primary,
            secondary: colors.secondary,
            tertiary: colors.tertiary,
          },
        };
        break;
      case 'icon':
        updatedColors = {
          icon: {
            primary: colors.primary,
          },
        };
        break;
    }

    onConfirm(updatedColors);
  };

  // 渲染颜色选择器
  const renderColorPickers = () => {
    switch (type) {
      case 'primaryButton':
        return (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Text style={{ color: '#f8f8f8', display: 'block', marginBottom: 8 }}>起始颜色</Text>
              <Row gutter={16} align="middle">
                <Col>
                  <ColorPicker
                    value={colors.startColor}
                    onChange={(color) => handleColorChange('startColor', color.toHexString())}
                    showText
                  />
                </Col>
                <Col flex={1}>
                  <Input
                    value={colors.startColor}
                    onChange={(e) => handleColorChange('startColor', e.target.value)}
                    placeholder="#FDE08D"
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderColor: 'rgba(244, 175, 37, 0.3)',
                      color: '#f8f8f8',
                    }}
                  />
                </Col>
              </Row>
            </div>
            <div>
              <Text style={{ color: '#f8f8f8', display: 'block', marginBottom: 8 }}>结束颜色</Text>
              <Row gutter={16} align="middle">
                <Col>
                  <ColorPicker
                    value={colors.endColor}
                    onChange={(color) => handleColorChange('endColor', color.toHexString())}
                    showText
                  />
                </Col>
                <Col flex={1}>
                  <Input
                    value={colors.endColor}
                    onChange={(e) => handleColorChange('endColor', e.target.value)}
                    placeholder="#C48D3A"
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderColor: 'rgba(244, 175, 37, 0.3)',
                      color: '#f8f8f8',
                    }}
                  />
                </Col>
              </Row>
            </div>
            <div style={{ padding: 16, background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
              <Text style={{ color: '#c0c0c0', display: 'block', marginBottom: 8 }}>预览</Text>
              <Button
                style={{
                  background: `linear-gradient(to right, ${colors.startColor}, ${colors.endColor})`,
                  border: 'none',
                  color: '#111',
                  fontWeight: 600,
                  width: '100%',
                }}
              >
                保存更改
              </Button>
            </div>
          </Space>
        );

      case 'secondaryButton':
      case 'warningButton':
        // 检查 backgroundColor 是否为 rgba 格式
        const isRgba = colors.backgroundColor?.startsWith('rgba');
        const bgColorForPicker = isRgba ? '#ffffff' : colors.backgroundColor;
        
        return (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Text style={{ color: '#f8f8f8', display: 'block', marginBottom: 8 }}>背景颜色</Text>
              <Row gutter={16} align="middle">
                <Col>
                  {!isRgba && (
                    <ColorPicker
                      value={bgColorForPicker}
                      onChange={(color) => handleColorChange('backgroundColor', color.toHexString())}
                      showText
                    />
                  )}
                  {isRgba && (
                    <Text style={{ color: '#c0c0c0', fontSize: 12 }}>
                      RGBA 格式，请直接输入
                    </Text>
                  )}
                </Col>
                <Col flex={1}>
                  <Input
                    value={colors.backgroundColor}
                    onChange={(e) => handleColorChange('backgroundColor', e.target.value)}
                    placeholder={type === 'secondaryButton' ? 'rgba(255,255,255,0.1)' : '#faad14'}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderColor: 'rgba(244, 175, 37, 0.3)',
                      color: '#f8f8f8',
                    }}
                  />
                </Col>
              </Row>
            </div>
            <div>
              <Text style={{ color: '#f8f8f8', display: 'block', marginBottom: 8 }}>边框颜色</Text>
              <Row gutter={16} align="middle">
                <Col>
                  <ColorPicker
                    value={colors.borderColor}
                    onChange={(color) => handleColorChange('borderColor', color.toHexString())}
                    showText
                  />
                </Col>
                <Col flex={1}>
                  <Input
                    value={colors.borderColor}
                    onChange={(e) => handleColorChange('borderColor', e.target.value)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderColor: 'rgba(244, 175, 37, 0.3)',
                      color: '#f8f8f8',
                    }}
                  />
                </Col>
              </Row>
            </div>
            <div>
              <Text style={{ color: '#f8f8f8', display: 'block', marginBottom: 8 }}>文字颜色</Text>
              <Row gutter={16} align="middle">
                <Col>
                  <ColorPicker
                    value={colors.textColor}
                    onChange={(color) => handleColorChange('textColor', color.toHexString())}
                    showText
                  />
                </Col>
                <Col flex={1}>
                  <Input
                    value={colors.textColor}
                    onChange={(e) => handleColorChange('textColor', e.target.value)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderColor: 'rgba(244, 175, 37, 0.3)',
                      color: '#f8f8f8',
                    }}
                  />
                </Col>
              </Row>
            </div>
            <div style={{ padding: 16, background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
              <Text style={{ color: '#c0c0c0', display: 'block', marginBottom: 8 }}>预览</Text>
              <Button
                style={{
                  background: colors.backgroundColor,
                  border: `1px solid ${colors.borderColor}`,
                  color: colors.textColor,
                  width: '100%',
                }}
              >
                {type === 'secondaryButton' ? '取消' : '警告'}
              </Button>
            </div>
          </Space>
        );

      case 'border':
        return (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Text style={{ color: '#f8f8f8', display: 'block', marginBottom: 8 }}>主边框</Text>
              <Row gutter={16} align="middle">
                <Col>
                  <ColorPicker
                    value={colors.primary}
                    onChange={(color) => handleColorChange('primary', color.toHexString())}
                    showText
                  />
                </Col>
                <Col flex={1}>
                  <Input
                    value={colors.primary}
                    onChange={(e) => handleColorChange('primary', e.target.value)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderColor: 'rgba(244, 175, 37, 0.3)',
                      color: '#f8f8f8',
                    }}
                  />
                </Col>
              </Row>
            </div>
            <div>
              <Text style={{ color: '#f8f8f8', display: 'block', marginBottom: 8 }}>次边框</Text>
              <Row gutter={16} align="middle">
                <Col>
                  <ColorPicker
                    value={colors.secondary}
                    onChange={(color) => handleColorChange('secondary', color.toHexString())}
                    showText
                  />
                </Col>
                <Col flex={1}>
                  <Input
                    value={colors.secondary}
                    onChange={(e) => handleColorChange('secondary', e.target.value)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderColor: 'rgba(244, 175, 37, 0.3)',
                      color: '#f8f8f8',
                    }}
                  />
                </Col>
              </Row>
            </div>
            <div style={{ padding: 16, background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
              <Text style={{ color: '#c0c0c0', display: 'block', marginBottom: 8 }}>预览</Text>
              <div
                style={{
                  padding: 16,
                  border: `1px solid ${colors.primary}`,
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.05)',
                }}
              >
                <Text style={{ color: '#f8f8f8' }}>内容区域</Text>
              </div>
            </div>
          </Space>
        );

      case 'tag':
        return (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Text style={{ color: '#f8f8f8', display: 'block', marginBottom: 8 }}>成功标签 - 背景颜色</Text>
              <Row gutter={16} align="middle">
                <Col>
                  <ColorPicker
                    value={colors.successBackground}
                    onChange={(color) => handleColorChange('successBackground', color.toHexString())}
                    showText
                  />
                </Col>
                <Col flex={1}>
                  <Input
                    value={colors.successBackground}
                    onChange={(e) => handleColorChange('successBackground', e.target.value)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderColor: 'rgba(244, 175, 37, 0.3)',
                      color: '#f8f8f8',
                    }}
                  />
                </Col>
              </Row>
            </div>
            <div>
              <Text style={{ color: '#f8f8f8', display: 'block', marginBottom: 8 }}>成功标签 - 文字颜色</Text>
              <Row gutter={16} align="middle">
                <Col>
                  <ColorPicker
                    value={colors.successText}
                    onChange={(color) => handleColorChange('successText', color.toHexString())}
                    showText
                  />
                </Col>
                <Col flex={1}>
                  <Input
                    value={colors.successText}
                    onChange={(e) => handleColorChange('successText', e.target.value)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderColor: 'rgba(244, 175, 37, 0.3)',
                      color: '#f8f8f8',
                    }}
                  />
                </Col>
              </Row>
            </div>
            <div>
              <Text style={{ color: '#f8f8f8', display: 'block', marginBottom: 8 }}>警告标签 - 背景颜色</Text>
              <Row gutter={16} align="middle">
                <Col>
                  <ColorPicker
                    value={colors.warningBackground}
                    onChange={(color) => handleColorChange('warningBackground', color.toHexString())}
                    showText
                  />
                </Col>
                <Col flex={1}>
                  <Input
                    value={colors.warningBackground}
                    onChange={(e) => handleColorChange('warningBackground', e.target.value)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderColor: 'rgba(244, 175, 37, 0.3)',
                      color: '#f8f8f8',
                    }}
                  />
                </Col>
              </Row>
            </div>
            <div>
              <Text style={{ color: '#f8f8f8', display: 'block', marginBottom: 8 }}>警告标签 - 文字颜色</Text>
              <Row gutter={16} align="middle">
                <Col>
                  <ColorPicker
                    value={colors.warningText}
                    onChange={(color) => handleColorChange('warningText', color.toHexString())}
                    showText
                  />
                </Col>
                <Col flex={1}>
                  <Input
                    value={colors.warningText}
                    onChange={(e) => handleColorChange('warningText', e.target.value)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderColor: 'rgba(244, 175, 37, 0.3)',
                      color: '#f8f8f8',
                    }}
                  />
                </Col>
              </Row>
            </div>
            <div>
              <Text style={{ color: '#f8f8f8', display: 'block', marginBottom: 8 }}>错误标签 - 背景颜色</Text>
              <Row gutter={16} align="middle">
                <Col>
                  <ColorPicker
                    value={colors.errorBackground}
                    onChange={(color) => handleColorChange('errorBackground', color.toHexString())}
                    showText
                  />
                </Col>
                <Col flex={1}>
                  <Input
                    value={colors.errorBackground}
                    onChange={(e) => handleColorChange('errorBackground', e.target.value)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderColor: 'rgba(244, 175, 37, 0.3)',
                      color: '#f8f8f8',
                    }}
                  />
                </Col>
              </Row>
            </div>
            <div>
              <Text style={{ color: '#f8f8f8', display: 'block', marginBottom: 8 }}>错误标签 - 文字颜色</Text>
              <Row gutter={16} align="middle">
                <Col>
                  <ColorPicker
                    value={colors.errorText}
                    onChange={(color) => handleColorChange('errorText', color.toHexString())}
                    showText
                  />
                </Col>
                <Col flex={1}>
                  <Input
                    value={colors.errorText}
                    onChange={(e) => handleColorChange('errorText', e.target.value)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderColor: 'rgba(244, 175, 37, 0.3)',
                      color: '#f8f8f8',
                    }}
                  />
                </Col>
              </Row>
            </div>
            <div style={{ padding: 16, background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
              <Text style={{ color: '#c0c0c0', display: 'block', marginBottom: 8 }}>预览</Text>
              <Space>
                <Tag style={{ background: colors.successBackground, color: colors.successText, border: 'none' }}>成功</Tag>
                <Tag style={{ background: colors.warningBackground, color: colors.warningText, border: 'none' }}>警告</Tag>
                <Tag style={{ background: colors.errorBackground, color: colors.errorText, border: 'none' }}>错误</Tag>
              </Space>
            </div>
          </Space>
        );

      case 'text':
        return (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Text style={{ color: '#f8f8f8', display: 'block', marginBottom: 8 }}>主要文字</Text>
              <Row gutter={16} align="middle">
                <Col>
                  <ColorPicker
                    value={colors.primary}
                    onChange={(color) => handleColorChange('primary', color.toHexString())}
                    showText
                  />
                </Col>
                <Col flex={1}>
                  <Input
                    value={colors.primary}
                    onChange={(e) => handleColorChange('primary', e.target.value)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderColor: 'rgba(244, 175, 37, 0.3)',
                      color: '#f8f8f8',
                    }}
                  />
                </Col>
              </Row>
            </div>
            <div>
              <Text style={{ color: '#f8f8f8', display: 'block', marginBottom: 8 }}>次要文字</Text>
              <Row gutter={16} align="middle">
                <Col>
                  <ColorPicker
                    value={colors.secondary}
                    onChange={(color) => handleColorChange('secondary', color.toHexString())}
                    showText
                  />
                </Col>
                <Col flex={1}>
                  <Input
                    value={colors.secondary}
                    onChange={(e) => handleColorChange('secondary', e.target.value)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderColor: 'rgba(244, 175, 37, 0.3)',
                      color: '#f8f8f8',
                    }}
                  />
                </Col>
              </Row>
            </div>
            <div>
              <Text style={{ color: '#f8f8f8', display: 'block', marginBottom: 8 }}>第三级文字</Text>
              <Row gutter={16} align="middle">
                <Col>
                  <ColorPicker
                    value={colors.tertiary}
                    onChange={(color) => handleColorChange('tertiary', color.toHexString())}
                    showText
                  />
                </Col>
                <Col flex={1}>
                  <Input
                    value={colors.tertiary}
                    onChange={(e) => handleColorChange('tertiary', e.target.value)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderColor: 'rgba(244, 175, 37, 0.3)',
                      color: '#f8f8f8',
                    }}
                  />
                </Col>
              </Row>
            </div>
            <div style={{ padding: 16, background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
              <Text style={{ color: '#c0c0c0', display: 'block', marginBottom: 8 }}>预览</Text>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Text style={{ color: colors.primary, fontSize: 14 }}>主要文字</Text>
                <Text style={{ color: colors.secondary, fontSize: 12 }}>次要文字</Text>
                <Text style={{ color: colors.tertiary, fontSize: 11 }}>第三级文字</Text>
              </div>
            </div>
          </Space>
        );

      case 'icon':
        return (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Text style={{ color: '#f8f8f8', display: 'block', marginBottom: 8 }}>图标颜色</Text>
              <Row gutter={16} align="middle">
                <Col>
                  <ColorPicker
                    value={colors.primary}
                    onChange={(color) => handleColorChange('primary', color.toHexString())}
                    showText
                  />
                </Col>
                <Col flex={1}>
                  <Input
                    value={colors.primary}
                    onChange={(e) => handleColorChange('primary', e.target.value)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderColor: 'rgba(244, 175, 37, 0.3)',
                      color: '#f8f8f8',
                    }}
                  />
                </Col>
              </Row>
            </div>
            <div style={{ padding: 16, background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
              <Text style={{ color: '#c0c0c0', display: 'block', marginBottom: 8 }}>预览</Text>
              <div style={{ display: 'flex', gap: 16, fontSize: 24 }}>
                <span style={{ color: colors.primary }}></span>
                <span style={{ color: colors.primary }}>🔔</span>
                <span style={{ color: colors.primary }}>✓</span>
                <span style={{ color: colors.primary }}>✗</span>
              </div>
            </div>
          </Space>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      open={open}
      title={`编辑 ${title} 颜色`}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button
          key="confirm"
          type="primary"
          onClick={handleConfirm}
          style={{
            background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
            border: 'none',
          }}
        >
          确认
        </Button>,
      ]}
      width={600}
      styles={{
        content: {
          background: 'rgba(24, 22, 17, 0.95)',
          border: '1px solid rgba(244, 175, 37, 0.3)',
        },
        header: {
          background: 'transparent',
          borderBottom: '1px solid rgba(244, 175, 37, 0.2)',
          color: '#FFFFFF',
        },
      }}
    >
      {renderColorPickers()}
    </Modal>
  );
};

export default ColorPickerModal;

