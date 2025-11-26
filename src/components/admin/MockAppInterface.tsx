/**
 * 模拟应用界面组件
 * 用于颜色主题管理的可视化预览和编辑
 */
import React, { useState } from 'react';
import { Tabs, Button, Space } from 'antd';
import { SaveOutlined, ReloadOutlined, FullscreenOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { ColorThemeConfig } from '../../types';
import MockDesktopLayout from './MockDesktopLayout';
import MockMobileLayout from './MockMobileLayout';
import ColorPickerModal from './ColorPickerModal';

export interface MockAppInterfaceProps {
  colorTheme: ColorThemeConfig;
  onColorChange: (colors: Partial<ColorThemeConfig>) => void;
  onSave: () => void;
  onReset: () => void;
  saving?: boolean;
}

const MockAppInterface: React.FC<MockAppInterfaceProps> = ({
  colorTheme,
  onColorChange,
  onSave,
  onReset,
  saving = false,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'desktop' | 'mobile'>('desktop');
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [editingColorType, setEditingColorType] = useState<
    'primaryButton' | 'secondaryButton' | 'warningButton' | 'border' | 'tag' | 'text' | 'icon' | null
  >(null);
  const [localColorTheme, setLocalColorTheme] = useState<ColorThemeConfig>(colorTheme);

  // 当外部 colorTheme 变化时更新本地状态
  React.useEffect(() => {
    setLocalColorTheme(colorTheme);
  }, [colorTheme]);

  // 打开颜色选择器
  const handleOpenColorPicker = (
    type: 'primaryButton' | 'secondaryButton' | 'warningButton' | 'border' | 'tag' | 'text' | 'icon'
  ) => {
    setEditingColorType(type);
    setColorPickerOpen(true);
  };

  // 关闭颜色选择器
  const handleCloseColorPicker = () => {
    setColorPickerOpen(false);
    setEditingColorType(null);
  };

  // 确认颜色更改
  const handleColorConfirm = (colors: Partial<ColorThemeConfig>) => {
    const updatedTheme = {
      ...localColorTheme,
      ...colors,
    };
    setLocalColorTheme(updatedTheme);
    onColorChange(colors);
    handleCloseColorPicker();
  };

  // 当外部 colorTheme 变化时，如果有未保存的更改，需要合并
  React.useEffect(() => {
    if (Object.keys(colorTheme).length > 0) {
      setLocalColorTheme(colorTheme);
    }
  }, [colorTheme]);

  // 保存更改
  const handleSave = () => {
    onSave();
  };

  // 重置为默认
  const handleReset = () => {
    onReset();
    setLocalColorTheme(colorTheme);
  };

  // 全屏预览
  const handleFullscreen = () => {
    // TODO: 实现全屏预览功能
    console.log('全屏预览');
  };

  return (
    <div style={{ width: '100%' }}>
      {/* 操作栏 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          padding: '12px 16px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: 8,
          border: '1px solid rgba(244, 175, 37, 0.3)',
        }}
      >
        <div style={{ color: '#f8f8f8', fontSize: 16, fontWeight: 600 }}>
          🎨 颜色主题管理 - 模拟应用预览
        </div>
        <Space>
          <Button icon={<FullscreenOutlined />} onClick={handleFullscreen}>
            全屏
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset} disabled={saving}>
            重置
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={saving}
            style={{
              background: `linear-gradient(to right, ${localColorTheme.primaryButton.startColor}, ${localColorTheme.primaryButton.endColor})`,
              border: 'none',
            }}
          >
            保存
          </Button>
        </Space>
      </div>

      {/* 标签页 */}
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as 'desktop' | 'mobile')}
        items={[
          {
            key: 'desktop',
            label: '电脑端',
            children: (
              <MockDesktopLayout
                colorTheme={localColorTheme}
                onElementClick={handleOpenColorPicker}
              />
            ),
          },
          {
            key: 'mobile',
            label: '移动端',
            children: (
              <MockMobileLayout
                colorTheme={localColorTheme}
                onElementClick={handleOpenColorPicker}
              />
            ),
          },
        ]}
        style={{
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: 8,
          padding: 16,
        }}
      />

      {/* 提示信息 */}
      <div
        style={{
          marginTop: 16,
          padding: 12,
          background: 'rgba(255, 215, 0, 0.1)',
          borderRadius: 8,
          border: '1px solid rgba(255, 215, 0, 0.3)',
          color: '#ffd700',
          fontSize: 13,
        }}
      >
        💡 提示: 将鼠标悬停在元素上查看可编辑提示，点击元素进行颜色编辑
      </div>

      {/* 颜色选择器弹窗 */}
      {editingColorType && (
        <ColorPickerModal
          open={colorPickerOpen}
          title={
            editingColorType === 'primaryButton'
              ? '主按键'
              : editingColorType === 'secondaryButton'
              ? '次按键'
              : editingColorType === 'warningButton'
              ? '警告按键'
              : editingColorType === 'border'
              ? '边框'
              : editingColorType === 'tag'
              ? '标签'
              : editingColorType === 'text'
              ? '字体'
              : '符号'
          }
          type={editingColorType}
          colorTheme={localColorTheme}
          onCancel={handleCloseColorPicker}
          onConfirm={handleColorConfirm}
        />
      )}
    </div>
  );
};

export default MockAppInterface;

