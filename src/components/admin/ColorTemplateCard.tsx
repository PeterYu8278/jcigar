/**
 * 颜色模板卡片组件
 * 用于显示和编辑颜色配置
 */
import React from 'react';
import { Card, Button, Tag, Typography } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import type { ColorThemeConfig } from '../../types';

const { Text } = Typography;

export interface ColorTemplateCardProps {
  title: string;
  type: 'primaryButton' | 'secondaryButton' | 'warningButton' | 'border' | 'tag' | 'text' | 'icon';
  colorTheme: ColorThemeConfig;
  onEdit: () => void;
}

const ColorTemplateCard: React.FC<ColorTemplateCardProps> = ({
  title,
  type,
  colorTheme,
  onEdit,
}) => {
  // 渲染预览内容
  const renderPreview = () => {
    switch (type) {
      case 'primaryButton': {
        const { startColor, endColor } = colorTheme.primaryButton;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
            <Button
              style={{
                background: `linear-gradient(to right, ${startColor}, ${endColor})`,
                color: '#111',
                fontWeight: 600,
                minWidth: 120,
              }}
            >
              保存更改
            </Button>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 4,
                  background: startColor,
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              />
              <Text style={{ color: '#c0c0c0', fontSize: 12 }}>→</Text>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 4,
                  background: endColor,
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              />
            </div>
            <Text style={{ color: '#999', fontSize: 11 }}>
              {startColor} → {endColor}
            </Text>
          </div>
        );
      }

      case 'secondaryButton': {
        const { backgroundColor, borderColor, textColor } = colorTheme.secondaryButton;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
            <Button
              style={{
                background: backgroundColor,
                border: `1px solid ${borderColor}`,
                color: textColor,
                minWidth: 120,
              }}
            >
              取消
            </Button>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 4,
                  background: backgroundColor,
                  border: `1px solid ${borderColor}`,
                }}
              />
            </div>
            <Text style={{ color: '#999', fontSize: 11 }}>{backgroundColor}</Text>
          </div>
        );
      }

      case 'warningButton': {
        const { backgroundColor, borderColor, textColor } = colorTheme.warningButton;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
            <Button
              style={{
                background: backgroundColor,
                border: `1px solid ${borderColor}`,
                color: textColor,
                minWidth: 120,
              }}
            >
              警告
            </Button>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 4,
                  background: backgroundColor,
                  border: `1px solid ${borderColor}`,
                }}
              />
            </div>
            <Text style={{ color: '#999', fontSize: 11 }}>{backgroundColor}</Text>
          </div>
        );
      }

      case 'border': {
        const { primary, secondary } = colorTheme.border;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
            <div
              style={{
                width: '100%',
                padding: 16,
                border: `1px solid ${primary}`,
                borderRadius: 8,
                background: 'rgba(255,255,255,0.05)',
              }}
            >
              <Text style={{ color: '#f8f8f8' }}>内容区域</Text>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 4,
                  background: primary,
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              />
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 4,
                  background: secondary,
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              />
            </div>
            <Text style={{ color: '#999', fontSize: 11 }}>
              主: {primary} | 次: {secondary}
            </Text>
          </div>
        );
      }

      case 'tag': {
        const { success, warning, error } = colorTheme.tag;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <Tag style={{ background: success.backgroundColor, color: success.textColor, border: 'none' }}>成功</Tag>
              <Tag style={{ background: warning.backgroundColor, color: warning.textColor, border: 'none' }}>警告</Tag>
              <Tag style={{ background: error.backgroundColor, color: error.textColor, border: 'none' }}>错误</Tag>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 4,
                  background: success.backgroundColor,
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              />
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 4,
                  background: warning.backgroundColor,
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              />
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 4,
                  background: error.backgroundColor,
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              />
            </div>
            <Text style={{ color: '#999', fontSize: 11 }}>
              成功: {success.backgroundColor} | 警告: {warning.backgroundColor} | 错误: {error.backgroundColor}
            </Text>
          </div>
        );
      }

      case 'text': {
        const { primary, secondary, tertiary } = colorTheme.text;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
              <Text style={{ color: primary, fontSize: 14 }}>主要文字</Text>
              <Text style={{ color: secondary, fontSize: 12 }}>次要文字</Text>
              <Text style={{ color: tertiary, fontSize: 11 }}>第三级文字</Text>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 4,
                  background: primary,
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              />
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 4,
                  background: secondary,
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              />
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 4,
                  background: tertiary,
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              />
            </div>
            <Text style={{ color: '#999', fontSize: 11 }}>
              主要: {primary} | 次要: {secondary} | 第三级: {tertiary}
            </Text>
          </div>
        );
      }

      case 'icon': {
        const { primary } = colorTheme.icon;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 16, fontSize: 24 }}>
              <span style={{ color: primary }}></span>
              <span style={{ color: primary }}>🔔</span>
              <span style={{ color: primary }}>✓</span>
              <span style={{ color: primary }}>✗</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 4,
                  background: primary,
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              />
            </div>
            <Text style={{ color: '#999', fontSize: 11 }}>{primary}</Text>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <Card
      style={{
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 8,
        border: '1px solid rgba(255, 255, 255, 0.1)',
        height: '100%',
      }}
      styles={{ body: { padding: 16 } }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: '#f8f8f8', fontSize: 14, fontWeight: 600 }}>{title}</Text>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={onEdit}
            style={{ color: '#ffd700' }}
            size="small"
          >
            编辑
          </Button>
        </div>
        {renderPreview()}
      </div>
    </Card>
  );
};

export default ColorTemplateCard;

