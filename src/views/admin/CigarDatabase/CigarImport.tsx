/**
 * 雪茄数据批量导入组件
 */

import React, { useState } from 'react';
import {
  Upload,
  Button,
  Table,
  message,
  Space,
  Alert,
  Progress,
  Tag,
  Typography
} from 'antd';
import {
  UploadOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { collection, addDoc, query, where, getDocs, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/services/firebase/firebase';
import { GLOBAL_COLLECTIONS } from '@/config/globalCollections';
import { useAuthStore } from '@/store/authStore';
import { normalizeName, generateSearchKeywords } from '@/services/cigar/cigarDatabase';
import type { CigarStrength } from '@/types/cigar';
import Papa from 'papaparse';

const { Text, Link } = Typography;

interface ImportRow {
  brand: string;
  name: string;
  wrapper?: string;
  binder?: string;
  filler?: string;
  strength?: string;
  flavorProfile?: string;
  footTasteNotes?: string;
  bodyTasteNotes?: string;
  headTasteNotes?: string;
  description?: string;
  rating?: string;
  ratingSource?: string;
  ratingDate?: string;
  imageUrl?: string;
  verified?: string;
}

interface ValidatedRow extends ImportRow {
  rowNumber: number;
  status: 'valid' | 'error' | 'warning' | 'duplicate';
  errors: string[];
  warnings: string[];
}

interface CigarImportProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const CigarImport: React.FC<CigarImportProps> = ({ onSuccess, onCancel }) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [parsedData, setParsedData] = useState<ValidatedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const { user } = useAuthStore();

  // 下载 CSV 模板
  const downloadTemplate = () => {
    const template = `brand,name,wrapper,binder,filler,strength,flavorProfile,footTasteNotes,bodyTasteNotes,headTasteNotes,description,rating,ratingSource,ratingDate,imageUrl,verified
Macanudo,Cafe Crystal,Connecticut Shade,Mexican,"Dominican, Mexican, Jamaican",mild,"奶油,坚果,雪松",淡淡的雪松和奶油香气,柔和的坚果和奶油味，带有微妙的香料,持续的奶油味，略带甜味,Macanudo Cafe Crystal 是一款温和的雪茄...,87,Cigar Aficionado 2022,2022-06-15,https://example.com/image.jpg,true`;

    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'cigar_import_template.csv';
    link.click();
  };

  // 验证数据
  const validateRow = async (row: ImportRow, rowNumber: number, allRows: ImportRow[]): Promise<ValidatedRow> => {
    const errors: string[] = [];
    const warnings: string[] = [];
    let status: 'valid' | 'error' | 'warning' | 'duplicate' = 'valid';

    // 必填字段验证
    if (!row.brand || !row.brand.trim()) {
      errors.push('品牌不能为空');
    }
    if (!row.name || !row.name.trim()) {
      errors.push('名称不能为空');
    }

    // 强度验证
    if (row.strength) {
      const validStrengths = ['mild', 'medium-mild', 'medium', 'medium-full', 'full'];
      if (!validStrengths.includes(row.strength.toLowerCase())) {
        errors.push(`强度值无效: ${row.strength}。有效值: mild, medium-mild, medium, medium-full, full`);
      }
    }

    // 评分验证
    if (row.rating) {
      const rating = parseFloat(row.rating);
      if (isNaN(rating) || rating < 0 || rating > 100) {
        errors.push('评分必须在 0-100 之间');
      }
    }

    // 日期验证
    if (row.ratingDate) {
      const date = new Date(row.ratingDate);
      if (isNaN(date.getTime())) {
        errors.push('评分日期格式无效（应为 YYYY-MM-DD）');
      }
    }

    // 检查重复（在当前导入数据中）
    const duplicateInFile = allRows.findIndex((r, i) => 
      i < rowNumber - 1 && 
      r.brand.toLowerCase() === row.brand.toLowerCase() && 
      r.name.toLowerCase() === row.name.toLowerCase()
    );
    if (duplicateInFile !== -1) {
      warnings.push(`与第 ${duplicateInFile + 2} 行重复`);
      status = 'warning';
    }

    // 检查重复（在数据库中）
    if (row.brand && row.name) {
      try {
        const normalizedBrand = normalizeName(row.brand);
        const normalizedName = normalizeName(row.name);
        const cigarsRef = collection(db, GLOBAL_COLLECTIONS.CIGAR_DATABASE);
        const q = query(
          cigarsRef,
          where('normalizedBrand', '==', normalizedBrand),
          where('normalizedName', '==', normalizedName)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          warnings.push('数据库中已存在相同记录');
          status = 'duplicate';
        }
      } catch (error) {
        console.error('检查重复失败:', error);
      }
    }

    if (errors.length > 0) {
      status = 'error';
    }

    return {
      ...row,
      rowNumber,
      status,
      errors,
      warnings
    };
  };

  // 解析 CSV 文件
  const handleFileUpload = async (file: File) => {
    return new Promise<void>((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const rows = results.data as ImportRow[];
          
          // 验证所有行
          const validatedRows: ValidatedRow[] = [];
          for (let i = 0; i < rows.length; i++) {
            const validated = await validateRow(rows[i], i + 2, rows); // +2 因为第1行是表头
            validatedRows.push(validated);
          }

          setParsedData(validatedRows);
          message.success(`成功解析 ${rows.length} 条记录`);
          resolve();
        },
        error: (error) => {
          message.error(`解析文件失败: ${error.message}`);
          reject(error);
        }
      });
    });
  };

  // 执行导入
  const handleImport = async () => {
    if (!user) {
      message.error('请先登录');
      return;
    }

    // 只导入有效和警告状态的记录（跳过错误和重复）
    const validRows = parsedData.filter(row => row.status === 'valid' || row.status === 'warning');
    
    if (validRows.length === 0) {
      message.error('没有可导入的有效记录');
      return;
    }

    setImporting(true);
    setImportProgress(0);

    try {
      const cigarsRef = collection(db, GLOBAL_COLLECTIONS.CIGAR_DATABASE);
      let imported = 0;

      // 批量导入（Firestore 每批最多 500 条）
      const batchSize = 500;
      for (let i = 0; i < validRows.length; i += batchSize) {
        const batch = writeBatch(db);
        const batchRows = validRows.slice(i, i + batchSize);

        for (const row of batchRows) {
          const docRef = doc(cigarsRef);
          
          const cigarData = {
            brand: row.brand,
            name: row.name,
            wrapper: row.wrapper || null,
            binder: row.binder || null,
            filler: row.filler || null,
            strength: row.strength?.toLowerCase() as CigarStrength | null || null,
            flavorProfile: row.flavorProfile ? row.flavorProfile.split(',').map(f => f.trim()) : [],
            footTasteNotes: row.footTasteNotes || null,
            bodyTasteNotes: row.bodyTasteNotes || null,
            headTasteNotes: row.headTasteNotes || null,
            description: row.description || null,
            rating: row.rating ? parseFloat(row.rating) : null,
            ratingSource: row.ratingSource || null,
            ratingDate: row.ratingDate ? new Date(row.ratingDate) : null,
            imageUrl: row.imageUrl || null,
            verified: row.verified?.toLowerCase() === 'true',
            normalizedBrand: normalizeName(row.brand),
            normalizedName: normalizeName(row.name),
            searchKeywords: generateSearchKeywords(row.brand, row.name),
            dataSource: 'imported',
            createdBy: user.uid,
            createdAt: serverTimestamp(),
            updatedBy: user.uid,
            updatedAt: serverTimestamp()
          };

          batch.set(docRef, cigarData);
        }

        await batch.commit();
        imported += batchRows.length;
        setImportProgress(Math.round((imported / validRows.length) * 100));
      }

      message.success(`成功导入 ${imported} 条记录`);
      onSuccess?.();
    } catch (error) {
      console.error('导入失败:', error);
      message.error('导入失败，请重试');
    } finally {
      setImporting(false);
      setImportProgress(0);
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '行号',
      dataIndex: 'rowNumber',
      key: 'rowNumber',
      width: 80
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap = {
          valid: { icon: <CheckCircleOutlined />, color: 'success', text: '有效' },
          warning: { icon: <WarningOutlined />, color: 'warning', text: '警告' },
          error: { icon: <CloseCircleOutlined />, color: 'error', text: '错误' },
          duplicate: { icon: <WarningOutlined />, color: 'default', text: '重复' }
        };
        const config = statusMap[status as keyof typeof statusMap];
        return <Tag icon={config.icon} color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: '品牌',
      dataIndex: 'brand',
      key: 'brand',
      width: 150
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
      width: 100
    },
    {
      title: '评分',
      dataIndex: 'rating',
      key: 'rating',
      width: 80
    },
    {
      title: '问题',
      key: 'issues',
      width: 300,
      render: (_: any, record: ValidatedRow) => (
        <Space direction="vertical" size="small">
          {record.errors.map((error, i) => (
            <Text key={`error-${i}`} type="danger">{error}</Text>
          ))}
          {record.warnings.map((warning, i) => (
            <Text key={`warning-${i}`} type="warning">{warning}</Text>
          ))}
        </Space>
      )
    }
  ];

  const validCount = parsedData.filter(r => r.status === 'valid').length;
  const warningCount = parsedData.filter(r => r.status === 'warning').length;
  const errorCount = parsedData.filter(r => r.status === 'error').length;
  const duplicateCount = parsedData.filter(r => r.status === 'duplicate').length;

  return (
    <div>
      <Alert
        message="导入说明"
        description={
          <div>
            <p>1. 下载 CSV 模板，按照模板格式填写数据</p>
            <p>2. 必填字段：brand（品牌）、name（名称）</p>
            <p>3. 强度值：mild, medium-mild, medium, medium-full, full</p>
            <p>4. 评分：0-100 之间的数字</p>
            <p>5. 日期格式：YYYY-MM-DD</p>
            <p>6. 多个风味用逗号分隔，例如：奶油,坚果,雪松</p>
          </div>
        }
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Space style={{ marginBottom: 16 }}>
        <Button
          icon={<DownloadOutlined />}
          onClick={downloadTemplate}
        >
          下载 CSV 模板
        </Button>
        <Upload
          fileList={fileList}
          beforeUpload={(file) => {
            if (!file.name.endsWith('.csv')) {
              message.error('只支持 CSV 文件');
              return false;
            }
            setFileList([file]);
            handleFileUpload(file);
            return false;
          }}
          onRemove={() => {
            setFileList([]);
            setParsedData([]);
          }}
          maxCount={1}
        >
          <Button icon={<UploadOutlined />}>选择 CSV 文件</Button>
        </Upload>
      </Space>

      {parsedData.length > 0 && (
        <>
          <Alert
            message={`共 ${parsedData.length} 条记录：${validCount} 有效，${warningCount} 警告，${errorCount} 错误，${duplicateCount} 重复`}
            type={errorCount > 0 ? 'error' : warningCount > 0 ? 'warning' : 'success'}
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Table
            columns={columns}
            dataSource={parsedData}
            rowKey="rowNumber"
            pagination={{ pageSize: 10 }}
            scroll={{ x: 1200 }}
            style={{ marginBottom: 16 }}
          />

          {importing && (
            <Progress percent={importProgress} status="active" style={{ marginBottom: 16 }} />
          )}

          <Space>
            <Button
              type="primary"
              onClick={handleImport}
              loading={importing}
              disabled={validCount === 0 && warningCount === 0}
            >
              导入 {validCount + warningCount} 条有效记录
            </Button>
            {onCancel && (
              <Button onClick={onCancel} disabled={importing}>
                取消
              </Button>
            )}
          </Space>
        </>
      )}
    </div>
  );
};

