import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
    console.warn("Gemini API Key is missing! Cigar recognition will not work.");
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
    name: string;
    origin: string;
    flavorProfile: string[];
    strength: 'Mild' | 'Medium' | 'Full' | 'Unknown';
    wrapper?: string;      // 茄衣（最外层烟叶）
    binder?: string;       // 茄套（中间层烟叶）
    filler?: string;       // 茄芯（填充烟叶）
    footTasteNotes?: string[];  // 脚部（前1/3）品吸笔记
    bodyTasteNotes?: string[];  // 主体（中1/3）品吸笔记
    headTasteNotes?: string[];  // 头部（后1/3）品吸笔记
    description: string;
    confidence: number; // 0-1
}

export async function analyzeCigarImage(imageBase64: string): Promise<CigarAnalysisResult> {
    if (!API_KEY) {
        throw new Error("API Key not configured. Please set VITE_GEMINI_API_KEY in your .env file");
    }

    // 验证 API Key 格式
    if (!API_KEY.startsWith('AIza')) {
        console.warn('⚠️  API Key 格式可能不正确。Gemini API Key 通常以 "AIza" 开头');
    }

    const prompt = `
    Analyze this image of a cigar. Identify the brand, specific name (vitola if possible), origin, flavor profile, strength, construction details, and expected tasting notes for different sections.
    Return the result strictly as a JSON object with the following keys:
    - brand: string
    - name: string (the specific cigar name)
    - origin: string (country)
    - flavorProfile: array of strings (e.g., ["Earth", "Leather"])
    - strength: "Mild" | "Medium" | "Full" | "Unknown"
    - wrapper: string (the outer leaf/wrapper tobacco, e.g., "Connecticut", "Maduro", "Habano", "Corojo", or country of origin)
    - binder: string (the binder leaf tobacco, e.g., "Nicaraguan", "Ecuadorian", or country of origin)
    - filler: string (the filler tobacco blend, e.g., "Nicaraguan", "Dominican", "Cuban", or country/blend description)
    - footTasteNotes: array of strings (expected tasting notes for the foot/first third, e.g., ["Pepper", "Wood", "Light Spice"])
    - bodyTasteNotes: array of strings (expected tasting notes for the body/middle third, e.g., ["Coffee", "Chocolate", "Cedar"])
    - headTasteNotes: array of strings (expected tasting notes for the head/final third, e.g., ["Leather", "Earth", "Spice"])
    - description: string (a short 2-sentence description in Chinese)
    - confidence: number (0.0 to 1.0, how sure are you?)

    Note: 
    - wrapper, binder, and filler can be identified by the color, texture, and appearance of the cigar.
    - footTasteNotes, bodyTasteNotes, and headTasteNotes should be predicted based on the cigar's construction, wrapper color, and typical flavor progression for similar cigars.
    - Foot (first third) typically starts lighter and spicier, Body (middle third) develops complexity, Head (final third) becomes richer and more intense.
    - If you cannot determine these details, you can use empty arrays [] or leave them out.
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

    // 首先尝试获取可用模型列表
    let availableModels: string[] = [];
    try {
        availableModels = await getAvailableModels();
        if (availableModels.length > 0) {
            console.log('✅ 找到可用模型:', availableModels);
        }
    } catch (error) {
        console.warn('获取模型列表失败，使用默认模型列表');
    }
    
    // 构建模型列表：优先使用从 API 获取的模型，然后使用默认列表
    const defaultModels = [
        "gemini-1.5-flash",     // 快速模型，通常最稳定
        "gemini-1.5-pro",       // 较新的模型
        "gemini-pro",           // 经典模型
    ];
    
    // 合并列表，去重，优先使用 API 返回的模型
    const modelsToTry = [
        ...availableModels,
        ...defaultModels.filter(m => !availableModels.includes(m))
    ];
    
    // 如果列表为空，使用默认模型
    if (modelsToTry.length === 0) {
        modelsToTry.push(...defaultModels);
    }
    
    console.log('🧪 尝试模型列表:', modelsToTry);
    
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
    throw new Error(
        `所有 Gemini 模型都不可用。最后错误: ${errorMsg}\n` +
        `请检查：\n` +
        `1. API Key 是否正确配置在 .env 文件中\n` +
        `2. Generative Language API 是否已启用\n` +
        `3. API Key 是否有访问所需模型的权限\n` +
        `4. 尝试访问 https://aistudio.google.com/app/apikey 验证 API Key 是否有效`
    );
}
