'use client'

interface CacheItem {
  data: unknown
  timestamp: number
  hash: string
}

class GenerationCache {
  private cache = new Map<string, CacheItem>()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
  private readonly MAX_CACHE_SIZE = 50
  
  private generateHash(idea: string): string {
    // Simple hash function for caching similar ideas
    const normalized = idea.toLowerCase().trim().replace(/[\s,\u3002\uff0c]+/g, ' ')
    const words = normalized.split(' ').filter(w => w.length > 2)
    return words.sort().join('-').substring(0, 50)
  }
  
  get(idea: string): unknown | null {
    const hash = this.generateHash(idea)
    const item = this.cache.get(hash)
    
    if (!item) return null
    
    // Check if cache is still valid
    if (Date.now() - item.timestamp > this.CACHE_DURATION) {
      this.cache.delete(hash)
      return null
    }
    
    return item.data
  }
  
  set(idea: string, data: unknown): void {
    // Clean old entries if cache is full
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }
    
    const hash = this.generateHash(idea)
    this.cache.set(hash, {
      data,
      timestamp: Date.now(),
      hash
    })
  }
  
  clear(): void {
    this.cache.clear()
  }
  
  getSize(): number {
    return this.cache.size
  }
  
  // Get cache statistics
  getStats(): { size: number; oldestEntry: number | null } {
    if (this.cache.size === 0) {
      return { size: 0, oldestEntry: null }
    }
    
    let oldestTimestamp = Date.now()
    for (const item of this.cache.values()) {
      if (item.timestamp < oldestTimestamp) {
        oldestTimestamp = item.timestamp
      }
    }
    
    return {
      size: this.cache.size,
      oldestEntry: oldestTimestamp
    }
  }
}

// Global cache instance
export const generationCache = new GenerationCache()

// Preload common templates and suggestions
export const preloadCache = () => {
  // This could be called on app initialization to warm up the cache
  console.log('Cache initialized with', generationCache.getSize(), 'entries')
}

// Export cache utilities
export const cacheUtils = {
  clear: () => generationCache.clear(),
  getStats: () => generationCache.getStats(),
  preload: preloadCache
}