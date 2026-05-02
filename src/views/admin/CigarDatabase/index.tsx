/**
 * 雪茄数据库管理页面
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  Statistic,
  Divider
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ImportOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  DatabaseOutlined
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
  description: string; // 描述（字符串，优先保存高 confidence 和最新日期）
  descriptionConfidence?: number; // 描述的置信度
  descriptionUpdatedAt?: any; // 描述更新时间
  totalRecognitions: number;
  lastRecognizedAt: any;
  createdAt: any;
  updatedAt: any;
  // 🆕 贡献者信息
  contributors?: Record<string, string>; // userId -> userName
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
  const { t } = useTranslation();
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
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedCigar, setSelectedCigar] = useState<CigarDatabaseRecord | null>(null);

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
          description: data.description || '',
          descriptionConfidence: data.descriptionConfidence,
          descriptionUpdatedAt: data.descriptionUpdatedAt,
          totalRecognitions: data.totalRecognitions || 0,
          lastRecognizedAt: data.lastRecognizedAt,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          // 🆕 贡献者信息
          contributors: data.contributors || {}
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
      message.error(t('cigarDatabase.details.loadFailed'));
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
            description: data.description || '',
            descriptionConfidence: data.descriptionConfidence,
            descriptionUpdatedAt: data.descriptionUpdatedAt,
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
      message.error(t('cigarDatabase.import.parseFailed', { error: '' })); // Generic error
    } finally {
      setLoading(false);
    }
  };

  // 删除
  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, GLOBAL_COLLECTIONS.CIGAR_DATABASE, id));
      message.success(t('cigarDatabase.actions.deleteSuccess'));
      loadCigars();
    } catch (error) {
      message.error(t('cigarDatabase.actions.deleteFailed'));
    }
  };

  // 查看详情
  const handleViewDetails = (cigar: CigarDatabaseRecord) => {
    console.log('[CigarDatabase] 点击详情按钮，数据:', cigar);
    
    if (!cigar || !cigar.productName) {
      message.error(t('cigarDatabase.details.loadFailed'));
      return;
    }
    
    setSelectedCigar(cigar);
    setDetailModalVisible(true);
    console.log('[CigarDatabase] 已设置 Modal 状态为显示');
  };
  
  // 渲染详情 Modal 内容
  const renderDetailModalContent = () => {
    if (!selectedCigar) return null;
    
    const cigar = selectedCigar;
    
    try {
      // 辅助函数：获取 Top N 值
      const getTopNValues = (stats: Record<string, number>, n: number) => {
        if (!stats || Object.keys(stats).length === 0) return [];
        const entries = Object.entries(stats);
        const total = entries.reduce((sum, [_, count]) => sum + count, 0);
        entries.sort((a, b) => b[1] - a[1]);
        return entries.slice(0, n).map(([value, count]) => ({
          value,
          count,
          percentage: (count / total) * 100
        }));
      };
      
      // 显示统计详情的模态框
      const brandResult = getMostFrequentValue(cigar.brandStats);
      const originResult = getMostFrequentValue(cigar.originStats);
      const strengthResult = getMostFrequentValue(cigar.strengthStats);
    
      const topWrappers = getTopNValues(cigar.wrapperStats, 5);
      const topBinders = getTopNValues(cigar.binderStats, 5);
      const topFillers = getTopNValues(cigar.fillerStats, 5);
      const topFlavors = getTopNValues(cigar.flavorProfileStats, 10);
      const topFootNotes = getTopNValues(cigar.footTasteNotesStats, 5);
      const topBodyNotes = getTopNValues(cigar.bodyTasteNotesStats, 5);
      const topHeadNotes = getTopNValues(cigar.headTasteNotesStats, 5);
      
      const avgRating = cigar.ratingCount > 0 
        ? (cigar.ratingSum / cigar.ratingCount).toFixed(1) 
        : null;
      
      const latestDescription = cigar.description || t('cigarDatabase.details.noDescription');
      
      // 格式化最后识别时间
      let lastRecognizedText = '';
      if (cigar.lastRecognizedAt) {
        try {
          const date = cigar.lastRecognizedAt.toDate ? cigar.lastRecognizedAt.toDate() : new Date(cigar.lastRecognizedAt);
          lastRecognizedText = dayjs(date).format('YYYY-MM-DD HH:mm');
        } catch (e) {
          lastRecognizedText = t('cigarDatabase.details.timeFormatError');
        }
      }
      
      return (
        <div>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* 基础统计 */}
            <div style={{
              background: 'rgba(255, 215, 0, 0.1)',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 215, 0, 0.3)'
            }}>
              <Tag color="gold" style={{ 
                fontSize: '14px', 
                padding: '6px 12px',
                background: 'linear-gradient(to right, #FDE08D, #C48D3A)',
                color: '#000',
                border: 'none',
                fontWeight: 600
              }}>
                {t('cigarDatabase.details.totalRecognitions', { count: cigar.totalRecognitions })}
              </Tag>
              {lastRecognizedText && (
                <Tag color="cyan" style={{ 
                  fontSize: '12px', 
                  marginLeft: 8,
                  background: 'rgba(0, 255, 255, 0.1)',
                  color: '#0ff',
                  border: '1px solid rgba(0, 255, 255, 0.3)'
                }}>
                  {t('cigarDatabase.details.lastRecognized', { time: lastRecognizedText })}
                </Tag>
              )}
              {/* 🆕 贡献者数量 */}
              {cigar.contributors && Object.keys(cigar.contributors).length > 0 && (
                <Tag color="blue" style={{ 
                  fontSize: '12px', 
                  marginLeft: 8,
                  background: 'rgba(24, 144, 255, 0.1)',
                  color: '#1890ff',
                  border: '1px solid rgba(24, 144, 255, 0.3)'
                }}>
                  {t('cigarDatabase.details.contributorsCount', { count: Object.keys(cigar.contributors).length })}
                </Tag>
              )}
            </div>

            {/* 🆕 贡献者列表 */}
            {cigar.contributors && Object.keys(cigar.contributors).length > 0 && (
              <>
                <Divider style={{ margin: '8px 0', borderColor: '#333' }}>
                  <span style={{ color: '#ffd700', fontSize: '14px', fontWeight: 600 }}>
                    {t('cigarDatabase.details.contributorsList')}
                  </span>
                </Divider>
                <div style={{
                  background: 'rgba(0, 0, 0, 0.2)',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <Space wrap size={[8, 8]}>
                    {Object.entries(cigar.contributors).map(([userId, userName]) => (
                      <Tag 
                        key={userId}
                        style={{ 
                          background: 'rgba(255, 215, 0, 0.2)',
                          border: '1px solid rgba(255, 215, 0, 0.3)',
                          color: '#ffd700',
                          fontSize: '13px',
                          padding: '4px 12px'
                        }}
                      >
                        {userName}
                      </Tag>
                    ))}
                  </Space>
                </div>
              </>
            )}

            <Divider style={{ margin: '8px 0', borderColor: '#333' }} />

            {/* 核心信息 */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <p style={{ color: '#f8f8f8', marginBottom: '12px' }}>
                <strong style={{ color: '#ffd700' }}>{t('cigarDatabase.details.brand')}:</strong> {brandResult?.value || '-'} 
                {brandResult && (
                  <Tag style={{ 
                    marginLeft: 8,
                    background: 'rgba(82, 196, 26, 0.1)',
                    color: '#52c41a',
                    border: '1px solid rgba(82, 196, 26, 0.3)'
                  }}>
                    {t('cigarDatabase.details.consistency')}: {brandResult.percentage.toFixed(0)}%
                  </Tag>
                )}
              </p>
              <p style={{ color: '#f8f8f8', marginBottom: '12px' }}>
                <strong style={{ color: '#ffd700' }}>{t('cigarDatabase.details.origin')}:</strong> {originResult?.value || '-'} 
                {originResult && (
                  <Tag style={{ 
                    marginLeft: 8,
                    background: 'rgba(82, 196, 26, 0.1)',
                    color: '#52c41a',
                    border: '1px solid rgba(82, 196, 26, 0.3)'
                  }}>
                    {t('cigarDatabase.details.consistency')}: {originResult.percentage.toFixed(0)}%
                  </Tag>
                )}
              </p>
              <p style={{ color: '#f8f8f8', marginBottom: '12px' }}>
                <strong style={{ color: '#ffd700' }}>{t('cigarDatabase.details.strength')}:</strong> {strengthResult?.value || '-'} 
                {strengthResult && (
                  <Tag style={{ 
                    marginLeft: 8,
                    background: 'rgba(82, 196, 26, 0.1)',
                    color: '#52c41a',
                    border: '1px solid rgba(82, 196, 26, 0.3)'
                  }}>
                    {t('cigarDatabase.details.consistency')}: {strengthResult.percentage.toFixed(0)}%
                  </Tag>
                )}
              </p>
              {avgRating && (
                <p style={{ color: '#f8f8f8', marginBottom: 0 }}>
                  <strong style={{ color: '#ffd700' }}>{t('cigarDatabase.details.avgRating')}:</strong> {avgRating} 
                  <Tag style={{ 
                    marginLeft: 8,
                    background: 'linear-gradient(to right, #FDE08D, #C48D3A)',
                    color: '#000',
                    border: 'none',
                    fontWeight: 600
                  }}>
                    {t('cigarDatabase.details.basedOnCount', { count: cigar.ratingCount })}
                  </Tag>
                </p>
              )}
            </div>

            {/* 雪茄构造 Top 5 */}
            {(topWrappers.length > 0 || topBinders.length > 0 || topFillers.length > 0) && (
              <>
                <Divider style={{ margin: '8px 0', borderColor: '#333' }}>
                  <span style={{ color: '#ffd700', fontSize: '14px', fontWeight: 600 }}>
                    {t('cigarDatabase.details.tobaccoConstruction')}
                  </span>
                </Divider>
                
                <div style={{
                  background: 'rgba(0, 0, 0, 0.2)',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  {topWrappers.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <strong style={{ color: '#c0c0c0', fontSize: '13px' }}>{t('cigarDatabase.details.wrapper')}:</strong>
                      <div style={{ marginTop: 8 }}>
                        {topWrappers.map((item, index) => (
                          <Tag key={index} style={{ 
                            marginBottom: 4,
                            marginRight: 4,
                            background: 'rgba(82, 196, 26, 0.15)',
                            color: '#52c41a',
                            border: '1px solid rgba(82, 196, 26, 0.3)'
                          }}>
                            {index + 1}. {item.value} (x{item.count}, {item.percentage.toFixed(0)}%)
                          </Tag>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {topBinders.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <strong style={{ color: '#c0c0c0', fontSize: '13px' }}>{t('cigarDatabase.details.binder')}:</strong>
                      <div style={{ marginTop: 8 }}>
                        {topBinders.map((item, index) => (
                          <Tag key={index} style={{ 
                            marginBottom: 4,
                            marginRight: 4,
                            background: 'rgba(19, 194, 194, 0.15)',
                            color: '#13c2c2',
                            border: '1px solid rgba(19, 194, 194, 0.3)'
                          }}>
                            {index + 1}. {item.value} (x{item.count}, {item.percentage.toFixed(0)}%)
                          </Tag>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {topFillers.length > 0 && (
                    <div>
                      <strong style={{ color: '#c0c0c0', fontSize: '13px' }}>{t('cigarDatabase.details.filler')}:</strong>
                      <div style={{ marginTop: 8 }}>
                        {topFillers.map((item, index) => (
                          <Tag key={index} style={{ 
                            marginBottom: 4,
                            marginRight: 4,
                            background: 'rgba(24, 144, 255, 0.15)',
                            color: '#1890ff',
                            border: '1px solid rgba(24, 144, 255, 0.3)'
                          }}>
                            {index + 1}. {t(`flavors.${item.value}`, { defaultValue: item.value })} (x{item.count}, {item.percentage.toFixed(0)}%)
                          </Tag>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* 风味特征 Top 10 */}
            {topFlavors.length > 0 && (
              <>
                <Divider style={{ margin: '8px 0', borderColor: '#333' }}>
                  <span style={{ color: '#ffd700', fontSize: '14px', fontWeight: 600 }}>
                    {t('cigarDatabase.details.flavorProfile')}
                  </span>
                </Divider>
                <div style={{
                  background: 'rgba(255, 215, 0, 0.05)',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 215, 0, 0.2)'
                }}>
                  {topFlavors.map((item, index) => (
                    <Tag key={index} style={{ 
                      marginBottom: 4, 
                      marginRight: 4,
                      background: 'linear-gradient(to right, rgba(253, 224, 141, 0.2), rgba(196, 141, 58, 0.2))',
                      color: '#ffd700',
                      border: '1px solid rgba(255, 215, 0, 0.3)',
                      fontWeight: 500
                    }}>
                      {t(`flavors.${item.value}`, { defaultValue: item.value })} (x{item.count})
                    </Tag>
                  ))}
                </div>
              </>
            )}

            {/* 品吸笔记 Top 5 */}
            {(topFootNotes.length > 0 || topBodyNotes.length > 0 || topHeadNotes.length > 0) && (
              <>
                <Divider style={{ margin: '8px 0', borderColor: '#333' }}>
                  <span style={{ color: '#ffd700', fontSize: '14px', fontWeight: 600 }}>
                    {t('cigarDatabase.details.tastingNotes')}
                  </span>
                </Divider>
                
                <div style={{
                  background: 'rgba(0, 0, 0, 0.2)',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  {topFootNotes.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <strong style={{ color: '#c0c0c0', fontSize: '13px' }}>{t('cigarDatabase.details.foot')}:</strong>
                      <div style={{ marginTop: 8 }}>
                        {topFootNotes.map((item, index) => (
                          <Tag key={index} style={{ 
                            marginBottom: 4, 
                            marginRight: 4,
                            background: 'rgba(19, 194, 194, 0.15)',
                            color: '#13c2c2',
                            border: '1px solid rgba(19, 194, 194, 0.3)'
                          }}>
                            {t(`flavors.${item.value}`, { defaultValue: item.value })} (x{item.count})
                          </Tag>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {topBodyNotes.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <strong style={{ color: '#c0c0c0', fontSize: '13px' }}>{t('cigarDatabase.details.body')}:</strong>
                      <div style={{ marginTop: 8 }}>
                        {topBodyNotes.map((item, index) => (
                          <Tag key={index} style={{ 
                            marginBottom: 4, 
                            marginRight: 4,
                            background: 'rgba(24, 144, 255, 0.15)',
                            color: '#1890ff',
                            border: '1px solid rgba(24, 144, 255, 0.3)'
                          }}>
                            {t(`flavors.${item.value}`, { defaultValue: item.value })} (x{item.count})
                          </Tag>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {topHeadNotes.length > 0 && (
                    <div>
                      <strong style={{ color: '#c0c0c0', fontSize: '13px' }}>{t('cigarDatabase.details.head')}:</strong>
                      <div style={{ marginTop: 8 }}>
                        {topHeadNotes.map((item, index) => (
                          <Tag key={index} style={{ 
                            marginBottom: 4, 
                            marginRight: 4,
                            background: 'rgba(114, 46, 209, 0.15)',
                            color: '#722ed1',
                            border: '1px solid rgba(114, 46, 209, 0.3)'
                          }}>
                            {t(`flavors.${item.value}`, { defaultValue: item.value })} (x{item.count})
                          </Tag>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* 描述 */}
            {latestDescription !== t('cigarDatabase.details.noDescription') && (
              <>
                <Divider style={{ margin: '8px 0', borderColor: '#333' }}>
                  <span style={{ color: '#ffd700', fontSize: '14px', fontWeight: 600 }}>
                    {t('cigarDatabase.details.description')}
                  </span>
                </Divider>
                <div style={{
                  background: 'rgba(0, 0, 0, 0.2)',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <p style={{ 
                    color: '#c0c0c0', 
                    lineHeight: 1.8,
                    margin: 0,
                    fontSize: '13px'
                  }}>
                    {latestDescription}
                  </p>
                </div>
              </>
            )}
          </Space>
        </div>
      );
    } catch (error) {
      console.error('[CigarDatabase] 渲染详情内容失败:', error);
      return <div>{t('cigarDatabase.details.loadFailed')}</div>;
    }
  };

  // 表格列定义
  const columns: ColumnsType<CigarDatabaseRecord> = [
    {
      title: t('cigarDatabase.columns.productName'),
      dataIndex: 'productName',
      key: 'productName',
      width: 250,
      render: (text: string, record: CigarDatabaseRecord) => {
        const brandResult = getMostFrequentValue(record.brandStats);
        return (
          <div>
            <strong style={{ color: '#ffd700', fontSize: '14px' }}>{text}</strong>
            {brandResult && (
              <div style={{ fontSize: '12px', color: '#c0c0c0', marginTop: '4px' }}>
                {t('cigarDatabase.details.brand')}: <span style={{ color: '#ffd700' }}>{brandResult.value}</span>
              </div>
            )}
          </div>
        );
      }
    },
    {
      title: t('cigarDatabase.columns.recognitions'),
      dataIndex: 'totalRecognitions',
      key: 'totalRecognitions',
      width: 100,
      sorter: (a, b) => a.totalRecognitions - b.totalRecognitions,
      render: (count: number) => {
        let tagStyle: React.CSSProperties = {};
        if (count >= 10) {
          tagStyle = {
            background: 'linear-gradient(to right, #FDE08D, #C48D3A)',
            color: '#000',
            border: 'none',
            fontWeight: 600
          };
        } else if (count >= 5) {
          tagStyle = {
            background: '#0d1a2e',
            color: '#1890ff',
            border: '1px solid #1890ff'
          };
        } else {
          tagStyle = {
            background: '#1a1a1a',
            color: '#c0c0c0',
            border: '1px solid #333'
          };
        }
        return (
          <Tag style={tagStyle}>
            {t('cigarDatabase.stats.count', { count })}
          </Tag>
        );
      }
    },
    {
      title: t('cigarDatabase.columns.strength'),
      key: 'strength',
      width: 140,
      render: (_: any, record: CigarDatabaseRecord) => {
        const strengthResult = getMostFrequentValue(record.strengthStats);
        if (!strengthResult) return '-';
        
        const colorMap: Record<string, React.CSSProperties> = {
          'mild': {
            background: '#0d1f0d',
            color: '#52c41a',
            border: '1px solid #52c41a'
          },
          'medium-mild': {
            background: '#0d1f1f',
            color: '#13c2c2',
            border: '1px solid #13c2c2'
          },
          'medium': {
            background: '#0d1a2e',
            color: '#1890ff',
            border: '1px solid #1890ff'
          },
          'medium-full': {
            background: '#2e1f0d',
            color: '#ff8c00',
            border: '1px solid #ff8c00'
          },
          'full': {
            background: '#2e0d0d',
            color: '#ff4d4f',
            border: '1px solid #ff4d4f'
          }
        };
        const tagStyle = colorMap[strengthResult.value.toLowerCase()] || {
          background: '#1a1a1a',
          color: '#c0c0c0',
          border: '1px solid #333'
        };
        return (
          <div>
            <Tag style={tagStyle}>
              {strengthResult.value}
            </Tag>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
              {t('cigarDatabase.details.consistency')}: <span style={{ color: '#ffd700' }}>{strengthResult.percentage.toFixed(0)}%</span>
            </div>
          </div>
        );
      }
    },
    {
      title: t('cigarDatabase.columns.origin'),
      key: 'origin',
      width: 140,
      render: (_: any, record: CigarDatabaseRecord) => {
        const originResult = getMostFrequentValue(record.originStats);
        if (!originResult) return <span style={{ color: '#666' }}>-</span>;
        return (
          <div>
            <div style={{ color: '#ffd700', fontWeight: 500 }}>{originResult.value}</div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
              一致性: <span style={{ color: '#ffd700' }}>{originResult.percentage.toFixed(0)}%</span>
            </div>
          </div>
        );
      }
    },
    {
      title: t('cigarDatabase.columns.avgRating'),
      key: 'rating',
      width: 120,
      render: (_: any, record: CigarDatabaseRecord) => {
        if (record.ratingCount === 0) return <span style={{ color: '#666' }}>-</span>;
        const avgRating = (record.ratingSum / record.ratingCount).toFixed(1);
        return (
          <div>
            <Tag style={{
              background: 'linear-gradient(to right, #FDE08D, #C48D3A)',
              color: '#000',
              border: 'none',
              fontWeight: 600
            }}>
              {avgRating}
            </Tag>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
              {t('cigarDatabase.details.basedOnCount', { count: record.ratingCount })}
            </div>
          </div>
        );
      }
    },
    {
      title: t('cigarDatabase.columns.lastRecognized'),
      dataIndex: 'lastRecognizedAt',
      key: 'lastRecognizedAt',
      width: 180,
      render: (timestamp: any) => {
        if (!timestamp) return <span style={{ color: '#666' }}>-</span>;
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return (
          <span style={{ color: '#c0c0c0' }}>
            {dayjs(date).format('YYYY-MM-DD HH:mm')}
          </span>
        );
      }
    },
    {
      title: t('cigarDatabase.columns.actions'),
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetails(record)}
            style={{
              color: '#ffd700',
              padding: '0 8px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ffed4e';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#ffd700';
            }}
          >
            {t('cigarDatabase.actions.details')}
          </Button>
          <Popconfirm
            title={t('cigarDatabase.actions.confirmDeleteTitle')}
            description={t('cigarDatabase.actions.confirmDeleteContent')}
            onConfirm={() => handleDelete(record.id)}
            okText={t('cigarDatabase.actions.confirmDeleteOk')}
            cancelText={t('cigarDatabase.actions.confirmDeleteCancel')}
            okButtonProps={{
              style: {
                background: 'linear-gradient(to right, #FDE08D, #C48D3A)',
                border: 'none',
                color: '#000',
                fontWeight: 600
              }
            }}
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              style={{
                color: '#ff4d4f',
                padding: '0 8px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#ff7875';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#ff4d4f';
              }}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <>
      <style>{`
        .cigar-database-table .ant-table {
          background: transparent;
          color: #f8f8f8;
        }
        .cigar-database-table .ant-table-thead > tr > th {
          background: #000000 !important;
          border-bottom: 2px solid #ffd700 !important;
          color: #ffd700 !important;
          font-weight: 600;
        }
        .cigar-database-table .ant-table-tbody > tr > td {
          background: transparent !important;
          border-bottom: 1px solid #333 !important;
          color: #f8f8f8 !important;
        }
        .cigar-database-table .ant-table-tbody > tr:hover > td {
          background: #2a2410 !important;
        }
        .cigar-database-table .ant-pagination {
          margin: 16px;
        }
        .cigar-database-table .ant-pagination-item {
          background: #1a1a1a;
          border-color: #333;
        }
        .cigar-database-table .ant-pagination-item a {
          color: #c0c0c0;
        }
        .cigar-database-table .ant-pagination-item-active {
          background: linear-gradient(to right, #FDE08D, #C48D3A);
          border-color: transparent;
        }
        .cigar-database-table .ant-pagination-item-active a {
          color: #000;
          font-weight: 600;
        }
        .cigar-database-table .ant-pagination-prev,
        .cigar-database-table .ant-pagination-next {
          background: #1a1a1a;
          border-color: #333;
        }
        .cigar-database-table .ant-pagination-prev a,
        .cigar-database-table .ant-pagination-next a {
          color: #ffd700;
        }
        .cigar-database-table .ant-pagination-prev:hover,
        .cigar-database-table .ant-pagination-next:hover {
          border-color: #ffd700;
        }
        .cigar-database-table .ant-pagination-options {
          color: #c0c0c0;
        }
        .cigar-database-table .ant-select-selector {
          background: #1a1a1a !important;
          border-color: #333 !important;
          color: #c0c0c0 !important;
        }
        .cigar-database-table .ant-select-arrow {
          color: #ffd700 !important;
        }
        .cigar-database-table .ant-table-placeholder {
          background: transparent;
          color: #999;
        }
        .cigar-database-table .ant-empty-description {
          color: #999;
        }
        .cigar-database-table .ant-spin-container {
          background: transparent;
        }
      `}</style>
      <div style={{ 
        padding: 24,
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0f0f0f 0%, #1a1a1a 100%)'
      }}>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card style={{
            background: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: '12px'
          }}>
            <Statistic 
              title={<span style={{ color: '#c0c0c0' }}>{t('cigarDatabase.stats.totalCigars')}</span>}
              value={stats.total} 
              suffix={t('cigarDatabase.stats.type')}
              valueStyle={{ color: '#ffd700' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card style={{
            background: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: '12px'
          }}>
            <Statistic
              title={<span style={{ color: '#c0c0c0' }}>{t('cigarDatabase.stats.totalRecognitions')}</span>}
              value={stats.totalRecognitions}
              suffix={t('cigarDatabase.stats.unit')}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card style={{
            background: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: '12px'
          }}>
            <Statistic
              title={<span style={{ color: '#c0c0c0' }}>{t('cigarDatabase.stats.avgRecognitions')}</span>}
              value={stats.avgRecognitionsPerCigar}
              suffix={t('cigarDatabase.stats.unitPerType')}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 工具栏 */}
      <Card style={{ 
        marginBottom: 16,
        background: '#1a1a1a',
        border: '1px solid #ffd700',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5)'
      }}>
        <Space style={{ width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ 
            fontSize: '15px', 
            color: '#ffd700',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            letterSpacing: '0.5px'
          }}>
            <DatabaseOutlined style={{ fontSize: '18px', color: '#ffd700' }} />
            AI识别数据库
            <span style={{ 
              fontSize: '12px', 
              color: '#999',
              fontWeight: 400,
              marginLeft: '4px'
            }}>
              {t('cigarDatabase.readonlyNotice')}
            </span>
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
      <Card style={{
        background: '#1a1a1a',
        border: '1px solid #ffd700',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden'
      }}
      bodyStyle={{ padding: 0 }}
      >
        <Table
          columns={columns}
          dataSource={cigars}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => (
              <span style={{ color: '#c0c0c0' }}>{t('common.paginationTotal', { start: (pagination.current - 1) * pagination.pageSize + 1, end: Math.min(pagination.current * pagination.pageSize, pagination.total), total: pagination.total })}</span>
            ),
            itemRender: (page, type, originalElement) => {
              if (type === 'prev') {
                return <a style={{ color: '#ffd700' }}>{t('common.previous')}</a>;
              }
              if (type === 'next') {
                return <a style={{ color: '#ffd700' }}>{t('common.next')}</a>;
              }
              return originalElement;
            }
          }}
          className="cigar-database-table"
          components={{
            header: {
              cell: (props: any) => (
                <th {...props} style={{
                  ...props.style,
                  background: '#000000',
                  borderBottom: '2px solid #ffd700',
                  color: '#ffd700',
                  fontWeight: 600,
                  padding: '16px'
                }} />
              )
            },
            body: {
              cell: (props: any) => (
                <td {...props} style={{
                  ...props.style,
                  background: 'transparent',
                  borderBottom: '1px solid #333',
                  color: '#f8f8f8',
                  padding: '12px 16px'
                }} />
              ),
              row: (props: any) => (
                <tr {...props} style={{
                  ...props.style,
                  background: 'transparent',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#2a2410';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
                />
              )
            }
          }}
        />
      </Card>

      {/* 详情 Modal */}
      <Modal
        title={
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <DatabaseOutlined style={{ color: '#ffd700', fontSize: '20px' }} />
            <span style={{ 
              color: '#ffd700',
              fontSize: '18px',
              fontWeight: 600,
              letterSpacing: '0.5px'
            }}>
              {selectedCigar ? `${selectedCigar.productName}` : t('cigarDatabase.actions.details')}
            </span>
          </div>
        }
        open={detailModalVisible}
        onOk={() => setDetailModalVisible(false)}
        onCancel={() => setDetailModalVisible(false)}
        width={900}
        centered
        className="cigar-detail-modal"
        styles={{
          content: {
            background: 'linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%)',
            border: '1px solid rgba(255, 215, 0, 0.3)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)'
          },
          body: {
            background: 'transparent',
            padding: '24px',
            maxHeight: '70vh',
            overflowY: 'auto'
          },
          header: {
            background: 'transparent',
            borderBottom: '1px solid #333',
            padding: '16px 24px'
          },
          footer: {
            background: 'transparent',
            borderTop: '1px solid #333',
            padding: '16px 24px'
          },
          mask: {
            background: 'rgba(0, 0, 0, 0.8)'
          }
        }}
        footer={[
          <Button 
            key="close" 
            onClick={() => setDetailModalVisible(false)}
            style={{
              background: 'linear-gradient(to right, #FDE08D, #C48D3A)',
              border: 'none',
              color: '#000',
              fontWeight: 600,
              height: '40px',
              padding: '0 32px',
              borderRadius: '8px',
              fontSize: '14px'
            }}
          >
            {t('cigarDatabase.actions.close')}
          </Button>
        ]}
      >
        {renderDetailModalContent()}
      </Modal>
    </div>
    </>
  );
};

export default CigarDatabase;

