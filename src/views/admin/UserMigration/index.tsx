// 用户数据迁移管理页面
import React, { useState } from 'react';
import { Card, Form, Input, Button, Space, Typography, Alert, Divider, Switch, Spin, Table, Tag, message } from 'antd';
import { SwapOutlined, CheckCircleOutlined, CloseCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { migrateUserToNewId, batchMigrateUsers, checkUserExists } from '../../../utils/userMigration';
import { useTranslation } from 'react-i18next';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const UserMigration: React.FC = () => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [batchForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [deleteSource, setDeleteSource] = useState(false);
  const [migrationResults, setMigrationResults] = useState<any>(null);
  const [migrationLog, setMigrationLog] = useState<string[]>([]);

  // 添加日志
  const addLog = (msg: string) => {
    setMigrationLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  // 单个用户迁移
  const handleSingleMigration = async (values: { sourceUserId: string; targetUserId: string }) => {
    setLoading(true);
    setMigrationResults(null);
    setMigrationLog([]);

    try {
      addLog(`开始迁移: ${values.sourceUserId} → ${values.targetUserId}`);

      // 检查源用户是否存在
      addLog('检查源用户是否存在...');
      const sourceExists = await checkUserExists(values.sourceUserId);
      if (!sourceExists) {
        addLog('❌ 源用户不存在');
        message.error(t('userMigration.sourceUserNotFound'));
        setLoading(false);
        return;
      }
      addLog('✅ 源用户存在');

      // 检查目标用户ID是否已存在
      addLog('检查目标用户ID是否可用...');
      const targetExists = await checkUserExists(values.targetUserId);
      if (targetExists) {
        addLog('❌ 目标用户ID已存在');
        message.error(t('userMigration.targetUserExists'));
        setLoading(false);
        return;
      }
      addLog('✅ 目标用户ID可用');

      addLog('开始数据迁移...');
      const result = await migrateUserToNewId(
        values.sourceUserId,
        values.targetUserId,
        deleteSource
      );

      if (result.success) {
        addLog('✅ 迁移成功完成');
        message.success(t('userMigration.migrationSuccess'));
        setMigrationResults({
          type: 'single',
          success: true,
          sourceId: values.sourceUserId,
          targetId: values.targetUserId
        });
        form.resetFields();
      } else {
        addLog(`❌ 迁移失败: ${result.error}`);
        message.error(result.error || t('userMigration.migrationFailed'));
        setMigrationResults({
          type: 'single',
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      addLog(`❌ 异常错误: ${error.message}`);
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // 批量迁移
  const handleBatchMigration = async (values: { migrations: string }) => {
    setLoading(true);
    setMigrationResults(null);

    try {
      // 解析迁移映射
      const lines = values.migrations.split('\n').filter(line => line.trim());
      const migrations: Record<string, string> = {};

      for (const line of lines) {
        const [source, target] = line.split(',').map(s => s.trim());
        if (source && target) {
          migrations[source] = target;
        }
      }

      if (Object.keys(migrations).length === 0) {
        message.error(t('userMigration.noValidMappings'));
        setLoading(false);
        return;
      }

      const result = await batchMigrateUsers(migrations, deleteSource);

      setMigrationResults({
        type: 'batch',
        ...result
      });

      if (result.success > 0) {
        message.success(t('userMigration.batchMigrationComplete', {
          success: result.success,
          failed: result.failed
        }));
      }

      if (result.failed > 0) {
        message.warning(t('userMigration.someMigrationsFailed', { count: result.failed }));
      }

      if (result.success > 0) {
        batchForm.resetFields();
      }
    } catch (error: any) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // 批量迁移错误列表列定义
  const errorColumns = [
    {
      title: t('userMigration.sourceUserId'),
      dataIndex: 'sourceId',
      key: 'sourceId'
    },
    {
      title: t('userMigration.targetUserId'),
      dataIndex: 'targetId',
      key: 'targetId'
    },
    {
      title: t('userMigration.error'),
      dataIndex: 'error',
      key: 'error',
      render: (text: string) => <Text type="danger">{text}</Text>
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={4}>{t('userMigration.title')}</Title>
            <Text type="secondary">{t('userMigration.description')}</Text>
          </div>

          <Alert
            message={t('userMigration.warning')}
            description={t('userMigration.warningDescription')}
            type="warning"
            showIcon
            icon={<WarningOutlined />}
          />

          {/* 删除源文档选项 */}
          <Card type="inner" size="small">
            <Space>
              <Switch 
                checked={deleteSource} 
                onChange={setDeleteSource}
              />
              <Text>{t('userMigration.deleteSourceOption')}</Text>
              <Text type="secondary">({t('userMigration.deleteSourceHint')})</Text>
            </Space>
          </Card>

          <Divider>{t('userMigration.singleMigration')}</Divider>

          {/* 单个用户迁移表单 */}
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSingleMigration}
          >
            <Form.Item
              label={t('userMigration.sourceUserId')}
              name="sourceUserId"
              rules={[{ required: true, message: t('userMigration.sourceUserIdRequired') }]}
            >
              <Input 
                placeholder={t('userMigration.sourceUserIdPlaceholder')} 
                disabled={loading}
              />
            </Form.Item>

            <Form.Item
              label={t('userMigration.targetUserId')}
              name="targetUserId"
              rules={[{ required: true, message: t('userMigration.targetUserIdRequired') }]}
            >
              <Input 
                placeholder={t('userMigration.targetUserIdPlaceholder')} 
                disabled={loading}
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SwapOutlined />}
                loading={loading}
                block
              >
                {t('userMigration.startMigration')}
              </Button>
            </Form.Item>
          </Form>

          <Divider>{t('userMigration.batchMigration')}</Divider>

          {/* 批量迁移表单 */}
          <Form
            form={batchForm}
            layout="vertical"
            onFinish={handleBatchMigration}
          >
            <Form.Item
              label={t('userMigration.migrationMappings')}
              name="migrations"
              rules={[{ required: true, message: t('userMigration.mappingsRequired') }]}
              extra={
                <Text type="secondary">
                  {t('userMigration.mappingsFormat')}
                  <br />
                  {t('userMigration.mappingsExample')}
                </Text>
              }
            >
              <TextArea
                rows={8}
                placeholder={t('userMigration.mappingsPlaceholder')}
                disabled={loading}
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SwapOutlined />}
                loading={loading}
                block
              >
                {t('userMigration.startBatchMigration')}
              </Button>
            </Form.Item>
          </Form>

          {/* 迁移日志 */}
          {migrationLog.length > 0 && (
            <>
              <Divider>{t('userMigration.migrationLog')}</Divider>
              <Card type="inner" size="small">
                <div style={{ 
                  maxHeight: '200px', 
                  overflowY: 'auto', 
                  fontFamily: 'monospace', 
                  fontSize: '12px',
                  background: '#000',
                  color: '#0f0',
                  padding: '12px',
                  borderRadius: '4px'
                }}>
                  {migrationLog.map((log, index) => (
                    <div key={index}>{log}</div>
                  ))}
                </div>
              </Card>
            </>
          )}

          {/* 迁移结果显示 */}
          {migrationResults && (
            <>
              <Divider>{t('userMigration.migrationResults')}</Divider>
              
              {migrationResults.type === 'single' ? (
                <Alert
                  message={migrationResults.success ? t('userMigration.migrationSuccess') : t('userMigration.migrationFailed')}
                  description={
                    migrationResults.success ? (
                      <div>
                        <Text>{t('userMigration.sourceUserId')}: {migrationResults.sourceId}</Text>
                        <br />
                        <Text>{t('userMigration.targetUserId')}: {migrationResults.targetId}</Text>
                      </div>
                    ) : (
                      <Text type="danger">{migrationResults.error}</Text>
                    )
                  }
                  type={migrationResults.success ? 'success' : 'error'}
                  showIcon
                />
              ) : (
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Card type="inner" size="small">
                    <Space size="large">
                      <div>
                        <Tag color="green" icon={<CheckCircleOutlined />}>
                          {t('userMigration.successCount')}: {migrationResults.success}
                        </Tag>
                      </div>
                      <div>
                        <Tag color="red" icon={<CloseCircleOutlined />}>
                          {t('userMigration.failedCount')}: {migrationResults.failed}
                        </Tag>
                      </div>
                    </Space>
                  </Card>

                  {migrationResults.errors && migrationResults.errors.length > 0 && (
                    <div>
                      <Text strong>{t('userMigration.failedMigrations')}:</Text>
                      <Table
                        columns={errorColumns}
                        dataSource={migrationResults.errors}
                        rowKey={(record) => `${record.sourceId}-${record.targetId}`}
                        pagination={false}
                        size="small"
                        style={{ marginTop: 8 }}
                      />
                    </div>
                  )}
                </Space>
              )}
            </>
          )}
        </Space>
      </Card>
    </div>
  );
};

export default UserMigration;

