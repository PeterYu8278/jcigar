// Firebase配置文件
import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Firebase配置
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// 运行时校验：避免无效/缺失配置导致难以定位的问题
// measurementId 是可选的，不参与验证
const requiredConfig = {
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId
};

const missingKeys = Object.entries(requiredConfig)
  .filter(([_, v]) => !v)
  .map(([k]) => {
    // 将 camelCase 转换为 UPPER_SNAKE_CASE
    const envKey = `VITE_FIREBASE_${k.replace(/([A-Z])/g, '_$1').toUpperCase()}`;
    return envKey;
  });

if (missingKeys.length > 0) {
  throw new Error(
    `Firebase 配置缺失，请检查环境变量: ${missingKeys.join(', ')}\n` +
    `请确保在项目根目录创建 .env.local 文件并配置这些变量。\n` +
    `可以参考 env.example 文件。`
  );
}

// 初始化Firebase
const app = initializeApp(firebaseConfig);

// 初始化Firebase服务
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// 启用 Firestore 离线持久化（仅在浏览器环境中）
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err) => {
    // 如果启用失败（例如多标签页冲突），静默处理
    // 多标签页场景下，只有第一个标签页可以启用持久化
    if (err.code === 'failed-precondition') {
      console.warn('[Firebase] 离线持久化启用失败：多个标签页正在使用 Firestore');
    } else if (err.code === 'unimplemented') {
      console.warn('[Firebase] 离线持久化不支持：浏览器不支持 IndexedDB');
    } else {
      console.warn('[Firebase] 离线持久化启用失败:', err);
    }
  });
}

// Messaging 服务延迟初始化（需要在 Service Worker 注册后）
export const getMessagingInstance = async () => {
  if (typeof window === 'undefined') return null;
  
  try {
    const { getMessaging, isSupported } = await import('firebase/messaging');
    const supported = await isSupported();
    if (!supported) return null;
    
    // Service Worker 路径
    const messaging = getMessaging(app);
    return messaging;
  } catch (error) {
    console.error('[Firebase] Failed to initialize messaging:', error);
    return null;
  }
};

export default app;
