// 图片上传组件
import React, { useState, useRef } from 'react'
import { DeleteOutlined, LoadingOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons'
import { Button, message, Modal } from 'antd'
import { useTranslation } from 'react-i18next'
import { useCloudinary } from '../../hooks/useCloudinary'
import type { UploadResult } from '../../services/cloudinary'
import { deleteResource, extractPublicIdFromUrl } from '../../services/cloudinary'
import { getUploadConfig, getFullFolderPath, isValidFolderName } from '../../config/cloudinaryFolders'
import { validateFileForFolder, type CloudinaryFolderName } from '../../types/cloudinary'
import ImageCrop from './ImageCrop'

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
  enableCrop?: boolean // 是否启用裁剪功能
  cropAspectRatio?: number // 裁剪宽高比
  cropMinWidth?: number // 裁剪最小宽度
  cropMinHeight?: number // 裁剪最小高度
  cropMaxWidth?: number // 裁剪最大宽度
  cropMaxHeight?: number // 裁剪最大高度
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
  disabled = false,
  enableCrop = false,
  cropAspectRatio = 1,
  cropMinWidth = 100,
  cropMinHeight = 100,
  cropMaxWidth = 800,
  cropMaxHeight = 800
}) => {
  const { t } = useTranslation()
  const { upload, uploading, error } = useCloudinary()
  const [previewVisible, setPreviewVisible] = useState(false)
  const [cropVisible, setCropVisible] = useState(false)
  const [tempImageUrl, setTempImageUrl] = useState<string>('')
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false)
  const [deleting, setDeleting] = useState(false)
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
        message.error(t('upload.fileTooLarge', { size: Math.floor(finalMaxSize / 1024 / 1024) }))
        return
      }

      if (!file.type.startsWith('image/')) {
        message.error(t('upload.selectImageFile'))
        return
      }
    }

    // 如果启用裁剪功能，先显示裁剪界面
    if (enableCrop) {
      const imageUrl = URL.createObjectURL(file)
      setTempImageUrl(imageUrl)
      setCropVisible(true)
    } else {
      // 直接上传
      try {
        const result: UploadResult = await upload(file, {
          folder: finalFolder
        })
        
        onChange?.(result.secure_url)
        message.success(t('upload.success'))
      } catch (err) {
        message.error(t('upload.fail'))
      }
    }

    // 清空input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDelete = () => {
    setDeleteConfirmVisible(true)
  }

  const handleDeleteConfirm = async () => {
    if (!value) {
      setDeleteConfirmVisible(false)
      return
    }

    setDeleting(true)
    try {
      // 从 URL 中提取 public_id
      const publicId = extractPublicIdFromUrl(value)
      
      if (publicId) {
        // 调用 Cloudinary API 删除文件
        await deleteResource(publicId, {
          resourceType: 'image',
          invalidate: true // 同时从 CDN 缓存中删除
        })
        message.success(t('upload.imageDeleted'))
      } else {
        // 如果无法提取 public_id，仅从表单中移除 URL
        message.warning(t('upload.unableToDeleteFromCloudinary'))
      }

      // 无论是否成功删除 Cloudinary 文件，都从表单中移除 URL
      onChange?.(null)
      setDeleteConfirmVisible(false)
    } catch (error: any) {
      console.error('删除 Cloudinary 文件失败:', error)
      // 即使 Cloudinary 删除失败，也从表单中移除 URL
      onChange?.(null)
      message.warning(error?.message || t('upload.deleteFailed'))
      setDeleteConfirmVisible(false)
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteConfirmVisible(false)
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
            {uploading ? t('upload.uploading') : t('upload.clickToUpload')}
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

      {/* 错误信息 */}
      {error && (
        <div style={{ color: '#ff4d4f', fontSize: '12px', textAlign: 'center' }}>
          {error}
        </div>
      )}

      {/* 图片预览模态框 */}
      <Modal
        open={previewVisible}
        title={t('upload.imagePreview')}
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

      {/* 删除确认对话框 */}
      <Modal
        open={deleteConfirmVisible}
        title={t('common.confirmDelete')}
        onOk={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        okText={t('common.delete')}
        okButtonProps={{ danger: true, loading: deleting }}
        cancelText={t('common.cancel')}
        confirmLoading={deleting}
      >
        <p>{t('upload.confirmDeleteImage')}</p>
      </Modal>
    </div>
  )
}

export default ImageUpload
