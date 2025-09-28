// 图片裁剪组件
import React, { useState, useRef, useCallback } from 'react'
import { Button, Modal, message } from 'antd'
import { CheckOutlined, CloseOutlined } from '@ant-design/icons'
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop'
import type { Crop, PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

interface ImageCropProps {
  src: string // 原始图片URL
  visible: boolean
  onCancel: () => void
  onConfirm: (croppedImageUrl: string) => void
  aspectRatio?: number // 宽高比，如 1 表示正方形
  minWidth?: number // 最小宽度
  minHeight?: number // 最小高度
  maxWidth?: number // 最大宽度
  maxHeight?: number // 最大高度
  title?: string
}

const ImageCrop: React.FC<ImageCropProps> = ({
  src,
  visible,
  onCancel,
  onConfirm,
  aspectRatio = 1,
  minWidth = 100,
  minHeight = 100,
  maxWidth = 800,
  maxHeight = 800,
  title = '图片裁剪'
}) => {
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [loading, setLoading] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)

  // 初始化裁剪区域
  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget
    const crop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90,
        },
        aspectRatio,
        width,
        height
      ),
      width,
      height
    )
    setCrop(crop)
  }, [aspectRatio])

  // 将裁剪后的图片转换为Blob
  const getCroppedImg = (image: HTMLImageElement, crop: PixelCrop): Promise<Blob> => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (!ctx) {
      throw new Error('No 2d context')
    }

    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height
    const pixelRatio = window.devicePixelRatio

    canvas.width = crop.width * pixelRatio * scaleX
    canvas.height = crop.height * pixelRatio * scaleY

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    ctx.imageSmoothingQuality = 'high'

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width * scaleX,
      crop.height * scaleY
    )

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            throw new Error('Canvas is empty')
          }
          resolve(blob)
        },
        'image/jpeg',
        0.9
      )
    })
  }

  // 确认裁剪
  const handleConfirm = async () => {
    if (!completedCrop || !imgRef.current) {
      message.error('请选择裁剪区域')
      return
    }

    // 验证裁剪尺寸
    if (completedCrop.width < minWidth || completedCrop.height < minHeight) {
      message.error(`裁剪区域不能小于 ${minWidth}x${minHeight} 像素`)
      return
    }

    if (completedCrop.width > maxWidth || completedCrop.height > maxHeight) {
      message.error(`裁剪区域不能大于 ${maxWidth}x${maxHeight} 像素`)
      return
    }

    setLoading(true)
    try {
      const croppedImageBlob = await getCroppedImg(imgRef.current, completedCrop)
      const croppedImageUrl = URL.createObjectURL(croppedImageBlob)
      onConfirm(croppedImageUrl)
      message.success('图片裁剪完成')
    } catch (error) {
      message.error('图片裁剪失败')
      console.error('Crop error:', error)
    } finally {
      setLoading(false)
    }
  }

  // 重置裁剪区域
  const handleReset = () => {
    if (imgRef.current) {
      const { width, height } = imgRef.current
      const crop = centerCrop(
        makeAspectCrop(
          {
            unit: '%',
            width: 90,
          },
          aspectRatio,
          width,
          height
        ),
        width,
        height
      )
      setCrop(crop)
    }
  }

  return (
    <Modal
      title={title}
      open={visible}
      onCancel={onCancel}
      width="90%"
      style={{ maxWidth: '800px' }}
      footer={[
        <Button key="cancel" onClick={onCancel} icon={<CloseOutlined />}>
          取消
        </Button>,
        <Button key="reset" onClick={handleReset}>
          重置
        </Button>,
        <Button
          key="confirm"
          type="primary"
          loading={loading}
          onClick={handleConfirm}
          icon={<CheckOutlined />}
        >
          确认裁剪
        </Button>
      ]}
    >
      <div style={{ textAlign: 'center' }}>
        {/* 裁剪说明 */}
        <div style={{ 
          marginBottom: '16px', 
          padding: '12px', 
          background: '#f6f8fa', 
          borderRadius: '6px',
          fontSize: '14px',
          color: '#666'
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: '600' }}>裁剪要求：</p>
          <p style={{ margin: '0' }}>
            宽高比: {aspectRatio}:1 | 最小尺寸: {minWidth}x{minHeight} | 最大尺寸: {maxWidth}x{maxHeight}
          </p>
        </div>

        {/* 图片裁剪区域 */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          minHeight: '400px',
          background: '#f5f5f5',
          borderRadius: '8px',
          padding: '20px'
        }}>
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspectRatio}
            minWidth={minWidth}
            minHeight={minHeight}
            maxWidth={maxWidth}
            maxHeight={maxHeight}
          >
            <img
              ref={imgRef}
              alt="Crop me"
              src={src}
              style={{ maxWidth: '100%', maxHeight: '500px' }}
              onLoad={onImageLoad}
            />
          </ReactCrop>
        </div>

        {/* 预览区域 */}
        {completedCrop && (
          <div style={{ marginTop: '20px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>预览：</h4>
            <canvas
              ref={previewCanvasRef}
              style={{
                border: '1px solid #d9d9d9',
                borderRadius: '4px',
                maxWidth: '200px',
                maxHeight: '200px'
              }}
            />
          </div>
        )}
      </div>
    </Modal>
  )
}

export default ImageCrop
