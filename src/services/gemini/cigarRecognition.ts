import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAppConfig } from "../firebase/appConfig";
import { searchCigarImageWithGoogle } from "./googleImageSearch";
import { getCigarDetails } from "../cigar/cigarDatabase";
import { updateRecognitionStats } from "../cigar/cigarRecognitionStats";

/**
 * 获取 Gemini API Key
 * 优先级：
 * 1. 从环境变量 VITE_GEMINI_API_KEY 获取（支持 Netlify 环境变量）
 * 2. 从 Netlify Functions 获取（如果配置了）
 * 
 * Netlify 环境变量配置：
 * - 在 Netlify 控制台的 Site settings > Environment variables 中设置
 * - 变量名: VITE_GEMINI_API_KEY
 * - 构建时会自动注入到 import.meta.env 中
 */
function getGeminiApiKey(): string | undefined {
    // 首先尝试从环境变量获取（支持本地开发和 Netlify 构建时注入）
    let apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    // 如果是在 Netlify 环境中且环境变量未设置，尝试从运行时环境获取
    // 注意：Netlify 在构建时会将环境变量注入，所以这里主要是作为后备方案
    if (!apiKey && typeof window !== 'undefined') {
        // 检测是否在 Netlify 环境中
        const isNetlify = window.location.hostname.includes('netlify.app') || 
                         window.location.hostname.includes('netlify.com');
        
        if (isNetlify) {
            console.warn(
                '⚠️ Gemini API Key 未在环境变量中找到。' +
                '请在 Netlify 控制台的 Environment variables 中设置 VITE_GEMINI_API_KEY'
            );
        }
    }
    
    return apiKey;
}

// 获取 API Key
const API_KEY = getGeminiApiKey();

if (!API_KEY) {
    const envHint = typeof window !== 'undefined' && window.location.hostname.includes('netlify')
        ? '请在 Netlify 控制台的 Environment variables 中设置 VITE_GEMINI_API_KEY'
        : '请在 .env 文件中设置 VITE_GEMINI_API_KEY 或在 Netlify 环境变量中配置';
    
    console.warn(`⚠️ Gemini API Key 缺失！AI 识茄功能将不可用。\n${envHint}`);
}

const genAI = new GoogleGenerativeAI(API_KEY || "");
/**
 * 默认模型列表（基于 Gemini 模型测试系统实测结果）
 * 
 * 测试日期: 2025-12-04
 * 测试配置: 27个模型, 每个测试5次
 * 测试结果: 15个可用 (55.6%), 12个不可用 (44.4%)
 * 
 * ⭐⭐⭐⭐⭐ 强烈推荐（100% 成功率）：
 * 1. gemini-flash-lite-latest (1.8s响应, 可靠性90) ← 最佳
 * 2. gemini-2.5-flash-lite-preview-09-2025 (2.2s, 可靠性88)
 * 3. gemini-2.0-flash-001 (3.5s, 可靠性80)
 * 4. gemini-2.0-flash (3.9s, 可靠性78)
 * 5. gemini-2.5-flash (9.7s, 可靠性71)
 * 6. gemini-pro-latest (15.5s, 可靠性71)
 * 7. gemini-robotics-er-1.5-preview (16.7s, 可靠性71)
 * 
 * ⭐⭐⭐⭐ 推荐使用（60-80% 成功率）：
 * - gemini-2.5-flash-lite (60%, 偶尔503错误)
 * - gemini-flash-latest (80%, 偶尔失败)
 * 
 * ⚠️ 已移除不可用模型（0% 成功率）：
 * - gemini-2.5-flash-live, gemini-2.0-flash-live (不存在)
 * - 所有 -exp, -tts, -image 模型（配额为0或不支持图像）
 */
const DEFAULT_MODELS = [
    // 🥇 最佳选择（极快 + 100% 可靠）
    "gemini-flash-lite-latest",
    "gemini-2.5-flash-lite-preview-09-2025",
    
    // 🥈 优秀选择（快速 + 100% 可靠）
    "gemini-2.0-flash-001",
    "gemini-2.0-flash",
    
    // 🥉 稳定选择（100% 可靠）
    "gemini-2.5-flash",
    "gemini-pro-latest",
    "gemini-robotics-er-1.5-preview",
    
    // 备选方案（60-80% 可靠）
    "gemini-2.5-flash-lite",
    "gemini-flash-latest",
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash-lite-001",
    "gemini-2.0-flash-lite-preview",
    "gemini-2.5-pro",
    
    // 预览版模型（测试中表现良好）
    "gemini-2.5-flash-preview-09-2025",
    "gemini-2.0-flash-lite-preview-02-05"
];

// 辅助函数：直接使用 REST API 调用 Gemini (v1 API)
async function callGeminiRESTAPI(
    modelName: string, 
    prompt: string, 
    imagePart: any
): Promise<CigarAnalysisResult | null> {
    if (!API_KEY) return null;
    
    try {
        // 使用 v1 API 端点
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${API_KEY}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: prompt },
                            imagePart
                        ]
                    }]
                })
            }
        );
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`REST API 错误: ${response.status} - ${JSON.stringify(errorData)}`);
        }
        
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        if (!text) {
            throw new Error('REST API 返回空响应');
        }
        
        // Clean up markdown code blocks if present
        const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
        
        return JSON.parse(jsonStr) as CigarAnalysisResult;
    } catch (error) {
        console.warn(`REST API 调用失败 (${modelName}):`, error);
        return null;
    }
}

/**
 * 过滤模型列表，只保留有免费额度且支持图像输入的模型
 * 
 * 基于 Gemini 模型测试系统实测结果（2025-12-04）：
 * - 测试了 27 个模型，每个测试 5 次
 * - 15 个模型可用（55.6%）
 * - 12 个模型完全不可用（0% 成功率）
 * 
 * ❌ 完全排除（0% 成功率，配额为0或不支持图像）：
 * 1. 所有 "-exp" 实验性模型
 * 2. 所有 "-tts" 文本转语音模型（不支持图像输入）
 * 3. 所有 "-image" 图像生成模型（包括 -image-preview）
 * 4. 所有 "-computer-use" 专用模型
 * 5. 所有 "gemini-3-" 系列
 * 6. 所有 "-live" 后缀模型（不存在）
 * 7. "gemini-2.5-pro-preview-*" 系列
 * 
 * ✅ 推荐使用（100% 成功率）：
 * - gemini-flash-lite-latest (1.8s响应, 可靠性90)
 * - gemini-2.5-flash-lite-preview-09-2025 (2.2s响应, 可靠性88)
 * - gemini-2.0-flash-001 (3.5s响应, 可靠性80)
 * - gemini-2.0-flash (3.9s响应, 可靠性78)
 * - gemini-2.5-flash (9.7s响应, 可靠性71)
 * - gemini-pro-latest (15.5s响应, 可靠性71)
 * - gemini-robotics-er-1.5-preview (16.7s响应, 可靠性71)
 */
function filterModelsWithQuota(models: string[]): string[] {
    const preferredModels = models.filter(model => {
        // ❌ 排除所有 "-exp" 实验性模型（测试显示配额为0）
        if (model.includes('-exp')) {
            return false;
        }
        
        // ❌ 排除所有 TTS 模型（不支持图像输入）
        if (model.includes('-tts')) {
            return false;
        }
        
        // ❌ 排除所有图像生成模型（测试显示配额为0）
        if (model.includes('-image')) {
            return false;
        }
        
        // ❌ 排除所有 computer-use 模型（配额为0）
        if (model.includes('-computer-use')) {
            return false;
        }
        
        // ❌ 排除所有 Gemini 3 系列（测试显示配额为0）
        if (model.startsWith('gemini-3-')) {
            return false;
        }
        
        // ❌ 排除不存在的 -live 模型
        if (model.includes('-live')) {
            return false;
        }
        
        // ❌ 排除 gemini-2.5-pro-preview-* 系列（配额为0）
        if (model.includes('gemini-2.5-pro-preview-')) {
            return false;
        }
        
        return true;
    });
    
    if (preferredModels.length > 0) {
        console.log(`[filterModelsWithQuota] 📋 过滤前: ${models.length} 个模型`);
        console.log(`[filterModelsWithQuota] ✅ 过滤后: ${preferredModels.length} 个可用模型`);
        
        if (preferredModels.length < models.length) {
            const removedModels = models.filter(m => !preferredModels.includes(m));
            console.log(`[filterModelsWithQuota] ❌ 已移除 ${removedModels.length} 个不可用模型:`, removedModels);
        }
        
        return preferredModels;
    }
    
    // 如果过滤后没有模型，返回原始列表（避免系统完全无模型可用）
    console.warn('[filterModelsWithQuota] ⚠️ 过滤后无可用模型，使用原始列表');
    return models;
}

// 辅助函数：通过 REST API 获取可用模型列表
async function getAvailableModels(): Promise<string[]> {
    if (!API_KEY) return [];
    
    // 尝试 v1 和 v1beta API，合并所有可用模型
    const apiVersions = ['v1', 'v1beta'];
    const allModels = new Set<string>();
    const modelsByVersion: Record<string, string[]> = {};
    
    for (const version of apiVersions) {
        try {
            // 直接调用 REST API 获取模型列表
            const response = await fetch(
                `https://generativelanguage.googleapis.com/${version}/models?key=${API_KEY}`
            );
            
            if (!response.ok) {
                console.warn(`⚠️ ${version} API 请求失败: ${response.status}`);
                continue; // 尝试下一个版本
            }
            
            const data = await response.json();
            const models = data.models || [];
            
            // 提取模型名称，移除 "models/" 前缀，并检查是否支持 generateContent
            const modelNames = models
                .map((model: { name?: string; supportedGenerationMethods?: string[] }) => {
                    const name = model.name || '';
                    // 移除 "models/" 前缀
                    const modelName = name.replace(/^models\//, '');
                    
                    // 检查模型是否支持 generateContent 方法
                    const supportedMethods = model.supportedGenerationMethods || [];
                    const supportsGenerateContent = supportedMethods.includes('generateContent');
                    
                    // 只返回 gemini 模型且支持 generateContent 的
                    if (modelName && modelName.includes('gemini') && supportsGenerateContent) {
                        return modelName;
                    }
                    return null;
                })
                .filter((name: string | null): name is string => name !== null);
            
            if (modelNames.length > 0) {
                modelsByVersion[version] = modelNames;
                modelNames.forEach((model: string) => allModels.add(model));
                console.log(`✅ 使用 ${version} API 找到 ${modelNames.length} 个模型:`, modelNames);
            }
        } catch (error) {
            console.warn(`⚠️ ${version} API 调用失败:`, error);
            // 继续尝试下一个版本
            continue;
        }
    }
    
    const uniqueModels = Array.from(allModels);
    
    if (uniqueModels.length > 0) {
        // 过滤模型，优先使用有额度的稳定模型
        const filteredModels = filterModelsWithQuota(uniqueModels);
        
        if (filteredModels.length < uniqueModels.length) {
            const removedModels = uniqueModels.filter(m => !filteredModels.includes(m));
            console.log(`📋 已过滤 ${removedModels.length} 个无额度的模型:`, removedModels);
        }
        
        console.log(`✅ 从 API 获取可用模型（已过滤）:`, filteredModels);
        // 显示每个模型在哪些版本中可用
        if (Object.keys(modelsByVersion).length > 1) {
            console.log('📋 模型版本分布:', modelsByVersion);
        }
        return filteredModels;
    }
    
    console.warn('⚠️ 无法获取模型列表，使用默认模型列表');
    return [];
}

export interface CigarAnalysisResult {
    brand: string;
    brandDescription?: string;  // 品牌简介
    brandFoundedYear?: number;  // 品牌成立年份
    name: string;              // 完整名称，包含尺寸（如 "Cohiba Robusto"）
    origin: string;
    size?: string;             // 规格/尺寸（如 "Robusto", "Torpedo", "Cigarillo"）
    flavorProfile: string[];
    strength: 'Mild' | 'Medium' | 'Full' | 'Unknown' | 'mild' | 'medium-mild' | 'medium' | 'medium-full' | 'full' | null;
    wrapper?: string;      // 茄衣（最外层烟叶）
    binder?: string;       // 茄套（中间层烟叶）
    filler?: string;       // 茄芯（填充烟叶）
    footTasteNotes?: string[] | string | null;  // 脚部（前1/3）品吸笔记
    bodyTasteNotes?: string[] | string | null;  // 主体（中1/3）品吸笔记
    headTasteNotes?: string[] | string | null;  // 头部（后1/3）品吸笔记
    description: string;
    rating?: number | null;       // 评分（0-100，来自权威网站的评分）
    ratingSource?: string | null;  // 评分来源（如：Cigar Aficionado 2023）
    ratingDate?: Date | null;      // 评分日期
    confidence: number; // 0-1
    possibleSizes?: string[];  // 该品牌可能的其他尺寸（如 ["Robusto", "Torpedo", "Churchill"]）
    imageUrl?: string;     // 雪茄茄标图片 URL（如果可用）
    hasDetailedInfo?: boolean;  // 是否找到数据库详细信息
    databaseId?: string;        // 数据库记录 ID（如果找到）
}

export async function analyzeCigarImage(
    imageBase64: string,
    userHint?: string
): Promise<CigarAnalysisResult> {
    if (!API_KEY) {
        const envHint = typeof window !== 'undefined' && window.location.hostname.includes('netlify')
            ? '请在 Netlify 控制台的 Environment variables 中设置 VITE_GEMINI_API_KEY，然后重新部署。'
            : '请在 .env 文件中设置 VITE_GEMINI_API_KEY 或在 Netlify 环境变量中配置。';
        
        throw new Error(
            `Gemini API Key 未配置。${envHint}\n` +
            `获取 API Key: https://aistudio.google.com/app/apikey`
        );
    }

    // 验证 API Key 格式
    if (!API_KEY.startsWith('AIza')) {
        console.warn('⚠️  API Key 格式可能不正确。Gemini API Key 通常以 "AIza" 开头');
    }

    // 构建场景化的提示词
    // 场景 1: 仅图片
    // 场景 2: 图片 + 用户提示
    const hasUserHint = userHint && userHint.trim();
    
    const scenarioContext = hasUserHint
        ? `
🎯 SCENARIO: Image Analysis with User Hint
You are analyzing a cigar image AND the user has provided helpful information: "${userHint}"

INSTRUCTIONS:
1. First, analyze the image to identify the cigar from visual cues (band, label, wrapper color, size)
2. Then, cross-reference with the user's hint: "${userHint}"
3. If the image and hint match → High confidence (0.85-0.95)
4. If the image is unclear but hint is specific → Medium-high confidence (0.75-0.85)
5. If there's a conflict → Note it and use image as primary source, lower confidence (0.6-0.7)
6. Use the hint to improve identification of subtle details (specific model, vitola, etc.)
`
        : `
🎯 SCENARIO: Pure Image Analysis
You are analyzing a cigar image WITHOUT any user hints.

INSTRUCTIONS:
1. Carefully examine the cigar label for brand name and model information
2. Analyze wrapper color, texture, and construction details
3. Confidence levels:
   - Clear label with readable text → High confidence (0.85-0.95)
   - Partial label or unclear text → Medium confidence (0.7-0.8)
   - No label or very unclear → Low confidence (0.5-0.65)
`;

    const prompt = `
${scenarioContext}

📋 ANALYSIS TASK:
Analyze this cigar image and provide detailed information.
    
    IMPORTANT: You should reference information from authoritative cigar websites and databases to ensure accuracy. 
    Consider searching and referencing information from these reputable sources:
    
    AUTHORITATIVE REVIEW SITES:
    - https://www.cigaraficionado.com/ and https://www.cigaraficionado.com/ratingsandreviews
    - https://halfwheel.com/ and https://halfwheel.com/cigar-reviews/
    - https://cigar-coop.com/
    - https://cigardojo.com/ and https://cigardojo.com/cigar-review-archives/
    - https://cigarsratings.com/
    - https://www.cigarinspector.com/
    - https://www.cigarjournal.com/ and https://www.cigarjournal.com/ratings-and-awards/ratings/
    - https://www.leafenthusiast.com/
    
    MAJOR US RETAILERS:
    - https://www.famous-smoke.com/ and https://www.famous-smoke.com/cigaradvisor
    - https://www.holts.com/
    - https://www.cigarsinternational.com/
    - https://www.jrcigars.com/
    - https://www.neptunecigar.com/ and https://www.neptunecigar.com/cigars
    - https://www.atlanticcigar.com/
    - https://www.cigarplace.biz/
    - https://www.cigarbus.com/
    - https://www.cigarone.com/
    - https://www.puroexpress.com/
    - https://www.70cigars.com/
    
    INTERNATIONAL RETAILERS:
    - https://www.infifon.com/ (Europe)
    - https://www.lacasadelhabano.com/ (Official Habanos distributor)
    - https://www.cgarsltd.co.uk/ (UK)
    - https://www.lacasadeltabaco.com/ (Spain)
    - https://www.hyhpuro.com/ (Asia)
    - https://www.timecigar.com/ (Asia)
    
    CUBAN CIGAR SPECIALISTS:
    - https://www.habanos.com/en/ (Official Cuban cigar website)
    - https://www.cohcigars.com/
    - https://www.topcubans.com/
    
    Use information from these sources to provide accurate details about the cigar's specifications, ratings, reviews, and characteristics.
    
    Return the result strictly as a JSON object with the following keys:
    - brand: string (brand name only, e.g., "Cohiba", "Montecristo")
    - brandDescription: string (a brief description of the brand's history and characteristics, in English, 2-3 sentences. If you cannot determine, use empty string "")
    - brandFoundedYear: number (the year the brand was founded. If you cannot determine, use null or omit this field)
    - name: string (the full cigar name including model or size/vitola, e.g., "Cohiba Robusto", "Montecristo No.2")
    - origin: string (country)
    - size: string (vitola - MUST be a standard cigar size name. Common standard sizes include: Robusto, Torpedo, Churchill, Corona, Cigarillo, Petit Corona, Toro, Gordo, Lancero, Panatela, Belicoso, Pyramid, Perfecto, Culebra, etc. Extract ONLY the standard size name, not descriptive text. For example, if the name is "Placensia Reserva Original Robusto", the size should be "Robusto", not "Reserva Original Robusto".)
    - flavorProfile: array of strings (e.g., ["Earth", "Leather"])
    - strength: "Mild" | "Medium-Mild" | "Medium" | "Medium-Full" | "Full" | "Unknown" (use "Unknown" if uncertain)
    - wrapper: string (the outer leaf/wrapper tobacco, e.g., "Connecticut", "Maduro", "Habano", "Corojo", or country of origin)
    - binder: string (the binder leaf tobacco, e.g., "Nicaraguan", "Ecuadorian", or country of origin)
    - filler: string (the filler tobacco blend, e.g., "Nicaraguan", "Dominican", "Cuban", or country/blend description)
    - footTasteNotes: array of strings (expected tasting notes for the foot/first third, e.g., ["Pepper", "Wood", "Light Spice"])
    - bodyTasteNotes: array of strings (expected tasting notes for the body/middle third, e.g., ["Coffee", "Chocolate", "Cedar"])
    - headTasteNotes: array of strings (expected tasting notes for the head/final third, e.g., ["Leather", "Earth", "Spice"])
    - description: string (a short 2-sentence description of this specific cigar in English)
    - rating: number (cigar rating from 0 to 100, based on ratings from authoritative sources like Cigar Aficionado, Cigar Journal, Halfwheel, etc. If multiple ratings are available, use the average or most recent rating. If no rating is found, use null or omit this field)
    - confidence: number (0.0 to 1.0, how sure are you?)

    📊 THREE-TIER DATA STRATEGY FOR IMAGE ANALYSIS:
    
    TIER 1 - VERIFIED DATA (from training data):
    - Use if you have confirmed information from reviews or manufacturer specs
    - Mark with high confidence (0.85-0.95)
    
    TIER 2 - INFERRED DATA (educated guesses):
    - Use if you can infer from visual cues (wrapper color, brand origin, construction)
    - Examples: Dark wrapper → "Likely Maduro", Cuban brand → "Likely Cuban tobacco"
    - Mark with medium confidence (0.65-0.8)
    - Use qualifiers: "Likely", "Possibly", "Typical"
    
    TIER 3 - NO DATA:
    - Return null if you cannot infer anything
    - Mark with low confidence (0.5-0.65)
    
    ✅ PROVIDE INFERRED DATA WHEN POSSIBLE:
    - wrapper, binder, filler: Can infer from wrapper color, brand origin, construction
    - strength: Can infer from wrapper type (Maduro = fuller), brand reputation
    - flavorProfile: Can provide typical flavors for this wrapper/origin type
    - tastingNotes: Can provide typical progression for this cigar type

    Note: 
    - The "name" field should include the full name with model or size/vitola (e.g., "Cohiba Robusto", not just "Cohiba")
    - The "brand" field should be only the brand name without size (e.g., "Cohiba")
    - The "size" field MUST contain ONLY the standard cigar vitola name (e.g., "Robusto", "Torpedo", "Cigarillo", "Churchill"). Do NOT include descriptive text, series names, or model names in the size field.
    - brandDescription should provide information about the brand's history, reputation, and characteristics
    - brandFoundedYear should be the year the brand was established (e.g., 1966 for Cohiba, 1935 for Montecristo)
    - wrapper, binder, and filler can be identified OR INFERRED from the color, texture, appearance, and brand origin
    - footTasteNotes, bodyTasteNotes, and headTasteNotes should be from verified reviews OR typical progression for this cigar type
    - Foot (first third) typically starts lighter and spicier, Body (middle third) develops complexity, Head (final third) becomes richer and more intense.
    - Provide SOMETHING rather than null when you can make educated inferences, but use qualifiers like "Likely", "Typical"
    If you cannot identify it as a cigar, return confidence 0 and empty strings.
    Output ONLY valid JSON. Do not include markdown formatting like \`\`\`json.
  `;

    // Remove header if present (data:image/jpeg;base64,)
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const imagePart = {
        inlineData: {
            data: base64Data,
            mimeType: "image/jpeg",
        },
    };

    // 获取模型列表的优先级：
    // 1. AppConfig 中配置的模型（最高优先级）
    // 2. 从 API 动态获取的可用模型
    // 3. 硬编码的默认模型（最低优先级）
    
    let configModels: string[] = [];
    try {
        const appConfig = await getAppConfig();
        if (appConfig?.gemini?.models && appConfig.gemini.models.length > 0) {
            configModels = appConfig.gemini.models;
            console.log('✅ 从 AppConfig 获取配置的模型:', configModels);
        }
    } catch (error) {
        console.warn('获取 AppConfig 失败，跳过配置的模型列表:', error);
    }
    
    let availableModels: string[] = [];
    try {
        availableModels = await getAvailableModels();
        if (availableModels.length > 0) {
            console.log('✅ 从 API 获取可用模型:', availableModels);
        }
    } catch (error) {
        console.warn('获取 API 模型列表失败，跳过动态模型列表');
    }
    
    // 使用全局默认模型列表
    const defaultModels = DEFAULT_MODELS;
    
    // 构建最终模型列表：按优先级合并，但只包含可用的模型
    let modelsToTry: string[] = [];
    
    // 如果 API 返回了可用模型列表，优先使用它来过滤
    const validModels = availableModels.length > 0 
        ? availableModels 
        : defaultModels; // 如果没有 API 列表，使用默认模型
    
    if (configModels.length > 0) {
        // 如果 AppConfig 中有配置，优先使用配置的模型（但只保留可用的）
        const validConfigModels = configModels.filter(m => validModels.includes(m));
        const invalidConfigModels = configModels.filter(m => !validModels.includes(m));
        
        if (invalidConfigModels.length > 0) {
            console.warn(`⚠️ AppConfig 中配置的以下模型不可用，将被跳过:`, invalidConfigModels);
        }
        
        // 优先使用配置的模型（已验证可用），然后补充其他可用模型
        modelsToTry = [
            ...validConfigModels,
            ...validModels.filter(m => !validConfigModels.includes(m))
        ];
        console.log('📋 使用 AppConfig 配置的模型列表（优先级最高，已过滤不可用模型）');
    } else {
        // 如果没有 AppConfig 配置，直接使用可用模型列表
        modelsToTry = [...validModels];
        console.log('📋 使用 API 获取的可用模型列表');
    }
    
    // 确保列表不为空
    if (modelsToTry.length === 0) {
        modelsToTry = [...defaultModels];
        console.warn('⚠️ 模型列表为空，使用默认模型（可能部分不可用）');
    }
    
    console.log('🧪 最终尝试模型列表（按优先级）:', modelsToTry);
    
    let lastError: any = null;
    
    // 首先尝试使用 SDK
    for (const modelName of modelsToTry) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const generateResult = await model.generateContent([prompt, imagePart]);
            const response = await generateResult.response;
            const text = response.text();

            // Clean up markdown code blocks if present (just in case)
            const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();

            const analysisResult = JSON.parse(jsonStr) as CigarAnalysisResult;
            
            // 根据品牌和产品名称搜索图片 URL（检查配置是否启用）
            if (analysisResult.brand && analysisResult.name && analysisResult.confidence > 0.5) {
                // 检查是否启用图片搜索
                const appConfig = await getAppConfig();
                const imageSearchEnabled = appConfig?.aiCigar?.enableImageSearch ?? true;
                
                if (imageSearchEnabled) {
                console.log(`[analyzeCigarImage] 开始搜索图片URL - 品牌: ${analysisResult.brand}, 名称: ${analysisResult.name}, 可信度: ${analysisResult.confidence}`);
                try {
                    const imageUrl = await searchCigarImageUrl(analysisResult.brand, analysisResult.name);
                    if (imageUrl) {
                        console.log(`[analyzeCigarImage] ✅ 成功获取图片URL:`, imageUrl);
                        analysisResult.imageUrl = imageUrl;
                    } else {
                        console.warn(`[analyzeCigarImage] ⚠️ 未找到图片URL`);
                    }
                } catch (error) {
                    console.error('搜索雪茄图片 URL 失败:', error);
                    // 不抛出错误，继续返回识别结果
                }
            } else {
                    console.log(`[analyzeCigarImage] ℹ️ 图片URL搜索已禁用（通过AppConfig配置）`);
                }
                
                // 查询数据库获取详细信息
                console.log(`[analyzeCigarImage] 🔍 查询数据库获取详细信息...`);
                try {
                    const detailedInfo = await getCigarDetails(analysisResult.brand, analysisResult.name);
                    if (detailedInfo) {
                        console.log(`[analyzeCigarImage] ✅ 数据库找到匹配项，合并详细信息`);
                        
                        // 合并详细信息到分析结果
                        const finalResult = {
                            ...analysisResult,
                            wrapper: detailedInfo.wrapper,
                            binder: detailedInfo.binder,
                            filler: detailedInfo.filler,
                            strength: detailedInfo.strength,
                            flavorProfile: detailedInfo.flavorProfile,
                            footTasteNotes: detailedInfo.footTasteNotes,
                            bodyTasteNotes: detailedInfo.bodyTasteNotes,
                            headTasteNotes: detailedInfo.headTasteNotes,
                            description: detailedInfo.description,
                            rating: detailedInfo.rating,
                            ratingSource: detailedInfo.ratingSource,
                            ratingDate: detailedInfo.ratingDate,
                            hasDetailedInfo: true,
                            databaseId: detailedInfo.id
                        } as CigarAnalysisResult;
                        
                        // 异步更新 AI 识别统计
                        updateRecognitionStats({
                            brand: analysisResult.brand,
                            name: analysisResult.name,
                            confidence: analysisResult.confidence,
                            imageUrlFound: !!analysisResult.imageUrl,
                            hasDetailedInfo: true
                        }).catch(error => {
                            console.warn('[analyzeCigarImage] ⚠️ 更新识别统计失败（不影响主流程）:', error);
                        });
                        
                        return finalResult;
            } else {
                        console.log(`[analyzeCigarImage] ℹ️ 数据库未找到匹配项`);
                    }
                } catch (error) {
                    console.error('[analyzeCigarImage] ❌ 查询数据库失败:', error);
                    // 不抛出错误，继续返回基础识别结果
                }
            } else {
                console.log(`[analyzeCigarImage] 跳过图片搜索和数据库查询 - 品牌: ${analysisResult.brand}, 名称: ${analysisResult.name}, 可信度: ${analysisResult.confidence}`);
            }
            
            // 更新 AI 识别统计（异步，不阻塞返回）
            const finalResult = {
                ...analysisResult,
                hasDetailedInfo: false
            } as CigarAnalysisResult;
            
            // 异步更新统计信息
            updateRecognitionStats({
                brand: analysisResult.brand,
                name: analysisResult.name,
                confidence: analysisResult.confidence,
                imageUrlFound: !!analysisResult.imageUrl,
                hasDetailedInfo: false
            }).catch(error => {
                console.warn('[analyzeCigarImage] ⚠️ 更新识别统计失败（不影响主流程）:', error);
            });
            
            // 返回基础识别结果（没有详细信息）
            return finalResult;
        } catch (error: any) {
            lastError = error;
            const errorMessage = error?.message || error?.toString() || '';
            const errorString = errorMessage.toLowerCase();
            
            // 如果是模型不支持的错误（404），尝试下一个模型或使用 REST API
            if (errorString.includes('not found') || 
                errorString.includes('404') || 
                errorString.includes('is not found for api version') ||
                errorString.includes('not supported')) {
                console.warn(`模型 ${modelName} 在 SDK 中不可用，尝试使用 REST API...`);
                
                // 尝试直接使用 REST API (v1)
                try {
                    const restResult = await callGeminiRESTAPI(modelName, prompt, imagePart);
                    if (restResult) {
                        // 根据品牌和产品名称搜索图片 URL（检查配置是否启用）
                        if (restResult.brand && restResult.name && restResult.confidence > 0.5) {
                            // 检查是否启用图片搜索
                            const appConfig = await getAppConfig();
                            const imageSearchEnabled = appConfig?.aiCigar?.enableImageSearch ?? true;
                            
                            if (imageSearchEnabled) {
                            console.log(`[analyzeCigarImage] [REST API] 开始搜索图片URL - 品牌: ${restResult.brand}, 名称: ${restResult.name}, 可信度: ${restResult.confidence}`);
                            try {
                                const imageUrl = await searchCigarImageUrl(restResult.brand, restResult.name);
                                if (imageUrl) {
                                    console.log(`[analyzeCigarImage] [REST API] ✅ 成功获取图片URL:`, imageUrl);
                                    restResult.imageUrl = imageUrl;
                                } else {
                                    console.warn(`[analyzeCigarImage] [REST API] ⚠️ 未找到图片URL`);
                                }
                            } catch (error) {
                                console.error('搜索雪茄图片 URL 失败:', error);
                                // 不抛出错误，继续返回识别结果
                            }
                            } else {
                                console.log(`[analyzeCigarImage] [REST API] ℹ️ 图片URL搜索已禁用（通过AppConfig配置）`);
                            }
                            
                            // 查询数据库获取详细信息
                            console.log(`[analyzeCigarImage] [REST API] 🔍 查询数据库获取详细信息...`);
                            try {
                                const detailedInfo = await getCigarDetails(restResult.brand, restResult.name);
                                if (detailedInfo) {
                                    console.log(`[analyzeCigarImage] [REST API] ✅ 数据库找到匹配项，合并详细信息`);
                                    
                                    // 合并详细信息到分析结果
                                    const finalResult = {
                                        ...restResult,
                                        wrapper: detailedInfo.wrapper,
                                        binder: detailedInfo.binder,
                                        filler: detailedInfo.filler,
                                        strength: detailedInfo.strength,
                                        flavorProfile: detailedInfo.flavorProfile,
                                        footTasteNotes: detailedInfo.footTasteNotes,
                                        bodyTasteNotes: detailedInfo.bodyTasteNotes,
                                        headTasteNotes: detailedInfo.headTasteNotes,
                                        description: detailedInfo.description,
                                        rating: detailedInfo.rating,
                                        ratingSource: detailedInfo.ratingSource,
                                        ratingDate: detailedInfo.ratingDate,
                                        hasDetailedInfo: true,
                                        databaseId: detailedInfo.id
                                    } as CigarAnalysisResult;
                                    
                                    // 异步更新 AI 识别统计
                                    updateRecognitionStats({
                                        brand: restResult.brand,
                                        name: restResult.name,
                                        confidence: restResult.confidence,
                                        imageUrlFound: !!restResult.imageUrl,
                                        hasDetailedInfo: true
                                    }).catch(error => {
                                        console.warn('[analyzeCigarImage] [REST API] ⚠️ 更新识别统计失败（不影响主流程）:', error);
                                    });
                                    
                                    return finalResult;
                                } else {
                                    console.log(`[analyzeCigarImage] [REST API] ℹ️ 数据库未找到匹配项`);
                                }
                            } catch (error) {
                                console.error('[analyzeCigarImage] [REST API] ❌ 查询数据库失败:', error);
                                // 不抛出错误，继续返回基础识别结果
                            }
                        }
                        
                        // 异步更新 AI 识别统计
                        const finalRestResult = {
                            ...restResult,
                            hasDetailedInfo: false
                        } as CigarAnalysisResult;
                        
                        updateRecognitionStats({
                            brand: restResult.brand,
                            name: restResult.name,
                            confidence: restResult.confidence,
                            imageUrlFound: !!restResult.imageUrl,
                            hasDetailedInfo: false
                        }).catch(error => {
                            console.warn('[analyzeCigarImage] [REST API] ⚠️ 更新识别统计失败（不影响主流程）:', error);
                        });
                        
                        return finalRestResult;
                    }
                } catch (restError) {
                    // REST API 也失败，继续尝试下一个模型
                    console.warn(`REST API 调用也失败，尝试下一个模型...`);
                    continue;
                }
                
                continue;
            }
            // 其他错误（如权限、配额等）直接抛出，不继续尝试
            console.error(`Gemini analysis failed with model ${modelName}:`, error);
            throw error;
        }
    }
    
    // 所有模型都失败，提供详细的错误信息
    const errorMsg = lastError?.message || '未知错误';
    const isNetlify = typeof window !== 'undefined' && window.location.hostname.includes('netlify');
    const envConfigHint = isNetlify
        ? '1. API Key 是否正确配置在 Netlify 环境变量中（VITE_GEMINI_API_KEY）\n   2. 如果刚添加了环境变量，请重新部署应用'
        : '1. API Key 是否正确配置在 .env 文件中（VITE_GEMINI_API_KEY）';
    
    throw new Error(
        `所有 Gemini 模型都不可用。最后错误: ${errorMsg}\n` +
        `请检查：\n` +
        `${envConfigHint}\n` +
        `${isNetlify ? '3' : '2'}. Generative Language API 是否已启用\n` +
        `${isNetlify ? '4' : '3'}. API Key 是否有访问所需模型的权限\n` +
        `${isNetlify ? '5' : '4'}. 尝试访问 https://aistudio.google.com/app/apikey 验证 API Key 是否有效`
    );
}

/**
 * 根据品牌和产品名称搜索雪茄茄标图片 URL
 * @param brand 品牌名称
 * @param name 产品名称
 * @returns 图片 URL 或 null
 */
/**
 * 验证图片 URL 是否可访问
 * 使用 Image 对象加载图片，通过 onload/onerror 事件判断 URL 是否有效
 * 注意：由于 CORS 限制，某些网站可能无法验证，验证失败会继续尝试下一个模型
 */
async function validateImageUrl(url: string): Promise<boolean> {
    return new Promise((resolve) => {
        try {
            const img = new Image();
            const timeout = setTimeout(() => {
                resolve(false);
            }, 2000); // 2秒超时（缩短超时时间，更快失败以尝试下一个模型）
            
            img.onload = () => {
                clearTimeout(timeout);
                resolve(true);
            };
            
            img.onerror = () => {
                clearTimeout(timeout);
                resolve(false);
            };
            
            // 先尝试不使用 crossOrigin（某些服务器可能不支持 CORS 但图片可访问）
            // 如果失败，浏览器会触发 onerror，我们继续尝试下一个模型
            img.src = url;
        } catch (error) {
            // 如果创建 Image 对象失败，返回 false
            resolve(false);
        }
    });
}

/**
 * 搜索雪茄图片 URL（支持配置顺序：Google + Gemini）
 * @param brand 品牌名称
 * @param name 雪茄名称
 * @returns 可用的图片 URL 或 null
 */
async function searchCigarImageUrl(brand: string, name: string): Promise<string | null> {
    // 获取搜索引擎顺序配置
    const appConfig = await getAppConfig();
    const searchOrder = appConfig?.aiCigar?.imageSearchOrder || 'google-first';
    
    console.log(`[searchCigarImageUrl] 🚀 开始搜索图片: "${brand} ${name}" (顺序: ${searchOrder})`);
    
    // 根据配置顺序执行搜索
    if (searchOrder === 'gemini-first') {
        // Gemini 优先
        try {
            console.log(`[searchCigarImageUrl] ✨ 优先执行 Gemini 搜索...`);
            const geminiResult = await searchCigarImageUrlWithGemini(brand, name);
            
            if (geminiResult) {
                console.log(`[searchCigarImageUrl] ✅ Gemini 搜索成功（优先）:`, geminiResult);
                return geminiResult;
            } else {
                console.log(`[searchCigarImageUrl] ℹ️ Gemini 搜索未找到可用图片 URL，回退到 Google...`);
            }
        } catch (error) {
            console.warn(`[searchCigarImageUrl] ⚠️ Gemini 搜索失败:`, error);
            console.log(`[searchCigarImageUrl] ℹ️ Gemini 搜索失败，回退到 Google...`);
        }

        // 回退到 Google
        try {
            console.log(`[searchCigarImageUrl] 🔍 执行 Google Image Search（回退）...`);
            const googleResult = await searchCigarImageWithGoogle(brand, name);
            
            if (googleResult) {
                console.log(`[searchCigarImageUrl] ✅ Google Image Search 成功（回退）:`, googleResult);
                return googleResult;
            } else {
                console.log(`[searchCigarImageUrl] ℹ️ Google Image Search 未找到可用图片 URL`);
            }
        } catch (error) {
            console.warn(`[searchCigarImageUrl] ⚠️ Google Image Search 失败:`, error);
        }
    } else {
        // Google 优先（默认）
        try {
            console.log(`[searchCigarImageUrl] 🔍 优先执行 Google Image Search...`);
            const googleResult = await searchCigarImageWithGoogle(brand, name);
            
            if (googleResult) {
                console.log(`[searchCigarImageUrl] ✅ Google Image Search 成功（优先）:`, googleResult);
                return googleResult;
            } else {
                console.log(`[searchCigarImageUrl] ℹ️ Google Image Search 未找到可用图片 URL，回退到 Gemini...`);
            }
        } catch (error) {
            console.warn(`[searchCigarImageUrl] ⚠️ Google Image Search 失败:`, error);
            console.log(`[searchCigarImageUrl] ℹ️ Google Image Search 失败，回退到 Gemini...`);
        }

        // 回退到 Gemini
        try {
            console.log(`[searchCigarImageUrl] ✨ 执行 Gemini 搜索（回退）...`);
            const geminiResult = await searchCigarImageUrlWithGemini(brand, name);
            
            if (geminiResult) {
                console.log(`[searchCigarImageUrl] ✅ Gemini 搜索成功（回退）:`, geminiResult);
                return geminiResult;
            } else {
                console.log(`[searchCigarImageUrl] ℹ️ Gemini 搜索未找到可用图片 URL`);
            }
        } catch (error) {
            console.warn(`[searchCigarImageUrl] ⚠️ Gemini 搜索失败:`, error);
        }
    }

    // 两个搜索都失败
    console.warn(`[searchCigarImageUrl] ❌ 所有搜索方法都失败（${searchOrder === 'gemini-first' ? 'Gemini 和 Google' : 'Google 和 Gemini'} 都未找到可用图片）`);
    return null;
}

/**
 * 使用 Gemini 搜索雪茄图片 URL
 * @param brand 品牌名称
 * @param name 雪茄名称
 * @returns 可用的图片 URL 或 null
 */
async function searchCigarImageUrlWithGemini(brand: string, name: string): Promise<string | null> {
    if (!API_KEY) {
        return null;
    }

    const searchPrompt = `
Find a high-quality, publicly accessible image URL for "${brand} ${name}" cigar.

🎯 SEARCH STRATEGY (Follow this order):

PRIORITY 1: Official Manufacturer Websites (Most Reliable)
- Brand official website: [brand].com
- Parent company websites (e.g., generaldcigar.com, scandinaviantobaccogroup.com)
- Official Cuban cigar website: habanos.com (for Cuban brands)
- These usually have stable, high-quality product images

PRIORITY 2: Major Retailers with Reliable CDNs
✅ HIGHLY RECOMMENDED (Low 404 rate):
- famous-smoke.com (simple URLs, very reliable)
- holts.com (stable CDN)
- cigarsinternational.com (good uptime)
- jrcigars.com (reliable)
- atlanticcigar.com (stable CDN)
- cigarone.com (good uptime)

✅ RECOMMENDED (Generally reliable):
- puroexpress.com
- cigarbus.com
- 70cigars.com
- infifon.com
- hyhpuro.com
- timecigar.com

⚠️ USE WITH CAUTION (Medium 404 rate):
- neptunecigar.com (sometimes restructures URLs)
- cigarplace.biz (cache URLs may expire)
- lacasadelhabano.com (may have complex URLs)
- cgarsltd.co.uk (UK site, may vary)
- lacasadeltabaco.com (may restructure)
- cohcigars.com (Cuban specialist, verify URLs)
- topcubans.com (Cuban specialist, verify URLs)

❌ AVOID (High 404 rate):
- Small retailer websites
- Blog posts or forum uploads
- Social media images

PRIORITY 3: Image CDNs
- cloudinary.com
- imgur.com
- cdn.shopify.com (if from verified stores)

🚫 URL PATTERNS TO AVOID (High 404 Rate):
❌ /cache/ - cached/resized images often expire
❌ /temp/ - temporary uploads
❌ /resize/ - dynamic resizing, unstable
❌ /thumb/ - thumbnails, may be removed
❌ Complex hash paths (e.g., /abc123def456/xyz789/)
❌ URLs with multiple query parameters

✅ URL PATTERNS TO PREFER (Low 404 Rate):
✓ Simple paths: /images/[product-name].jpg
✓ CDN URLs: cdn.site.com/[product].jpg
✓ Static assets: static.site.com/images/[product].jpg
✓ Direct product URLs: /products/[brand]-[name].jpg

📝 EXAMPLES:

GOOD URLs (Simple, Stable):
✅ https://www.famous-smoke.com/images/cohiba-robusto.jpg
✅ https://static.holts.com/products/cohiba-robusto.png
✅ https://cdn.cigarsinternational.com/cohiba-robusto.jpg
✅ https://images.jrcigars.com/cohiba-robusto.jpg
✅ https://www.atlanticcigar.com/images/cohiba-robusto.jpg
✅ https://www.habanos.com/images/products/cohiba-robusto.jpg
✅ https://cdn.cigarone.com/products/cohiba-robusto.png

BAD URLs (Complex, Likely to 404):
❌ https://site.com/cache/abc123/resize/image.jpg
❌ https://site.com/temp/upload/12345/image.jpg
❌ https://unknownsite.com/blog/2020/image.jpg
❌ https://site.com/media/catalog/product/cache/1/image/9df78eab33525d08d6e5fb8d27136e95/c/o/cohiba.jpg

🎯 VALIDATION CHECKLIST:
✓ Direct image URL ending with .jpg, .jpeg, .png, .webp, .gif
✓ From a domain you recognize as stable
✓ Simple path structure (fewer than 5 path segments)
✓ No /cache/, /temp/, /resize/, /thumb/ in URL
✓ Prefer CDN or static subdomain
✓ No complex hash strings in path

🚨 CRITICAL RULES:
1. ✅ Return ONLY URLs you are confident will work
2. ✅ Prefer simple URLs over complex ones
3. ✅ Prefer major retailers over small sites
4. ❌ DO NOT return Google redirect URLs
5. ❌ DO NOT return cached/resized image URLs
6. ❌ If uncertain, return "null" instead of guessing

OUTPUT: Return ONLY the image URL as plain text, or "null" if you cannot find a reliable URL.
    `.trim();

    // 获取可用模型列表（与主识别函数使用相同的策略）
    let modelsToTry: string[] = [];
    
    // 尝试从 AppConfig 获取配置的模型
    let configModels: string[] = [];
    try {
        const appConfig = await getAppConfig();
        if (appConfig?.gemini?.models && appConfig.gemini.models.length > 0) {
            configModels = appConfig.gemini.models;
        }
    } catch (error) {
        // 忽略错误
    }
    
    // 尝试从 API 获取可用模型
    let availableModels: string[] = [];
    try {
        availableModels = await getAvailableModels();
    } catch (error) {
        // 忽略错误
    }
    
    // 使用全局默认模型列表
    const defaultModels = DEFAULT_MODELS;
    
    // 构建模型列表（与主识别函数相同的优先级，但只包含可用的模型）
    // 如果 API 返回了可用模型列表，优先使用它来过滤
    const validModels = availableModels.length > 0 
        ? availableModels 
        : defaultModels; // 如果没有 API 列表，使用默认模型
    
    if (configModels.length > 0) {
        // 如果 AppConfig 中有配置，优先使用配置的模型（但只保留可用的）
        const validConfigModels = configModels.filter(m => validModels.includes(m));
        const invalidConfigModels = configModels.filter(m => !validModels.includes(m));
        
        if (invalidConfigModels.length > 0) {
            console.warn(`[searchCigarImageUrlWithGemini] ⚠️ AppConfig 中配置的以下模型不可用，将被跳过:`, invalidConfigModels);
        }
        
        // 优先使用配置的模型（已验证可用），然后补充其他可用模型
        modelsToTry = [
            ...validConfigModels,
            ...validModels.filter(m => !validConfigModels.includes(m))
        ];
    } else {
        // 如果没有 AppConfig 配置，直接使用可用模型列表
        modelsToTry = [...validModels];
    }
    
    // 确保列表不为空
    if (modelsToTry.length === 0) {
        modelsToTry = [...defaultModels];
        console.warn('[searchCigarImageUrlWithGemini] ⚠️ 模型列表为空，使用默认模型（可能部分不可用）');
    }
    
    console.log(`[searchCigarImageUrlWithGemini] 搜索 "${brand} ${name}" 的图片URL，尝试模型:`, modelsToTry);

    // 尝试使用 SDK
    for (const modelName of modelsToTry) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(searchPrompt);
            const response = await result.response;
            
            // 检查响应是否有效
            if (!response) {
                console.warn(`[searchCigarImageUrlWithGemini] [${modelName}] ❌ 响应为空`);
                continue;
            }
            
            // 调试：检查响应对象的完整结构
            console.log(`[searchCigarImageUrlWithGemini] [${modelName}] 响应对象结构:`, {
                hasText: typeof response.text === 'function',
                responseType: typeof response,
                responseKeys: Object.keys(response || {}),
                candidates: (result as any).response?.candidates,
            });
            
            // 安全地获取文本响应
            let rawResponse: string;
            try {
                const textResult = response.text();
                rawResponse = typeof textResult === 'string' ? textResult.trim() : '';
                
                // 如果 text() 返回 null 或 undefined，尝试从 result 中获取
                if (!rawResponse) {
                    console.warn(`[searchCigarImageUrlWithGemini] [${modelName}] response.text() 返回空值，尝试从 result 获取`);
                    const candidates = (result as any).response?.candidates;
                    if (candidates && candidates.length > 0) {
                        const content = candidates[0]?.content;
                        if (content?.parts && content.parts.length > 0) {
                            rawResponse = content.parts[0]?.text?.trim() || '';
                        }
                    }
                }
            } catch (textError: any) {
                console.warn(`[searchCigarImageUrlWithGemini] [${modelName}] ❌ 无法获取文本响应:`, textError?.message || textError);
                // 尝试从 candidates 中获取
                const candidates = (result as any).response?.candidates;
                if (candidates && candidates.length > 0) {
                    const content = candidates[0]?.content;
                    if (content?.parts && content.parts.length > 0) {
                        rawResponse = content.parts[0]?.text?.trim() || '';
                    } else {
                        rawResponse = '';
                    }
                } else {
                    rawResponse = '';
                }
            }
            
            // 如果 rawResponse 为空或 null，记录并继续下一个模型
            if (!rawResponse || rawResponse === 'null' || rawResponse === '') {
                console.warn(`[searchCigarImageUrlWithGemini] [${modelName}] ❌ 响应为空或null，完整响应对象:`, {
                    response: response,
                    result: result,
                    rawResponse: rawResponse
                });
                continue;
            }
            
            console.log(`[searchCigarImageUrlWithGemini] [${modelName}] Gemini 原始响应:`, rawResponse);

            // 清理响应文本（移除可能的引号、换行、markdown 代码块、null 字符串等）
            let imageUrl = rawResponse
                .replace(/^```[\w]*\n?/g, '') // 移除开头的 markdown 代码块标记
                .replace(/\n?```$/g, '') // 移除结尾的 markdown 代码块标记
                .replace(/^["']|["']$/g, '') // 移除首尾引号
                .replace(/\n/g, '') // 移除换行
                .replace(/null$/i, '') // 移除末尾的 "null" 字符串（不区分大小写）
                .replace(/null\s+/gi, '') // 移除中间的 "null" 字符串
                .trim();

            // 验证返回的是有效的 URL
            if (imageUrl && imageUrl.toLowerCase() !== 'null' && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
                // 排除 Google 跳转链接和 Google Images 链接
                if (imageUrl.includes('google.com/url') || 
                    imageUrl.includes('google.com/imgres') || 
                    imageUrl.includes('googleusercontent.com') ||
                    imageUrl.includes('google.com/search')) {
                    console.warn(`[searchCigarImageUrlWithGemini] [${modelName}] ❌ 跳过 Google 跳转链接:`, imageUrl);
                    continue;
                }
                
                console.log(`[searchCigarImageUrlWithGemini] [${modelName}] 找到有效URL:`, imageUrl);
                
                // 验证 URL 是否以图片扩展名结尾（优先）
                const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];
                const hasImageExtension = imageExtensions.some(ext => 
                    imageUrl.toLowerCase().endsWith(ext) || imageUrl.toLowerCase().includes(ext + '?')
                );
                
                // 检查是否是图片相关的URL（包含图片关键词或常见图片服务）
                const isImageRelated = imageUrl.includes('image') ||
                    imageUrl.includes('photo') ||
                    imageUrl.includes('picture') ||
                    imageUrl.includes('img') ||
                    imageUrl.includes('cloudinary') ||
                    imageUrl.includes('imgur') ||
                    imageUrl.includes('cdn') ||
                    imageUrl.includes('static') ||
                    imageUrl.includes('product') ||
                    imageUrl.includes('media');
                
                if (hasImageExtension || isImageRelated) {
                    console.log(`[searchCigarImageUrlWithGemini] [${modelName}] ✅ URL格式验证通过，开始验证可访问性:`, imageUrl);
                    
                    // 同步验证 URL 可访问性（阻塞返回，确保只返回可用的 URL）
                    const isValid = await validateImageUrl(imageUrl);
                    
                        if (isValid) {
                        console.log(`[searchCigarImageUrlWithGemini] [${modelName}] ✅ URL可访问性验证通过，返回:`, imageUrl);
                        return imageUrl;
                        } else {
                        console.warn(`[searchCigarImageUrlWithGemini] [${modelName}] ⚠️ URL可访问性验证失败（可能404），尝试下一个模型:`, imageUrl);
                        // 验证失败，继续尝试下一个模型
                        continue;
                        }
                } else {
                    // 即使没有明显的图片标识，也验证可访问性
                    console.log(`[searchCigarImageUrlWithGemini] [${modelName}] ⚠️ URL没有明显的图片标识，验证可访问性:`, imageUrl);
                    
                    const isValid = await validateImageUrl(imageUrl);
                    
                    if (isValid) {
                        console.log(`[searchCigarImageUrlWithGemini] [${modelName}] ✅ URL可访问性验证通过，返回:`, imageUrl);
                    return imageUrl;
                } else {
                        console.warn(`[searchCigarImageUrlWithGemini] [${modelName}] ⚠️ URL可访问性验证失败，尝试下一个模型:`, imageUrl);
                        // 验证失败，继续尝试下一个模型
                        continue;
                    }
                }
            } else {
                console.warn(`[searchCigarImageUrlWithGemini] [${modelName}] ❌ 无效的URL响应:`, imageUrl);
            }
            
            // 如果这个模型返回了无效响应，尝试下一个模型
            continue;
        } catch (error: any) {
            const errorMessage = error?.message || error?.toString() || '';
            const errorString = errorMessage.toLowerCase();
            
            // 如果是模型不支持的错误（404），尝试下一个模型或使用 REST API
            if (errorString.includes('not found') || 
                errorString.includes('404') || 
                errorString.includes('is not found for api version') ||
                errorString.includes('not supported')) {
                console.warn(`[searchCigarImageUrlWithGemini] 模型 ${modelName} 在 SDK 中不可用，尝试使用 REST API...`);
                
                // 尝试使用 REST API
                try {
                    const restResponse = await fetch(
                        `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${API_KEY}`,
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                contents: [{
                                    parts: [{ text: searchPrompt }]
                                }]
                            })
                        }
                    );
                    
                    if (!restResponse.ok) {
                        const errorText = await restResponse.text();
                        console.warn(`[searchCigarImageUrlWithGemini] [REST API ${modelName}] HTTP错误 ${restResponse.status}:`, errorText);
                        continue;
                    }
                    
                    const data = await restResponse.json();
                    
                    // 检查响应结构
                    if (!data.candidates || data.candidates.length === 0) {
                        console.warn(`[searchCigarImageUrlWithGemini] [REST API ${modelName}] ❌ 响应中没有candidates:`, data);
                        continue;
                    }
                    
                    const candidate = data.candidates[0];
                    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
                        console.warn(`[searchCigarImageUrlWithGemini] [REST API ${modelName}] ❌ 响应中没有content.parts:`, candidate);
                        continue;
                    }
                    
                    const text = candidate.content.parts[0]?.text || '';
                    const rawResponse = text.trim();
                    
                    if (!rawResponse || rawResponse === 'null' || rawResponse === '') {
                        console.warn(`[searchCigarImageUrlWithGemini] [REST API ${modelName}] ❌ 响应文本为空:`, rawResponse);
                        continue;
                    }
                    
                    console.log(`[searchCigarImageUrlWithGemini] [REST API ${modelName}] Gemini 原始响应:`, rawResponse);
                    
                    // 清理响应文本（移除可能的引号、换行、markdown 代码块、null 字符串等）
                    let imageUrl = rawResponse
                        .replace(/^```[\w]*\n?/g, '') // 移除开头的 markdown 代码块标记
                        .replace(/\n?```$/g, '') // 移除结尾的 markdown 代码块标记
                        .replace(/^["']|["']$/g, '') // 移除首尾引号
                        .replace(/\n/g, '') // 移除换行
                        .replace(/null$/i, '') // 移除末尾的 "null" 字符串（不区分大小写）
                        .replace(/null\s+/gi, '') // 移除中间的 "null" 字符串
                        .trim();
                    
                    if (imageUrl && imageUrl.toLowerCase() !== 'null' && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
                        // 排除 Google 跳转链接和 Google Images 链接
                        if (imageUrl.includes('google.com/url') || 
                            imageUrl.includes('google.com/imgres') || 
                            imageUrl.includes('googleusercontent.com') ||
                            imageUrl.includes('google.com/search')) {
                            console.warn(`[searchCigarImageUrlWithGemini] [REST API ${modelName}] ❌ 跳过 Google 跳转链接:`, imageUrl);
                            continue;
                        }
                        
                        // 验证 URL 是否以图片扩展名结尾或包含图片相关关键词
                        const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];
                        const hasImageExtension = imageExtensions.some(ext => 
                            imageUrl.toLowerCase().endsWith(ext) || imageUrl.toLowerCase().includes(ext + '?')
                        );
                        
                        const isImageRelated = imageUrl.includes('image') ||
                            imageUrl.includes('photo') ||
                            imageUrl.includes('picture') ||
                            imageUrl.includes('img') ||
                            imageUrl.includes('cloudinary') ||
                            imageUrl.includes('imgur') ||
                            imageUrl.includes('cdn') ||
                            imageUrl.includes('static') ||
                            imageUrl.includes('product') ||
                            imageUrl.includes('media');
                        
                        if (hasImageExtension || isImageRelated) {
                            console.log(`[searchCigarImageUrlWithGemini] [REST API ${modelName}] ✅ 找到有效URL，开始验证可访问性:`, imageUrl);
                        
                            // 同步验证 URL 可访问性（阻塞返回，确保只返回可用的 URL）
                            const isValid = await validateImageUrl(imageUrl);
                            
                            if (isValid) {
                                console.log(`[searchCigarImageUrlWithGemini] [REST API ${modelName}] ✅ URL可访问性验证通过，返回:`, imageUrl);
                                return imageUrl;
                            } else {
                                console.warn(`[searchCigarImageUrlWithGemini] [REST API ${modelName}] ⚠️ URL可访问性验证失败（可能404），尝试下一个模型:`, imageUrl);
                                // 验证失败，继续尝试下一个模型
                                continue;
                            }
                    } else {
                            console.warn(`[searchCigarImageUrlWithGemini] [REST API ${modelName}] ❌ URL没有明显的图片标识，跳过:`, imageUrl);
                            continue;
                        }
                    } else {
                        console.warn(`[searchCigarImageUrlWithGemini] [REST API ${modelName}] ❌ 无效的URL响应:`, imageUrl);
                    }
                } catch (restError: any) {
                    console.warn(`[searchCigarImageUrlWithGemini] [REST API ${modelName}] 调用失败:`, restError?.message || restError);
                    continue;
                }
                
                continue;
            }
            
            // 其他错误（如权限、配额等）记录但继续尝试下一个模型
            console.warn(`[searchCigarImageUrlWithGemini] 模型 ${modelName} 调用失败:`, error);
            continue;
        }
    }
    
    // 所有模型都失败（可能是 API 调用失败，或所有返回的 URL 都验证失败）
    console.warn(`[searchCigarImageUrlWithGemini] ❌ 所有模型都失败，无法获取可用的图片URL。已尝试 ${modelsToTry.length} 个模型。`);
    return null;
}

/**
 * 根据产品名称识别雪茄信息（不需要图像）
 * @param cigarName 雪茄名称
 * @param brand 品牌名称（可选，如果提供可以提高识别准确度）
 */
export async function analyzeCigarByName(
    cigarName: string,
    brand?: string
): Promise<CigarAnalysisResult> {
    if (!API_KEY) {
        const envHint = typeof window !== 'undefined' && window.location.hostname.includes('netlify')
            ? '请在 Netlify 控制台的 Environment variables 中设置 VITE_GEMINI_API_KEY，然后重新部署。'
            : '请在 .env 文件中设置 VITE_GEMINI_API_KEY 或在 Netlify 环境变量中配置。';
        
        throw new Error(
            `Gemini API Key 未配置。${envHint}\n` +
            `获取 API Key: https://aistudio.google.com/app/apikey`
        );
    }

    if (!cigarName || !cigarName.trim()) {
        throw new Error('产品名称不能为空');
    }

    // 构建场景化的提示词
    // 场景: 纯文本搜索（用户输入品牌和名称）
    const brandInfo = brand && brand.trim() ? brand.trim() : '';
    const fullName = brandInfo ? `${brandInfo} ${cigarName}` : cigarName;
    
    const prompt = `
🎯 SCENARIO: Text-Based Cigar Search
The user has provided the cigar name: "${fullName}"
${brandInfo ? `Brand: "${brandInfo}"` : ''}
Model/Name: "${cigarName}"

INSTRUCTIONS:
1. Search your training data for information about "${fullName}"
2. This is a TEXT-BASED search, so you should rely on your knowledge base
3. Confidence levels:
   - Well-known cigar with verified specs in training data → High confidence (0.85-0.95)
   - Common cigar but limited specs → Medium confidence (0.7-0.8)
   - Rare/unknown cigar → Low confidence (0.5-0.65)
4. Be honest about what you know vs. what you're inferring

⚠️ CRITICAL: You can ONLY use information from your training data. You CANNOT access external websites in real-time.

📋 STEP-BY-STEP ANALYSIS:

STEP 1: BASIC IDENTIFICATION
- brand: Extract brand name only (e.g., "Cohiba", "Montecristo")
- name: Full name with model/size (e.g., "Cohiba Robusto")
- origin: Country of origin
- size: Standard vitola name ONLY (Robusto, Torpedo, Churchill, Corona, Cigarillo, etc.)
- brandDescription: 2-3 sentences about brand history (if known from training data)
- brandFoundedYear: Founding year (if known from training data, otherwise null)

STEP 2: TOBACCO COMPOSITION (wrapper, binder, filler)
📊 THREE-TIER DATA STRATEGY:

TIER 1 - VERIFIED DATA (Highest Priority):
- If you have CONFIRMED information from manufacturer specs, professional reviews, or official sources:
  * wrapper: [specific type, e.g., "Connecticut Shade", "Maduro"]
  * binder: [specific origin, e.g., "Nicaraguan", "Mexican"]
  * filler: [specific blend, e.g., "Dominican, Nicaraguan"]
  * dataQuality.tobaccoComposition: "verified"

TIER 2 - INFERRED DATA (Medium Priority):
- If you DON'T have verified specs BUT can make EDUCATED INFERENCES based on:
  * Brand's typical tobacco sources (e.g., Cuban brands use Cuban tobacco)
  * Wrapper color/appearance (e.g., dark wrapper = Maduro)
  * Brand origin patterns (e.g., Nicaraguan brands often use Nicaraguan tobacco)
- Provide your BEST ESTIMATE with lower confidence:
  * wrapper: [inferred type with qualifier, e.g., "Likely Maduro", "Possibly Connecticut"]
  * binder: [inferred origin, e.g., "Likely Nicaraguan"]
  * filler: [inferred blend, e.g., "Likely Dominican blend"]
  * dataQuality.tobaccoComposition: "inferred"

TIER 3 - NO DATA:
- If you have NO basis for inference:
  * wrapper: null
  * binder: null
  * filler: null
  * dataQuality.tobaccoComposition: "unknown"

✅ EXAMPLES:
- Cohiba (Cuban) → wrapper: "Cuban", binder: "Cuban", filler: "Cuban" (Tier 1: verified)
- Unknown Nicaraguan brand → wrapper: "Likely Nicaraguan", filler: "Likely Nicaraguan blend" (Tier 2: inferred)
- Completely unknown brand → wrapper: null (Tier 3: no data)

STEP 3: STRENGTH AND FLAVOR
📊 THREE-TIER DATA STRATEGY:

TIER 1 - VERIFIED DATA:
- If you have professional reviews or verified specs:
  * strength: "Mild" | "Medium-Mild" | "Medium" | "Medium-Full" | "Full"
  * flavorProfile: ["specific", "verified", "flavors"]
  * dataQuality.flavorProfile: "verified"

TIER 2 - INFERRED DATA:
- If NO verified reviews BUT can infer from:
  * Brand reputation (e.g., Padron = typically full-bodied)
  * Tobacco origin (e.g., Nicaraguan = often stronger)
  * Wrapper type (e.g., Maduro = often sweeter, fuller)
- Provide EDUCATED GUESS:
  * strength: [your best estimate based on brand/origin]
  * flavorProfile: ["typical", "expected", "notes", "for", "this", "type"]
  * dataQuality.flavorProfile: "inferred"

TIER 3 - NO DATA:
  * strength: "Unknown"
  * flavorProfile: []
  * dataQuality.flavorProfile: "unknown"

✅ EXAMPLES:
- Padron 1964 → strength: "Full", flavorProfile: ["Coffee", "Cocoa", "Earth"] (Tier 1: verified from reviews)
- Unknown Nicaraguan cigar → strength: "Medium-Full", flavorProfile: ["Earth", "Pepper", "Wood"] (Tier 2: typical Nicaraguan profile)
- Completely unknown → strength: "Unknown", flavorProfile: [] (Tier 3)

STEP 4: TASTING NOTES (foot, body, head)
📊 THREE-TIER DATA STRATEGY:

TIER 1 - VERIFIED DATA:
- If you have SPECIFIC professional tasting notes from reviews:
  * footTasteNotes: ["actual", "notes", "from", "reviews"]
  * bodyTasteNotes: ["actual", "notes", "from", "reviews"]
  * headTasteNotes: ["actual", "notes", "from", "reviews"]
  * dataQuality.tastingNotes: "verified"

TIER 2 - INFERRED DATA:
- If NO specific reviews BUT can infer TYPICAL PROGRESSION based on:
  * Tobacco composition (e.g., Maduro wrapper = sweet notes)
  * Brand style (e.g., Cuban = earthy, leathery)
  * Strength level (e.g., Full = intense flavors)
- Provide TYPICAL PROGRESSION for this type:
  * footTasteNotes: ["typical", "opening", "notes"]
  * bodyTasteNotes: ["typical", "middle", "notes"]
  * headTasteNotes: ["typical", "final", "notes"]
  * dataQuality.tastingNotes: "inferred"

TIER 3 - NO DATA:
  * footTasteNotes: null
  * bodyTasteNotes: null
  * headTasteNotes: null
  * dataQuality.tastingNotes: "unknown"

✅ CIGAR TASTING PROGRESSION PATTERNS:
- Foot (first 1/3): Usually lighter, spicier, initial flavors
- Body (middle 1/3): Develops complexity, core flavors emerge
- Head (final 1/3): Intensifies, richer, bolder flavors

✅ EXAMPLES:
- Cohiba Behike (verified review) → footTasteNotes: ["Pepper", "Cedar"], bodyTasteNotes: ["Leather", "Coffee"], headTasteNotes: ["Earth", "Cocoa"] (Tier 1)
- Unknown Maduro cigar → footTasteNotes: ["Sweet spice", "Cocoa"], bodyTasteNotes: ["Coffee", "Dark chocolate"], headTasteNotes: ["Earth", "Leather"] (Tier 2: typical Maduro progression)
- Completely unknown → all null (Tier 3)

STEP 5: RATING
⚠️ ACCURACY RULE: ONLY provide ACTUAL ratings from professional sources
- Search your training data for ratings from:
  * Cigar Aficionado (most authoritative)
  * Cigar Journal
  * Halfwheel
  * Other professional publications
- If found:
  * rating: [actual score 0-100]
  * ratingSource: "[source name and year]" (e.g., "Cigar Aficionado 2022")
- If NOT found:
  * rating: null
  * ratingSource: null
- ❌ DO NOT estimate or create ratings

STEP 6: DESCRIPTION
- Provide factual 2-3 sentence description
- Include: brand history, line characteristics, target audience
- Base on verified information from your training data
- Keep it general but accurate

🎯 OUTPUT FORMAT (JSON):
{
  "brand": "...",
  "name": "...",
  "origin": "...",
  "size": "...",
  "brandDescription": "...",
  "brandFoundedYear": number or null,
  "wrapper": "..." or null,
  "binder": "..." or null,
  "filler": "..." or null,
  "strength": "..." or "Unknown",
  "flavorProfile": [...] or [],
  "footTasteNotes": [...] or null,
  "bodyTasteNotes": [...] or null,
  "headTasteNotes": [...] or null,
  "description": "...",
  "rating": number or null,
  "ratingSource": "..." or null,
  "confidence": 0.0-1.0
}

🚨 CRITICAL RULES - READ CAREFULLY:
1. ✅ USE THREE-TIER STRATEGY: Verified > Inferred > Null
2. ✅ ALWAYS mark data quality in dataQuality field
3. ✅ Verified data (Tier 1) → confidence 0.85-0.95
4. ✅ Inferred data (Tier 2) → confidence 0.65-0.8, use qualifiers like "Likely", "Typical"
5. ✅ No data (Tier 3) → return null, confidence 0.5-0.65
6. ✅ Be HONEST about data source: verified vs inferred
7. ✅ Inferred data is ACCEPTABLE if marked as "inferred"
8. ✅ Provide SOMETHING rather than nothing, but mark quality
9. ❌ NEVER present inferred data as verified
10. ❌ NEVER estimate ratings (ratings must be verified or null)

    Output ONLY valid JSON. Do not include markdown formatting like \`\`\`json.
  `;

    // 获取模型列表（复用相同的逻辑）
    let configModels: string[] = [];
    try {
        const appConfig = await getAppConfig();
        if (appConfig?.gemini?.models && appConfig.gemini.models.length > 0) {
            configModels = appConfig.gemini.models;
        }
    } catch (error) {
        console.warn('获取 AppConfig 失败，跳过配置的模型列表:', error);
    }
    
    let availableModels: string[] = [];
    try {
        availableModels = await getAvailableModels();
    } catch (error) {
        console.warn('获取 API 模型列表失败，跳过动态模型列表');
    }
    
    // 使用全局默认模型列表
    const defaultModels = DEFAULT_MODELS;
    
    let modelsToTry: string[] = [];
    if (configModels.length > 0) {
        modelsToTry = [
            ...configModels,
            ...availableModels.filter(m => !configModels.includes(m)),
            ...defaultModels.filter(m => !configModels.includes(m) && !availableModels.includes(m))
        ];
    } else if (availableModels.length > 0) {
        modelsToTry = [
            ...availableModels,
            ...defaultModels.filter(m => !availableModels.includes(m))
        ];
    } else {
        modelsToTry = [...defaultModels];
    }
    
    if (modelsToTry.length === 0) {
        modelsToTry = [...defaultModels];
    }
    
    let lastError: any = null;
    
    // 尝试使用 SDK（文本生成，不需要图像）
    for (const modelName of modelsToTry) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Clean up markdown code blocks if present
            const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();

            return JSON.parse(jsonStr) as CigarAnalysisResult;
        } catch (error: any) {
            lastError = error;
            const errorMessage = error?.message || error?.toString() || '';
            const errorString = errorMessage.toLowerCase();
            
            // 如果是模型不支持的错误，尝试下一个模型
            if (errorString.includes('not found') || 
                errorString.includes('404') || 
                errorString.includes('is not found for api version') ||
                errorString.includes('not supported')) {
                console.warn(`模型 ${modelName} 不可用，尝试下一个模型...`);
                continue;
            }
            // 其他错误直接抛出
            console.error(`Gemini analysis failed with model ${modelName}:`, error);
            throw error;
        }
    }
    
    // 所有模型都失败
    const errorMsg = lastError?.message || '未知错误';
    throw new Error(
        `所有 Gemini 模型都不可用。最后错误: ${errorMsg}\n` +
        `请检查 API Key 配置和模型权限。`
    );
}
