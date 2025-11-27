// Netlify Function: 部署 Firebase Firestore 索引
import { Handler } from '@netlify/functions';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

/**
 * 使用 Firebase CLI 部署索引
 * 需要 Firebase Service Account 或 Access Token
 */
async function deployIndexesViaCLI(
  projectId: string,
  indexesData: any,
  serviceAccount?: string,
  accessToken?: string
): Promise<{ success: boolean; message: string; output?: string; error?: string }> {
  let tempDir: string | null = null;
  try {
    console.log('[deployIndexesViaCLI] Starting deployment for project:', projectId);
    console.log('[deployIndexesViaCLI] Has serviceAccount:', !!serviceAccount);
    console.log('[deployIndexesViaCLI] Has accessToken:', !!accessToken);
    console.log('[deployIndexesViaCLI] Indexes count:', indexesData.indexes?.length || 0);
    
    // 创建临时目录和文件
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'firebase-indexes-'));
    console.log('[deployIndexesViaCLI] Temp directory:', tempDir);
    
    const indexesFilePath = path.join(tempDir, 'firestore.indexes.json');
    const firebaseJsonPath = path.join(tempDir, 'firebase.json');
    
    // 写入索引文件
    fs.writeFileSync(indexesFilePath, JSON.stringify(indexesData, null, 2));
    console.log('[deployIndexesViaCLI] Indexes file written:', indexesFilePath);
    
    // 创建 firebase.json
    const firebaseJson = {
      firestore: {
        indexes: 'firestore.indexes.json'
      }
    };
    fs.writeFileSync(firebaseJsonPath, JSON.stringify(firebaseJson, null, 2));
    
    // 创建 npm 缓存目录
    const npmCacheDir = path.join(tempDir, '.npm-cache');
    const npmHomeDir = path.join(tempDir, '.npm-home');
    fs.mkdirSync(npmCacheDir, { recursive: true });
    fs.mkdirSync(npmHomeDir, { recursive: true });
    
    // 设置认证环境变量和 npm 缓存目录
    const env: Record<string, string> = {
      ...process.env,
      FIREBASE_PROJECT: projectId,
      CI: 'true', // 设置为 CI 模式，避免交互式提示
      // 设置 npm 缓存目录到临时目录，避免权限问题
      NPM_CONFIG_CACHE: npmCacheDir,
      NPM_CONFIG_PREFIX: npmHomeDir,
      HOME: npmHomeDir, // 设置 HOME 到临时目录
      USERPROFILE: npmHomeDir, // Windows 兼容
      // 禁用 npm 更新检查，加快执行速度
      NPM_CONFIG_UPDATE_NOTIFIER: 'false',
      NPM_CONFIG_FUND: 'false',
    };
    
    if (serviceAccount) {
      // 使用 Service Account
      // 确保 serviceAccount 是字符串格式
      let serviceAccountJson: string;
      if (typeof serviceAccount === 'string') {
        // 验证 JSON 格式
        try {
          JSON.parse(serviceAccount);
          serviceAccountJson = serviceAccount;
        } catch (e) {
          return {
            success: false,
            message: 'Service Account JSON 格式无效',
            error: '无法解析 Service Account JSON: ' + (e as Error).message
          };
        }
      } else {
        serviceAccountJson = JSON.stringify(serviceAccount);
      }
      
      const serviceAccountPath = path.join(tempDir, 'serviceAccount.json');
      fs.writeFileSync(serviceAccountPath, serviceAccountJson);
      env.GOOGLE_APPLICATION_CREDENTIALS = serviceAccountPath;
    } else if (accessToken) {
      // 使用 Access Token
      env.FIREBASE_TOKEN = accessToken;
    }
    
    // 执行 Firebase CLI 命令
    // 注意：在 Netlify Function 环境中，Firebase CLI 可能不可用
    // 我们尝试使用 npx firebase-tools，如果失败则返回手动部署说明
    // 使用 --cache 参数指定缓存目录，避免权限问题
    const deployCommand = `npx --yes --cache=${npmCacheDir} firebase-tools@latest deploy --only firestore:indexes --project ${projectId} --cwd ${tempDir} --non-interactive`;
    
    console.log('[deployIndexesViaCLI] Executing command:', deployCommand);
    console.log('[deployIndexesViaCLI] Environment variables:', {
      GOOGLE_APPLICATION_CREDENTIALS: env.GOOGLE_APPLICATION_CREDENTIALS ? 'SET' : 'NOT SET',
      FIREBASE_TOKEN: env.FIREBASE_TOKEN ? 'SET' : 'NOT SET',
      FIREBASE_PROJECT: env.FIREBASE_PROJECT,
      CI: env.CI
    });
    
    let stdout = '';
    let stderr = '';
    
    try {
      const result = await execAsync(deployCommand, {
        cwd: tempDir,
        env,
        timeout: 120000 // 120秒超时（Firebase CLI 可能需要更长时间）
      });
      stdout = result.stdout;
      stderr = result.stderr;
      console.log('[deployIndexesViaCLI] Command stdout:', stdout.substring(0, 500));
      console.log('[deployIndexesViaCLI] Command stderr:', stderr.substring(0, 500));
    } catch (execError: any) {
      // 如果执行失败，返回错误信息
      stderr = execError.stderr || execError.message || String(execError);
      stdout = execError.stdout || '';
      console.error('[deployIndexesViaCLI] Command failed:', stderr);
      console.error('[deployIndexesViaCLI] Command stdout:', stdout);
    }
    
    // 清理临时文件
    if (tempDir) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
        console.log('[deployIndexesViaCLI] Temp directory cleaned');
      } catch (e) {
        console.warn('[deployIndexesViaCLI] Failed to clean temp directory:', e);
      }
    }
    
    // 检查部署是否成功
    // Firebase CLI 成功时会输出 "Deploy complete!" 或类似信息
    const isSuccess = stdout.includes('Deploy complete') || 
                     stdout.includes('deployed successfully') ||
                     stdout.includes('All indexes deployed') ||
                     (stdout.length > 0 && stderr.length === 0);
    
    if (!isSuccess) {
      // 组合错误信息
      const errorMsg = stderr || stdout || '未知错误';
      console.error('[deployIndexesViaCLI] Deployment failed:', errorMsg);
      return {
        success: false,
        message: '索引部署失败',
        error: errorMsg,
        output: stdout // 也返回 stdout，可能包含有用信息
      };
    }
    
    return {
      success: true,
      message: `成功部署 ${indexesData.indexes.length} 个索引`,
      output: stdout
    };
  } catch (error: any) {
    console.error('[deployIndexesViaCLI] Unexpected error:', error);
    // 清理临时文件
    if (tempDir) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (e) {
        // 忽略清理错误
      }
    }
    return {
      success: false,
      message: '索引部署失败',
      error: error.message || String(error)
    };
  }
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
    const { projectId, accessToken, serviceAccount, useCLI } = body;

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

    // 如果提供了认证信息且要求使用 CLI，则尝试自动部署
    if (useCLI && (serviceAccount || accessToken)) {
      const deployResult = await deployIndexesViaCLI(
        projectId,
        indexesData,
        serviceAccount,
        accessToken
      );
      
      if (deployResult.success) {
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            success: true,
            projectId,
            indexCount: indexesData.indexes.length,
            message: deployResult.message,
            output: deployResult.output
          })
        };
      } else {
        // 如果 CLI 部署失败，返回错误和手动创建链接
        const consoleUrl = `https://console.firebase.google.com/project/${projectId}/firestore/indexes`;
        
        // 检查是否是 npm 相关错误
        const isNpmError = deployResult.error?.includes('npm') || deployResult.error?.includes('ENOENT');
        const errorMessage = isNpmError 
          ? '由于 Netlify Function 环境限制，无法使用 Firebase CLI 自动部署。请使用以下方法之一：\n1. 在本地执行：firebase deploy --only firestore:indexes\n2. 通过 Firebase Console 手动创建索引'
          : deployResult.message || '自动部署失败，请手动创建索引';
        
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            projectId,
            indexCount: indexesData.indexes.length,
            message: errorMessage,
            error: deployResult.error,
            output: deployResult.output,
            links: [consoleUrl],
            manualDeployCommand: `firebase deploy --only firestore:indexes --project ${projectId}`,
            indexesData: indexesData // 返回索引数据，方便用户查看
          })
        };
      }
    }
    
    // 如果没有提供认证信息，返回 Firebase Console 链接
    const consoleUrl = `https://console.firebase.google.com/project/${projectId}/firestore/indexes`;
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        projectId,
        indexCount: indexesData.indexes.length,
        message: `已准备 ${indexesData.indexes.length} 个索引定义。请提供 Firebase Service Account 或 Access Token 以启用自动部署，或通过 Firebase Console 手动创建。`,
        links: [consoleUrl],
        manualDeployCommand: `firebase deploy --only firestore:indexes --project ${projectId}`
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

