#!/usr/bin/env node

// 健壮的JSON解析器和重试机制
export class RobustJSONParser {
  private static readonly JSON_MARKERS = [
    { start: '```json', end: '```' },
    { start: '```', end: '```' },
    { start: '{', end: '}' },
    { start: '[', end: ']' }
  ];

  /**
   * 从AI响应中提取并解析JSON数据
   * @param response AI的原始响应
   * @param fallbackSchema 备用模式，当解析失败时使用
   * @param context 解析上下文，用于更好的错误处理
   * @returns 解析后的JSON对象
   */
  static parseAIResponse(response: string, fallbackSchema?: any, context?: string): any {
    const startTime = Date.now();
    
    // 第一步：清理和预处理
    const cleanResponse = this.preprocessResponse(response);
    
    // 第二步：尝试多种解析策略（按成功率排序）
    const strategies = [
      { name: 'strictJSON', func: () => this.parseStrictJSON(cleanResponse) },
      { name: 'codeBlock', func: () => this.extractFromCodeBlock(cleanResponse) },
      { name: 'braces', func: () => this.extractFromBraces(cleanResponse) },
      { name: 'array', func: () => this.extractFromArray(cleanResponse) },
      { name: 'fuzzyJSON', func: () => this.fuzzyJSONExtraction(cleanResponse) },
      { name: 'smartRepair', func: () => this.smartJSONRepair(cleanResponse) },
      { name: 'textReconstruct', func: () => this.reconstructFromText(cleanResponse) },
      { name: 'patternMatch', func: () => this.patternBasedExtraction(cleanResponse) }
    ];

    for (const strategy of strategies) {
      try {
        const result = strategy.func();
        if (result && this.validateJSONStructure(result)) {
          const duration = Date.now() - startTime;
          console.log(`✅ JSON解析成功 (策略: ${strategy.name}, 耗时: ${duration}ms)`);
          
          // 记录成功策略以便优化
          this.recordParsingStrategy(strategy.name, true, duration);
          
          return result;
        }
      } catch (error) {
        console.log(`⚠️ ${strategy.name}策略失败: ${error.message}`);
        this.recordParsingStrategy(strategy.name, false, Date.now() - startTime);
        continue;
      }
    }

    // 所有策略都失败时，使用备用方案
    const duration = Date.now() - startTime;
    console.log(`🔄 所有解析策略失败，使用备用方案 (耗时: ${duration}ms)`);
    console.log(`📝 原始响应长度: ${response.length}字符`);
    console.log(`📝 清理后响应长度: ${cleanResponse.length}字符`);
    
    return fallbackSchema || this.createEmptySchema(context);
  }

  /**
   * 预处理AI响应
   */
  private static preprocessResponse(response: string): string {
    return response
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // 移除零宽字符
      .replace(/\r\n/g, '\n') // 标准化换行符
      .replace(/\t/g, '  ') // 标准化制表符
      .replace(/[\u201C\u201D]/g, '"') // 替换中文引号
      .replace(/[\u2018\u2019]/g, "'") // 替换中文单引号
      .trim();
  }

  /**
   * 严格JSON解析 - 尝试直接解析
   */
  private static parseStrictJSON(response: string): any {
    // 尝试直接解析整个响应
    try {
      return JSON.parse(response);
    } catch (error) {
      // 尝试查找第一个完整的JSON对象或数组
      const jsonMatch = response.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      throw new Error('严格JSON解析失败');
    }
  }

  /**
   * 从代码块中提取JSON
   */
  private static extractFromCodeBlock(response: string): any {
    const patterns = [
      /```json\s*\n([\s\S]*?)\n```/g,
      /```\s*\n([\s\S]*?)\n```/g,
      /`([\s\S]*?)`/g
    ];

    for (const pattern of patterns) {
      const matches = Array.from(response.matchAll(pattern));
      for (const match of matches) {
        try {
          const jsonStr = match[1].trim();
          if (jsonStr.startsWith('{') || jsonStr.startsWith('[')) {
            return JSON.parse(jsonStr);
          }
        } catch (error) {
          continue;
        }
      }
    }
    throw new Error('无法从代码块中提取JSON');
  }

  /**
   * 从大括号中提取JSON
   */
  private static extractFromBraces(response: string): any {
    const braceStart = response.indexOf('{');
    const braceEnd = response.lastIndexOf('}');
    
    if (braceStart !== -1 && braceEnd !== -1 && braceEnd > braceStart) {
      const jsonStr = response.substring(braceStart, braceEnd + 1);
      return JSON.parse(jsonStr);
    }
    
    throw new Error('无法从大括号中提取JSON');
  }

  /**
   * 从数组中提取JSON
   */
  private static extractFromArray(response: string): any {
    const arrayStart = response.indexOf('[');
    const arrayEnd = response.lastIndexOf(']');
    
    if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
      const jsonStr = response.substring(arrayStart, arrayEnd + 1);
      return JSON.parse(jsonStr);
    }
    
    throw new Error('无法从数组中提取JSON');
  }

  /**
   * 模糊JSON提取（处理格式不完整的情况）
   */
  private static fuzzyJSONExtraction(response: string): any {
    // 尝试修复常见的JSON格式问题
    let fixed = response
      .replace(/,\s*}/g, '}') // 移除末尾逗号
      .replace(/,\s*]/g, ']') // 移除数组末尾逗号
      .replace(/:\s*,/g, ': "",') // 修复空值
      .replace(/:\s*}/g, ': ""}') // 修复对象末尾
      .replace(/(['"])?([a-zA-Z_][a-zA-Z0-9_]*)\1?:/g, '"$2":'); // 修复键名

    // 尝试解析修复后的JSON
    try {
      return JSON.parse(fixed);
    } catch (error) {
      // 如果仍然失败，尝试更激进的修复
      const lines = fixed.split('\n');
      const jsonLines = lines.filter(line => 
        line.trim().includes(':') || 
        line.trim().includes('{') || 
        line.trim().includes('}') ||
        line.trim().includes('[') ||
        line.trim().includes(']')
      );
      
      return JSON.parse(jsonLines.join('\n'));
    }
  }

  /**
   * 智能JSON修复 - 更高级的修复策略
   */
  private static smartJSONRepair(response: string): any {
    let content = response;
    
    // 第一步：移除非JSON内容
    const jsonStart = Math.max(content.indexOf('{'), content.indexOf('['));
    const jsonEnd = Math.max(content.lastIndexOf('}'), content.lastIndexOf(']'));
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      content = content.substring(jsonStart, jsonEnd + 1);
    }
    
    // 第二步：修复常见问题
    content = content
      // 修复未闭合的字符串
      .replace(/"([^"]*?)$/gm, '"$1"')
      // 修复缺失的引号
      .replace(/(\w+):/g, '"$1":')
      // 修复未转义的引号
      .replace(/(?<!\\)"/g, '\\"')
      .replace(/^\\"|\\"/g, '"')
      // 修复末尾逗号
      .replace(/,(\s*[}\]])/g, '$1')
      // 修复缺失的值
      .replace(/":\s*,/g, '": "",')
      .replace(/":\s*}/g, '": ""}');
    
    // 第三步：尝试平衡括号
    content = this.balanceBrackets(content);
    
    return JSON.parse(content);
  }

  /**
   * 基于模式的提取 - 识别特定的数据结构
   */
  private static patternBasedExtraction(response: string): any {
    const result: any = {};
    
    // 模式1：键值对（支持多种分隔符）
    const kvPatterns = [
      /"([^"]+)":\s*"([^"]*?)"/g,
      /'([^']+)':\s*'([^']*?)'/g,
      /(\w+):\s*"([^"]*?)"/g,
      /(\w+):\s*'([^']*?)'/g,
      /(\w+):\s*([^,\n}]+)/g
    ];
    
    for (const pattern of kvPatterns) {
      const matches = Array.from(response.matchAll(pattern));
      for (const match of matches) {
        const key = match[1].trim();
        let value = match[2].trim();
        
        // 类型推断
        if (value === 'true' || value === 'false') {
          result[key] = value === 'true';
        } else if (value === 'null') {
          result[key] = null;
        } else if (!isNaN(Number(value)) && value !== '') {
          result[key] = Number(value);
        } else {
          result[key] = value.replace(/['"]/g, '');
        }
      }
    }
    
    // 模式2：数组检测
    const arrayMatch = response.match(/\[\s*(.*?)\s*\]/s);
    if (arrayMatch) {
      try {
        const arrayContent = arrayMatch[1];
        const items = arrayContent.split(',').map(item => {
          item = item.trim().replace(/['"]/g, '');
          return isNaN(Number(item)) ? item : Number(item);
        });
        if (Object.keys(result).length === 0) {
          return items;
        } else {
          result._array = items;
        }
      } catch (error) {
        // 忽略数组解析错误
      }
    }
    
    if (Object.keys(result).length === 0) {
      throw new Error('无法通过模式匹配提取数据');
    }
    
    return result;
  }

  /**
   * 平衡括号 - 确保JSON括号匹配
   */
  private static balanceBrackets(content: string): string {
    const stack: string[] = [];
    const pairs: { [key: string]: string } = { '{': '}', '[': ']' };
    let result = content;
    
    // 统计括号
    for (const char of content) {
      if (char in pairs) {
        stack.push(pairs[char]);
      } else if (Object.values(pairs).includes(char)) {
        if (stack.length > 0 && stack[stack.length - 1] === char) {
          stack.pop();
        }
      }
    }
    
    // 补全缺失的结束括号
    while (stack.length > 0) {
      result += stack.pop();
    }
    
    return result;
  }

  /**
   * 记录解析策略的性能
   */
  private static recordParsingStrategy(strategy: string, success: boolean, duration: number): void {
    // 简单的内存统计，实际项目中可以存储到文件或数据库
    if (!this.parsingStats) {
      this.parsingStats = {};
    }
    
    if (!this.parsingStats[strategy]) {
      this.parsingStats[strategy] = { success: 0, failure: 0, totalDuration: 0, count: 0 };
    }
    
    const stats = this.parsingStats[strategy];
    if (success) {
      stats.success++;
    } else {
      stats.failure++;
    }
    stats.totalDuration += duration;
    stats.count++;
  }

  // 添加静态属性来存储统计信息
  private static parsingStats: { [key: string]: any } = {};

  /**
   * 从文本重构JSON（最后手段）
   */
  private static reconstructFromText(response: string): any {
    const result: any = {};
    
    // 查找键值对模式
    const keyValuePattern = /["']?([a-zA-Z_][a-zA-Z0-9_]*)["']?\s*[:：]\s*["']?([^"'\n,}]+?)["']?[,\n}]/g;
    const matches = Array.from(response.matchAll(keyValuePattern));
    
    for (const match of matches) {
      const key = match[1].trim();
      const value = match[2].trim();
      
      // 尝试解析值的类型
      if (value === 'true' || value === 'false') {
        result[key] = value === 'true';
      } else if (!isNaN(Number(value))) {
        result[key] = Number(value);
      } else {
        result[key] = value;
      }
    }
    
    if (Object.keys(result).length === 0) {
      throw new Error('无法重构JSON');
    }
    
    return result;
  }

  /**
   * 验证JSON结构
   */
  private static validateJSONStructure(obj: any): boolean {
    if (obj === null || obj === undefined) return false;
    if (typeof obj !== 'object') return false;
    
    // 检查是否为空对象
    if (Object.keys(obj).length === 0) return false;
    
    // 检查是否包含基本必需字段
    if (typeof obj === 'object' && !Array.isArray(obj)) {
      return true; // 基本对象结构有效
    }
    
    return Array.isArray(obj) && obj.length > 0;
  }

  /**
   * 创建空的备用模式
   */
  private static createEmptySchema(context?: string): any {
    return {
      error: "JSON解析失败",
      context: context || "unknown",
      fallback: true,
      generated_at: new Date().toISOString(),
      parsing_stats: this.getParsingStats()
    };
  }

  /**
   * 获取解析统计信息
   */
  static getParsingStats(): any {
    return this.parsingStats || {};
  }

  /**
   * 重置解析统计信息
   */
  static resetParsingStats(): void {
    this.parsingStats = {};
  }
}

// 智能重试机制
export class IntelligentRetryManager {
  private static readonly DEFAULT_MAX_RETRIES = 3;
  private static readonly DEFAULT_BASE_DELAY = 1000; // 1秒
  private static readonly DEFAULT_MAX_DELAY = 30000; // 30秒
  private static readonly DEFAULT_JITTER_FACTOR = 0.1; // 10%的随机延迟

  /**
   * 执行带有智能重试的API调用
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: {
      maxRetries?: number;
      baseDelay?: number;
      maxDelay?: number;
      retryCondition?: (error: any) => boolean;
      onRetry?: (attempt: number, error: any) => void;
      context?: string;
    } = {}
  ): Promise<T> {
    const {
      maxRetries = this.DEFAULT_MAX_RETRIES,
      baseDelay = this.DEFAULT_BASE_DELAY,
      maxDelay = this.DEFAULT_MAX_DELAY,
      retryCondition = this.defaultRetryCondition,
      onRetry,
      context = 'unknown'
    } = options;

    let lastError: any;
    const startTime = Date.now();
    
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        const result = await operation();
        if (attempt > 1) {
          const duration = Date.now() - startTime;
          console.log(`✅ [${context}] 第${attempt}次尝试成功 (总耗时: ${duration}ms)`);
        }
        return result;
      } catch (error) {
        lastError = error;
        
        if (attempt > maxRetries) {
          const duration = Date.now() - startTime;
          console.log(`❌ [${context}] 所有重试尝试均失败 (总耗时: ${duration}ms)`);
          throw this.enhanceError(error, attempt - 1, context);
        }
        
        if (!retryCondition(error)) {
          console.log(`🚫 [${context}] 错误不符合重试条件: ${error.message}`);
          throw this.enhanceError(error, 0, context);
        }
        
        const delay = this.calculateDelay(attempt, baseDelay, maxDelay);
        
        console.log(`🔄 [${context}] 第${attempt}次尝试失败，${delay}ms后重试: ${error.message}`);
        
        if (onRetry) {
          onRetry(attempt, error);
        }
        
        await this.delay(delay);
      }
    }
    
    throw this.enhanceError(lastError, maxRetries, context);
  }

  /**
   * 计算重试延迟（指数退避 + 抖动）
   */
  private static calculateDelay(attempt: number, baseDelay: number, maxDelay: number): number {
    // 指数退避
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    
    // 添加抖动，避免雷群效应
    const jitter = exponentialDelay * this.DEFAULT_JITTER_FACTOR * Math.random();
    
    return Math.min(exponentialDelay + jitter, maxDelay);
  }

  /**
   * 增强错误信息
   */
  private static enhanceError(error: any, retryCount: number, context: string): Error {
    const enhancedError = new Error(
      `[${context}] 操作失败 (重试${retryCount}次): ${error.message}`
    );
    enhancedError.cause = error;
    enhancedError.name = 'RetryFailedError';
    (enhancedError as any).retryCount = retryCount;
    (enhancedError as any).context = context;
    return enhancedError;
  }

  /**
   * 默认重试条件
   */
  private static defaultRetryCondition(error: any): boolean {
    // 网络错误
    if (error.code === 'ECONNRESET' || 
        error.code === 'ENOTFOUND' || 
        error.code === 'ETIMEDOUT' ||
        error.code === 'ECONNABORTED' ||
        error.code === 'ECONNREFUSED') {
      return true;
    }
    
    // HTTP 5xx错误（服务器内部错误）
    if (error.response && error.response.status >= 500 && error.response.status < 600) {
      return true;
    }
    
    // 429 Too Many Requests（限流）
    if (error.response && error.response.status === 429) {
      return true;
    }
    
    // 408 Request Timeout
    if (error.response && error.response.status === 408) {
      return true;
    }
    
    // 502, 503, 504 (Bad Gateway, Service Unavailable, Gateway Timeout)
    if (error.response && [502, 503, 504].includes(error.response.status)) {
      return true;
    }
    
    // JSON解析错误（可能是临时的格式问题）
    if (error.message && (
        error.message.includes('JSON') || 
        error.message.includes('parse') ||
        error.message.includes('Unexpected token')
      )) {
      return true;
    }
    
    // API超时相关错误
    if (error.message && (
        error.message.includes('timeout') ||
        error.message.includes('TIMEOUT') ||
        error.message.includes('timed out')
      )) {
      return true;
    }
    
    // SSL/TLS错误
    if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
        error.code === 'CERT_HAS_EXPIRED' ||
        error.code === 'SELF_SIGNED_CERT_IN_CHAIN') {
      return true;
    }
    
    // 临时DNS解析问题
    if (error.code === 'EAI_AGAIN') {
      return true;
    }
    
    return false;
  }

  /**
   * 带熔断器的重试机制
   */
  static async executeWithCircuitBreaker<T>(
    operation: () => Promise<T>,
    options: {
      maxRetries?: number;
      baseDelay?: number;
      maxDelay?: number;
      failureThreshold?: number; // 熔断阈值
      recoveryTimeout?: number; // 恢复超时
      context?: string;
    } = {}
  ): Promise<T> {
    const {
      failureThreshold = 5,
      recoveryTimeout = 60000, // 1分钟
      context = 'unknown'
    } = options;

    const circuitKey = `circuit_${context}`;
    const now = Date.now();
    
    // 检查熔断器状态
    if (this.circuitBreakers.has(circuitKey)) {
      const circuit = this.circuitBreakers.get(circuitKey)!;
      
      if (circuit.state === 'OPEN') {
        if (now - circuit.lastFailureTime < recoveryTimeout) {
          throw new Error(`[${context}] 服务熔断中，请稍后重试`);
        } else {
          // 进入半开状态
          circuit.state = 'HALF_OPEN';
          console.log(`🔄 [${context}] 熔断器进入半开状态，尝试恢复`);
        }
      }
    }

    try {
      const result = await this.executeWithRetry(operation, options);
      
      // 成功时重置熔断器
      this.circuitBreakers.delete(circuitKey);
      
      return result;
    } catch (error) {
      // 记录失败
      const circuit = this.circuitBreakers.get(circuitKey) || {
        failures: 0,
        state: 'CLOSED',
        lastFailureTime: 0
      };
      
      circuit.failures++;
      circuit.lastFailureTime = now;
      
      if (circuit.failures >= failureThreshold) {
        circuit.state = 'OPEN';
        console.log(`🚫 [${context}] 服务熔断 (失败${circuit.failures}次)`);
      }
      
      this.circuitBreakers.set(circuitKey, circuit);
      throw error;
    }
  }

  // 熔断器状态存储
  private static circuitBreakers = new Map<string, {
    failures: number;
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    lastFailureTime: number;
  }>();

  /**
   * 延迟函数
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 错误处理和用户友好化
export class ErrorHandler {
  private static readonly ERROR_MESSAGES = {
    'NETWORK_ERROR': '网络连接出现问题，请检查网络后重试',
    'API_RATE_LIMIT': 'API调用频率过高，请稍后再试',
    'JSON_PARSE_ERROR': 'AI响应格式解析失败，已使用备用方案',
    'TIMEOUT_ERROR': '处理时间过长，请尝试简化您的需求',
    'VALIDATION_ERROR': '输入数据验证失败，请检查输入格式',
    'UNKNOWN_ERROR': '系统出现未知错误，请联系技术支持'
  };

  static handleError(error: any, context?: string): string {
    const errorType = this.classifyError(error);
    const userMessage = this.ERROR_MESSAGES[errorType] || this.ERROR_MESSAGES['UNKNOWN_ERROR'];
    
    // 记录详细错误信息（用于调试）
    console.error(`[${context || 'Unknown'}] ${errorType}: ${error.message}`);
    
    return `❌ ${userMessage}`;
  }

  private static classifyError(error: any): string {
    if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      return 'NETWORK_ERROR';
    }
    
    if (error.response && error.response.status === 429) {
      return 'API_RATE_LIMIT';
    }
    
    if (error.message && error.message.includes('JSON')) {
      return 'JSON_PARSE_ERROR';
    }
    
    if (error.message && error.message.includes('timeout')) {
      return 'TIMEOUT_ERROR';
    }
    
    if (error.message && error.message.includes('validation')) {
      return 'VALIDATION_ERROR';
    }
    
    return 'UNKNOWN_ERROR';
  }
}