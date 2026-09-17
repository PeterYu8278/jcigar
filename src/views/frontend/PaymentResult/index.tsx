import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Spin, Typography } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '../../../constants/routes';

const { Title, Text } = Typography;

type PaymentState = 'loading' | 'success' | 'failed';

const PaymentResult: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<PaymentState>('loading');

  useEffect(() => {
    // Billplz appends paid=true/false and id to the redirect_url
    const paid = searchParams.get('paid');
    if (paid === 'true') {
      setState('success');
    } else {
      setState('failed');
    }
  }, [searchParams]);

  const billId = searchParams.get('id');

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#1a1a1a',
    padding: '24px',
    gap: '24px',
  };

  if (state === 'loading') {
    return (
      <div style={containerStyle}>
        <Spin indicator={<LoadingOutlined style={{ fontSize: 48, color: '#f4af25' }} spin />} />
      </div>
    );
  }

  const isSuccess = state === 'success';

  return (
    <div style={containerStyle}>
      {isSuccess ? (
        <CheckCircleOutlined style={{ fontSize: 72, color: '#52c41a' }} />
      ) : (
        <CloseCircleOutlined style={{ fontSize: 72, color: '#ff4d4f' }} />
      )}

      <Title level={2} style={{ color: '#f8f8f8', margin: 0, textAlign: 'center' }}>
        {isSuccess
          ? t('payment.successTitle', { defaultValue: '支付成功' })
          : t('payment.failedTitle', { defaultValue: '支付失败' })}
      </Title>

      <Text style={{ color: '#c0c0c0', fontSize: 14, textAlign: 'center' }}>
        {isSuccess
          ? t('payment.successDesc', { defaultValue: '您的付款已成功处理，积分将在片刻后更新。' })
          : t('payment.failedDesc', { defaultValue: '支付未完成，请重试或联系客服。' })}
      </Text>

      {billId && (
        <Text style={{ color: '#666', fontSize: 12 }}>
          {t('payment.billId', { defaultValue: '账单号' })}: {billId}
        </Text>
      )}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Button
          type="primary"
          size="large"
          onClick={() => navigate(ROUTES.HOME)}
          style={{
            background: 'linear-gradient(to right, #FDE08D, #C48D3A)',
            border: 'none',
            color: '#000',
            fontWeight: 600,
          }}
        >
          {t('common.backToHome', { defaultValue: '返回首页' })}
        </Button>
        {!isSuccess && (
          <Button
            size="large"
            onClick={() => navigate(-1)}
            style={{ borderColor: '#444', color: '#f8f8f8', background: 'transparent' }}
          >
            {t('common.tryAgain', { defaultValue: '重试' })}
          </Button>
        )}
      </div>
    </div>
  );
};

export default PaymentResult;
