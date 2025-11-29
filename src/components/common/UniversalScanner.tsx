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
    const { isAdmin } = useAuthStore();
    const [activeTab, setActiveTab] = useState<string>(defaultTab);
    const [qrMode, setQrMode] = useState<'checkin' | 'checkout'>('checkin');

    // Reset tab when opening
    useEffect(() => {
        if (visible) {
            setActiveTab(defaultTab);
        }
    }, [visible, defaultTab]);

    const items = [
        {
            key: 'ai',
            label: (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <EyeOutlined style={{ marginRight: 4 }} />
                    AI 识茄
                </span>
            ),
            children: (
                <div style={{ height: '600px', overflowY: 'auto' }}>
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
                <div style={{ height: '500px', display: 'flex', flexDirection: 'column' }}>
                    {isAdmin ? (
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
