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
        // 优化搜索查询：
        // 1. 使用引号强制精确匹配品牌和名称
        // 2. 添加 "single stick" 确保是单支雪茄
        // 3. 添加 "cigar label" 确保显示茄标
        // 4. 排除 "box" "bundle" 避免多支装
        // 5. 添加 "white background" 或 "no background" 优先无背景图片
        // 6. 使用 site: 运算符优先搜索可信网站
        const brandName = query.trim();
        
        // 构建优化的搜索查询
        // 优先搜索可信的雪茄网站（零售商、评测网站、官方网站）
        const trustedSites = [
            // 权威评测网站
            'cigaraficionado.com',
            'halfwheel.com',
            'cigar-coop.com',
            'cigardojo.com',
            'cigarsratings.com',
            'cigarinspector.com',
            'cigarjournal.com',
            'leafenthusiast.com',
            // 主流零售商
            'famous-smoke.com',
            'holts.com',
            'cigarsinternational.com',
            'jrcigars.com',
            'neptunecigar.com',
            'atlanticcigar.com',
            'cigarplace.biz',
            'cigarbus.com',
            'cigarone.com',
            'puroexpress.com',
            '70cigars.com',
            // 国际零售商
            'infifon.com',
            'lacasadelhabano.com',
            'cgarsltd.co.uk',
            'lacasadeltabaco.com',
            'hyhpuro.com',
            'timecigar.com',
            // 古巴雪茄专卖
            'cohcigars.com',
            'topcubans.com',
            // 官方网站
            'habanos.com'  // 古巴雪茄官网
        ];
        
        // 构建优化的搜索查询
        // 优先级：单支 + 茄标 + 无背景/白背景 + 排除多支装
        const siteQuery = trustedSites.map(site => `site:${site}`).join(' OR ');
        const searchQuery = `${brandName} `;
        
        console.log(`[GoogleImageSearch] 🔍 优化搜索（单支+茄标+无背景）: "${searchQuery}"`);
        
        // Google Custom Search API 端点
        // 参数优化说明：
        // - searchType=image: 图片搜索
        // - num=10: 最多返回10个结果
        // - safe=active: 安全搜索
        // - imgType=photo: 只要照片类型（排除剪贴画、线条图）
        // - fileType: 指定图片格式
        // - imgColorType=color: 优先彩色图片（茄标通常是彩色的）
        // - imgDominantColor: 不指定，让搜索引擎自动选择
        const apiUrl = `https://www.googleapis.com/customsearch/v1?` +
            `key=${GOOGLE_SEARCH_API_KEY}&` +
            `cx=${GOOGLE_SEARCH_ENGINE_ID}&` +
            `q=${encodeURIComponent(searchQuery)}&` +
            `searchType=image&` +
            `num=${Math.min(maxResults, 10)}&` + // Google API 限制每次最多 10 个结果
            `safe=active&` +
            `imgType=photo&` + // 只搜索照片类型（排除剪贴画）
            `imgColorType=color&` + // 优先彩色图片（茄标通常是彩色的）
            `fileType=jpg,png,webp`; // 指定文件类型

        console.log(`[GoogleImageSearch] 🔍 搜索图片: "${brandName}"`);

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

        // 提取并评分图片 URL
        const scoredUrls = data.items
            .map((item: any) => ({
                url: item.link,
                title: item.title || '',
                contextLink: item.image?.contextLink || '',
                width: item.image?.width || 0,
                height: item.image?.height || 0
            }))
            .filter((item: any) => {
                const url = item.url;
                // 基础过滤
                if (!url || typeof url !== 'string') return false;
                if (!url.startsWith('http://') && !url.startsWith('https://')) return false;
                
                // 排除 Google 跳转链接
                if (url.includes('google.com/url') || 
                    url.includes('google.com/imgres') || 
                    url.includes('googleusercontent.com') ||
                    url.includes('google.com/search')) {
                    return false;
                }
                
                // 排除低质量 URL 模式
                if (url.includes('/cache/') || 
                    url.includes('/temp/') || 
                    url.includes('/resize/') ||
                    url.includes('/thumb/')) {
                    return false;
                }

                return true;
            })
            .map((item: any) => {
                // 计算 URL 质量分数（0-100）
                let score = 0;
                const url = item.url.toLowerCase();
                
                // 1. 可信网站加分（40分）
                const trustedDomains = [
                    // 权威评测网站
                    'cigaraficionado.com',
                    'halfwheel.com',
                    'cigar-coop.com',
                    'cigardojo.com',
                    'cigarsratings.com',
                    'cigarinspector.com',
                    'cigarjournal.com',
                    'leafenthusiast.com',
                    // 主流零售商
                    'famous-smoke.com',
                    'holts.com',
                    'cigarsinternational.com',
                    'jrcigars.com',
                    'neptunecigar.com',
                    'atlanticcigar.com',
                    'cigarplace.biz',
                    'cigarbus.com',
                    'cigarone.com',
                    'puroexpress.com',
                    '70cigars.com',
                    // 国际零售商
                    'infifon.com',
                    'lacasadelhabano.com',
                    'cgarsltd.co.uk',
                    'lacasadeltabaco.com',
                    'hyhpuro.com',
                    'timecigar.com',
                    // 古巴雪茄专卖
                    'cohcigars.com',
                    'topcubans.com',
                    // 官方网站
                    'habanos.com'
                ];
                if (trustedDomains.some(domain => url.includes(domain))) {
                    score += 40;
                }
                
                // 2. 直接图片 URL 加分（30分）
                const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
                if (imageExtensions.some(ext => url.endsWith(ext) || url.includes(ext + '?'))) {
                    score += 30;
                }
                
                // 3. CDN/静态资源加分（20分）
                if (url.includes('cdn.') || 
                    url.includes('static.') || 
                    url.includes('images.') ||
                    url.includes('img.')) {
                    score += 20;
                }
                
                // 4. 简单路径加分（10分）
                const pathSegments = url.split('/').length;
                if (pathSegments <= 6) {
                    score += 10;
                }
                
                // 5. 图片尺寸加分（最多10分）
                if (item.width >= 800 && item.height >= 800) {
                    score += 10;
                } else if (item.width >= 500 && item.height >= 500) {
                    score += 5;
                }
                
                // 6. 产品相关路径加分（5分）
                if (url.includes('/product') || url.includes('/cigar')) {
                    score += 5;
                }
                
                // 7. 单支雪茄相关关键词加分（5分）
                const title = item.title?.toLowerCase() || '';
                const contextLink = item.contextLink?.toLowerCase() || '';
                if (title.includes('single') || 
                    title.includes('stick') || 
                    contextLink.includes('single') ||
                    url.includes('single') ||
                    url.includes('individual')) {
                    score += 5;
                }
                
                // 8. 茄标相关关键词加分（5分）
                if (title.includes('band') || 
                    title.includes('label') ||
                    url.includes('band') ||
                    url.includes('label')) {
                    score += 5;
                }
                
                // 减分项
                // 1. 复杂哈希路径减分（-15分）
                if (/[a-f0-9]{20,}/.test(url)) {
                    score -= 15;
                }
                
                // 2. 多支装减分（-20分）
                if (title.includes('box') || 
                    title.includes('bundle') || 
                    title.includes('pack') ||
                    url.includes('box') ||
                    url.includes('bundle')) {
                    score -= 20;
                }
                
                // 3. 缩略图减分（-10分）
                if (url.includes('thumb') || 
                    url.includes('thumbnail') ||
                    item.width < 300 || 
                    item.height < 300) {
                    score -= 10;
                }
                
                return {
                    ...item,
                    score
                };
            })
            .sort((a: any, b: any) => b.score - a.score) // 按分数降序排序
            .map((item: any) => {
                console.log(`[GoogleImageSearch]   - URL 评分 ${item.score}: ${item.url}`);
                return item.url;
            });

        console.log(`[GoogleImageSearch] ✅ 找到 ${scoredUrls.length} 个有效图片 URL（已按质量排序）`);
        return scoredUrls;
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
    // 智能构建 query，避免品牌名重复
    let baseQuery: string;
    
    // 标准化处理：移除多余空格，统一大小写用于比较
    const normalizedBrand = brand.trim().toLowerCase();
    const normalizedName = name.trim().toLowerCase();
    
    // 检查 name 是否已经包含 brand
    if (normalizedName.startsWith(normalizedBrand)) {
        // name 已包含 brand，直接使用 name（保留原始大小写）
        baseQuery = name.trim();
        console.log(`[GoogleImageSearch] ℹ️ name 已包含 brand，使用完整名称: "${baseQuery}"`);
    } else {
        // name 不包含 brand，拼接两者
        baseQuery = `${brand.trim()} ${name.trim()}`;
        console.log(`[GoogleImageSearch] ℹ️ 拼接 brand + name: "${baseQuery}"`);
    }
    
    // 添加 'cigar stick' 关键词以提高搜索精确度（优先单支雪茄）
    const query = `${baseQuery} cigar stick`;
    console.log(`[GoogleImageSearch] ℹ️ 最终搜索查询: "${query}"`);
    
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

