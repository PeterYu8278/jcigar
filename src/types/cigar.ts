/**
 * 雪茄详细信息类型定义
 */

/**
 * 雪茄强度等级
 */
export type CigarStrength = 'mild' | 'medium-mild' | 'medium' | 'medium-full' | 'full';

/**
 * 数据来源类型
 */
export type CigarDataSource = 'manual' | 'imported';

/**
 * 雪茄详细信息接口
 */
export interface CigarDetailedInfo {
  // ===== 基础信息 =====
  id: string;                          // 唯一标识（自动生成）
  brand: string;                       // 品牌（必填）
  name: string;                        // 名称（必填）
  
  // ===== 烟叶信息 =====
  wrapper: string | null;              // 外包叶（如：Connecticut Shade）
  binder: string | null;               // 粘合叶（如：Nicaraguan）
  filler: string | null;               // 填充叶（如：Dominican, Nicaraguan）
  
  // ===== 风味与强度 =====
  strength: CigarStrength | null;      // 强度等级
  flavorProfile: string[];             // 风味标签（如：["木质", "香料", "奶油"]）
  
  // ===== 品鉴笔记 =====
  footTasteNotes: string | null;       // 茄脚风味
  bodyTasteNotes: string | null;       // 茄身风味
  headTasteNotes: string | null;       // 茄头风味
  
  // ===== 综合信息 =====
  description: string | null;          // 产品描述
  
  // ===== 评分信息 =====
  rating: number | null;               // 评分（0-100）
  ratingSource: string | null;         // 评分来源（如：Cigar Aficionado 2023）
  ratingDate: Date | null;             // 评分日期
  
  // ===== 元数据 =====
  imageUrl: string | null;             // 产品图片 URL
  dataSource: CigarDataSource;         // 数据来源
  createdAt: Date;                     // 创建时间
  updatedAt: Date;                     // 更新时间
  createdBy: string;                   // 创建人
  updatedBy: string;                   // 更新人
  verified: boolean;                   // 是否已验证
  
  // ===== 搜索优化 =====
  searchKeywords: string[];            // 搜索关键词（品牌+名称的变体）
  normalizedBrand: string;             // 标准化品牌名（小写、去空格）
  normalizedName: string;              // 标准化名称
}

/**
 * 雪茄详细信息表单数据（用于创建/编辑）
 */
export interface CigarDetailedInfoFormData {
  brand: string;
  name: string;
  wrapper?: string;
  binder?: string;
  filler?: string;
  strength?: CigarStrength;
  flavorProfile?: string[];
  footTasteNotes?: string;
  bodyTasteNotes?: string;
  headTasteNotes?: string;
  description?: string;
  rating?: number;
  ratingSource?: string;
  ratingDate?: Date;
  imageUrl?: string;
  verified?: boolean;
}

/**
 * 雪茄搜索结果（包含相似度）
 */
export interface CigarSearchResult {
  data: CigarDetailedInfo;
  similarity: number;  // 0-1 之间的相似度分数
}

/**
 * 雪茄分析结果（Gemini 识别 + 数据库详细信息）
 */
export interface CigarAnalysisResult {
  // Gemini 识别的基础信息
  brand: string;
  name: string;
  confidence: number;
  imageUrl?: string;
  
  // 数据库详细信息（可选）
  wrapper?: string | null;
  binder?: string | null;
  filler?: string | null;
  strength?: CigarStrength | null;
  flavorProfile?: string[];
  footTasteNotes?: string | null;
  bodyTasteNotes?: string | null;
  headTasteNotes?: string | null;
  description?: string | null;
  rating?: number | null;
  ratingSource?: string | null;
  ratingDate?: Date | null;
  
  // 元数据
  hasDetailedInfo: boolean;  // 是否找到数据库详细信息
  databaseId?: string;       // 数据库记录 ID（如果找到）
}

