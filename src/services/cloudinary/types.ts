// Cloudinary CRUD 服务的类型定义

/**
 * Cloudinary 资源类型
 */
export type ResourceType = 'image' | 'video' | 'raw' | 'auto'

/**
 * Cloudinary 上传结果
 */
export interface CloudinaryResource {
  public_id: string
  secure_url: string
  url: string
  width: number
  height: number
  format: string
  bytes: number
  resource_type: ResourceType
  created_at: string
  folder?: string
  tags?: string[]
  context?: Record<string, any>
}

/**
 * 上传选项
 */
export interface UploadOptions {
  /** 文件夹路径 */
  folder?: string
  /** 最大文件大小（字节） */
  maxBytes?: number
  /** 允许的文件格式 */
  allowedFormats?: string[]
  /** 资源类型 */
  resourceType?: ResourceType
  /** 转换选项 */
  transformation?: TransformationOptions
  /** 公共 ID（如果不提供，将自动生成） */
  publicId?: string
  /** 标签 */
  tags?: string[]
  /** 上下文信息 */
  context?: Record<string, string>
  /** 是否覆盖已存在的文件 */
  overwrite?: boolean
  /** 是否使用文件名作为显示名称 */
  useFilename?: boolean
  /** 唯一文件名 */
  uniqueFilename?: boolean
}

/**
 * 转换选项
 */
export interface TransformationOptions {
  width?: number
  height?: number
  crop?: 'fill' | 'fit' | 'scale' | 'thumb' | 'limit' | 'pad'
  gravity?: 'center' | 'face' | 'auto' | 'north' | 'south' | 'east' | 'west'
  quality?: 'auto' | 'best' | 'good' | 'eco' | 'low' | number
  format?: 'auto' | 'jpg' | 'png' | 'webp' | 'gif' | 'mp4'
  fetchFormat?: 'auto' | 'jpg' | 'png' | 'webp'
  angle?: number
  opacity?: number
  overlay?: string
  underlay?: string
  radius?: number | string
  effect?: string
  colorSpace?: string
  background?: string
  [key: string]: any
}

/**
 * 删除选项
 */
export interface DeleteOptions {
  /** 资源类型 */
  resourceType?: ResourceType
  /** 删除类型：单个文件、文件夹或批量 */
  type?: 'file' | 'folder' | 'bulk'
  /** 是否忽略不存在的文件 */
  invalidate?: boolean
}

/**
 * 删除结果
 */
export interface DeleteResult {
  result: 'ok' | 'not found'
  public_id?: string
}

/**
 * 批量删除选项
 */
export interface BulkDeleteOptions extends DeleteOptions {
  /** 公共 ID 列表 */
  publicIds: string[]
}

/**
 * 批量删除结果
 */
export interface BulkDeleteResult {
  deleted: Record<string, DeleteResult>
  not_found: string[]
}

/**
 * 资源列表选项
 */
export interface ListResourcesOptions {
  /** 资源类型 */
  resourceType?: ResourceType
  /** 文件夹路径 */
  folder?: string
  /** 最大结果数 */
  maxResults?: number
  /** 分页标记 */
  nextCursor?: string
  /** 标签过滤 */
  tags?: string[]
  /** 上下文过滤 */
  context?: boolean
  /** 是否按创建时间排序 */
  sortBy?: Array<{ field: 'created_at' | 'updated_at' | 'public_id'; direction: 'asc' | 'desc' }>
}

/**
 * 资源列表结果
 */
export interface ListResourcesResult {
  resources: CloudinaryResource[]
  next_cursor?: string
  total_count?: number
}

/**
 * 资源详情选项
 */
export interface GetResourceOptions {
  /** 资源类型 */
  resourceType?: ResourceType
  /** 是否包含图像分析数据 */
  imageMetadata?: boolean
  /** 是否包含颜色信息 */
  colors?: boolean
  /** 是否包含面孔检测数据 */
  faces?: boolean
  /** 是否包含质量分析数据 */
  qualityAnalysis?: boolean
}

/**
 * 更新资源选项
 */
export interface UpdateResourceOptions {
  /** 资源类型 */
  resourceType?: ResourceType
  /** 标签 */
  tags?: string[]
  /** 上下文信息 */
  context?: Record<string, string>
  /** 自定义坐标（人脸识别） */
  faces?: boolean
  /** 自定义坐标 */
  coordinates?: Record<string, any>
  /** 访问控制 */
  accessControl?: any[]
  /** 是否覆盖已存在的上下文 */
  clearInvalid?: boolean
}

/**
 * 重命名资源选项
 */
export interface RenameResourceOptions {
  /** 资源类型 */
  resourceType?: ResourceType
  /** 是否覆盖已存在的文件 */
  overwrite?: boolean
  /** 是否使缓存失效 */
  invalidate?: boolean
  /** 移动到新文件夹 */
  toType?: ResourceType
}

/**
 * URL 生成选项
 */
export interface UrlOptions extends TransformationOptions {
  /** 版本号 */
  version?: string | number
  /** 签名 */
  signature?: string
  /** 是否使用 HTTPS */
  secure?: boolean
  /** CDN 子域名 */
  cdnSubdomain?: boolean
  /** 使用文件扩展名 */
  useExtension?: boolean
}

/**
 * 服务错误
 */
export class CloudinaryError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message)
    this.name = 'CloudinaryError'
  }
}

/**
 * 验证结果
 */
export interface ValidationResult {
  valid: boolean
  error?: string
}

/**
 * 上传结果（向后兼容）
 * @deprecated 使用 CloudinaryResource 替代
 */
export interface UploadResult {
  public_id: string
  secure_url: string
  width: number
  height: number
  format: string
  bytes: number
}

/**
 * 上传选项（向后兼容，旧版本）
 * @deprecated 使用 UploadOptions 替代
 */
export interface UploadOptionsOld {
  folder?: string
  max_bytes?: number
}



