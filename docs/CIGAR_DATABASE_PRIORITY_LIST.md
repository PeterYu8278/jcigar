# 雪茄数据库优先录入清单

本文档列出了应该优先录入数据库的雪茄品牌和型号，按流行度和用户需求排序。

---

## 📊 录入策略

### 优先级原则
1. **流行度** - 市场上最常见的品牌和型号
2. **经典款** - 行业标杆和获奖雪茄
3. **用户扫描频率** - 根据实际使用数据调整

### 数据来源
- ✅ Cigar Aficionado 官网和评分数据库
- ✅ 品牌官方网站
- ✅ Halfwheel 专业评测
- ✅ 权威零售商产品页面

---

## 🎯 第一批：顶级品牌核心系列（50款）

### 1. Cohiba（古巴雪茄之王）
**优先录入型号：**
- [ ] Cohiba Robusto
- [ ] Cohiba Siglo VI
- [ ] Cohiba Esplendidos
- [ ] Cohiba Behike 52
- [ ] Cohiba Maduro 5

**数据来源：**
- https://www.habanos.com/en/
- Cigar Aficionado Cohiba 评测

---

### 2. Montecristo（经典品牌）
**优先录入型号：**
- [ ] Montecristo No. 2
- [ ] Montecristo No. 4
- [ ] Montecristo Edmundo
- [ ] Montecristo White Series Rothschilde
- [ ] Montecristo Platinum Series

**数据来源：**
- https://www.habanos.com/en/
- https://www.cigaraficionado.com/

---

### 3. Romeo y Julieta
**优先录入型号：**
- [ ] Romeo y Julieta Churchill
- [ ] Romeo y Julieta Wide Churchill
- [ ] Romeo y Julieta 1875
- [ ] Romeo y Julieta Reserva Real

---

### 4. Partagas
**优先录入型号：**
- [ ] Partagas Serie D No. 4
- [ ] Partagas Lusitanias
- [ ] Partagas Black Label

---

### 5. Davidoff
**优先录入型号：**
- [ ] Davidoff Signature 2000
- [ ] Davidoff Nicaragua
- [ ] Davidoff Aniversario No. 3
- [ ] Davidoff Winston Churchill

**数据来源：**
- https://www.davidoff.com/

---

### 6. Padron
**优先录入型号：**
- [ ] Padron 1964 Anniversary Maduro
- [ ] Padron 1926 Serie
- [ ] Padron 2000 Maduro
- [ ] Padron 3000 Maduro

**评分参考：**
- Padron 1964: 95 分 (Cigar Aficionado)

---

### 7. Arturo Fuente
**优先录入型号：**
- [ ] Arturo Fuente Hemingway
- [ ] Arturo Fuente OpusX
- [ ] Arturo Fuente Don Carlos
- [ ] Arturo Fuente 858

---

### 8. Oliva
**优先录入型号：**
- [ ] Oliva Serie V Melanio
- [ ] Oliva Serie G
- [ ] Oliva Connecticut Reserve
- [ ] Oliva Master Blends 3

---

### 9. My Father
**优先录入型号：**
- [ ] My Father Le Bijou 1922
- [ ] My Father Flor de Las Antillas
- [ ] My Father The Judge

---

### 10. Drew Estate
**优先录入型号：**
- [ ] Liga Privada No. 9
- [ ] Liga Privada T52
- [ ] Undercrown Maduro

---

### 11. Macanudo（温和雪茄首选）
**优先录入型号：**
- [ ] Macanudo Cafe
- [ ] Macanudo Maduro
- [ ] Macanudo Inspirado
- [ ] Macanudo Gold Label

---

### 12. Rocky Patel
**优先录入型号：**
- [ ] Rocky Patel Decade
- [ ] Rocky Patel Vintage 1990
- [ ] Rocky Patel Edge

---

### 13. Ashton
**优先录入型号：**
- [ ] Ashton Classic
- [ ] Ashton VSG (Virgin Sun Grown)
- [ ] Ashton Aged Maduro

---

### 14. Perdomo
**优先录入型号：**
- [ ] Perdomo Champagne
- [ ] Perdomo Reserve 10th Anniversary
- [ ] Perdomo Habano

---

### 15. CAO
**优先录入型号：**
- [ ] CAO Brazilia
- [ ] CAO Italia
- [ ] CAO Flathead

---

## 📋 数据录入模板

### CSV 格式示例

```csv
brand,name,wrapper,binder,filler,strength,flavorProfile,footTasteNotes,bodyTasteNotes,headTasteNotes,description,rating,ratingSource,ratingDate,imageUrl,verified
Cohiba,Cohiba Robusto,Havana,Havana,Havana,medium-full,"木质,香料,皮革,可可","胡椒,雪松,淡淡的香料","浓郁的可可,咖啡,烤坚果","皮革,泥土,持久的香料",Cohiba Robusto 是古巴雪茄的标志性产品...,94,Cigar Aficionado 2020,2020-03-15,https://www.habanos.com/images/cohiba-robusto.jpg,true
```

**注意：** 系统会自动计算并保存 `dataQuality` 字段：
- 烟叶信息（wrapper, binder, filler）完整 → `tobaccoComposition: 'verified'`
- 有风味特征 → `flavorProfile: 'verified'`
- 有品鉴笔记 → `tastingNotes: 'verified'`
- 有评分和来源 → `rating: 'verified'`
- 标记为已验证 → `overall: 'verified'`

### 手动录入表单字段

**基础信息：**
- 品牌：Cohiba
- 名称：Cohiba Robusto

**烟叶信息：**
- 外包叶：Havana
- 粘合叶：Havana
- 填充叶：Havana

**风味与强度：**
- 强度：Medium-Full
- 风味特征：木质, 香料, 皮革, 可可

**品鉴笔记：**
- 茄脚：胡椒, 雪松, 淡淡的香料
- 茄身：浓郁的可可, 咖啡, 烤坚果
- 茄头：皮革, 泥土, 持久的香料

**评分信息：**
- 评分：94
- 来源：Cigar Aficionado 2020
- 日期：2020-03-15

**其他：**
- 描述：Cohiba Robusto 是古巴雪茄的标志性产品...
- 图片 URL：https://...
- 已验证：是

---

## 🔍 数据收集指南

### Cigar Aficionado 查找步骤
1. 访问：https://www.cigaraficionado.com/ratings
2. 搜索品牌和型号
3. 找到评测页面
4. 记录：
   - 评分（0-100）
   - 评测年份
   - 规格（wrapper, binder, filler）
   - 品鉴笔记
   - 风味描述

### Halfwheel 查找步骤
1. 访问：https://halfwheel.com/
2. 搜索雪茄名称
3. 查看详细评测
4. 记录详细的品鉴笔记

### 品牌官网查找步骤
1. 访问品牌官网
2. 找到产品页面
3. 记录官方规格
4. 下载高质量产品图片

---

## 📈 进度追踪

### 当前状态
- 总计划：50 款
- 已完成：0 款
- 进行中：0 款
- 待开始：50 款

### 每周目标
- Week 1: 10 款（顶级品牌）
- Week 2: 15 款（经典品牌）
- Week 3: 15 款（流行品牌）
- Week 4: 10 款（补充品牌）

---

## 💡 录入技巧

### 高效录入方法
1. **批量准备** - 先收集所有数据到 Excel/CSV
2. **批量导入** - 使用 CSV 导入功能一次性导入
3. **逐步验证** - 导入后逐个验证和完善

### 数据质量标准
- ✅ 所有信息必须有来源
- ✅ 评分必须来自权威机构
- ✅ 品鉴笔记必须来自专业评测
- ✅ 图片必须清晰显示茄标
- ✅ 录入后标记为"已验证"

---

## 🎯 快速启动建议

### 今天就可以做的事情：

1. **录入 5 个最常见的雪茄**
   - Cohiba Robusto
   - Montecristo No. 2
   - Romeo y Julieta Churchill
   - Padron 1964 Anniversary
   - Arturo Fuente Hemingway

2. **测试完整流程**
   - 扫描这 5 款雪茄
   - 验证数据库查询是否成功
   - 验证详细信息显示是否正确

3. **收集反馈**
   - 哪些字段最重要？
   - 哪些信息用户最关心？
   - 调整优先级

---

**建议：先录入 5-10 款雪茄测试系统，验证流程顺畅后再批量录入。**

