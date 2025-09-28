// Cloudinary 测试组件
import React, { useState } from 'react'
import { Button, Card, message, Space, Typography } from 'antd'
import { UploadOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { useCloudinary } from '../../hooks/useCloudinary'
import ImageUpload from './ImageUpload'

const { Title, Text } = Typography

const CloudinaryTest: React.FC = () => {
  const { upload, uploading, error } = useCloudinary()
  const [testImageUrl, setTestImageUrl] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<string | null>(null)

  const testConnection = async () => {
    try {
      // 创建一个简单的测试图片文件
      const canvas = document.createElement('canvas')
      canvas.width = 100
      canvas.height = 100
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#FFD700'
        ctx.fillRect(0, 0, 100, 100)
        ctx.fillStyle = '#000'
        ctx.font = '20px Arial'
        ctx.textAlign = 'center'
        ctx.fillText('TEST', 50, 55)
      }
      
      canvas.toBlob(async (blob) => {
        if (blob) {
          const testFile = new File([blob], 'test.png', { type: 'image/png' })
          
          const result = await upload(testFile, {
            folder: 'test'
          })
          
          setTestResult('✅ Cloudinary 连接成功！')
          setTestImageUrl(result.secure_url)
          message.success('Cloudinary 测试成功！')
          
          console.log('Cloudinary 测试结果:', result)
        }
      }, 'image/png')
    } catch (err) {
      setTestResult('❌ Cloudinary 连接失败')
      message.error('Cloudinary 测试失败')
      console.error('Cloudinary 测试错误:', err)
    }
  }

  return (
    <Card title="Cloudinary 测试" style={{ maxWidth: 600, margin: '20px auto' }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <div>
          <Title level={4}>连接测试</Title>
          <Button 
            type="primary" 
            icon={<CheckCircleOutlined />}
            onClick={testConnection}
            loading={uploading}
            style={{ marginBottom: 16 }}
          >
            测试 Cloudinary 连接
          </Button>
          
          {testResult && (
            <div style={{ 
              padding: '12px', 
              background: testResult.includes('✅') ? '#f6ffed' : '#fff2f0',
              border: `1px solid ${testResult.includes('✅') ? '#b7eb8f' : '#ffccc7'}`,
              borderRadius: '6px',
              marginBottom: 16
            }}>
              <Text style={{ color: testResult.includes('✅') ? '#52c41a' : '#ff4d4f' }}>
                {testResult}
              </Text>
            </div>
          )}
          
          {testImageUrl && (
            <div style={{ marginTop: 16 }}>
              <Text strong>测试图片URL:</Text>
              <div style={{ 
                wordBreak: 'break-all', 
                fontSize: '12px', 
                color: '#666',
                marginTop: 4
              }}>
                {testImageUrl}
              </div>
              <img 
                src={testImageUrl} 
                alt="测试图片" 
                style={{ 
                  width: 100, 
                  height: 100, 
                  border: '1px solid #d9d9d9',
                  borderRadius: 4,
                  marginTop: 8
                }} 
              />
            </div>
          )}
        </div>

        <div>
          <Title level={4}>图片上传测试</Title>
            <ImageUpload
              value={testImageUrl || undefined}
              onChange={(url) => setTestImageUrl(url)}
            folder="test"
            maxSize={2 * 1024 * 1024} // 2MB
            width={150}
            height={150}
            showPreview={true}
          />
        </div>

        {error && (
          <div style={{ 
            padding: '12px', 
            background: '#fff2f0',
            border: '1px solid #ffccc7',
            borderRadius: '6px'
          }}>
            <Text style={{ color: '#ff4d4f' }}>
              错误: {error}
            </Text>
          </div>
        )}
      </Space>
    </Card>
  )
}

export default CloudinaryTest
