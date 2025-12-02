// QR码扫描组件 - 用于管理员check-in/check-out
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Modal, Button, message, Space, Typography } from 'antd';
import { QrcodeOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { Html5Qrcode } from 'html5-qrcode';
import { createVisitSession, completeVisitSession, getPendingVisitSession } from '../../services/firebase/visitSessions';
import { getUserByMemberId } from '../../utils/memberId';
import { useAuthStore } from '../../store/modules/auth';

const { Text } = Typography;

interface QRScannerViewProps {
  active: boolean;
  mode: 'checkin' | 'checkout';
  onModeChange: (mode: 'checkin' | 'checkout') => void;
  onSuccess?: () => void;
  onClose?: () => void; // Optional, for "Close" button inside view if needed
}

export const QRScannerView: React.FC<QRScannerViewProps> = ({ active, mode, onModeChange, onSuccess, onClose }) => {
  const { user: adminUser } = useAuthStore();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isStoppingRef = useRef<boolean>(false);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const [processing, setProcessing] = useState(false);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [checkInError, setCheckInError] = useState<string | null>(null);

  // 启动扫描
  const startScanning = async (facingMode: 'environment' | 'user' = 'environment') => {
    // Prevent multiple starts
    if (scannerRef.current?.isScanning) return;

    try {
      // Ensure element exists
      if (!document.getElementById('qr-reader-view')) return;

      // Ensure previous instance is cleaned up
      if (scannerRef.current) {
        await stopScanning();
        // 等待停止完成
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setCameraError(null);
      isStoppingRef.current = false; // 重置停止标志
      const scanner = new Html5Qrcode('qr-reader-view');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode }, // 使用指定的摄像头
        {
          fps: 10,
          qrbox: { width: 200, height: 200 }
        },
        (decodedText) => {
          // 扫描成功
          handleScanResult(decodedText);
        },
        (errorMessage) => {
          // 扫描错误（忽略，继续扫描）
        }
      );

    } catch (error: any) {
      console.error('Scanner start error:', error);
      
      // 提取错误信息（可能嵌套在 error.message 中）
      const errorString = error?.message || error?.toString() || '';
      const errorName = error?.name || '';
      
      // 处理不同类型的错误
      let errorMessage = '无法启动摄像头';
      
      // 检查错误名称或错误消息中是否包含特定错误类型
      if (errorName === 'NotReadableError' || errorString.includes('NotReadableError') || errorString.includes('Could not start video source')) {
        errorMessage = '摄像头被占用或无法访问，请关闭其他使用摄像头的应用后重试';
      } else if (errorName === 'NotAllowedError' || errorString.includes('NotAllowedError') || errorString.includes('Permission denied')) {
        errorMessage = '摄像头权限被拒绝，请在浏览器设置中允许访问摄像头';
      } else if (errorName === 'NotFoundError' || errorString.includes('NotFoundError') || errorString.includes('no device')) {
        errorMessage = '未找到摄像头设备';
      } else if (errorString.includes('Could not start video source')) {
        errorMessage = '无法启动视频源，摄像头可能被其他应用占用';
      } else if (errorString) {
        // 尝试从错误消息中提取有用信息
        errorMessage = errorString.length > 100 ? '无法启动摄像头，请检查权限设置' : errorString;
      }
      
      setCameraError(errorMessage);
      
      // 如果后置摄像头失败，尝试前置摄像头
      if (facingMode === 'environment' && !retrying) {
        setRetrying(true);
        setTimeout(async () => {
          try {
            await startScanning('user');
            setRetrying(false);
          } catch (retryError) {
            setRetrying(false);
            message.warning('无法启动摄像头，请使用手动输入功能');
          }
        }, 500);
      } else {
        setRetrying(false);
        // 不显示错误消息，因为已经在 UI 中显示了
      }
    }
  };

  // 停止扫描
  const stopScanning = async () => {
    // 防止重复调用
    if (isStoppingRef.current) {
      return;
    }

    if (!scannerRef.current) {
      return;
    }

    isStoppingRef.current = true;

    try {
      const scanner = scannerRef.current;
      
        // Check if scanner is running before stopping
      if (scanner.isScanning) {
        try {
          await scanner.stop();
        } catch (stopError: any) {
          // 忽略状态转换错误（可能已经在停止过程中）
          if (!stopError?.message?.includes('already under transition') && 
              !stopError?.message?.includes('Cannot transition')) {
            console.error('Scanner stop error:', stopError);
          }
        }
      }
      
      // Only clear if scanner still exists and was initialized
      if (scannerRef.current) {
        try {
          await scannerRef.current.clear();
        } catch (clearError: any) {
          // Ignore clear errors as it might be already cleared or null
          if (!clearError?.message?.includes('Cannot read properties of null')) {
            console.warn('Scanner clear warning:', clearError);
          }
        }
        }
    } catch (error: any) {
      // 忽略状态转换相关的错误
      if (!error?.message?.includes('already under transition') && 
          !error?.message?.includes('Cannot transition') &&
          !error?.message?.includes('Cannot read properties of null')) {
        console.error('Scanner stop error:', error);
      }
    } finally {
      // 清理引用
      videoTrackRef.current = null;
      scannerRef.current = null;
      isStoppingRef.current = false;
    }
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
    // 先停止扫描，避免重复扫描
    await stopScanning();

    try {
      const memberId = parseQRCode(qrData);
      if (!memberId) {
        message.error('无法解析QR码，请确保扫描的是会员QR码');
        setProcessing(false);
        setScannedData(null);
        // 重新启动扫描
        setTimeout(() => {
          startScanning();
        }, 500);
        return;
      }

      const userResult = await getUserByMemberId(memberId);
      if (!userResult.success || !userResult.user) {
        message.error(userResult.error || `未找到会员编号为 ${memberId} 的用户`);
        setProcessing(false);
        setScannedData(null);
        // 重新启动扫描
        setTimeout(() => {
          startScanning();
        }, 500);
        return;
      }

      const userId = userResult.user.id;

      if (!adminUser?.id) {
        message.error('管理员信息不存在');
        setProcessing(false);
        setScannedData(null);
        // 重新启动扫描
        setTimeout(() => {
          startScanning();
        }, 500);
        return;
      }

      if (mode === 'checkin') {
        // Check-in
        const result = await createVisitSession(userId, adminUser.id, userResult.user.displayName);
        if (result.success) {
          message.success(`Check-in 成功！Session ID: ${result.sessionId}`);
          setCheckInError(null);
          // 延迟关闭，确保消息显示
          setTimeout(() => {
            onSuccess?.();
          }, 500);
        } else {
          const errorMsg = result.error || 'Check-in 失败';
          // 只在开发环境或非预期错误时输出日志
          if (process.env.NODE_ENV === 'development' || !errorMsg.includes('已有未完成的驻店记录')) {
          console.error('[QRScanner] Check-in失败:', errorMsg);
          }
          
          // 如果是"用户已有未完成的驻店记录"错误，在弹窗UI中显示
          if (errorMsg.includes('已有未完成的驻店记录') || errorMsg.includes('请先check-out')) {
            setCheckInError('用户已有未完成的驻店记录，请先check-out');
          } else {
          message.error(errorMsg);
          }
          
          setProcessing(false);
          setScannedData(null);
          // 重新启动扫描
          setTimeout(() => {
            startScanning();
          }, 500);
        }
      } else {
        // Check-out
        const pendingSession = await getPendingVisitSession(userId);
        if (!pendingSession) {
          message.error('该用户没有待处理的驻店记录');
          setProcessing(false);
          setScannedData(null);
          // 重新启动扫描
          setTimeout(() => {
            startScanning();
          }, 500);
          return;
        }

        const result = await completeVisitSession(pendingSession.id, adminUser.id);
        if (result.success) {
          message.success(`Check-out 成功！扣除积分: ${result.pointsDeducted || 0}`);
          onSuccess?.();
        } else {
          message.error(result.error || 'Check-out 失败');
          setProcessing(false);
          setScannedData(null);
          // 重新启动扫描
          setTimeout(() => {
            startScanning();
          }, 500);
        }
      }
    } catch (error: any) {
      message.error(error.message || '处理失败');
      setProcessing(false);
      setScannedData(null);
      // 重新启动扫描
      setTimeout(() => {
        startScanning();
      }, 500);
    }
  };

  // 点击屏幕聚焦

  // 手动输入memberId
  const handleManualInput = () => {
    const memberId = prompt('请输入会员编号:');
    if (memberId) {
      handleScanResult(memberId);
    }
  };

  useEffect(() => {
    if (active) {
      // 重置错误状态
      setCameraError(null);
      setRetrying(false);
      setCheckInError(null);
      // 延迟启动，确保DOM已渲染
      setTimeout(() => {
        startScanning();
      }, 100);
    } else {
      stopScanning();
      setCameraError(null);
      setRetrying(false);
      setCheckInError(null);
    }

    return () => {
      stopScanning();
    };
  }, [active]);

  // 重试启动摄像头
  const handleRetry = async () => {
    setRetrying(false);
    setCameraError(null);
    await startScanning('environment');
  };

  return (
    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Check-in 错误提示 */}
      {checkInError && (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(239, 68, 68, 0.2)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
          <Text style={{ color: '#ff6b6b', fontSize: 14, fontWeight: 500 }}>
            ⚠️ {checkInError}
          </Text>
        </div>
      )}
      
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {processing ? (
          <div>
            <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a' }} />
            <Text style={{ display: 'block', marginTop: 16, color: '#FFFFFF' }}>处理中...</Text>
            {scannedData && (
              <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12, color: 'rgba(255, 255, 255, 0.6)' }}>
                扫描到: {scannedData.substring(0, 30)}...
              </Text>
            )}
          </div>
        ) : cameraError ? (
          <div>
            <QrcodeOutlined style={{ fontSize: 48, color: '#ff4d4f' }} />
            <Text type="danger" style={{ display: 'block', marginTop: 16, padding: '0 20px' }}>
              {cameraError}
            </Text>
            <Space style={{ marginTop: 16 }}>
              <Button type="primary" onClick={handleRetry} loading={retrying}>
                重试
              </Button>
              <Button onClick={handleManualInput}>
                手动输入
              </Button>
            </Space>
          </div>
        ) : (
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '350px',
              margin: '0 auto'
            }}
          >
            <div id="qr-reader-view" style={{ width: '100%' }}></div>
            <Text type="secondary" style={{ display: 'block', marginTop: 16, color: 'rgba(255, 255, 255, 0.6)' }}>
              请将QR码对准扫描框
            </Text>
          </div>
        )}
      </div>

      <div style={{ marginTop: 20}}>
        <Space wrap style={{ justifyContent: 'center' }}>
          <Button 
            onClick={() => {
              onModeChange('checkin');
              setCheckInError(null);
            }} 
            disabled={processing} 
            type={mode === 'checkin' ? 'primary' : 'default'}
            style={mode === 'checkin' ? {
              background: 'linear-gradient(to right, #FDE08D, #C48D3A)',
              border: 'none',
              color: '#111',
              fontWeight: 700
            } : {
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#FFFFFF'
            }}
          >
            Check-in
          </Button>
          <Button 
            onClick={() => {
              onModeChange('checkout');
              setCheckInError(null);
            }} 
            disabled={processing} 
            type={mode === 'checkout' ? 'primary' : 'default'}
            style={mode === 'checkout' ? {
              background: 'linear-gradient(to right, #FDE08D, #C48D3A)',
              border: 'none',
              color: '#111',
              fontWeight: 700
            } : {
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#FFFFFF'
            }}
          >
            Check-out
          </Button>
          <Button 
            onClick={handleManualInput} 
            disabled={processing}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#FFFFFF'
            }}
          >
            手动输入
          </Button>
          {onClose && (
            <Button 
              onClick={onClose} 
              disabled={processing}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#FFFFFF'
              }}
            >
              关闭
            </Button>
          )}
        </Space>
      </div>
    </div>
  );
};

interface QRScannerProps {
  visible: boolean;
  onClose: () => void;
  mode: 'checkin' | 'checkout';
  onSuccess?: () => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ visible, onClose, mode: initialMode, onSuccess }) => {
  const [mode, setQrScannerMode] = useState<'checkin' | 'checkout'>(initialMode);

  useEffect(() => {
    setQrScannerMode(initialMode);
  }, [initialMode]);

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
      footer={null}
      width={600}
      destroyOnHidden
    >
      {/* Pass active=visible to trigger camera start/stop */}
      <QRScannerView
        active={visible}
        mode={mode}
        onModeChange={setQrScannerMode}
        onSuccess={() => {
          onSuccess?.();
          onClose();
        }}
        onClose={onClose}
      />
    </Modal>
  );
};

