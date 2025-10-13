import { useTranslation } from 'react-i18next'
import {
  COMMON_ACTIONS,
  COMMON_STATUS,
  COMMON_LABELS,
  EVENT_STATUS,
  USER_ROLES,
  AUTH_KEYS,
  NAV_KEYS,
  ORDER_STATUS,
  INVENTORY_KEYS,
  MESSAGE_KEYS,
  BATCH_ACTIONS,
  VALIDATION_KEYS,
  MEMBER_LEVELS,
} from '../i18n/constants'

/**
 * 通用翻译Hook
 * 提供预翻译的常用文本，避免在组件中重复调用t()
 */
export const useCommonTranslation = () => {
  const { t } = useTranslation()

  return {
    // 操作按钮
    actions: {
      save: t(COMMON_ACTIONS.SAVE),
      cancel: t(COMMON_ACTIONS.CANCEL),
      confirm: t(COMMON_ACTIONS.CONFIRM),
      delete: t(COMMON_ACTIONS.DELETE),
      edit: t(COMMON_ACTIONS.EDIT),
      add: t(COMMON_ACTIONS.ADD),
      done: t(COMMON_ACTIONS.DONE),
      view: t(COMMON_ACTIONS.VIEW),
      search: t(COMMON_ACTIONS.SEARCH),
      reset: t(COMMON_ACTIONS.RESET),
      submit: t(COMMON_ACTIONS.SUBMIT),
      back: t(COMMON_ACTIONS.BACK),
      next: t(COMMON_ACTIONS.NEXT),
      previous: t(COMMON_ACTIONS.PREVIOUS),
      close: t(COMMON_ACTIONS.CLOSE),
      ok: t(COMMON_ACTIONS.OK),
      yes: t(COMMON_ACTIONS.YES),
      no: t(COMMON_ACTIONS.NO),
      remove: t(COMMON_ACTIONS.REMOVE),
      upload: t(COMMON_ACTIONS.UPLOAD),
      more: t(COMMON_ACTIONS.MORE),
    },

    // 状态提示
    status: {
      loading: t(COMMON_STATUS.LOADING),
      success: t(COMMON_STATUS.SUCCESS),
      error: t(COMMON_STATUS.ERROR),
      warning: t(COMMON_STATUS.WARNING),
      info: t(COMMON_STATUS.INFO),
      saved: t(COMMON_STATUS.SAVED),
      created: t(COMMON_STATUS.CREATED),
      deleted: t(COMMON_STATUS.DELETED),
      failed: t(COMMON_STATUS.FAILED),
    },

    // 标签
    labels: {
      name: t(COMMON_LABELS.NAME),
      phone: t(COMMON_LABELS.PHONE),
      email: t(COMMON_LABELS.EMAIL),
      status: t(COMMON_LABELS.STATUS),
      action: t(COMMON_LABELS.ACTION),
      description: t(COMMON_LABELS.DESCRIPTION),
      startDate: t(COMMON_LABELS.START_DATE),
      endDate: t(COMMON_LABELS.END_DATE),
      noData: t(COMMON_LABELS.NO_DATA),
    },

    // 事件状态
    eventStatus: {
      draft: t(EVENT_STATUS.DRAFT),
      published: t(EVENT_STATUS.PUBLISHED),
      ongoing: t(EVENT_STATUS.ONGOING),
      completed: t(EVENT_STATUS.COMPLETED),
      cancelled: t(EVENT_STATUS.CANCELLED),
    },

    // 用户角色
    roles: {
      admin: t(USER_ROLES.ADMIN),
      member: t(USER_ROLES.MEMBER),
      guest: t(USER_ROLES.GUEST),
    },

    // 订单状态
    orderStatus: {
      pending: t(ORDER_STATUS.PENDING),
      confirmed: t(ORDER_STATUS.CONFIRMED),
      shipped: t(ORDER_STATUS.SHIPPED),
      delivered: t(ORDER_STATUS.DELIVERED),
      cancelled: t(ORDER_STATUS.CANCELLED),
    },

    // 批量操作
    batch: {
      delete: t(BATCH_ACTIONS.DELETE),
      deleteConfirm: t(BATCH_ACTIONS.DELETE_CONFIRM),
      deleted: t(BATCH_ACTIONS.DELETED),
      deleteFailed: t(BATCH_ACTIONS.DELETE_FAILED),
    },

    // 消息提示
    messages: {
      operationSuccess: t(MESSAGE_KEYS.OPERATION_SUCCESS),
      operationFailed: t(MESSAGE_KEYS.OPERATION_FAILED),
      confirmDelete: t(MESSAGE_KEYS.CONFIRM_DELETE),
      noPermission: t(MESSAGE_KEYS.NO_PERMISSION),
      dataLoadFailed: t(MESSAGE_KEYS.DATA_LOAD_FAILED),
      networkError: t(MESSAGE_KEYS.NETWORK_ERROR),
    },

    // 会员等级
    memberLevels: {
      bronze: t(MEMBER_LEVELS.BRONZE),
      silver: t(MEMBER_LEVELS.SILVER),
      gold: t(MEMBER_LEVELS.GOLD),
      platinum: t(MEMBER_LEVELS.PLATINUM),
      regular: t(MEMBER_LEVELS.REGULAR),
    },
  }
}

/**
 * 简化版Hook - 仅返回t函数和常用快捷方式
 */
export const useT = () => {
  const { t, i18n } = useTranslation()
  
  return {
    t,
    i18n,
    // 常用快捷方式
    tSave: t(COMMON_ACTIONS.SAVE),
    tCancel: t(COMMON_ACTIONS.CANCEL),
    tConfirm: t(COMMON_ACTIONS.CONFIRM),
    tDelete: t(COMMON_ACTIONS.DELETE),
    tEdit: t(COMMON_ACTIONS.EDIT),
    tAdd: t(COMMON_ACTIONS.ADD),
    tLoading: t(COMMON_STATUS.LOADING),
    tSuccess: t(COMMON_STATUS.SUCCESS),
    tError: t(COMMON_STATUS.ERROR),
  }
}

/**
 * 语言切换Hook
 */
export const useLanguage = () => {
  const { i18n } = useTranslation()
  
  const changeLanguage = (lng: 'zh-CN' | 'en-US') => {
    i18n.changeLanguage(lng)
  }
  
  return {
    language: i18n.language as 'zh-CN' | 'en-US',
    changeLanguage,
    isZhCN: i18n.language === 'zh-CN',
    isEnUS: i18n.language === 'en-US',
  }
}

