import React from 'react'
import { Descriptions, Input, Select, DatePicker, InputNumber, Tag, Progress, Space, Switch } from 'antd'
import { EditOutlined, DeleteOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { Event } from '../../types'
import ImageUpload from '../common/ImageUpload'
import { useTranslation } from 'react-i18next'

const { Option } = Select

interface EventDetailsViewProps {
  event: Event
  isEditing: boolean
  editForm: any
  onEditFormChange: (form: any) => void
  onSaveField: (fieldName: string) => Promise<void>
  onToggleEdit: () => void
  onDelete: () => void
  onImageChange: (url: string | null) => Promise<void>
}

const EventDetailsView: React.FC<EventDetailsViewProps> = ({
  event,
  isEditing,
  editForm,
  onEditFormChange,
  onSaveField,
  onToggleEdit,
  onDelete,
  onImageChange
}) => {
  const { t } = useTranslation()

  return (
    <div>
      {/* 活动基本信息 - 左右布局 */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
        {/* 左侧：活动名称和描述 */}
        <div style={{ flex: 1 }}>
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label={t('events.eventName')}>
              {isEditing ? (
                <Input
                  value={editForm.title}
                  onChange={(e) => onEditFormChange({...editForm, title: e.target.value})}
                  autoFocus
                />
              ) : (
                <span style={{ fontWeight: 'bold', fontSize: '16px' }}>
                  {event.title}
                </span>
              )}
            </Descriptions.Item>
            <Descriptions.Item label={t('events.description')}>
              {isEditing ? (
                <Input.TextArea
                  value={editForm.description}
                  onChange={(e) => onEditFormChange({...editForm, description: e.target.value})}
                  autoFocus
                  rows={3}
                />
              ) : (
                <div style={{ maxHeight: '100px', overflow: 'auto' }}>
                  {(event as any).description || t('common.noDescription')}
                </div>
              )}
            </Descriptions.Item>
            <Descriptions.Item label={t('events.location')}>
              {isEditing ? (
                <Input
                  value={editForm.locationName}
                  onChange={(e) => onEditFormChange({...editForm, locationName: e.target.value})}
                  autoFocus
                />
              ) : (
                <div>
                  {(event as any)?.location?.name || '-'}
                  {(event as any)?.location?.address && (
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                      {(event as any).location.address}
                    </div>
                  )}
                </div>
              )}
            </Descriptions.Item>
            
          </Descriptions>
        </div>
        
        {/* 右侧：活动图片上传 */}
        <div style={{ width: '150px', flexShrink: 0 }}>
          <div style={{ 
            padding: '16px', 
            border: '1px solid #d9d9d9', 
            borderRadius: '6px',
            background: '#fafafa'
          }}>
            <div style={{ 
              fontSize: '14px', 
              fontWeight: '600', 
              marginBottom: '8px',
              color: '#262626'
            }}>
              {t('common.eventImage')}
            </div>
            <ImageUpload
              value={(event as any).image || undefined}
              onChange={(url) => {
                if (!url) return
                onEditFormChange({...editForm, image: url})
              }}
              folder="events"
              maxSize={2 * 1024 * 1024} // 2MB
              width={100}
              height={100}
              showPreview={true}
            />
          </div>
        </div>
      </div>
      
      {/* 其他活动信息 */}
      <Descriptions bordered column={2} size="small">
        <Descriptions.Item label={t('events.status')}>
          {isEditing ? (
             <Select
               value={editForm.status}
               onChange={(value) => onEditFormChange({...editForm, status: value})}
               style={{ width: '100%' }}
               autoFocus
             >
              <Option value="draft">{t('events.draft')}</Option>
              <Option value="published">{t('events.published')}</Option>
              <Option value="ongoing">{t('events.ongoing')}</Option>
              <Option value="completed">{t('events.completed')}</Option>
              <Option value="cancelled">{t('events.cancelled')}</Option>
            </Select>
          ) : (
            <Tag 
              color={
                event.status === 'published' ? 'blue' :
                event.status === 'ongoing' ? 'green' :
                event.status === 'completed' ? 'default' :
                event.status === 'cancelled' ? 'red' : 'default'
              }
            >
              {event.status === 'published' ? t('events.published') :
               event.status === 'ongoing' ? t('events.ongoing') :
               event.status === 'completed' ? t('events.completed') :
               event.status === 'cancelled' ? t('events.cancelled') :
               event.status === 'draft' ? t('events.draft') : event.status}
            </Tag>
          )}
        </Descriptions.Item>
        <Descriptions.Item label={t('common.privateEvent')}>
          {isEditing ? (
              <Switch
                checked={editForm.isPrivate}
                onChange={(checked) => onEditFormChange({...editForm, isPrivate: checked})}
              />
          ) : (
            <Tag color={event.isPrivate ? 'orange' : 'default'}>
              {event.isPrivate ? t('common.private') : t('common.public')}
            </Tag>
          )}
        </Descriptions.Item>
        <Descriptions.Item label={t('events.startTime')}>
          {isEditing ? (
              <DatePicker
                value={editForm.startDate}
                onChange={(date) => onEditFormChange({...editForm, startDate: date})}
                style={{ width: '100%' }}
                autoFocus
                showTime={{ format: 'HH:mm' }}
                format="YYYY-MM-DD HH:mm"
              />
          ) : (
            <span>
              {(() => {
                const s = (event as any)?.schedule?.startDate
                const sd = (s as any)?.toDate ? (s as any).toDate() : s
                return sd ? new Date(sd).toLocaleString() : '-'
              })()}
            </span>
          )}
        </Descriptions.Item>
        <Descriptions.Item label={t('events.endTime')}>
          {isEditing ? (
              <DatePicker
                value={editForm.endDate}
                onChange={(date) => onEditFormChange({...editForm, endDate: date})}
                style={{ width: '100%' }}
                autoFocus
                showTime={{ format: 'HH:mm' }}
                format="YYYY-MM-DD HH:mm"
              />
          ) : (
            <span>
              {(() => {
                const e = (event as any)?.schedule?.endDate
                const ed = (e as any)?.toDate ? (e as any).toDate() : e
                return ed ? new Date(ed).toLocaleString() : '-'
              })()}
            </span>
          )}
        </Descriptions.Item>
        <Descriptions.Item label={t('events.fee')}>
          {isEditing ? (
            <InputNumber
              value={editForm.fee}
              onChange={(value) => onEditFormChange({...editForm, fee: value})}
              style={{ width: '100%' }}
              autoFocus
              min={0}
              addonBefore="RM"
            />
          ) : (
            <span style={{ color: '#f5222d', fontWeight: 'bold' }}>
              RM{(event as any)?.participants?.fee ?? 0}
            </span>
          )}
        </Descriptions.Item>
        <Descriptions.Item label={t('events.maxParticipants')}>
          {isEditing ? (
            <InputNumber
              value={editForm.maxParticipants}
              onChange={(value) => onEditFormChange({...editForm, maxParticipants: value})}
              style={{ width: '100%' }}
              autoFocus
              min={0}
              addonAfter={t('events.people')}
            />
          ) : (
            <span>
              {(() => {
                const maxP = (event as any)?.participants?.maxParticipants ?? 0
                return maxP === 0 ? t('events.noLimit') : `${maxP} ${t('events.people')}`
              })()}
            </span>
          )}
        </Descriptions.Item>
        <Descriptions.Item label={t('events.currentParticipants')}>
          <span style={{ color: '#52c41a', fontWeight: 'bold' }}>
            {((event as any)?.participants?.registered || []).length} {t('events.people')}
          </span>
        </Descriptions.Item>
        <Descriptions.Item label={t('events.registrationProgress')}>
          {(() => {
            const registered = ((event as any)?.participants?.registered || []).length
            const max = (event as any)?.participants?.maxParticipants ?? 0
            const percentage = max > 0 ? Math.round((registered / max) * 100) : 0
            return (
              <Progress 
                percent={percentage} 
                size="small" 
                status={percentage >= 100 ? 'exception' : 'active'}
              />
            )
          })()}
        </Descriptions.Item>
        <Descriptions.Item label={t('events.createdAt')}>
          {(event as any)?.createdAt ? new Date((event as any).createdAt).toLocaleString() : '-'}
        </Descriptions.Item>
        <Descriptions.Item label={t('events.updatedAt')}>
          {(event as any)?.updatedAt ? new Date((event as any).updatedAt).toLocaleString() : '-'}
        </Descriptions.Item>
      </Descriptions>
      
      {/* 操作按钮区域 */}
      <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #f0f0f0' }}>
        <Space wrap>
          <button 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8, 
              padding: '8px 16px', 
              borderRadius: 8, 
              background: 'linear-gradient(to right,#FDE08D,#C48D3A)', 
              color: '#111', 
              fontWeight: 600, 
              cursor: 'pointer', 
              transition: 'all 0.2s ease' 
            }}
            onClick={async () => {
              if (isEditing) {
                // 编辑模式下，保存所有更改并退出编辑模式
                try {
                  // 保存所有字段
                  const fieldsToSave = ['title', 'description', 'status', 'isPrivate', 'locationName', 'fee', 'maxParticipants', 'image']
                  for (const field of fieldsToSave) {
                    if (editForm[field] !== undefined) {
                      await onSaveField(field)
                    }
                  }
                  // 保存日期字段（startDate 会同时保存 endDate）
                  if (editForm.startDate !== undefined) {
                    await onSaveField('startDate')
                  } else if (editForm.endDate !== undefined) {
                    await onSaveField('endDate')
                  }
                  // 退出编辑模式
                  onToggleEdit()
                } catch (error) {
                }
              } else {
                // 非编辑模式下，进入编辑模式
                onToggleEdit()
              }
            }}
          >
            <EditOutlined />
            {isEditing ? t('common.save') : t('common.editEvent')}
          </button>
          {isEditing && (
            <button 
              style={{ 
                padding: '8px 16px', 
                borderRadius: 8, 
                background: 'rgba(255,255,255,0.1)', 
                color: '#ccc', 
                cursor: 'pointer', 
                transition: 'all 0.2s ease' 
              }}
              onClick={() => {
                onEditFormChange({})
                onToggleEdit()
              }}
            >
              {t('common.cancelEdit')}
            </button>
          )}
          <button 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8, 
              padding: '8px 16px', 
              borderRadius: 8, 
              background: '#ff4d4f', 
              color: '#fff', 
              cursor: 'pointer', 
              transition: 'all 0.2s ease' 
            }}
            onClick={onDelete}
          >
            <DeleteOutlined />
            {t('common.deleteEvent')}
          </button>
        </Space>
      </div>
    </div>
  )
}

export default EventDetailsView
