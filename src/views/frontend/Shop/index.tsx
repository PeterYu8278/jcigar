// 商品导航页面
import React, { useEffect, useState, useRef } from 'react'
import { Input, Slider, Button, Typography, Modal, Tag } from 'antd'
import { SearchOutlined, ArrowLeftOutlined, ShoppingCartOutlined, ReloadOutlined } from '@ant-design/icons'
import type { Cigar, Brand } from '../../../types'
import { getCigars, getBrands } from '../../../services/firebase/firestore'
import { useCartStore } from '../../../store/modules'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { CartModal } from '../../../components/common/CartModal'
import { getModalThemeStyles } from '../../../config/modalTheme'
import { CigarRatingBadge } from '../../../components/common/CigarRatingBadge'

const { Title, Text } = Typography

const DEFAULT_CIGAR_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjMzMzMzMzIi8+Cjx0ZXh0IHg9IjQwIiB5PSI0MCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjY2NjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Q2lnYXI8L3RleHQ+Cjwvc3ZnPgo='

const Shop: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [cigars, setCigars] = useState<Cigar[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [confirmRemove, setConfirmRemove] = useState<{
    visible: boolean
    itemId: string | null
    itemName: string | null
  }>({
    visible: false,
    itemId: null,
    itemName: null
  })
  const [loading, setLoading] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedBrand, setSelectedBrand] = useState<string>('all')
  const [selectedStrength, setSelectedStrength] = useState<string | null>(null)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 2000])
  const [cartModalVisible, setCartModalVisible] = useState(false)
  const { addToCart, toggleWishlist, wishlist, quantities, setQuantity, removeFromCart, clearCart } = useCartStore()
  const isMobile = typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false
  const brandRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const brandNavRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const sidebarRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const [cigarsData, brandsData] = await Promise.all([
          getCigars(),
          getBrands()
        ])
        setCigars(cigarsData)
        setBrands(brandsData)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // 滚动监听：自动更新高亮品牌
  useEffect(() => {
    if (!isMobile) return // 仅手机端启用

    // 延迟初始化，确保所有品牌卡片都已渲染
    const timer = setTimeout(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          // 找到可见度最高的品牌卡片
          let maxRatio = 0
          let topBrand = ''
          
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
              const brandName = entry.target.getAttribute('data-brand')
              if (brandName) {
                maxRatio = entry.intersectionRatio
                topBrand = brandName
              }
            }
          })
          
          // 只更新可见度最高的品牌
          if (topBrand && maxRatio > 0.1) {
            setSelectedBrand(topBrand)
            // 同时滚动左侧品牌导航栏到对应位置
            const navElement = brandNavRefs.current[topBrand]
            const sidebar = sidebarRef.current
            if (navElement && sidebar) {
              const sidebarRect = sidebar.getBoundingClientRect()
              const navRect = navElement.getBoundingClientRect()
              const scrollOffset = navRect.top - sidebarRect.top - (sidebarRect.height / 2) + (navRect.height / 2)
              
              sidebar.scrollTo({
                top: sidebar.scrollTop + scrollOffset,
                behavior: 'smooth'
              })
            }
          }
        },
        {
          threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
          rootMargin: '-100px 0px -40% 0px' // 顶部留空，监听上半部分
        }
      )

      // 监听所有品牌卡片
      Object.values(brandRefs.current).forEach((ref) => {
        if (ref) observer.observe(ref)
      })

      return () => {
        observer.disconnect()
      }
    }, 100)

    return () => {
      clearTimeout(timer)
    }
  }, [isMobile, cigars])

  // 滚动到指定品牌
  const scrollToBrand = (brandName: string) => {
    const element = brandRefs.current[brandName]
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // 筛选后的商品
  const filteredCigars = cigars.filter(cigar => {
    const matchesSearch = !searchKeyword || 
      cigar.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      cigar.brand?.toLowerCase().includes(searchKeyword.toLowerCase())
    // 手机端不按品牌筛选，电脑端筛选
    const matchesBrand = isMobile || selectedBrand === 'all' || cigar.brand === selectedBrand
    const matchesPrice = cigar.price >= priceRange[0] && cigar.price <= priceRange[1]
    const matchesStrength = !selectedStrength || cigar.strength === selectedStrength
    const matchesSize = !selectedSize || cigar.size === selectedSize
    return matchesSearch && matchesBrand && matchesPrice && matchesStrength && matchesSize
  })

  // 按产地分组品牌并排序 A-Z（仅显示有商品的品牌）
  const cubanBrands = brands
    .filter(brand => 
      brand.status === 'active' && 
      (brand.country?.toLowerCase() === 'cuba' || brand.country?.toLowerCase() === 'cuban') &&
      cigars.some(cigar => cigar.brand === brand.name)  // 确保该品牌有商品
    )
    .sort((a, b) => a.name.localeCompare(b.name))
  
  const newWorldBrands = brands
    .filter(brand => 
      brand.status === 'active' && 
      brand.country?.toLowerCase() !== 'cuba' && 
      brand.country?.toLowerCase() !== 'cuban' &&
      cigars.some(cigar => cigar.brand === brand.name)  // 确保该品牌有商品
    )
    .sort((a, b) => a.name.localeCompare(b.name))

  // 按品牌分组商品（手机端使用）并按 Cuban > New World, A-Z 排序
  const groupedCigars = filteredCigars.reduce((groups, cigar) => {
    const brand = cigar.brand || '其他'
    if (!groups[brand]) {
      groups[brand] = []
    }
    groups[brand].push(cigar)
    return groups
  }, {} as Record<string, typeof filteredCigars>)

  // 排序：Cuban 品牌 A-Z，然后 New World 品牌 A-Z
  const sortedGroupedCigars = Object.entries(groupedCigars).sort(([brandA], [brandB]) => {
    const isCubanA = cubanBrands.some(b => b.name === brandA)
    const isCubanB = cubanBrands.some(b => b.name === brandB)
    
    // Cuban 品牌排在前面
    if (isCubanA && !isCubanB) return -1
    if (!isCubanA && isCubanB) return 1
    
    // 同类品牌按 A-Z 排序
    return brandA.localeCompare(brandB)
  })

  // 电脑端产品排序：按品牌导航顺序排序，然后按产品名称字母排序
  const sortedCigarsForDesktop = !isMobile ? (() => {
    // 创建品牌顺序映射：Cuban 品牌优先，然后 New World 品牌，都按 A-Z 排序
    const allBrandsInOrder = [...cubanBrands, ...newWorldBrands]
    const brandOrderMap = new Map<string, number>()
    allBrandsInOrder.forEach((brand, index) => {
      brandOrderMap.set(brand.name, index)
    })

    return [...filteredCigars].sort((a, b) => {
      const brandA = a.brand || ''
      const brandB = b.brand || ''
      
      // 获取品牌在导航中的顺序
      const orderA = brandOrderMap.get(brandA) ?? 9999
      const orderB = brandOrderMap.get(brandB) ?? 9999
      
      // 先按品牌顺序排序
      if (orderA !== orderB) {
        return orderA - orderB
      }
      
      // 如果品牌相同，按产品名称字母排序
      return a.name.localeCompare(b.name)
    })
  })() : filteredCigars

  // 计算购物车总数量和总价
  const cartItemCount = Object.values(quantities).reduce((sum, qty) => sum + qty, 0)
  const cartTotal = Object.entries(quantities).reduce((sum, [id, qty]) => {
    const cigar = cigars.find(c => c.id === id)
    return sum + (cigar ? cigar.price * qty : 0)
  }, 0)

  // 购物车商品列表
  const cartItems = Object.entries(quantities).map(([id, qty]) => {
    const cigar = cigars.find(c => c.id === id)
    return cigar ? { ...cigar, quantity: qty } : null
  }).filter(Boolean) as (Cigar & { quantity: number })[]

  return (
    <div style={{ 
      display: 'flex', 
      height: !isMobile ? 'calc(100vh - 64px)' : '100%',
      background: 'transparent',
      overflow: 'hidden',
      paddingTop: !isMobile ? '100px' : 0
    }}>
      {/* 左侧品牌导航栏 */}
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
            {/* Cuban 标题 - 粘性定位 */}
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

            {/* Cuban 品牌列表 */}
            {cubanBrands.map((brand) => (
            <div
              key={brand.id}
              ref={(el) => { brandNavRefs.current[brand.name] = el }}
              onClick={() => {
                if (isMobile) {
                  // 手机端：滚动到该品牌位置并设置高亮
                  setSelectedBrand(brand.name)
                  scrollToBrand(brand.name)
                } else {
                  // 电脑端：筛选商品
                  setSelectedBrand(brand.name)
                }
              }}
              style={{
                padding: isMobile ? '12px 8px' : '16px 12px',
                cursor: 'pointer',
                borderLeft: selectedBrand === brand.name ? '3px solid #F4AF25' : '3px solid transparent',
                background: selectedBrand === brand.name ? 'rgba(244, 175, 37, 0.1)' : 'transparent',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                if (selectedBrand !== brand.name) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                }
              }}
              onMouseLeave={(e) => {
                if (selectedBrand !== brand.name) {
                  e.currentTarget.style.background = 'transparent'
                }
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: isMobile ? '48px' : '64px',
                  height: isMobile ? '48px' : '64px',
                  margin: '0 auto 8px',
                  borderRadius: '50%',
                  background: 'rgba(30,30,30,0.7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `2px solid ${selectedBrand === brand.name ? '#F4AF25' : 'rgba(255,215,0,0.2)'}`,
                  overflow: 'hidden'
                }}>
                  {brand.logo ? (
                    <img 
                      src={brand.logo} 
                      alt={brand.name} 
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                    />
                  ) : (
                    <div style={{
                      fontSize: isMobile ? '18px' : '24px',
                      fontWeight: 'bold',
                      color: '#FFD700'
                    }}>
                      {brand.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div style={{
                  fontSize: isMobile ? '10px' : '11px',
                  fontWeight: 600,
                  color: selectedBrand === brand.name ? '#F4AF25' : '#c0c0c0',
                  textAlign: 'center',
                  lineHeight: 1.2,
                  wordWrap: 'break-word',
                  maxWidth: '100%'
                }}>
                  {brand.name}
                </div>
              </div>
            </div>
          ))}
          </div>
        )}

        {/* 分割线 */}
        {cubanBrands.length > 0 && newWorldBrands.length > 0 && (
          <div style={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent 0%, rgba(244, 175, 37, 0.6) 50%, transparent 100%)',
            margin: isMobile ? '8px 0' : '12px 0'
          }} />
        )}

        {/* New World 品牌区 */}
        {newWorldBrands.length > 0 && (
    <div>
            {/* New World 标题 - 粘性定位 */}
            <div style={{
              position: 'sticky',
              top: 0,
              zIndex: 10,
              padding: isMobile ? '12px 8px' : '16px 12px',
              background: 'rgba(34, 139, 34, 0.95)',
              backdropFilter: 'blur(8px)',
              borderLeft: '3px solid #228B22',
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

            {/* New World 品牌列表 */}
            {newWorldBrands.map((brand) => (
            <div
              key={brand.id}
              ref={(el) => { brandNavRefs.current[brand.name] = el }}
              onClick={() => {
                if (isMobile) {
                  // 手机端：滚动到该品牌位置并设置高亮
                  setSelectedBrand(brand.name)
                  scrollToBrand(brand.name)
                } else {
                  // 电脑端：筛选商品
                  setSelectedBrand(brand.name)
                }
              }}
              style={{
                padding: isMobile ? '12px 8px' : '16px 12px',
                cursor: 'pointer',
                borderLeft: selectedBrand === brand.name ? '3px solid #F4AF25' : '3px solid transparent',
                background: selectedBrand === brand.name ? 'rgba(244, 175, 37, 0.1)' : 'transparent',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                if (selectedBrand !== brand.name) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                }
              }}
              onMouseLeave={(e) => {
                if (selectedBrand !== brand.name) {
                  e.currentTarget.style.background = 'transparent'
                }
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: isMobile ? '48px' : '64px',
                  height: isMobile ? '48px' : '64px',
                  margin: '0 auto 8px',
                  borderRadius: '50%',
                  backgroundImage: brand.logo ? `url(${brand.logo})` : 'none',
                  backgroundColor: brand.logo ? 'transparent' : 'rgba(255, 255, 255, 0.05)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: isMobile ? '18px' : '24px',
                  fontWeight: 'bold',
                  color: brand.logo ? 'transparent' : '#F4AF25',
                  border: '2px solid rgba(244, 175, 37, 0.6)'
                }}>
                  {!brand.logo && brand.name.charAt(0)}
                </div>
                <div style={{
                  fontSize: isMobile ? '11px' : '12px',
                  fontWeight: 600,
                  color: selectedBrand === brand.name ? '#F4AF25' : '#c0c0c0',
                  textAlign: 'center',
                  lineHeight: 1.2
                }}>
                  {brand.name}
                </div>
              </div>
            </div>
          ))}
          </div>
        )}
      </div>

      {/* 右侧商品展示区域 */}
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
              placeholder={t('shop.searchBrand')}
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
              setSearchKeyword('')
              setSelectedBrand('all')
              setSelectedStrength(null)
              setSelectedSize(null)
              setPriceRange([0, 2000])
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
            background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.02) 100%',
            zIndex: 2,
            pointerEvents: 'none',
            marginTop: isMobile ? '-16px' : '-20px',
            marginLeft: isMobile ? '-12px' : '-20px',
            marginRight: isMobile ? '-12px' : '-20px'
          }} />

        {/* 商品网格 - 独立滚动区域 */}
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
          
          {loading ? (
        <div style={{ 
              textAlign: 'center', 
              padding: '48px 24px', 
              color: '#9ca3af' 
            }}>
              加载中...
            </div>
          ) : filteredCigars.length > 0 ? (
            isMobile ? (
              // 手机端：按品牌分组显示（Cuban A-Z > New World A-Z）
              sortedGroupedCigars.map(([brandName, brandCigars]) => (
                <div 
                  key={brandName}
                  ref={(el) => { brandRefs.current[brandName] = el }}
                  data-brand={brandName}
              style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    marginBottom: '16px',
                    overflow: 'visible',
                    scrollMarginTop: '20px'
                  }}
                >
                  {/* 品牌标题 - 粘性定位 */}
      <div style={{ 
                    position: 'sticky',
                    top: 0,
                    zIndex: 5,
                    padding: '8px 16px',
                    borderBottom: '1px solid rgba(255, 215, 0, 0.3)',
                    background: 'linear-gradient(to right, rgb(253, 224, 141), rgb(196, 141, 58))',
                    backdropFilter: 'blur(8px)',
                    
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                    borderTopLeftRadius: '16px',
                    borderTopRightRadius: '16px'
                  }}>
                    <h2 style={{
                      fontSize: '16px',
            fontWeight: 'bold', 
                      color: '#000',
            margin: 0,
                      textShadow: '0 1px 2px rgba(255, 255, 255, 0.3)'
          }}>
                      {brandName}
                    </h2>
                    </div>
                    
                  {/* 品牌下的商品列表 */}
                  {brandCigars.map((cigar, index) => {
                    // 获取风味特征（合并所有品吸笔记）
                    const flavorNotes = cigar.tastingNotes 
                      ? [
                          ...(cigar.tastingNotes.foot || []),
                          ...(cigar.tastingNotes.body || []),
                          ...(cigar.tastingNotes.head || [])
                        ].filter(Boolean)
                      : [];
                    
                    // 强度翻译
                    const strengthMap: Record<string, string> = {
                      'mild': t('shop.mild') || '温和',
                      'mild-medium': t('shop.mildMedium') || '温和-中等',
                      'medium': t('shop.medium') || '中等',
                      'medium-full': t('shop.mediumFull') || '中等-浓郁',
                      'full': t('shop.full') || '浓郁'
                    };

                    return (
                    <React.Fragment key={cigar.id}>
                      <div 
                        style={{ 
                          display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                          padding: '12px',
                          cursor: 'pointer',
                          transition: 'background 0.2s ease'
                        }}
                        onClick={() => {
                          // 点击跳转到商品详情
                        }}
                      >
                          {/* 产品名称 */}
                          <Title level={5} style={{ color: '#ffffff', margin: 0 }}>
                            {cigar.name}
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
                                alt={cigar.name}
                                src={cigar.images?.[0] || DEFAULT_CIGAR_IMAGE}
                                style={{
                                  width: '60px',
                                  height: '100px',
                                  objectFit: 'cover',
                                  borderRadius: '8px',
                                  border: '2px solid #B8860B'
                                }}
                              />
                              <CigarRatingBadge rating={cigar.metadata?.rating} size="small" />
                            </div>

                        {/* 右侧信息 */}
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {/* 产地 */}
                                {cigar.origin && (
                                  <Text style={{ color: '#9ca3af', fontSize: '12px' }}>
                                    {cigar.origin}
                                  </Text>
                                )}
                                {/* 规格和强度同排 */}
                                {(cigar.size || cigar.strength) && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {cigar.size && (
                                      <Tag
                                        color="blue"
                                        style={{
                                          margin: 0,
                                          cursor: 'pointer',
                                          fontSize: '12px',
                                          padding: '0 6px',
                                          lineHeight: '20px',
                                          border: selectedSize === cigar.size ? '2px solid #f4af25' : 'none',
                                          boxShadow: selectedSize === cigar.size ? '0 0 8px rgba(244, 175, 37, 0.5)' : 'none',
                                          transition: 'all 0.2s ease'
                                        }}
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          if (selectedSize === cigar.size) {
                                            setSelectedSize(null)
                                          } else {
                                            setSelectedSize(cigar.size)
                                          }
                                        }}
                                      >
                                        {cigar.size}
                                      </Tag>
                                    )}
                                    {cigar.size && cigar.strength && (
                                      <Text style={{ color: '#9ca3af', fontSize: '12px' }}>•</Text>
                                    )}
                                    {cigar.strength && (
                                      <Tag
                                        color={(() => {
                                          const strengthColors: Record<string, string> = {
                                            'mild': 'green',
                                            'mild-medium': 'lime',
                                            'medium': 'orange',
                                            'medium-full': 'volcano',
                                            'full': 'red'
                                          }
                                          return strengthColors[cigar.strength] || 'default'
                                        })()}
                                        style={{
                                          margin: 0,
                                          cursor: 'pointer',
                                          fontSize: '12px',
                                          padding: '0 6px',
                                          lineHeight: '20px',
                                          border: selectedStrength === cigar.strength ? '2px solid #f4af25' : 'none',
                                          boxShadow: selectedStrength === cigar.strength ? '0 0 8px rgba(244, 175, 37, 0.5)' : 'none',
                                          transition: 'all 0.2s ease'
                                        }}
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          if (selectedStrength === cigar.strength) {
                                            setSelectedStrength(null)
                                          } else {
                                            setSelectedStrength(cigar.strength)
                                          }
                                        }}
                                      >
                                        {strengthMap[cigar.strength] || cigar.strength}
                                      </Tag>
                                    )}
        </div>
                                )}
                                {/* 风味特征 */}
                                {flavorNotes.length > 0 && (
                                  <Text style={{ color: '#9ca3af', fontSize: '12px' }}>
                                    {flavorNotes.join('、')}
                                  </Text>
                                )}
                    </div>
                    
                              {/* 价格和数量控制器 */}
                          <div style={{
          display: 'flex',
          alignItems: 'center',
                                justifyContent: 'space-between',
                            marginTop: '8px'
        }}>
                                <div style={{ color: '#FFD700', fontWeight: 'bold' }}>
                                  RM{cigar.price || 0}
                                </div>
                            <div style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '4px',
                                  border: '1px solid rgba(255, 215, 0, 0.3)',
                                  borderRadius: '6px',
                                  padding: '2px 4px'
                                }}>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      const currentQty = quantities[cigar.id] || 0
                                      if (currentQty > 1) {
                                        setQuantity(cigar.id, currentQty - 1)
                                      } else if (currentQty === 1) {
                                        // 当数量为1时，点击减号提示确认移除
                                        setConfirmRemove({
                                          visible: true,
                                          itemId: cigar.id,
                                          itemName: cigar.name
                                        })
                                      }
                                    }}
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      color: '#FFD700',
                                      cursor: 'pointer',
                                      padding: '4px 8px',
                                      fontSize: '16px',
                                      lineHeight: 1,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      minWidth: '24px',
                                      height: '24px'
                                    }}
                                  >
                                    −
                                  </button>
                                  <span style={{ 
                                    color: '#ffffff', 
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    minWidth: '24px', 
                                    textAlign: 'center',
                                    lineHeight: '24px'
                            }}>
                                    {quantities[cigar.id] || 0}
                                  </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                addToCart(cigar.id)
                              }}
                              style={{
                                      background: 'transparent',
                                      border: 'none',
                                      color: '#FFD700',
                                cursor: 'pointer',
                                      padding: '4px 8px',
                                      fontSize: '16px',
                                      lineHeight: 1,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      minWidth: '24px',
                                      height: '24px'
                              }}
                            >
                              +
                            </button>
                                </div>
                              </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* 分割线（最后一个商品不显示） */}
                      {index < brandCigars.length - 1 && (
                        <div style={{
                          height: '1px',
                          background: 'linear-gradient(90deg, transparent 0%, rgba(255, 215, 0, 0.2) 50%, transparent 100%)',
                          margin: '0 12px'
                        }} />
                      )}
                    </React.Fragment>
                    );
                  })}
                </div>
              ))
            ) : (
              // 电脑端：网格布局
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(8, 1fr)', 
          gridAutoRows: '1fr',
          gap: '16px',
          alignItems: 'stretch'
        }}>
                {sortedCigarsForDesktop.map((cigar) => (
              <div 
                key={cigar.id} 
                style={{ 
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  overflow: 'visible',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  width: '100%',
                  minWidth: 0
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = '0 12px 30px rgba(244, 175, 37, 0.25)'
                  e.currentTarget.style.borderColor = 'rgba(244, 175, 37, 0.6)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                }}
              >
                {/* 商品图片 */}
                <div 
                  style={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '1',
                    backgroundImage: `url(${cigar.images?.[0] || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjMzMzMzMzIi8+Cjx0ZXh0IHg9IjQwIiB5PSI0MCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEwIiBmaWxsPSIjNjY2NjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Q2lnYXI8L3RleHQ+Cjwvc3ZnPgo='})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    overflow: 'visible',
                    borderRadius: '16px 16px 0 0',
                    flexShrink: 0
                  }}
                >
                  <CigarRatingBadge rating={cigar.metadata?.rating} size="medium" />
                  {/* 品牌标签 */}
                    <div style={{ 
                    position: 'absolute',
                    top: '8px',
                    left: '8px',
                    background: 'rgba(244, 175, 37, 0.9)',
                    backdropFilter: 'blur(4px)',
                      color: '#000',
                    fontSize: '10px',
                      fontWeight: 'bold',
                    padding: '4px 8px',
                    borderRadius: '12px'
                    }}>
                    {cigar.brand}
                    </div>
                </div>

                {/* 商品信息 */}
                <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: 0, width: '100%' }}>
                  {/* 第一行：产品名称 */}
                  <h3 style={{ 
                    fontSize: '16px', 
                    fontWeight: '700', 
                    color: '#fff',
                    margin: 0,
                    lineHeight: '1.3',
                    minHeight: '36px',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {cigar.name}
                  </h3>
                  
                  {/* 第二行：产地 */}
                  {cigar.origin && (
                    <div style={{ 
                      fontSize: '11px', 
                      color: '#999',
                      lineHeight: '1.4'
                    }}>
                      {cigar.origin}
                    </div>
                  )}

                  {/* 第三行：规格和强度tag */}
                  {(cigar.size || cigar.strength) && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {cigar.size && (
                        <Tag
                          color="blue"
                          style={{
                            margin: 0,
                            cursor: 'pointer',
                            fontSize: '11px',
                            padding: '0 6px',
                            lineHeight: '18px',
                            border: selectedSize === cigar.size ? '2px solid #f4af25' : 'none',
                            boxShadow: selectedSize === cigar.size ? '0 0 8px rgba(244, 175, 37, 0.5)' : 'none',
                            transition: 'all 0.2s ease'
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (selectedSize === cigar.size) {
                              setSelectedSize(null)
                            } else {
                              setSelectedSize(cigar.size)
                            }
                          }}
                        >
                          {cigar.size}
                        </Tag>
                      )}
                      {cigar.strength && (
                        <Tag
                          color={(() => {
                            const strengthColors: Record<string, string> = {
                              'mild': 'green',
                              'mild-medium': 'lime',
                              'medium': 'orange',
                              'medium-full': 'volcano',
                              'full': 'red'
                            }
                            return strengthColors[cigar.strength] || 'default'
                          })()}
                          style={{
                            margin: 0,
                            cursor: 'pointer',
                            fontSize: '11px',
                            padding: '0 6px',
                            lineHeight: '18px',
                            border: selectedStrength === cigar.strength ? '2px solid #f4af25' : 'none',
                            boxShadow: selectedStrength === cigar.strength ? '0 0 8px rgba(244, 175, 37, 0.5)' : 'none',
                            transition: 'all 0.2s ease'
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (selectedStrength === cigar.strength) {
                              setSelectedStrength(null)
                            } else {
                              setSelectedStrength(cigar.strength)
                            }
                          }}
                        >
                          {(() => {
                            const strengthMap: Record<string, string> = {
                              'mild': t('shop.mild') || '温和',
                              'mild-medium': t('shop.mildMedium') || '温和-中等',
                              'medium': t('shop.medium') || '中等',
                              'medium-full': t('shop.mediumFull') || '中等-浓郁',
                              'full': t('shop.full') || '浓郁'
                            }
                            return strengthMap[cigar.strength] || cigar.strength
                          })()}
                        </Tag>
                      )}
                    </div>
                  )}

                  {/* 第四行：风味特征 */}
                  {(() => {
                    const flavorNotes = cigar.tastingNotes 
                      ? [
                          ...(cigar.tastingNotes.foot || []),
                          ...(cigar.tastingNotes.body || []),
                          ...(cigar.tastingNotes.head || [])
                        ].filter(Boolean)
                      : [];
                    const flavorProfile = cigar.metadata?.tags || [];
                    const allFlavors = [...new Set([...flavorNotes, ...flavorProfile])].slice(0, 3);
                    
                    if (allFlavors.length > 0) {
                      return (
                        <div style={{ 
                          fontSize: '10px', 
                          color: 'rgba(255, 255, 255, 0.6)',
                          lineHeight: '1.4'
                        }}>
                          {allFlavors.join(' · ')}
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* 第五行：价格和按钮 */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: 'auto'
                  }}>
                    <div style={{ 
                      fontSize: '18px', 
                      color: '#F4AF25',
                      fontWeight: 'bold'
                    }}>
                      RM {cigar.price}
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        addToCart(cigar.id)
                      }}
                      style={{
                        padding: '4px 12px',
                        borderRadius: 8,
                        background: 'linear-gradient(to right, #FDE08D, #C48D3A)',
                        color: '#221c10',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        border: 'none',
                        fontSize: '11px'
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div style={{ 
              textAlign: 'center', 
              padding: '48px 24px', 
              color: '#9ca3af' 
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}></div>
              <div style={{ fontSize: '16px', color: '#c0c0c0' }}>
                {searchKeyword ? '未找到匹配的商品' : '暂无商品数据'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 底部购物车操作栏 - 仅手机端显示 */}
      {isMobile && (
        <div style={{
          position: 'fixed',
          bottom: '60px',
          left: 0,
          right: 0,
          padding: '12px 16px',
          zIndex: 100,
          pointerEvents: 'none'
        }}>
          {cartItemCount === 0 ? (
            // 空状态：显示购物车图标按钮
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              pointerEvents: 'auto'
            }}>
              <Button
                style={{
                  background: 'rgba(100, 100, 100, 0.8)',
                  backdropFilter: 'blur(8px)',
                  border: 'none',
                  borderRadius: '24px',
                  padding: '12px 24px',
                  height: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                }}
                onClick={() => setCartModalVisible(true)}
              >
                <ShoppingCartOutlined style={{ fontSize: '18px', color: '#fff' }} />
                <span style={{ color: '#fff', fontSize: '14px', fontWeight: '600' }}>
                  0 item
                </span>
              </Button>
            </div>
          ) : (
            // 有商品状态：显示完整购物车底栏
            <button
              onClick={() => setCartModalVisible(true)}
              style={{
                padding: '16px 20px',
                borderRadius: 16,
                background: 'linear-gradient(to right, #FDE08D, #C48D3A)',
                color: '#221c10',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                width: '100%',
                boxShadow: '0 8px 24px rgba(244, 175, 37, 0.6)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                pointerEvents: 'auto'
              }}
            >
              {/* 左侧：购物车图标和数量 */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <ShoppingCartOutlined style={{ fontSize: '24px' }} />
                <span style={{ fontSize: '16px', fontWeight: '600' }}>
                  {cartItemCount} {cartItemCount === 1 ? 'item' : 'items'}
                </span>
              </div>

              {/* 右侧：总价 */}
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                RM {cartTotal.toFixed(2)}
              </div>
            </button>
          )}
        </div>
      )}

      {/* 购物车弹窗 */}
      <CartModal
        open={cartModalVisible}
        onClose={() => setCartModalVisible(false)}
        cartItems={cartItems}
        quantities={quantities}
        cartItemCount={cartItemCount}
        cartTotal={cartTotal}
        setQuantity={setQuantity}
        addToCart={addToCart}
        removeFromCart={removeFromCart}
        isMobile={isMobile}
        t={t}
                    />

      {/* 确认移除对话框 */}
      <Modal
        title="确认移除商品？"
        open={confirmRemove.visible}
        onOk={() => {
          if (confirmRemove.itemId) {
            removeFromCart(confirmRemove.itemId)
          }
          setConfirmRemove({ visible: false, itemId: null, itemName: null })
        }}
        onCancel={() => {
          setConfirmRemove({ visible: false, itemId: null, itemName: null })
        }}
        okText="确认"
        cancelText="取消"
        centered
        zIndex={3000}
        okButtonProps={{
          style: {
                  background: 'linear-gradient(135deg, #FDE08D 0%, #C48D3A 100%)',
                  border: 'none',
                  color: '#000',
                  fontWeight: 'bold'
          }
        }}
        cancelButtonProps={{
          style: {
            border: '1px solid rgba(244, 175, 37, 0.6)',
            background: 'rgba(255, 255, 255, 0.1)',
            color: '#ffffff'
          }
        }}
        styles={{
          ...getModalThemeStyles(isMobile, true),
          mask: {
            ...(getModalThemeStyles(isMobile, true)?.mask || {}),
            zIndex: 2999
          },
          wrapper: {
            zIndex: 3000
          }
        }}
        getContainer={document.body}
      >
        <p style={{ 
          color: '#FFFFFF', 
          fontSize: '14px',
          margin: 0,
          lineHeight: '1.6'
        }}>
          确定要从购物车中移除 <span style={{ color: '#F4AF25', fontWeight: '600' }}>"{confirmRemove.itemName}"</span> 吗？
        </p>
      </Modal>
    </div>
  )
}

export default Shop
