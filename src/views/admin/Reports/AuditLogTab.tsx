import React, { useState } from 'react';
import { Table, Tag, Space, DatePicker, Select, Input, Card, Button, Tooltip, Modal } from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
  UserOutlined,
  SolutionOutlined,
  ShoppingOutlined,
  DatabaseOutlined,
  TransactionOutlined,
  SettingOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { getAuditLogs } from '../../../services/firebase/auditLog';
import type { AuditLog, AuditLogModule, AuditLogAction } from '../../../types';
import { useTranslation } from 'react-i18next';
import { useFirestoreQuery } from '../../../hooks/useFirestoreQuery';

const { RangePicker } = DatePicker;
const { Option } = Select;

const AuditLogTab: React.FC = () => {
  const { t } = useTranslation();
  const [filters, setFilters] = useState({
    module: undefined as AuditLogModule | undefined,
    action: undefined as AuditLogAction | undefined,
    dateRange: null as [dayjs.Dayjs, dayjs.Dayjs] | null,
    operatorSearch: ''
  });

  const { data: rawLogs = [], loading, refresh } = useFirestoreQuery(
    () => getAuditLogs({
      module: filters.module,
      action: filters.action,
      startDate: filters.dateRange ? filters.dateRange[0].toDate() : undefined,
      endDate: filters.dateRange ? filters.dateRange[1].toDate() : undefined,
      limitCount: 200
    }),
    [filters.module, filters.action, filters.dateRange]
  );

  // Client-side search for operator name (since Firestore prefix search is tricky)
  const logs = filters.operatorSearch
    ? rawLogs.filter(log => {
        const search = filters.operatorSearch.toLowerCase();
        return (
          log.operatorName.toLowerCase().includes(search) ||
          log.description.toLowerCase().includes(search)
        );
      })
    : rawLogs;

  const getModuleIcon = (module: AuditLogModule) => {
    switch (module) {
      case 'users': return <UserOutlined />;
      case 'events': return <SolutionOutlined />;
      case 'orders': return <ShoppingOutlined />;
      case 'inventory': return <DatabaseOutlined />;
      case 'transactions': return <TransactionOutlined />;
      case 'system': return <SettingOutlined />;
      default: return <InfoCircleOutlined />;
    }
  };

  const getActionTag = (action: AuditLogAction) => {
    switch (action) {
      case 'create': return <Tag color="green">{t('reports.actionCreate')}</Tag>;
      case 'update': return <Tag color="blue">{t('reports.actionUpdate')}</Tag>;
      case 'delete': return <Tag color="red">{t('reports.actionDelete')}</Tag>;
      default: return <Tag color="default">{t('reports.actionOther')}</Tag>;
    }
  };

  const columns = [
    {
      title: t('reports.colTimestamp'),
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (date: Date) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
      sorter: (a: AuditLog, b: AuditLog) => a.timestamp.getTime() - b.timestamp.getTime(),
    },
    {
      title: t('reports.colOperator'),
      dataIndex: 'operatorName',
      key: 'operatorName',
      width: 150,
      render: (text: string) => (
        <Space>
          <UserOutlined style={{ color: '#aaa' }} />
          <span style={{ fontWeight: 600 }}>{text}</span>
        </Space>
      ),
    },
    {
      title: t('reports.colModule'),
      dataIndex: 'module',
      key: 'module',
      width: 120,
      render: (module: AuditLogModule) => (
        <Space>
          {getModuleIcon(module)}
          {module.toUpperCase()}
        </Space>
      ),
    },
    {
      title: t('reports.colAction'),
      dataIndex: 'action',
      key: 'action',
      width: 100,
      render: (action: AuditLogAction) => getActionTag(action),
    },
    {
      title: t('common.description'),
      dataIndex: 'description',
      key: 'description',
      render: (text: string) => <span style={{ color: '#EAEAEA' }}>{text}</span>,
    },
    {
      title: t('reports.colDetails'),
      key: 'details',
      width: 80,
      render: (_: any, record: AuditLog) => record.details ? (
        <Tooltip title={t('reports.viewJsonDetails')}>
          <Button 
            type="text" 
            icon={<InfoCircleOutlined />} 
            onClick={() => Modal.info({
              title: t('reports.operationDetails'),
              width: 600,
              content: (
                <pre style={{ 
                  background: '#f5f5f5', 
                  padding: 16, 
                  borderRadius: 8, 
                  maxHeight: 400, 
                  overflow: 'auto',
                  fontSize: 12
                }}>
                  {JSON.stringify(record.details, null, 2)}
                </pre>
              ),
              styles: { body: { padding: 24 } }
            })}
            style={{ color: '#FDE08D' }}
          />
        </Tooltip>
      ) : null,
    }
  ];

  return (
    <div style={{ marginTop: 16 }}>
      <Card 
        styles={{ body: { padding: 16 } }}
        style={{ 
          background: 'rgba(255, 255, 255, 0.02)', 
          border: '1px solid rgba(255, 255, 255, 0.05)',
          marginBottom: 16,
          borderRadius: 12
        }}
      >
        <Space wrap size="middle">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{t('reports.filterModule')}</span>
            <Select 
              allowClear
              placeholder={t('reports.allModules')}
              style={{ width: 140 }}
              value={filters.module}
              onChange={val => setFilters(prev => ({ ...prev, module: val }))}
              className="points-config-form"
            >
              <Option value="users">{t('reports.moduleUsers')}</Option>
              <Option value="events">{t('reports.moduleEvents')}</Option>
              <Option value="orders">{t('reports.moduleOrders')}</Option>
              <Option value="inventory">{t('reports.moduleInventory')}</Option>
              <Option value="transactions">{t('reports.moduleTransactions')}</Option>
              <Option value="system">{t('reports.moduleSystem')}</Option>
            </Select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{t('reports.filterAction')}</span>
            <Select 
              allowClear
              placeholder={t('reports.allActions')}
              style={{ width: 120 }}
              value={filters.action}
              onChange={val => setFilters(prev => ({ ...prev, action: val }))}
              className="points-config-form"
            >
              <Option value="create">{t('reports.actionCreate')}</Option>
              <Option value="update">{t('reports.actionUpdate')}</Option>
              <Option value="delete">{t('reports.actionDelete')}</Option>
              <Option value="other">{t('reports.actionOther')}</Option>
            </Select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{t('reports.filterDateRange')}</span>
            <RangePicker 
              style={{ width: 280 }}
              value={filters.dateRange}
              onChange={val => setFilters(prev => ({ ...prev, dateRange: val as any }))}
              className="points-config-form"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{t('common.search')}</span>
            <Input 
              placeholder={t('reports.operatorSearchPlaceholder')}
              prefix={<SearchOutlined />} 
              style={{ width: 200 }}
              value={filters.operatorSearch}
              onChange={e => setFilters(prev => ({ ...prev, operatorSearch: e.target.value }))}
              onPressEnter={refresh}
              className="points-config-form"
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', height: 48 }}>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={refresh}
              style={{ background: 'transparent', color: '#FDE08D', borderColor: '#C48D3A' }}
            />
          </div>
        </Space>
      </Card>

      <Table 
        columns={columns} 
        dataSource={logs} 
        loading={loading}
        rowKey="id"
        pagination={{ pageSize: 20, showSizeChanger: true }}
        scroll={{ x: 1000 }}
        style={{ background: 'transparent' }}
        rowClassName={() => 'log-table-row'}
        className="points-config-form"
      />

      <style>{`
        .log-table-row:hover td {
          background: rgba(253, 224, 141, 0.05) !important;
        }
        .ant-table {
          background: transparent !important;
          color: #fff !important;
        }
        .ant-table-thead > tr > th {
          background: rgba(255, 255, 255, 0.05) !important;
          color: rgba(255, 255, 255, 0.85) !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
        }
        .ant-table-tbody > tr > td {
          border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
        }
      `}</style>
    </div>
  );
};

export default AuditLogTab;
