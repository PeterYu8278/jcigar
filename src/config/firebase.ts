// Firebase配置文件
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Firebase配置
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  // 在开发环境使用 localhost，避免 redirect 登录的 init.json 404 错误
  authDomain: import.meta.env.DEV 
    ? 'localhost'
    : import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// 运行时校验：避免无效/缺失配置导致难以定位的问题
const missingKeys = Object.entries(firebaseConfig)
  .filter(([_, v]) => !v)
  .map(([k]) => k);
if (missingKeys.length > 0) {
  throw new Error('Firebase 配置缺失，请检查环境变量 VITE_FIREBASE_*');
}

// 初始化Firebase
const app = initializeApp(firebaseConfig);

// 初始化Firebase服务
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;
