/**
 * 雪茄文本搜索服务
 * 
 * 功能：
 * 1. 用户输入雪茄品牌和名称（文本）
 * 2. 直接查询数据库获取详细信息
 * 3. 如果数据库没有，使用 Gemini API 推理
 */

import { getCigarDetails } from './cigarDatabase';
import { updateRecognitionStats } from './cigarRecognitionStats';
import { searchCigarImageWithGoogle } from '../gemini/googleImageSearch';
import { getAppConfig } from '../firebase/appConfig';
import { analyzeCigarByName } from '../gemini/cigarRecognition';
import type { CigarAnalysisResult } from '../gemini/cigarRecognition';

/**
 * 通过文本搜索雪茄信息
 * 
 * @param brandAndName - 用户输入的品牌和名称（例如："Cohiba Robusto"）
 * @returns 雪茄详细信息
 */
export async function searchCigarByText(brandAndName: string): Promise<CigarAnalysisResult | null> {
  if (!brandAndName || !brandAndName.trim()) {
    return null;
  }
  
  const input = brandAndName.trim();
  
  // 尝试解析品牌和名称
  // 策略：假设第一个单词是品牌，其余是名称
  const parts = input.split(/\s+/);
  let brand = parts[0];
  let name = input;
  
  // 如果输入包含多个单词，尝试更智能的拆分
  if (parts.length > 1) {
    // 常见品牌列表（用于智能识别）
    const commonBrands = [
      'Cohiba', 'Montecristo', 'Romeo y Julieta', 'Partagas', 'Davidoff',
      'Padron', 'Arturo Fuente', 'Oliva', 'My Father', 'Drew Estate',
      'Macanudo', 'Rocky Patel', 'Ashton', 'Perdomo', 'CAO',
      'Liga Privada', 'Undercrown', 'Plasencia', 'Alec Bradley', 'Tatuaje'
    ];
    
    // 检查是否以常见品牌开头
    for (const commonBrand of commonBrands) {
      if (input.toLowerCase().startsWith(commonBrand.toLowerCase())) {
        brand = commonBrand;
        name = input.substring(commonBrand.length).trim();
        break;
      }
    }
  }
  
  // 1. 查询数据库
  try {
    const dbResult = await getCigarDetails(brand, name);
    if (dbResult) {
      
      // 构建返回结果
      const result: CigarAnalysisResult = {
        brand: dbResult.brand,
        name: dbResult.name,
        origin: '', // 数据库中没有 origin 字段
        brandDescription: '',
        flavorProfile: dbResult.flavorProfile,
        strength: dbResult.strength as any,
        wrapper: dbResult.wrapper || undefined,
        binder: dbResult.binder || undefined,
        filler: dbResult.filler || undefined,
        footTasteNotes: dbResult.footTasteNotes || undefined,
        bodyTasteNotes: dbResult.bodyTasteNotes || undefined,
        headTasteNotes: dbResult.headTasteNotes || undefined,
        description: dbResult.description || '',
        rating: dbResult.rating || undefined,
        ratingSource: dbResult.ratingSource || undefined,
        ratingDate: dbResult.ratingDate || undefined,
        confidence: 1.0, // 数据库数据，置信度100%
        imageUrl: dbResult.imageUrl || undefined,
        hasDetailedInfo: true,
        databaseId: dbResult.id
      };
      
      // 如果数据库没有图片，尝试搜索
      if (!result.imageUrl) {
        const appConfig = await getAppConfig();
        const imageSearchEnabled = appConfig?.aiCigar?.enableImageSearch ?? true;
        
        if (imageSearchEnabled) {
          try {
            const imageUrl = await searchCigarImageWithGoogle(brand, name);
            if (imageUrl) {
              result.imageUrl = imageUrl;
            }
          } catch (error) {
            // Silently fail
          }
        }
      }
      
      // 更新统计
      updateRecognitionStats({
        brand: result.brand,
        name: result.name,
        confidence: 1.0,
        imageUrlFound: !!result.imageUrl,
        hasDetailedInfo: true
      }).catch(() => {});
      
      return result;
    }
  } catch (error) {
    // Database query failed
  }
  
  // 2. 数据库未找到，使用 Gemini API 推理详细信息
  try {
    // 调用 Gemini API 根据品牌和名称获取详细信息
    const geminiResult = await analyzeCigarByName(name, brand);
    
    // 标注为 AI 推理结果（非数据库验证）
    const result: CigarAnalysisResult = {
      ...geminiResult,
      hasDetailedInfo: false, // 标注为非数据库数据
      confidence: geminiResult.confidence * 0.9 // 文本搜索的置信度略降低
    };
    
    // 如果 Gemini 没有返回图片，尝试搜索图片 URL
    if (!result.imageUrl) {
      const appConfig = await getAppConfig();
      const imageSearchEnabled = appConfig?.aiCigar?.enableImageSearch ?? true;
      
      if (imageSearchEnabled) {
        try {
          const imageUrl = await searchCigarImageWithGoogle(brand, name);
          if (imageUrl) {
            result.imageUrl = imageUrl;
          }
        } catch (error) {
          // Silently fail
        }
      }
    }
    
    // 更新统计
    updateRecognitionStats({
      brand: result.brand,
      name: result.name,
      confidence: result.confidence,
      imageUrlFound: !!result.imageUrl,
      hasDetailedInfo: false
    }).catch(() => {});
    
    return result;
  } catch (error) {
    // Gemini API 失败，返回基础信息
    
    const basicResult: CigarAnalysisResult = {
      brand,
      name,
      origin: '',
      brandDescription: '',
      flavorProfile: [],
      strength: 'Unknown',
      description: `${brand} ${name}`,
      confidence: 0.5, // 文本输入且 API 失败，低置信度
      hasDetailedInfo: false
    };
    
    // 尝试搜索图片
    const appConfig = await getAppConfig();
    const imageSearchEnabled = appConfig?.aiCigar?.enableImageSearch ?? true;
    
    if (imageSearchEnabled) {
      try {
        const imageUrl = await searchCigarImageWithGoogle(brand, name);
        if (imageUrl) {
          basicResult.imageUrl = imageUrl;
        }
      } catch (imgError) {
        // Silently fail
      }
    }
    
    // 更新统计
    updateRecognitionStats({
      brand: basicResult.brand,
      name: basicResult.name,
      confidence: 0.5,
      imageUrlFound: !!basicResult.imageUrl,
      hasDetailedInfo: false
    }).catch(() => {});
    
    return basicResult;
  }
}

