// Netlify Function: 部署 Firebase Firestore 索引
import { Handler } from '@netlify/functions';

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

/**
 * 使用 Firebase Management REST API 创建索引
 * 注意：这需要 OAuth token，实现较复杂
 * 更实用的方案是返回索引定义和 Firebase Console 链接
 */
async function createIndexesViaAPI(
  projectId: string,
  indexes: any[],
  accessToken?: string
): Promise<{ success: boolean; message: string; links?: string[] }> {
  // 由于 Firebase Management REST API 需要 OAuth token，实现较复杂
  // 我们返回索引定义和 Firebase Console 链接，让用户手动创建
  // 或者提供创建链接
  
  const links: string[] = [];
  
  // 为每个索引生成 Firebase Console 创建链接
  indexes.forEach((index) => {
    // 构建索引创建 URL（需要 base64 编码的索引定义）
    // 由于 URL 编码复杂，我们提供通用的索引管理页面链接
    const consoleUrl = `https://console.firebase.google.com/project/${projectId}/firestore/indexes`;
    links.push(consoleUrl);
  });

  return {
    success: true,
    message: `已准备 ${indexes.length} 个索引定义。请通过 Firebase Console 创建索引。`,
    links: [...new Set(links)] // 去重
  };
}

export const handler: Handler = async (event, context) => {
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
    const body = JSON.parse(event.body || '{}');
    const { projectId, accessToken } = body;

    // 验证必需参数
    if (!projectId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Missing required parameter: projectId' 
        })
      };
    }

    // 读取索引定义
    // 优先从请求体读取，否则使用内置的默认索引定义
    let indexesData: any;
    
    if (body.indexes && Array.isArray(body.indexes)) {
      indexesData = { indexes: body.indexes };
    } else {
      // 使用内置的默认索引定义（从 firestore.indexes.json）
      indexesData = {
        indexes: [
          {
            collectionGroup: "visitSessions",
            queryScope: "COLLECTION",
            fields: [
              { fieldPath: "userId", order: "ASCENDING" },
              { fieldPath: "status", order: "ASCENDING" },
              { fieldPath: "checkInAt", order: "DESCENDING" }
            ]
          },
          {
            collectionGroup: "visitSessions",
            queryScope: "COLLECTION",
            fields: [
              { fieldPath: "status", order: "ASCENDING" },
              { fieldPath: "checkInAt", order: "DESCENDING" }
            ]
          },
          {
            collectionGroup: "visitSessions",
            queryScope: "COLLECTION",
            fields: [
              { fieldPath: "status", order: "ASCENDING" },
              { fieldPath: "checkInAt", order: "ASCENDING" }
            ]
          },
          {
            collectionGroup: "visitSessions",
            queryScope: "COLLECTION",
            fields: [
              { fieldPath: "userId", order: "ASCENDING" },
              { fieldPath: "checkInAt", order: "DESCENDING" }
            ]
          },
          {
            collectionGroup: "redemptionRecords",
            queryScope: "COLLECTION",
            fields: [
              { fieldPath: "userId", order: "ASCENDING" },
              { fieldPath: "dayKey", order: "ASCENDING" },
              { fieldPath: "redeemedAt", order: "ASCENDING" }
            ]
          },
          {
            collectionGroup: "redemptionRecords",
            queryScope: "COLLECTION",
            fields: [
              { fieldPath: "userId", order: "ASCENDING" },
              { fieldPath: "hourKey", order: "ASCENDING" },
              { fieldPath: "redeemedAt", order: "ASCENDING" }
            ]
          },
          {
            collectionGroup: "redemptionRecords",
            queryScope: "COLLECTION",
            fields: [
              { fieldPath: "userId", order: "ASCENDING" },
              { fieldPath: "redeemedAt", order: "ASCENDING" }
            ]
          },
          {
            collectionGroup: "reloadRecords",
            queryScope: "COLLECTION",
            fields: [
              { fieldPath: "status", order: "ASCENDING" },
              { fieldPath: "createdAt", order: "DESCENDING" }
            ]
          },
          {
            collectionGroup: "reloadRecords",
            queryScope: "COLLECTION",
            fields: [
              { fieldPath: "createdAt", order: "DESCENDING" }
            ]
          },
          {
            collectionGroup: "membershipFeeRecords",
            queryScope: "COLLECTION",
            fields: [
              { fieldPath: "status", order: "ASCENDING" },
              { fieldPath: "dueDate", order: "ASCENDING" }
            ]
          },
          {
            collectionGroup: "pointsRecords",
            queryScope: "COLLECTION",
            fields: [
              { fieldPath: "userId", order: "ASCENDING" },
              { fieldPath: "createdAt", order: "DESCENDING" }
            ]
          },
          {
            collectionGroup: "pointsRecords",
            queryScope: "COLLECTION",
            fields: [
              { fieldPath: "createdAt", order: "DESCENDING" }
            ]
          }
        ]
      };
    }

    if (!indexesData.indexes || !Array.isArray(indexesData.indexes)) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Invalid indexes format' 
        })
      };
    }

    // 创建索引（通过 API 或返回链接）
    const result = await createIndexesViaAPI(projectId, indexesData.indexes, accessToken);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        projectId,
        indexCount: indexesData.indexes.length,
        ...result
      })
    };
  } catch (error: any) {
    console.error('[deploy-firestore-indexes] Error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: error.message || 'Internal server error'
      })
    };
  }
};

