# AI识茄机制详解

## 概述

AI识茄功能使用 Google Gemini AI 模型对雪茄图像进行智能识别，自动提取雪茄的品牌、型号、产地、风味等信息，并可自动保存到数据库。

## 完整工作流程

```
┌─────────────────────────────────────────────────────────────┐
│                    AI识茄完整流程                            │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
    [阶段1]              [阶段2]              [阶段3]
   图像捕获             AI识别分析           结果处理
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ 用户操作     │    │ Gemini API   │    │ 数据存储     │
│              │    │              │    │              │
│ • 拍照       │    │ • 图像分析   │    │ • 匹配检查   │
│ • 上传图片   │    │ • 信息提取   │    │ • 数据保存   │
│ • 输入提示   │    │ • 图片搜索   │    │ • 图片获取   │
└──────────────┘    └──────────────┘    └──────────────┘
```

## 详细机制说明

### 阶段1: 图像捕获与预处理

#### 1.1 图像来源
- **摄像头拍摄**: 使用 `react-webcam` 组件实时捕获
- **文件上传**: 支持图片文件上传（最大10MB）
- **格式**: JPEG格式，Base64编码

#### 1.2 用户提示（可选）
- 用户可手动输入品牌或雪茄名称作为提示
- 提示信息会传递给AI，提高识别准确度
- 使用 `AutoComplete` 组件，支持品牌和雪茄名称自动补全

#### 1.3 图像预处理
```typescript
// 移除Base64头部（如果存在）
const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

// 构建图像数据对象
const imagePart = {
    inlineData: {
        data: base64Data,
        mimeType: "image/jpeg",
    },
};
```

---

### 阶段2: AI识别分析

#### 2.1 模型选择策略（多级回退）

**优先级顺序**:
1. **AppConfig配置的模型**（最高优先级）
   - 从Firebase AppConfig读取
   - 管理员可动态配置

2. **API动态获取的模型**
   - 调用Gemini API获取可用模型列表
   - 自动过滤出Gemini相关模型

3. **默认模型列表**（最低优先级）
   ```typescript
   [
       "gemini-1.5-flash",  // 快速模型，通常最稳定
       "gemini-1.5-pro",    // 较新的模型
       "gemini-pro",        // 经典模型
   ]
   ```

#### 2.2 API调用方式（双重保障）

**方式1: SDK调用**
```typescript
const model = genAI.getGenerativeModel({ model: modelName });
const result = await model.generateContent([prompt, imagePart]);
```

**方式2: REST API调用**（SDK失败时回退）
```typescript
// 直接调用REST API端点
fetch(`https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${API_KEY}`)
```

**错误处理**:
- 如果模型不存在（404错误）→ 尝试下一个模型
- 如果权限/配额错误 → 直接抛出错误
- 所有模型都失败 → 提供详细错误信息

#### 2.3 提示词（Prompt）构建

**核心提示词结构**:
```
分析雪茄图像，识别以下信息：
- 品牌名称
- 完整产品名称（包含尺寸）
- 产地
- 风味特征
- 强度（Mild/Medium/Full）
- 构造细节（茄衣/茄套/茄芯）
- 品吸笔记（脚部/主体/头部）
- 描述
- 评分（0-100）
- 可信度（0-1）
```

**参考数据源**:
- cigar-coop.com
- cigardojo.com
- cigarsratings.com
- halfwheel.com
- cigaraficionado.com
- cigarinspector.com
- cigarjournal.com
- famous-smoke.com
- habanos.com（古巴雪茄）
- leafenthusiast.com
- neptunecigar.com

**用户提示集成**:
- 如果用户提供了提示，会添加到提示词中
- AI会优先考虑用户提供的信息
- 如果与图像识别结果冲突，会在可信度中体现

#### 2.4 响应解析

**JSON格式要求**:
- 返回严格的JSON对象
- 自动清理Markdown代码块（```json）
- 解析为 `CigarAnalysisResult` 类型

**返回数据结构**:
```typescript
interface CigarAnalysisResult {
    brand: string;                    // 品牌名称
    brandDescription?: string;        // 品牌简介
    brandFoundedYear?: number;        // 品牌成立年份
    name: string;                     // 完整名称（包含尺寸）
    origin: string;                   // 产地
    size?: string;                    // 尺寸（如 "Robusto"）
    flavorProfile: string[];          // 风味特征数组
    strength: 'Mild' | 'Medium' | 'Full' | 'Unknown';
    wrapper?: string;                 // 茄衣
    binder?: string;                  // 茄套
    filler?: string;                  // 茄芯
    footTasteNotes?: string[];        // 脚部品吸笔记
    bodyTasteNotes?: string[];        // 主体品吸笔记
    headTasteNotes?: string[];        // 头部品吸笔记
    description: string;              // 描述
    rating?: number;                  // 评分（0-100）
    confidence: number;               // 可信度（0-1）
    possibleSizes?: string[];         // 可能的其他尺寸
    imageUrl?: string;                // 雪茄茄标图片URL
}
```

---

### 阶段3: 图片搜索（自动触发）

#### 3.1 触发条件
- 识别成功（可信度 > 0.5）
- 有品牌和产品名称

#### 3.2 搜索机制
```typescript
async function searchCigarImageUrl(brand: string, name: string)
```

**搜索提示词**:
```
搜索 "${brand} ${name}" 的单支雪茄图片（无左右边距）
要求：
1. 直接图片文件链接（.jpg, .png, .webp）
2. 清晰显示茄标/标签
3. 单支雪茄，无左右边距
4. 优先从权威雪茄网站获取
```

**验证机制**:
- 检查URL格式（http/https）
- 验证图片扩展名
- 支持Cloudinary、Imgur等图片服务

---

### 阶段4: 数据库匹配与存储

#### 4.1 匹配逻辑

**步骤1: 查找匹配的雪茄**
```typescript
findCigarByBrandAndName(brand, name)
```
- 规范化品牌和名称（转小写、去除多余空格）
- 精确匹配数据库中的雪茄记录

**步骤2: 数据完整性检查**
```typescript
checkDataCompleteness(cigar)
```
- 检查必需字段：brand, name, origin, strength
- 检查可选字段的完整性

#### 4.2 存储策略

**情况1: 找到匹配记录**
- **数据完整**: 显示"找到匹配记录（数据完整）"
- **数据不完整**: 自动补充缺失字段，显示"找到匹配记录，已补充数据"

**情况2: 未找到匹配记录**
- 创建新的雪茄记录
- 根据 `possibleSizes` 创建多个尺寸的记录
- 显示"已创建 N 条雪茄记录"

**自动保存条件**:
- 可信度 ≥ 90% → 自动保存
- 可信度 < 90% → 仅显示结果，不自动保存

---

### 阶段5: 结果展示

#### 5.1 显示内容

**基本信息**:
- 品牌名称（金色标题）
- 产品名称 + Rating评分（右侧）
- 强度标签（颜色编码）

**详细信息**:
- 产地、可信度
- 风味标签（金色）
- 雪茄构造（茄衣/茄套/茄芯）
- 品吸笔记（脚部/主体/头部，不同颜色标签）
- 描述文本

**图片显示**:
- **雪茄茄标图像**: 优先显示Gemini搜索到的图片，失败时回退到用户拍摄的图片
- **匹配雪茄图片**: 从数据库匹配的雪茄记录中获取图片（最多5张）

#### 5.2 操作功能

**截图保存**:
- 使用 `html2canvas` 生成截图
- 只截取识别结果区域（不包括操作按钮）
- 保存为PNG格式，文件名：`AI识茄-品牌-名称-时间戳.png`

**分享功能**:
- 优先使用 Web Share API（移动端）
- 支持文件分享和文本分享
- 不支持时回退到下载

**重新拍摄**:
- 重置所有状态
- 返回摄像头视图

---

## 技术架构

### 核心技术栈

**AI服务**:
- Google Gemini AI（多模型支持）
- 支持SDK和REST API两种调用方式
- 多级回退机制确保稳定性

**图像处理**:
- `react-webcam`: 摄像头访问
- `html2canvas`: 截图生成
- Base64编码传输

**数据存储**:
- Firebase Firestore: 雪茄和品牌数据
- 自动匹配和创建逻辑

**状态管理**:
- React Hooks (useState, useCallback, useEffect)
- 本地状态管理

### 关键设计模式

**1. 多级回退机制**
- 模型选择：配置 → API → 默认
- API调用：SDK → REST API
- 图片显示：Gemini搜索 → 用户拍摄

**2. 错误处理**
- 区分可恢复错误（模型不存在）和不可恢复错误（权限问题）
- 提供详细的错误信息和解决建议

**3. 用户体验优化**
- 加载状态提示
- 可信度反馈
- 自动保存提示
- 错误友好提示

---

## 配置要求

### 环境变量
```env
VITE_GEMINI_API_KEY=your_api_key_here
```

### Firebase配置
- AppConfig中的 `gemini.models` 可配置优先使用的模型
- AppConfig中的 `aiCigar.enableDataStorage` 可控制是否自动保存

---

## 性能优化

1. **模型选择**: 优先使用快速模型（gemini-1.5-flash）
2. **并行处理**: 识别和图片搜索可并行执行
3. **缓存机制**: 品牌和雪茄列表缓存，减少数据库查询
4. **懒加载**: 图片按需加载，使用预览功能

---

## 安全考虑

1. **API Key保护**: 使用环境变量，不在代码中硬编码
2. **输入验证**: 文件大小和类型验证
3. **错误信息**: 不暴露敏感信息给用户
4. **数据验证**: 存储前验证数据完整性

---

## 未来优化方向

1. **离线支持**: 缓存识别结果
2. **批量识别**: 支持多张图片批量识别
3. **历史记录**: 保存识别历史
4. **准确度提升**: 使用更先进的模型或微调
5. **多语言支持**: 支持更多语言的识别结果

