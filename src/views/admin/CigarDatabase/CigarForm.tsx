/**
 * 雪茄数据库录入/编辑表单
 */

import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      message.error(t('cigarDatabase.form.pleaseLogin'));
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
        updatedBy: user.id || user.email || 'unknown',
        updatedAt: serverTimestamp()
      };

      if (initialValues?.id) {
        // 更新现有记录
        const docRef = doc(db, GLOBAL_COLLECTIONS.CIGAR_DATABASE, initialValues.id);
        await updateDoc(docRef, cigarData);
        message.success(t('cigarDatabase.form.updateSuccess'));
      } else {
        // 创建新记录
        await addDoc(collection(db, GLOBAL_COLLECTIONS.CIGAR_DATABASE), {
          ...cigarData,
          dataSource: 'manual',
          createdBy: user.id || user.email || 'unknown',
          createdAt: serverTimestamp()
        });
        message.success(t('cigarDatabase.form.addSuccess'));
        form.resetFields();
        setImagePreview(null);
      }

      onSuccess?.();
    } catch (error) {
      console.error('保存雪茄信息失败:', error);
      message.error(t('cigarDatabase.form.saveFailed'));
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
        <Panel header={t('cigarDatabase.form.basicInfo')} key="basic">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label={t('cigarDatabase.form.brand')}
                name="brand"
                rules={[{ required: true, message: t('cigarDatabase.form.brandRequired') }]}
              >
                <Input placeholder={t('cigarDatabase.form.brandPlaceholder')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={t('cigarDatabase.form.name')}
                name="name"
                rules={[{ required: true, message: t('cigarDatabase.form.nameRequired') }]}
              >
                <Input placeholder={t('cigarDatabase.form.namePlaceholder')} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label={t('cigarDatabase.form.description')} name="description">
            <TextArea
              rows={4}
              placeholder={t('cigarDatabase.form.descriptionPlaceholder')}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label={t('cigarDatabase.form.imageUrl')} name="imageUrl">
                <Input
                  placeholder={t('cigarDatabase.form.imageUrlPlaceholder')}
                  onChange={handleImageUrlChange}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              {imagePreview && (
                <div style={{ marginTop: 30 }}>
                  <Image
                    src={imagePreview}
                    alt={t('cigarDatabase.form.preview')}
                    style={{ maxWidth: '100%', maxHeight: 200 }}
                    fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
                  />
                </div>
              )}
            </Col>
          </Row>

          <Form.Item label={t('cigarDatabase.form.verified')} name="verified" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Panel>

        {/* 烟叶信息 */}
        <Panel header={t('cigarDatabase.form.tobaccoInfo')} key="tobacco">
          <Form.Item label={t('cigarDatabase.form.wrapper')} name="wrapper">
            <Select
              placeholder={t('cigarDatabase.form.wrapperPlaceholder')}
              allowClear
              showSearch
              mode="tags"
              maxCount={1}
            >
              {COMMON_WRAPPERS.map(w => (
                <Option key={w} value={w}>{t(`flavors.${w}`, { defaultValue: w })}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label={t('cigarDatabase.form.binder')} name="binder">
            <Input placeholder={t('cigarDatabase.form.binderPlaceholder')} />
          </Form.Item>

          <Form.Item label={t('cigarDatabase.form.filler')} name="filler">
            <Input placeholder={t('cigarDatabase.form.fillerPlaceholder')} />
          </Form.Item>
        </Panel>

        {/* 风味与强度 */}
        <Panel header={t('cigarDatabase.form.flavorStrength')} key="flavor">
          <Form.Item label={t('cigarDatabase.form.strength')} name="strength">
            <Select placeholder={t('cigarDatabase.form.strengthPlaceholder')} allowClear>
              <Option value="mild">Mild ({t('cigarDatabase.import.status.mild', { defaultValue: '温和' })})</Option>
              <Option value="medium-mild">Medium-Mild ({t('cigarDatabase.import.status.medium-mild', { defaultValue: '中温和' })})</Option>
              <Option value="medium">Medium ({t('cigarDatabase.import.status.medium', { defaultValue: '中等' })})</Option>
              <Option value="medium-full">Medium-Full ({t('cigarDatabase.import.status.medium-full', { defaultValue: '中浓' })})</Option>
              <Option value="full">Full ({t('cigarDatabase.import.status.full', { defaultValue: '浓烈' })})</Option>
            </Select>
          </Form.Item>

          <Form.Item label={t('cigarDatabase.form.flavorProfile')} name="flavorProfile">
            <Select
              mode="tags"
              placeholder={t('cigarDatabase.form.flavorProfilePlaceholder')}
              style={{ width: '100%' }}
            >
              {COMMON_FLAVORS.map(flavor => (
                <Option key={flavor} value={flavor}>{t(`flavors.${flavor}`, { defaultValue: flavor })}</Option>
              ))}
            </Select>
          </Form.Item>
        </Panel>

        {/* 品鉴笔记 */}
        <Panel header={t('cigarDatabase.form.tastingNotes')} key="tasting">
          <Form.Item label={t('cigarDatabase.form.foot')} name="footTasteNotes">
            <TextArea
              rows={3}
              placeholder={t('cigarDatabase.form.footPlaceholder')}
            />
          </Form.Item>

          <Form.Item label={t('cigarDatabase.form.body')} name="bodyTasteNotes">
            <TextArea
              rows={3}
              placeholder={t('cigarDatabase.form.bodyPlaceholder')}
            />
          </Form.Item>

          <Form.Item label={t('cigarDatabase.form.head')} name="headTasteNotes">
            <TextArea
              rows={3}
              placeholder={t('cigarDatabase.form.headPlaceholder')}
            />
          </Form.Item>
        </Panel>

        {/* 评分信息 */}
        <Panel header={t('cigarDatabase.form.ratingInfo')} key="rating">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label={t('cigarDatabase.form.rating')}
                name="rating"
                rules={[
                  {
                    type: 'number',
                    min: 0,
                    max: 100,
                    message: t('cigarDatabase.form.ratingRangeError')
                  }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder={t('cigarDatabase.form.ratingPlaceholder')}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label={t('cigarDatabase.form.ratingSource')} name="ratingSource">
                <Input placeholder={t('cigarDatabase.form.ratingSourcePlaceholder')} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label={t('cigarDatabase.form.ratingDate')} name="ratingDate">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Panel>
      </Collapse>

      <Form.Item style={{ marginTop: 24 }}>
        <Space>
          <Button type="primary" htmlType="submit" loading={loading}>
            {initialValues?.id ? t('cigarDatabase.form.update') : t('cigarDatabase.form.save')}
          </Button>
          {onCancel && (
            <Button onClick={onCancel}>
              {t('common.cancel')}
            </Button>
          )}
        </Space>
      </Form.Item>
    </Form>
  );
};

