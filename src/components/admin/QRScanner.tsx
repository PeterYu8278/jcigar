// QR码扫描组件 - 用于管理员check-in/check-out
import React, { useEffect, useRef, useState } from 'react';
import { Modal, Button, message, Space, Typography } from 'antd';
import { QrcodeOutlined, CloseOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { Html5Qrcode } from 'html5-qrcode';
import { createVisitSession, completeVisitSession, getPendingVisitSession } from '../../services/firebase/visitSessions';
import { getUserByMemberId } from '../../utils/memberId';
import { useAuthStore } from '../../store/modules/auth';

const { Text } = Typography;

interface QRScannerProps {
  visible: boolean;
  onClose: () => void;
  mode: 'checkin' | 'checkout';
  onSuccess?: () => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ visible, onClose, mode: initialMode, onSuccess }) => {
  const { user: adminUser } = useAuthStore();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [mode, setQrScannerMode] = useState<'checkin' | 'checkout'>(initialMode);

  // 启动扫描
  const startScanning = async () => {
    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' }, // 使用后置摄像头
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          // 扫描成功
          handleScanResult(decodedText);
        },
        (errorMessage) => {
          // 扫描错误（忽略，继续扫描）
        }
      );

      setScanning(true);
    } catch (error: any) {
      message.error('无法启动摄像头，请检查权限设置');
      console.error('Scanner start error:', error);
    }
  };

  // 停止扫描
  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch (error) {
        console.error('Scanner stop error:', error);
      }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  // 解析QR码内容，提取memberId
  const parseQRCode = (qrData: string): string | null => {
    try {
      // 尝试解析JSON格式
      const parsed = JSON.parse(qrData);
      if (parsed.memberId) {
        return parsed.memberId;
      }
    } catch {
      // 如果不是JSON，尝试从URL中提取ref参数
      if (qrData.includes('?ref=')) {
        const url = new URL(qrData);
        return url.searchParams.get('ref');
      }
      // 如果直接是memberId字符串
      if (qrData && qrData.length > 0) {
        return qrData;
      }
    }
    return null;
  };


  // 处理扫描结果
  const handleScanResult = async (qrData: string) => {
    if (processing) return;
    
    setProcessing(true);
    setScannedData(qrData);
    await stopScanning();
    
    try {
      const memberId = parseQRCode(qrData);
      if (!memberId) {
        message.error('无法解析QR码，请确保扫描的是会员QR码');
        setProcessing(false);
        return;
      }

      const userResult = await getUserByMemberId(memberId);
      if (!userResult.success || !userResult.user) {
        message.error(userResult.error || `未找到会员编号为 ${memberId} 的用户`);
        setProcessing(false);
        return;
      }

      const userId = userResult.user.id;

      if (!adminUser?.id) {
        message.error('管理员信息不存在');
        setProcessing(false);
        return;
      }

      if (mode === 'checkin') {
        // Check-in
        const result = await createVisitSession(userId, adminUser.id, userResult.user.displayName);
        if (result.success) {
          message.success('Check-in 成功！');
          // 延迟关闭，确保消息显示
          setTimeout(() => {
            onSuccess?.();
            onClose();
          }, 500);
        } else {
          message.error(result.error || 'Check-in 失败');
          setProcessing(false);
        }
      } else {
        // Check-out
        const pendingSession = await getPendingVisitSession(userId);
        if (!pendingSession) {
          message.error('该用户没有待处理的驻店记录');
          setProcessing(false);
          return;
        }

        const result = await completeVisitSession(pendingSession.id, adminUser.id);
        if (result.success) {
          message.success(`Check-out 成功！扣除积分: ${result.pointsDeducted || 0}`);
          onSuccess?.();
          onClose();
        } else {
          message.error(result.error || 'Check-out 失败');
        }
      }
    } catch (error: any) {
      message.error(error.message || '处理失败');
    } finally {
      setProcessing(false);
    }
  };

  // 手动输入memberId
  const handleManualInput = () => {
    const memberId = prompt('请输入会员编号:');
    if (memberId) {
      handleScanResult(memberId);
    }
  };

  // 当visible或mode变化时，更新模式
  useEffect(() => {
    setQrScannerMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (visible) {
      // 延迟启动，确保DOM已渲染
      setTimeout(() => {
        startScanning();
      }, 100);
    } else {
      stopScanning();
    }

    return () => {
      stopScanning();
    };
  }, [visible]);

  return (
    <Modal
      title={
        <Space>
          <QrcodeOutlined />
          <span>{mode === 'checkin' ? 'Check-in 扫描' : 'Check-out 扫描'}</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="checkin" onClick={() => { setQrScannerMode('checkin'); }} disabled={processing} type={mode === 'checkin' ? 'primary' : 'default'}>
          Check-in
        </Button>,
        <Button key="checkout" onClick={() => { setQrScannerMode('checkout'); }} disabled={processing} type={mode === 'checkout' ? 'primary' : 'default'}>
          Check-out
        </Button>,
        <Button key="manual" onClick={handleManualInput} disabled={processing}>
          手动输入
        </Button>,
        <Button key="close" onClick={onClose} disabled={processing}>
          关闭
        </Button>
      ]}
      width={600}
      destroyOnClose
    >
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        {processing ? (
          <div>
            <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a' }} />
            <Text style={{ display: 'block', marginTop: 16 }}>处理中...</Text>
            {scannedData && (
              <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
                扫描到: {scannedData.substring(0, 30)}...
              </Text>
            )}
          </div>
        ) : (
          <div>
            <div id="qr-reader" style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}></div>
            <Text type="secondary" style={{ display: 'block', marginTop: 16 }}>
              请将QR码对准扫描框
            </Text>
          </div>
        )}
      </div>
    </Modal>
  );
};

