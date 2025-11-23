# Netlify FIREBASE_SERVICE_ACCOUNT 环境变量配置指南

## ❌ 常见问题：Netlify 显示 "At least one key/value pair is required"

**原因：** Netlify 环境变量输入框不接受多行 JSON，需要单行格式。

---

## ✅ 解决方案：使用格式化后的单行 JSON

### 方法 1: 使用格式化脚本（推荐）

1. **保存 Service Account JSON 文件**
   - 将下载的 JSON 文件保存到项目根目录
   - 例如：`service-account.json`

2. **运行格式化脚本**
   ```bash
   node scripts/format-service-account.js service-account.json
   ```

3. **复制输出的单行 JSON**
   - 脚本会输出单行 JSON 字符串
   - 复制整个输出（在 `===` 之间的内容）

4. **配置到 Netlify**
   - 打开 Netlify Dashboard > Site settings > Environment variables
   - 点击 "Add a variable"
   - Key: `FIREBASE_SERVICE_ACCOUNT`
   - Value: 粘贴刚才复制的单行 JSON
   - 点击 "Save"

---

### 方法 2: 手动格式化（如果脚本不可用）

1. **打开下载的 JSON 文件**

2. **使用文本编辑器转换为单行**
   - 方法 A: 使用在线工具（如 JSON Minifier）
   - 方法 B: 在代码编辑器中：
     1. 打开 JSON 文件
     2. 使用"查找替换"功能：
        - 查找：`\n`（换行符）或 `\r\n`（Windows 换行）
        - 替换：空格或空字符串
     3. 确保结果是一个单行字符串

3. **验证 JSON 格式**
   - 确保没有换行符（除了 `\n` 在 private_key 字符串内部）
   - 确保所有引号正确闭合
   - 使用在线 JSON 验证工具验证格式

4. **复制并粘贴到 Netlify**

---

## 📋 已格式化的单行 JSON（可直接使用）

如果您已下载了 Service Account JSON 文件，已为您生成了格式化版本：

**文件位置：** `service-account-formatted.txt`

**使用步骤：**
1. 打开 `service-account-formatted.txt` 文件
2. 复制**整个内容**（一行）
3. 在 Netlify Dashboard 中：
   - Key: `FIREBASE_SERVICE_ACCOUNT`
   - Value: 粘贴复制的单行 JSON
   - 点击 "Save"

---

## 🔍 验证配置

### 验证步骤

1. **在 Netlify Dashboard 中**
   - 进入 Environment variables
   - 确认 `FIREBASE_SERVICE_ACCOUNT` 已存在
   - 点击变量查看值（应该显示为一行）

2. **触发重新部署**（可选）
   - 进入 Deploys 标签
   - 点击 "Trigger deploy" > "Clear cache and deploy site"
   - 等待部署完成

3. **查看 Functions 日志**
   - 进入 Functions 标签
   - 点击任一函数查看日志
   - 应该没有 "FIREBASE_SERVICE_ACCOUNT not configured" 错误

---

## 🔧 故障排查

### 问题 1: "At least one key/value pair is required"

**原因：** 
- JSON 包含换行符
- JSON 格式不正确
- 输入框为空

**解决方案：**
1. 使用格式化脚本生成单行 JSON
2. 确保复制的是完整的一行（没有换行）
3. 验证 JSON 格式正确

### 问题 2: "Invalid JSON format"

**原因：**
- JSON 字符串中有语法错误
- 引号未正确转义
- 特殊字符未正确处理

**解决方案：**
1. 使用格式化脚本重新生成
2. 确保 private_key 中的 `\n` 被正确保留（在 JSON 字符串内部）
3. 不要手动修改 JSON 内容

### 问题 3: Netlify Functions 仍显示错误

**原因：**
- 环境变量未保存
- 部署未重新构建
- JSON 格式问题

**解决方案：**
1. 确认环境变量已保存
2. 清除缓存并重新部署
3. 查看 Functions 日志确认错误信息

---

## 📝 配置检查清单

完成配置后，请确认：

- [ ] ✅ `FIREBASE_SERVICE_ACCOUNT` 环境变量已添加到 Netlify
- [ ] ✅ 值格式为单行 JSON 字符串
- [ ] ✅ JSON 格式验证通过（使用在线验证工具）
- [ ] ✅ 已触发重新部署（或等待下次部署）
- [ ] ✅ Netlify Functions 日志无错误

---

## 🎯 快速参考

**格式化脚本：**
```bash
node scripts/format-service-account.js [json文件路径]
```

**输出文件：**
- `service-account-formatted.txt` - 格式化后的单行 JSON

**Netlify 配置：**
- Key: `FIREBASE_SERVICE_ACCOUNT`
- Value: 单行 JSON 字符串（从格式化脚本输出或 `service-account-formatted.txt`）

---

## ✅ 配置完成后

配置完成后，Netlify Functions 应该能够：
- ✅ 初始化 Firebase Admin SDK
- ✅ 访问 Firestore 数据库
- ✅ 发送 FCM 推送通知
- ✅ 管理 FCM Tokens

下一步：测试推送通知功能（参考 `docs/FCM_TESTING_GUIDE.md`）

