#!/usr/bin/env node

import { QualityPredictor, QualityPrediction } from './quality-predictor.js';
import { TextAnalyzer, TextFeatures } from './text-analyzer.js';

/**
 * 结果评估指标接口
 */
export interface ResultEvaluation {
  overallScore: number;           // 总体质量分数
  completenessScore: number;      // 完整性分数
  feasibilityScore: number;       // 可行性分数
  clarityScore: number;          // 清晰度分数
  innovationScore: number;       // 创新性分数
  marketViabilityScore: number;  // 市场可行性分数
  
  // 详细分析
  strengths: string[];           // 优势
  weaknesses: string[];          // 不足
  recommendations: string[];     // 改进建议
  
  // 对比分析
  qualityGap?: number;          // 与预期的质量差距
  improvementAreas: string[];   // 需要改进的领域
  
  // 元数据
  evaluatedAt: string;
  evaluationTime: number;
  confidence: number;           // 评估置信度
}

/**
 * 评估配置接口
 */
export interface EvaluationConfig {
  strictMode: boolean;          // 严格模式
  focusAreas: string[];        // 关注领域
  minimumLength: number;       // 最小长度要求
  requireStructure: boolean;   // 要求结构化
  checkFeasibility: boolean;   // 检查可行性
}

/**
 * 结果质量评估器 - 评估AI生成规划的实际质量
 */
export class ResultEvaluator {
  private static readonly DEFAULT_CONFIG: EvaluationConfig = {
    strictMode: false,
    focusAreas: ['completeness', 'feasibility', 'clarity', 'innovation', 'market'],
    minimumLength: 200,
    requireStructure: true,
    checkFeasibility: true
  };

  // 完整性检查关键词
  private static readonly COMPLETENESS_KEYWORDS = {
    projectOverview: ['项目', '概述', '介绍', '背景', '目标'],
    features: ['功能', '特性', '模块', '组件', '服务'],
    technology: ['技术', '架构', '框架', '数据库', '部署'],
    business: ['商业', '盈利', '市场', '用户', '竞争'],
    timeline: ['时间', '计划', '阶段', '里程碑', '周期'],
    resources: ['资源', '团队', '人员', '预算', '成本']
  };

  // 可行性检查模式
  private static readonly FEASIBILITY_PATTERNS = {
    unrealistic: [
      /一周内|几天内|立即|马上/,
      /全球|世界级|颠覆性|革命性/,
      /零成本|免费|无限/,
      /100%|完美|绝对/
    ],
    risky: [
      /AI|人工智能|机器学习|区块链/,
      /大数据|云计算|物联网/,
      /创新|前沿|尖端/
    ]
  };

  /**
   * 评估AI生成结果的质量
   */
  static async evaluateResult(
    generatedContent: string,
    originalInput?: string,
    expectedQuality?: number,
    config: Partial<EvaluationConfig> = {}
  ): Promise<ResultEvaluation> {
    const fullConfig = { ...this.DEFAULT_CONFIG, ...config };
    const startTime = Date.now();

    try {
      // console.error(`🔍 [ResultEvaluator] 开始结果质量评估...`);

      // 1. 基础特征提取
      const features = TextAnalyzer.extractFeatures(generatedContent);
      
      // 2. 使用质量预测器进行基础评估
      const basePrediction = await QualityPredictor.predictQuality(generatedContent);

      // 3. 专项评估
      const completenessScore = this.evaluateCompleteness(generatedContent, features);
      const feasibilityScore = this.evaluateFeasibility(generatedContent, features);
      const clarityScore = this.evaluateClarity(generatedContent, features);
      const innovationScore = this.evaluateInnovation(generatedContent, features);
      const marketViabilityScore = this.evaluateMarketViability(generatedContent, features);

      // 4. 计算总体分数
      const overallScore = this.calculateOverallScore({
        completenessScore,
        feasibilityScore,
        clarityScore,
        innovationScore,
        marketViabilityScore
      });

      // 5. 分析优势和不足
      const { strengths, weaknesses } = this.analyzeStrengthsWeaknesses({
        completenessScore,
        feasibilityScore,
        clarityScore,
        innovationScore,
        marketViabilityScore
      });

      // 6. 生成改进建议
      const recommendations = this.generateRecommendations(
        generatedContent,
        features,
        { completenessScore, feasibilityScore, clarityScore, innovationScore, marketViabilityScore }
      );

      // 7. 对比分析
      const qualityGap = expectedQuality ? overallScore - expectedQuality : undefined;
      const improvementAreas = this.identifyImprovementAreas({
        completenessScore,
        feasibilityScore,
        clarityScore,
        innovationScore,
        marketViabilityScore
      });

      // 8. 计算置信度
      const confidence = this.calculateConfidence(features, overallScore);

      const evaluationTime = Date.now() - startTime;
      // console.error(`✅ [ResultEvaluator] 评估完成: ${overallScore}/100 (${evaluationTime}ms)`);

      return {
        overallScore: Math.round(overallScore),
        completenessScore: Math.round(completenessScore),
        feasibilityScore: Math.round(feasibilityScore),
        clarityScore: Math.round(clarityScore),
        innovationScore: Math.round(innovationScore),
        marketViabilityScore: Math.round(marketViabilityScore),
        strengths,
        weaknesses,
        recommendations,
        qualityGap: qualityGap ? Math.round(qualityGap) : undefined,
        improvementAreas,
        evaluatedAt: new Date().toISOString(),
        evaluationTime,
        confidence: Math.round(confidence)
      };

    } catch (error) {
      // console.error(`❌ [ResultEvaluator] 评估失败: ${error.message}`);
      throw new Error(`结果质量评估失败: ${error.message}`);
    }
  }

  /**
   * 评估完整性
   */
  private static evaluateCompleteness(content: string, features: TextFeatures): number {
    let score = 30; // 基础分

    // 检查各个关键领域的覆盖情况
    Object.entries(this.COMPLETENESS_KEYWORDS).forEach(([area, keywords]) => {
      const covered = keywords.some(keyword => content.includes(keyword));
      if (covered) {
        score += 12; // 每个领域12分，总共72分
      }
    });

    // 长度奖励
    if (content.length > 500) score += 5;
    if (content.length > 1000) score += 5;
    if (content.length > 2000) score += 5;

    // 结构化奖励
    const sections = content.split(/##|###|\n\n/).length;
    if (sections > 5) score += 10;

    return Math.min(score, 100);
  }

  /**
   * 评估可行性
   */
  private static evaluateFeasibility(content: string, features: TextFeatures): number {
    let score = 80; // 默认较高，发现问题才减分

    // 检查不现实的表述
    this.FEASIBILITY_PATTERNS.unrealistic.forEach(pattern => {
      if (pattern.test(content)) {
        score -= 15;
      }
    });

    // 检查高风险技术
    let riskCount = 0;
    this.FEASIBILITY_PATTERNS.risky.forEach(pattern => {
      if (pattern.test(content)) {
        riskCount++;
      }
    });

    if (riskCount > 3) {
      score -= 20; // 技术风险过高
    } else if (riskCount > 1) {
      score -= 10;
    }

    // 检查时间规划合理性
    const timePatterns = /(\d+)(天|周|月|年)/g;
    const timeMatches = content.match(timePatterns);
    if (timeMatches) {
      const hasReasonableTimeline = timeMatches.some(match => {
        const num = parseInt(match);
        return num >= 3; // 至少3个时间单位
      });
      if (!hasReasonableTimeline) {
        score -= 10;
      }
    }

    // 资源评估
    const resourceKeywords = ['团队', '人员', '预算', '成本', '资金'];
    const hasResourcePlanning = resourceKeywords.some(keyword => content.includes(keyword));
    if (!hasResourcePlanning) {
      score -= 10;
    }

    return Math.max(score, 20);
  }

  /**
   * 评估清晰度
   */
  private static evaluateClarity(content: string, features: TextFeatures): number {
    let score = 50; // 基础分

    // 结构清晰度
    const hasHeaders = /##|###/.test(content);
    if (hasHeaders) score += 15;

    const hasList = /[-*]\s|^\d+\.\s/m.test(content);
    if (hasList) score += 10;

    // 语言清晰度
    const avgSentenceLength = features.avgWordsPerSentence;
    if (avgSentenceLength >= 10 && avgSentenceLength <= 25) {
      score += 15;
    } else if (avgSentenceLength < 5 || avgSentenceLength > 40) {
      score -= 10;
    }

    // 专业术语使用
    const techTerms = features.keywordDensity.technical;
    if (techTerms > 2 && techTerms < 8) {
      score += 10;
    }

    // 逻辑连接
    if (features.complexity.logicalConnectorCount > 0) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  /**
   * 评估创新性
   */
  private static evaluateInnovation(content: string, features: TextFeatures): number {
    let score = 40; // 基础分

    // 技术创新
    const innovativeTech = ['AI', '人工智能', '机器学习', '区块链', '物联网', '大数据'];
    const techInnovationCount = innovativeTech.filter(tech => content.includes(tech)).length;
    score += Math.min(techInnovationCount * 8, 25);

    // 商业模式创新
    const businessInnovation = ['平台', '生态', '共享', '订阅', '免费增值', 'SaaS'];
    const businessInnovationCount = businessInnovation.filter(model => content.includes(model)).length;
    score += Math.min(businessInnovationCount * 6, 20);

    // 用户体验创新
    const uxInnovation = ['个性化', '智能推荐', '自动化', '一键', '零配置'];
    const uxInnovationCount = uxInnovation.filter(ux => content.includes(ux)).length;
    score += Math.min(uxInnovationCount * 5, 15);

    return Math.min(score, 100);
  }

  /**
   * 评估市场可行性
   */
  private static evaluateMarketViability(content: string, features: TextFeatures): number {
    let score = 50; // 基础分

    // 市场分析
    const marketKeywords = ['市场', '用户', '需求', '竞争', '目标'];
    const marketCoverage = marketKeywords.filter(keyword => content.includes(keyword)).length;
    score += marketCoverage * 8;

    // 商业模式
    const businessKeywords = ['盈利', '收入', '商业模式', '付费', '订阅'];
    const businessCoverage = businessKeywords.filter(keyword => content.includes(keyword)).length;
    score += businessCoverage * 6;

    // 数据支撑
    const hasNumbers = /\d+/.test(content);
    if (hasNumbers) score += 10;

    return Math.min(score, 100);
  }

  /**
   * 计算总体分数
   */
  private static calculateOverallScore(scores: {
    completenessScore: number;
    feasibilityScore: number;
    clarityScore: number;
    innovationScore: number;
    marketViabilityScore: number;
  }): number {
    const weights = {
      completeness: 0.30,
      feasibility: 0.25,
      clarity: 0.20,
      innovation: 0.15,
      marketViability: 0.10
    };

    return (
      scores.completenessScore * weights.completeness +
      scores.feasibilityScore * weights.feasibility +
      scores.clarityScore * weights.clarity +
      scores.innovationScore * weights.innovation +
      scores.marketViabilityScore * weights.marketViability
    );
  }

  /**
   * 分析优势和不足
   */
  private static analyzeStrengthsWeaknesses(scores: {
    completenessScore: number;
    feasibilityScore: number;
    clarityScore: number;
    innovationScore: number;
    marketViabilityScore: number;
  }): { strengths: string[]; weaknesses: string[] } {
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    Object.entries(scores).forEach(([key, score]) => {
      const dimensionName = this.getDimensionName(key);
      
      if (score >= 80) {
        strengths.push(`${dimensionName}表现优秀 (${score}/100)`);
      } else if (score < 60) {
        weaknesses.push(`${dimensionName}需要改进 (${score}/100)`);
      }
    });

    return { strengths, weaknesses };
  }

  /**
   * 生成改进建议
   */
  private static generateRecommendations(
    content: string,
    features: TextFeatures,
    scores: any
  ): string[] {
    const recommendations: string[] = [];

    if (scores.completenessScore < 70) {
      recommendations.push('📋 补充项目规划的完整性，包括技术方案、商业模式、时间规划等');
    }

    if (scores.feasibilityScore < 70) {
      recommendations.push('⚖️ 重新评估项目可行性，调整过于理想化的目标和时间安排');
    }

    if (scores.clarityScore < 70) {
      recommendations.push('🔍 改善内容结构和表达清晰度，使用标题、列表等格式化元素');
    }

    if (scores.innovationScore < 60) {
      recommendations.push('🚀 增强项目创新点，突出技术或商业模式的独特价值');
    }

    if (scores.marketViabilityScore < 60) {
      recommendations.push('📊 加强市场分析和商业逻辑，提供数据支撑和竞争分析');
    }

    // 基于文本特征的建议
    if (features.length < 500) {
      recommendations.push('📝 扩展内容详细程度，提供更多具体信息和实施细节');
    }

    if (features.qualityIndicators.hasNumbers === false) {
      recommendations.push('📊 添加具体的数字和指标，增强规划的可量化性');
    }

    return recommendations.slice(0, 5); // 最多返回5个建议
  }

  /**
   * 识别改进领域
   */
  private static identifyImprovementAreas(scores: {
    completenessScore: number;
    feasibilityScore: number;
    clarityScore: number;
    innovationScore: number;
    marketViabilityScore: number;
  }): string[] {
    const areas: string[] = [];
    const threshold = 70;

    Object.entries(scores).forEach(([key, score]) => {
      if (score < threshold) {
        areas.push(this.getDimensionName(key));
      }
    });

    return areas;
  }

  /**
   * 计算评估置信度
   */
  private static calculateConfidence(features: TextFeatures, overallScore: number): number {
    let confidence = 70; // 基础置信度

    // 基于文本长度
    if (features.length > 1000) {
      confidence += 15;
    } else if (features.length > 500) {
      confidence += 10;
    } else if (features.length < 200) {
      confidence -= 20;
    }

    // 基于结构化程度
    const structureScore = features.complexity.logicalConnectorCount * 2;
    confidence += Math.min(structureScore, 10);

    // 基于关键词密度
    const totalDensity = Object.values(features.keywordDensity).reduce((sum, density) => sum + density, 0);
    if (totalDensity > 10) {
      confidence += 10;
    } else if (totalDensity < 3) {
      confidence -= 10;
    }

    return Math.max(Math.min(confidence, 95), 30);
  }

  /**
   * 获取维度名称
   */
  private static getDimensionName(key: string): string {
    const nameMap: { [key: string]: string } = {
      completenessScore: '完整性',
      feasibilityScore: '可行性',
      clarityScore: '清晰度',
      innovationScore: '创新性',
      marketViabilityScore: '市场可行性'
    };
    return nameMap[key] || key;
  }

  /**
   * 批量评估结果
   */
  static async evaluateBatch(
    results: Array<{ content: string; originalInput?: string; expectedQuality?: number }>,
    config: Partial<EvaluationConfig> = {}
  ): Promise<ResultEvaluation[]> {
    const evaluations: ResultEvaluation[] = [];

    for (const result of results) {
      const evaluation = await this.evaluateResult(
        result.content,
        result.originalInput,
        result.expectedQuality,
        config
      );
      evaluations.push(evaluation);
    }

    return evaluations;
  }

  /**
   * 生成评估报告
   */
  static generateEvaluationReport(evaluation: ResultEvaluation): string {
    let report = `# 🔍 AI生成结果质量评估报告\n\n`;

    // 总体评分
    report += `## 📊 总体评分\n\n`;
    report += `**总体质量**: ${evaluation.overallScore}/100\n`;
    report += `**评估置信度**: ${evaluation.confidence}%\n`;
    report += `**评估时间**: ${evaluation.evaluationTime}ms\n\n`;

    // 维度评分
    report += `## 📋 维度评分\n\n`;
    report += `| 维度 | 分数 | 状态 |\n`;
    report += `|------|------|------|\n`;
    report += `| 📋 完整性 | ${evaluation.completenessScore}/100 | ${this.getScoreStatus(evaluation.completenessScore)} |\n`;
    report += `| ⚖️ 可行性 | ${evaluation.feasibilityScore}/100 | ${this.getScoreStatus(evaluation.feasibilityScore)} |\n`;
    report += `| 🔍 清晰度 | ${evaluation.clarityScore}/100 | ${this.getScoreStatus(evaluation.clarityScore)} |\n`;
    report += `| 🚀 创新性 | ${evaluation.innovationScore}/100 | ${this.getScoreStatus(evaluation.innovationScore)} |\n`;
    report += `| 📊 市场可行性 | ${evaluation.marketViabilityScore}/100 | ${this.getScoreStatus(evaluation.marketViabilityScore)} |\n\n`;

    // 优势分析
    if (evaluation.strengths.length > 0) {
      report += `## ✅ 优势分析\n\n`;
      evaluation.strengths.forEach((strength, index) => {
        report += `${index + 1}. ${strength}\n`;
      });
      report += `\n`;
    }

    // 不足分析
    if (evaluation.weaknesses.length > 0) {
      report += `## ⚠️ 不足分析\n\n`;
      evaluation.weaknesses.forEach((weakness, index) => {
        report += `${index + 1}. ${weakness}\n`;
      });
      report += `\n`;
    }

    // 改进建议
    if (evaluation.recommendations.length > 0) {
      report += `## 💡 改进建议\n\n`;
      evaluation.recommendations.forEach((rec, index) => {
        report += `${index + 1}. ${rec}\n`;
      });
      report += `\n`;
    }

    // 质量对比
    if (evaluation.qualityGap !== undefined) {
      const gapText = evaluation.qualityGap >= 0 ? `+${evaluation.qualityGap}` : `${evaluation.qualityGap}`;
      const gapEmoji = evaluation.qualityGap >= 0 ? '📈' : '📉';
      report += `## 📊 质量对比\n\n`;
      report += `**与预期差距**: ${gapEmoji} ${gapText}分\n\n`;
    }

    return report;
  }

  /**
   * 获取分数状态
   */
  private static getScoreStatus(score: number): string {
    if (score >= 80) return '🌟 优秀';
    if (score >= 70) return '✅ 良好';
    if (score >= 60) return '📊 一般';
    return '⚠️ 需改进';
  }
}

export default ResultEvaluator;