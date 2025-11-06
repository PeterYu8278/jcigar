# 如何获取 Firebase Service Account Key

## 步骤 1: 访问 Firebase Console

打开浏览器，访问：
```
https://console.firebase.google.com/
```

## 步骤 2: 选择项目

点击您的项目（应该是 `cigar-56871` 或类似名称）

## 步骤 3: 进入项目设置

1. 点击左上角的 **齿轮图标 ⚙️** (设置)
2. 选择 **"项目设置"** (Project settings)

## 步骤 4: 进入服务账号

1. 点击顶部的 **"服务账号"** (Service accounts) 标签
2. 您会看到类似这样的界面：

```
Firebase Admin SDK
Node.js
Python
Go
Java
```

## 步骤 5: 生成新的私钥

1. 确保选择了 **"Node.js"** 标签
2. 滚动到页面底部
3. 点击 **"生成新的私钥"** (Generate new private key) 按钮
4. 会弹出确认对话框：
   ```
   确定要生成新的私钥吗？
   此密钥可用于验证您的应用程序对 Firebase 的访问权限。
   请妥善保管此密钥，不要将其提交到公开的代码库中。
   ```
5. 点击 **"生成密钥"** (Generate key)

## 步骤 6: 保存密钥文件

1. 浏览器会自动下载一个 JSON 文件（例如：`cigar-56871-firebase-adminsdk-xxxxx-xxxxxxxxxx.json`）
2. 将文件重命名为 `serviceAccountKey.json`
3. 移动到项目的 `scripts/` 目录：
   ```
   C:\Users\User\Documents\Cursor projects\JEP Ventures\Cigar-App-2\scripts\serviceAccountKey.json
   ```

## 步骤 7: 验证文件内容

打开 `serviceAccountKey.json`，应该包含类似的内容：

```json
{
  "type": "service_account",
  "project_id": "cigar-56871",
  "private_key_id": "xxxxxxxxxxxxxxxxxxxxxxxxxx",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@cigar-56871.iam.gserviceaccount.com",
  "client_id": "xxxxxxxxxxxxxxxxxxxx",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

## ⚠️ 重要安全提示

**NEVER commit this file to Git!**

文件已自动添加到 `.gitignore`，但请再次确认：

1. 检查 `.gitignore` 是否包含：
   ```
   serviceAccountKey.json
   **/serviceAccountKey.json
   ```

2. 永远不要将此文件：
   - 上传到 GitHub
   - 分享给他人
   - 发送到公开渠道

3. 如果不小心泄露，立即：
   - 访问 Firebase Console → 服务账号
   - 删除该密钥
   - 生成新的密钥

## 完成后

Service Account Key 准备好后，运行：

```bash
node scripts/restore-missing-auth-user.cjs
```

这将恢复用户 `wloong8278@gmail.com` 的 Firebase Authentication 账户，保留其所有数据！

