/**
 * Google Image Search Service
 * 使用 Google Custom Search API 搜索雪茄图片
 */

// Google Custom Search API 配置
const GOOGLE_SEARCH_API_KEY = import.meta.env.VITE_GOOGLE_SEARCH_API_KEY || '';
const GOOGLE_SEARCH_ENGINE_ID = import.meta.env.VITE_GOOGLE_SEARCH_ENGINE_ID || '';

export interface GoogleImageSearchResult {
    url: string;
    title: string;
    thumbnail?: string;
    width?: number;
    height?: number;
}

/**
 * 使用 Google Custom Search API 搜索图片
 * @param query 搜索关键词
 * @param maxResults 最大返回结果数（默认 10）
 * @returns 图片 URL 列表
 */
export async function searchGoogleImages(
    query: string,
    maxResults: number = 10
): Promise<string[]> {
    if (!GOOGLE_SEARCH_API_KEY || !GOOGLE_SEARCH_ENGINE_ID) {
        console.warn('[GoogleImageSearch] ⚠️ Google Search API 未配置，跳过 Google 图片搜索');
        return [];
    }

    if (!query || !query.trim()) {
        return [];
    }

    try {
        // 构建搜索查询，添加图片搜索优化关键词
        const searchQuery = `${query} cigar band label product image`;
        
        // Google Custom Search API 端点
        const apiUrl = `https://www.googleapis.com/customsearch/v1?` +
            `key=${GOOGLE_SEARCH_API_KEY}&` +
            `cx=${GOOGLE_SEARCH_ENGINE_ID}&` +
            `q=${encodeURIComponent(searchQuery)}&` +
            `searchType=image&` +
            `num=${Math.min(maxResults, 10)}&` + // Google API 限制每次最多 10 个结果
            `safe=active&` +
            `imgSize=large&` + // 优先大尺寸图片
            `imgType=photo`; // 只搜索照片类型

        console.log(`[GoogleImageSearch] 🔍 搜索图片: "${query}"`);

        const response = await fetch(apiUrl);

        if (!response.ok) {
            const errorText = await response.text();
            console.warn(`[GoogleImageSearch] ❌ API 请求失败 (${response.status}):`, errorText);
            return [];
        }

        const data = await response.json();

        if (!data.items || data.items.length === 0) {
            console.log(`[GoogleImageSearch] ⚠️ 未找到图片结果`);
            return [];
        }

        // 提取图片 URL
        const imageUrls = data.items
            .map((item: any) => item.link)
            .filter((url: string) => {
                // 过滤掉无效的 URL
                if (!url || typeof url !== 'string') return false;
                if (!url.startsWith('http://') && !url.startsWith('https://')) return false;
                
                // 排除 Google 跳转链接
                if (url.includes('google.com/url') || 
                    url.includes('google.com/imgres') || 
                    url.includes('googleusercontent.com') ||
                    url.includes('google.com/search')) {
                    return false;
                }

                // 优先选择有图片扩展名的 URL
                const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];
                const hasImageExtension = imageExtensions.some(ext => 
                    url.toLowerCase().endsWith(ext) || url.toLowerCase().includes(ext + '?')
                );

                // 或者包含图片相关的关键词
                const isImageRelated = url.includes('image') ||
                    url.includes('photo') ||
                    url.includes('picture') ||
                    url.includes('img') ||
                    url.includes('cdn') ||
                    url.includes('static') ||
                    url.includes('product') ||
                    url.includes('media');

                return hasImageExtension || isImageRelated;
            });

        console.log(`[GoogleImageSearch] ✅ 找到 ${imageUrls.length} 个有效图片 URL`);
        return imageUrls;
    } catch (error: any) {
        console.warn(`[GoogleImageSearch] ❌ 搜索失败:`, error?.message || error);
        return [];
    }
}

/**
 * 验证图片 URL 是否可访问
 * @param url 图片 URL
 * @returns 是否可访问
 */
async function validateImageUrl(url: string): Promise<boolean> {
    return new Promise((resolve) => {
        try {
            const img = new Image();
            const timeout = setTimeout(() => {
                resolve(false);
            }, 2000); // 2秒超时

            img.onload = () => {
                clearTimeout(timeout);
                resolve(true);
            };

            img.onerror = () => {
                clearTimeout(timeout);
                resolve(false);
            };

            img.src = url;
        } catch (error) {
            resolve(false);
        }
    });
}

/**
 * 搜索并验证图片 URL（返回第一个可用的）
 * @param brand 品牌名称
 * @param name 雪茄名称
 * @returns 可用的图片 URL 或 null
 */
export async function searchCigarImageWithGoogle(
    brand: string,
    name: string
): Promise<string | null> {
    const query = `${brand} ${name}`;
    
    if (!GOOGLE_SEARCH_API_KEY || !GOOGLE_SEARCH_ENGINE_ID) {
        console.warn(`[GoogleImageSearch] ⚠️ Google Search API 未配置，跳过搜索: "${query}"`);
        console.warn(`[GoogleImageSearch] 💡 提示: 请在环境变量中设置 VITE_GOOGLE_SEARCH_API_KEY 和 VITE_GOOGLE_SEARCH_ENGINE_ID`);
        return null;
    }

    console.log(`[GoogleImageSearch] 🔍 开始搜索: "${query}"`);

    // 搜索图片
    const imageUrls = await searchGoogleImages(query, 10);

    if (imageUrls.length === 0) {
        console.log(`[GoogleImageSearch] ⚠️ 未找到图片 URL`);
        return null;
    }

    // 验证每个 URL 的可访问性，返回第一个可用的
    for (const url of imageUrls) {
        console.log(`[GoogleImageSearch] 🔍 验证 URL 可访问性:`, url);
        const isValid = await validateImageUrl(url);
        
        if (isValid) {
            console.log(`[GoogleImageSearch] ✅ 找到可用的图片 URL:`, url);
            return url;
        } else {
            console.log(`[GoogleImageSearch] ⚠️ URL 不可访问，尝试下一个:`, url);
        }
    }

    console.log(`[GoogleImageSearch] ❌ 所有 URL 都不可访问`);
    return null;
}

