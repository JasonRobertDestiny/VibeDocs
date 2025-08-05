#!/usr/bin/env node

import { TextAnalyzer, TextFeatures } from './text-analyzer.js';

/**
 * 质量预测结果接口
 */
export interface QualityPrediction {
  overallScore: number;        // 总体质量分数 (0-100)
  confidenceLevel: number;     // 预测置信度 (0-100)
  qualityLevel: 'excellent' | 'good' | 'fair' | 'poor';
  riskFactors: string[];       // 风险因素
  successProbability: number;  // 成功概率 (0-100)
  estimatedTime: number;       // 预计处理时间 (秒)
  
  // 详细评分
  dimensionScores: {
    clarity: number;           // 清晰度 (0-100)
    completeness: number;      // 完整性 (0-100)
    feasibility: number;       // 可行性 (0-100)
    businessLogic: number;     // 商业逻辑 (0-100)
    innovation: number;        // 创新程度 (0-100)
  };
  
  // 改进建议
  recommendations: string[];
}

/**
 * 质量预测配置
 */
export interface PredictionConfig {
  strictMode: boolean;         // 严格模式
  focusArea: 'technical' | 'business' | 'user' | 'general';
  minimumScore: number;        // 最低可接受分数
  timeoutSeconds: number;      // 超时时间
}

/**
 * AI规划质量预测器 - 核心算法
 * 基于文本特征预测AI生成规划的质量
 */
export class QualityPredictor {
  private static readonly DEFAULT_CONFIG: PredictionConfig = {
    strictMode: false,
    focusArea: 'general',
    minimumScore: 60,
    timeoutSeconds: 3
  };
  
  // 维度权重配置
  private static readonly DIMENSION_WEIGHTS = {
    clarity: 0.25,        // 清晰度权重
    completeness: 0.30,   // 完整性权重  
    feasibility: 0.20,    // 可行性权重
    businessLogic: 0.15,  // 商业逻辑权重
    innovation: 0.10      // 创新程度权重
  };
  
  // 质量等级阈值
  private static readonly QUALITY_THRESHOLDS = {
    excellent: 85,
    good: 70,
    fair: 50,
    poor: 0
  };
  
  // 风险因素检测规则
  private static readonly RISK_PATTERNS = [
    { pattern: /很多|大量|海量|无数/, risk: '规模描述过于模糊', weight: 0.8 },
    { pattern: /立即|马上|紧急|几天内/, risk: '时间要求过于紧迫', weight: 0.9 },
    { pattern: /AI|人工智能|机器学习|区块链/, risk: '技术复杂度较高', weight: 0.7 },
    { pattern: /全球|全国|世界级/, risk: '目标范围过于宏大', weight: 0.8 },
    { pattern: /简单|容易|基本|普通/, risk: '需求描述过于简化', weight: 0.6 },
    { pattern: /不知道|不确定|可能|也许/, risk: '需求不够明确', weight: 0.7 }
  ];
  
  /**
   * 预测文本的AI规划生成质量
   */
  static async predictQuality(
    text: string, 
    config: Partial<PredictionConfig> = {}
  ): Promise<QualityPrediction> {
    const fullConfig = { ...this.DEFAULT_CONFIG, ...config };
    const startTime = Date.now();
    
    try {
      // 1. 提取文本特征
      const features = TextAnalyzer.extractFeatures(text);
      
      // 2. 计算各维度分数
      const dimensionScores = this.calculateDimensionScores(features, fullConfig);
      
      // 3. 计算总体分数
      const overallScore = this.calculateOverallScore(dimensionScores);
      
      // 4. 评估置信度
      const confidenceLevel = this.calculateConfidence(features, overallScore);
      
      // 5. 检测风险因素
      const riskFactors = this.detectRiskFactors(text);
      
      // 6. 计算成功概率
      const successProbability = this.calculateSuccessProbability(
        overallScore, 
        riskFactors.length, 
        features
      );
      
      // 7. 估算处理时间
      const estimatedTime = this.estimateProcessingTime(features, overallScore);
      
      // 8. 生成改进建议
      const recommendations = this.generateRecommendations(
        features, 
        dimensionScores, 
        riskFactors
      );
      
      const processingTime = Date.now() - startTime;
      
      return {
        overallScore: Math.round(overallScore),
        confidenceLevel: Math.round(confidenceLevel),
        qualityLevel: this.getQualityLevel(overallScore),
        riskFactors: riskFactors.map(r => r.risk),
        successProbability: Math.round(successProbability),
        estimatedTime: Math.round(estimatedTime / 1000),
        dimensionScores: {
          clarity: Math.round(dimensionScores.clarity),
          completeness: Math.round(dimensionScores.completeness),
          feasibility: Math.round(dimensionScores.feasibility),
          businessLogic: Math.round(dimensionScores.businessLogic),
          innovation: Math.round(dimensionScores.innovation)
        },
        recommendations
      };
      
    } catch (error) {
      throw new Error(`质量预测失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * 计算各维度分数
   */
  private static calculateDimensionScores(
    features: TextFeatures, 
    config: PredictionConfig
  ): QualityPrediction['dimensionScores'] {
    return {
      clarity: this.calculateClarityScore(features),
      completeness: this.calculateCompletenessScore(features),
      feasibility: this.calculateFeasibilityScore(features),
      businessLogic: this.calculateBusinessLogicScore(features),
      innovation: this.calculateInnovationScore(features)
    };
  }
  
  /**
   * 计算清晰度分数
   */
  private static calculateClarityScore(features: TextFeatures): number {
    let score = 50; // 基础分
    
    // 文本长度合理性 (20分)
    if (features.length >= 100 && features.length <= 500) {
      score += 20;
    } else if (features.length >= 50 && features.length <= 1000) {
      score += 15;
    } else if (features.length < 50) {
      score += 5;
    } else {
      score += 10;
    }
    
    // 句子结构 (15分)
    if (features.avgWordsPerSentence >= 10 && features.avgWordsPerSentence <= 25) {
      score += 15;
    } else if (features.avgWordsPerSentence >= 5 && features.avgWordsPerSentence <= 35) {
      score += 10;
    } else {
      score += 5;
    }
    
    // 复杂度适中 (15分)
    const { complexity } = features;
    if (complexity.complexSentenceRatio >= 20 && complexity.complexSentenceRatio <= 60) {
      score += 15;
    } else if (complexity.complexSentenceRatio >= 10 && complexity.complexSentenceRatio <= 80) {
      score += 10;
    } else {
      score += 5;
    }
    
    // 逻辑连接词使用 (10分)
    if (complexity.logicalConnectorCount >= 2) {
      score += 10;
    } else if (complexity.logicalConnectorCount >= 1) {
      score += 5;
    }
    
    return Math.min(score, 100);
  }
  
  /**
   * 计算完整性分数
   */
  private static calculateCompletenessScore(features: TextFeatures): number {
    let score = 30; // 基础分
    
    // 关键词覆盖度 (40分)
    const { keywordDensity } = features;
    score += Math.min(keywordDensity.technical * 2, 10);  // 技术相关
    score += Math.min(keywordDensity.business * 2, 10);   // 商业相关
    score += Math.min(keywordDensity.user * 2, 10);       // 用户相关
    score += Math.min(keywordDensity.problem * 3, 10);    // 问题描述
    
    // 质量指标 (30分)
    const { qualityIndicators } = features;
    if (qualityIndicators.hasTargetUsers) score += 8;
    if (qualityIndicators.hasTechStack) score += 6;
    if (qualityIndicators.hasBusinessModel) score += 6;
    if (qualityIndicators.hasNumbers) score += 5;
    if (qualityIndicators.hasExamples) score += 5;
    
    return Math.min(score, 100);
  }
  
  /**
   * 计算可行性分数
   */
  private static calculateFeasibilityScore(features: TextFeatures): number {
    let score = 70; // 默认较高，遇到问题才减分
    
    // 技术复杂度检查
    const { keywordDensity } = features;
    if (keywordDensity.technical > 8) {
      score -= 15; // 技术栈过于复杂
    }
    
    // 规模合理性
    if (features.length < 30) {
      score -= 20; // 描述过于简单
    } else if (features.length > 1000) {
      score -= 10; // 可能过于复杂
    }
    
    // 领域专业度
    const { domainSpecificity } = features;
    if (domainSpecificity.confidence > 50) {
      score += 10; // 领域明确
    } else if (domainSpecificity.confidence < 20) {
      score -= 10; // 领域不明确
    }
    
    // 问题解决方案平衡
    if (keywordDensity.problem > 0 && keywordDensity.solution > 0) {
      score += 10; // 问题和解决方案都有提及
    } else if (keywordDensity.problem === 0 && keywordDensity.solution === 0) {
      score -= 15; // 都没有提及
    }
    
    return Math.max(Math.min(score, 100), 0);
  }
  
  /**
   * 计算商业逻辑分数
   */
  private static calculateBusinessLogicScore(features: TextFeatures): number {
    let score = 40; // 基础分
    
    // 商业关键词密度 (30分)
    const { keywordDensity } = features;
    score += Math.min(keywordDensity.business * 3, 30);
    
    // 用户相关性 (20分)
    score += Math.min(keywordDensity.user * 2.5, 20);
    
    // 质量指标 (10分)
    const { qualityIndicators } = features;
    if (qualityIndicators.hasBusinessModel) score += 10;
    
    return Math.min(score, 100);
  }
  
  /**
   * 计算创新程度分数
   */
  private static calculateInnovationScore(features: TextFeatures): number {
    let score = 50; // 基础分
    
    // 技术创新性 (25分)
    const { keywordDensity } = features;
    if (keywordDensity.technical > 3) {
      score += 15; // 技术含量较高
    }
    if (keywordDensity.technical > 6) {
      score += 10; // 技术含量很高
    }
    
    // 领域特异性 (15分)
    const { domainSpecificity } = features;
    if (domainSpecificity.confidence > 60) {
      score += 15; // 专业领域
    } else if (domainSpecificity.confidence > 30) {
      score += 10;
    }
    
    // 解决方案创新性 (10分)
    if (keywordDensity.solution > 4) {
      score += 10;
    }
    
    return Math.min(score, 100);
  }
  
  /**
   * 计算总体分数
   */
  private static calculateOverallScore(
    dimensionScores: QualityPrediction['dimensionScores']
  ): number {
    const { DIMENSION_WEIGHTS } = this;
    
    return (
      dimensionScores.clarity * DIMENSION_WEIGHTS.clarity +
      dimensionScores.completeness * DIMENSION_WEIGHTS.completeness +
      dimensionScores.feasibility * DIMENSION_WEIGHTS.feasibility +
      dimensionScores.businessLogic * DIMENSION_WEIGHTS.businessLogic +
      dimensionScores.innovation * DIMENSION_WEIGHTS.innovation
    );
  }
  
  /**
   * 计算预测置信度
   */
  private static calculateConfidence(
    features: TextFeatures, 
    overallScore: number
  ): number {
    let confidence = 70; // 基础置信度
    
    // 文本长度影响置信度
    if (features.length >= 100 && features.length <= 500) {
      confidence += 15;
    } else if (features.length >= 50) {
      confidence += 10;
    } else {
      confidence -= 20;
    }
    
    // 关键词密度影响置信度
    const totalDensity = Object.values(features.keywordDensity)
      .reduce((sum, density) => sum + density, 0);
    
    if (totalDensity > 10) {
      confidence += 10;
    } else if (totalDensity < 3) {
      confidence -= 15;
    }
    
    // 质量指标影响置信度
    const indicatorCount = Object.values(features.qualityIndicators)
      .filter(Boolean).length;
    confidence += indicatorCount * 2;
    
    return Math.max(Math.min(confidence, 95), 30);
  }
  
  /**
   * 检测风险因素
   */
  private static detectRiskFactors(text: string): Array<{risk: string, weight: number}> {
    const risks: Array<{risk: string, weight: number}> = [];
    
    this.RISK_PATTERNS.forEach(({ pattern, risk, weight }) => {
      if (pattern.test(text)) {
        risks.push({ risk, weight });
      }
    });
    
    return risks;
  }
  
  /**
   * 计算成功概率
   */
  private static calculateSuccessProbability(
    overallScore: number, 
    riskCount: number, 
    features: TextFeatures
  ): number {
    let probability = overallScore;
    
    // 风险因素影响
    probability -= riskCount * 8;
    
    // 文本长度影响
    if (features.length < 50) {
      probability -= 15;
    } else if (features.length > 1000) {
      probability -= 10;
    }
    
    // 关键词平衡性影响
    const densities = Object.values(features.keywordDensity);
    const maxDensity = Math.max(...densities);
    const minDensity = Math.min(...densities);
    
    if (maxDensity - minDensity > 10) {
      probability -= 5; // 关键词分布不均衡
    }
    
    return Math.max(Math.min(probability, 95), 20);
  }
  
  /**
   * 估算处理时间
   */
  private static estimateProcessingTime(
    features: TextFeatures, 
    overallScore: number
  ): number {
    let baseTime = 8; // 基础8秒
    
    // 文本长度影响处理时间
    if (features.length > 500) {
      baseTime += 3;
    } else if (features.length > 200) {
      baseTime += 1;
    }
    
    // 复杂度影响处理时间
    if (features.complexity.complexSentenceRatio > 50) {
      baseTime += 2;
    }
    
    // 质量分数影响处理时间（低质量需要更多处理）
    if (overallScore < 50) {
      baseTime += 3;
    } else if (overallScore > 80) {
      baseTime -= 1;
    }
    
    return Math.max(baseTime, 3);
  }
  
  /**
   * 生成改进建议
   */
  private static generateRecommendations(
    features: TextFeatures,
    dimensionScores: QualityPrediction['dimensionScores'],
    riskFactors: Array<{risk: string, weight: number}>
  ): string[] {
    const recommendations: string[] = [];
    
    // 基于维度分数的建议
    if (dimensionScores.clarity < 60) {
      recommendations.push('💡 提高描述清晰度：使用更具体的词汇，避免模糊表达');
    }
    
    if (dimensionScores.completeness < 60) {
      recommendations.push('📋 补充关键信息：目标用户、核心功能、技术栈、商业模式');
    }
    
    if (dimensionScores.feasibility < 60) {
      recommendations.push('⚖️ 评估项目可行性：考虑技术难度、资源需求、时间安排');
    }
    
    if (dimensionScores.businessLogic < 60) {
      recommendations.push('💼 强化商业逻辑：说明盈利模式、市场需求、竞争优势');
    }
    
    if (dimensionScores.innovation < 60) {
      recommendations.push('🚀 突出创新点：说明项目的独特价值和技术亮点');
    }
    
    // 基于质量指标的建议
    const { qualityIndicators } = features;
    if (!qualityIndicators.hasNumbers) {
      recommendations.push('📊 添加具体数据：用户规模、功能数量、时间计划等');
    }
    
    if (!qualityIndicators.hasExamples) {
      recommendations.push('🎯 提供具体示例：使用场景、功能演示、用户故事');
    }
    
    // 基于风险因素的建议
    if (riskFactors.length > 0) {
      const highRiskFactors = riskFactors.filter(r => r.weight > 0.7);
      if (highRiskFactors.length > 0) {
        recommendations.push('⚠️ 降低项目风险：重新评估项目范围和时间安排');
      }
    }
    
    // 基于文本长度的建议
    if (features.length < 50) {
      recommendations.push('📝 扩展项目描述：提供更多细节和背景信息');
    } else if (features.length > 1000) {
      recommendations.push('✂️ 精简项目描述：突出核心要点，避免冗余信息');
    }
    
    return recommendations.slice(0, 6); // 最多返回6个建议
  }
  
  /**
   * 获取质量等级
   */
  private static getQualityLevel(score: number): QualityPrediction['qualityLevel'] {
    if (score >= this.QUALITY_THRESHOLDS.excellent) return 'excellent';
    if (score >= this.QUALITY_THRESHOLDS.good) return 'good';
    if (score >= this.QUALITY_THRESHOLDS.fair) return 'fair';
    return 'poor';
  }
  
  /**
   * 批量预测质量
   */
  static async batchPredict(
    texts: string[],
    config: Partial<PredictionConfig> = {}
  ): Promise<QualityPrediction[]> {
    const results: QualityPrediction[] = [];
    
    for (const text of texts) {
      const prediction = await this.predictQuality(text, config);
      results.push(prediction);
    }
    
    return results;
  }
  
  /**
   * 生成质量预测报告
   */
  static generatePredictionReport(prediction: QualityPrediction): string {
    let report = `# 🎯 AI规划质量预测报告\n\n`;
    
    // 总体评估
    report += `## 📊 总体评估\n\n`;
    report += `**质量分数**: ${prediction.overallScore}/100 (${prediction.qualityLevel.toUpperCase()})\n`;
    report += `**预测置信度**: ${prediction.confidenceLevel}%\n`;
    report += `**成功概率**: ${prediction.successProbability}%\n`;
    report += `**预计处理时间**: ${prediction.estimatedTime}秒\n\n`;
    
    // 维度分析
    report += `## 🔍 维度分析\n\n`;
    report += `| 维度 | 分数 | 权重 |\n`;
    report += `|------|------|------|\n`;
    report += `| 🔍 清晰度 | ${prediction.dimensionScores.clarity}/100 | 25% |\n`;
    report += `| 📋 完整性 | ${prediction.dimensionScores.completeness}/100 | 30% |\n`;
    report += `| ⚖️ 可行性 | ${prediction.dimensionScores.feasibility}/100 | 20% |\n`;
    report += `| 💼 商业逻辑 | ${prediction.dimensionScores.businessLogic}/100 | 15% |\n`;
    report += `| � 创新程评度 | ${prediction.dimensionScores.innovation}/100 | 10% |\n\n`;
    
    // 风险因素
    if (prediction.riskFactors.length > 0) {
      report += `## ⚠️ 风险因素\n\n`;
      prediction.riskFactors.forEach((risk, index) => {
        report += `${index + 1}. ${risk}\n`;
      });
      report += `\n`;
    }
    
    // 改进建议
    if (prediction.recommendations.length > 0) {
      report += `## 💡 改进建议\n\n`;
      prediction.recommendations.forEach((rec, index) => {
        report += `${index + 1}. ${rec}\n`;
      });
      report += `\n`;
    }
    
    // 质量等级说明
    report += `## 📈 质量等级说明\n\n`;
    report += `- **Excellent (85-100)**: 质量优秀，AI生成成功率 >95%\n`;
    report += `- **Good (70-84)**: 质量良好，AI生成成功率 >85%\n`;
    report += `- **Fair (50-69)**: 质量一般，AI生成成功率 >70%\n`;
    report += `- **Poor (0-49)**: 质量较差，建议优化后再使用\n`;
    
    return report;
  }
}

export default QualityPredictor;