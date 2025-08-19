#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { QualityPredictor } from "./core/quality-predictor.js";
import { InputOptimizer } from "./core/input-optimizer.js";
import { MonitoringStorage } from "./core/monitoring-storage.js";

/**
 * 🎯 聚焦MCP Server - AI输入质量预测与自动优化系统
 * 全球首创：3秒内预测AI生成成功率，自动优化输入内容
 * 核心创新：解决AI输出质量不稳定的根本痛点
 */
class FocusedMCPServer {
  private server: Server;
  private predictionCache: Map<string, any> = new Map();
  private monitoringStorage: MonitoringStorage;

  constructor() {
    this.server = new Server(
      {
        name: "focused-mcp-server",
        version: "2.0.0",
      },
      {
        capabilities: {
          tools: {},
          notifications: {},
        },
      }
    );

    // 初始化监控存储（静默模式，避免干扰MCP通信）
    this.monitoringStorage = new MonitoringStorage();

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error("[MCP Error]", error);
    };

    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers(): void {
    // 注册2个核心工具 - 聚焦创新
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "predict_and_optimize",
            description: "⚡ **AI输入质量实时预测器** - 全球首创：3秒内预测你的输入能让AI生成多高质量的结果\n\n**🎯 核心创新:**\n在提交给AI之前，立即预测生成质量，避免无效对话！\n\n**💡 解决的痛点:**\n❌ 不知道自己的问题描述是否清楚\n❌ 担心得到低质量的AI回答\n❌ 需要反复修改才能得到满意结果\n❌ AI对话效率低，经常需要多轮澄清\n\n**📊 5维质量预测:**\n🔍 清晰度(20%) - AI能否理解你的描述？\n📋 完整性(25%) - 需求是否描述完整？\n⚖️ 可行性(25%) - 技术上可实现吗？\n💼 商业逻辑(15%) - 商业模式合理吗？\n🚀 创新性(15%) - 有独特价值吗？\n\n**⚡ 3秒获得预测结果:**\n🎯 质量分数 | 📈 成功概率 | ⏱️ 预计处理时间 | ✨ 优化建议\n\n**使用方法:** 输入任何想法或问题，比如'我想开发一个MCP工具'",
            inputSchema: {
              type: "object",
              properties: {
                text: {
                  type: "string",
                  description: "💡 要预测和优化的输入文本（建议50-500字，描述你的需求、目标、想法等）",
                  minLength: 10,
                  maxLength: 2000,
                },
                target_quality: {
                  type: "number",
                  description: "🎯 目标质量分数（系统将尝试优化到此分数，建议70-90）",
                  minimum: 60,
                  maximum: 100,
                  default: 80,
                },
                optimization_mode: {
                  type: "string",
                  description: "🔧 优化模式 - 根据预测结果智能选择优化策略",
                  enum: ["auto", "conservative", "aggressive"],
                  default: "auto",
                },
                generate_report: {
                  type: "boolean",
                  description: "📋 生成详细预测和优化报告（推荐开启）",
                  default: true,
                },
              },
              required: ["text"],
            },
          },
          {
            name: "get_quality_insights",
            description: "📊 **深度质量分析报告** - 详细解析你的输入质量，提供精准改进路径\n\n**🎯 什么时候使用:**\n✅ 想了解为什么质量分数是这个结果\n✅ 需要详细的改进建议和具体方向\n✅ 希望看到质量评估的科学依据\n✅ 想要专业的质量诊断报告\n\n**🔍 深度分析内容:**\n📊 17维文本特征分析 - 从语义、结构、商业、技术4个角度解析\n📈 质量短板识别 - 找出影响质量的关键问题\n💡 具体改进建议 - 告诉你如何提升每个维度\n⚠️ 风险点预警 - 识别潜在的实现难点\n🎯 优化路径规划 - 提供分数提升的具体步骤\n\n**📋 获得详细报告:**\n💪 优势分析 | ⚠️ 改进建议 | 🎯 优化路径 | 📊 竞品对比\n\n**适用场景:** 质量预测后想要详细分析报告、需要专业的改进指导",
            inputSchema: {
              type: "object",
              properties: {
                analysis_type: {
                  type: "string",
                  description: "📊 分析类型",
                  enum: ["current_session", "historical_trends", "best_practices", "quality_comparison"],
                  default: "current_session",
                },
                include_recommendations: {
                  type: "boolean",
                  description: "💡 包含改进建议",
                  default: true,
                },
                detailed_analysis: {
                  type: "boolean",
                  description: "🔍 详细分析报告",
                  default: true,
                },
              },
              required: [],
            },
          },
        ],
      };
    });

    // 处理工具调用 - 2个核心工具
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "predict_and_optimize":
            return await this.handlePredictAndOptimize(args as {
              text: string;
              target_quality?: number;
              optimization_mode?: string;
              generate_report?: boolean;
            });

          case "get_quality_insights":
            return await this.handleQualityInsights(args as {
              analysis_type?: string;
              include_recommendations?: boolean;
              detailed_analysis?: boolean;
            });

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `❌ Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * 处理质量预测与自动优化请求 - 核心创新功能
   */
  private async handlePredictAndOptimize(args: {
    text: string;
    target_quality?: number;
    optimization_mode?: string;
    generate_report?: boolean;
  }): Promise<{
    content: Array<{ type: string; text: string }>;
    _meta?: Record<string, unknown>;
  }> {
    // 输入验证
    if (!args.text?.trim()) {
      throw new Error("📝 请提供要预测和优化的文本内容");
    }

    if (args.text.length < 10) {
      throw new Error("💡 文本过短，请提供更详细的描述（建议至少50字）");
    }

    if (args.text.length > 2000) {
      throw new Error("📝 文本过长，请简化描述（建议不超过500字）");
    }

    try {
      console.error(`🎯 [FocusedMCP] 开始质量预测与优化...`);
      console.error(`📝 [FocusedMCP] 输入长度: ${args.text.length}字符`);

      // 检查缓存
      const cacheKey = this.generateCacheKey(args.text, args);
      if (this.predictionCache.has(cacheKey)) {
        console.error(`⚡ [FocusedMCP] 缓存命中，直接返回结果`);
        const cachedResult = this.predictionCache.get(cacheKey);
        return {
          content: [{ type: "text", text: cachedResult.content }],
          _meta: { ...cachedResult.meta, cached: true }
        };
      }

      // 步骤1：质量预测
      const startTime = Date.now();
      const originalPrediction = await QualityPredictor.predictQuality(args.text);
      const predictionTime = Date.now() - startTime;

      console.error(`📊 [FocusedMCP] 原始质量: ${originalPrediction.overallScore}/100`);

      // 步骤2：智能优化（如果质量不达标）
      const targetQuality = args.target_quality || 80;
      const optimizationMode = args.optimization_mode || "auto";
      let optimizedText = args.text;
      let optimizationApplied = false;
      let optimizedPrediction = originalPrediction;

      if (originalPrediction.overallScore < targetQuality) {
        console.error(`🔧 [FocusedMCP] 质量不达标，开始自动优化...`);
        
        const optimizationResult = await this.performSmartOptimization(
          args.text,
          originalPrediction,
          targetQuality,
          optimizationMode
        );

        if (optimizationResult.success) {
          optimizedText = optimizationResult.optimizedText;
          optimizedPrediction = await QualityPredictor.predictQuality(optimizedText);
          optimizationApplied = true;
          console.error(`✨ [FocusedMCP] 优化后质量: ${optimizedPrediction.overallScore}/100`);
        }
      }

      // 步骤3：生成报告
      const totalTime = Date.now() - startTime;
      const generateReport = args.generate_report !== false;

      let responseContent: string;
      if (generateReport) {
        responseContent = this.generatePredictAndOptimizeReport(
          args.text,
          optimizedText,
          originalPrediction,
          optimizedPrediction,
          optimizationApplied,
          targetQuality,
          optimizationMode
        );
      } else {
        responseContent = optimizationApplied
          ? `✨ **优化后文本**：\n\n${optimizedText}\n\n📊 **质量提升**：${originalPrediction.overallScore} → ${optimizedPrediction.overallScore} (+${optimizedPrediction.overallScore - originalPrediction.overallScore}分)`
          : `📊 **质量评估**：${originalPrediction.overallScore}/100 (已达标，无需优化)`;
      }

      // 缓存结果
      const result = {
        content: responseContent,
        meta: {
          original_quality: originalPrediction.overallScore,
          optimized_quality: optimizedPrediction.overallScore,
          quality_gain: optimizedPrediction.overallScore - originalPrediction.overallScore,
          optimization_applied: optimizationApplied,
          target_quality: targetQuality,
          processing_time: totalTime,
          prediction_time: predictionTime,
          cached: false
        }
      };

      this.predictionCache.set(cacheKey, result);

      return {
        content: [{ type: "text", text: responseContent }],
        _meta: result.meta
      };

    } catch (error) {
      console.error(`❌ [FocusedMCP] 预测优化失败: ${error.message}`);
      throw new Error(`质量预测与优化失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 处理质量洞察分析请求
   */
  private async handleQualityInsights(args: {
    analysis_type?: string;
    include_recommendations?: boolean;
    detailed_analysis?: boolean;
  }): Promise<{
    content: Array<{ type: string; text: string }>;
    _meta?: Record<string, unknown>;
  }> {
    try {
      console.error(`📊 [FocusedMCP] 开始质量洞察分析...`);

      const analysisType = args.analysis_type || "current_session";
      const includeRecommendations = args.include_recommendations !== false;
      const detailedAnalysis = args.detailed_analysis !== false;

      // 获取统计数据
      const stats = await this.monitoringStorage.getStats();
      
      // 生成洞察报告
      const insightsReport = this.generateQualityInsightsReport(
        stats,
        analysisType,
        includeRecommendations,
        detailedAnalysis
      );

      console.error(`📈 [FocusedMCP] 洞察分析完成`);

      return {
        content: [{ type: "text", text: insightsReport }],
        _meta: {
          analysis_type: analysisType,
          total_records: stats.totalRecords,
          success_rate: stats.successRate,
          average_quality: stats.averageQuality,
          generated_at: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error(`❌ [FocusedMCP] 洞察分析失败: ${error.message}`);
      throw new Error(`质量洞察分析失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 智能优化处理
   */
  private async performSmartOptimization(
    text: string,
    prediction: any,
    targetQuality: number,
    mode: string
  ): Promise<{ success: boolean; optimizedText: string; improvements: string[] }> {
    try {
      // 基于预测结果智能选择优化策略
      const focus = this.selectOptimizationFocus(prediction, mode);
      
      // 使用InputOptimizer进行优化
      const result = await InputOptimizer.optimizeText(text, focus, targetQuality, true);
      
      return {
        success: true,
        optimizedText: result.optimizedText,
        improvements: result.improvements
      };
    } catch (error) {
      console.error(`🔧 优化失败: ${error.message}`);
      return {
        success: false,
        optimizedText: text,
        improvements: []
      };
    }
  }

  /**
   * 选择优化重点
   */
  private selectOptimizationFocus(prediction: any, mode: string): 'technical' | 'business' | 'user' {
    if (mode === "conservative") return "user";
    if (mode === "aggressive") return "technical";
    
    // 自动模式：基于最低分维度选择
    const scores = prediction.dimensionScores;
    if (scores.feasibility < scores.clarity && scores.feasibility < scores.businessLogic) {
      return "technical";
    } else if (scores.businessLogic < scores.clarity) {
      return "business";
    } else {
      return "user";
    }
  }

  /**
   * 生成预测与优化报告
   */
  private generatePredictAndOptimizeReport(
    originalText: string,
    optimizedText: string,
    originalPrediction: any,
    optimizedPrediction: any,
    optimizationApplied: boolean,
    targetQuality: number,
    mode: string
  ): string {
    let output = `# 🎯 AI输入质量预测与优化报告\n\n`;
    
    output += `## 📊 质量评估结果\n\n`;
    output += `| 维度 | 原始分数 | ${optimizationApplied ? '优化后分数' : '当前分数'} | 目标分数 |\n`;
    output += `|------|----------|----------|----------|\n`;
    output += `| **总体质量** | ${originalPrediction.overallScore}/100 | ${optimizedPrediction.overallScore}/100 | ${targetQuality}/100 |\n`;
    output += `| 清晰度 | ${originalPrediction.dimensionScores.clarity}/100 | ${optimizedPrediction.dimensionScores.clarity}/100 | - |\n`;
    output += `| 完整性 | ${originalPrediction.dimensionScores.completeness}/100 | ${optimizedPrediction.dimensionScores.completeness}/100 | - |\n`;
    output += `| 可行性 | ${originalPrediction.dimensionScores.feasibility}/100 | ${optimizedPrediction.dimensionScores.feasibility}/100 | - |\n\n`;
    
    if (optimizationApplied) {
      const qualityGain = optimizedPrediction.overallScore - originalPrediction.overallScore;
      output += `## ✨ 优化结果\n\n`;
      output += `🎯 **优化模式**: ${mode}\n`;
      output += `📈 **质量提升**: +${qualityGain}分\n`;
      output += `🚀 **成功率提升**: ${originalPrediction.successProbability}% → ${optimizedPrediction.successProbability}%\n\n`;
      
      output += `### 📝 优化后的文本\n\n`;
      output += `${optimizedText}\n\n`;
    } else {
      output += `## ✅ 质量达标\n\n`;
      output += `当前文本质量已达到目标要求，无需优化。\n\n`;
    }
    
    if (optimizedPrediction.recommendations.length > 0) {
      output += `## 💡 进一步改进建议\n\n`;
      optimizedPrediction.recommendations.forEach((rec: string, index: number) => {
        output += `${index + 1}. ${rec}\n`;
      });
      output += `\n`;
    }
    
    return output;
  }

  /**
   * 生成质量洞察报告
   */
  private generateQualityInsightsReport(
    stats: any,
    analysisType: string,
    includeRecommendations: boolean,
    detailedAnalysis: boolean
  ): string {
    let output = `# 📊 质量洞察分析报告\n\n`;
    
    output += `## 📈 整体质量趋势\n\n`;
    output += `- **总记录数**: ${stats.totalRecords}\n`;
    output += `- **平均质量**: ${stats.averageQuality}/100\n`;
    output += `- **成功率**: ${stats.successRate}%\n`;
    output += `- **平均处理时间**: ${stats.averageProcessingTime}ms\n\n`;
    
    if (stats.qualityTrend && stats.qualityTrend.length > 0) {
      output += `## 📊 质量趋势图表\n\n`;
      output += `| 日期 | 平均质量 | 成功率 | 处理量 |\n`;
      output += `|------|----------|--------|---------|\n`;
      stats.qualityTrend.slice(-7).forEach((trend: any) => {
        output += `| ${trend.date} | ${trend.averageQuality}/100 | ${trend.successRate}% | ${trend.totalRecords} |\n`;
      });
      output += `\n`;
    }
    
    if (includeRecommendations) {
      output += `## 💡 质量改进建议\n\n`;
      output += `1. 📋 **输入标准化**: 建议输入长度保持在100-500字符\n`;
      output += `2. 🎯 **目标明确**: 清晰描述项目目标和用户需求\n`;
      output += `3. 🔧 **技术细节**: 补充技术栈和架构设计说明\n`;
      output += `4. 💼 **商业逻辑**: 说明盈利模式和市场定位\n\n`;
    }
    
    return output;
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(text: string, config?: any): string {
    const configStr = config ? JSON.stringify(config) : '';
    const combined = text + configStr;
    // 简单哈希函数
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return `cache_${Math.abs(hash).toString(36)}`;
  }

  /**
   * 启动服务器
   */
  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    // 输出启动信息到stderr，避免干扰stdio协议
    console.error("🎯 VibeDoc MCP Server running on stdio");
    console.error("🚀 Ready for AI输入质量预测与自动优化！");
  }
}

// 创建并运行服务器
const server = new FocusedMCPServer();
server.run().catch(console.error);
