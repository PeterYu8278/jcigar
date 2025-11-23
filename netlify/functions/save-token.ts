// Netlify Function: 保存 FCM Token
import { Handler } from '@netlify/functions';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// 初始化 Firebase Admin（如果尚未初始化）
if (!getApps().length) {
  try {
    // 从环境变量读取 Service Account JSON
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccount) {
      initializeApp({
        credential: cert(JSON.parse(serviceAccount))
      });
    } else {
      console.error('[save-token] FIREBASE_SERVICE_ACCOUNT not configured');
    }
  } catch (error) {
    console.error('[save-token] Failed to initialize Firebase Admin:', error);
  }
}

export const handler: Handler = async (event, context) => {
  // 只允许 POST 请求
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { token, userId, deviceInfo } = JSON.parse(event.body || '{}');

    if (!token || !userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: token, userId' })
      };
    }

    const db = getFirestore();
    const tokensRef = db.collection('users').doc(userId).collection('fcmTokens');

    // 检查是否已存在相同的 Token
    const existingSnapshot = await tokensRef.where('token', '==', token).limit(1).get();

    const tokenData = {
      token,
      deviceInfo: deviceInfo || {},
      createdAt: new Date(),
      lastUsed: new Date(),
      active: true
    };

    if (!existingSnapshot.empty) {
      // 更新现有 Token
      const docId = existingSnapshot.docs[0].id;
      await tokensRef.doc(docId).set({
        ...tokenData,
        lastUsed: new Date()
      }, { merge: true });
    } else {
      // 创建新 Token 记录
      await tokensRef.add(tokenData);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  } catch (error: any) {
    console.error('[save-token] Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal server error' })
    };
  }
};

