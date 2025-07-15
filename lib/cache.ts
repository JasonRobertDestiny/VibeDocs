'use client'

interface CacheItem {
  data: unknown
  timestamp: number
  hash: string
  semanticVector?: number[]
  hitCount: number
  lastAccessed: number
  metadata?: {
    originalPrompt: string
    language?: string
    stage?: string
  }
}

interface SemanticSimilarityResult {
  item: CacheItem
  similarity: number
  key: string
}

class EnhancedGenerationCache {
  private cache = new Map<string, CacheItem>()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5分钟
  private readonly MAX_CACHE_SIZE = 100 // 增加缓存大小
  private readonly SEMANTIC_THRESHOLD = 0.75 // 语义相似度阈值
  private readonly SEMANTIC_VECTOR_SIZE = 50 // 语义向量维度
  
  /**
   * 生成简单的语义向量（简化版，实际应用可使用更复杂的NLP模型）
   */
  private generateSemanticVector(text: string): number[] {
    const words = this.tokenizeText(text);
    const vector = new Array(this.SEMANTIC_VECTOR_SIZE).fill(0);
    
    // 基于词频和位置的简单语义向量
    words.forEach((word, index) => {
      const wordHash = this.hashString(word);
      const position = wordHash % this.SEMANTIC_VECTOR_SIZE;
      vector[position] += (1 / (index + 1)) * word.length; // 位置权重 * 词长度
    });
    
    // 归一化向量
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? vector.map(val => val / magnitude) : vector;
  }
  
  /**
   * 计算两个语义向量的余弦相似度
   */
  private calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) return 0;
    
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }
    
    if (norm1 === 0 || norm2 === 0) return 0;
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }
  
  /**
   * 文本分词处理
   */
  private tokenizeText(text: string): string[] {
    return text
      .toLowerCase()
      .trim()
      // 移除标点符号，保留中英文
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ')
      // 分割并过滤短词
      .split(/\s+/)
      .filter(word => word.length > 1)
      // 去重
      .filter((word, index, arr) => arr.indexOf(word) === index);
  }
  
  /**
   * 字符串哈希函数
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转为32位整数
    }
    return Math.abs(hash);
  }
  
  /**
   * 增强的哈希生成（结合语义信息）
   */
  private generateEnhancedHash(text: string, metadata?: any): string {
    const normalized = text.toLowerCase().trim().replace(/[\s,\u3002\uff0c]+/g, ' ');
    const words = this.tokenizeText(normalized);
    const keyWords = words.slice(0, 10); // 取前10个关键词
    
    let baseHash = keyWords.sort().join('-').substring(0, 30);
    
    // 添加元数据信息到哈希
    if (metadata) {
      if (metadata.language) baseHash += `_${metadata.language}`;
      if (metadata.stage) baseHash += `_${metadata.stage}`;
    }
    
    return baseHash;
  }
  
  /**
   * 查找语义相似的缓存项
   */
  private findSemanticallySimilar(text: string, threshold: number = this.SEMANTIC_THRESHOLD): SemanticSimilarityResult[] {
    const targetVector = this.generateSemanticVector(text);
    const candidates: SemanticSimilarityResult[] = [];
    
    for (const [key, item] of this.cache.entries()) {
      if (!item.semanticVector) continue;
      
      const similarity = this.calculateCosineSimilarity(targetVector, item.semanticVector);
      if (similarity >= threshold) {
        candidates.push({ item, similarity, key });
      }
    }
    
    // 按相似度降序排序
    return candidates.sort((a, b) => b.similarity - a.similarity);
  }
  
  /**
   * 获取缓存项（支持语义相似度匹配）
   */
  get(prompt: string, metadata?: any): unknown | null {
    const hash = this.generateEnhancedHash(prompt, metadata);
    
    // 1. 首先尝试精确匹配
    const exactMatch = this.cache.get(hash);
    if (exactMatch) {
      if (Date.now() - exactMatch.timestamp <= this.CACHE_DURATION) {
        exactMatch.hitCount++;
        exactMatch.lastAccessed = Date.now();
        console.log(`🎯 精确缓存命中: ${hash.substring(0, 20)}...`);
        return exactMatch.data;
      } else {
        this.cache.delete(hash);
      }
    }
    
    // 2. 尝试语义相似度匹配
    const similarItems = this.findSemanticallySimilar(prompt, this.SEMANTIC_THRESHOLD);
    if (similarItems.length > 0) {
      const bestMatch = similarItems[0];
      if (Date.now() - bestMatch.item.timestamp <= this.CACHE_DURATION) {
        bestMatch.item.hitCount++;
        bestMatch.item.lastAccessed = Date.now();
        console.log(`🔍 语义缓存命中: 相似度${Math.round(bestMatch.similarity * 100)}%`);
        return bestMatch.item.data;
      }
    }
    
    return null;
  }
  
  /**
   * 设置缓存项（包含语义向量）
   */
  set(prompt: string, data: unknown, metadata?: any): void {
    // 清理过期和低频缓存项
    this.cleanupCache();
    
    const hash = this.generateEnhancedHash(prompt, metadata);
    const semanticVector = this.generateSemanticVector(prompt);
    
    this.cache.set(hash, {
      data,
      timestamp: Date.now(),
      hash,
      semanticVector,
      hitCount: 1,
      lastAccessed: Date.now(),
      metadata: {
        originalPrompt: prompt.substring(0, 200), // 保存前200字符用于调试
        ...metadata
      }
    });
    
    console.log(`💾 缓存已更新: ${hash.substring(0, 20)}... (语义向量维度: ${semanticVector.length})`);
  }
  
  /**
   * 智能缓存清理（LRU + 低频清理）
   */
  private cleanupCache(): void {
    if (this.cache.size < this.MAX_CACHE_SIZE) return;
    
    const now = Date.now();
    const items = Array.from(this.cache.entries()).map(([key, item]) => ({
      key,
      item,
      score: this.calculateCacheScore(item, now)
    }));
    
    // 按评分排序，移除评分最低的项目
    items.sort((a, b) => a.score - b.score);
    
    const itemsToRemove = Math.ceil(this.MAX_CACHE_SIZE * 0.2); // 移除20%
    for (let i = 0; i < itemsToRemove && items.length > 0; i++) {
      this.cache.delete(items[i].key);
    }
    
    console.log(`🧹 缓存清理完成，移除了 ${itemsToRemove} 个低价值项目`);
  }
  
  /**
   * 计算缓存项的价值评分
   */
  private calculateCacheScore(item: CacheItem, now: number): number {
    const age = now - item.timestamp;
    const lastAccessAge = now - item.lastAccessed;
    const hitFrequency = item.hitCount;
    
    // 评分越高越有价值
    // 因子：命中频率 + 新鲜度 + 最近访问
    const frequencyScore = Math.log(hitFrequency + 1) * 100;
    const freshnessScore = Math.max(0, (this.CACHE_DURATION - age) / this.CACHE_DURATION) * 50;
    const accessScore = Math.max(0, (this.CACHE_DURATION - lastAccessAge) / this.CACHE_DURATION) * 30;
    
    return frequencyScore + freshnessScore + accessScore;
  }
  
  /**
   * 获取缓存统计信息
   */
  getStats(): { 
    size: number; 
    oldestEntry: number | null;
    hitRates: { total: number; average: number };
    semanticCoverage: number;
  } {
    if (this.cache.size === 0) {
      return { 
        size: 0, 
        oldestEntry: null,
        hitRates: { total: 0, average: 0 },
        semanticCoverage: 0
      };
    }
    
    let oldestTimestamp = Date.now();
    let totalHits = 0;
    let itemsWithVectors = 0;
    
    for (const item of this.cache.values()) {
      if (item.timestamp < oldestTimestamp) {
        oldestTimestamp = item.timestamp;
      }
      totalHits += item.hitCount;
      if (item.semanticVector) {
        itemsWithVectors++;
      }
    }
    
    return {
      size: this.cache.size,
      oldestEntry: oldestTimestamp,
      hitRates: {
        total: totalHits,
        average: Math.round(totalHits / this.cache.size * 10) / 10
      },
      semanticCoverage: Math.round((itemsWithVectors / this.cache.size) * 100)
    };
  }
  
  /**
   * 分析语义相似度分布
   */
  analyzeSemanticDistribution(sampleText: string): {
    similarItems: number;
    averageSimilarity: number;
    maxSimilarity: number;
  } {
    const similarItems = this.findSemanticallySimilar(sampleText, 0.1); // 低阈值获取所有相似项
    
    if (similarItems.length === 0) {
      return { similarItems: 0, averageSimilarity: 0, maxSimilarity: 0 };
    }
    
    const totalSimilarity = similarItems.reduce((sum, item) => sum + item.similarity, 0);
    const maxSimilarity = Math.max(...similarItems.map(item => item.similarity));
    
    return {
      similarItems: similarItems.length,
      averageSimilarity: Math.round((totalSimilarity / similarItems.length) * 100) / 100,
      maxSimilarity: Math.round(maxSimilarity * 100) / 100
    };
  }
  
  clear(): void {
    this.cache.clear();
    console.log('🗑️ 缓存已清空');
  }
  
  getSize(): number {
    return this.cache.size;
  }
  
  /**
   * 导出缓存性能报告
   */
  generatePerformanceReport(): string {
    const stats = this.getStats();
    const report = [
      '📊 增强缓存系统性能报告',
      '================================',
      `缓存项数量: ${stats.size}/${this.MAX_CACHE_SIZE}`,
      `平均命中率: ${stats.hitRates.average} 次/项`,
      `语义向量覆盖率: ${stats.semanticCoverage}%`,
      `最旧条目: ${stats.oldestEntry ? new Date(stats.oldestEntry).toLocaleString() : 'N/A'}`,
      `相似度阈值: ${this.SEMANTIC_THRESHOLD}`,
      `向量维度: ${this.SEMANTIC_VECTOR_SIZE}`,
      '================================'
    ].join('\n');
    
    return report;
  }
}

// Global enhanced cache instance
export const generationCache = new EnhancedGenerationCache()

// Preload common templates and suggestions
export const preloadCache = () => {
  // This could be called on app initialization to warm up the cache
  console.log('🚀 增强缓存系统已初始化，当前缓存项:', generationCache.getSize())
  console.log(generationCache.generatePerformanceReport());
}

// Export enhanced cache utilities
export const cacheUtils = {
  clear: () => generationCache.clear(),
  getStats: () => generationCache.getStats(),
  preload: preloadCache,
  analyzeSemantics: (text: string) => generationCache.analyzeSemanticDistribution(text),
  generateReport: () => generationCache.generatePerformanceReport()
}

// Export enhanced cache class for external use
export { EnhancedGenerationCache }

// Backward compatibility
export const GenerationCache = EnhancedGenerationCache;