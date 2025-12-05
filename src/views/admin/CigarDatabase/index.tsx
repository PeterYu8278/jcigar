/**
 * 雪茄数据库管理页面
 */

import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Input,
  Space,
  Modal,
  message,
  Tag,
  Popconfirm,
  Select,
  Card,
  Row,
  Col,
  Statistic
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ImportOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined
} from '@ant-design/icons';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  deleteDoc,
  doc,
  limit as firestoreLimit,
  startAfter,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { GLOBAL_COLLECTIONS } from '@/config/globalCollections';
import type { CigarDetailedInfo } from '@/types/cigar';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Search } = Input;
const { Option } = Select;

// cigar_database 实际存储的数据结构（统计聚合数据）
interface CigarDatabaseRecord {
  id: string;
  productName: string;
  normalizedName: string;
  brandStats: Record<string, number>;
  originStats: Record<string, number>;
  strengthStats: Record<string, number>;
  wrapperStats: Record<string, number>;
  binderStats: Record<string, number>;
  fillerStats: Record<string, number>;
  flavorProfileStats: Record<string, number>;
  footTasteNotesStats: Record<string, number>;
  bodyTasteNotesStats: Record<string, number>;
  headTasteNotesStats: Record<string, number>;
  ratingSum: number;
  ratingCount: number;
  descriptions: Array<{ text: string; confidence: number; addedAt: string }>;
  totalRecognitions: number;
  lastRecognizedAt: any;
  createdAt: any;
  updatedAt: any;
}

// 辅助函数：从统计对象中获取最常见的值
function getMostFrequentValue(stats: Record<string, number>): { value: string; count: number; percentage: number } | null {
  if (!stats || Object.keys(stats).length === 0) {
    return null;
  }
  const entries = Object.entries(stats);
  const total = entries.reduce((sum, [_, count]) => sum + count, 0);
  entries.sort((a, b) => b[1] - a[1]);
  const [value, count] = entries[0];
  return { value, count, percentage: (count / total) * 100 };
}

export const CigarDatabase: React.FC = () => {
  const [cigars, setCigars] = useState<CigarDatabaseRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [strengthFilter, setStrengthFilter] = useState<string | undefined>();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });
  const [stats, setStats] = useState({
    total: 0,
    totalRecognitions: 0,
    avgRecognitionsPerCigar: 0
  });

  // 加载数据
  const loadCigars = async (page: number = 1) => {
    setLoading(true);
    try {
      const cigarsRef = collection(db, GLOBAL_COLLECTIONS.CIGAR_DATABASE);
      
      // 构建查询
      let q = query(
        cigarsRef,
        orderBy('createdAt', 'desc'),
        firestoreLimit(pagination.pageSize)
      );

      // 注意：cigar_database 中的 strengthStats 是对象，无法直接用 where 查询
      // 搜索功能通过前端过滤实现

      const snapshot = await getDocs(q);
      const cigarList: CigarDatabaseRecord[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        cigarList.push({
          id: docSnap.id,
          productName: data.productName || '',
          normalizedName: data.normalizedName || '',
          brandStats: data.brandStats || {},
          originStats: data.originStats || {},
          strengthStats: data.strengthStats || {},
          wrapperStats: data.wrapperStats || {},
          binderStats: data.binderStats || {},
          fillerStats: data.fillerStats || {},
          flavorProfileStats: data.flavorProfileStats || {},
          footTasteNotesStats: data.footTasteNotesStats || {},
          bodyTasteNotesStats: data.bodyTasteNotesStats || {},
          headTasteNotesStats: data.headTasteNotesStats || {},
          ratingSum: data.ratingSum || 0,
          ratingCount: data.ratingCount || 0,
          descriptions: data.descriptions || [],
          totalRecognitions: data.totalRecognitions || 0,
          lastRecognizedAt: data.lastRecognizedAt,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        });
      });

      setCigars(cigarList);
      setPagination(prev => ({
        ...prev,
        current: page,
        total: cigarList.length // 注意：Firestore 不提供总数，这里简化处理
      }));

      // 加载统计信息
      await loadStats();
    } catch (error) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载统计信息
  const loadStats = async () => {
    try {
      const cigarsRef = collection(db, GLOBAL_COLLECTIONS.CIGAR_DATABASE);
      
      // 获取所有记录计算统计
      const allSnapshot = await getDocs(query(cigarsRef, firestoreLimit(1000)));
      const total = allSnapshot.size;
      
      let totalRecognitions = 0;
      allSnapshot.forEach(doc => {
        const data = doc.data();
        totalRecognitions += (data.totalRecognitions || 0);
      });

      setStats({
        total,
        totalRecognitions,
        avgRecognitionsPerCigar: total > 0 ? Math.round(totalRecognitions / total) : 0
      });
    } catch (error) {
      // Silently fail
    }
  };

  useEffect(() => {
    loadCigars();
  }, [strengthFilter]);

  // 搜索
  const handleSearch = async (value: string) => {
    setSearchText(value);
    if (!value.trim()) {
      loadCigars();
      return;
    }

    setLoading(true);
    try {
      const cigarsRef = collection(db, GLOBAL_COLLECTIONS.CIGAR_DATABASE);
      const snapshot = await getDocs(cigarsRef);
      
      const filtered = snapshot.docs
        .map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            productName: data.productName || '',
            normalizedName: data.normalizedName || '',
            brandStats: data.brandStats || {},
            originStats: data.originStats || {},
            strengthStats: data.strengthStats || {},
            wrapperStats: data.wrapperStats || {},
            binderStats: data.binderStats || {},
            fillerStats: data.fillerStats || {},
            flavorProfileStats: data.flavorProfileStats || {},
            footTasteNotesStats: data.footTasteNotesStats || {},
            bodyTasteNotesStats: data.bodyTasteNotesStats || {},
            headTasteNotesStats: data.headTasteNotesStats || {},
            ratingSum: data.ratingSum || 0,
            ratingCount: data.ratingCount || 0,
            descriptions: data.descriptions || [],
            totalRecognitions: data.totalRecognitions || 0,
            lastRecognizedAt: data.lastRecognizedAt,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
          };
        })
        .filter(cigar => 
          cigar.productName.toLowerCase().includes(value.toLowerCase())
        );

      setCigars(filtered);
    } catch (error) {
      message.error('搜索失败');
    } finally {
      setLoading(false);
    }
  };

  // 删除
  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, GLOBAL_COLLECTIONS.CIGAR_DATABASE, id));
      message.success('删除成功');
      loadCigars();
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 查看详情
  const handleViewDetails = (cigar: CigarDatabaseRecord) => {
    // 显示统计详情的模态框
    const brandResult = getMostFrequentValue(cigar.brandStats);
    const originResult = getMostFrequentValue(cigar.originStats);
    const strengthResult = getMostFrequentValue(cigar.strengthStats);
    const wrapperResult = getMostFrequentValue(cigar.wrapperStats);
    const binderResult = getMostFrequentValue(cigar.binderStats);
    const fillerResult = getMostFrequentValue(cigar.fillerStats);
    
    const avgRating = cigar.ratingCount > 0 
      ? (cigar.ratingSum / cigar.ratingCount).toFixed(1) 
      : null;
    
    const latestDescription = cigar.descriptions.length > 0
      ? cigar.descriptions[cigar.descriptions.length - 1].text
      : '暂无描述';
    
    Modal.info({
      title: cigar.productName,
      width: 800,
      content: (
        <div>
          <p><strong>识别次数:</strong> {cigar.totalRecognitions} 次</p>
          <p><strong>品牌:</strong> {brandResult?.value || '-'} (一致性: {brandResult?.percentage.toFixed(0) || 0}%)</p>
          <p><strong>产地:</strong> {originResult?.value || '-'} (一致性: {originResult?.percentage.toFixed(0) || 0}%)</p>
          <p><strong>强度:</strong> {strengthResult?.value || '-'} (一致性: {strengthResult?.percentage.toFixed(0) || 0}%)</p>
          <p><strong>平均评分:</strong> {avgRating || '-'} {cigar.ratingCount > 0 && `(基于 ${cigar.ratingCount} 次)`}</p>
          <p><strong>茄衣:</strong> {wrapperResult?.value || '-'}</p>
          <p><strong>茄套:</strong> {binderResult?.value || '-'}</p>
          <p><strong>茄芯:</strong> {fillerResult?.value || '-'}</p>
          <p><strong>描述:</strong> {latestDescription}</p>
        </div>
      ),
      okText: '关闭'
    });
  };

  // 表格列定义
  const columns: ColumnsType<CigarDatabaseRecord> = [
    {
      title: '产品名称',
      dataIndex: 'productName',
      key: 'productName',
      width: 250,
      fixed: 'left',
      render: (text: string, record: CigarDatabaseRecord) => {
        const brandResult = getMostFrequentValue(record.brandStats);
        return (
          <div>
            <strong>{text}</strong>
            {brandResult && (
              <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                品牌: {brandResult.value}
              </div>
            )}
          </div>
        );
      }
    },
    {
      title: '识别次数',
      dataIndex: 'totalRecognitions',
      key: 'totalRecognitions',
      width: 100,
      sorter: (a, b) => a.totalRecognitions - b.totalRecognitions,
      render: (count: number) => (
        <Tag color={count >= 10 ? 'gold' : count >= 5 ? 'blue' : 'default'}>
          {count} 次
        </Tag>
      )
    },
    {
      title: '强度',
      key: 'strength',
      width: 140,
      render: (_: any, record: CigarDatabaseRecord) => {
        const strengthResult = getMostFrequentValue(record.strengthStats);
        if (!strengthResult) return '-';
        
        const colorMap: Record<string, string> = {
          'mild': 'green',
          'medium-mild': 'cyan',
          'medium': 'blue',
          'medium-full': 'orange',
          'full': 'red'
        };
        return (
          <div>
            <Tag color={colorMap[strengthResult.value.toLowerCase()] || 'default'}>
              {strengthResult.value}
            </Tag>
            <div style={{ fontSize: '11px', color: '#888' }}>
              一致性: {strengthResult.percentage.toFixed(0)}%
            </div>
          </div>
        );
      }
    },
    {
      title: '产地',
      key: 'origin',
      width: 140,
      render: (_: any, record: CigarDatabaseRecord) => {
        const originResult = getMostFrequentValue(record.originStats);
        if (!originResult) return '-';
        return (
          <div>
            <div>{originResult.value}</div>
            <div style={{ fontSize: '11px', color: '#888' }}>
              一致性: {originResult.percentage.toFixed(0)}%
            </div>
          </div>
        );
      }
    },
    {
      title: '平均评分',
      key: 'rating',
      width: 120,
      render: (_: any, record: CigarDatabaseRecord) => {
        if (record.ratingCount === 0) return '-';
        const avgRating = (record.ratingSum / record.ratingCount).toFixed(1);
        return (
          <div>
            <Tag color="gold">{avgRating}</Tag>
            <div style={{ fontSize: '11px', color: '#888' }}>
              基于 {record.ratingCount} 次
            </div>
          </div>
        );
      }
    },
    {
      title: '最后识别',
      dataIndex: 'lastRecognizedAt',
      key: 'lastRecognizedAt',
      width: 180,
      render: (timestamp: any) => {
        if (!timestamp) return '-';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return dayjs(date).format('YYYY-MM-DD HH:mm');
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetails(record)}
          >
            详情
          </Button>
          <Popconfirm
            title="确定要删除这条记录吗？此操作将删除所有AI识别统计数据。"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic 
              title="雪茄总数" 
              value={stats.total} 
              suffix="种"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="总识别次数"
              value={stats.totalRecognitions}
              suffix="次"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="平均识别次数"
              value={stats.avgRecognitionsPerCigar}
              suffix="次/种"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 工具栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '14px', color: '#888' }}>
            AI识别数据库（只读，通过智能扫描自动累积）
          </div>
          <Space>
            <Search
              placeholder="搜索产品名称"
              allowClear
              style={{ width: 300 }}
              onSearch={handleSearch}
              onChange={(e) => {
                if (!e.target.value) {
                  handleSearch('');
                }
              }}
            />
          </Space>
        </Space>
      </Card>

      {/* 数据表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={cigars}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`
          }}
          scroll={{ x: 1500 }}
        />
      </Card>
    </div>
  );
};

export default CigarDatabase;

