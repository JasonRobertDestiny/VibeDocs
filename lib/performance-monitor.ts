#!/usr/bin/env node

// 性能监控系统 - 内置实时指标收集
export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private readonly MAX_METRICS_HISTORY = 100;
  private readonly METRIC_RETENTION_TIME = 60 * 60 * 1000; // 1小时
  
  constructor() {
    this.initializeBaseMetrics();
  }
  
  /**
   * 初始化基础性能指标
   */
  private initializeBaseMetrics(): void {
    const baseMetrics = [
      'api_calls',
      'cache_hits',
      'cache_misses', 
      'processing_time',
      'memory_usage',
      'json_parse_success',
      'json_parse_failures',
      'retry_attempts',
      'pipeline_stages',
      'semantic_cache_hits'
    ];
    
    baseMetrics.forEach(name => {
      this.metrics.set(name, new PerformanceMetric(name));
    });
  }
  
  /**
   * 记录单次事件指标
   */
  recordEvent(metricName: string, value: number = 1, metadata?: any): void {
    let metric = this.metrics.get(metricName);
    if (!metric) {
      metric = new PerformanceMetric(metricName);
      this.metrics.set(metricName, metric);
    }
    
    metric.addValue(value, metadata);
  }
  
  /**
   * 记录带时间的事件
   */
  recordTimedEvent<T>(
    metricName: string, 
    operation: () => Promise<T>, 
    metadata?: any
  ): Promise<T> {
    return new Promise(async (resolve, reject) => {
      const startTime = Date.now();
      
      try {
        const result = await operation();
        const duration = Date.now() - startTime;
        
        this.recordEvent(metricName, duration, {
          ...metadata,
          success: true,
          timestamp: startTime
        });
        
        resolve(result);
      } catch (error) {
        const duration = Date.now() - startTime;
        
        this.recordEvent(metricName, duration, {
          ...metadata,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          timestamp: startTime
        });
        
        reject(error);
      }
    });
  }
  
  /**
   * 开始计时器
   */
  startTimer(metricName: string, metadata?: any): TimerHandle {
    const startTime = Date.now();
    
    return {
      stop: () => {
        const duration = Date.now() - startTime;
        this.recordEvent(metricName, duration, {
          ...metadata,
          timestamp: startTime
        });
        return duration;
      },
      
      stopWithResult: (success: boolean, additionalMetadata?: any) => {
        const duration = Date.now() - startTime;
        this.recordEvent(metricName, duration, {
          ...metadata,
          ...additionalMetadata,
          success,
          timestamp: startTime
        });
        return duration;
      }
    };
  }
  
  /**
   * 记录系统资源使用情况
   */
  recordSystemMetrics(): void {
    const usage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // 内存指标
    this.recordEvent('memory_heap_used', usage.heapUsed, { unit: 'bytes' });
    this.recordEvent('memory_heap_total', usage.heapTotal, { unit: 'bytes' });
    this.recordEvent('memory_external', usage.external, { unit: 'bytes' });
    this.recordEvent('memory_rss', usage.rss, { unit: 'bytes' });
    
    // CPU指标
    this.recordEvent('cpu_user', cpuUsage.user, { unit: 'microseconds' });
    this.recordEvent('cpu_system', cpuUsage.system, { unit: 'microseconds' });
  }
  
  /**
   * 获取指标统计信息
   */
  getMetricStats(metricName: string): MetricStats | null {
    const metric = this.metrics.get(metricName);
    if (!metric) return null;
    
    return metric.getStats();
  }
  
  /**
   * 获取所有指标概览
   */
  getAllMetrics(): { [key: string]: MetricStats } {
    const result: { [key: string]: MetricStats } = {};
    
    for (const [name, metric] of this.metrics) {
      result[name] = metric.getStats();
    }
    
    return result;
  }
  
  /**
   * 生成性能报告
   */
  generatePerformanceReport(): string {
    const allMetrics = this.getAllMetrics();
    const systemMetrics = this.getSystemMetrics();
    
    const lines = [
      '📊 VibeDoc MCP Server 性能报告',
      '='.repeat(50),
      '',
      '🔧 核心业务指标:',
      this.formatMetricGroup({
        'API调用次数': allMetrics.api_calls,
        '缓存命中次数': allMetrics.cache_hits,
        '缓存未命中': allMetrics.cache_misses,
        '语义缓存命中': allMetrics.semantic_cache_hits,
        'JSON解析成功': allMetrics.json_parse_success,
        'JSON解析失败': allMetrics.json_parse_failures,
        '重试尝试次数': allMetrics.retry_attempts
      }),
      '',
      '⏱️ 性能指标:',
      this.formatMetricGroup({
        '平均处理时间': allMetrics.processing_time,
        '流水线阶段': allMetrics.pipeline_stages
      }),
      '',
      '💾 系统资源:',
      this.formatSystemMetrics(systemMetrics),
      '',
      '📈 缓存效率:',
      this.calculateCacheEfficiency(),
      '',
      '🎯 可靠性指标:',
      this.calculateReliabilityMetrics(),
      '',
      `📅 报告时间: ${new Date().toLocaleString()}`,
      '='.repeat(50)
    ];
    
    return lines.join('\n');
  }
  
  /**
   * 格式化指标组
   */
  private formatMetricGroup(metrics: { [key: string]: MetricStats | undefined }): string {
    const lines: string[] = [];
    
    for (const [name, stats] of Object.entries(metrics)) {
      if (!stats) continue;
      
      const avgValue = stats.count > 0 ? Math.round(stats.sum / stats.count) : 0;
      lines.push(`  • ${name}: ${stats.count}次 (平均: ${avgValue}, 最大: ${stats.max})`);
    }
    
    return lines.join('\n');
  }
  
  /**
   * 获取系统指标
   */
  private getSystemMetrics(): SystemMetrics {
    const usage = process.memoryUsage();
    
    return {
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
      external: Math.round(usage.external / 1024 / 1024), // MB
      rss: Math.round(usage.rss / 1024 / 1024), // MB
      uptime: Math.round(process.uptime()) // 秒
    };
  }
  
  /**
   * 格式化系统指标
   */
  private formatSystemMetrics(metrics: SystemMetrics): string {
    return [
      `  • 堆内存使用: ${metrics.heapUsed}MB / ${metrics.heapTotal}MB`,
      `  • 外部内存: ${metrics.external}MB`,
      `  • 总内存: ${metrics.rss}MB`,
      `  • 运行时间: ${Math.floor(metrics.uptime / 60)}分${metrics.uptime % 60}秒`
    ].join('\n');
  }
  
  /**
   * 计算缓存效率
   */
  private calculateCacheEfficiency(): string {
    const hits = this.metrics.get('cache_hits')?.getStats().count || 0;
    const misses = this.metrics.get('cache_misses')?.getStats().count || 0;
    const semanticHits = this.metrics.get('semantic_cache_hits')?.getStats().count || 0;
    
    const total = hits + misses;
    const hitRate = total > 0 ? Math.round((hits / total) * 100) : 0;
    const semanticRate = total > 0 ? Math.round((semanticHits / total) * 100) : 0;
    
    return [
      `  • 整体命中率: ${hitRate}%`,
      `  • 语义命中率: ${semanticRate}%`,
      `  • 总请求数: ${total}`
    ].join('\n');
  }
  
  /**
   * 计算可靠性指标
   */
  private calculateReliabilityMetrics(): string {
    const apiCalls = this.metrics.get('api_calls')?.getStats().count || 0;
    const retryAttempts = this.metrics.get('retry_attempts')?.getStats().count || 0;
    const jsonSuccess = this.metrics.get('json_parse_success')?.getStats().count || 0;
    const jsonFailures = this.metrics.get('json_parse_failures')?.getStats().count || 0;
    
    const retryRate = apiCalls > 0 ? Math.round((retryAttempts / apiCalls) * 100) : 0;
    const jsonSuccessRate = (jsonSuccess + jsonFailures) > 0 ? 
      Math.round((jsonSuccess / (jsonSuccess + jsonFailures)) * 100) : 0;
    
    return [
      `  • API重试率: ${retryRate}%`,
      `  • JSON解析成功率: ${jsonSuccessRate}%`,
      `  • 平均重试次数: ${apiCalls > 0 ? Math.round(retryAttempts / apiCalls * 10) / 10 : 0}`
    ].join('\n');
  }
  
  /**
   * 清理过期指标
   */
  cleanup(): void {
    const cutoffTime = Date.now() - this.METRIC_RETENTION_TIME;
    
    for (const metric of this.metrics.values()) {
      metric.cleanup(cutoffTime);
    }
  }
  
  /**
   * 重置所有指标
   */
  reset(): void {
    for (const metric of this.metrics.values()) {
      metric.reset();
    }
  }
}

// 单个性能指标类
class PerformanceMetric {
  private values: MetricValue[] = [];
  private name: string;
  
  constructor(name: string) {
    this.name = name;
  }
  
  addValue(value: number, metadata?: any): void {
    this.values.push({
      value,
      timestamp: Date.now(),
      metadata
    });
    
    // 限制历史记录数量
    if (this.values.length > 100) {
      this.values = this.values.slice(-100);
    }
  }
  
  getStats(): MetricStats {
    if (this.values.length === 0) {
      return {
        count: 0,
        sum: 0,
        average: 0,
        min: 0,
        max: 0,
        latest: 0
      };
    }
    
    const values = this.values.map(v => v.value);
    const sum = values.reduce((a, b) => a + b, 0);
    
    return {
      count: this.values.length,
      sum,
      average: Math.round(sum / this.values.length * 100) / 100,
      min: Math.min(...values),
      max: Math.max(...values),
      latest: values[values.length - 1]
    };
  }
  
  cleanup(cutoffTime: number): void {
    this.values = this.values.filter(v => v.timestamp >= cutoffTime);
  }
  
  reset(): void {
    this.values = [];
  }
}

// 类型定义
interface MetricValue {
  value: number;
  timestamp: number;
  metadata?: any;
}

interface MetricStats {
  count: number;
  sum: number;
  average: number;
  min: number;
  max: number;
  latest: number;
}

interface SystemMetrics {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  uptime: number;
}

interface TimerHandle {
  stop(): number;
  stopWithResult(success: boolean, additionalMetadata?: any): number;
}

// 全局性能监控实例
export const performanceMonitor = new PerformanceMonitor();

// 定期清理过期指标（每5分钟）
setInterval(() => {
  performanceMonitor.cleanup();
}, 5 * 60 * 1000);

// 定期收集系统指标（每30秒）
setInterval(() => {
  performanceMonitor.recordSystemMetrics();
}, 30 * 1000);