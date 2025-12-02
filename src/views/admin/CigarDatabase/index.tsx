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
  CloseCircleOutlined
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
import { CigarForm } from './CigarForm';
import { CigarImport } from './CigarImport';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Search } = Input;
const { Option } = Select;

export const CigarDatabase: React.FC = () => {
  const [cigars, setCigars] = useState<CigarDetailedInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [strengthFilter, setStrengthFilter] = useState<string | undefined>();
  const [verifiedFilter, setVerifiedFilter] = useState<boolean | undefined>();
  const [modalVisible, setModalVisible] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [editingCigar, setEditingCigar] = useState<CigarDetailedInfo | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });
  const [stats, setStats] = useState({
    total: 0,
    verified: 0,
    unverified: 0
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

      // 应用过滤器
      if (verifiedFilter !== undefined) {
        q = query(q, where('verified', '==', verifiedFilter));
      }
      if (strengthFilter) {
        q = query(q, where('strength', '==', strengthFilter));
      }

      const snapshot = await getDocs(q);
      const cigarList: CigarDetailedInfo[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        cigarList.push({
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          ratingDate: data.ratingDate?.toDate() || null
        } as CigarDetailedInfo);
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
      console.error('加载雪茄数据失败:', error);
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载统计信息
  const loadStats = async () => {
    try {
      const cigarsRef = collection(db, GLOBAL_COLLECTIONS.CIGAR_DATABASE);
      
      // 总数
      const allSnapshot = await getDocs(query(cigarsRef, firestoreLimit(1000)));
      const total = allSnapshot.size;
      
      // 已验证数量
      const verifiedSnapshot = await getDocs(
        query(cigarsRef, where('verified', '==', true), firestoreLimit(1000))
      );
      const verified = verifiedSnapshot.size;

      setStats({
        total,
        verified,
        unverified: total - verified
      });
    } catch (error) {
      console.error('加载统计信息失败:', error);
    }
  };

  useEffect(() => {
    loadCigars();
  }, [strengthFilter, verifiedFilter]);

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
        .map(doc => ({
          ...doc.data(),
          id: doc.id,
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
          ratingDate: doc.data().ratingDate?.toDate() || null
        } as CigarDetailedInfo))
        .filter(cigar => 
          cigar.brand.toLowerCase().includes(value.toLowerCase()) ||
          cigar.name.toLowerCase().includes(value.toLowerCase())
        );

      setCigars(filtered);
    } catch (error) {
      console.error('搜索失败:', error);
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
      console.error('删除失败:', error);
      message.error('删除失败');
    }
  };

  // 编辑
  const handleEdit = (cigar: CigarDetailedInfo) => {
    setEditingCigar(cigar);
    setModalVisible(true);
  };

  // 新增
  const handleAdd = () => {
    setEditingCigar(null);
    setModalVisible(true);
  };

  // 表格列定义
  const columns: ColumnsType<CigarDetailedInfo> = [
    {
      title: '品牌',
      dataIndex: 'brand',
      key: 'brand',
      width: 150,
      fixed: 'left',
      render: (text: string) => <strong>{text}</strong>
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      ellipsis: true
    },
    {
      title: '强度',
      dataIndex: 'strength',
      key: 'strength',
      width: 120,
      render: (strength: string | null) => {
        if (!strength) return '-';
        const colorMap: Record<string, string> = {
          'mild': 'green',
          'medium-mild': 'cyan',
          'medium': 'blue',
          'medium-full': 'orange',
          'full': 'red'
        };
        return <Tag color={colorMap[strength.toLowerCase()] || 'default'}>{strength}</Tag>;
      }
    },
    {
      title: '评分',
      dataIndex: 'rating',
      key: 'rating',
      width: 80,
      render: (rating: number | null) => rating ? `${rating}` : '-'
    },
    {
      title: '评分来源',
      dataIndex: 'ratingSource',
      key: 'ratingSource',
      width: 180,
      ellipsis: true,
      render: (text: string | null) => text || '-'
    },
    {
      title: '已验证',
      dataIndex: 'verified',
      key: 'verified',
      width: 100,
      render: (verified: boolean) => 
        verified ? 
          <Tag icon={<CheckCircleOutlined />} color="success">已验证</Tag> : 
          <Tag icon={<CloseCircleOutlined />} color="default">未验证</Tag>
    },
    {
      title: 'AI识别统计',
      dataIndex: 'aiRecognitionStats',
      key: 'aiRecognitionStats',
      width: 150,
      render: (stats: any) => {
        if (!stats || stats.totalScans === 0) {
          return <Tag color="default">未扫描</Tag>;
        }
        const successRate = (stats.successfulScans / stats.totalScans * 100).toFixed(0);
        const avgConfidence = (stats.averageConfidence * 100).toFixed(0);
        return (
          <Space direction="vertical" size="small">
            <Tag color="blue">扫描: {stats.totalScans}次</Tag>
            <Tag color="green">成功率: {successRate}%</Tag>
            <Tag color="cyan">置信度: {avgConfidence}%</Tag>
          </Space>
        );
      }
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: Date) => dayjs(date).format('YYYY-MM-DD HH:mm')
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
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这条记录吗？"
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
            <Statistic title="总数" value={stats.total} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="已验证"
              value={stats.verified}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="未验证"
              value={stats.unverified}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 工具栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
            >
              新增雪茄
            </Button>
            <Button
              icon={<ImportOutlined />}
              onClick={() => setImportModalVisible(true)}
            >
              批量导入
            </Button>
          </Space>
          <Space>
            <Search
              placeholder="搜索品牌或名称"
              allowClear
              style={{ width: 300 }}
              onSearch={handleSearch}
              onChange={(e) => {
                if (!e.target.value) {
                  handleSearch('');
                }
              }}
            />
            <Select
              placeholder="强度"
              style={{ width: 150 }}
              allowClear
              onChange={setStrengthFilter}
            >
              <Option value="mild">Mild</Option>
              <Option value="medium-mild">Medium-Mild</Option>
              <Option value="medium">Medium</Option>
              <Option value="medium-full">Medium-Full</Option>
              <Option value="full">Full</Option>
            </Select>
            <Select
              placeholder="验证状态"
              style={{ width: 120 }}
              allowClear
              onChange={setVerifiedFilter}
            >
              <Option value={true}>已验证</Option>
              <Option value={false}>未验证</Option>
            </Select>
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

      {/* 编辑/新增模态框 */}
      <Modal
        title={editingCigar ? '编辑雪茄信息' : '新增雪茄信息'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingCigar(null);
        }}
        footer={null}
        width={900}
        destroyOnClose
      >
        <CigarForm
          initialValues={editingCigar}
          onSuccess={() => {
            setModalVisible(false);
            setEditingCigar(null);
            loadCigars();
          }}
          onCancel={() => {
            setModalVisible(false);
            setEditingCigar(null);
          }}
        />
      </Modal>

      {/* 批量导入模态框 */}
      <Modal
        title="批量导入雪茄数据"
        open={importModalVisible}
        onCancel={() => setImportModalVisible(false)}
        footer={null}
        width={1000}
        destroyOnClose
      >
        <CigarImport
          onSuccess={() => {
            setImportModalVisible(false);
            loadCigars();
          }}
          onCancel={() => setImportModalVisible(false)}
        />
      </Modal>
    </div>
  );
};

export default CigarDatabase;

