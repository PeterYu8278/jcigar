import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { Button, Spin, Card, Typography, Space, message, Tag, Divider, Upload, AutoComplete, Image, Modal } from 'antd';
import { CameraOutlined, ReloadOutlined, ThunderboltFilled, ThunderboltOutlined, LoadingOutlined, UploadOutlined, SwapOutlined, EditOutlined, DownloadOutlined, ShareAltOutlined } from '@ant-design/icons';
import Webcam from 'react-webcam';
import html2canvas from 'html2canvas';
import { useTranslation } from 'react-i18next';
import { analyzeCigarImage, CigarAnalysisResult } from '../../../services/gemini/cigarRecognition';
import { processAICigarRecognition } from '../../../services/aiCigarStorage';
import { getCigars, getBrands } from '../../../services/firebase/firestore';
import { findCigarByBrandAndName } from '../../../services/aiCigarStorage';
import { getAppConfig } from '../../../services/firebase/appConfig';
import type { UploadProps } from 'antd';
import type { Cigar, Brand } from '../../../types';

const { Title, Text, Paragraph } = Typography;

export const AICigarScanner: React.FC = () => {
    const { t } = useTranslation();
    const webcamRef = useRef<Webcam>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const videoTrackRef = useRef<MediaStreamTrack | null>(null);
    const resultCardRef = useRef<HTMLDivElement>(null);
    const [savingScreenshot, setSavingScreenshot] = useState(false);
    const [imgSrc, setImgSrc] = useState<string | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState<CigarAnalysisResult | null>(null);
    const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [flashEnabled, setFlashEnabled] = useState(false);
    const [flashSupported, setFlashSupported] = useState(false);
    const [focusSupported, setFocusSupported] = useState(false);
    const [focusing, setFocusing] = useState(false);
    const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<{
        matched: boolean;
        dataComplete: boolean;
        cigarIds: string[];
        cigars?: Cigar[];
    } | null>(null);
    const [userHint, setUserHint] = useState<string>('');
    const [cigars, setCigars] = useState<Cigar[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const [matchedCigars, setMatchedCigars] = useState<Cigar[]>([]);
    const [dataStorageEnabled, setDataStorageEnabled] = useState<boolean>(true);

    // 保存识别结果到数据库（内部函数，不暴露给用户）
    // 必须在 handleAnalyze 之前定义，避免依赖循环
    const saveRecognitionResult = useCallback(async (recognitionResult: CigarAnalysisResult, imageSource: string) => {
        // 检查是否启用数据存储
        if (!dataStorageEnabled) {
            message.info('数据存储已禁用，识别结果不会保存到数据库');
            return;
        }

        setSaving(true);
        try {
            // 不保存图片，直接保存识别结果
            const saveResult = await processAICigarRecognition(recognitionResult, undefined);
            setSaveStatus(saveResult);

            // 显示成功消息
            if (saveResult.matched) {
                if (saveResult.dataComplete) {
                    message.success(`✅ 找到匹配记录（数据完整）`);
                } else {
                    message.success(`⚠️ 找到匹配记录，已补充数据`);
                }
            } else {
                const sizeCount = saveResult.cigarIds.length;
                message.success(`🆕 已创建 ${sizeCount} 条雪茄记录（包含所有可能的尺寸）`);
            }
        } catch (error) {
            console.error('Save failed', error);
            message.error(`保存失败: ${error instanceof Error ? error.message : '未知错误'}`);
        } finally {
            setSaving(false);
        }
    }, [dataStorageEnabled]);

    // 加载品牌和雪茄列表用于自动完成
    useEffect(() => {
        const loadSuggestions = async () => {
            setLoadingSuggestions(true);
            try {
                const [cigarsData, brandsData] = await Promise.all([
                    getCigars(),
                    getBrands()
                ]);
                setCigars(cigarsData);
                setBrands(brandsData);
            } catch (error) {
                console.error('Failed to load suggestions:', error);
            } finally {
                setLoadingSuggestions(false);
            }
        };
        loadSuggestions();
    }, []);

    // 加载 AI识茄 数据存储配置
    useEffect(() => {
        const loadConfig = async () => {
            try {
                const config = await getAppConfig();
                if (config) {
                    setDataStorageEnabled(config.aiCigar?.enableDataStorage ?? true);
                }
            } catch (error) {
                console.error('Failed to load AI Cigar config:', error);
            }
        };
        loadConfig();
    }, []);

    // 生成自动完成选项
    const autocompleteOptions = useMemo(() => {
        const options: Array<{ value: string; label: string }> = [];
        
        // 添加品牌选项
        brands.forEach(brand => {
            options.push({
                value: brand.name,
                label: `品牌: ${brand.name}${brand.country ? ` (${brand.country})` : ''}`
            });
        });
        
        // 添加雪茄选项（品牌 + 名称）
        cigars.forEach(cigar => {
            const fullName = cigar.brand && cigar.name 
                ? `${cigar.brand} ${cigar.name}`
                : cigar.name || '';
            if (fullName) {
                options.push({
                    value: fullName,
                    label: `雪茄: ${fullName}${cigar.size ? ` (${cigar.size})` : ''}`
                });
            }
        });
        
        // 去重并按字母排序
        const uniqueOptions = Array.from(
            new Map(options.map(opt => [opt.value, opt])).values()
        ).sort((a, b) => a.value.localeCompare(b.value));
        
        return uniqueOptions;
    }, [brands, cigars]);

    // 过滤自动完成选项
    const filterOptions = (inputValue: string) => {
        if (!inputValue) return autocompleteOptions;
        const lowerInput = inputValue.toLowerCase();
        return autocompleteOptions.filter(opt => 
            opt.value.toLowerCase().includes(lowerInput) ||
            opt.label.toLowerCase().includes(lowerInput)
        );
    };

    const handleAnalyze = useCallback(async (imageSrc: string) => {
        setAnalyzing(true);
        setResult(null);
        setSaveStatus(null); // 重置保存状态
        setMatchedCigars([]); // 重置匹配的雪茄
        try {
            // 如果用户提供了提示，传递给识别函数
            const data = await analyzeCigarImage(imageSrc, userHint || undefined);
            setResult(data);
            
            // 尝试查找匹配的雪茄以获取图片
            try {
                const matchedCigar = await findCigarByBrandAndName(data.brand, data.name);
                if (matchedCigar) {
                    setMatchedCigars([matchedCigar]);
                }
            } catch (error) {
                console.warn('Failed to find matched cigar for images:', error);
            }
            
            // 根据可信度显示提示
            if (data.confidence < 0.5) {
                message.warning('识别可信度较低，建议重新拍摄');
            } else if (data.confidence >= 0.9) {
                // 可信度超过 90%，自动保存到数据库
                message.info(`识别可信度 ${Math.round(data.confidence * 100)}%，正在自动保存...`);
                await saveRecognitionResult(data, imageSrc);
            } else {
                message.info(`识别可信度 ${Math.round(data.confidence * 100)}%，未达到自动保存阈值（90%）`);
            }
        } catch (error) {
            console.error('Analysis failed', error);
            message.error('识别失败，请重试');
            setImgSrc(null); // Reset to camera
        } finally {
            setAnalyzing(false);
        }
    }, [saveRecognitionResult, userHint]);

    const capture = useCallback(() => {
        if (webcamRef.current) {
            const imageSrc = webcamRef.current.getScreenshot();
            if (imageSrc) {
                setImgSrc(imageSrc);
                handleAnalyze(imageSrc);
            }
        }
    }, [handleAnalyze]);

    // 点击屏幕聚焦
    const handleFocus = useCallback(async (event: React.MouseEvent<HTMLDivElement>) => {
        const videoTrack = videoTrackRef.current;
        if (!videoTrack || !focusSupported || focusing) return;

        const rect = event.currentTarget.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        
        // 标准化坐标到 [0, 1] 范围
        const normalizedX = Math.max(0, Math.min(1, x / 100));
        const normalizedY = Math.max(0, Math.min(1, y / 100));

        setFocusPoint({ x: normalizedX * 100, y: normalizedY * 100 });
        setFocusing(true);

        try {
            // 尝试使用 ImageCapture API 的 setFocusPoint（如果支持）
            const videoElement = webcamRef.current?.video;
            if (videoElement && 'ImageCapture' in window) {
                try {
                    const imageCapture = new (window as any).ImageCapture(videoTrack);
                    if (imageCapture.setFocusPoint) {
                        await imageCapture.setFocusPoint(normalizedX, normalizedY);
                        // 成功后清除焦点指示器
                        setTimeout(() => {
                            setFocusPoint(null);
                        }, 1000);
                        setFocusing(false);
                        return;
                    }
                } catch (error) {
                    // ImageCapture 不支持，继续尝试其他方法
                }
            }

            // 备用方案：使用 applyConstraints 设置焦点
            if ('applyConstraints' in videoTrack) {
                try {
                    const constraints = {
                        advanced: [
                            { focusMode: 'manual' as any },
                            { pointsOfInterest: [{ x: normalizedX, y: normalizedY }] as any }
                        ] as any
                    } as unknown as MediaTrackConstraints;

                    await videoTrack.applyConstraints(constraints);
                    
                    // 成功后清除焦点指示器
                    setTimeout(() => {
                        setFocusPoint(null);
                    }, 1000);
                } catch (error) {
                    // 如果失败，尝试简单的自动对焦
                    try {
                        await videoTrack.applyConstraints({
                            advanced: [{ focusMode: 'auto' as any }] as any
                        } as unknown as MediaTrackConstraints);
                    } catch (autoFocusError) {
                        console.warn('Focus not supported:', autoFocusError);
                        setFocusSupported(false);
                    }
                }
            }
        } catch (error: any) {
            console.error('Focus error:', error);
            if (error?.name === 'NotSupportedError' || error?.name === 'NotReadableError') {
                setFocusSupported(false);
            }
        } finally {
            setTimeout(() => {
                setFocusing(false);
            }, 500);
        }
    }, [focusSupported, focusing]);

    // 切换闪光灯（必须在 reset 和 toggleCamera 之前定义）
    const toggleFlash = useCallback(async (forceState?: boolean) => {
        const videoTrack = videoTrackRef.current;
        if (!videoTrack) return;

        const newState = forceState !== undefined ? forceState : !flashEnabled;
        
        try {
            // 优先使用 MediaStreamTrack 的 torch 方法（现代浏览器支持）
            if ('torch' in videoTrack && typeof (videoTrack as any).torch === 'function') {
                await (videoTrack as any).torch(newState);
                setFlashEnabled(newState);
            } else if ('applyConstraints' in videoTrack) {
                // 备用方案：尝试使用 applyConstraints
                try {
                    const constraints = {
                        advanced: [{ torch: newState } as any]
                    } as unknown as MediaTrackConstraints;
                    
                    await videoTrack.applyConstraints(constraints);
                    setFlashEnabled(newState);
                } catch {
                    // 如果 applyConstraints 不支持 torch，尝试直接设置属性
                    if ((videoTrack as any).torch !== undefined) {
                        (videoTrack as any).torch = newState;
                        setFlashEnabled(newState);
                    } else {
                        message.warning('当前设备不支持闪光灯控制');
                        setFlashSupported(false);
                    }
                }
            } else {
                message.warning('当前设备不支持闪光灯控制');
                setFlashSupported(false);
            }
        } catch (error: any) {
            console.error('Flash toggle error:', error);
            // 如果错误是因为不支持，隐藏闪光灯按钮
            if (error?.name === 'NotSupportedError' || error?.name === 'NotReadableError') {
                setFlashSupported(false);
                message.warning('当前设备不支持闪光灯控制');
            } else {
                message.error('切换闪光灯失败');
            }
        }
    }, [flashEnabled]);

    const toggleCamera = () => {
        // 切换摄像头前先关闭闪光灯
        if (flashEnabled) {
            toggleFlash(false);
        }
        setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
        setCameraError(null);
        setFlashSupported(false); // 重置支持状态，等摄像头启动后重新检测
    };

    const reset = () => {
        // 重置时关闭闪光灯
        if (flashEnabled) {
            toggleFlash(false);
        }
        setImgSrc(null);
        setResult(null);
        setSaveStatus(null);
        setUserHint(''); // 重置用户提示
        setMatchedCigars([]); // 重置匹配的雪茄
    };

    // 组件卸载时清理
    useEffect(() => {
        return () => {
            // 清理时关闭闪光灯和停止视频流
            if (flashEnabled && videoTrackRef.current) {
                toggleFlash(false);
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
            videoTrackRef.current = null;
        };
    }, [flashEnabled, toggleFlash]);

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

    const handleUserMedia = useCallback((stream: MediaStream) => {
        // 摄像头成功启动，清除错误
        setCameraError(null);
        
        // 保存 stream 引用以便控制闪光灯和对焦
        streamRef.current = stream;
        const videoTrack = stream.getVideoTracks()[0];
        videoTrackRef.current = videoTrack;
        
        if (videoTrack) {
            try {
                const capabilities = (videoTrack as any).getCapabilities?.();
                
                // 检查是否支持闪光灯（需要后置摄像头且支持 torch 模式）
                if (facingMode === 'environment') {
                    const hasTorch = capabilities?.torch || false;
                    setFlashSupported(hasTorch);
                    if (!hasTorch) {
                        setFlashEnabled(false);
                    }
                } else {
                    // 前置摄像头不支持闪光灯
                    setFlashSupported(false);
                    setFlashEnabled(false);
                }
                
                // 检查是否支持对焦（检查 focusMode 或 focusDistance 能力）
                const hasFocus = capabilities?.focusMode || capabilities?.focusDistance !== undefined || false;
                setFocusSupported(hasFocus);
            } catch (error) {
                // 如果获取 capabilities 失败，假设不支持
                setFlashSupported(false);
                setFlashEnabled(false);
                setFocusSupported(false);
            }
        }
    }, [facingMode]);

    // 视频约束配置
    const videoConstraints = facingMode === 'environment' 
        ? { facingMode: 'environment' } // 不使用 exact，允许回退
        : { facingMode: 'user' };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center' }}>
            {/* 手动输入雪茄型号（可选） */}
            {!imgSrc && (
                <Card 
                    style={{ 
                        width: '100%', 
                        marginBottom: '16px', 
                        background: 'rgba(255,255,255,0.05)', 
                        border: '1px solid #333' 
                    }}
                    size="small"
                >
                    <Space direction="vertical" style={{ width: '100%' }} size="small">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <EditOutlined style={{ color: '#ffd700' }} />
                            <Text style={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}>
                                手动输入雪茄型号（可选，可提高识别准确性）
                            </Text>
                        </div>
                        <AutoComplete
                            style={{ width: '100%' }}
                            placeholder="输入品牌或雪茄名称，例如：Cohiba Robusto"
                            value={userHint}
                            onChange={setUserHint}
                            options={filterOptions(userHint)}
                            filterOption={false}
                            allowClear
                            disabled={analyzing || loadingSuggestions}
                            notFoundContent={loadingSuggestions ? <Spin size="small" /> : null}
                        />
                        {userHint && (
                            <Text type="secondary" style={{ fontSize: '12px', color: '#aaa' }}>
                                提示：已输入 "{userHint}"，识别时将优先考虑此信息
                            </Text>
                        )}
                    </Space>
                </Card>
            )}
            
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
                        <div
                            onClick={handleFocus}
                            style={{ 
                                width: '100%', 
                                height: '100%', 
                                position: 'relative',
                                cursor: focusSupported ? 'crosshair' : 'default'
                            }}
                        >
                            <Webcam
                                audio={false}
                                ref={webcamRef}
                                screenshotFormat="image/jpeg"
                                videoConstraints={videoConstraints}
                                onUserMedia={handleUserMedia}
                                onUserMediaError={handleUserMediaError}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            {focusPoint && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        left: `${focusPoint.x}%`,
                                        top: `${focusPoint.y}%`,
                                        transform: 'translate(-50%, -50%)',
                                        width: '80px',
                                        height: '80px',
                                        border: '2px solid #ffd700',
                                        borderRadius: '8px',
                                        pointerEvents: 'none',
                                        boxShadow: '0 0 20px rgba(255, 215, 0, 0.6)',
                                        transition: 'all 0.3s ease',
                                        opacity: focusing ? 1 : 0.7
                                    }}
                                >
                                    <div
                                        style={{
                                            position: 'absolute',
                                            left: '50%',
                                            top: '50%',
                                            transform: 'translate(-50%, -50%)',
                                            width: '4px',
                                            height: '4px',
                                            background: '#ffd700',
                                            borderRadius: '50%',
                                            boxShadow: '0 0 10px rgba(255, 215, 0, 0.8)'
                                        }}
                                    />
                                </div>
                            )}
                            {focusing && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '10px',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        background: 'rgba(0, 0, 0, 0.7)',
                                        color: '#ffd700',
                                        padding: '4px 12px',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        pointerEvents: 'none'
                                    }}
                                >
                                    对焦中...
                                </div>
                            )}
                        </div>
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
                        {flashSupported && facingMode === 'environment' && (
                            <Button
                                type={flashEnabled ? 'primary' : 'default'}
                                shape="circle"
                                icon={flashEnabled ? <ThunderboltFilled style={{ fontSize: '20px' }} /> : <ThunderboltOutlined style={{ fontSize: '20px' }} />}
                                size="large"
                                style={{ 
                                    width: '48px', 
                                    height: '48px', 
                                    background: flashEnabled 
                                        ? 'rgba(255, 215, 0, 0.8)' 
                                        : 'rgba(0,0,0,0.6)',
                                    border: flashEnabled 
                                        ? '2px solid rgba(255, 215, 0, 0.9)' 
                                        : '2px solid rgba(255,255,255,0.3)',
                                    color: flashEnabled ? '#111' : '#fff'
                                }}
                                onClick={() => toggleFlash()}
                                title={flashEnabled ? '关闭闪光灯' : '打开闪光灯'}
                            />
                        )}
                        <Button
                            type="primary"
                            shape="circle"
                            icon={<CameraOutlined style={{color:'#111', fontSize: '24px' }} />}
                            size="large"
                            style={{ 
                                width: '64px', 
                                height: '64px', 
                                background: 'linear-gradient(135deg, #FDE08D 0%, #C48D3A 100%)',
                                boxShadow: '0 4px 16px rgba(255, 215, 0, 0.3)'
                            }}
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
                                <Divider style={{ margin: '6px 0', borderColor: '#333' }} />
                                <div style={{ 
                                    marginTop: '4px', 
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
                                <Divider style={{ margin: '6px 0', borderColor: '#333' }} />
                                <div style={{ 
                                    marginTop: '4px', 
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

                        <Paragraph style={{ color: '#aaa', marginTop: '6px', background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '4px' }}>
                            {result.description}
                        </Paragraph>

                        {/* 显示匹配雪茄的图片 */}
                        {(() => {
                            // 优先使用 saveStatus 中的 cigars，否则使用 matchedCigars
                            const cigarsToShow = saveStatus?.cigars && saveStatus.cigars.length > 0 
                                ? saveStatus.cigars 
                                : matchedCigars;
                            
                            if (!cigarsToShow || cigarsToShow.length === 0) {
                                return null;
                            }
                            
                            // 收集所有雪茄的图片（最多5张）
                            // 过滤掉无效的图片 URL（如 404 的 Cloudinary 图片）
                            const allImages: string[] = [];
                            cigarsToShow.forEach(cigar => {
                                if (cigar.images && cigar.images.length > 0) {
                                    cigar.images.forEach(img => {
                                        if (img && 
                                            typeof img === 'string' && 
                                            img.trim().length > 0 &&
                                            !allImages.includes(img) && 
                                            allImages.length < 5) {
                                            // 基本验证：确保是有效的 URL
                                            try {
                                                new URL(img);
                                                allImages.push(img);
                                            } catch {
                                                // 如果不是完整 URL，可能是相对路径，也允许
                                                if (img.startsWith('http') || img.startsWith('//') || img.startsWith('/')) {
                                                    allImages.push(img);
                                                }
                                            }
                                        }
                                    });
                                }
                            });

                            if (allImages.length > 0) {
                                return (
                                    <>
                                        <Divider style={{ margin: '12px 0', borderColor: '#333' }} />
                                        <div style={{ 
                                            marginTop: '4px', 
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
                                                雪茄图片 ({allImages.length} 张)
                                            </Text>
                                            <Image.PreviewGroup>
                                                <div style={{ 
                                                    display: 'grid', 
                                                    gridTemplateColumns: `repeat(${Math.min(allImages.length, 3)}, 1fr)`,
                                                    gap: '8px'
                                                }}>
                                                    {allImages.map((imgUrl, index) => (
                                                        <div 
                                                            key={index}
                                                            style={{
                                                                position: 'relative',
                                                                width: '100%',
                                                                aspectRatio: '1',
                                                                borderRadius: '8px',
                                                                overflow: 'hidden',
                                                                background: '#000',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            <Image
                                                                src={imgUrl}
                                                                alt={`雪茄图片 ${index + 1}`}
                                                                style={{
                                                                    width: '100%',
                                                                    height: '100%',
                                                                    objectFit: 'cover'
                                                                }}
                                                                preview={{
                                                                    mask: '预览'
                                                                }}
                                                                fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzMzMzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2NjY2NjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7lm77niYfliqDovb3lpLHotKU8L3RleHQ+PC9zdmc+"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </Image.PreviewGroup>
                                        </div>
                                    </>
                                );
                            }
                            return null;
                        })()}

                        <Space direction="vertical" style={{ width: '100%', marginTop: '12px' }} size="middle">
                            {saving && (
                                <div style={{
                                    padding: '12px',
                                    background: 'rgba(24, 144, 255, 0.1)',
                                    border: '1px solid #1890ff',
                                    borderRadius: '8px',
                                    textAlign: 'center'
                                }}>
                                    <Spin size="small" style={{ marginRight: 8 }} />
                                    <Text style={{ color: '#1890ff', fontSize: '13px' }}>正在保存到数据库...</Text>
                                </div>
                            )}
                            
                            <Button 
                                block 
                                icon={<ReloadOutlined />} 
                                onClick={reset}
                                loading={saving}
                                disabled={saving}
                                style={{
                                    background: 'linear-gradient(135deg, #FDE08D 0%, #C48D3A 100%)',
                                    color: '#111',
                                    fontWeight: 600,
                                    boxShadow: '0 4px 16px rgba(255, 215, 0, 0.3)'
                                }}
                            >
                                重新拍摄
                            </Button>
                        </Space>
                    </Space>
                </Card>
            )}

            {imgSrc && !result && !analyzing && (
                <Button 
                    block 
                    icon={<ReloadOutlined />} 
                    onClick={reset} 
                    style={{ 
                        marginTop: 16,
                        background: 'linear-gradient(135deg, #FDE08D 0%, #C48D3A 100%)',
                        border: 'none',
                        color: '#111',
                        fontWeight: 600,
                        boxShadow: '0 4px 16px rgba(255, 215, 0, 0.3)'
                    }}
                >
                    重新拍摄
                </Button>
            )}
        </div>
    );
};
