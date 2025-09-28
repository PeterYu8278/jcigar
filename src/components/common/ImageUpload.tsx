// 图片上传组件
import React, { useState, useRef } from 'react'
import { DeleteOutlined, LoadingOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons'
import { Button, message, Modal } from 'antd'
import { useCloudinary } from '../../hooks/useCloudinary'
import type { UploadResult } from '../../services/cloudinary'
import { getUploadConfig, getFullFolderPath, isValidFolderName } from '../../config/cloudinaryFolders'
import { validateFileForFolder, type CloudinaryFolderName } from '../../types/cloudinary'

interface ImageUploadProps {
  value?: string // 当前图片URL
  onChange?: (url: string | null) => void // 图片变化回调
  folder?: CloudinaryFolderName | string // Cloudinary文件夹名称或自定义路径
  maxSize?: number // 最大文件大小（字节）
  accept?: string // 接受的文件类型
  width?: number // 预览图片宽度
  height?: number // 预览图片高度
  showPreview?: boolean // 是否显示预览
  disabled?: boolean // 是否禁用
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  folder = 'temp',
  maxSize,
  accept = 'image/*',
  width,
  height,
  showPreview = true,
  disabled = false
}) => {
  const { upload, uploading, error } = useCloudinary()
  const [previewVisible, setPreviewVisible] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 获取文件夹配置
  const folderConfig = isValidFolderName(folder) ? getUploadConfig(folder) : null
  const finalFolder = isValidFolderName(folder) ? getFullFolderPath(folder) : folder
  const finalMaxSize = maxSize || folderConfig?.maxSize || 5 * 1024 * 1024
  const finalWidth = width || folderConfig?.width || 120
  const finalHeight = height || folderConfig?.height || 120

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // 使用新的验证逻辑
    if (isValidFolderName(folder)) {
      const validation = validateFileForFolder(file, folder)
      if (!validation.valid) {
        message.error(validation.error)
        return
      }
    } else {
      // 自定义文件夹的验证
      if (file.size > finalMaxSize) {
        message.error(`文件大小不能超过 ${finalMaxSize / 1024 / 1024}MB`)
        return
      }

      if (!file.type.startsWith('image/')) {
        message.error('请选择图片文件')
        return
      }
    }

    try {
      const result: UploadResult = await upload(file, {
        folder: finalFolder
      })
      
      onChange?.(result.secure_url)
      message.success('图片上传成功')
    } catch (err) {
      message.error('图片上传失败')
    }

    // 清空input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDelete = () => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这张图片吗？',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        onChange?.(null)
        message.success('图片已删除')
      }
    })
  }

  const handlePreview = () => {
    setPreviewVisible(true)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      {/* 图片预览区域 */}
      {value ? (
        <div style={{ position: 'relative' }}>
          <img
            src={value}
            alt="预览"
            style={{
              width: `${finalWidth}px`,
              height: `${finalHeight}px`,
              objectFit: 'cover',
              borderRadius: '8px',
              border: '1px solid #d9d9d9',
              cursor: showPreview ? 'pointer' : 'default'
            }}
            onClick={showPreview ? handlePreview : undefined}
          />
          
          {/* 删除按钮 */}
          {!disabled && (
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              size="small"
              style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                minWidth: '24px',
                height: '24px',
                borderRadius: '50%',
                background: '#fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
              }}
              onClick={handleDelete}
            />
          )}
        </div>
      ) : (
        <div
          style={{
            width: `${finalWidth}px`,
            height: `${finalHeight}px`,
            border: '2px dashed #d9d9d9',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#fafafa',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.6 : 1
          }}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          {uploading ? (
            <LoadingOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
          ) : (
            <PlusOutlined style={{ fontSize: '24px', color: '#999' }} />
          )}
          <div style={{ marginTop: '8px', fontSize: '12px', color: '#999' }}>
            {uploading ? '上传中...' : '点击上传'}
          </div>
        </div>
      )}

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={handleFileSelect}
        disabled={disabled}
      />

      {/* 上传按钮 */}
      {!value && !disabled && (
        <Button
          type="primary"
          icon={<UploadOutlined />}
          loading={uploading}
          onClick={() => fileInputRef.current?.click()}
          size="small"
        >
          选择图片
        </Button>
      )}

      {/* 错误信息 */}
      {error && (
        <div style={{ color: '#ff4d4f', fontSize: '12px', textAlign: 'center' }}>
          {error}
        </div>
      )}

      {/* 图片预览模态框 */}
      <Modal
        open={previewVisible}
        title="图片预览"
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        width="auto"
      >
        <img
          src={value}
          alt="预览"
          style={{
            maxWidth: '100%',
            maxHeight: '80vh',
            objectFit: 'contain'
          }}
        />
      </Modal>
    </div>
  )
}

export default ImageUpload
