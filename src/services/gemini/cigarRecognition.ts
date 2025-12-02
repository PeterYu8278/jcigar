import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAppConfig } from "../firebase/appConfig";

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

// 辅助函数：通过 REST API 获取可用模型列表
async function getAvailableModels(): Promise<string[]> {
    if (!API_KEY) return [];
    
    // 尝试 v1 API，如果失败则尝试 v1beta
    const apiVersions = ['v1', 'v1beta'];
    
    for (const version of apiVersions) {
        try {
            // 直接调用 REST API 获取模型列表
            const response = await fetch(
                `https://generativelanguage.googleapis.com/${version}/models?key=${API_KEY}`
            );
            
            if (!response.ok) {
                continue; // 尝试下一个版本
            }
            
            const data = await response.json();
            const models = data.models || [];
            
            // 提取模型名称，移除 "models/" 前缀
            const modelNames = models
                .map((model: any) => {
                    const name = model.name || '';
                    // 移除 "models/" 前缀
                    return name.replace(/^models\//, '');
                })
                .filter((name: string) => name && name.includes('gemini'));
            
            if (modelNames.length > 0) {
                console.log(`✅ 使用 ${version} API 找到 ${modelNames.length} 个模型`);
                return modelNames;
            }
        } catch (error) {
            // 继续尝试下一个版本
            continue;
        }
    }
    
    console.warn('无法获取模型列表，使用默认模型列表');
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
    strength: 'Mild' | 'Medium' | 'Full' | 'Unknown';
    wrapper?: string;      // 茄衣（最外层烟叶）
    binder?: string;       // 茄套（中间层烟叶）
    filler?: string;       // 茄芯（填充烟叶）
    footTasteNotes?: string[];  // 脚部（前1/3）品吸笔记
    bodyTasteNotes?: string[];  // 主体（中1/3）品吸笔记
    headTasteNotes?: string[];  // 头部（后1/3）品吸笔记
    description: string;
    rating?: number;       // 评分（0-100，来自权威网站的评分）
    confidence: number; // 0-1
    possibleSizes?: string[];  // 该品牌可能的其他尺寸（如 ["Robusto", "Torpedo", "Churchill"]）
    imageUrl?: string;     // 雪茄茄标图片 URL（如果可用）
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

    // 构建提示词，如果用户提供了提示，则加入
    const userHintSection = userHint 
        ? `\n\nIMPORTANT USER HINT: The user has provided the following information about this cigar: "${userHint}". Please use this information to improve your identification accuracy. If the user's hint matches what you see in the image, prioritize the user's information. If there's a conflict, note it in the confidence score.`
        : '';

    const prompt = `
    Analyze this image of a cigar. Identify the brand, specific name (model/ vitola if possible), origin, flavor profile, strength, construction details, and expected tasting notes for different sections.${userHintSection}
    
    IMPORTANT: You should reference information from authoritative cigar websites and databases to ensure accuracy. 
    Consider searching and referencing information from these reputable sources:
    - https://cigar-coop.com/
    - https://cigardojo.com/ and https://cigardojo.com/cigar-review-archives/
    - https://cigarsratings.com/
    - https://halfwheel.com/ and https://halfwheel.com/cigar-reviews/
    - https://www.cigaraficionado.com/ and https://www.cigaraficionado.com/ratingsandreviews
    - https://www.cigarinspector.com/
    - https://www.cigarjournal.com/ and https://www.cigarjournal.com/ratings-and-awards/ratings/
    - https://www.famous-smoke.com/ and https://www.famous-smoke.com/cigaradvisor
    - https://www.habanos.com/en/ (for Cuban cigars)
    - https://www.leafenthusiast.com/
    - https://www.neptunecigar.com/ and https://www.neptunecigar.com/cigars
    
    Use information from these sources to provide accurate details about the cigar's specifications, ratings, reviews, and characteristics.
    
    Return the result strictly as a JSON object with the following keys:
    - brand: string (brand name only, e.g., "Cohiba", "Montecristo")
    - brandDescription: string (a brief description of the brand's history and characteristics, in English, 2-3 sentences. If you cannot determine, use empty string "")
    - brandFoundedYear: number (the year the brand was founded. If you cannot determine, use null or omit this field)
    - name: string (the full cigar name including model or size/vitola, e.g., "Cohiba Robusto", "Montecristo No.2")
    - origin: string (country)
    - size: string (vitola - MUST be a standard cigar size name. Common standard sizes include: Robusto, Torpedo, Churchill, Corona, Cigarillo, Petit Corona, Toro, Gordo, Lancero, Panatela, Belicoso, Pyramid, Perfecto, Culebra, etc. Extract ONLY the standard size name, not descriptive text. For example, if the name is "Placensia Reserva Original Robusto", the size should be "Robusto", not "Reserva Original Robusto".)
    - flavorProfile: array of strings (e.g., ["Earth", "Leather"])
    - strength: "Mild" | "Medium" | "Full" | "Unknown"
    - wrapper: string (the outer leaf/wrapper tobacco, e.g., "Connecticut", "Maduro", "Habano", "Corojo", or country of origin)
    - binder: string (the binder leaf tobacco, e.g., "Nicaraguan", "Ecuadorian", or country of origin)
    - filler: string (the filler tobacco blend, e.g., "Nicaraguan", "Dominican", "Cuban", or country/blend description)
    - footTasteNotes: array of strings (expected tasting notes for the foot/first third, e.g., ["Pepper", "Wood", "Light Spice"])
    - bodyTasteNotes: array of strings (expected tasting notes for the body/middle third, e.g., ["Coffee", "Chocolate", "Cedar"])
    - headTasteNotes: array of strings (expected tasting notes for the head/final third, e.g., ["Leather", "Earth", "Spice"])
    - description: string (a short 2-sentence description of this specific cigar in English)
    - rating: number (cigar rating from 0 to 100, based on ratings from authoritative sources like Cigar Aficionado, Cigar Journal, Halfwheel, etc. If multiple ratings are available, use the average or most recent rating. If no rating is found, use null or omit this field)
    - confidence: number (0.0 to 1.0, how sure are you?)
    - imageUrl: string (optional, a publicly accessible URL to an image of this cigar's band/label. If you can find or reference a URL from authoritative cigar websites or databases, include it. If not available, use null or omit this field. The URL should be a direct link to an image file, not a webpage.)

    Note: 
    - The "name" field should include the full name with model or size/vitola (e.g., "Cohiba Robusto", not just "Cohiba")
    - The "brand" field should be only the brand name without size (e.g., "Cohiba")
    - The "size" field MUST contain ONLY the standard cigar vitola name (e.g., "Robusto", "Torpedo", "Cigarillo", "Churchill"). Do NOT include descriptive text, series names, or model names in the size field.
    - brandDescription should provide information about the brand's history, reputation, and characteristics
    - brandFoundedYear should be the year the brand was established (e.g., 1966 for Cohiba, 1935 for Montecristo)
    - wrapper, binder, and filler can be identified by the color, texture, and appearance of the cigar.
    - footTasteNotes, bodyTasteNotes, and headTasteNotes should be predicted based on the cigar's construction, wrapper color, and typical flavor progression for similar cigars.
    - Foot (first third) typically starts lighter and spicier, Body (middle third) develops complexity, Head (final third) becomes richer and more intense.
    - If you cannot determine these details, you can use empty arrays [], empty strings "", or null values.
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
    
    // 默认模型列表（作为最后的回退）
    const defaultModels = [
        "gemini-1.5-flash",     // 快速模型，通常最稳定
        "gemini-1.5-pro",       // 较新的模型
        "gemini-pro",           // 经典模型
    ];
    
    // 构建最终模型列表：按优先级合并
    let modelsToTry: string[] = [];
    
    if (configModels.length > 0) {
        // 如果 AppConfig 中有配置，优先使用配置的模型
        // 同时补充 API 获取的模型和默认模型（去重）
        modelsToTry = [
            ...configModels,
            ...availableModels.filter(m => !configModels.includes(m)),
            ...defaultModels.filter(m => !configModels.includes(m) && !availableModels.includes(m))
        ];
        console.log('📋 使用 AppConfig 配置的模型列表（优先级最高）');
    } else if (availableModels.length > 0) {
        // 如果没有 AppConfig 配置，使用 API 获取的模型，补充默认模型
        modelsToTry = [
            ...availableModels,
            ...defaultModels.filter(m => !availableModels.includes(m))
        ];
        console.log('📋 使用 API 获取的模型列表');
    } else {
        // 如果都没有，使用默认模型
        modelsToTry = [...defaultModels];
        console.log('📋 使用默认模型列表');
    }
    
    // 确保列表不为空
    if (modelsToTry.length === 0) {
        modelsToTry = [...defaultModels];
        console.warn('⚠️ 模型列表为空，使用默认模型');
    }
    
    console.log('🧪 最终尝试模型列表（按优先级）:', modelsToTry);
    
    let lastError: any = null;
    
    // 首先尝试使用 SDK
    for (const modelName of modelsToTry) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent([prompt, imagePart]);
            const response = await result.response;
            const text = response.text();

            // Clean up markdown code blocks if present (just in case)
            const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();

            return JSON.parse(jsonStr) as CigarAnalysisResult;
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
                        return restResult;
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

    // 构建包含品牌信息的提示
    const brandInfo = brand && brand.trim() 
        ? ` The brand is "${brand.trim()}". Use this brand information to improve identification accuracy.`
        : '';
    
    const prompt = `
    Based on the cigar name "${brandInfo} ${cigarName}", provide detailed information about this cigar.
    
    IMPORTANT: You should reference information from authoritative cigar websites and databases to ensure accuracy. 
    Consider searching and referencing information from these reputable sources:
    - https://cigar-coop.com/
    - https://cigardojo.com/ and https://cigardojo.com/cigar-review-archives/
    - https://cigarsratings.com/
    - https://halfwheel.com/ and https://halfwheel.com/cigar-reviews/
    - https://www.cigaraficionado.com/ and https://www.cigaraficionado.com/ratingsandreviews
    - https://www.cigarinspector.com/
    - https://www.cigarjournal.com/ and https://www.cigarjournal.com/ratings-and-awards/ratings/
    - https://www.famous-smoke.com/ and https://www.famous-smoke.com/cigaradvisor
    - https://www.habanos.com/en/ (for Cuban cigars)
    - https://www.leafenthusiast.com/
    - https://www.neptunecigar.com/ and https://www.neptunecigar.com/cigars
    
    Use information from these sources to provide accurate details about the cigar's specifications, ratings, reviews, and characteristics.
    
    Return the result strictly as a JSON object with the following keys:
    - brand: string (brand name only, e.g., "Cohiba", "Montecristo", "Placensia")
    - brandDescription: string (a brief description of the brand's history and characteristics, in English, 2-3 sentences. If you cannot determine, use empty string "")
    - brandFoundedYear: number (the year the brand was founded. If you cannot determine, use null or omit this field)
    - name: string (the full cigar name including model or size/vitola, e.g., "Cohiba Robusto", "Montecristo No.2")
    - origin: string (country)
    - size: string (vitola - MUST be a standard cigar size name. Common standard sizes include: Robusto, Torpedo, Churchill, Corona, Cigarillo, Petit Corona, Toro, Gordo, Lancero, Panatela, Belicoso, Pyramid, Perfecto, Culebra, etc. If the name contains "Club" or "Club 10", the size is likely "Cigarillo". Extract ONLY the standard size name, not descriptive text like "Reserva Original". For example, if the name is "Placensia Reserva Original Robusto", the size should be "Robusto", not "Reserva Original Robusto".)
    - flavorProfile: array of strings (e.g., ["Earth", "Leather"])
    - strength: "Mild" | "Medium" | "Full" | "Unknown"
    - wrapper: string (the outer leaf/wrapper tobacco, e.g., "Connecticut", "Maduro", "Habano", "Corojo", or country of origin)
    - binder: string (the binder leaf tobacco, e.g., "Nicaraguan", "Ecuadorian", or country of origin)
    - filler: string (the filler tobacco blend, e.g., "Nicaraguan", "Dominican", "Cuban", or country/blend description)
    - footTasteNotes: array of strings (expected tasting notes for the foot/first third, e.g., ["Pepper", "Wood", "Light Spice"])
    - bodyTasteNotes: array of strings (expected tasting notes for the body/middle third, e.g., ["Coffee", "Chocolate", "Cedar"])
    - headTasteNotes: array of strings (expected tasting notes for the head/final third, e.g., ["Leather", "Earth", "Spice"])
    - description: string (a short 2-sentence description of this specific cigar in English)
    - rating: number (cigar rating from 0 to 100, based on ratings from authoritative sources like Cigar Aficionado, Cigar Journal, Halfwheel, etc. If multiple ratings are available, use the average or most recent rating. If no rating is found, use null or omit this field)
    - confidence: number (0.0 to 1.0, how sure are you? Use 0.8-0.9 for well-known cigars, 0.6-0.7 for less common ones)

    CRITICAL INSTRUCTIONS FOR SIZE/VITOLA EXTRACTION:
    - The "size" field MUST contain ONLY the standard cigar vitola name (e.g., "Robusto", "Torpedo", "Cigarillo", "Churchill")
    - Do NOT include descriptive text, series names, or model names in the size field
    - Examples:
      * "Cohiba Club 10" → size should be "Cigarillo" (not "Club 10")
      * "Placensia Reserva Original Robusto" → size should be "Robusto" (not "Reserva Original Robusto")
      * "Montecristo No.2" → size should be "Torpedo" or "Pyramid" (not "No.2")
      * "Cohiba Siglo VI" → size should be "Toro" or the appropriate standard size
    - If you cannot identify a standard size, use the most specific standard size name that matches the dimensions, or leave empty string ""
    - Common standard sizes: Robusto, Torpedo, Churchill, Corona, Cigarillo, Petit Corona, Toro, Gordo, Lancero, Panatela, Belicoso, Pyramid, Perfecto, Culebra, Double Corona, Petit Robusto, Short Robusto, etc.

    Note: 
    - If a brand is provided, use that brand name in the "brand" field. If no brand is provided, extract the brand from the cigar name.
    - The "name" field should include the full name with size/vitola (e.g., "Cohiba Robusto", not just "Cohiba")
    - The "brand" field should be only the brand name without size (e.g., "Cohiba", "Placensia")
    - When a brand is provided, use it to improve size/vitola identification accuracy. For example, if brand is "Cohiba" and name contains "Club 10", the size should be "Cigarillo".
    - brandDescription should provide information about the brand's history, reputation, and characteristics
    - brandFoundedYear should be the year the brand was established (e.g., 1966 for Cohiba, 1935 for Montecristo)
    - wrapper, binder, and filler should be based on typical construction for this specific cigar model
    - footTasteNotes, bodyTasteNotes, and headTasteNotes should be predicted based on the cigar's typical flavor progression
    - Foot (first third) typically starts lighter and spicier, Body (middle third) develops complexity, Head (final third) becomes richer and more intense
    - If you cannot determine these details, you can use empty arrays [], empty strings "", or null values
    - If you cannot identify it as a cigar, return confidence 0 and empty strings
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
    
    const defaultModels = [
        "gemini-1.5-flash",
        "gemini-1.5-pro",
        "gemini-pro",
    ];
    
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
