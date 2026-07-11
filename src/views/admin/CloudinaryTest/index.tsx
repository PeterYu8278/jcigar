// Cloudinary 测试页面
import React from 'react'
import { Card, Typography, Space, Button } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import CloudinaryTest from '../../../components/common/CloudinaryTest'

const { Title, Paragraph } = Typography

const CloudinaryTestPage: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* 页面头部 */}
      <div style={{ marginBottom: '24px' }}>
        <Button 
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/admin/inventory')}
          style={{ marginBottom: '16px' }}
        >
          {t("cloudinaryTest.backToInventory")}
        </Button>
        
        <Title level={2}>{t("cloudinaryTest.title")}</Title>
        <Paragraph>
          {t("cloudinaryTest.subtitle")}
        </Paragraph>
      </div>

      {/* 测试组件 */}
      <CloudinaryTest />

      {/* 使用说明 */}
      <Card title={t("cloudinaryTest.instructionsCard")} style={{ marginTop: '24px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Title level={4}>{t("cloudinaryTest.step1Title")}</Title>
            <Paragraph>
              点击"测试 Cloudinary 连接"按钮，系统会尝试上传一个测试图片到您的 Cloudinary 账户。
              如果成功，您会看到绿色的成功消息和测试图片。
            </Paragraph>
          </div>
          
          <div>
            <Title level={4}>{t("cloudinaryTest.step2Title")}</Title>
            <Paragraph>
              使用下方的图片上传组件，您可以：
              - 点击上传区域选择本地图片
              - 预览上传的图片
              - 删除已上传的图片
              - 查看上传进度和错误信息
            </Paragraph>
          </div>
          
          <div>
            <Title level={4}>{t("cloudinaryTest.step3Title")}</Title>
            <Paragraph>
              {t("cloudinaryTest.step3Desc")}
              <ul>
                <li>Cloud Name: dy2zb1n41</li>
                <li>API Key: 867921412147783</li>
                <li>API Secret: {t("cloudinaryTest.apiSecretHidden")}</li>
              </ul>
            </Paragraph>
          </div>
        </Space>
      </Card>
    </div>
  )
}

export default CloudinaryTestPage
