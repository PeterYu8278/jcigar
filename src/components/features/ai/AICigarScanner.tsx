import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Button, Spin, Card, Typography, Space, message, Tag, Divider, Upload } from 'antd';
import { CameraOutlined, ReloadOutlined, ThunderboltFilled, LoadingOutlined, UploadOutlined, SwapOutlined } from '@ant-design/icons';
import Webcam from 'react-webcam';
import { analyzeCigarImage, CigarAnalysisResult } from '../../../services/gemini/cigarRecognition';
import type { UploadProps } from 'antd';

const { Title, Text, Paragraph } = Typography;

export const AICigarScanner: React.FC = () => {
    const webcamRef = useRef<Webcam>(null);
    const [imgSrc, setImgSrc] = useState<string | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState<CigarAnalysisResult | null>(null);
    const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
    const [cameraError, setCameraError] = useState<string | null>(null);

    const handleAnalyze = useCallback(async (imageSrc: string) => {
        setAnalyzing(true);
        setResult(null);
        try {
            const data = await analyzeCigarImage(imageSrc);
            setResult(data);
            if (data.confidence < 0.5) {
                message.warning('识别可信度较低，建议重新拍摄');
            }
        } catch (error) {
            console.error('Analysis failed', error);
            message.error('识别失败，请重试');
            setImgSrc(null); // Reset to camera
        } finally {
            setAnalyzing(false);
        }
    }, []);

    const capture = useCallback(() => {
        if (webcamRef.current) {
            const imageSrc = webcamRef.current.getScreenshot();
            if (imageSrc) {
                setImgSrc(imageSrc);
                handleAnalyze(imageSrc);
            }
        }
    }, [handleAnalyze]);

    const reset = () => {
        setImgSrc(null);
        setResult(null);
    };

    const toggleCamera = () => {
        setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
        setCameraError(null);
    };

    const handleFileUpload: UploadProps['beforeUpload'] = (file) => {
        // 验证文件类型
        if (!file.type.startsWith('image/')) {
            message.error('请选择图片文件');
            return false;
        }

        // 验证文件大小（限制为 10MB）
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            message.error('图片文件大小不能超过 10MB');
            return false;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;
            if (result) {
                setImgSrc(result);
                handleAnalyze(result);
            }
        };
        reader.onerror = () => {
            message.error('读取图片失败，请重试');
        };
        reader.readAsDataURL(file);
        return false; // 阻止自动上传
    };

    const handleUserMediaError = useCallback((error: string | DOMException) => {
        console.error('Webcam error:', error);
        
        // 如果后置摄像头失败，尝试前置摄像头
        if (facingMode === 'environment') {
            setFacingMode('user');
            setCameraError('后置摄像头不可用，已切换到前置摄像头');
            message.warning('后置摄像头不可用，已切换到前置摄像头');
        } else {
            const errorMessage = typeof error === 'string' ? error : error.message || '无法访问摄像头';
            setCameraError(errorMessage);
            message.error('无法访问摄像头，请检查权限设置');
        }
    }, [facingMode]);

    const handleUserMedia = useCallback(() => {
        // 摄像头成功启动，清除错误
        setCameraError(null);
    }, []);

    // 视频约束配置
    const videoConstraints = facingMode === 'environment' 
        ? { facingMode: 'environment' } // 不使用 exact，允许回退
        : { facingMode: 'user' };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center' }}>
            {!imgSrc ? (
                <div style={{ position: 'relative', width: '100%', height: '300px', background: '#000', borderRadius: '12px', overflow: 'hidden' }}>
                    {cameraError ? (
                        <div style={{ 
                            width: '100%', 
                            height: '100%', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            color: '#fff',
                            padding: '20px',
                            textAlign: 'center'
                        }}>
                            <CameraOutlined style={{ fontSize: 48, marginBottom: 16, color: '#ff4d4f' }} />
                            <Text style={{ color: '#fff', marginBottom: 8 }}>{cameraError}</Text>
                            <Button 
                                type="primary" 
                                onClick={() => {
                                    setCameraError(null);
                                    setFacingMode(facingMode === 'environment' ? 'user' : 'environment');
                                }}
                                style={{ marginTop: 8 }}
                            >
                                重试
                            </Button>
                        </div>
                    ) : (
                        <Webcam
                            audio={false}
                            ref={webcamRef}
                            screenshotFormat="image/jpeg"
                            videoConstraints={videoConstraints}
                            onUserMedia={handleUserMedia}
                            onUserMediaError={handleUserMediaError}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    )}
                    <div style={{
                        position: 'absolute',
                        bottom: '20px',
                        left: '0',
                        right: '0',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <Button
                            type="default"
                            shape="circle"
                            icon={<SwapOutlined style={{ fontSize: '20px' }} />}
                            size="large"
                            style={{ 
                                width: '48px', 
                                height: '48px', 
                                background: 'rgba(0,0,0,0.6)',
                                border: '2px solid rgba(255,255,255,0.3)',
                                color: '#fff'
                            }}
                            onClick={toggleCamera}
                            title={facingMode === 'environment' ? '切换到前置摄像头' : '切换到后置摄像头'}
                        />
                        <Button
                            type="primary"
                            shape="circle"
                            icon={<CameraOutlined style={{ fontSize: '24px' }} />}
                            size="large"
                            style={{ width: '64px', height: '64px', border: '4px solid rgba(255,255,255,0.5)' }}
                            onClick={capture}
                        />
                        <Upload
                            accept="image/*"
                            beforeUpload={handleFileUpload}
                            showUploadList={false}
                        >
                            <Button
                                type="default"
                                shape="circle"
                                icon={<UploadOutlined style={{ fontSize: '20px' }} />}
                                size="large"
                                style={{ 
                                    width: '48px', 
                                    height: '48px', 
                                    background: 'rgba(0,0,0,0.6)',
                                    border: '2px solid rgba(255,255,255,0.3)',
                                    color: '#fff'
                                }}
                                title="上传图片"
                            />
                        </Upload>
                    </div>
                </div>
            ) : (
                <div style={{ width: '100%', marginBottom: '16px' }}>
                    <img src={imgSrc} alt="Captured" style={{ width: '100%', borderRadius: '12px', maxHeight: '300px', objectFit: 'contain', background: '#000' }} />
                    {analyzing && (
                        <div style={{
                            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center', borderRadius: '12px',
                            zIndex: 10
                        }}>
                            <Spin indicator={<LoadingOutlined style={{ fontSize: 48, color: '#ffd700' }} spin />} />
                            <Text style={{ color: '#fff', marginTop: 16 }}>AI 正在识别雪茄...</Text>
                        </div>
                    )}
                </div>
            )}

            {result && !analyzing && (
                <Card style={{ width: '100%', marginTop: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid #333' }}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                            <div>
                                <Title level={4} style={{ margin: 0, color: '#ffd700' }}>{result.brand}</Title>
                                <Text style={{ fontSize: '16px', color: '#fff' }}>{result.name}</Text>
                            </div>
                            <Tag color={result.strength === 'Full' ? 'red' : result.strength === 'Medium' ? 'orange' : 'green'}>
                                {result.strength}
                            </Tag>
                        </div>

                        <Divider style={{ margin: '12px 0', borderColor: '#333' }} />

                        <Space split={<Divider type="vertical" style={{ borderColor: '#555' }} />}>
                            <Text style={{ color: '#ddd' }} type="secondary">产地: <span style={{ color: '#ddd' }}>{result.origin}</span></Text>
                            <Text style={{ color: '#ddd' }} type="secondary">可信度: <span style={{ color: '#ddd' }}>{Math.round(result.confidence * 100)}%</span></Text>
                        </Space>

                        <div style={{ marginTop: '8px' }}>
                            {result.flavorProfile.map(flavor => (
                                <Tag key={flavor} color="gold" style={{ marginRight: '4px', marginBottom: '4px' }}>{flavor}</Tag>
                            ))}
                        </div>

                        {(result.wrapper || result.binder || result.filler) && (
                            <>
                                <Divider style={{ margin: '12px 0', borderColor: '#333' }} />
                                <div style={{ 
                                    marginTop: '8px', 
                                    background: 'rgba(0,0,0,0.2)', 
                                    padding: '12px', 
                                    borderRadius: '8px',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }}>
                                    <Text type="secondary" style={{ 
                                        fontSize: '13px', 
                                        display: 'block', 
                                        marginBottom: '12px',
                                        fontWeight: 500,
                                        color: '#ffd700'
                                    }}>
                                        雪茄构造
                                    </Text>
                                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                        {result.wrapper && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                                <Text type="secondary" style={{ color: '#ddd', fontSize: '12px', minWidth: '80px' }}>茄衣 (Wrapper):</Text>
                                                <Text style={{ color: '#ddd', fontSize: '12px', textAlign: 'right', flex: 1 }}>{result.wrapper}</Text>
                                            </div>
                                        )}
                                        {result.binder && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                                <Text type="secondary" style={{ color: '#ddd', fontSize: '12px', minWidth: '80px' }}>茄套 (Binder):</Text>
                                                <Text style={{ color: '#ddd', fontSize: '12px', textAlign: 'right', flex: 1 }}>{result.binder}</Text>
                                            </div>
                                        )}
                                        {result.filler && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                                <Text type="secondary" style={{ color: '#ddd', fontSize: '12px', minWidth: '80px' }}>茄芯 (Filler):</Text>
                                                <Text style={{ color: '#ddd', fontSize: '12px', textAlign: 'right', flex: 1 }}>{result.filler}</Text>
                                            </div>
                                        )}
                                    </Space>
                                </div>
                            </>
                        )}

                        {(result.footTasteNotes?.length || result.bodyTasteNotes?.length || result.headTasteNotes?.length) && (
                            <>
                                <Divider style={{ margin: '12px 0', borderColor: '#333' }} />
                                <div style={{ 
                                    marginTop: '8px', 
                                    background: 'rgba(0,0,0,0.2)', 
                                    padding: '12px', 
                                    borderRadius: '8px',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }}>
                                    <Text type="secondary" style={{ 
                                        fontSize: '13px', 
                                        display: 'block', 
                                        marginBottom: '12px',
                                        fontWeight: 500,
                                        color: '#ffd700'
                                    }}>
                                        品吸笔记
                                    </Text>
                                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                        {result.footTasteNotes && result.footTasteNotes.length > 0 && (
                                            <div>
                                                <Text type="secondary" style={{ color: '#ddd', fontSize: '12px', display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                                                    脚部 (Foot) - 前1/3:
                                                </Text>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                    {result.footTasteNotes.map((note, index) => (
                                                        <Tag key={index} color="cyan" style={{ fontSize: '11px', margin: 0 }}>{note}</Tag>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {result.bodyTasteNotes && result.bodyTasteNotes.length > 0 && (
                                            <div>
                                                <Text type="secondary" style={{ color: '#ddd', fontSize: '12px', display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                                                    主体 (Body) - 中1/3:
                                                </Text>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                    {result.bodyTasteNotes.map((note, index) => (
                                                        <Tag key={index} color="blue" style={{ fontSize: '11px', margin: 0 }}>{note}</Tag>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {result.headTasteNotes && result.headTasteNotes.length > 0 && (
                                            <div>
                                                <Text type="secondary" style={{ color: '#ddd', fontSize: '12px', display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                                                    头部 (Head) - 后1/3:
                                                </Text>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                    {result.headTasteNotes.map((note, index) => (
                                                        <Tag key={index} color="purple" style={{ fontSize: '11px', margin: 0 }}>{note}</Tag>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </Space>
                                </div>
                            </>
                        )}

                        <Paragraph style={{ color: '#aaa', marginTop: '12px', background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '4px' }}>
                            {result.description}
                        </Paragraph>

                        <Button block icon={<ReloadOutlined />} onClick={reset}>
                            重新拍摄
                        </Button>
                    </Space>
                </Card>
            )}

            {imgSrc && !result && !analyzing && (
                <Button block icon={<ReloadOutlined />} onClick={reset} style={{ marginTop: 16 }}>
                    重新拍摄
                </Button>
            )}
        </div>
    );
};
