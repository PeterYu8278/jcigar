// 用户 AI 识茄历史记录页面
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, Typography, Space, Tag, Spin, message, Empty, Button, Input } from 'antd';
import { ArrowLeftOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../../store/modules/auth';
import { getUserCigarScanHistory } from '../../../services/cigar/cigarDataAggregation';
import type { AggregatedCigarData } from '../../../services/cigar/cigarDataAggregation';
import dayjs from 'dayjs';
import { CigarRatingBadge } from '../../../components/common/CigarRatingBadge';
import { getBrands } from '../../../services/firebase/firestore';
import type { Brand } from '../../../types';

const DEFAULT_CIGAR_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjMzMzMzMzIi8+Cjx0ZXh0IHg9IjQwIiB5PSI0MCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjY2NjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Q2lnYXI8L3RleHQ+Cjwvc3ZnPgo=';

const { Title, Text } = Typography;

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
    const [brandsData, setBrandsData] = useState<Brand[]>([]);
    const [selectedBrand, setSelectedBrand] = useState<string>('all');
    const [searchKeyword, setSearchKeyword] = useState('');
    const isMobile = typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false;
    const sidebarRef = useRef<HTMLDivElement | null>(null);
    const brandRefs = useRef<Record<string, HTMLDivElement | null>>({});

    useEffect(() => {
        if (!user?.id) {
            message.warning('请先登录');
            navigate('/');
            return;
        }

        loadHistory();
        loadBrands();
    }, [user?.id]);

    const loadBrands = async () => {
        try {
            const brands = await getBrands();
            setBrandsData(brands);
        } catch (error) {
            console.error('[AICigarHistory] 加载品牌失败:', error);
        }
    };

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

    // 从历史记录中提取品牌列表（去重），并匹配 brands collection 数据
    const brands = useMemo(() => {
        const brandSet = new Set<string>();
        history.forEach(item => {
            if (item.aggregatedData.brand) {
                brandSet.add(item.aggregatedData.brand);
            }
        });
        const brandNames = Array.from(brandSet).sort();
        
        // 匹配 brands collection 中的品牌数据
        return brandNames.map(brandName => {
            const brandData = brandsData.find(b => b.name === brandName);
            return {
                name: brandName,
                logo: brandData?.logo,
                country: brandData?.country,
                id: brandData?.id
            };
        });
    }, [history, brandsData]);

    // 按产地分组品牌
    const cubanBrands = useMemo(() => {
        return brands.filter(brand => {
            const brandData = brandsData.find(b => b.name === brand.name);
            return brandData && (brandData.country?.toLowerCase() === 'cuba' || brandData.country?.toLowerCase() === 'cuban');
        });
    }, [brands, brandsData]);

    const newWorldBrands = useMemo(() => {
        return brands.filter(brand => {
            const brandData = brandsData.find(b => b.name === brand.name);
            return brandData && brandData.country?.toLowerCase() !== 'cuba' && brandData.country?.toLowerCase() !== 'cuban';
        });
    }, [brands, brandsData]);

    // 筛选后的历史记录
    const filteredHistory = useMemo(() => {
        let filtered = history;
        
        // 品牌筛选
        if (selectedBrand !== 'all') {
            filtered = filtered.filter(item => item.aggregatedData.brand === selectedBrand);
        }
        
        // 搜索关键词筛选
        if (searchKeyword) {
            const keyword = searchKeyword.toLowerCase();
            filtered = filtered.filter(item => 
                item.productName.toLowerCase().includes(keyword) ||
                item.aggregatedData.brand?.toLowerCase().includes(keyword) ||
                item.aggregatedData.origin?.toLowerCase().includes(keyword)
            );
        }
        
        return filtered;
    }, [history, selectedBrand, searchKeyword]);

    // 按品牌分组筛选后的历史记录
    const groupedHistory = useMemo(() => {
        const groups: Record<string, UserCigarHistoryItem[]> = {};
        filteredHistory.forEach(item => {
            const brand = item.aggregatedData.brand || '其他';
            if (!groups[brand]) {
                groups[brand] = [];
            }
            groups[brand].push(item);
        });
        return groups;
    }, [filteredHistory]);

    // 滚动到指定品牌
    const scrollToBrand = (brandName: string) => {
        const element = brandRefs.current[brandName];
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
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
            display: 'flex', 
            height: !isMobile ? 'calc(100vh - 64px)' : '100%',
            background: 'transparent',
            overflow: 'hidden',
            paddingTop: !isMobile ? '100px' : 0
        }}>
            {/* 左侧品牌导航栏 */}
            {brands.length > 0 && (
                <div 
                    ref={sidebarRef}
                    className="shop-sidebar"
                    style={{
                        width: isMobile ? '80px' : '120px',
                        background: 'linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%)',
                        borderRight: '1px solid rgba(255, 215, 0, 0.1)',
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        paddingTop: '16px',
                        paddingBottom: '80px',
                        position: 'sticky',
                        top: !isMobile ? '64px' : 0,
                        height: !isMobile ? 'calc(100vh - 64px)' : '90vh'
                    }}
                >
                    {/* 全部分类 - 仅电脑端显示 */}
                    {!isMobile && (
                        <div
                            onClick={() => setSelectedBrand('all')}
                            style={{
                                padding: '16px 12px',
                                cursor: 'pointer',
                                borderLeft: selectedBrand === 'all' ? '3px solid #F4AF25' : '3px solid transparent',
                                background: selectedBrand === 'all' ? 'rgba(244, 175, 37, 0.1)' : 'transparent',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            <div style={{ textAlign: 'center' }}>
                                <div style={{
                                    width: '64px',
                                    height: '64px',
                                    margin: '0 auto 8px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #FFD700, #B8860B)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '24px',
                                    fontWeight: 'bold',
                                    color: '#000'
                                }}>
                                    🔥
                                </div>
                                <div style={{
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    color: selectedBrand === 'all' ? '#F4AF25' : '#c0c0c0',
                                    textAlign: 'center',
                                    lineHeight: 1.2
                                }}>
                                    全部
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Cuban 品牌区 */}
                    {cubanBrands.length > 0 && (
                        <div>
                            <div style={{
                                position: 'sticky',
                                top: 0,
                                zIndex: 10,
                                padding: isMobile ? '12px 8px' : '16px 12px',
                                background: 'rgba(139, 69, 19, 0.95)',
                                backdropFilter: 'blur(8px)',
                                borderLeft: '3px solid #8B4513',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                            }}>
                                <div style={{
                                    fontSize: isMobile ? '12px' : '13px',
                                    fontWeight: 'bold',
                                    color: '#F4AF25',
                                    textAlign: 'center',
                                    letterSpacing: '1px'
                                }}>
                                    CUBAN
                                </div>
                            </div>
                            {cubanBrands.map((brand) => (
                                <div
                                    key={brand.name}
                                    onClick={() => {
                                        if (isMobile) {
                                            setSelectedBrand(brand.name);
                                            scrollToBrand(brand.name);
                                        } else {
                                            setSelectedBrand(brand.name);
                                        }
                                    }}
                                    style={{
                                        padding: isMobile ? '12px 8px' : '16px 12px',
                                        cursor: 'pointer',
                                        borderLeft: selectedBrand === brand.name ? '3px solid #F4AF25' : '3px solid transparent',
                                        background: selectedBrand === brand.name ? 'rgba(244, 175, 37, 0.1)' : 'transparent',
                                        transition: 'all 0.3s ease'
                                    }}
                                >
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{
                                            width: isMobile ? '48px' : '64px',
                                            height: isMobile ? '48px' : '64px',
                                            margin: '0 auto 8px',
                                            borderRadius: '8px',
                                            backgroundImage: brand.logo ? `url(${brand.logo})` : 'none',
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center',
                                            border: '2px solid rgba(244, 175, 37, 0.6)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            {!brand.logo && (
                                                <div style={{
                                                    fontSize: isMobile ? '18px' : '24px',
                                                    fontWeight: 'bold',
                                                    color: '#FFD700'
                                                }}>
                                                    {brand.name.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        {!isMobile && (
                                            <div style={{
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                color: selectedBrand === brand.name ? '#F4AF25' : '#c0c0c0',
                                                textAlign: 'center',
                                                lineHeight: 1.2,
                                                wordBreak: 'break-word'
                                            }}>
                                                {brand.name}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* New World 品牌区 */}
                    {newWorldBrands.length > 0 && (
                        <div>
                            <div style={{
                                position: 'sticky',
                                top: 0,
                                zIndex: 10,
                                padding: isMobile ? '12px 8px' : '16px 12px',
                                background: 'rgba(34, 139, 34, 0.95)',
                                backdropFilter: 'blur(8px)',
                                borderLeft: '3px solid rgb(34, 139, 34)',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                            }}>
                                <div style={{
                                    fontSize: isMobile ? '12px' : '13px',
                                    fontWeight: 'bold',
                                    color: '#F4AF25',
                                    textAlign: 'center',
                                    letterSpacing: '1px'
                                }}>
                                    NEW WORLD
                                </div>
                            </div>
                            {newWorldBrands.map((brand) => (
                                <div
                                    key={brand.name}
                                    onClick={() => {
                                        if (isMobile) {
                                            setSelectedBrand(brand.name);
                                            scrollToBrand(brand.name);
                                        } else {
                                            setSelectedBrand(brand.name);
                                        }
                                    }}
                                    style={{
                                        padding: isMobile ? '12px 8px' : '16px 12px',
                                        cursor: 'pointer',
                                        borderLeft: selectedBrand === brand.name ? '3px solid #F4AF25' : '3px solid transparent',
                                        background: selectedBrand === brand.name ? 'rgba(244, 175, 37, 0.1)' : 'transparent',
                                        transition: 'all 0.3s ease'
                                    }}
                                >
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{
                                            width: isMobile ? '48px' : '64px',
                                            height: isMobile ? '48px' : '64px',
                                            margin: '0 auto 8px',
                                            borderRadius: '8px',
                                            backgroundImage: brand.logo ? `url(${brand.logo})` : 'none',
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center',
                                            border: '2px solid rgba(244, 175, 37, 0.6)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            {!brand.logo && (
                                                <div style={{
                                                    fontSize: isMobile ? '18px' : '24px',
                                                    fontWeight: 'bold',
                                                    color: '#FFD700'
                                                }}>
                                                    {brand.name.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        {!isMobile && (
                                            <div style={{
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                color: selectedBrand === brand.name ? '#F4AF25' : '#c0c0c0',
                                                textAlign: 'center',
                                                lineHeight: 1.2,
                                                wordBreak: 'break-word'
                                            }}>
                                                {brand.name}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* 右侧内容区域 */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                height: !isMobile ? '95vh' : '90vh'
            }}>
                {/* 顶部搜索栏 - 固定不滚动 */}
                <div style={{ 
                    flexShrink: 0,
                    padding: isMobile ? '12px' : '16px',
                    paddingBottom: '12px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <div style={{
                                position: 'absolute',
                                top: '50%',
                                left: '12px',
                                transform: 'translateY(-50%)',
                                color: 'rgba(255, 255, 255, 0.4)',
                                pointerEvents: 'none',
                                fontSize: '14px'
                            }}>
                                <SearchOutlined />
                            </div>
                            <Input
                                placeholder="搜索产品名称、品牌或产地"
                                value={searchKeyword}
                                onChange={(e) => setSearchKeyword(e.target.value)}
                                style={{
                                    width: '100%',
                                    height: '36px',
                                    paddingLeft: '36px',
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    fontSize: '14px'
                                }}
                            />
                        </div>
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={() => {
                                setSearchKeyword('');
                                setSelectedBrand('all');
                            }}
                            style={{
                                height: '36px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: 'rgba(255, 255, 255, 0.8)',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '0 12px',
                                fontSize: '14px'
                            }}
                            title="重置筛选"
                        >
                            {!isMobile && '重置'}
                        </Button>
                    </div>
                </div>

                <div style={{
                    position: 'sticky',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '30px',
                    background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.02) 100%)',
                    zIndex: 2,
                    pointerEvents: 'none',
                    marginTop: isMobile ? '-16px' : '-20px',
                    marginLeft: isMobile ? '-12px' : '-20px',
                    marginRight: isMobile ? '-12px' : '-20px'
                }} />

                {/* 历史记录滚动区域 */}
                <div 
                    className="shop-content-scroll"
                    style={{
                        flex: 1,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        padding: isMobile ? '0px 12px' : '20px',
                        paddingBottom: '100px',
                        position: 'relative',
                        zIndex: 1
                    }}
                >
                    {filteredHistory.length === 0 ? (
                        <Empty
                            description={
                                <Text style={{ color: '#999' }}>
                                    {searchKeyword || selectedBrand !== 'all' ? '没有找到匹配的记录' : '暂无识别历史记录'}
                                </Text>
                            }
                            style={{ marginTop: '60px' }}
                        />
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {Object.entries(groupedHistory).map(([brandName, items]) => (
                                <div key={brandName} ref={(el) => { brandRefs.current[brandName] = el }}>
                                    {/* 品牌标题 */}
                                    <h2 style={{
                                        fontSize: isMobile ? '18px' : '20px',
                                        fontWeight: 'bold',
                                        color: '#F4AF25',
                                        margin: '0 0 16px 0',
                                        paddingBottom: '8px',
                                        borderBottom: '2px solid rgba(244, 175, 37, 0.3)',
                                        textShadow: '0 1px 2px rgba(255, 255, 255, 0.3)'
                                    }}>
                                        {brandName}
                                    </h2>
                                    
                                    {/* 品牌下的产品列表 */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {items.map((item, index) => (
                                            <div 
                                                key={index}
                                                style={{ 
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '12px',
                                                    padding: '12px',
                                                    background: 'rgba(255, 255, 255, 0.03)',
                                                    borderRadius: '8px',
                                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                                    cursor: 'pointer',
                                                    transition: 'background 0.2s ease'
                                                }}
                                                onClick={() => {
                                                    message.info(`查看 ${item.productName} 的详细信息`);
                                                }}
                                            >
                                                {/* 产品名称 */}
                                                <Title level={5} style={{ 
                                                    margin: 0,
                                                    backgroundImage: 'linear-gradient(to right,#FDE08D,#C48D3A)',
                                                    WebkitBackgroundClip: 'text',
                                                    WebkitTextFillColor: 'transparent',
                                                    backgroundClip: 'text'
                                                }}>
                                                    {item.productName}
                                                </Title>
                                                
                                                {/* 图片和信息区域 */}
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    gap: '16px'
                                                }}>
                                                    {/* 左侧图片 */}
                                                    <div style={{ position: 'relative', flexShrink: 0 }}>
                                                        <img 
                                                            alt={item.productName}
                                                            src={DEFAULT_CIGAR_IMAGE}
                                                            style={{
                                                                width: '60px',
                                                                height: '100px',
                                                                objectFit: 'cover',
                                                                borderRadius: '8px',
                                                                border: '2px solid #B8860B'
                                                            }}
                                                        />
                                                        {item.aggregatedData.rating && (
                                                            <CigarRatingBadge rating={item.aggregatedData.rating} size="small" />
                                                        )}
                                                    </div>

                                                    {/* 右侧信息 */}
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                            {/* 产地 */}
                                                            {item.aggregatedData.origin && (
                                                                <Text style={{ color: '#9ca3af', fontSize: '12px' }}>
                                                                    {item.aggregatedData.origin}
                                                                </Text>
                                                            )}
                                                            {/* 强度 */}
                                                            {item.aggregatedData.strength && (
                                                                <Tag
                                                                    color={
                                                                        item.aggregatedData.strength === 'Full' || item.aggregatedData.strength === 'full' ? 'red' : 
                                                                        item.aggregatedData.strength === 'Medium' || item.aggregatedData.strength === 'medium' ? 'orange' : 
                                                                        'green'
                                                                    }
                                                                    style={{
                                                                        margin: 0,
                                                                        fontSize: '12px',
                                                                        padding: '0 6px',
                                                                        lineHeight: '20px',
                                                                        width: 'fit-content'
                                                                    }}
                                                                >
                                                                    {item.aggregatedData.strength}
                                                                </Tag>
                                                            )}
                                                            {/* 风味特征 */}
                                                            {item.aggregatedData.flavorProfile && item.aggregatedData.flavorProfile.length > 0 && (
                                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                                                                    {item.aggregatedData.flavorProfile.slice(0, 5).map((flavor, idx) => (
                                                                        <Tag
                                                                            key={idx}
                                                                            style={{
                                                                                margin: 0,
                                                                                fontSize: '11px',
                                                                                padding: '0 4px',
                                                                                lineHeight: '18px',
                                                                                background: 'rgba(255, 215, 0, 0.15)',
                                                                                border: '1px solid rgba(255, 215, 0, 0.3)',
                                                                                color: '#ffd700'
                                                                            }}
                                                                        >
                                                                            {flavor.value}
                                                                        </Tag>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AICigarHistory;

