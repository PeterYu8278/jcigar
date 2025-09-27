// 商品导航页面
import React, { useEffect, useState } from 'react'
import { Input, Slider, Button } from 'antd'
import { SearchOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import type { Cigar } from '../../../types'
import { getCigars } from '../../../services/firebase/firestore'
import { useCartStore } from '../../../store/modules'
import { useTranslation } from 'react-i18next'

const Shop: React.FC = () => {
  const { t } = useTranslation()
  const [cigars, setCigars] = useState<Cigar[]>([])
  const [loading, setLoading] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedOrigin, setSelectedOrigin] = useState<string>('all')
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 2000])
  const { addToCart, toggleWishlist, wishlist } = useCartStore()

  // 模拟品牌数据
  const brands = [
    { name: '高希霸', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD5U3YWRN9U_FnZlD21Pbr1z7Kx8TyoxlAnRhsv7owHVccijOYispFy3NctN-GkuurV7dyuCmqbYl2Iq3CpxxIzytn45ivoXx0bPAzyA5o0JCVJIhAvPWRLiGyQdqT8PnKXj2KH0BB96lRKS8n_ySqgrqfjc5imdMlup87f7kcIuxgnmeBcyd9D_BP705iuNuOazDdlG2qWdmFpcUMUdwP0zKLm0V5LH2UlVu_9sPxu7UkyuA-WVWZJcbm51q1gAfpwp8KqZdp1wsum' },
    { name: '帕特加斯', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAVxTqQ_vxWedDMP1rHNwO1cghrNZ8HEHYndornNjCxn7QTEGjQO8Rwg3xfTRsrM3igTul1nVhBzj5ha6KIxf4bZa9xeOmUt5xYnKhGVdGG9_e0sFxJONlOqyHiSaPgA4g99m8PtJtJq43kdA7CsgpKtZoI6YLjQ41posmck8nx3BwtvWsdqnhgY_EqcFcFO2Nrx8Uqjvcbq2YvE9l7ipViQ2fhZxzYX_tM-pMeb5XepY-CbK89E-fuCMUlymS9G7SwtWxwlcAWNl9v' },
    { name: '蒙特', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC1cnMzOnfdcLNTIvHy_Z1cWGtbuG5pBtHah1Wwe8vnOcyZmFchdGcSvKdZDlEFPuOa4bnNcRMzaez5alPKPtYSTJF1NceQe9k330eN6Pl9Jal7KKlj-QEUuHjN2dv4g73U_F4h_rIYxq3jJXcN8eLW9cOoqaHur_RtNFai9gkhBCdUEHXOF18cnTWKwuX-_UdFUqfUY1dczia4Cx_k9EQ4AWTYAmSDBF4FDmg2Y8qLHcaSvLto4tVXix5stvDUXu2fmA6Cl7zNv1ED' },
    { name: '罗密欧', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCPqb_54lH7IpgHd-RyQbMP-ndgPFezhGzlyYlh_HZ0UuqMb-RtABL4IbGol6LUhWML5ZvTY1TGHOpz1XO8lI4WLdv1TcACVwgYSJnVqTt_dENqF3LsWgTycm8yZ8CmOrRXAniWdgCOVwhWYu-pAuMj8uEgxavcz5eOAyszXGKmgvwB5tuf6NzPXvqezc7tAV82aM-SBHtX0kgtQoz1HUKkV3WEZP8K396YhbvCUVyXL0wnNH7FPDuJ0T1Exc9jLvc-7tL4wVZE5ZW5' },
  ]

  const popularBrands = [
    { name: '大卫杜夫', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA99NXqQIaZcE01uYreqBKNCT1SF19tUldv7EGPSuBlt1rZdg262yMh4znuy6Qm9Up-SY6_80bHOCDVy25A1kzbbjsgr-0c-XkJRsLtRWzDytdkei1TC0wjM7lQNuxgdz4K9qVu7L5GvDr9sV0hKxL1fGhLblzNPlJHUL85BKjjXf-g8XcbxybaZwI07bL8gUwUVSNwtA3ByU0yMC4GplAZz6oH2VnMjuA_mWzScib9f4fbZ8Bi6L1Btr0QiMadSUzTlU-iVwErdut4' },
    { name: '富恩特', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBRCshIFf0H9DPr1Dx2qZwTt4KayxGjl-CHErp3eArRaaNI4OuMXYLWH0E2YkPFtrRAOIBlDnvSNb5m4IOldfgeogjMZ1APkksOteSgJaEghNUK52ILYMx1kqJg_H70AqpEqKqXSQeSf4TraY0EKOD85hGIfpdx_x_NEsCNx87khOj2G_by1zpbEJHQpZRCk8FWi9GmVjp_ntZptQmQkff-Ex-0dKxQvrspSka-M2aLLZ-jLiVCM3vvAKhD5OXG_HTvAWpqYskBLLtR' },
    { name: '帕德龙', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBHbNRSrIaXbrOGe4rd_cjTeqReiXAOzT45cVKsHNrZMJl0RRgKF7WbT8SeQuIpg5F3-C-6osx6hCKIZhw7Czn7LlsEfSHKA43PW-h2AY8fYTN51AZ2L2yzeuO1qbjbsfPDiZ7MO-ZAmzY41pFwKIinqjgT_VBiUp6ugW1URhTCW-9XXB8GDs4DvHt33XeDE5kk_yFzF-coOVP1OMWGnVWw1qpdhxS2GpH5otsgvFwgqF8bvY4Qy7_aVR3KzZIuxEgvgrLF6uXBw1Ow' },
    { name: '奥利瓦', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAdmMeJCS83XnRNbJE45RSycqsGCB-j3dQkcdylblxlA6nlSfX3w_morBA8ZHIOtTJkvT0lW-I3NCluG8deR1XbjNM5i4MyJYkNwsN24iSmsQH8n-Pd0D6ZgzfksZeFFblGOsYkT_LQF9m09t6BdOJ3_4198dExceXIXPgySbeVuWx05nJRZyJNR9Dd2RrVO8W85HgJ3Jqe3xIZnksZe0w1SY-cDyPh2Y6Mz_LP9UNwuNjxz1Hs9b8D06W4TPUTK7VSaYkmJC_FG5mP' },
    { name: '好友', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCVjWm0uDoUbwF_hGwuRKaaFZTeQyxjIbkwTOL-IBqj5DV_7eQS679UhUhyIItTZ7csGLfzxwe6Do0JXd2iVAw62kz5Qnh44kBGW6L9c2MotXSpMUURZSwvHSMgxL6RobYabudlhOahH9hrDG6jGjK1t7awdf6N5yt6KIWzfiEHI9gnKFt8AkNxXPhRmQzUfZuENQ1WQwjiEao9AninQXvzXKY7UPinmILqHx6JmQeQKubgWkofAWB6SqC3hFf2F_aDnim8FiIJXTuT' },
    { name: '乌普曼', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAqHB6rsaNdj2YK3LD1fpe8bvBzFVHW419msspw6KWY8dRGpfkSYmF6dB_1RpkfhSVhrFafVDvWNQ_YrMTnA-NeycKMp-6QdZj8hATjIWWpXd7r4V3MskYMyPGrgMHhVzIcdKjzkIxg-AWeY6VRNbZHuOEPsSsqGodqkCZ231nsmy-Pu0rpEkT8yXli7yKi4ydUnFD2RGeHV8ool9-eynWuVd3e_zhe8RT-I90JgKfQUaDxNl_SU1ynfIr2nDbrWtIm5WqIe_FsKhRJ' },
    { name: '特立尼达', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAqHB6rsaNdj2YK3LD1fpe8bvBzFVHW419msspw6KWY8dRGpfkSYmF6dB_1RpkfhSVhrFafVDvWNQ_YrMTnA-NeycKMp-6QdZj8hATjIWWpXd7r4V3MskYMyPGrgMHhVzIcdKjzkIxg-AWeY6VRNbZHuOEPsSsqGodqkCZ231nsmy-Pu0rpEkT8yXli7yKi4ydUnFD2RGeHV8ool9-eynWuVd3e_zhe8RT-I90JgKfQUaDxNl_SU1ynfIr2nDbrWtIm5WqIe_FsKhRJ' },
    { name: 'Punch', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBHbNRSrIaXbrOGe4rd_cjTeqReiXAOzT45cVKsHNrZMJl0RRgKF7WbT8SeQuIpg5F3-C-6osx6hCKIZhw7Czn7LlsEfSHKA43PW-h2AY8fYTN51AZ2L2yzeuO1qbjbsfPDiZ7MO-ZAmzY41pFwKIinqjgT_VBiUp6ugW1URhTCW-9XXB8GDs4DvHt33XeDE5kk_yFzF-coOVP1OMWGnVWw1qpdhxS2GpH5otsgvFwgqF8bvY4Qy7_aVR3KzZIuxEgvgrLF6uXBw1Ow' },
  ]

  const origins = ['all', '古巴', '新世界']

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const list = await getCigars()
        setCigars(list)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <div style={{ padding: '24px' }}>
      {/* 顶部标题栏 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ 
          fontSize: '22px', 
          fontWeight: 800, 
          backgroundImage: 'linear-gradient(to right,#FDE08D,#C48D3A)', 
          WebkitBackgroundClip: 'text', 
          color: 'transparent',
          margin: 0
        }}>
          商品导航
        </h1>
        
      </div>

      {/* Search */}
      <div style={{ marginBottom: '16px' }}>
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
            placeholder="搜索品牌"
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

      {/* Filter Pills */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          overflowX: 'auto', 
          paddingBottom: '8px',
          marginBottom: '-8px'
        }}>
          {origins.map((origin) => (
            <button
              key={origin}
              onClick={() => setSelectedOrigin(origin)}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500',
                borderRadius: '20px',
                whiteSpace: 'nowrap',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: selectedOrigin === origin 
                  ? 'linear-gradient(to right,#FDE08D,#C48D3A)' 
                  : 'rgba(255, 255, 255, 0.1)',
                color: selectedOrigin === origin ? '#111' : '#ccc'
              }}
            >
              {origin === 'all' ? '全部' : origin}
            </button>
          ))}
        </div>
                    </div>
                    
      {/* Price Range */}
      <div style={{ 
        padding: '16px', 
        background: 'rgba(255, 255, 255, 0.05)', 
        borderRadius: '12px', 
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ 
            fontWeight: 'bold', 
            color: '#fff', 
            margin: 0,
            fontSize: '16px'
          }}>
            价格范围
          </h3>
          <span style={{ 
            fontSize: '14px', 
            fontWeight: '500', 
            color: '#F4AF25'
          }}>
            RM{priceRange[0]} - RM{priceRange[1]}
          </span>
                    </div>
                    
        <div style={{ marginBottom: '16px' }}>
          <Slider
            range
            min={0}
            max={2000}
            value={priceRange}
            onChange={(value) => setPriceRange(value as [number, number])}
            trackStyle={[{ background: '#F4AF25' }]}
            handleStyle={[{ 
              borderColor: '#F4AF25',
              background: '#F4AF25'
            }]}
            railStyle={{ background: '#4a4a4a' }}
          />
        </div>
                    </div>
                    
      {/* Recommended Brands */}
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ 
          fontSize: '16px', 
          fontWeight: 'bold', 
          color: '#fff', 
          marginBottom: '16px'
        }}>
          推荐品牌
        </h2>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: '16px'
        }}>
          {brands.map((brand, index) => (
            <div key={index} style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: '8px'
            }}>
              <div 
                style={{
                  width: '100%',
                  aspectRatio: '1',
                  borderRadius: '8px',
                  backgroundImage: `url(${brand.image})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              />
              <p style={{ 
                fontSize: '12px', 
                fontWeight: '500', 
                textAlign: 'center', 
                color: '#fff',
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                width: '100%'
              }}>
                {brand.name}
              </p>
                      </div>
          ))}
                      </div>
                    </div>

      {/* Popular Brands */}
      <div>
        <h2 style={{ 
          fontSize: '16px', 
          fontWeight: 'bold', 
          color: '#fff', 
          marginBottom: '16px'
        }}>
          热门品牌
        </h2>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: '16px'
        }}>
          {popularBrands.map((brand, index) => (
            <div key={index} style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: '8px'
            }}>
              <div 
                style={{
                  width: '100%',
                  aspectRatio: '1',
                  borderRadius: '8px',
                  backgroundImage: `url(${brand.image})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              />
              <p style={{ 
                fontSize: '12px', 
                fontWeight: '500', 
                textAlign: 'center', 
                color: '#fff',
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                width: '100%'
              }}>
                {brand.name}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Shop
