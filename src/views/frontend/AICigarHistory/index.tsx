// 用户 AI 识茄历史记录页面
import React, { useState, useEffect } from 'react';
import { Card, Typography, Space, Tag, Spin, message, Empty, Button } from 'antd';
import { ArrowLeftOutlined, DatabaseOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../../store/modules/auth';
import { getUserCigarScanHistory } from '../../../services/cigar/cigarDataAggregation';
import type { AggregatedCigarData } from '../../../services/cigar/cigarDataAggregation';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

interface UserCigarHistoryItem {
    productName: string;
    aggregatedData: AggregatedCigarData;
}

const AICigarHistory: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<UserCigarHistoryItem[]>([]);

    useEffect(() => {
        if (!user?.id) {
            message.warning('请先登录');
            navigate('/');
            return;
        }

        loadHistory();
    }, [user?.id]);

    const loadHistory = async () => {
        if (!user?.id) return;

        setLoading(true);
        try {
            const data = await getUserCigarScanHistory(user.id);
            setHistory(data);
        } catch (error) {
            console.error('[AICigarHistory] 加载失败:', error);
            message.error('加载历史记录失败');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (date: Date | null) => {
        if (!date) return '-';
        return dayjs(date).format('YYYY-MM-DD HH:mm');
    };

    if (loading) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                minHeight: '50vh' 
            }}>
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div style={{ 
            minHeight: '100vh',
            background: 'linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%)',
            padding: '16px',
            color: '#FFFFFF'
        }}>
            {/* Header */}
            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px',
                marginBottom: '24px'
            }}>
                <Button
                    type="text"
                    icon={<ArrowLeftOutlined />}
                    onClick={() => navigate(-1)}
                    style={{ color: '#FFFFFF', fontSize: '20px' }}
                />
                <Title level={3} style={{ 
                    margin: 0, 
                    color: '#FFFFFF',
                    backgroundImage: 'linear-gradient(to right,#FDE08D,#C48D3A)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                }}>
                    我的 AI 识茄历史
                </Title>
            </div>

            {/* 统计概览 */}
            {history.length > 0 && (
                <Card
                    style={{
                        marginBottom: '24px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 215, 0, 0.3)',
                        borderRadius: '12px'
                    }}
                    bodyStyle={{ padding: '16px' }}
                >
                    <Space size="large" wrap>
                        <div style={{ textAlign: 'center' }}>
                            <Text style={{ color: '#999', fontSize: '12px', display: 'block' }}>
                                识别品牌数
                            </Text>
                            <Text style={{ 
                                color: '#ffd700', 
                                fontSize: '24px', 
                                fontWeight: 'bold',
                                display: 'block',
                                marginTop: '4px'
                            }}>
                                {history.length}
                            </Text>
                        </div>
                        {history.length > 0 && history[0].aggregatedData.lastRecognizedAt && (
                            <div style={{ textAlign: 'center' }}>
                                <Text style={{ color: '#999', fontSize: '12px', display: 'block' }}>
                                    最近识别
                                </Text>
                                <Text style={{ 
                                    color: '#ffd700', 
                                    fontSize: '14px',
                                    display: 'block',
                                    marginTop: '4px'
                                }}>
                                    {dayjs(history[0].aggregatedData.lastRecognizedAt).fromNow()}
                                </Text>
                            </div>
                        )}
                    </Space>
                </Card>
            )}

            {/* 历史记录列表 */}
            {history.length === 0 ? (
                <Empty
                    description={
                        <Text style={{ color: '#999' }}>
                            暂无识别历史记录
                        </Text>
                    }
                    style={{ marginTop: '60px' }}
                />
            ) : (
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    {history.map((item, index) => (
                        <Card
                            key={index}
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease'
                            }}
                            bodyStyle={{ padding: '16px' }}
                            hoverable
                            onClick={() => {
                                // 可以导航到详情页或显示详情模态框
                                message.info(`查看 ${item.productName} 的详细信息`);
                            }}
                        >
                            <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                {/* 产品名称 */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                    <Title level={5} style={{ 
                                        margin: 0, 
                                        color: '#ffd700',
                                        fontSize: '18px'
                                    }}>
                                        {item.productName}
                                    </Title>
                                    <Tag color="blue" style={{ margin: 0 }}>
                                        {item.aggregatedData.totalRecognitions} 次识别
                                    </Tag>
                                </div>

                                {/* 综合数据 */}
                                <div style={{ 
                                    padding: '12px',
                                    background: 'rgba(255, 215, 0, 0.1)',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(255, 215, 0, 0.2)'
                                }}>
                                    <Text style={{ color: '#ffd700', fontSize: '12px', display: 'block', marginBottom: '8px' }}>
                                        📊 综合数据：基于 {item.aggregatedData.totalRecognitions} 次识别统计
                                    </Text>
                                    <Space size="middle" wrap>
                                        {item.aggregatedData.brand && (
                                            <Text style={{ color: '#ddd', fontSize: '13px' }}>
                                                品牌: <span style={{ color: '#fff', fontWeight: 500 }}>
                                                    {item.aggregatedData.brand}
                                                </span>
                                            </Text>
                                        )}
                                        {item.aggregatedData.origin && (
                                            <Text style={{ color: '#ddd', fontSize: '13px' }}>
                                                产地: <span style={{ color: '#fff', fontWeight: 500 }}>
                                                    {item.aggregatedData.origin}
                                                </span>
                                            </Text>
                                        )}
                                        {item.aggregatedData.strength && (
                                            <Tag 
                                                color={item.aggregatedData.strength === 'Full' ? 'red' : 
                                                       item.aggregatedData.strength === 'Medium' ? 'orange' : 'green'}
                                                style={{ fontSize: '12px' }}
                                            >
                                                {item.aggregatedData.strength}
                                            </Tag>
                                        )}
                                    </Space>
                                </div>

                                {/* 贡献者信息 */}
                                {item.aggregatedData.contributors.length > 0 && (
                                    <div>
                                        <Text style={{ color: '#999', fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                                            👥 贡献者（{item.aggregatedData.uniqueContributors}人）
                                        </Text>
                                        <Space wrap size={[4, 4]}>
                                            {item.aggregatedData.contributors.map((contributor) => (
                                                <Tag 
                                                    key={contributor.userId}
                                                    style={{ 
                                                        background: 'rgba(255, 215, 0, 0.2)',
                                                        border: '1px solid rgba(255, 215, 0, 0.3)',
                                                        color: '#ffd700',
                                                        fontSize: '11px'
                                                    }}
                                                >
                                                    {contributor.userName}
                                                </Tag>
                                            ))}
                                        </Space>
                                    </div>
                                )}

                                {/* 最后识别时间 */}
                                <Text style={{ color: '#999', fontSize: '11px' }}>
                                    最后识别: {formatDate(item.aggregatedData.lastRecognizedAt)}
                                </Text>
                            </Space>
                        </Card>
                    ))}
                </Space>
            )}
        </div>
    );
};

export default AICigarHistory;

