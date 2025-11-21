# 账户合并优化方案

## 📊 问题分析

### 当前设计的局限性

**现状：**
```
Google 登录 → 创建新 UID (user_google_456)
用户输入手机号 → 发现已被使用 (user_phone_123)
系统合并 → 复制 user_phone_123 数据到 user_google_456
         → 批量更新所有关联记录的 userId
         → 标记 user_phone_123 为 'merged'
```

**问题：**
1. ❌ 需要更新大量关联记录（积分、订单、活动、驻店）
2. ❌ 可能遗漏某些关联记录
3. ❌ 数据迁移复杂且容易出错
4. ❌ 创建了多余的临时账户
5. ❌ 无法保留原有 userId（可能影响外部系统集成）

---

## 🎯 优化方案

### 方案 A：延迟 Firebase Auth 创建（推荐）

**核心思想：** 在确认手机号之前不创建 Firebase Auth 账户

#### 流程改造

**原流程：**
```
点击 Google 登录
  ↓
signInWithPopup(googleProvider)  ← 立即创建 Firebase Auth
  ↓
创建临时 Firestore 文档
  ↓
跳转到完善资料页面
```

**新流程：**
```
点击 Google 登录
  ↓
getGoogleCredential()  ← 仅获取 Google 凭证，不创建 Auth
  ↓
存储凭证到 sessionStorage
  ↓
跳转到完善资料页面
  ↓
用户输入手机号
  ↓
检查手机号账户
  ├─ 不存在 → 创建新 Firebase Auth
  ├─ 存在且无 Auth → 链接 Google 凭证到现有文档 ✅
  └─ 存在且有 Auth → 执行合并（复制数据）
```

#### 技术实现

```typescript
// 1. 修改 loginWithGoogle
export const initiateGoogleLogin = async () => {
  const provider = new GoogleAuthProvider();
  
  // 使用 signInWithPopup 但不保存结果
  const result = await signInWithPopup(auth, provider);
  
  // 立即登出，仅保留凭证
  const credential = GoogleAuthProvider.credentialFromResult(result);
  await signOut(auth);
  
  // 存储凭证
  if (credential) {
    sessionStorage.setItem('googleCredential', JSON.stringify({
      idToken: credential.idToken,
      accessToken: credential.accessToken,
      email: result.user.email,
      displayName: result.user.displayName,
      photoURL: result.user.photoURL,
    }));
  }
  
  return { success: true, needsProfile: true };
};

// 2. 修改 completeGoogleUserProfile
export const completeGoogleUserProfile = async (
  displayName: string,
  phone: string,
  password: string,
  referralCode?: string
) => {
  // 获取 Google 凭证
  const credentialData = sessionStorage.getItem('googleCredential');
  if (!credentialData) {
    return { success: false, error: new Error('Google 凭证已过期，请重新登录') };
  }
  
  const googleData = JSON.parse(credentialData);
  const normalizedPhone = normalizePhoneNumber(phone);
  
  // 检查手机号对应的账户
  const phoneQuery = query(
    collection(db, 'users'),
    where('profile.phone', '==', normalizedPhone),
    limit(1)
  );
  const phoneSnap = await getDocs(phoneQuery);
  
  if (phoneSnap.empty) {
    // 场景 A: 手机号未使用，创建新账户
    const credential = GoogleAuthProvider.credential(
      googleData.idToken,
      googleData.accessToken
    );
    const result = await signInWithCredential(auth, credential);
    
    // 创建用户文档
    await createUserDocument(result.user.uid, {
      email: googleData.email,
      displayName,
      phone: normalizedPhone,
      referralCode,
    });
    
    // 设置密码
    const emailCredential = EmailAuthProvider.credential(googleData.email, password);
    await linkWithCredential(result.user, emailCredential);
    
    return { success: true };
  }
  
  const existingUserDoc = phoneSnap.docs[0];
  const existingUserId = existingUserDoc.id;
  const existingUser = existingUserDoc.data() as User;
  
  // 检查是否有 Firebase Auth
  const hasAuth = await checkIfUserHasAuth(existingUserId);
  
  if (!hasAuth) {
    // 场景 B: 账户无 Auth，直接链接 Google 凭证 ✅
    // 这是您建议的优化方案！
    
    // 1. 使用现有的 userId 创建 Firebase Auth（自定义 token）
    //    注意：这需要服务端支持（Cloud Functions）
    const customToken = await createCustomToken(existingUserId);
    await signInWithCustomToken(auth, customToken);
    
    // 2. 链接 Google 凭证
    const credential = GoogleAuthProvider.credential(
      googleData.idToken,
      googleData.accessToken
    );
    await linkWithCredential(auth.currentUser!, credential);
    
    // 3. 更新 Firestore 文档（添加邮箱）
    await setDoc(doc(db, 'users', existingUserId), {
      email: googleData.email,
      displayName,
      updatedAt: new Date(),
    }, { merge: true });
    
    // 4. 设置密码
    const emailCredential = EmailAuthProvider.credential(googleData.email, password);
    await linkWithCredential(auth.currentUser!, emailCredential);
    
    // ✅ 完成！无需数据迁移！
    return { success: true, accountLinked: true };
  }
  
  // 场景 C: 账户有 Auth，执行传统合并
  // （保持当前逻辑）
  return await mergeUserAccounts(existingUserId, googleData);
};
```

#### 关键点：Custom Token

**问题：** Firebase Auth 不允许指定 UID

**解决：** 使用 Firebase Admin SDK（Cloud Functions）

```typescript
// functions/src/createCustomToken.ts
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

export const createCustomToken = functions.https.onCall(async (data, context) => {
  // 验证请求（确保是合法的合并请求）
  const { userId, googleIdToken } = data;
  
  // 验证 Google token
  const decodedToken = await admin.auth().verifyIdToken(googleIdToken);
  if (!decodedToken) {
    throw new functions.https.HttpsError('unauthenticated', 'Invalid Google token');
  }
  
  // 检查 userId 对应的账户确实没有 Auth
  try {
    await admin.auth().getUser(userId);
    // 如果能获取到，说明已有 Auth，不允许链接
    throw new functions.https.HttpsError('already-exists', 'User already has Auth');
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      // 确实没有 Auth，可以创建
      const customToken = await admin.auth().createCustomToken(userId);
      return { customToken };
    }
    throw error;
  }
});
```

---

### 方案 B：账户映射表（无需 Cloud Functions）

**核心思想：** 保留两个账户，通过映射表关联

#### 数据结构

```typescript
// 新集合：userMappings
interface UserMapping {
  id: string;  // 映射 ID
  googleAccountId: string;  // Google Auth UID
  phoneAccountId: string;   // 原手机号账户 ID
  primaryAccountId: string;  // 主账户（实际数据所在）
  mergedAt: Date;
  mergeType: 'google_to_phone' | 'phone_to_google';
  status: 'active' | 'inactive';
}

// 用户集合保持不变
// users/user_phone_123 - 原账户（保留所有数据）
// users/user_google_456 - Google 账户（最小化数据）
```

#### 核心服务

```typescript
// services/firebase/userMappingService.ts

/**
 * 创建账户映射（而不是合并数据）
 */
export const createUserMapping = async (
  googleUserId: string,
  phoneUserId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // 创建映射记录
    const mappingRef = doc(db, 'userMappings', googleUserId);
    await setDoc(mappingRef, {
      googleAccountId: googleUserId,
      phoneAccountId: phoneUserId,
      primaryAccountId: phoneUserId,  // 主账户是原手机号账户
      mergedAt: new Date(),
      mergeType: 'google_to_phone',
      status: 'active',
    });
    
    // 在 Google 账户文档中添加映射引用
    await setDoc(doc(db, 'users', googleUserId), {
      mappedToPrimaryAccount: phoneUserId,
      accountType: 'linked',
      updatedAt: new Date(),
    }, { merge: true });
    
    // 在原账户中添加关联的 Google 邮箱
    await setDoc(doc(db, 'users', phoneUserId), {
      linkedAccounts: arrayUnion({
        type: 'google',
        email: googleUserEmail,
        linkedAt: new Date(),
      }),
      updatedAt: new Date(),
    }, { merge: true });
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * 获取用户的主账户 ID
 */
export const getPrimaryAccountId = async (userId: string): Promise<string> => {
  // 检查是否有映射
  const mappingDoc = await getDoc(doc(db, 'userMappings', userId));
  
  if (mappingDoc.exists()) {
    const mapping = mappingDoc.data() as UserMapping;
    return mapping.primaryAccountId;
  }
  
  // 没有映射，直接返回原 ID
  return userId;
};

/**
 * 获取用户数据（自动解析映射）
 */
export const getUserData = async (userId: string): Promise<User | null> => {
  // 获取主账户 ID
  const primaryId = await getPrimaryAccountId(userId);
  
  // 读取主账户数据
  const userDoc = await getDoc(doc(db, 'users', primaryId));
  
  if (!userDoc.exists()) {
    return null;
  }
  
  return {
    id: primaryId,
    ...userDoc.data(),
  } as User;
};
```

#### 前端集成

```typescript
// store/modules/auth.ts

// 修改所有用户数据访问
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  
  setUser: async (user: User | null) => {
    if (user) {
      // 自动解析映射
      const userData = await getUserData(user.id);
      set({ user: userData, loading: false });
    } else {
      set({ user: null, loading: false });
    }
  },
  
  // ... 其他方法
}));
```

**优势：**
- ✅ 无需数据迁移
- ✅ 保留原 userId（所有关联记录无需更新）
- ✅ 支持多种登录方式
- ✅ 无需 Cloud Functions
- ✅ 向后兼容

**劣势：**
- ⚠️ 每次读取需要额外一次查询
- ⚠️ 需要修改所有用户数据访问点

---

### 方案 C：保持当前设计（优化性能）

如果不想大改，可以优化当前的合并性能：

#### 优化点

1. **批量操作优化**
```typescript
// 使用批量写入
const batch = writeBatch(db);

// 一次性更新所有记录
pointsRecords.forEach(record => {
  batch.update(record.ref, { userId: newUserId });
});

await batch.commit();  // 一次提交
```

2. **异步合并**
```typescript
// 立即标记为已合并，异步迁移数据
await setDoc(phoneUserRef, { status: 'merging' }, { merge: true });

// 返回成功，让用户先登录
setTimeout(async () => {
  // 后台异步迁移数据
  await migrateUserData(phoneUserId, googleUserId);
  await setDoc(phoneUserRef, { status: 'merged' }, { merge: true });
}, 100);
```

3. **增加索引**
```typescript
// firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "pointsRecords",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" }
      ]
    },
    // ... 其他集合的 userId 索引
  ]
}
```

---

## 📊 方案对比

| 方案 | 优势 | 劣势 | 实施难度 | 推荐度 |
|------|------|------|---------|--------|
| **A: 延迟 Auth 创建** | ✅ 彻底解决<br>✅ 无需迁移<br>✅ 性能最优 | ⚠️ 需要 Cloud Functions<br>⚠️ 改动较大 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **B: 映射表** | ✅ 保留 userId<br>✅ 无需 Functions<br>✅ 向后兼容 | ⚠️ 额外查询<br>⚠️ 改动中等 | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **C: 优化现有** | ✅ 改动最小<br>✅ 立即可用 | ⚠️ 仍需数据迁移<br>⚠️ 治标不治本 | ⭐ | ⭐⭐⭐ |

---

## 🎯 实施建议

### 短期（1-2天）
- 实施**方案 C**：优化批量操作性能
- 添加详细日志，监控合并成功率
- 添加合并失败的回滚机制

### 中期（1-2周）
- 实施**方案 B**：账户映射表
- 逐步迁移现有代码使用映射服务
- A/B 测试新旧方案

### 长期（1个月+）
- 评估 Cloud Functions 成本
- 实施**方案 A**：延迟 Auth 创建
- 完全消除数据迁移

---

## ✅ 结论

您的质疑非常有价值！当前设计确实存在优化空间。

**核心问题：**
- Firebase Auth 一旦创建就无法合并 UID
- 这导致必须复制数据并更新所有关联记录

**最佳解决方案：**
1. **理想情况**：延迟创建 Firebase Auth，先确认账户归属（方案 A）
2. **务实方案**：使用账户映射表，保留原 userId（方案 B）
3. **快速修复**：优化当前合并性能（方案 C）

建议：先实施方案 C 解决眼前问题，然后逐步迁移到方案 B。

