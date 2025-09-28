// 共享的会员头像/会员卡组件
import React, { useState } from 'react'
import { CrownOutlined } from '@ant-design/icons'
import { useQRCode } from '../../hooks/useQRCode'
import { QRCodeDisplay } from '../common/QRCodeDisplay'
import { useTranslation } from 'react-i18next'
import type { User } from '../../types'

interface MemberProfileCardProps {
  user: User | null
  showMemberCard: boolean
  onToggleMemberCard: (show: boolean) => void
  getMembershipText: (level: string) => string
  className?: string
  style?: React.CSSProperties
}

export const MemberProfileCard: React.FC<MemberProfileCardProps> = ({
  user,
  showMemberCard,
  onToggleMemberCard,
  getMembershipText,
  className = '',
  style = {}
}) => {
  const { t } = useTranslation()
  
  // 3D旋转动画状态
  const [isRotating, setIsRotating] = useState(false)
  const [rotationDirection, setRotationDirection] = useState<'left' | 'right'>('right')
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  // QR Code Hook - 基于用户ID自动生成
  const { qrCodeDataURL, loading: qrLoading, error: qrError } = useQRCode({
    memberId: user?.id,
    memberName: user?.displayName,
    autoGenerate: true
  })

  // 触摸事件处理函数
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd || isRotating) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe) {
      // 左滑：头像从左往右转动消失，名片从左往右显示
      setRotationDirection('left')
      setIsRotating(true)
      onToggleMemberCard(true)
      setTimeout(() => setIsRotating(false), 600)
    } else if (isRightSwipe) {
      // 右滑：头像从右往左转动消失，名片从右往左显示
      setRotationDirection('right')
      setIsRotating(true)
      onToggleMemberCard(true)
      setTimeout(() => setIsRotating(false), 600)
    }
  }

  // 点击事件处理函数
  const handleClick = (e: React.MouseEvent) => {
    if (isRotating) return
    
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const centerX = rect.width / 2
    
    if (clickX < centerX) {
      // 点击左边：头像从左往右转动消失，名片从左往右显示
      setRotationDirection('left')
    } else {
      // 点击右边：头像从右往左转动消失，名片从右往左显示
      setRotationDirection('right')
    }
    
    setIsRotating(true)
    onToggleMemberCard(!showMemberCard)
    setTimeout(() => setIsRotating(false), 600)
  }

  return (
    <>
      {/* CSS动画关键帧 */}
      <style>
        {`
          @keyframes avatarSlideOutLeft {
            0% { transform: perspective(1000px) rotateY(0deg) translateX(0); opacity: 1; }
            50% { transform: perspective(1000px) rotateY(-45deg) translateX(-20px); opacity: 0.5; }
            100% { transform: perspective(1000px) rotateY(-90deg) translateX(-40px); opacity: 0; }
          }
          
          @keyframes avatarSlideOutRight {
            0% { transform: perspective(1000px) rotateY(0deg) translateX(0); opacity: 1; }
            50% { transform: perspective(1000px) rotateY(45deg) translateX(20px); opacity: 0.5; }
            100% { transform: perspective(1000px) rotateY(90deg) translateX(40px); opacity: 0; }
          }
          
          @keyframes cardSlideInLeft {
            0% { transform: perspective(1000px) rotateY(-90deg) translateX(-40px); opacity: 0; }
            50% { transform: perspective(1000px) rotateY(-45deg) translateX(-20px); opacity: 0.5; }
            100% { transform: perspective(1000px) rotateY(0deg) translateX(0); opacity: 1; }
          }
          
          @keyframes cardSlideInRight {
            0% { transform: perspective(1000px) rotateY(90deg) translateX(40px); opacity: 0; }
            50% { transform: perspective(1000px) rotateY(45deg) translateX(20px); opacity: 0.5; }
            100% { transform: perspective(1000px) rotateY(0deg) translateX(0); opacity: 1; }
          }
        `}
      </style>

      {/* Avatar/Member Card Toggle */}
      <div
        className={className}
        style={{
          position: 'relative',
          display: 'inline-block',
          marginBottom: '16px',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          perspective: '1000px',
          transformStyle: 'preserve-3d',
          ...style
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
        onMouseEnter={(e) => {
          if (!isRotating) {
            e.currentTarget.style.transform = showMemberCard ? 'scale(1.05)' : 'scale(1.02)'
          }
        }}
        onMouseLeave={(e) => {
          if (!isRotating) {
            e.currentTarget.style.transform = showMemberCard ? 'scale(1.02)' : 'scale(1)'
          }
        }}
      >
        {showMemberCard ? (
          /* 会员卡显示 - 应用3D效果和精美样式 */
          <div 
            className="card-3d-effect"
            style={{
              position: 'relative',
              borderRadius: 20,
              background: 'linear-gradient(145deg, #1A1A1A 0%, #0A0A0A 100%)',
              backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><defs><pattern id="p" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0h5v5H0z" fill="%23D4AF37" fill-opacity="0.05"/></pattern></defs><rect width="100" height="100" fill="url(%23p)"/></svg>')`,
              border: '1px solid rgba(212, 175, 55, 0.25)',
              overflow: 'hidden',
              width: '85.6mm',
              height: '54mm',
              minWidth: '85.6mm',
              minHeight: '54mm',
              maxWidth: '85.6mm',
              maxHeight: '54mm',
              transformStyle: 'preserve-3d',
              transform: isRotating 
                ? `perspective(1000px) rotateY(${rotationDirection === 'left' ? '0deg' : '0deg'})`
                : 'perspective(1000px) rotateY(0deg)',
              transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
              transformOrigin: 'center center',
              animation: isRotating 
                ? `cardSlideIn${rotationDirection === 'left' ? 'Left' : 'Right'} 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards`
                : 'none',
              // 3D阴影效果
              boxShadow: `
                0px 15px 35px rgba(0,0,0,0.5), 
                0px 5px 15px rgba(0,0,0,0.4),
                0 0 20px rgba(212, 175, 55, 0.3),
                0 0 40px rgba(212, 175, 55, 0.2),
                0 0 60px rgba(212, 175, 55, 0.1)
              `
            }}
            onMouseEnter={(e) => {
              if (!isRotating) {
                e.currentTarget.style.transform = 'translateY(-5px) rotateX(5deg) rotateY(2deg)';
                e.currentTarget.style.boxShadow = `
                  0px 25px 45px rgba(0,0,0,0.6), 
                  0px 10px 25px rgba(0,0,0,0.5),
                  0 0 30px rgba(212, 175, 55, 0.4),
                  0 0 60px rgba(212, 175, 55, 0.3),
                  0 0 90px rgba(212, 175, 55, 0.2)
                `;
              }
            }}
            onMouseLeave={(e) => {
              if (!isRotating) {
                e.currentTarget.style.transform = 'perspective(1000px) rotateY(0deg)';
                e.currentTarget.style.boxShadow = `
                  0px 15px 35px rgba(0,0,0,0.5), 
                  0px 5px 15px rgba(0,0,0,0.4),
                  0 0 20px rgba(212, 175, 55, 0.3),
                  0 0 40px rgba(212, 175, 55, 0.2),
                  0 0 60px rgba(212, 175, 55, 0.1)
                `;
              }
            }}
          >
            {/* 背景装饰 */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(circle at 15% 25%, rgba(212,175,55,0.15), transparent 40%), radial-gradient(circle at 85% 75%, rgba(212,175,55,0.1), transparent 40%)'
            }} />
            
            <div style={{ position: 'relative', zIndex: 1, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ 
                    fontSize: 22, 
                    fontWeight: 700, 
                    letterSpacing: 1, 
                    textAlign: 'left',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                    backgroundImage: 'linear-gradient(to bottom, #F0E68C, #D4AF37)'
                  }}>Gentleman Club</div>
                  <div style={{ 
                    fontSize: 12, 
                    fontWeight: 700, 
                    color: '#D4AF37', 
                    letterSpacing: 2, 
                    textAlign: 'left',
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                  }}>CIGAR CONNOISSEUR</div>
                </div>
                <QRCodeDisplay
                  qrCodeDataURL={qrCodeDataURL}
                  loading={qrLoading}
                  error={qrError}
                  size={54}
                  showPlaceholder={true}
                />
              </div>
              <div style={{ marginTop: 24, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    backgroundImage: user?.profile?.avatar ? `url(${user.profile.avatar})` : 'url(https://lh3.googleusercontent.com/aida-public/AB6AXuDs5P-wl44y-z3P55qwZDWCSmApe-9yEsTNGmr02UNzEVBeCMwE7hIq_ikKnzQespBptCZg7RY1P5pvidROpLwXpyUdWETLOFTJYuGtSIN_2d53icCJctg5HZDPl5zRc3QfbeMOn0fl6RWLZplcDWF9frxhgWKf4-RKyNaQsWhBGRCkTAVvLMDnCcZUDGLg-c8YjnHcY8-gFFEmIaa-bHoz3lEcP-SgonuSLCTv4Fa7-_dYYF8uQ3H5a7nAxZocj7UyH0Jl9CAQQWET)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    border: '2px solid #D4AF37',
                    boxShadow: '0 6px 16px rgba(0,0,0,0.5)'
                  }} />
                  <div>
                    <div style={{ 
                      color: '#ffffff', 
                      fontSize: 20, 
                      fontWeight: 700, 
                      textAlign: 'left',
                      textShadow: '0 2px 4px rgba(0,0,0,0.7)',
                      fontFamily: "'Noto Sans SC', sans-serif"
                    }}>{user?.displayName || t('common.member')}</div>
                    <div style={{ 
                      color: '#D4AF37', 
                      fontSize: 12, 
                      fontWeight: 700, 
                      textAlign: 'left',
                      textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                      fontFamily: "'Noto Sans SC', sans-serif"
                    }}>
                      {getMembershipText(user?.membership?.level || 'bronze')}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ 
                    color: 'rgba(255,255,255,0.7)', 
                    fontSize: 11,
                    fontFamily: "'Noto Sans SC', sans-serif",
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                  }}>会员ID</div>
                  <div style={{ 
                    color: '#ffffff', 
                    fontSize: 16, 
                    fontWeight: 700, 
                    letterSpacing: 2,
                    textShadow: '0 2px 4px rgba(0,0,0,0.7)',
                    fontFamily: "'Noto Sans SC', sans-serif"
                  }}>
                    {user?.id ? `C${user.id.slice(-4).toUpperCase()}` : 'C0000'}
                  </div>
                  <div style={{ 
                    color: 'rgba(255,255,255,0.7)', 
                    fontSize: 11, 
                    marginTop: 4,
                    fontFamily: "'Noto Sans SC', sans-serif",
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                  }}>积分</div>
                  <div style={{ 
                    color: '#D4AF37', 
                    fontSize: 14, 
                    fontWeight: 700,
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                    fontFamily: "'Noto Sans SC', sans-serif"
                  }}>
                    {(user?.membership as any)?.points || 0}
                  </div>
                </div>
              </div>
            </div>
            
            {/* 切换提示 */}
            <div style={{
              position: 'absolute',
              bottom: '-30px',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '10px',
              color: 'rgba(255, 255, 255, 0.6)',
              whiteSpace: 'nowrap',
              fontFamily: "'Noto Sans SC', sans-serif",
              textShadow: '0 1px 2px rgba(0,0,0,0.5)'
            }}>
              点击返回头像
            </div>
          </div>
        ) : (
          /* 头像显示 */
          <div style={{ 
            position: 'relative',
            transform: isRotating 
              ? `perspective(1000px) rotateY(${rotationDirection === 'left' ? '-90deg' : '90deg'})`
              : 'perspective(1000px) rotateY(0deg)',
            transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            transformOrigin: 'center center',
            animation: isRotating 
              ? `avatarSlideOut${rotationDirection === 'left' ? 'Left' : 'Right'} 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards`
              : 'none'
          }}>
            <div style={{
              width: '128px',
              height: '128px',
              borderRadius: '50%',
              background: user?.profile?.avatar ? `url(${user.profile.avatar})` : 'linear-gradient(to right,#FDE08D,#C48D3A)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '48px',
              color: '#221c10',
              fontWeight: 'bold',
              // 金色多层阴影效果
              boxShadow: `
                0 0 20px rgba(212, 175, 55, 0.4),
                0 0 40px rgba(212, 175, 55, 0.3),
                0 0 60px rgba(212, 175, 55, 0.2),
                0 8px 32px rgba(212, 175, 55, 0.25),
                0 16px 48px rgba(212, 175, 55, 0.15)
              `,
              border: '3px solid rgba(244, 175, 37, 0.3)',
              transition: 'all 0.3s ease'
            }}>
              {!user?.profile?.avatar && (user?.displayName?.charAt(0)?.toUpperCase() || 'U')}
            </div>
            <div style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #221c10',
              // 金色阴影效果
              boxShadow: `
                0 0 12px rgba(212, 175, 55, 0.5),
                0 0 24px rgba(212, 175, 55, 0.3),
                0 4px 16px rgba(212, 175, 55, 0.2)
              `
            }}>
              <CrownOutlined style={{ color: '#221c10', fontSize: '16px' }} />
            </div>
            {/* 点击提示 */}
            <div style={{
              position: 'absolute',
              bottom: '-30px',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '10px',
              color: 'rgba(255, 255, 255, 0.6)',
              whiteSpace: 'nowrap',
              fontFamily: "'Noto Sans SC', sans-serif",
              textShadow: '0 1px 2px rgba(0,0,0,0.5)'
            }}>
              点击查看会员卡
            </div>
          </div>
        )}
      </div>
    </>
  )
}
