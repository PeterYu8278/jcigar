import React, { useState, useEffect } from 'react';
import { Modal, Tabs } from 'antd';
import { QrcodeOutlined, EyeOutlined } from '@ant-design/icons';
import { QRScannerView } from '../admin/QRScanner';
import { AICigarScanner } from '../features/ai/AICigarScanner';
import { useAuthStore } from '../../store/modules/auth';
import { getModalThemeStyles } from '../../config/modalTheme';

interface UniversalScannerProps {
    visible: boolean;
    onClose: () => void;
    defaultTab?: 'qr' | 'ai';
}

export const UniversalScanner: React.FC<UniversalScannerProps> = ({
    visible,
    onClose,
    defaultTab = 'ai' // Default to AI for members
}) => {
    const { isAdmin, isDeveloper } = useAuthStore();
    const [activeTab, setActiveTab] = useState<string>(defaultTab);
    const [qrMode, setQrMode] = useState<'checkin' | 'checkout'>('checkin');
    
    // 只有管理员和开发者可以访问扫码功能
    const canAccessQR = isAdmin || isDeveloper;

    // Reset tab when opening
    useEffect(() => {
        if (visible) {
            // 如果用户没有权限访问扫码，且默认标签是 qr，则切换到 ai
            const initialTab = (!canAccessQR && defaultTab === 'qr') ? 'ai' : defaultTab;
            setActiveTab(initialTab);
        }
    }, [visible, defaultTab, canAccessQR]);

    // 如果用户切换到没有权限的标签，自动切换回 ai
    useEffect(() => {
        if (activeTab === 'qr' && !canAccessQR) {
            setActiveTab('ai');
        }
    }, [activeTab, canAccessQR]);

    const allItems = [
        {
            key: 'ai',
            label: (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <EyeOutlined style={{ marginRight: 4 }} />
                    AI 识茄
                </span>
            ),
            children: (
                <div style={{ height: 'auto', overflowY: 'auto' }}>
                    {/* Only mount camera when tab is active to save resources */}
                    {activeTab === 'ai' && visible && <AICigarScanner />}
                </div>
            ),
        },
        {
            key: 'qr',
            label: (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <QrcodeOutlined style={{ marginRight: 4 }} />
                    扫码
                </span>
            ),
            children: (
                <div style={{ height: 'auto', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {canAccessQR ? (
                        <QRScannerView
                            active={activeTab === 'qr' && visible}
                            mode={qrMode}
                            onModeChange={setQrMode}
                            onSuccess={onClose}
                        />
                    ) : (
                        <div style={{ padding: 20, textAlign: 'center', color: '#aaa', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column' }}>
                            <QrcodeOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                            <p>普通会员扫码功能即将上线</p>
                        </div>
                    )}
                </div>
            ),
        },
    ];

    // 根据权限过滤标签页
    const items = allItems.filter(item => {
        if (item.key === 'qr') {
            return canAccessQR;
        }
        return true;
    });

    const isMobile = typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false;

    return (
        <Modal
            title={
                <span style={{
                    backgroundImage: 'linear-gradient(to right, #FDE08D, #C48D3A)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                    fontWeight: 700,
                    fontSize: 18
                }}>
                    智能扫描
                </span>
            }
            open={visible}
            onCancel={onClose}
            footer={null}
            width={isMobile ? '90%' : 600}
            destroyOnHidden
            styles={getModalThemeStyles(isMobile)}
            centered
        >
            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={items}
                centered
                style={{
                    background: 'transparent'
                }}
            />
        </Modal>
    );
};
