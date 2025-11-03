// 商品导航页面
import React, { useEffect, useState, useRef } from 'react'
import { Input, Slider, Button } from 'antd'
import { SearchOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import type { Cigar, Brand } from '../../../types'
import { getCigars, getBrands } from '../../../services/firebase/firestore'
import { useCartStore } from '../../../store/modules'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

const Shop: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [cigars, setCigars] = useState<Cigar[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedBrand, setSelectedBrand] = useState<string>('all')
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 2000])
  const { addToCart, toggleWishlist, wishlist } = useCartStore()
  const isMobile = typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false
  const brandRefs = useRef<Record<string, HTMLDivElement | null>>({})

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
    return matchesSearch && matchesBrand && matchesPrice
  })

  // 按产地分组品牌
  const cubanBrands = brands.filter(brand => 
    brand.status === 'active' && 
    (brand.country?.toLowerCase() === 'cuba' || brand.country?.toLowerCase() === 'cuban')
  )
  const newWorldBrands = brands.filter(brand => 
    brand.status === 'active' && 
    brand.country?.toLowerCase() !== 'cuba' && 
    brand.country?.toLowerCase() !== 'cuban'
  )

  // 按品牌分组商品（手机端使用）
  const groupedCigars = filteredCigars.reduce((groups, cigar) => {
    const brand = cigar.brand || '其他'
    if (!groups[brand]) {
      groups[brand] = []
    }
    groups[brand].push(cigar)
    return groups
  }, {} as Record<string, typeof filteredCigars>)

  return (
    <div style={{ 
      display: 'flex', 
      height: '100vh',
      background: 'transparent',
      overflow: 'hidden'
    }}>
      {/* 左侧品牌导航栏 */}
      <div 
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
          top: 0,
          height: '100vh'
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
              onClick={() => {
                if (isMobile) {
                  // 手机端：滚动到该品牌位置
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
            background: 'linear-gradient(90deg, transparent 0%, rgba(244, 175, 37, 0.3) 50%, transparent 100%)',
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
              onClick={() => {
                if (isMobile) {
                  scrollToBrand(brand.name)
                } else {
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
                  border: '2px solid rgba(244, 175, 37, 0.3)'
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
        overflow: 'hidden'
      }}>
        {/* 顶部搜索栏 - 固定不滚动 */}
        <div style={{ 
          flexShrink: 0,
          padding: isMobile ? '12px' : '20px',
          paddingBottom: '16px',
          borderBottom: '2px solid rgba(255, 215, 0, 0.3)'
        }}>
          <h1 style={{ 
            fontSize: '22px', 
            fontWeight: 800, 
            background: 'linear-gradient(to right,#FDE08D,#C48D3A)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            margin: '0 0 16px 0'
          }}>
            {selectedBrand === 'all' ? '商品导航' : selectedBrand}
          </h1>
          
          <div style={{ position: 'relative' }}>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '16px',
              transform: 'translateY(-50%)',
              color: '#999999',
              pointerEvents: 'none'
            }}>
              <SearchOutlined />
            </div>
            <Input
              placeholder={t('shop.searchBrand')}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              style={{
                width: '100%',
                height: '48px',
                paddingLeft: '48px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '24px',
                color: '#fff',
                fontSize: '16px'
              }}
            />
          </div>
        </div>

        {/* 商品网格 - 独立滚动区域 */}
        <div 
          className="shop-content-scroll"
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: isMobile ? '16px 12px' : '20px',
            paddingBottom: '100px',
            position: 'relative',
            zIndex: 1
          }}
        >
          {/* 遮挡层 - 防止内容穿过粘性标题 */}
          <div style={{
            position: 'sticky',
            top: -20,
            left: 0,
            right: 0,
            height: '40px',
            background: 'linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%)',
            zIndex: 2,
            pointerEvents: 'none',
            marginLeft: isMobile ? '-12px' : '-20px',
            marginRight: isMobile ? '-12px' : '-20px',
            marginTop: isMobile ? '-16px' : '-20px'
          }} />
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
              // 手机端：按品牌分组显示
              Object.entries(groupedCigars).map(([brandName, brandCigars]) => (
                <div 
                  key={brandName}
                  ref={(el) => { brandRefs.current[brandName] = el }}
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
                    background: 'rgba(255, 215, 0, 0.95)',
                    backdropFilter: 'blur(8px)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                    borderTopLeftRadius: '16px',
                    borderTopRightRadius: '16px'
                  }}>
                    <h2 style={{
                      fontSize: '18px',
                      fontWeight: 'bold',
                      color: '#000',
                      margin: 0,
                      textShadow: '0 1px 2px rgba(255, 255, 255, 0.3)'
                    }}>
                      {brandName}
                    </h2>
                  </div>

                  {/* 品牌下的商品列表 */}
                  {brandCigars.map((cigar, index) => (
                    <React.Fragment key={cigar.id}>
                      <div 
                        style={{ 
                          display: 'flex',
                          padding: '12px',
                          cursor: 'pointer',
                          transition: 'background 0.2s ease'
                        }}
                        onClick={() => {
                          // 点击跳转到商品详情
                        }}
                      >
                        {/* 左侧图片 */}
                        <div 
                          style={{
                            width: '70px',
                            height: '70px',
                            flexShrink: 0,
                            backgroundImage: `url(${cigar.images?.[0] || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjMzMzMzMzIi8+Cjx0ZXh0IHg9IjQwIiB5PSI0MCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEwIiBmaWxsPSIjNjY2NjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Q2lnYXI8L3RleHQ+Cjwvc3ZnPgo='})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            borderRadius: '12px',
                            marginRight: '12px'
                          }}
                        />

                        {/* 右侧信息 */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <div>
                            <h3 style={{ 
                              fontSize: '15px', 
                              fontWeight: '700', 
                              color: '#fff',
                              margin: '0 0 4px 0',
                              lineHeight: '1.3',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {cigar.name}
                            </h3>
                            
                            <div style={{ 
                              fontSize: '12px', 
                              color: '#999'
                            }}>
                              {cigar.origin} · {cigar.size}
                            </div>
                          </div>

                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: '8px'
                          }}>
                            <div style={{ 
                              fontSize: '18px', 
                              color: '#F4AF25',
                              fontWeight: 'bold'
                            }}>
                              RM {cigar.price}
                            </div>
                            
                            <Button
                              type="primary"
                              size="small"
                              style={{
                                background: 'linear-gradient(to right, #FDE08D, #C48D3A)',
                                border: 'none',
                                borderRadius: '20px',
                                fontSize: '12px',
                                fontWeight: '600',
                                color: '#000',
                                padding: '6px 20px',
                                height: 'auto'
                              }}
                              onClick={(e) => {
                                e.stopPropagation()
                                addToCart(cigar.id)
                              }}
                            >
                              +
                            </Button>
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
                  ))}
                </div>
              ))
            ) : (
              // 电脑端：网格布局
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(5, 1fr)', 
                gap: '16px'
              }}>
                {filteredCigars.map((cigar) => (
              <div 
                key={cigar.id} 
                style={{ 
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = '0 12px 30px rgba(244, 175, 37, 0.25)'
                  e.currentTarget.style.borderColor = 'rgba(244, 175, 37, 0.3)'
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
                    width: '100%',
                    aspectRatio: '1',
                    backgroundImage: `url(${cigar.images?.[0] || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjMzMzMzMzIi8+Cjx0ZXh0IHg9IjQwIiB5PSI0MCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEwIiBmaWxsPSIjNjY2NjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Q2lnYXI8L3RleHQ+Cjwvc3ZnPgo='})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    position: 'relative'
                  }}
                >
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
                <div style={{ padding: '12px' }}>
                  <h3 style={{ 
                    fontSize: isMobile ? '13px' : '14px', 
                    fontWeight: '700', 
                    color: '#fff',
                    margin: '0 0 6px 0',
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
                  
                  <div style={{ 
                    fontSize: '11px', 
                    color: '#999',
                    marginBottom: '8px'
                  }}>
                    {cigar.origin} · {cigar.size}
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ 
                      fontSize: isMobile ? '16px' : '18px', 
                      color: '#F4AF25',
                      fontWeight: 'bold'
                    }}>
                      RM {cigar.price}
                    </div>
                    
                    <Button
                      type="primary"
                      size="small"
                      style={{
                        background: 'linear-gradient(to right, #FDE08D, #C48D3A)',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: '600',
                        color: '#000',
                        padding: '4px 12px',
                        height: 'auto'
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        addToCart(cigar.id)
                      }}
                    >
                      +
                    </Button>
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
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
              <div style={{ fontSize: '16px', color: '#c0c0c0' }}>
                {searchKeyword ? '未找到匹配的商品' : '暂无商品数据'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Shop