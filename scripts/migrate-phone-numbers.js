/**
 * 手机号迁移脚本
 * 将数据库中所有手机号标准化为 E.164 格式
 * 
 * 使用方法：
 * node scripts/migrate-phone-numbers.js
 */

const admin = require('firebase-admin')
const path = require('path')

// 初始化 Firebase Admin SDK
// 注意：需要配置 Firebase 服务账户密钥
if (!admin.apps.length) {
  console.log('请配置 Firebase Admin SDK 服务账户密钥')
  console.log('或在 Firebase Console 下载密钥文件并替换下面的路径')
  process.exit(1)
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
    console.log('开始迁移手机号...')
    
    const usersRef = db.collection('users')
    const snapshot = await usersRef.get()
    
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
    
    console.log('\n迁移完成！')
    console.log(`总用户数: ${total}`)
    console.log(`已更新: ${updated}`)
    console.log(`跳过: ${skipped}`)
    console.log(`错误: ${errors}`)
    
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

