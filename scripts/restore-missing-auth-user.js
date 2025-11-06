/**
 * Firebase Authentication 用户恢复脚本
 * 
 * 用途：为 Firestore 中存在但 Firebase Auth 中缺失的用户创建 Auth 记录
 * 
 * 使用方法：
 * 1. 下载 Firebase Service Account Key:
 *    - 访问 https://console.firebase.google.com/
 *    - 项目设置 > 服务账号 > 生成新的私钥
 *    - 将文件保存为 serviceAccountKey.json 到此目录
 * 
 * 2. 安装依赖:
 *    npm install firebase-admin
 * 
 * 3. 运行脚本:
 *    node scripts/restore-missing-auth-user.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// 初始化 Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();
const db = admin.firestore();

/**
 * 恢复单个用户
 */
async function restoreSingleUser(uid, email) {
  console.log(`\n🔄 开始恢复用户: ${email} (${uid})`);
  
  try {
    // 1. 检查 Firestore 文档是否存在
    console.log('  📄 检查 Firestore 文档...');
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      console.log(`  ❌ Firestore 中不存在该用户文档`);
      return { success: false, error: 'Firestore document not found' };
    }
    
    const userData = userDoc.data();
    console.log(`  ✅ Firestore 文档存在: ${userData.displayName || '未命名'}`);
    
    // 2. 检查 Firebase Auth 中是否已存在
    console.log('  🔍 检查 Firebase Auth...');
    try {
      const existingUser = await auth.getUser(uid);
      console.log(`  ⚠️ Firebase Auth 中已存在该用户: ${existingUser.email}`);
      return { success: true, alreadyExists: true };
    } catch (error) {
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }
      console.log('  ✅ Firebase Auth 中不存在，可以创建');
    }
    
    // 3. 创建 Firebase Auth 用户（使用指定的 UID）
    console.log('  🔨 创建 Firebase Auth 用户...');
    const userRecord = await auth.createUser({
      uid: uid,
      email: email,
      emailVerified: true,  // 假设邮箱已验证
      displayName: userData.displayName || 'User',
      disabled: false,
    });
    
    console.log(`  ✅ Firebase Auth 用户创建成功!`);
    console.log(`     - UID: ${userRecord.uid}`);
    console.log(`     - Email: ${userRecord.email}`);
    console.log(`     - DisplayName: ${userRecord.displayName}`);
    
    // 4. 更新 Firestore 的 updatedAt 时间戳
    await db.collection('users').doc(uid).update({
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`  ✅ 用户恢复完成!\n`);
    return { success: true, userRecord };
    
  } catch (error) {
    console.error(`  ❌ 恢复失败:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 查找所有孤立的用户（Firestore 有但 Auth 没有）
 */
async function findOrphanedUsers() {
  console.log('🔍 搜索孤立的用户...\n');
  
  const orphanedUsers = [];
  
  try {
    // 获取所有 Firestore 用户
    const usersSnapshot = await db.collection('users').get();
    console.log(`📊 Firestore 中共有 ${usersSnapshot.size} 个用户文档\n`);
    
    for (const doc of usersSnapshot.docs) {
      const uid = doc.id;
      const userData = doc.data();
      
      try {
        // 检查 Firebase Auth 中是否存在
        await auth.getUser(uid);
        // 存在，跳过
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          // 不存在，记录为孤立用户
          orphanedUsers.push({
            uid: uid,
            email: userData.email,
            displayName: userData.displayName,
            createdAt: userData.createdAt
          });
        }
      }
    }
    
    return orphanedUsers;
  } catch (error) {
    console.error('❌ 搜索失败:', error.message);
    return [];
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('   Firebase Authentication 用户恢复工具');
  console.log('═══════════════════════════════════════════════════\n');
  
  // 方式 1: 恢复特定用户
  const specificUsers = [
    { uid: '3qENcjaJpQNzn7Y98oZJQWNAdSm1', email: 'wloong8278@gmail.com' }
  ];
  
  console.log('📋 模式: 恢复指定用户\n');
  
  const results = [];
  for (const user of specificUsers) {
    const result = await restoreSingleUser(user.uid, user.email);
    results.push({ ...user, result });
  }
  
  // 方式 2: 查找并恢复所有孤立用户（取消注释以启用）
  /*
  console.log('📋 模式: 查找所有孤立用户\n');
  const orphanedUsers = await findOrphanedUsers();
  
  if (orphanedUsers.length === 0) {
    console.log('✅ 没有发现孤立用户\n');
  } else {
    console.log(`⚠️ 发现 ${orphanedUsers.length} 个孤立用户:\n`);
    orphanedUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.uid})`);
      console.log(`   DisplayName: ${user.displayName || '未设置'}`);
      console.log(`   Created: ${user.createdAt?.toDate?.() || 'Unknown'}\n`);
    });
    
    // 批量恢复（需要确认）
    console.log('🔄 开始批量恢复...\n');
    for (const user of orphanedUsers) {
      const result = await restoreSingleUser(user.uid, user.email);
      results.push({ ...user, result });
    }
  }
  */
  
  // 打印总结
  console.log('\n═══════════════════════════════════════════════════');
  console.log('   恢复结果总结');
  console.log('═══════════════════════════════════════════════════\n');
  
  const successful = results.filter(r => r.result.success);
  const failed = results.filter(r => !r.result.success);
  
  console.log(`✅ 成功: ${successful.length}`);
  console.log(`❌ 失败: ${failed.length}\n`);
  
  if (successful.length > 0) {
    console.log('成功恢复的用户:');
    successful.forEach(r => {
      console.log(`  - ${r.email} (${r.uid})`);
    });
    console.log('');
  }
  
  if (failed.length > 0) {
    console.log('恢复失败的用户:');
    failed.forEach(r => {
      console.log(`  - ${r.email}: ${r.result.error}`);
    });
    console.log('');
  }
  
  console.log('═══════════════════════════════════════════════════\n');
  
  // 退出
  process.exit(0);
}

// 运行
main().catch(error => {
  console.error('💥 脚本执行失败:', error);
  process.exit(1);
});

