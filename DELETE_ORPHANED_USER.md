# 删除孤立的 Firestore 用户文档

## 问题
用户 `wloong8278@gmail.com` (UID: `3qENcjaJpQNzn7Y98oZJQWNAdSm1`) 在 Firestore 中存在，但在 Firebase Authentication 中已被删除。

## 解决方案：删除孤立文档，让用户重新登录

### 步骤 1: 删除 Firestore 文档

访问 Firebase Console:
1. 打开 https://console.firebase.google.com/
2. 选择您的项目
3. 点击 "Firestore Database"
4. 导航到 `users` 集合
5. 找到文档 ID: `3qENcjaJpQNzn7Y98oZJQWNAdSm1`
6. 点击文档右侧的 "..." 菜单
7. 选择 "Delete document"
8. 确认删除

### 步骤 2: 清理相关数据（如果有）

检查并删除以下集合中与该用户相关的数据：

#### A. 订单 (orders)
```
集合: orders
查询条件: userId == "3qENcjaJpQNzn7Y98oZJQWNAdSm1"
操作: 删除所有匹配的文档
```

#### B. 活动参与记录 (events)
```
集合: events
查询条件: participants.registered 或 participants.checkedIn 包含 "3qENcjaJpQNzn7Y98oZJQWNAdSm1"
操作: 从数组中移除该 UID
```

#### C. 积分记录 (如果有独立集合)
```
集合: points_records (如果存在)
查询条件: userId == "3qENcjaJpQNzn7Y98oZJQWNAdSm1"
操作: 删除所有匹配的文档
```

#### D. 引荐关系 (其他用户的 referral.referrals)
```
集合: users
查询条件: referral.referrals 包含 "3qENcjaJpQNzn7Y98oZJQWNAdSm1"
操作: 从数组中移除该 UID，并减少 referral.totalReferred
```

### 步骤 3: 通知用户重新登录

发送邮件给 `wloong8278@gmail.com`:

---
**主题**: 账户数据已重置，请重新登录

您好，

由于系统维护，您的账户数据已被重置。请通过以下步骤重新登录：

1. 访问 https://jcigar.netlify.app/login
2. 点击 "Google 登录" 按钮
3. 选择您的 Google 账户 (wloong8278@gmail.com)
4. 完善个人信息（手机号等）

重新登录后，您将获得一个新的会员编号和初始积分。

如有任何问题，请联系客服。

---

### 步骤 4: 用户重新登录后会发生什么

1. 用户访问 `/login`
2. 点击 "Google 登录"
3. Google 认证成功
4. Firebase Auth 创建新用户 (新 UID，例如: `NEW_UID_456`)
5. 系统检测到 Firestore 中无此 UID 的文档
6. 自动创建新的用户文档:
   ```json
   {
     "id": "NEW_UID_456",
     "email": "wloong8278@gmail.com",
     "displayName": "Wloong8278",
     "memberId": "M000XXX",  // 新的会员编号
     "membership": {
       "points": 50,  // 初始积分
       "level": "bronze"
     }
   }
   ```
7. 跳转到 `/auth/complete-profile` 完善手机号
8. 完成后进入系统

## ⚠️ 注意事项

- **历史数据将丢失**（订单、积分、引荐记录等）
- 用户将获得新的会员编号
- 如果用户之前有引荐其他人，引荐关系会断链

## ✅ 优点

- 操作简单，无需编写代码
- 数据一致性得到保证
- 用户可以立即重新登录

## ❌ 缺点

- 用户历史数据丢失
- 用户需要重新完善信息

