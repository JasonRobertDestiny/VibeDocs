#!/usr/bin/env node

// 流式处理器 - 优化内存使用和响应速度
export class StreamProcessor {
  private static readonly CHUNK_SIZE = 1024 * 10; // 10KB chunks
  private static readonly MAX_MEMORY_USAGE = 1024 * 1024 * 50; // 50MB limit
  private static readonly STREAM_TIMEOUT = 30000; // 30秒超时

  /**
   * 流式处理大型文本数据
   * @param data 要处理的数据
   * @param processor 处理函数
   * @param options 配置选项
   */
  static async* processStream<T, R>(
    data: T[],
    processor: (chunk: T[], index: number) => Promise<R[]>,
    options: {
      chunkSize?: number;
      maxMemoryUsage?: number;
      onProgress?: (processed: number, total: number) => void;
      parallel?: boolean;
    } = {}
  ): AsyncGenerator<R[], void, unknown> {
    const {
      chunkSize = Math.ceil(data.length / 10), // 10个chunk
      maxMemoryUsage = this.MAX_MEMORY_USAGE,
      onProgress,
      parallel = false
    } = options;

    const totalChunks = Math.ceil(data.length / chunkSize);
    let processedChunks = 0;
    const memoryMonitor = new MemoryMonitor(maxMemoryUsage);

    try {
      for (let i = 0; i < data.length; i += chunkSize) {
        // 内存检查
        await memoryMonitor.checkMemoryUsage();

        const chunk = data.slice(i, i + chunkSize);
        const chunkIndex = Math.floor(i / chunkSize);
        
        console.log(`🔄 处理数据块 ${chunkIndex + 1}/${totalChunks} (${chunk.length} 项)`);
        
        const startTime = Date.now();
        const result = await processor(chunk, chunkIndex);
        const duration = Date.now() - startTime;
        
        processedChunks++;
        
        if (onProgress) {
          onProgress(processedChunks, totalChunks);
        }
        
        console.log(`✅ 数据块 ${chunkIndex + 1} 处理完成 (耗时: ${duration}ms, 结果: ${result.length} 项)`);
        
        yield result;
        
        // 强制垃圾回收（如果可用）
        if (global.gc) {
          global.gc();
        }
      }
    } catch (error) {
      console.error(`❌ 流式处理失败: ${error.message}`);
      throw new Error(`流式处理失败: ${error.message}`);
    }
  }

  /**
   * 流式字符串处理 - 处理大型文本
   */
  static async* processTextStream(
    text: string,
    processor: (chunk: string) => Promise<string>,
    options: {
      chunkSize?: number;
      overlap?: number; // 重叠字符数，避免边界问题
      onProgress?: (processed: number, total: number) => void;
    } = {}
  ): AsyncGenerator<string, void, unknown> {
    const {
      chunkSize = this.CHUNK_SIZE,
      overlap = 100,
      onProgress
    } = options;

    const totalChunks = Math.ceil(text.length / chunkSize);
    let processedChunks = 0;
    let position = 0;

    while (position < text.length) {
      const endPosition = Math.min(position + chunkSize, text.length);
      let chunk = text.slice(position, endPosition);
      
      // 添加重叠部分（除了第一个chunk）
      if (position > 0) {
        const overlapStart = Math.max(0, position - overlap);
        chunk = text.slice(overlapStart, endPosition);
      }
      
      console.log(`🔄 处理文本块 ${processedChunks + 1}/${totalChunks} (${chunk.length} 字符)`);
      
      const startTime = Date.now();
      const result = await processor(chunk);
      const duration = Date.now() - startTime;
      
      processedChunks++;
      
      if (onProgress) {
        onProgress(processedChunks, totalChunks);
      }
      
      console.log(`✅ 文本块 ${processedChunks} 处理完成 (耗时: ${duration}ms)`);
      
      yield result;
      
      position = endPosition;
    }
  }

  /**
   * 流式JSON处理 - 处理大型JSON数据
   */
  static async processLargeJSON(
    jsonData: any,
    processor: (data: any) => Promise<any>,
    options: {
      memoryLimit?: number;
      onProgress?: (stage: string) => void;
    } = {}
  ): Promise<any> {
    const {
      memoryLimit = this.MAX_MEMORY_USAGE,
      onProgress
    } = options;

    const memoryMonitor = new MemoryMonitor(memoryLimit);
    
    try {
      // 检查数据大小
      const dataSize = this.estimateObjectSize(jsonData);
      console.log(`📊 JSON数据大小估计: ${Math.round(dataSize / 1024)}KB`);
      
      if (dataSize > memoryLimit) {
        console.log(`⚠️ 数据过大，启用流式处理`);
        return await this.processLargeJSONStreaming(jsonData, processor, options);
      }
      
      // 小数据直接处理
      onProgress?.('processing');
      return await processor(jsonData);
      
    } catch (error) {
      console.error(`❌ JSON处理失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 流式处理大型JSON
   */
  private static async processLargeJSONStreaming(
    jsonData: any,
    processor: (data: any) => Promise<any>,
    options: { onProgress?: (stage: string) => void } = {}
  ): Promise<any> {
    const { onProgress } = options;
    
    if (Array.isArray(jsonData)) {
      // 数组类型的流式处理
      onProgress?.('processing_array');
      const results: any[] = [];
      
      for await (const chunk of this.processStream(
        jsonData,
        async (items) => [await processor(items)],
        { chunkSize: 100 }
      )) {
        results.push(...chunk);
      }
      
      return results;
    } else if (typeof jsonData === 'object' && jsonData !== null) {
      // 对象类型的分块处理
      onProgress?.('processing_object');
      const result: any = {};
      const entries = Object.entries(jsonData);
      
      for await (const chunk of this.processStream(
        entries,
        async (items) => {
          const chunkResult: any = {};
          for (const [key, value] of items) {
            chunkResult[key] = await processor(value);
          }
          return [chunkResult];
        },
        { chunkSize: 50 }
      )) {
        Object.assign(result, ...chunk);
      }
      
      return result;
    } else {
      // 基本类型直接处理
      return await processor(jsonData);
    }
  }

  /**
   * 估算对象大小（近似值）
   */
  private static estimateObjectSize(obj: any): number {
    const jsonString = JSON.stringify(obj);
    return Buffer.byteLength(jsonString, 'utf8');
  }

  /**
   * 创建背压控制的流处理器
   */
  static createBackpressureProcessor<T, R>(
    processor: (item: T) => Promise<R>,
    options: {
      concurrency?: number;
      bufferSize?: number;
      onBackpressure?: () => void;
    } = {}
  ) {
    const {
      concurrency = 3,
      bufferSize = 100,
      onBackpressure
    } = options;

    let processing = 0;
    const buffer: T[] = [];
    const results: R[] = [];

    return {
      async push(item: T): Promise<void> {
        buffer.push(item);
        
        if (buffer.length > bufferSize) {
          onBackpressure?.();
          await this.drain();
        }
        
        this.processNext();
      },

      async drain(): Promise<R[]> {
        while (processing > 0 || buffer.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        return [...results];
      },

      async processNext(): Promise<void> {
        if (processing >= concurrency || buffer.length === 0) {
          return;
        }

        const item = buffer.shift()!;
        processing++;

        try {
          const result = await processor(item);
          results.push(result);
        } catch (error) {
          console.error(`处理项目失败:`, error);
        } finally {
          processing--;
          this.processNext();
        }
      }
    };
  }
}

// 内存监控器
class MemoryMonitor {
  private memoryLimit: number;
  private lastCheck: number = 0;
  private readonly CHECK_INTERVAL = 1000; // 1秒检查一次

  constructor(memoryLimit: number) {
    this.memoryLimit = memoryLimit;
  }

  async checkMemoryUsage(): Promise<void> {
    const now = Date.now();
    if (now - this.lastCheck < this.CHECK_INTERVAL) {
      return;
    }

    this.lastCheck = now;
    const usage = process.memoryUsage();
    const heapUsed = usage.heapUsed;

    console.log(`📊 内存使用: ${Math.round(heapUsed / 1024 / 1024)}MB / ${Math.round(this.memoryLimit / 1024 / 1024)}MB`);

    if (heapUsed > this.memoryLimit) {
      // 强制垃圾回收
      if (global.gc) {
        console.log(`🧹 触发垃圾回收`);
        global.gc();
        
        // 再次检查
        const newUsage = process.memoryUsage();
        if (newUsage.heapUsed > this.memoryLimit) {
          throw new Error(`内存使用超限: ${Math.round(newUsage.heapUsed / 1024 / 1024)}MB > ${Math.round(this.memoryLimit / 1024 / 1024)}MB`);
        }
      } else {
        console.warn(`⚠️ 内存使用高，但无法强制垃圾回收`);
      }
    }
  }

  getMemoryInfo(): { used: number; limit: number; percentage: number } {
    const usage = process.memoryUsage();
    const used = usage.heapUsed;
    const percentage = Math.round((used / this.memoryLimit) * 100);
    
    return {
      used,
      limit: this.memoryLimit,
      percentage
    };
  }
}

// 流式缓冲区
export class StreamBuffer<T> {
  private buffer: T[] = [];
  private readonly maxSize: number;
  private readonly flushCallback: (items: T[]) => Promise<void>;

  constructor(
    maxSize: number,
    flushCallback: (items: T[]) => Promise<void>
  ) {
    this.maxSize = maxSize;
    this.flushCallback = flushCallback;
  }

  async push(item: T): Promise<void> {
    this.buffer.push(item);
    
    if (this.buffer.length >= this.maxSize) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    
    const items = [...this.buffer];
    this.buffer = [];
    
    try {
      await this.flushCallback(items);
    } catch (error) {
      console.error(`缓冲区刷新失败:`, error);
      // 重新添加到缓冲区开头
      this.buffer.unshift(...items);
      throw error;
    }
  }

  getBufferSize(): number {
    return this.buffer.length;
  }

  isEmpty(): boolean {
    return this.buffer.length === 0;
  }
}

export { MemoryMonitor };