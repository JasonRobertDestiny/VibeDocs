#!/usr/bin/env node

import { QualityPredictor, QualityPrediction } from './quality-predictor.js';

/**
 * AI规划结果接口
 */
export interface AIPlanningResult {
  success: boolean;
  content?: string;
  metadata?: {
    model: string;
    processingTime: number;
    tokenUsage?: number;
    qualityScore?: number;
  };
  error?: string;
  retryCount?: number;
}

/**
 * AI规划配置接口
 */
export interface AIPlanningConfig {
  model: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
  maxRetries: number;
  qualityThreshold: number; // 最低质量要求
}

/**
 * AI规划调用器 - 集成外部AI服务生成开发规划
 */
export class AIPlanner {
  private static readonly DEFAULT_CONFIG: AIPlanningConfig = {
    model: 'Qwen/Qwen2.5-72B-Instruct',
    maxTokens: 4096,
    temperature: 0.3,
    timeout: 30000,
    maxRetries: 3,
    qualityThreshold: 70
  };

  private static readonly API_ENDPOINT = 'https://api.siliconflow.cn/v1/chat/completions';

  /**
   * 生成AI开发规划
   */
  static async generatePlan(
    optimizedInput: string,
    apiKey: string,
    config: Partial<AIPlanningConfig> = {}
  ): Promise<AIPlanningResult> {
    const fullConfig = { ...this.DEFAULT_CONFIG, ...config };
    let retryCount = 0;

    while (retryCount <= fullConfig.maxRetries) {
      try {
        // console.error(`🤖 [AIPlanner] 开始生成规划 (尝试 ${retryCount + 1}/${fullConfig.maxRetries + 1})`);
        
        const startTime = Date.now();
        const result = await this.callAIService(optimizedInput, apiKey, fullConfig);
        const processingTime = Date.now() - startTime;

        if (result.success && result.content) {
          // 评估生成结果的质量
          const qualityScore = await this.evaluateResultQuality(result.content);
          
          // console.error(`📊 [AIPlanner] 生成质量: ${qualityScore}/100`);

          // 检查质量是否达标
          if (qualityScore >= fullConfig.qualityThreshold) {
            // console.error(`✅ [AIPlanner] 规划生成成功，质量达标`);
            return {
              success: true,
              content: result.content,
              metadata: {
                model: fullConfig.model,
                processingTime,
                qualityScore,
                tokenUsage: result.metadata?.tokenUsage
              },
              retryCount
            };
          } else {
            // console.error(`⚠️ [AIPlanner] 质量不达标 (${qualityScore}/${fullConfig.qualityThreshold})，准备重试`);
            retryCount++;
            continue;
          }
        } else {
          throw new Error(result.error || 'AI服务调用失败');
        }

      } catch (error) {
        retryCount++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        // console.error(`❌ [AIPlanner] 生成失败 (尝试 ${retryCount}): ${errorMessage}`);

        if (retryCount > fullConfig.maxRetries) {
          return {
            success: false,
            error: `AI规划生成失败，已重试${fullConfig.maxRetries}次: ${errorMessage}`,
            retryCount: retryCount - 1
          };
        }

        // 重试前等待
        await this.delay(1000 * retryCount);
      }
    }

    return {
      success: false,
      error: '达到最大重试次数',
      retryCount
    };
  }

  /**
   * 调用AI服务
   */
  private static async callAIService(
    input: string,
    apiKey: string,
    config: AIPlanningConfig
  ): Promise<AIPlanningResult> {
    const prompt = this.buildPlanningPrompt(input);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    try {
      const response = await fetch(this.API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            {
              role: 'system',
              content: '你是一个专业的产品经理和技术架构师，擅长将创意转化为详细的开发规划。请生成结构化、可执行的开发计划。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: config.temperature,
          max_tokens: config.maxTokens,
          stream: false
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`AI API调用失败: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('AI服务返回空内容');
      }

      return {
        success: true,
        content,
        metadata: {
          model: config.model,
          processingTime: 0, // 将在上层计算
          tokenUsage: data.usage?.total_tokens
        }
      };

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`AI服务调用超时 (${config.timeout}ms)`);
      }
      
      throw error;
    }
  }

  /**
   * 构建规划提示词
   */
  private static buildPlanningPrompt(input: string): string {
    return `请基于以下项目描述，生成一个详细的开发规划：

${input}

请按照以下结构生成开发规划：

## 项目概述
- 项目名称
- 核心价值主张
- 目标用户群体

## 功能规划
- 核心功能列表
- 功能优先级
- MVP功能范围

## 技术方案
- 技术架构设计
- 技术栈选择
- 数据库设计
- API设计

## 开发计划
- 开发阶段划分
- 时间节点安排
- 人力资源需求
- 风险评估

## 商业规划
- 商业模式
- 市场分析
- 竞争策略
- 盈利预期

请确保规划内容具体、可执行，包含足够的技术和商业细节。`;
  }

  /**
   * 评估生成结果质量
   */
  private static async evaluateResultQuality(content: string): Promise<number> {
    try {
      const prediction = await QualityPredictor.predictQuality(content);
      return prediction.overallScore;
    } catch (error) {
      // console.error(`⚠️ [AIPlanner] 质量评估失败: ${error.message}`);
      // 如果质量评估失败，使用简单的启发式方法
      return this.simpleQualityCheck(content);
    }
  }

  /**
   * 简单质量检查（备用方法）
   */
  private static simpleQualityCheck(content: string): number {
    let score = 50; // 基础分

    // 长度检查
    if (content.length > 500) score += 10;
    if (content.length > 1000) score += 10;

    // 结构检查
    const sections = content.split(/##|\n\n/).length;
    score += Math.min(sections * 3, 20);

    // 关键词检查
    const keywords = ['功能', '技术', '架构', '开发', '商业', '用户', '市场'];
    const keywordCount = keywords.filter(keyword => content.includes(keyword)).length;
    score += keywordCount * 2;

    return Math.min(score, 100);
  }

  /**
   * 延迟函数
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 批量生成规划（用于A/B测试）
   */
  static async generateMultiplePlans(
    inputs: string[],
    apiKey: string,
    config: Partial<AIPlanningConfig> = {}
  ): Promise<AIPlanningResult[]> {
    const results: AIPlanningResult[] = [];

    for (const input of inputs) {
      const result = await this.generatePlan(input, apiKey, config);
      results.push(result);
      
      // 避免API限流
      await this.delay(1000);
    }

    return results;
  }

  /**
   * 智能重试策略
   */
  static async generatePlanWithSmartRetry(
    optimizedInput: string,
    apiKey: string,
    originalPrediction: QualityPrediction,
    config: Partial<AIPlanningConfig> = {}
  ): Promise<AIPlanningResult> {
    const fullConfig = { ...this.DEFAULT_CONFIG, ...config };
    
    // 根据输入质量调整配置
    if (originalPrediction.overallScore < 60) {
      // 低质量输入，降低期望
      fullConfig.qualityThreshold = Math.max(50, originalPrediction.overallScore - 10);
      fullConfig.maxRetries = 2;
    } else if (originalPrediction.overallScore > 85) {
      // 高质量输入，提高期望
      fullConfig.qualityThreshold = Math.min(90, originalPrediction.overallScore + 5);
      fullConfig.maxRetries = 1;
    }

    // console.error(`🎯 [AIPlanner] 智能重试策略: 质量阈值${fullConfig.qualityThreshold}, 最大重试${fullConfig.maxRetries}次`);

    return await this.generatePlan(optimizedInput, apiKey, fullConfig);
  }

  /**
   * 生成规划统计报告
   */
  static generatePlanningReport(results: AIPlanningResult[]): string {
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;
    const avgProcessingTime = results
      .filter(r => r.success && r.metadata?.processingTime)
      .reduce((sum, r) => sum + (r.metadata?.processingTime || 0), 0) / successCount;
    const avgQuality = results
      .filter(r => r.success && r.metadata?.qualityScore)
      .reduce((sum, r) => sum + (r.metadata?.qualityScore || 0), 0) / successCount;
    const totalRetries = results.reduce((sum, r) => sum + (r.retryCount || 0), 0);

    let report = `# 🤖 AI规划生成报告\n\n`;
    
    report += `## 📊 生成统计\n\n`;
    report += `- **总生成次数**: ${results.length}\n`;
    report += `- **成功次数**: ${successCount} (${Math.round(successCount / results.length * 100)}%)\n`;
    report += `- **失败次数**: ${failureCount}\n`;
    report += `- **总重试次数**: ${totalRetries}\n`;
    report += `- **平均处理时间**: ${Math.round(avgProcessingTime)}ms\n`;
    report += `- **平均质量分数**: ${Math.round(avgQuality)}/100\n\n`;

    if (failureCount > 0) {
      report += `## ❌ 失败原因分析\n\n`;
      const failedResults = results.filter(r => !r.success);
      const errorTypes = new Map<string, number>();
      
      failedResults.forEach(result => {
        const errorType = result.error?.split(':')[0] || '未知错误';
        errorTypes.set(errorType, (errorTypes.get(errorType) || 0) + 1);
      });

      errorTypes.forEach((count, errorType) => {
        report += `- **${errorType}**: ${count}次\n`;
      });
      report += `\n`;
    }

    report += `## 💡 优化建议\n\n`;
    if (successCount / results.length < 0.8) {
      report += `- 成功率较低，建议检查输入质量或调整质量阈值\n`;
    }
    if (avgProcessingTime > 20000) {
      report += `- 处理时间较长，建议优化提示词或降低token限制\n`;
    }
    if (totalRetries / results.length > 1) {
      report += `- 重试次数较多，建议调整质量阈值或优化输入\n`;
    }

    return report;
  }
}

export default AIPlanner;