/**
 * Billplz 支付网关服务
 * 通过 Netlify Functions 代理以解决 CORS 问题
 */
import { getAppConfig } from './firebase/appConfig';

/**
 * Billplz 账单响应接口
 */
export interface BillplzBillResponse {
  id: string;
  collection_id: string;
  paid: boolean;
  state: string;
  amount: number;
  paid_amount: number;
  due_at: string;
  email: string;
  mobile: string;
  name: string;
  url: string;
  reference_1_label: string;
  reference_1: string;
  reference_2_label: string;
  reference_2: string;
  redirect_url: string;
  callback_url: string;
  description: string;
}

/**
 * 创建账单
 */
export const createBill = async (
  amount: number,
  description: string,
  name: string,
  email: string,
  mobile: string,
  usePlatformConfig: boolean = false
): Promise<{ success: boolean; data?: BillplzBillResponse; error?: string }> => {
  try {
    const config = await getAppConfig();
    const billplz = usePlatformConfig ? config?.paymentPlatform?.billplz : config?.payment?.billplz;

    if (!billplz?.enabled || !billplz?.apiKey || !billplz?.collectionId) {
      throw new Error(`Billplz (${usePlatformConfig ? 'Platform' : 'Client'}) 未配置或未启用`);
    }

    const response = await fetch('/.netlify/functions/billplz', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'create_bill',
        apiKey: billplz.apiKey,
        isSandbox: billplz.isSandbox ?? true,
        payload: {
          collection_id: billplz.collectionId,
          email,
          mobile,
          name,
          amount: Math.round(amount * 100),
          callback_url: window.location.origin + '/.netlify/functions/billplz-callback',
          description,
        }
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || '创建账单失败');
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('[createBill] Error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 获取账单状态
 */
export const getBillStatus = async (
  billId: string,
  usePlatformConfig: boolean = false
): Promise<{ success: boolean; data?: BillplzBillResponse; error?: string }> => {
  try {
    const config = await getAppConfig();
    const billplz = usePlatformConfig ? config?.paymentPlatform?.billplz : config?.payment?.billplz;

    if (!billplz?.apiKey) {
      throw new Error(`Billplz (${usePlatformConfig ? 'Platform' : 'Client'}) API Key 未配置`);
    }

    const response = await fetch('/.netlify/functions/billplz', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'get_bill',
        apiKey: billplz.apiKey,
        isSandbox: billplz.isSandbox ?? true,
        billId
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || '获取账单状态失败');
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('[getBillStatus] Error:', error);
    return { success: false, error: error.message };
  }
};
