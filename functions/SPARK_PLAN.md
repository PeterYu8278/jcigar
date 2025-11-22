# Firebase Spark 计划优化指南

本文档说明如何确保 Cloud Functions 在 Firebase Spark（免费）计划上正常运行。

---

## 📋 Spark 计划限制

### Cloud Functions 限制

| 资源 | Spark 计划限制 | 说明 |
|------|---------------|------|
| **超时时间** | 最大 60 秒（1st gen）<br>最大 540 秒（2nd gen） | HTTP 函数默认 60 秒<br>定时任务可以设置 540 秒 |
| **内存** | 最大 256 MB | 默认值，足够大多数应用 |
| **并发** | 限制较低 | 适合中小型应用 |
| **调用次数** | 每月前 125,000 次免费 | 超出后按使用量计费 |
| **计算时间** | 每月前 40,000 GB-秒免费 | 超出后按使用量计费 |

### 支持的触发器

✅ **支持**：
- HTTP 触发器（Callable Functions）
- Firestore 触发器（onUpdate, onCreate, onDelete）
- Pub/Sub 定时任务（Scheduled Functions）

❌ **不支持**：
- Cloud Storage 触发器（需要 Blaze 计划）
- Pub/Sub 消息触发器（需要 Blaze 计划）

---

## ✅ 当前实现优化

### 1. sendNotification（HTTP Callable）

```typescript
functions
  .runWith({
    timeoutSeconds: 60,    // Spark 计划最大超时
    memory: "256MB",       // Spark 计划默认内存
  })
  .https.onCall(...)
```

**优化点**：
- ✅ 超时设置 60 秒（Spark 计划最大）
- ✅ 内存使用 256MB（默认值）
- ✅ 快速执行（发送通知通常只需几秒）

### 2. onReloadVerified（Firestore 触发器）

```typescript
functions
  .runWith({
    timeoutSeconds: 60,
    memory: "256MB",
  })
  .firestore.document("reloadRecords/{recordId}")
  .onUpdate(...)
```

**优化点**：
- ✅ 超时设置 60 秒
- ✅ 仅在充值验证时触发，频率低
- ✅ 快速执行（单次发送通知）

### 3. sendEventReminders（定时任务）

```typescript
functions
  .runWith({
    timeoutSeconds: 540,   // 2nd gen 函数最大超时（9分钟）
    memory: "256MB",
  })
  .pubsub.schedule("0 9 * * *")
  .timeZone("Asia/Kuala_Lumpur")
  .onRun(...)
```

**优化点**：
- ✅ 超时设置 540 秒（2nd gen 最大超时）
- ✅ 批量处理（每批 50 个用户）
- ✅ 错误处理（单个用户失败不影响其他用户）
- ✅ 早期返回（没有活动时立即返回）

---

## 🎯 性能优化建议

### 1. 批量处理优化

**当前实现**：
```typescript
// 每批处理 50 个用户
const BATCH_SIZE = 50;
```

**原因**：
- 避免一次性处理太多用户导致超时
- 控制内存使用
- 适合 Spark 计划的并发限制

### 2. 错误处理

所有函数都包含完善的错误处理：
- 单个操作失败不影响整体执行
- 记录详细的错误日志
- 标记失效的令牌

### 3. 早期返回

```typescript
if (eventsSnapshot.empty) {
  console.log("[sendEventReminders] No events starting tomorrow");
  return null; // 立即返回，不消耗计算时间
}
```

---

## 💰 成本估算

### 月度免费额度

| 资源 | 免费额度 | 说明 |
|------|---------|------|
| **调用次数** | 125,000 次/月 | 约每天 4,166 次 |
| **计算时间** | 40,000 GB-秒/月 | 256MB × 156,250 秒 |
| **网络出站** | 5 GB/月 | 推送通知数据 |

### 典型使用场景

**场景 1：充值验证通知**
- 频率：每天约 10-50 次
- 每次调用：约 2-3 秒
- 月度消耗：约 300-1,500 次调用，约 1-3 GB-秒
- **成本**：完全在免费额度内 ✅

**场景 2：活动提醒**
- 频率：每天 1 次（定时任务）
- 每次调用：约 30-60 秒（取决于活动数量）
- 月度消耗：30 次调用，约 15-30 GB-秒
- **成本**：完全在免费额度内 ✅

**场景 3：手动测试通知**
- 频率：用户手动触发，通常很少
- **成本**：几乎为零 ✅

---

## ⚠️ 注意事项

### 1. 超时风险

**定时任务**：
- 如果活动数量很多（>100 个活动），可能需要分批处理
- 当前实现已限制每批处理 50 个用户

**建议**：
- 定期检查函数日志
- 如果发现超时，减少批量大小

### 2. 并发限制

Spark 计划的并发限制较低，如果同时有大量充值验证：
- 函数会排队执行
- 不会丢失请求
- 响应时间可能稍长

### 3. 免费额度用完

如果超出免费额度：
- Cloud Functions 会继续运行
- 超出部分按使用量计费
- 价格相对便宜（通常每月几美元）

---

## 🔧 监控和维护

### 查看使用情况

1. **Firebase Console**
   - 访问：https://console.firebase.google.com/project/cigar-56871/usage
   - 查看 Cloud Functions 使用量

2. **查看日志**
   ```bash
   firebase functions:log
   ```

3. **设置告警**
   - 在 Firebase Console 设置使用量告警
   - 接近免费额度时收到通知

### 优化建议

如果使用量接近免费额度：

1. **减少定时任务频率**
   - 将活动提醒改为每周一次
   - 或只发送给活跃用户

2. **优化批量处理**
   - 减少批量大小
   - 增加批量间隔

3. **升级到 Blaze 计划**
   - 需要更多功能时
   - 继续享受免费额度 + 按使用量计费

---

## ✅ 总结

当前的 Cloud Functions 实现已经完全优化，适合 Spark 计划：

- ✅ 所有函数都设置了合适的超时和内存
- ✅ 批量处理优化，避免超时
- ✅ 完善的错误处理
- ✅ 早期返回优化
- ✅ 典型使用场景下完全在免费额度内

**预期成本**：$0/月（正常使用下）

---

## 📚 相关文档

- [Firebase 定价](https://firebase.google.com/pricing)
- [Cloud Functions 配额](https://firebase.google.com/docs/functions/quotas)
- [Spark 计划限制](https://firebase.google.com/support/faq#spark-plan-features)

