// 共享的会员头像/会员卡组件
import React, { useState, useEffect, useRef } from 'react'
import { CrownOutlined, CopyOutlined, ShareAltOutlined } from '@ant-design/icons'
import { Modal, Button, Space, message } from 'antd'
import { useQRCode } from '../../hooks/useQRCode'
import { QRCodeDisplay } from '../common/QRCodeDisplay'
import { useTranslation } from 'react-i18next'
import type { User, AppConfig } from '../../types'
import { collection, query, where, orderBy, limit, onSnapshot, Unsubscribe } from 'firebase/firestore'
import { db } from '../../config/firebase'
import { GLOBAL_COLLECTIONS } from '../../config/globalCollections'
import { getAppConfig } from '../../services/firebase/appConfig'

interface MemberProfileCardProps {
  user: User | null
  showMemberCard: boolean
  onToggleMemberCard: (show: boolean) => void
  getMembershipText: (level: string) => string
  className?: string
  style?: React.CSSProperties
  enableQrModal?: boolean // 是否启用点击会员卡放大QR code功能（主页场景）
}

export const MemberProfileCard: React.FC<MemberProfileCardProps> = ({
  user,
  showMemberCard,
  onToggleMemberCard,
  getMembershipText,
  className = '',
  style = {},
  enableQrModal = false
}) => {
  const { t } = useTranslation()
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null)
  
  // 3D旋转动画状态
  const [isRotating, setIsRotating] = useState(false)
  const [rotationDirection, setRotationDirection] = useState<'left' | 'right'>('right')
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  // QR code 放大显示状态
  const [qrModalVisible, setQrModalVisible] = useState(false)
  // 用于跟踪之前的 check-in 状态
  const prevHasPendingSessionRef = useRef<boolean | null>(null)
  // 用于标记是否是首次回调
  const isFirstCallbackRef = useRef<boolean>(true)

  // 加载应用配置
  useEffect(() => {
    const loadAppConfig = async () => {
      const config = await getAppConfig()
      if (config) {
        setAppConfig(config)
      }
    }
    loadAppConfig()
  }, [])

  // 使用 onSnapshot 实时监听用户 check-in 状态
  useEffect(() => {
    if (!user?.id) {
      // 重置状态
      prevHasPendingSessionRef.current = null
      isFirstCallbackRef.current = true
      return
    }

    // 只有当引荐码分享模态框打开时才设置监听器
    if (!qrModalVisible) {
      // 模态框关闭时，重置状态以便下次打开时重新初始化
      prevHasPendingSessionRef.current = null
      isFirstCallbackRef.current = true
      return
    }

    // 查询当前用户的 pending visit session
    const q = query(
      collection(db, GLOBAL_COLLECTIONS.VISIT_SESSIONS),
      where('userId', '==', user.id),
      where('status', '==', 'pending'),
      orderBy('checkInAt', 'desc'),
      limit(1)
    )

    // 设置实时监听器
    const unsubscribe: Unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const hasPendingSession = !querySnapshot.empty
        
        // 首次回调：只初始化状态，不关闭模态框
        if (isFirstCallbackRef.current) {
          prevHasPendingSessionRef.current = hasPendingSession
          isFirstCallbackRef.current = false
          return
        }
        
        // 后续回调：检测到用户被 check-in（从没有 pending session 变为有 pending session）
        if (prevHasPendingSessionRef.current === false && hasPendingSession) {
          // 关闭引荐码分享模态框
          setQrModalVisible(false)
        }
        
        // 更新 ref 为当前状态
        prevHasPendingSessionRef.current = hasPendingSession
      },
      (error) => {
        // 监听错误不影响主流程，静默处理
        if (error.code !== 'failed-precondition' && !error.message?.includes('index')) {
          // 非索引错误才记录
        }
      }
    )

    // 清理函数：组件卸载或依赖变化时取消监听
    return () => {
      unsubscribe()
    }
  }, [user?.id, qrModalVisible])

  // QR Code Hook - 基于会员编号生成引荐链接
  const { qrCodeDataURL, loading: qrLoading, error: qrError } = useQRCode({
    memberId: user?.memberId,  // ✅ 使用 memberId 而不是 user.id
    memberName: user?.displayName,
    autoGenerate: true
  })

  // 复制引荐码到剪贴板
  const handleCopyReferralCode = async () => {
    if (!user?.memberId) {
      message.error(t('profile.referralCodeNotFound'))
      return
    }
    
    try {
      await navigator.clipboard.writeText(user.memberId)
      message.success(t('profile.referralCodeCopied'))
    } catch (error) {
      // 降级方案：使用传统方法
      const textArea = document.createElement('textarea')
      textArea.value = user.memberId
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        message.success(t('profile.referralCodeCopied'))
      } catch (err) {
        message.error(t('profile.copyFailed'))
      }
      document.body.removeChild(textArea)
    }
  }

  // 复制分享链接到剪贴板
  const handleCopyShareLink = async () => {
    if (!user?.memberId) {
      message.error(t('profile.referralCodeNotFound'))
      return
    }
    
    const baseUrl = window.location.origin
    const shareLink = `${baseUrl}/register?ref=${user.memberId}`
    
    try {
      await navigator.clipboard.writeText(shareLink)
      message.success(t('profile.inviteTextCopied'))
    } catch (error) {
      // 降级方案
      const textArea = document.createElement('textarea')
      textArea.value = shareLink
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        message.success(t('profile.inviteTextCopied'))
      } catch (err) {
        message.error(t('profile.copyFailed'))
      }
      document.body.removeChild(textArea)
    }
  }

  // 分享功能（使用 Web Share API）
  const handleShare = async () => {
    if (!user?.memberId) {
      message.error(t('profile.referralCodeNotFound'))
      return
    }
    
    const baseUrl = window.location.origin
    const shareLink = `${baseUrl}/register?ref=${user.memberId}`
    const shareText = t('profile.shareText', { code: user.memberId })
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: t('profile.shareInvitation'),
          text: shareText,
          url: shareLink
        })
      } catch (error: any) {
        // 用户取消分享或其他错误，不显示错误消息
        if (error.name !== 'AbortError') {
          console.error('Share failed:', error)
        }
      }
    } else {
      // 降级到复制链接
      handleCopyShareLink()
    }
  }

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
    
    // 如果启用了QR modal且显示会员卡，触摸时打开QR modal
    if (enableQrModal && showMemberCard) {
      setQrModalVisible(true)
      return
    }
    
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
    
    // 如果启用了QR modal且显示会员卡，点击时打开QR modal
    if (enableQrModal && showMemberCard) {
      setQrModalVisible(true)
      return
    }
    
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
                  }}>{appConfig?.appName || 'Gentlemen Club'}</div>
                  <div style={{ 
                    fontSize: 12, 
                    fontWeight: 700, 
                    color: '#D4AF37', 
                    letterSpacing: 2, 
                    textAlign: 'left',
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                  }}>CIGAR World</div>
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
                      {user?.role === 'developer'
                        ? t('auth.developer', { defaultValue: '开发者' })
                        : user?.role === 'admin' 
                        ? t('auth.admin', { defaultValue: '管理员' })
                        : user?.role === 'vip'
                        ? t('auth.vip', { defaultValue: 'VIP' })
                        : t('auth.member', { defaultValue: '会员' })}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ 
                    color: 'rgba(255,255,255,0.7)', 
                    fontSize: 11,
                    fontFamily: "'Noto Sans SC', sans-serif",
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                  }}>{t('usersAdmin.memberId')}</div>
                  <div style={{ 
                    color: '#ffffff', 
                    fontSize: 16, 
                    fontWeight: 700, 
                    letterSpacing: 2,
                    textShadow: '0 2px 4px rgba(0,0,0,0.7)',
                    fontFamily: "'Noto Sans SC', sans-serif"
                  }}>
                    {user?.memberId || '000000'}
                  </div>
                  <div style={{ 
                    color: 'rgba(255,255,255,0.7)', 
                    fontSize: 11, 
                    marginTop: 4,
                    fontFamily: "'Noto Sans SC', sans-serif",
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                  }}>{t('usersAdmin.points')}</div>
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
              {t('usersAdmin.clickToReturnAvatar')}
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
              border: '3px solid rgba(244, 175, 37, 0.6)',
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
              {t('usersAdmin.clickToViewMemberCard')}
            </div>
          </div>
        )}
      </div>
      
      {/* 引荐码分享模态框 */}
      <Modal
        title={null}
        open={qrModalVisible}
        onCancel={() => setQrModalVisible(false)}
        footer={null}
        centered
        width={420}
        styles={{
          content: {
            background: 'linear-gradient(135deg, #FDE08D 0%, #C48D3A 50%, #D4AF37 100%)',
            borderRadius: '12px',
            padding: '1px',
            boxShadow: 
              '0 0 20px rgba(212, 175, 55, 0.3), 0 0 40px rgba(212, 175, 55, 0.2), 0 0 60px rgba(212, 175, 55, 0.1), 0 8px 32px rgba(0, 0, 0, 0.5)'
          },
          body: {
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, rgba(26, 26, 26, 0.95) 0%, rgba(45, 45, 45, 0.95) 100%)',
            borderRadius: '10px',
            margin: 0
          }
        }}
        style={{
          background: 'rgba(0, 0, 0, 0.8)'
        }}
      >
        <div style={{ 
          textAlign: 'center',
          width: '100%'
        }}>
          {/* 标题 */}
          <div style={{ 
            fontSize: 16, 
            fontWeight: 600, 
            color: 'rgba(255, 255, 255, 0.8)',
            marginBottom: 16,
            fontFamily: "'Noto Sans SC', sans-serif"
          }}>
            {t('profile.myReferralCode')}
          </div>

          {/* 引荐码显示 */}
          <div style={{
            fontSize: '36px',
            fontWeight: 'bold',
            color: '#ffd700',
            letterSpacing: '4px',
            fontFamily: 'monospace',
            marginBottom: 24,
            textShadow: '0 2px 8px rgba(255, 215, 0, 0.3)'
          }}>
            {user?.memberId || '------'}
          </div>

          {/* QR Code 显示 */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '16px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            marginBottom: 24
          }}>
            <QRCodeDisplay
              qrCodeDataURL={qrCodeDataURL}
              loading={qrLoading}
              error={qrError}
              size={200}
              showPlaceholder={true}
            />
          </div>

          {/* 操作按钮 */}
          <Space size="middle" direction="vertical" style={{ width: '100%', marginBottom: 20 }}>
            <Button
              type="default"
              icon={<CopyOutlined />}
              onClick={handleCopyReferralCode}
              block
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                color: '#fff',
                borderRadius: '8px',
                height: '44px',
                fontSize: '15px',
                fontWeight: 500
              }}
            >
              {t('profile.copyReferralCode')}
            </Button>
            <Button
              type="default"
              icon={<ShareAltOutlined />}
              onClick={handleShare}
              block
              style={{
                background: 'linear-gradient(to right, #FDE08D, #C48D3A)',
                border: 'none',
                color: '#111',
                borderRadius: '8px',
                height: '44px',
                fontSize: '15px',
                fontWeight: 'bold'
              }}
            >
              {t('profile.shareInvitation')}
            </Button>
          </Space>

          {/* 奖励说明 */}
          <div style={{
            padding: '12px',
            background: 'rgba(212, 175, 55, 0.1)',
            borderRadius: '8px',
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.8)',
            lineHeight: '1.6',
            marginBottom: 12,
            fontFamily: "'Noto Sans SC', sans-serif"
          }}>
            {t('profile.referralReward')}
          </div>
          <div style={{
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.6)',
            lineHeight: '1.6',
            fontFamily: "'Noto Sans SC', sans-serif"
          }}>
            {t('profile.shareWithFriends')}
          </div>
        </div>
      </Modal>
    </>
  )
}

