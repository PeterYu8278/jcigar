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

/**
 * 完整的 Gemini 模型列表（按推荐优先级排序）
 * 包含所有可用的 Gemini 和 Gemma 模型
 */
const ALL_GEMINI_MODELS = [
    // Gemini 2.x 系列（最新）
    "gemini-2.5-pro",
    "gemini-2.0-flash",
    "gemini-2.5-flash",
    "gemini-2.0-flash-lite",
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash-tts",
    "gemini-3-pro",
    
    // Gemini 2.x 实验性模型
    "gemini-2.0-flash-exp",
    "gemini-2.0-flash-live",
    "gemini-2.5-flash-live",
    "gemini-2.5-flash-native-audio-dialog",
    
    // Gemini 1.5 系列（稳定）
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-pro",
    
    // Gemma 系列
    "gemma-3-27b",
    "gemma-3-12b",
    "gemma-3-4b",
    "gemma-3-2b",
    "gemma-3-1b",
    
    // 其他模型
    "gemini-robotics-er-1.5-preview",
    "learnlm-2.0-flash-experimental",
];

/**
 * 默认模型列表（作为回退，优先使用稳定且快速的模型）
 */
const DEFAULT_MODELS = [
    "gemini-2.5-flash-live", 
    "gemini-2.5-flash",     // 最新快速模型
    "gemini-2.0-flash",     // 稳定快速模型
    "gemini-1.5-flash",     // 经典快速模型
    "gemini-2.5-pro",       // 最新专业模型
    "gemini-1.5-pro",       // 稳定专业模型
    "gemini-pro",           // 经典模型
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
    - https://www.cigaraficionado.com/ and https://www.cigaraficionado.com/ratingsandreviews
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
    
    // 使用全局默认模型列表
    const defaultModels = DEFAULT_MODELS;
    
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
            const generateResult = await model.generateContent([prompt, imagePart]);
            const response = await generateResult.response;
            const text = response.text();

            // Clean up markdown code blocks if present (just in case)
            const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();

            const analysisResult = JSON.parse(jsonStr) as CigarAnalysisResult;
            
            // 根据品牌和产品名称搜索图片 URL
            if (analysisResult.brand && analysisResult.name && analysisResult.confidence > 0.5) {
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
                console.log(`[analyzeCigarImage] 跳过图片搜索 - 品牌: ${analysisResult.brand}, 名称: ${analysisResult.name}, 可信度: ${analysisResult.confidence}`);
            }
            
            return analysisResult;
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
                        // 根据品牌和产品名称搜索图片 URL
                        if (restResult.brand && restResult.name && restResult.confidence > 0.5) {
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
                        }
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
 * 根据品牌和产品名称搜索雪茄茄标图片 URL
 * @param brand 品牌名称
 * @param name 产品名称
 * @returns 图片 URL 或 null
 */
/**
 * 验证图片 URL 是否可访问（使用 HEAD 请求）
 * 注意：由于 CORS 限制，某些网站可能无法验证，但我们会尝试
 */
async function validateImageUrl(url: string): Promise<boolean> {
    try {
        // 使用 HEAD 请求检查 URL 是否可访问
        const response = await fetch(url, {
            method: 'HEAD',
            mode: 'no-cors', // 使用 no-cors 避免 CORS 错误，但无法读取响应状态
            cache: 'no-cache'
        });
        
        // 由于 no-cors 模式，我们无法读取状态码
        // 但我们可以尝试加载图片来验证
        return new Promise((resolve) => {
            const img = new Image();
            const timeout = setTimeout(() => {
                resolve(false);
            }, 5000); // 5秒超时
            
            img.onload = () => {
                clearTimeout(timeout);
                resolve(true);
            };
            
            img.onerror = () => {
                clearTimeout(timeout);
                resolve(false);
            };
            
            img.src = url;
        });
    } catch (error) {
        console.warn(`[validateImageUrl] URL验证失败:`, url, error);
        return false;
    }
}

async function searchCigarImageUrl(brand: string, name: string): Promise<string | null> {
    if (!API_KEY) {
        return null;
    }

    const searchPrompt = `
Search for a publicly accessible, working image URL of a single stick of cigar with band/label for "${brand} ${name}".

CRITICAL REQUIREMENTS:
1. The URL MUST be a direct link to an image file (e.g., .jpg, .png, .webp), NOT a webpage URL
2. The URL MUST be accessible and return a valid image (not 404)
3. The image should show the cigar band/label clearly
4. The image should show a single stick of cigar without excessive margins
5. Prefer images from these reliable sources (in order of preference):
    - https://www.cigaraficionado.com/ (look for direct image URLs in their ratings/reviews)
    - https://cigar-coop.com/ (direct image URLs)
    - https://cigardojo.com/ (direct image URLs from reviews)
    - https://halfwheel.com/ (direct image URLs from reviews)
    - https://www.cigarjournal.com/ (direct image URLs)
    - https://www.famous-smoke.com/ (product image URLs)
    - https://www.neptunecigar.com/ (product image URLs - verify the URL exists)
    - https://www.habanos.com/en/ (for Cuban cigars - direct image URLs)
    - https://www.cigarsratings.com/ (direct image URLs)
    - https://www.leafenthusiast.com/ (direct image URLs)

IMPORTANT: 
- Return ONLY a working, accessible image URL as plain text
- Do NOT return URLs that might return 404 errors
- If you cannot find a verified working image URL, return "null"
- The URL should end with an image extension (.jpg, .jpeg, .png, .webp) or be a known image CDN URL
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
    
    // 构建模型列表（与主识别函数相同的优先级）
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
    
    // 确保列表不为空
    if (modelsToTry.length === 0) {
        modelsToTry = [...defaultModels];
    }
    
    console.log(`[searchCigarImageUrl] 搜索 "${brand} ${name}" 的图片URL，尝试模型:`, modelsToTry);

    // 尝试使用 SDK
    for (const modelName of modelsToTry) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(searchPrompt);
            const response = await result.response;
            
            // 检查响应是否有效
            if (!response) {
                console.warn(`[searchCigarImageUrl] [${modelName}] ❌ 响应为空`);
                continue;
            }
            
            // 调试：检查响应对象的完整结构
            console.log(`[searchCigarImageUrl] [${modelName}] 响应对象结构:`, {
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
                    console.warn(`[searchCigarImageUrl] [${modelName}] response.text() 返回空值，尝试从 result 获取`);
                    const candidates = (result as any).response?.candidates;
                    if (candidates && candidates.length > 0) {
                        const content = candidates[0]?.content;
                        if (content?.parts && content.parts.length > 0) {
                            rawResponse = content.parts[0]?.text?.trim() || '';
                        }
                    }
                }
            } catch (textError: any) {
                console.warn(`[searchCigarImageUrl] [${modelName}] ❌ 无法获取文本响应:`, textError?.message || textError);
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
                console.warn(`[searchCigarImageUrl] [${modelName}] ❌ 响应为空或null，完整响应对象:`, {
                    response: response,
                    result: result,
                    rawResponse: rawResponse
                });
                continue;
            }
            
            console.log(`[searchCigarImageUrl] [${modelName}] Gemini 原始响应:`, rawResponse);

            // 清理响应文本（移除可能的引号、换行等）
            let imageUrl = rawResponse
                .replace(/^["']|["']$/g, '') // 移除首尾引号
                .replace(/\n/g, '') // 移除换行
                .trim();

            // 验证返回的是有效的 URL
            if (imageUrl && imageUrl.toLowerCase() !== 'null' && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
                console.log(`[searchCigarImageUrl] [${modelName}] 找到有效URL:`, imageUrl);
                
                // 更宽松的验证：只要是http/https开头的URL就接受
                // 因为很多图片URL可能不包含明显的图片扩展名（如CDN URL）
                const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];
                const hasImageExtension = imageExtensions.some(ext => 
                    imageUrl.toLowerCase().includes(ext)
                );
                
                // 检查是否是图片相关的URL（包含图片关键词或常见图片服务）
                const isImageRelated = imageUrl.includes('image') ||
                    imageUrl.includes('photo') ||
                    imageUrl.includes('picture') ||
                    imageUrl.includes('img') ||
                    imageUrl.includes('cloudinary') ||
                    imageUrl.includes('imgur') ||
                    imageUrl.includes('cdn') ||
                    imageUrl.includes('static');
                
                if (hasImageExtension || isImageRelated) {
                    console.log(`[searchCigarImageUrl] [${modelName}] ✅ URL格式验证通过，返回:`, imageUrl);
                    
                    // 异步验证 URL 可访问性（不阻塞返回，仅用于日志记录）
                    validateImageUrl(imageUrl).then(isValid => {
                        if (isValid) {
                            console.log(`[searchCigarImageUrl] [${modelName}] ✅ URL可访问性验证通过:`, imageUrl);
                        } else {
                            console.warn(`[searchCigarImageUrl] [${modelName}] ⚠️ URL可访问性验证失败（可能404）:`, imageUrl);
                        }
                    }).catch(() => {
                        // 验证失败不影响返回 URL
                    });
                    
                    return imageUrl;
                } else {
                    // 即使没有明显的图片标识，只要是有效URL也尝试返回
                    // 让浏览器尝试加载，如果失败会在组件中回退
                    console.log(`[searchCigarImageUrl] [${modelName}] ⚠️ URL没有明显的图片标识，但尝试返回:`, imageUrl);
                    return imageUrl;
                }
            } else {
                console.warn(`[searchCigarImageUrl] [${modelName}] ❌ 无效的URL响应:`, imageUrl);
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
                console.warn(`[searchCigarImageUrl] 模型 ${modelName} 在 SDK 中不可用，尝试使用 REST API...`);
                
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
                        console.warn(`[searchCigarImageUrl] [REST API ${modelName}] HTTP错误 ${restResponse.status}:`, errorText);
                        continue;
                    }
                    
                    const data = await restResponse.json();
                    
                    // 检查响应结构
                    if (!data.candidates || data.candidates.length === 0) {
                        console.warn(`[searchCigarImageUrl] [REST API ${modelName}] ❌ 响应中没有candidates:`, data);
                        continue;
                    }
                    
                    const candidate = data.candidates[0];
                    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
                        console.warn(`[searchCigarImageUrl] [REST API ${modelName}] ❌ 响应中没有content.parts:`, candidate);
                        continue;
                    }
                    
                    const text = candidate.content.parts[0]?.text || '';
                    const rawResponse = text.trim();
                    
                    if (!rawResponse || rawResponse === 'null' || rawResponse === '') {
                        console.warn(`[searchCigarImageUrl] [REST API ${modelName}] ❌ 响应文本为空:`, rawResponse);
                        continue;
                    }
                    
                    console.log(`[searchCigarImageUrl] [REST API ${modelName}] Gemini 原始响应:`, rawResponse);
                    
                    let imageUrl = rawResponse
                        .replace(/^["']|["']$/g, '')
                        .replace(/\n/g, '')
                        .trim();
                    
                    if (imageUrl && imageUrl.toLowerCase() !== 'null' && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
                        console.log(`[searchCigarImageUrl] [REST API ${modelName}] ✅ 找到有效URL，返回:`, imageUrl);
                        
                        // 异步验证 URL 可访问性（不阻塞返回，仅用于日志记录）
                        validateImageUrl(imageUrl).then(isValid => {
                            if (isValid) {
                                console.log(`[searchCigarImageUrl] [REST API ${modelName}] ✅ URL可访问性验证通过:`, imageUrl);
                            } else {
                                console.warn(`[searchCigarImageUrl] [REST API ${modelName}] ⚠️ URL可访问性验证失败（可能404）:`, imageUrl);
                            }
                        }).catch(() => {
                            // 验证失败不影响返回 URL
                        });
                        
                        return imageUrl;
                    } else {
                        console.warn(`[searchCigarImageUrl] [REST API ${modelName}] ❌ 无效的URL响应:`, imageUrl);
                    }
                } catch (restError: any) {
                    console.warn(`[searchCigarImageUrl] [REST API ${modelName}] 调用失败:`, restError?.message || restError);
                    continue;
                }
                
                continue;
            }
            
            // 其他错误（如权限、配额等）记录但继续尝试下一个模型
            console.warn(`[searchCigarImageUrl] 模型 ${modelName} 调用失败:`, error);
            continue;
        }
    }
    
    // 所有模型都失败
    console.warn(`[searchCigarImageUrl] ❌ 所有模型都失败，无法搜索图片URL`);
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

    // 构建包含品牌信息的提示
    const brandInfo = brand && brand.trim() 
        ? ` The brand is "${brand.trim()}". Use this brand information to improve identification accuracy.`
        : '';
    
    const prompt = `
    Based on the cigar name "${brandInfo} ${cigarName}", provide detailed information about this cigar.
    
    IMPORTANT: You should reference information from authoritative cigar websites and databases to ensure accuracy. 
    Consider searching and referencing information from these reputable sources:
    - https://www.cigaraficionado.com/ and https://www.cigaraficionado.com/ratingsandreviews
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
