// 统一的 Service 层返回类型

export interface ServiceResponse<T = void> {
  success: boolean
  data?: T
  error?: unknown
}

export interface ServiceListResponse<T> {
  success: boolean
  data?: T[]
  error?: unknown
}
