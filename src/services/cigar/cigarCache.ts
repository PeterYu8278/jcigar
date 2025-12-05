/**
 * 雪茄数据库缓存服务
 * 
 * 实现两级缓存策略：
 * 1. 内存缓存（LRU，最多 100 条，5 分钟过期）
 * 
 * 注意：由于 Firestore 本身有缓存机制，这里主要实现内存缓存以提高查询速度
 */

import type { CigarDetailedInfo } from '@/types/cigar';
import { normalizeName } from './cigarDatabase';

/**
 * 缓存项接口
 */
interface CachedItem {
  data: CigarDetailedInfo;
  timestamp: number;
}

/**
 * 雪茄缓存类
 * 
 * 使用 LRU（Least Recently Used）策略
 */
class CigarCache {
  private cache: Map<string, CachedItem>;
  private readonly maxSize: number;
  private readonly ttl: number;  // Time To Live（毫秒）
  
  constructor(maxSize: number = 100, ttlMinutes: number = 5) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttlMinutes * 60 * 1000;
  }
  
  /**
   * 生成缓存 key
   * 
   * @param brand - 品牌名称
   * @param name - 雪茄名称
   * @returns 缓存 key
   */
  private generateKey(brand: string, name: string): string {
    const normalizedBrand = normalizeName(brand);
    const normalizedName = normalizeName(name);
    return `${normalizedBrand}_${normalizedName}`;
  }
  
  /**
   * 检查缓存项是否过期
   * 
   * @param item - 缓存项
   * @returns 是否过期
   */
  private isExpired(item: CachedItem): boolean {
    return Date.now() - item.timestamp > this.ttl;
  }
  
  /**
   * 获取缓存
   * 
   * @param brand - 品牌名称
   * @param name - 雪茄名称
   * @returns 缓存的雪茄信息或 null
   */
  get(brand: string, name: string): CigarDetailedInfo | null {
    const key = this.generateKey(brand, name);
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }
    
    // 检查是否过期
    if (this.isExpired(cached)) {
      this.cache.delete(key);
      return null;
    }
    
    // LRU: 将访问的项移到最后（Map 保持插入顺序）
    this.cache.delete(key);
    this.cache.set(key, cached);
    
    return cached.data;
  }
  
  /**
   * 设置缓存
   * 
   * @param brand - 品牌名称
   * @param name - 雪茄名称
   * @param data - 雪茄详细信息
   */
  set(brand: string, name: string, data: CigarDetailedInfo): void {
    const key = this.generateKey(brand, name);
    
    // LRU 淘汰：如果缓存已满，删除最旧的项（Map 的第一个项）
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
  
  /**
   * 清除缓存
   * 
   * @param brand - 可选，指定品牌
   * @param name - 可选，指定雪茄名称
   */
  clear(brand?: string, name?: string): void {
    if (brand && name) {
      const key = this.generateKey(brand, name);
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }
  
  /**
   * 获取缓存统计信息
   * 
   * @returns 缓存统计
   */
  getStats(): {
    size: number;
    maxSize: number;
    ttlMinutes: number;
    items: Array<{ key: string; age: number }>;
  } {
    const items = Array.from(this.cache.entries()).map(([key, item]) => ({
      key,
      age: Math.floor((Date.now() - item.timestamp) / 1000)  // 秒
    }));
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttlMinutes: this.ttl / 60000,
      items
    };
  }
  
  /**
   * 清理过期缓存
   * 
   * @returns 清理的数量
   */
  cleanExpired(): number {
    let cleaned = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (this.isExpired(item)) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    return cleaned;
  }
}

// 导出单例实例
export const cigarCache = new CigarCache(100, 5);

// 定期清理过期缓存（每 5 分钟）
if (typeof window !== 'undefined') {
  setInterval(() => {
    cigarCache.cleanExpired();
  }, 5 * 60 * 1000);
}

