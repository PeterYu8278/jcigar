// Netlify Function: 重置用户密码
import { Handler } from '@netlify/functions';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

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
      console.error('[reset-password] FIREBASE_SERVICE_ACCOUNT not configured');
    }
  } catch (error) {
    console.error('[reset-password] Failed to initialize Firebase Admin:', error);
  }
}

export const handler: Handler = async (event, context) => {
  // 统一的 CORS headers
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // 处理 CORS 预检请求
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  // 只允许 POST 请求
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { email, newPassword } = JSON.parse(event.body || '{}');

    // 验证必需字段
    if (!email || !newPassword) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing required fields: email, newPassword' })
      };
    }

    // 验证密码强度（至少6位）
    if (newPassword.length < 6) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Password must be at least 6 characters long' })
      };
    }

    // 获取 Firebase Auth 实例
    const auth = getAuth();

    // 通过邮箱查找用户
    let user;
    try {
      user = await auth.getUserByEmail(email);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'User not found' })
        };
      }
      throw error;
    }

    // 更新用户密码
    await auth.updateUser(user.uid, {
      password: newPassword
    });

    console.log(`[reset-password] Password reset successfully for user: ${email}`);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ 
        success: true,
        message: 'Password reset successfully'
      })
    };
  } catch (error: any) {
    console.error('[reset-password] Error:', error);
    
    // 处理 Firebase Auth 错误
    let errorMessage = 'Internal server error';
    let statusCode = 500;

    if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address';
      statusCode = 400;
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'Password is too weak';
      statusCode = 400;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return {
      statusCode,
      headers: corsHeaders,
      body: JSON.stringify({ error: errorMessage })
    };
  }
};

