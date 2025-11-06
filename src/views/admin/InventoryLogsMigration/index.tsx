// 库存记录迁移 - 去除 ORDER: 前缀（临时工具）
import React, { useState } from 'react';
import { Card, Button, Space, Typography, Alert, Table, Tag, App, Progress, Spin } from 'antd';
import { ThunderboltOutlined, CheckCircleOutlined, CloseCircleOutlined, SyncOutlined } from '@ant-design/icons';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useTranslation } from 'react-i18next';

const { Title, Text, Paragraph } = Typography;

interface LogRecord {
  id: string;
  referenceNo: string;
  oldReferenceNo: string;
  newReferenceNo: string;
  cigarId: string;
  type: string;
  quantity: number;
  reason: string;
}

const InventoryLogsMigration: React.FC = () => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [affectedLogs, setAffectedLogs] = useState<LogRecord[]>([]);
  const [migrationResults, setMigrationResults] = useState<{
    success: number;
    failed: number;
    errors: Array<{ id: string; error: string }>;
  } | null>(null);
  const [progress, setProgress] = useState(0);

  // 分析需要处理的记录
  const analyzeRecords = async () => {
    console.log('🔍 [Migration] 开始分析记录...');
    console.log('🔍 [Migration] Firestore db 实例:', db);
    setAnalyzing(true);
    setAffectedLogs([]);
    setMigrationResults(null);

    try {
      console.log('📊 [Migration] 获取 inventoryLogs 集合...');
      const logsRef = collection(db, 'inventoryLogs');
      console.log('📊 [Migration] Collection 引用:', logsRef);
      
      const snapshot = await getDocs(logsRef);
      console.log('📊 [Migration] Snapshot:', snapshot);
      console.log(`📊 [Migration] 获取到 ${snapshot.docs.length} 条记录`);
      console.log('📊 [Migration] Snapshot.empty:', snapshot.empty);
      console.log('📊 [Migration] Snapshot.size:', snapshot.size);
      
      const affected: LogRecord[] = [];
      const allRecords: any[] = [];
      
      snapshot.docs.forEach((docSnap, index) => {
        const data = docSnap.data();
        const referenceNo = data.referenceNo || '';
        
        console.log(`📄 [Migration] 记录 ${index + 1}:`, {
          id: docSnap.id,
          referenceNo: referenceNo,
          type: data.type,
          reason: data.reason
        });
        
        allRecords.push({
          id: docSnap.id,
          referenceNo: referenceNo,
          hasPrefix: referenceNo.startsWith('ORDER:')
        });
        
        // 查找所有带 ORDER: 前缀的记录
        if (referenceNo.startsWith('ORDER:')) {
          const newReferenceNo = referenceNo.replace(/^ORDER:/, '');
          console.log(`🔍 [Migration] 找到待处理记录: ${referenceNo} -> ${newReferenceNo}`);
          affected.push({
            id: docSnap.id,
            referenceNo: referenceNo,
            oldReferenceNo: referenceNo,
            newReferenceNo: newReferenceNo,
            cigarId: data.cigarId || '',
            type: data.type || '',
            quantity: data.quantity || 0,
            reason: data.reason || ''
          });
        }
      });

      console.log('📋 [Migration] 所有记录汇总:', allRecords);
      console.log(`✅ [Migration] 分析完成，找到 ${affected.length} 条待处理记录`);
      setAffectedLogs(affected);
      
      if (affected.length === 0) {
        message.success(t('inventoryLogsMigration.noRecordsToMigrate'));
      } else {
        message.info(t('inventoryLogsMigration.foundRecords', { count: affected.length }));
      }
    } catch (error: any) {
      console.error('❌ [Migration] 分析失败:', error);
      console.error('❌ [Migration] Error stack:', error.stack);
      console.error('❌ [Migration] Error code:', error.code);
      message.error(t('inventoryLogsMigration.analyzeFailed') + ': ' + error.message);
    } finally {
      setAnalyzing(false);
    }
  };

  // 执行迁移
  const executeMigration = async () => {
    if (affectedLogs.length === 0) {
      message.warning(t('inventoryLogsMigration.noRecordsToMigrate'));
      return;
    }

    console.log(`⚡ [Migration] 开始迁移 ${affectedLogs.length} 条记录...`);
    setMigrating(true);
    setProgress(0);

    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ id: string; error: string }>
    };

    for (let i = 0; i < affectedLogs.length; i++) {
      const log = affectedLogs[i];
      
      try {
        const logRef = doc(db, 'inventoryLogs', log.id);
        await updateDoc(logRef, {
          referenceNo: log.newReferenceNo
        });
        console.log(`✅ [Migration] 成功更新 ${i + 1}/${affectedLogs.length}: ${log.oldReferenceNo} -> ${log.newReferenceNo}`);
        results.success++;
      } catch (error: any) {
        console.error(`❌ [Migration] 更新失败 ${i + 1}/${affectedLogs.length}:`, error);
        results.failed++;
        results.errors.push({
          id: log.id,
          error: error.message
        });
      }

      // 更新进度
      setProgress(Math.round(((i + 1) / affectedLogs.length) * 100));
    }

    console.log(`🎉 [Migration] 迁移完成 - 成功: ${results.success}, 失败: ${results.failed}`);
    setMigrationResults(results);
    
    if (results.success > 0) {
      message.success(t('inventoryLogsMigration.migrationComplete', {
        success: results.success,
        failed: results.failed
      }));
    }

    setMigrating(false);
  };

  const columns = [
    {
      title: t('inventoryLogsMigration.oldReference'),
      dataIndex: 'oldReferenceNo',
      key: 'oldReferenceNo',
      width: 200,
      render: (text: string) => <Text type="danger" code>{text}</Text>
    },
    {
      title: '→',
      key: 'arrow',
      width: 50,
      align: 'center' as const,
      render: () => '→'
    },
    {
      title: t('inventoryLogsMigration.newReference'),
      dataIndex: 'newReferenceNo',
      key: 'newReferenceNo',
      width: 200,
      render: (text: string) => <Text type="success" code>{text}</Text>
    },
    {
      title: t('inventoryLogsMigration.type'),
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => {
        const color = type === 'in' ? 'green' : type === 'out' ? 'red' : 'blue';
        return <Tag color={color}>{type}</Tag>;
      }
    },
    {
      title: t('inventoryLogsMigration.quantity'),
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100
    },
    {
      title: t('inventoryLogsMigration.reason'),
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true
    }
  ];

  const errorColumns = [
    {
      title: t('inventoryLogsMigration.logId'),
      dataIndex: 'id',
      key: 'id'
    },
    {
      title: t('inventoryLogsMigration.error'),
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
            <Title level={4}>{t('inventoryLogsMigration.title')}</Title>
            <Text type="secondary">{t('inventoryLogsMigration.description')}</Text>
          </div>

          <Alert
            message={t('inventoryLogsMigration.warning')}
            description={t('inventoryLogsMigration.warningDescription')}
            type="warning"
            showIcon
          />

          <Space>
            <Button
              type="primary"
              icon={<SyncOutlined spin={analyzing} />}
              onClick={analyzeRecords}
              loading={analyzing}
              disabled={migrating}
            >
              {analyzing ? '分析中...' : t('inventoryLogsMigration.analyzeRecords')}
            </Button>

            {affectedLogs.length > 0 && !migrating && (
              <Button
                type="primary"
                danger
                icon={<ThunderboltOutlined />}
                onClick={executeMigration}
                disabled={analyzing || migrationResults !== null}
              >
                {t('inventoryLogsMigration.startMigration', { count: affectedLogs.length })}
              </Button>
            )}
          </Space>

          {/* 分析中加载状态 */}
          {analyzing && (
            <Card type="inner">
              <Space>
                <Spin />
                <Text>正在扫描 inventoryLogs 集合，请稍候...</Text>
              </Space>
            </Card>
          )}

          {/* 分析结果 */}
          {affectedLogs.length > 0 && (
            <>
              <Alert
                message={t('inventoryLogsMigration.foundRecords', { count: affectedLogs.length })}
                description={t('inventoryLogsMigration.reviewChanges')}
                type="info"
                showIcon
              />

              <Table
                columns={columns}
                dataSource={affectedLogs}
                rowKey="id"
                pagination={{
                  pageSize: 20,
                  showTotal: (total) => t('common.paginationTotal', {
                    start: 1,
                    end: Math.min(20, total),
                    total
                  })
                }}
                size="small"
              />
            </>
          )}

          {/* 迁移进度 */}
          {migrating && (
            <Card type="inner">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text strong>{t('inventoryLogsMigration.migrating')}</Text>
                <Progress percent={progress} status="active" />
                <Text type="secondary">
                  {t('inventoryLogsMigration.processed', {
                    current: Math.round((progress / 100) * affectedLogs.length),
                    total: affectedLogs.length
                  })}
                </Text>
              </Space>
            </Card>
          )}

          {/* 迁移结果 */}
          {migrationResults && (
            <>
              <Alert
                message={t('inventoryLogsMigration.migrationComplete', {
                  success: migrationResults.success,
                  failed: migrationResults.failed
                })}
                description={
                  <Space size="large">
                    <div>
                      <Tag color="green" icon={<CheckCircleOutlined />}>
                        {t('inventoryLogsMigration.successCount')}: {migrationResults.success}
                      </Tag>
                    </div>
                    <div>
                      <Tag color="red" icon={<CloseCircleOutlined />}>
                        {t('inventoryLogsMigration.failedCount')}: {migrationResults.failed}
                      </Tag>
                    </div>
                  </Space>
                }
                type={migrationResults.failed === 0 ? 'success' : 'warning'}
                showIcon
              />

              {migrationResults.errors.length > 0 && (
                <div>
                  <Text strong>{t('inventoryLogsMigration.failedRecords')}:</Text>
                  <Table
                    columns={errorColumns}
                    dataSource={migrationResults.errors}
                    rowKey="id"
                    pagination={false}
                    size="small"
                    style={{ marginTop: 8 }}
                  />
                </div>
              )}
            </>
          )}
        </Space>
      </Card>
    </div>
  );
};

export default InventoryLogsMigration;

