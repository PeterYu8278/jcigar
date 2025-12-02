/**
 * 雪茄数据库录入/编辑表单
 */

import React, { useEffect } from 'react';
import {
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Switch,
  Button,
  Card,
  Space,
  message,
  Collapse,
  Row,
  Col,
  Image
} from 'antd';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { GLOBAL_COLLECTIONS } from '@/config/globalCollections';
import { useAuthStore } from '@/store/modules/auth';
import { normalizeName, generateSearchKeywords } from '@/services/cigar/cigarDatabase';
import type { CigarDetailedInfoFormData, CigarStrength } from '@/types/cigar';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;
const { Panel } = Collapse;

interface CigarFormProps {
  initialValues?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// 常见风味标签
const COMMON_FLAVORS = [
  '木质', '雪松', '橡木', '檀香',
  '香料', '胡椒', '肉桂', '丁香',
  '奶油', '黄油', '坚果', '杏仁',
  '咖啡', '可可', '巧克力',
  '皮革', '泥土', '烟草',
  '甜味', '蜂蜜', '焦糖',
  '果香', '柑橘', '浆果'
];

// 常见外包叶类型
const COMMON_WRAPPERS = [
  'Connecticut Shade',
  'Connecticut Broadleaf',
  'Habano',
  'Maduro',
  'Corojo',
  'Sumatra',
  'Cameroon',
  'San Andres',
  'Oscuro'
];

export const CigarForm: React.FC<CigarFormProps> = ({
  initialValues,
  onSuccess,
  onCancel
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    if (initialValues) {
      // 转换日期字段
      const formValues = {
        ...initialValues,
        ratingDate: initialValues.ratingDate ? dayjs(initialValues.ratingDate) : null
      };
      form.setFieldsValue(formValues);
      if (initialValues.imageUrl) {
        setImagePreview(initialValues.imageUrl);
      }
    }
  }, [initialValues, form]);

  const handleSubmit = async (values: any) => {
    if (!user) {
      message.error('请先登录');
      return;
    }

    setLoading(true);

    try {
      // 生成标准化字段和搜索关键词
      const normalizedBrand = normalizeName(values.brand);
      const normalizedName = normalizeName(values.name);
      const searchKeywords = generateSearchKeywords(values.brand, values.name);

      // 准备保存的数据
      const cigarData = {
        brand: values.brand,
        name: values.name,
        wrapper: values.wrapper || null,
        binder: values.binder || null,
        filler: values.filler || null,
        strength: values.strength || null,
        flavorProfile: values.flavorProfile || [],
        footTasteNotes: values.footTasteNotes || null,
        bodyTasteNotes: values.bodyTasteNotes || null,
        headTasteNotes: values.headTasteNotes || null,
        description: values.description || null,
        rating: values.rating || null,
        ratingSource: values.ratingSource || null,
        ratingDate: values.ratingDate ? (values.ratingDate as any).toDate() : null,
        imageUrl: values.imageUrl || null,
        verified: values.verified || false,
        normalizedBrand,
        normalizedName,
        searchKeywords,
        updatedBy: user.uid,
        updatedAt: serverTimestamp()
      };

      if (initialValues?.id) {
        // 更新现有记录
        const docRef = doc(db, GLOBAL_COLLECTIONS.CIGAR_DATABASE, initialValues.id);
        await updateDoc(docRef, cigarData);
        message.success('雪茄信息已更新');
      } else {
        // 创建新记录
        await addDoc(collection(db, GLOBAL_COLLECTIONS.CIGAR_DATABASE), {
          ...cigarData,
          dataSource: 'manual',
          createdBy: user.uid,
          createdAt: serverTimestamp()
        });
        message.success('雪茄信息已添加');
        form.resetFields();
        setImagePreview(null);
      }

      onSuccess?.();
    } catch (error) {
      console.error('保存雪茄信息失败:', error);
      message.error('保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setImagePreview(url || null);
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={{
        verified: false,
        flavorProfile: []
      }}
    >
      <Collapse defaultActiveKey={['basic', 'tobacco', 'flavor']}>
        {/* 基础信息 */}
        <Panel header="基础信息" key="basic">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="品牌"
                name="brand"
                rules={[{ required: true, message: '请输入品牌名称' }]}
              >
                <Input placeholder="例如：Macanudo" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="名称"
                name="name"
                rules={[{ required: true, message: '请输入雪茄名称' }]}
              >
                <Input placeholder="例如：Cafe Crystal" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="产品描述" name="description">
            <TextArea
              rows={4}
              placeholder="输入雪茄的详细描述..."
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="图片 URL" name="imageUrl">
                <Input
                  placeholder="https://example.com/image.jpg"
                  onChange={handleImageUrlChange}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              {imagePreview && (
                <div style={{ marginTop: 30 }}>
                  <Image
                    src={imagePreview}
                    alt="预览"
                    style={{ maxWidth: '100%', maxHeight: 200 }}
                    fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
                  />
                </div>
              )}
            </Col>
          </Row>

          <Form.Item label="已验证" name="verified" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Panel>

        {/* 烟叶信息 */}
        <Panel header="烟叶信息" key="tobacco">
          <Form.Item label="外包叶 (Wrapper)" name="wrapper">
            <Select
              placeholder="选择或输入外包叶类型"
              allowClear
              showSearch
              mode="tags"
              maxCount={1}
            >
              {COMMON_WRAPPERS.map(w => (
                <Option key={w} value={w}>{w}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="粘合叶 (Binder)" name="binder">
            <Input placeholder="例如：Mexican" />
          </Form.Item>

          <Form.Item label="填充叶 (Filler)" name="filler">
            <Input placeholder="例如：Dominican, Mexican, Jamaican" />
          </Form.Item>
        </Panel>

        {/* 风味与强度 */}
        <Panel header="风味与强度" key="flavor">
          <Form.Item label="强度" name="strength">
            <Select placeholder="选择强度等级" allowClear>
              <Option value="mild">Mild (温和)</Option>
              <Option value="medium-mild">Medium-Mild (中温和)</Option>
              <Option value="medium">Medium (中等)</Option>
              <Option value="medium-full">Medium-Full (中浓)</Option>
              <Option value="full">Full (浓烈)</Option>
            </Select>
          </Form.Item>

          <Form.Item label="风味特征" name="flavorProfile">
            <Select
              mode="tags"
              placeholder="选择或输入风味标签"
              style={{ width: '100%' }}
            >
              {COMMON_FLAVORS.map(flavor => (
                <Option key={flavor} value={flavor}>{flavor}</Option>
              ))}
            </Select>
          </Form.Item>
        </Panel>

        {/* 品鉴笔记 */}
        <Panel header="品鉴笔记" key="tasting">
          <Form.Item label="茄脚风味 (Foot)" name="footTasteNotes">
            <TextArea
              rows={3}
              placeholder="描述点燃前的香气和初段风味..."
            />
          </Form.Item>

          <Form.Item label="茄身风味 (Body)" name="bodyTasteNotes">
            <TextArea
              rows={3}
              placeholder="描述燃烧中段的风味变化..."
            />
          </Form.Item>

          <Form.Item label="茄头风味 (Head)" name="headTasteNotes">
            <TextArea
              rows={3}
              placeholder="描述收尾阶段的风味..."
            />
          </Form.Item>
        </Panel>

        {/* 评分信息 */}
        <Panel header="评分信息" key="rating">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="评分 (0-100)"
                name="rating"
                rules={[
                  {
                    type: 'number',
                    min: 0,
                    max: 100,
                    message: '评分必须在 0-100 之间'
                  }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="例如：87"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="评分来源" name="ratingSource">
                <Input placeholder="例如：Cigar Aficionado 2022" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="评分日期" name="ratingDate">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Panel>
      </Collapse>

      <Form.Item style={{ marginTop: 24 }}>
        <Space>
          <Button type="primary" htmlType="submit" loading={loading}>
            {initialValues?.id ? '更新' : '保存'}
          </Button>
          {onCancel && (
            <Button onClick={onCancel}>
              取消
            </Button>
          )}
        </Space>
      </Form.Item>
    </Form>
  );
};

