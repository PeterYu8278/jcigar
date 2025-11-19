# 会员期限获取流程说明

## 流程图

```
┌─────────────────────────────────────────────────────────────┐
│  调用 getUserMembershipPeriod(userId)                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  步骤1: 获取用户所有年费记录                                 │
│  getUserMembershipFeeRecords(userId, 100)                   │
│                                                              │
│  Firestore查询:                                              │
│  - Collection: membershipFeeRecords                         │
│  - Where: userId == userId                                  │
│  - OrderBy: dueDate DESC                                    │
│  - Limit: 100                                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  步骤2: 筛选paid状态的记录                                   │
│  filter: status === 'paid' && deductedAt 存在               │
│                                                              │
│  示例数据:                                                   │
│  [                                                           │
│    { id: '1', status: 'paid', deductedAt: '2025-01-15' },  │
│    { id: '2', status: 'pending', deductedAt: null },        │
│    { id: '3', status: 'paid', deductedAt: '2024-01-10' }   │
│  ]                                                           │
│                                                              │
│  筛选后:                                                     │
│  [                                                           │
│    { id: '1', status: 'paid', deductedAt: '2025-01-15' },  │
│    { id: '3', status: 'paid', deductedAt: '2024-01-10' }   │
│  ]                                                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
         ┌─────────────┴─────────────┐
         │                           │
         ▼                           ▼
    ┌─────────┐              ┌──────────────┐
    │ 有记录? │              │  返回 null   │
    │  否     │              │  (无法确定   │
    └─────────┘              │   会员期限)  │
         │                   └──────────────┘
         │ 是
         ▼
┌─────────────────────────────────────────────────────────────┐
│  步骤3: 按deductedAt降序排序，取最新一条                     │
│  sort((a, b) => b.deductedAt - a.deductedAt)                │
│                                                              │
│  排序后:                                                     │
│  [                                                           │
│    { id: '1', deductedAt: '2025-01-15' },  ← 最新          │
│    { id: '3', deductedAt: '2024-01-10' }                   │
│  ]                                                           │
│                                                              │
│  latestPaidRecord = sortedPaidRecords[0]                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
         ┌─────────────┴─────────────┐
         │                           │
         ▼                           ▼
    ┌─────────┐              ┌──────────────┐
    │有deductedAt?│          │  返回 null   │
    │  否        │          │  (数据异常)   │
    └─────────┘              └──────────────┘
         │
         │ 是
         ▼
┌─────────────────────────────────────────────────────────────┐
│  步骤4: 计算会员期限                                         │
│                                                              │
│  startDate = latestPaidRecord.deductedAt                    │
│  endDate = startDate + 1年                                  │
│                                                              │
│  示例:                                                       │
│  deductedAt: 2025-01-15 10:30:00                           │
│  startDate:  2025-01-15 10:30:00                           │
│  endDate:    2026-01-15 10:30:00                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  返回: { startDate, endDate }                               │
└─────────────────────────────────────────────────────────────┘
```

## 数据示例

### 场景1: 有会员期限（正常情况）

**输入:**
```javascript
userId = "user123"
```

**Firestore数据:**
```javascript
membershipFeeRecords: [
  {
    id: "record1",
    userId: "user123",
    status: "paid",
    deductedAt: Timestamp(2025-01-15 10:30:00),
    dueDate: Timestamp(2025-01-15 10:30:00),
    amount: 1000
  },
  {
    id: "record2",
    userId: "user123",
    status: "pending",
    deductedAt: null,
    dueDate: Timestamp(2026-01-15 10:30:00),
    amount: 1000
  },
  {
    id: "record3",
    userId: "user123",
    status: "paid",
    deductedAt: Timestamp(2024-01-10 08:00:00),
    dueDate: Timestamp(2024-01-10 08:00:00),
    amount: 1000
  }
]
```

**处理过程:**
1. 获取所有记录: 3条
2. 筛选paid记录: 2条 (record1, record3)
3. 排序: record1 (2025-01-15) > record3 (2024-01-10)
4. 最新记录: record1
5. 计算期限:
   - startDate: 2025-01-15 10:30:00
   - endDate: 2026-01-15 10:30:00

**输出:**
```javascript
{
  startDate: Date(2025-01-15 10:30:00),
  endDate: Date(2026-01-15 10:30:00)
}
```

### 场景2: 没有会员期限（当前情况）

**输入:**
```javascript
userId = "yNRzwxsqkkP0nvYFCzsDnZMtVE52"
```

**Firestore数据:**
```javascript
membershipFeeRecords: []  // 空数组
```

**处理过程:**
1. 获取所有记录: 0条
2. 筛选paid记录: 0条
3. 判断: paidRecords.length === 0
4. 返回: null

**输出:**
```javascript
null
```

### 场景3: 有记录但都是pending状态

**Firestore数据:**
```javascript
membershipFeeRecords: [
  {
    id: "record1",
    userId: "user123",
    status: "pending",
    deductedAt: null,
    dueDate: Timestamp(2025-12-31 23:59:59),
    amount: 1000
  }
]
```

**处理过程:**
1. 获取所有记录: 1条
2. 筛选paid记录: 0条 (status不是'paid')
3. 返回: null

## 关键代码逻辑

```typescript
// 1. 获取所有年费记录
const allRecords = await getUserMembershipFeeRecords(userId, 100);

// 2. 筛选paid状态且有deductedAt的记录
const paidRecords = allRecords.filter(r => 
  r.status === 'paid' && r.deductedAt
);

// 3. 如果没有paid记录，返回null
if (paidRecords.length === 0) {
  return null;
}

// 4. 按deductedAt降序排序，取最新的
const sortedPaidRecords = paidRecords.sort((a, b) => {
  const dateA = a.deductedAt?.getTime() || 0;
  const dateB = b.deductedAt?.getTime() || 0;
  return dateB - dateA;  // 降序
});

const latestPaidRecord = sortedPaidRecords[0];

// 5. 计算会员期限（从deductedAt开始，往后1年）
const startDate = new Date(latestPaidRecord.deductedAt);
const endDate = new Date(startDate);
endDate.setFullYear(endDate.getFullYear() + 1);

return { startDate, endDate };
```

## 重要规则

1. **只考虑paid状态的记录**: 只有成功支付（status='paid'）的年费记录才有效
2. **必须有deductedAt**: deductedAt是实际扣费时间，用于确定会员期限起点
3. **取最新的paid记录**: 如果有多条paid记录，取deductedAt最新的
4. **期限固定为1年**: 从deductedAt开始，往后1年
5. **没有paid记录返回null**: 无法确定会员期限

## 为什么当前用户返回null？

从日志可以看到：
```
[getUserMembershipPeriod] 用户年费记录: {
  userId: 'yNRzwxsqkkP0nvYFCzsDnZMtVE52',
  totalRecords: 0,  ← 没有任何年费记录
  records: []
}
```

**原因**: 用户还没有创建任何年费记录，或者所有记录都不是paid状态。

**解决方案**: 
1. 创建年费记录（通过"开通会员"功能）
2. 扣除年费（将记录状态改为'paid'，并设置deductedAt）
3. 之后就能获取到会员期限了

