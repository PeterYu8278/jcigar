/**
 * AI 识茄结果存储服务
 * 处理数据库匹配、数据完整性检查、品牌和雪茄的创建/更新
 */

import { 
  getCigars, 
  getBrands, 
  getCigarById,
  createDocument, 
  updateDocument,
  COLLECTIONS 
} from './firebase/firestore';
import { createCigar } from './api/cigar';
import type { CigarAnalysisResult } from './gemini/cigarRecognition';
import type { Cigar, Brand } from '../types';

/**
 * 规范化品牌名称（用于匹配）
 */
function normalizeBrandName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * 规范化雪茄名称（用于匹配）
 */
function normalizeCigarName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * 从完整名称中提取尺寸
 * @param fullName 完整名称（如 "Cohiba Robusto"）
 * @param brandName 品牌名称（如 "Cohiba"）
 * @returns 尺寸（如 "Robusto"）
 */
function extractSizeFromName(fullName: string, brandName: string): string {
  const normalizedFullName = fullName.trim();
  const normalizedBrandName = brandName.trim();
  
  // 如果完整名称以品牌名称开头，提取剩余部分作为尺寸
  if (normalizedFullName.toLowerCase().startsWith(normalizedBrandName.toLowerCase())) {
    const size = normalizedFullName.substring(normalizedBrandName.length).trim();
    if (size) {
      return size;
    }
  }
  
  // 如果格式不匹配，尝试从名称中查找常见的尺寸关键词
  const commonSizes = [
    'Robusto', 'Torpedo', 'Churchill', 'Corona', 'Corona Gorda',
    'No.2', 'No.3', 'No.4', 'No.5', 'No.6',
    'Esplendido', 'Lancero', 'Belicoso', 'Petit Corona',
    'Double Corona', 'Toro', 'Gordo', 'Perfecto', 'Figurado'
  ];
  
  for (const size of commonSizes) {
    if (normalizedFullName.toLowerCase().includes(size.toLowerCase())) {
      return size;
    }
  }
  
  return ''; // 无法提取，返回空字符串
}

/**
 * 按品牌和完整名称查找雪茄（精确匹配）
 */
export async function findCigarByBrandAndName(
  brandName: string,
  fullName: string
): Promise<Cigar | null> {
  try {
    const cigars = await getCigars();
    const normalizedBrand = normalizeBrandName(brandName);
    const normalizedName = normalizeCigarName(fullName);
    
    const match = cigars.find(cigar => {
      const cigarBrand = normalizeBrandName(cigar.brand || '');
      const cigarName = normalizeCigarName(cigar.name || '');
      return cigarBrand === normalizedBrand && cigarName === normalizedName;
    });
    
    return match || null;
  } catch (error) {
    console.error('[findCigarByBrandAndName] Error:', error);
    return null;
  }
}

/**
 * 检查雪茄数据是否完整
 */
export function checkDataCompleteness(cigar: Cigar): boolean {
  // 必需字段检查
  if (!cigar.brand || !cigar.name || !cigar.origin || !cigar.strength) {
    return false;
  }
  
  // 重要字段检查（至少有一个）
  const hasImportantFields = 
    (cigar.description && cigar.description.trim().length > 0) ||
    (cigar.metadata?.tags && cigar.metadata.tags.length > 0) ||
    (cigar.images && cigar.images.length > 0);
  
  return hasImportantFields;
}

/**
 * 查找或创建品牌
 */
export async function findOrCreateBrand(
  brandName: string,
  origin: string,
  brandDescription?: string,
  brandFoundedYear?: number
): Promise<string> {
  try {
    // 规范化品牌名称用于匹配
    const normalizedBrandName = normalizeBrandName(brandName);
    
    // 查找现有品牌
    const brands = await getBrands();
    const existingBrand = brands.find(b => 
      normalizeBrandName(b.name) === normalizedBrandName
    );
    
    if (existingBrand) {
      // 如果品牌已存在，检查是否需要更新描述和成立年份
      const updates: Partial<Brand> = {};
      let needsUpdate = false;
      
      // 如果现有品牌没有描述，且AI提供了描述，则更新
      if ((!existingBrand.description || existingBrand.description.trim().length === 0) && 
          brandDescription && brandDescription.trim().length > 0) {
        updates.description = brandDescription.trim();
        needsUpdate = true;
      }
      
      // 如果现有品牌没有成立年份，且AI提供了年份，则更新
      if (!existingBrand.foundedYear && brandFoundedYear) {
        updates.foundedYear = brandFoundedYear;
        needsUpdate = true;
      }
      
      // 如果有更新，执行更新
      if (needsUpdate) {
        updates.updatedAt = new Date();
        await updateDocument<Brand>(COLLECTIONS.BRANDS, existingBrand.id, updates);
      }
      
      return existingBrand.id;
    }
    
    // 创建新品牌
    const newBrandData: Omit<Brand, 'id'> = {
      name: brandName.trim(),
      description: brandDescription?.trim() || '',
      country: origin.trim(),
      status: 'active',
      metadata: {
        totalProducts: 0,
        totalSales: 0,
        rating: 0,
        tags: []
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // 如果AI提供了成立年份，添加到品牌数据中
    if (brandFoundedYear) {
      newBrandData.foundedYear = brandFoundedYear;
    }
    
    // 直接使用 createDocument 创建品牌
    const docResult = await createDocument<Brand>(COLLECTIONS.BRANDS, newBrandData);
    if (docResult.success && docResult.id) {
      return docResult.id;
    }
    
    throw new Error('Failed to create brand');
  } catch (error) {
    console.error('[findOrCreateBrand] Error:', error);
    throw error;
  }
}

/**
 * 合并雪茄数据（数据库优先，AI补充）
 */
function mergeCigarData(
  existing: Cigar,
  aiResult: CigarAnalysisResult,
  size: string
): Partial<Cigar> {
  const updates: Partial<Cigar> = {
    updatedAt: new Date()
  };
  
  // 补充缺失的描述
  if (!existing.description || existing.description.trim().length === 0) {
    if (aiResult.description) {
      updates.description = aiResult.description;
    }
  }
  
  // 补充缺失的图片
  if (!existing.images || existing.images.length === 0) {
    // 图片将在外部添加
  }
  
  // 补充或合并标签
  const existingTags = existing.metadata?.tags || [];
  const aiTags = aiResult.flavorProfile || [];
  const mergedTags = Array.from(new Set([...existingTags, ...aiTags]));
  if (mergedTags.length > 0) {
    updates.metadata = {
      ...existing.metadata,
      tags: mergedTags
    };
  }
  
  // 补充构造信息（如果不存在）
  if (aiResult.wrapper || aiResult.binder || aiResult.filler) {
    const existingConstruction = existing.construction || {};
    updates.construction = {
      wrapper: existingConstruction.wrapper || aiResult.wrapper || undefined,
      binder: existingConstruction.binder || aiResult.binder || undefined,
      filler: existingConstruction.filler || aiResult.filler || undefined
    };
  }
  
  // 补充品吸笔记（如果不存在）
  if (aiResult.footTasteNotes || aiResult.bodyTasteNotes || aiResult.headTasteNotes) {
    const existingTastingNotes = existing.tastingNotes || {};
    updates.tastingNotes = {
      foot: existingTastingNotes.foot || (Array.isArray(aiResult.footTasteNotes) ? aiResult.footTasteNotes : undefined),
      body: existingTastingNotes.body || (Array.isArray(aiResult.bodyTasteNotes) ? aiResult.bodyTasteNotes : undefined),
      head: existingTastingNotes.head || (Array.isArray(aiResult.headTasteNotes) ? aiResult.headTasteNotes : undefined)
    };
  }
  
  return updates;
}

/**
 * 创建或更新雪茄记录（只处理识别到的尺寸，不创建所有可能的尺寸）
 */
export async function createOrUpdateCigarsWithAllSizes(
  aiResult: CigarAnalysisResult,
  brandId: string,
  imageUrl?: string
): Promise<string[]> {
  const createdIds: string[] = [];
  
  try {
    // 主识别结果
    const mainName = aiResult.name.trim();
    const brandBase = aiResult.brand.trim();
    
    // 只使用主识别结果，不生成所有可能的尺寸
    const allNames: string[] = [mainName];
    
    // 转换强度格式
    const strengthMap: Record<string, 'mild' | 'medium' | 'full'> = {
      'Mild': 'mild',
      'Medium': 'medium',
      'Full': 'full',
      'Unknown': 'medium' // 默认值
    };
    const strength = aiResult.strength ? (strengthMap[aiResult.strength] || 'medium') : 'medium';
    
    // 为每个完整名称创建/更新记录
    for (const fullName of allNames) {
      const size = extractSizeFromName(fullName, brandBase);
      
      // 检查是否已存在
      const existing = await findCigarByBrandAndName(brandBase, fullName);
      
      if (existing) {
        // 更新现有记录（合并数据）
        const updates = mergeCigarData(existing, aiResult, size);
        
        // 添加图片（如果提供）
        if (imageUrl) {
          const existingImages = existing.images || [];
          if (!existingImages.includes(imageUrl)) {
            updates.images = [...existingImages, imageUrl];
          }
        }
        
        const updateResult = await updateDocument<Cigar>(
          COLLECTIONS.CIGARS,
          existing.id,
          updates
        );
        
        if (updateResult.success) {
          createdIds.push(existing.id);
        }
      } else {
        // 创建新记录
        const newCigarData: Omit<Cigar, 'id'> = {
          name: fullName,
          brand: brandBase,
          brandId: brandId,
          origin: aiResult.origin.trim(),
          size: size,
          strength: strength,
          price: 0, // 默认价格
          images: imageUrl ? [imageUrl] : [],
          description: aiResult.description || '',
          inventory: {
            stock: 0,
            reserved: 0,
            minStock: 0
          },
          metadata: {
            rating: 0,
            reviews: 0,
            tags: aiResult.flavorProfile || []
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // 添加构造信息（独立字段）
        if (aiResult.wrapper || aiResult.binder || aiResult.filler) {
          newCigarData.construction = {
            wrapper: aiResult.wrapper || undefined,
            binder: aiResult.binder || undefined,
            filler: aiResult.filler || undefined
          };
        }
        
        // 添加品吸笔记（独立字段）
        if (aiResult.footTasteNotes || aiResult.bodyTasteNotes || aiResult.headTasteNotes) {
          newCigarData.tastingNotes = {
            foot: Array.isArray(aiResult.footTasteNotes) ? aiResult.footTasteNotes : undefined,
            body: Array.isArray(aiResult.bodyTasteNotes) ? aiResult.bodyTasteNotes : undefined,
            head: Array.isArray(aiResult.headTasteNotes) ? aiResult.headTasteNotes : undefined
          };
        }
        
        const result = await createCigar(newCigarData, { showSuccess: false });
        if (result.success && result.data && result.data.id) {
          createdIds.push(result.data.id);
        } else {
          // 如果 createCigar 失败，尝试直接使用 createDocument
          const docResult = await createDocument<Cigar>(COLLECTIONS.CIGARS, newCigarData);
          if (docResult.success && docResult.id) {
            createdIds.push(docResult.id);
          } else {
            console.error('Failed to create cigar:', docResult.error);
          }
        }
      }
    }
    
    return createdIds;
  } catch (error) {
    console.error('[createOrUpdateCigarsWithAllSizes] Error:', error);
    throw error;
  }
}

/**
 * 主函数：处理AI识茄结果（先匹配数据库，数据不完整才用AI）
 */
export async function processAICigarRecognition(
  aiResult: CigarAnalysisResult,
  imageUrl?: string
): Promise<{
  matched: boolean;
  dataComplete: boolean;
  brandId: string;
  cigarIds: string[];
  cigars: Cigar[];
}> {
  try {
    // 步骤1：尝试在数据库中匹配
    const existingCigar = await findCigarByBrandAndName(aiResult.brand, aiResult.name);
    
    let matched = false;
    let dataComplete = false;
    let brandId: string;
    let cigarIds: string[] = [];
    let cigars: Cigar[] = [];
    
    if (existingCigar) {
      // 找到匹配
      matched = true;
      dataComplete = checkDataCompleteness(existingCigar);
      
      // 获取品牌ID
      if (existingCigar.brandId) {
        brandId = existingCigar.brandId;
        // 即使品牌ID存在，也尝试更新品牌信息（如果AI提供了新信息）
        await findOrCreateBrand(
          aiResult.brand, 
          aiResult.origin, 
          aiResult.brandDescription, 
          aiResult.brandFoundedYear
        );
      } else {
        // 如果品牌ID不存在，查找或创建品牌
        brandId = await findOrCreateBrand(
          aiResult.brand, 
          aiResult.origin, 
          aiResult.brandDescription, 
          aiResult.brandFoundedYear
        );
        // 更新雪茄的品牌ID
        await updateDocument<Cigar>(COLLECTIONS.CIGARS, existingCigar.id, {
          brandId: brandId
        });
      }
      
      if (!dataComplete) {
        // 数据不完整，使用AI结果补充
        const updates = mergeCigarData(existingCigar, aiResult, existingCigar.size || '');
        if (imageUrl) {
          const existingImages = existingCigar.images || [];
          if (!existingImages.includes(imageUrl)) {
            updates.images = [...existingImages, imageUrl];
          }
        }
        
        await updateDocument<Cigar>(COLLECTIONS.CIGARS, existingCigar.id, updates);
        cigarIds = [existingCigar.id];
        
        // 重新获取更新后的记录
        const updatedCigar = await findCigarByBrandAndName(aiResult.brand, aiResult.name);
        if (updatedCigar) {
          cigars = [updatedCigar];
        }
      } else {
        // 数据完整，直接返回
        cigarIds = [existingCigar.id];
        cigars = [existingCigar];
      }
    } else {
      // 未找到匹配，创建新记录
      matched = false;
      dataComplete = false;
      
      // 查找或创建品牌
      brandId = await findOrCreateBrand(
        aiResult.brand, 
        aiResult.origin, 
        aiResult.brandDescription, 
        aiResult.brandFoundedYear
      );
      
      // 创建所有可能的尺寸记录
      cigarIds = await createOrUpdateCigarsWithAllSizes(aiResult, brandId, imageUrl);
      
      // 获取创建的记录（通过ID获取）
      for (const id of cigarIds) {
        const cigar = await getCigarById(id);
        if (cigar) {
          cigars.push(cigar);
        }
      }
    }
    
    return {
      matched,
      dataComplete,
      brandId,
      cigarIds,
      cigars
    };
  } catch (error) {
    console.error('[processAICigarRecognition] Error:', error);
    throw error;
  }
}

