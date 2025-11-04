/**
 * 手机号迁移脚本
 * 将数据库中所有手机号标准化为 E.164 格式
 * 
 * 使用方法：
 * node scripts/migrate-phone-numbers.js
 * 
 * ⚠️ 警告：
 * 1. 此脚本会修改数据库中的手机号字段
 * 2. 建议先在测试环境运行
 * 3. 运行前建议备份数据库
 * 4. 需要配置 Firebase Admin SDK
 * 
 * 配置方法：
 * 1. 从 Firebase Console 下载服务账户密钥 JSON 文件
 * 2. 将文件放在项目根目录，命名为 serviceAccountKey.json
 * 3. 或设置环境变量 GOOGLE_APPLICATION_CREDENTIALS
 */

const admin = require('firebase-admin')
const path = require('path')
const fs = require('fs')

// 初始化 Firebase Admin SDK
if (!admin.apps.length) {
  try {
    // 方法1：从项目根目录加载服务账户密钥
    const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json')
    
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = require(serviceAccountPath)
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      })
      console.log('✅ Firebase Admin SDK 已初始化（使用服务账户密钥文件）')
    } else {
      console.log('\n❌ 错误：未找到 Firebase 服务账户密钥文件')
      console.log('\n📝 配置步骤：')
      console.log('1. 访问 Firebase Console: https://console.firebase.google.com/')
      console.log('2. 选择你的项目')
      console.log('3. 进入 项目设置 > 服务账号')
      console.log('4. 点击"生成新的私钥"下载 JSON 文件')
      console.log('5. 将文件重命名为 serviceAccountKey.json')
      console.log('6. 放在项目根目录: ' + path.join(__dirname, '..', 'serviceAccountKey.json'))
      console.log('\n或者设置环境变量：')
      console.log('export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccountKey.json"')
      console.log('\n⚠️  注意：serviceAccountKey.json 已添加到 .gitignore，不会被提交到 Git\n')
      process.exit(1)
    }
  } catch (error) {
    console.error('❌ Firebase Admin SDK 初始化失败:', error)
    process.exit(1)
  }
}

const db = admin.firestore()

/**
 * 标准化手机号为 E.164 格式
 */
function normalizePhoneNumber(phone, countryCode = '60') {
  if (!phone) return null
  
  // 清理所有非数字字符（保留+）
  let cleaned = phone.replace(/[^\d+]/g, '')
  
  // 处理多个+（只保留开头的）
  const hasPlus = cleaned.startsWith('+')
  cleaned = cleaned.replace(/\+/g, '')
  
  // 转换逻辑
  let normalized
  
  if (hasPlus) {
    // +601157288278 → +601157288278
    normalized = '+' + cleaned
  } else if (cleaned.startsWith(countryCode)) {
    // 601157288278 → +601157288278
    normalized = '+' + cleaned
  } else if (cleaned.startsWith('0')) {
    // 01157288278 → +601157288278
    normalized = '+' + countryCode + cleaned.substring(1)
  } else {
    // 1157288278 → +601157288278
    normalized = '+' + countryCode + cleaned
  }
  
  // 验证最终格式
  if (!/^\+\d{7,15}$/.test(normalized)) {
    return null
  }
  
  return normalized
}

/**
 * 迁移所有用户的手机号
 */
async function migratePhoneNumbers() {
  try {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📱 开始迁移手机号到 E.164 标准格式')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    const usersRef = db.collection('users')
    const snapshot = await usersRef.get()
    
    console.log(`总用户数: ${snapshot.size}\n`)
    
    let total = 0
    let updated = 0
    let skipped = 0
    let errors = 0
    
    for (const doc of snapshot.docs) {
      total++
      const data = doc.data()
      const phone = data.profile?.phone
      
      if (!phone) {
        skipped++
        continue
      }
      
      const normalized = normalizePhoneNumber(phone)
      
      if (!normalized) {
        console.warn(`⚠️  用户 ${doc.id} (${data.email}): 手机号格式无效 "${phone}"`)
        errors++
        continue
      }
      
      if (normalized === phone) {
        console.log(`✓  用户 ${doc.id} (${data.email}): 已是标准格式 "${phone}"`)
        skipped++
        continue
      }
      
      // 更新为标准化格式
      await doc.ref.update({
        'profile.phone': normalized
      })
      
      console.log(`✅ 用户 ${doc.id} (${data.email}): "${phone}" → "${normalized}"`)
      updated++
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📊 迁移统计：')
    console.log(`   总用户数: ${total}`)
    console.log(`   ✅ 已更新: ${updated}`)
    console.log(`   ⏭️  已跳过: ${skipped}`)
    console.log(`   ❌ 错误数: ${errors}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
  } catch (error) {
    console.error('迁移失败:', error)
    process.exit(1)
  }
}

// 执行迁移
migratePhoneNumbers()
  .then(() => {
    console.log('\n✅ 迁移成功完成！')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ 迁移失败:', error)
    process.exit(1)
  })

