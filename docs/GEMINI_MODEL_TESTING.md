# Gemini 模型全面测试指南

## 📋 测试目的

对所有 Gemini 模型进行全面测试，评估：
1. 模型可用性和稳定性
2. 图像识别准确度
3. 雪茄数据字段完整度（产地、茄衣、茄套、茄芯、品吸笔记等）
4. 优化模型过滤机制

---

## 🚀 使用方法

### 方法 1：使用页面上已捕获的图片（推荐）

1. **打开应用并导航到 "AI识茄" 页面**
2. **捕获或上传一张雪茄图片**
3. **打开浏览器开发者工具（F12）**
4. **在控制台中运行以下命令：**

```javascript
window.testGeminiModelsWithSampleImage()
```

5. **等待测试完成**（预计 6-10 分钟）

---

### 方法 2：使用自定义 Base64 图片

如果您有自己的 base64 编码图片：

```javascript
const imageBase64 = 'your-base64-string-here...';
window.testGeminiModels(imageBase64);
```

---

## 📊 测试流程

测试将自动执行以下步骤：

### 第 1 步：获取所有模型（无过滤）

```
✅ 使用 v1 API 找到 7 个模型
✅ 使用 v1beta API 找到 27 个模型
✅ 总共找到 34 个支持 generateContent 的 Gemini 模型
```

### 第 2 步：5次测试循环

对每个模型进行 5 次测试：

```
📋 模型 1/34: gemini-2.5-flash
───────────────────────────────────────
🔄 [gemini-2.5-flash] 测试 1/5
✅ 成功 (1523ms)
   品牌: Romeo y Julieta
   名称: Petit Churchills
   置信度: 0.92
   🌿 烟叶构造: 茄衣=✅ 茄套=✅ 茄芯=✅
   👃 品吸笔记: 脚部=✅ Pepper, Wood | 主体=✅ Coffee, Cedar | 头部=✅ Leather, Earth
   📊 数据完整度: 86/100

📊 [gemini-2.5-flash] 测试完成:
   成功次数: 5/5
   成功率: 100.0% ★★★★★
   平均响应时间: 1456ms
   平均置信度: 0.89
   ✅ 状态: 可靠模型 (≥80%)
```

### 第 3 步：生成统计报告

测试完成后，控制台会输出详细的统计报告，包括：

---

## 📈 统计报告内容

### 1. 模型可用性统计

```
📈 模型可用性统计:
────────────────────────────────────────
  总模型数: 34
  可用模型 (≥1次成功): 28
  可靠模型 (≥80%成功率): 16
  不可靠模型 (<50%成功率): 8
  完全失败模型: 6
```

### 2. 模型成功率排名

```
🏆 推荐使用的模型（按成功率排序）:
════════════════════════════════════════
🥇  1. gemini-2.5-flash                    100.0% ★★★★★
      响应: 1456ms | 置信度: 0.89 | 构造: 14/15 | 品吸: 13/15
🥈  2. gemini-2.5-pro                      100.0% ★★★★★
      响应: 2103ms | 置信度: 0.91 | 构造: 15/15 | 品吸: 14/15
🥉  3. gemini-2.0-flash                     96.0% ★★★★★
      响应: 1234ms | 置信度: 0.87 | 构造: 13/15 | 品吸: 12/15
```

### 3. 雪茄数据字段统计

```
📋 雪茄数据字段统计
════════════════════════════════════════

品牌信息:
────────────────────────────────────────
  品牌简介        ✅
    出现率: 78.2% ████████████████░░░░
    有效率: 76.5%
    出现: 133/170 | 有效: 130/133

  成立年份        ⚠️
    出现率: 45.3% █████████░░░░░░░░░░░
    有效率: 42.9%
    出现: 77/170 | 有效: 73/77

🌿 烟叶构造:
────────────────────────────────────────
  茄衣            ✅
    出现率: 82.9% ████████████████░░░░
    有效率: 81.2%

  茄套            ⚠️
    出现率: 68.2% █████████████░░░░░░░
    有效率: 65.3%

  茄芯            ✅
    出现率: 75.3% ███████████████░░░░░
    有效率: 73.5%

👃 品吸笔记:
────────────────────────────────────────
  脚部品吸        ⚠️
    出现率: 58.8% ███████████░░░░░░░░░
    有效率: 56.5%

  主体品吸        ⚠️
    出现率: 61.2% ████████████░░░░░░░░
    有效率: 59.4%

  头部品吸        ⚠️
    出现率: 55.3% ███████████░░░░░░░░░
    有效率: 53.5%
```

### 4. 需要移除的模型

```
❌ 需要移除的模型（完全失败或<30%成功率）:
════════════════════════════════════════
❌ gemini-2.0-flash-exp: 0.0%
   典型错误: [429] Resource exhausted
❌ gemini-2.5-flash-image: 20.0%
   典型错误: Quota exceeded for free tier
```

### 5. 优化建议

```
💡 优化建议:
════════════════════════════════════════
建议过滤以下 6 个模型:
  - gemini-2.0-flash-exp
  - gemini-2.0-flash-exp-image-generation
  - gemini-2.5-flash-image
  - gemini-3-pro-preview
  - gemini-3-pro-image-preview
  - gemini-2.5-computer-use-preview-10-2025

建议优先使用以下 5 个高成功率模型:
  - gemini-2.5-flash (100.0%)
  - gemini-2.5-pro (100.0%)
  - gemini-2.0-flash (96.0%)
  - gemini-2.0-flash-001 (96.0%)
  - gemini-flash-latest (92.0%)

以下 6 个字段出现率较低，建议优化 Prompt:
  - 成立年份 (45.3%)
  - 茄套 (68.2%)
  - 脚部品吸 (58.8%)
  - 主体品吸 (61.2%)
  - 头部品吸 (55.3%)
  - 评分 (38.2%)
```

---

## 📊 查看测试数据

测试完成后，可以使用以下快捷函数查看数据：

### 查看成功率最高的模型

```javascript
window.getTopModels(10)
```

输出示例：
```javascript
[
  {
    model: 'gemini-2.5-flash',
    successRate: '100.0%',
    avgResponseTime: '1456ms',
    avgConfidence: '0.89'
  },
  // ... 更多模型
]
```

### 查看完全失败的模型

```javascript
window.getFailedModels()
```

### 查看字段统计

```javascript
window.getFieldStatistics()
```

输出示例：
```javascript
{
  wrapper: {
    displayName: '茄衣',
    presenceRate: '82.9%',
    validRate: '81.2%'
  },
  binder: {
    displayName: '茄套',
    presenceRate: '68.2%',
    validRate: '65.3%'
  },
  // ... 更多字段
}
```

### 查看完整测试会话

```javascript
window.lastTestSession
```

---

## ⚠️ 注意事项

### 1. API 配额消耗

- **总调用次数**: 约 170 次（34 个模型 × 5 次测试）
- **预计消耗**: 如果使用免费配额，可能会触发 rate limit
- **建议**: 在非高峰时段进行测试

### 2. 测试时长

- **预计耗时**: 6-10 分钟
- **每次测试间隔**: 1 秒（避免 rate limit）
- **不要关闭浏览器标签页**

### 3. 测试结果保存

测试结果保存在：
- `window.lastTestSession` - 完整的测试会话数据
- 浏览器控制台输出 - 所有详细日志

建议将控制台输出保存为文本文件以供后续分析。

---

## 🔧 下一步优化

基于测试结果，可以执行以下优化：

### 1. 更新模型过滤规则

在 `src/services/gemini/cigarRecognition.ts` 的 `filterModelsWithQuota()` 函数中：

```typescript
function filterModelsWithQuota(models: string[]): string[] {
    return models.filter(model => {
        // 根据测试结果，过滤以下模型
        if (model.includes('-exp')) return false;
        if (model.includes('-image')) return false;
        if (model.includes('-computer-use')) return false;
        if (model.startsWith('gemini-3-')) return false;
        // ... 其他过滤规则
        return true;
    });
}
```

### 2. 更新默认模型列表

根据测试结果更新 `DEFAULT_MODELS` 数组，优先使用高成功率模型。

### 3. 优化 Prompt

针对出现率较低的字段（如茄套、品吸笔记），在 Prompt 中添加更明确的指示。

---

## 📝 测试记录模板

建议记录每次测试的关键信息：

```
测试日期: 2024-12-04
测试图片: Romeo y Julieta Petit Churchills
总模型数: 34
可用模型: 28
可靠模型: 16
平均成功率: 78.5%

数据完整度:
  - 茄衣: 82.9%
  - 茄套: 68.2%
  - 茄芯: 75.3%
  - 品吸笔记: 58.4% (平均)

推荐移除模型:
  - gemini-2.0-flash-exp
  - gemini-2.5-flash-image
  - ...

推荐使用模型:
  - gemini-2.5-flash
  - gemini-2.5-pro
  - ...
```

---

## 🎯 测试完成后的行动项

1. ✅ 分析测试报告
2. ✅ 更新模型过滤规则
3. ✅ 优化 Prompt（针对低出现率字段）
4. ✅ 更新文档
5. ✅ 提交代码到 Git

---

**祝测试顺利！** 🚀

