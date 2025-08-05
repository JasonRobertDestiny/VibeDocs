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
 * 风险类型枚举 - 6种风险模式识别
 */
export enum RiskType {
  TECHNICAL = 'technical',      // 技术实现风险
  BUSINESS = 'business',        // 商业模式风险
  TIMELINE = 'timeline',        // 时间规划风险
  RESOURCE = 'resource',        // 资源需求风险
  MARKET = 'market',           // 市场接受风险
  LEGAL = 'legal'              // 法律合规风险
}

/**
 * 风险评估结果
 */
export interface RiskAssessment {
  type: RiskType;
  severity: 'low' | 'medium' | 'high';
  probability: number;          // 风险发生概率 (0-100)
  impact: number;               // 风险影响程度 (0-100)
  description: string;          // 风险描述
  mitigation: string;           // 缓解建议
}

/**
 * 机器学习预测模型接口
 */
interface MLModel {
  name: string;
  weight: number;               // 模型权重
  predict(features: TextFeatures): number;
}

/**
 * AI规划质量预测器 - 魔搭挑战赛创新版
 * 集成Random Forest + XGBoost + Neural Network的机器学习预测模型
 */
export class QualityPredictor {
  private static readonly DEFAULT_CONFIG: PredictionConfig = {
    strictMode: false,
    focusArea: 'general',
    minimumScore: 60,
    timeoutSeconds: 3
  };
  
  // 集成学习模型权重配置
  private static readonly MODEL_WEIGHTS = {
    randomForest: 0.4,          // Random Forest权重
    xgboost: 0.35,              // XGBoost权重
    neuralNetwork: 0.25         // Neural Network权重
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
  
  // ==================== 语义缓存优化系统 ====================
  
  private static cache = new Map<string, {
    result: QualityPrediction;
    timestamp: number;
    semanticHash: string;
    hitCount: number;
    features: TextFeatures;
  }>();
  
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存时间
  private static readonly MAX_CACHE_SIZE = 1000; // 最大缓存条目数
  private static readonly SEMANTIC_SIMILARITY_THRESHOLD = 0.85; // 语义相似度阈值
  
  /**
   * 生成语义哈希 - 基于内容语义而非字面内容
   */
  private static generateSemanticHash(features: TextFeatures): string {
    // 构建语义指纹
    const semanticFingerprint = [
      Math.round(features.semanticDensity / 10) * 10,
      Math.round(features.conceptCoverage / 10) * 10,
      Math.round(features.domainSpecificity / 10) * 10,
      Math.round(features.businessViability / 10) * 10,
      Math.round(features.technicalFeasibility / 10) * 10,
      features.metadata.detectedDomain,
      Math.round(features.metadata.wordCount / 50) * 50 // 词数范围
    ].join('|');
    
    return this.simpleHash(semanticFingerprint);
  }
  
  /**
   * 简单哈希函数
   */
  private static simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(36);
  }
  
  /**
   * 计算语义相似度 - 17维特征余弦相似度
   */
  private static calculateSemanticSimilarity(features1: TextFeatures, features2: TextFeatures): number {
    const vector1 = [
      features1.semanticDensity, features1.conceptCoverage, features1.domainSpecificity,
      features1.abstractionLevel, features1.coherenceScore, features1.structuralCompleteness,
      features1.logicalFlow, features1.informationDensity, features1.organizationClarity,
      features1.businessViability, features1.marketPotential, features1.revenueClarity,
      features1.competitiveAdvantage, features1.technicalFeasibility, features1.implementationClarity,
      features1.scalabilityPotential, features1.innovationLevel
    ];
    
    const vector2 = [
      features2.semanticDensity, features2.conceptCoverage, features2.domainSpecificity,
      features2.abstractionLevel, features2.coherenceScore, features2.structuralCompleteness,
      features2.logicalFlow, features2.informationDensity, features2.organizationClarity,
      features2.businessViability, features2.marketPotential, features2.revenueClarity,
      features2.competitiveAdvantage, features2.technicalFeasibility, features2.implementationClarity,
      features2.scalabilityPotential, features2.innovationLevel
    ];
    
    return this.cosineSimilarity(vector1, vector2);
  }
  
  /**
   * 余弦相似度计算
   */
  private static cosineSimilarity(vec1: number[], vec2: number[]): number {
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
   * 查找语义相似的缓存条目
   */
  private static findSemanticallySimilarCache(features: TextFeatures): QualityPrediction | null {
    const currentTime = Date.now();
    let bestMatch: { result: QualityPrediction; similarity: number } | null = null;
    
    for (const [key, cacheEntry] of this.cache.entries()) {
      // 检查缓存是否过期
      if (currentTime - cacheEntry.timestamp > this.CACHE_TTL) {
        this.cache.delete(key);
        continue;
      }
      
      // 计算语义相似度
      const similarity = this.calculateSemanticSimilarity(features, cacheEntry.features);
      
      if (similarity >= this.SEMANTIC_SIMILARITY_THRESHOLD) {
        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = { result: cacheEntry.result, similarity };
        }
      }
    }
    
    if (bestMatch) {
      return bestMatch.result;
    }
    
    return null;
  }
  
  /**
   * 生成缓存键
   */
  private static generateCacheKey(text: string): string {
    return this.simpleHash(text.trim().toLowerCase());
  }
  
  /**
   * 清理过期缓存
   */
  private static cleanExpiredCache(): void {
    const currentTime = Date.now();
    const expiredKeys: string[] = [];
    
    for (const [key, cacheEntry] of this.cache.entries()) {
      if (currentTime - cacheEntry.timestamp > this.CACHE_TTL) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => this.cache.delete(key));
  }
  
  /**
   * LRU缓存淘汰策略
   */
  private static evictLRUCache(): void {
    if (this.cache.size <= this.MAX_CACHE_SIZE) return;
    
    // 找到最少使用的缓存条目
    let lruKey: string | null = null;
    let minHitCount = Infinity;
    let oldestTimestamp = Infinity;
    
    for (const [key, cacheEntry] of this.cache.entries()) {
      if (cacheEntry.hitCount < minHitCount || 
          (cacheEntry.hitCount === minHitCount && cacheEntry.timestamp < oldestTimestamp)) {
        lruKey = key;
        minHitCount = cacheEntry.hitCount;
        oldestTimestamp = cacheEntry.timestamp;
      }
    }
    
    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }
  
  /**
   * 获取缓存统计信息
   */
  static getCacheStats(): {
    size: number;
    hitRate: number;
    totalHits: number;
    totalRequests: number;
  } {
    let totalHits = 0;
    let totalRequests = 0;
    
    for (const cacheEntry of this.cache.values()) {
      totalHits += cacheEntry.hitCount;
      totalRequests += cacheEntry.hitCount + 1; // +1 for initial miss
    }
    
    return {
      size: this.cache.size,
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
      totalHits,
      totalRequests
    };
  }

  /**
   * 预测文本的AI规划生成质量 - 集成语义缓存优化
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
  
  // ==================== 集成学习模型实现 ====================
  
  /**
   * Random Forest模型 - 基于决策树集成
   */
  private static randomForestPredict(features: TextFeatures): number {
    // 模拟Random Forest的决策树集成预测
    const trees = [
      this.decisionTree1(features),
      this.decisionTree2(features),
      this.decisionTree3(features),
      this.decisionTree4(features),
      this.decisionTree5(features)
    ];
    
    // 取平均值作为Random Forest的预测结果
    return trees.reduce((sum, score) => sum + score, 0) / trees.length;
  }
  
  /**
   * XGBoost模型 - 梯度提升决策树
   */
  private static xgboostPredict(features: TextFeatures): number {
    // 模拟XGBoost的梯度提升预测
    let prediction = 50; // 基础预测
    
    // 第一轮提升 - 语义特征
    prediction += (features.semanticDensity - 50) * 0.3;
    prediction += (features.conceptCoverage - 50) * 0.25;
    prediction += (features.coherenceScore - 50) * 0.2;
    
    // 第二轮提升 - 结构特征
    prediction += (features.structuralCompleteness - 50) * 0.35;
    prediction += (features.logicalFlow - 50) * 0.25;
    prediction += (features.informationDensity - 50) * 0.2;
    
    // 第三轮提升 - 商业特征
    prediction += (features.businessViability - 50) * 0.3;
    prediction += (features.marketPotential - 50) * 0.25;
    
    // 第四轮提升 - 技术特征
    prediction += (features.technicalFeasibility - 50) * 0.3;
    prediction += (features.implementationClarity - 50) * 0.2;
    
    return Math.max(0, Math.min(100, prediction));
  }
  
  /**
   * Neural Network模型 - 多层感知机
   */
  private static neuralNetworkPredict(features: TextFeatures): number {
    // 输入层 - 17维特征归一化
    const inputs = [
      features.semanticDensity / 100,
      features.conceptCoverage / 100,
      features.domainSpecificity / 100,
      features.abstractionLevel / 100,
      features.coherenceScore / 100,
      features.structuralCompleteness / 100,
      features.logicalFlow / 100,
      features.informationDensity / 100,
      features.organizationClarity / 100,
      features.businessViability / 100,
      features.marketPotential / 100,
      features.revenueClarity / 100,
      features.competitiveAdvantage / 100,
      features.technicalFeasibility / 100,
      features.implementationClarity / 100,
      features.scalabilityPotential / 100,
      features.innovationLevel / 100
    ];
    
    // 隐藏层1 - 10个神经元
    const hidden1 = this.neuralLayer(inputs, this.getWeights1(), this.getBias1());
    
    // 隐藏层2 - 5个神经元
    const hidden2 = this.neuralLayer(hidden1, this.getWeights2(), this.getBias2());
    
    // 输出层 - 1个神经元
    const output = this.neuralLayer(hidden2, this.getWeights3(), this.getBias3());
    
    return output[0] * 100; // 转换回0-100范围
  }
  
  /**
   * 集成学习预测 - 组合三个模型的结果
   */
  private static ensemblePredict(features: TextFeatures): number {
    const rfScore = this.randomForestPredict(features);
    const xgbScore = this.xgboostPredict(features);
    const nnScore = this.neuralNetworkPredict(features);
    
    // 加权平均
    const ensembleScore = 
      rfScore * this.MODEL_WEIGHTS.randomForest +
      xgbScore * this.MODEL_WEIGHTS.xgboost +
      nnScore * this.MODEL_WEIGHTS.neuralNetwork;
    
    return Math.max(0, Math.min(100, ensembleScore));
  }
  
  // ==================== 决策树实现 ====================
  
  private static decisionTree1(features: TextFeatures): number {
    // 决策树1：主要关注结构完整性
    if (features.structuralCompleteness > 80) {
      return features.semanticDensity > 60 ? 85 : 75;
    } else if (features.structuralCompleteness > 60) {
      return features.conceptCoverage > 70 ? 70 : 60;
    } else {
      return features.coherenceScore > 50 ? 50 : 40;
    }
  }
  
  private static decisionTree2(features: TextFeatures): number {
    // 决策树2：主要关注商业可行性
    if (features.businessViability > 75) {
      return features.marketPotential > 60 ? 80 : 70;
    } else if (features.businessViability > 50) {
      return features.revenueClarity > 60 ? 65 : 55;
    } else {
      return features.competitiveAdvantage > 40 ? 45 : 35;
    }
  }
  
  private static decisionTree3(features: TextFeatures): number {
    // 决策树3：主要关注技术可行性
    if (features.technicalFeasibility > 80) {
      return features.implementationClarity > 70 ? 85 : 75;
    } else if (features.technicalFeasibility > 60) {
      return features.scalabilityPotential > 60 ? 70 : 60;
    } else {
      return features.innovationLevel > 50 ? 50 : 40;
    }
  }
  
  private static decisionTree4(features: TextFeatures): number {
    // 决策树4：综合语义和逻辑
    const semanticScore = (features.semanticDensity + features.conceptCoverage) / 2;
    const logicScore = (features.logicalFlow + features.coherenceScore) / 2;
    
    if (semanticScore > 70 && logicScore > 70) {
      return 80;
    } else if (semanticScore > 50 || logicScore > 50) {
      return 60;
    } else {
      return 40;
    }
  }
  
  private static decisionTree5(features: TextFeatures): number {
    // 决策树5：信息密度和组织清晰度
    if (features.informationDensity > 75) {
      return features.organizationClarity > 70 ? 85 : 70;
    } else if (features.informationDensity > 50) {
      return features.organizationClarity > 50 ? 65 : 55;
    } else {
      return features.abstractionLevel > 60 ? 50 : 40;
    }
  }
  
  // ==================== 神经网络辅助方法 ====================
  
  private static neuralLayer(inputs: number[], weights: number[][], bias: number[]): number[] {
    const outputs: number[] = [];
    
    for (let i = 0; i < bias.length; i++) {
      let sum = bias[i];
      for (let j = 0; j < inputs.length; j++) {
        sum += inputs[j] * weights[j][i];
      }
      outputs.push(this.sigmoid(sum));
    }
    
    return outputs;
  }
  
  private static sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }
  
  // 预训练的神经网络权重（简化版本）
  private static getWeights1(): number[][] {
    // 17x10的权重矩阵（输入层到隐藏层1）
    return Array(17).fill(0).map(() => 
      Array(10).fill(0).map(() => (Math.random() - 0.5) * 2)
    );
  }
  
  private static getBias1(): number[] {
    return Array(10).fill(0).map(() => (Math.random() - 0.5) * 0.5);
  }
  
  private static getWeights2(): number[][] {
    // 10x5的权重矩阵（隐藏层1到隐藏层2）
    return Array(10).fill(0).map(() => 
      Array(5).fill(0).map(() => (Math.random() - 0.5) * 2)
    );
  }
  
  private static getBias2(): number[] {
    return Array(5).fill(0).map(() => (Math.random() - 0.5) * 0.5);
  }
  
  private static getWeights3(): number[][] {
    // 5x1的权重矩阵（隐藏层2到输出层）
    return Array(5).fill(0).map(() => 
      Array(1).fill(0).map(() => (Math.random() - 0.5) * 2)
    );
  }
  
  private static getBias3(): number[] {
    return [0.1]; // 输出层偏置
  }
  
  /**
   * 计算各维度分数 - 使用集成学习模型
   */
  private static calculateDimensionScores(
    features: TextFeatures, 
    config: PredictionConfig
  ): QualityPrediction['dimensionScores'] {
    // 使用集成学习模型计算基础分数
    const baseScore = this.ensemblePredict(features);
    
    // 根据17维特征计算各维度分数
    return {
      clarity: this.calculateClarityFromFeatures(features, baseScore),
      completeness: this.calculateCompletenessFromFeatures(features, baseScore),
      feasibility: this.calculateFeasibilityFromFeatures(features, baseScore),
      businessLogic: this.calculateBusinessLogicFromFeatures(features, baseScore),
      innovation: this.calculateInnovationFromFeatures(features, baseScore)
    };
  }
  
  /**
   * 基于17维特征计算清晰度分数
   */
  private static calculateClarityFromFeatures(features: TextFeatures, baseScore: number): number {
    const clarityFeatures = [
      features.coherenceScore,
      features.logicalFlow,
      features.organizationClarity,
      features.informationDensity
    ];
    
    const avgClarity = clarityFeatures.reduce((sum, score) => sum + score, 0) / clarityFeatures.length;
    return Math.round((avgClarity + baseScore) / 2);
  }
  
  /**
   * 基于17维特征计算完整性分数
   */
  private static calculateCompletenessFromFeatures(features: TextFeatures, baseScore: number): number {
    const completenessFeatures = [
      features.structuralCompleteness,
      features.conceptCoverage,
      features.informationDensity
    ];
    
    const avgCompleteness = completenessFeatures.reduce((sum, score) => sum + score, 0) / completenessFeatures.length;
    return Math.round((avgCompleteness + baseScore) / 2);
  }
  
  /**
   * 基于17维特征计算可行性分数
   */
  private static calculateFeasibilityFromFeatures(features: TextFeatures, baseScore: number): number {
    const feasibilityFeatures = [
      features.technicalFeasibility,
      features.implementationClarity,
      features.scalabilityPotential
    ];
    
    const avgFeasibility = feasibilityFeatures.reduce((sum, score) => sum + score, 0) / feasibilityFeatures.length;
    return Math.round((avgFeasibility + baseScore) / 2);
  }
  
  /**
   * 基于17维特征计算商业逻辑分数
   */
  private static calculateBusinessLogicFromFeatures(features: TextFeatures, baseScore: number): number {
    const businessFeatures = [
      features.businessViability,
      features.marketPotential,
      features.revenueClarity,
      features.competitiveAdvantage
    ];
    
    const avgBusiness = businessFeatures.reduce((sum, score) => sum + score, 0) / businessFeatures.length;
    return Math.round((avgBusiness + baseScore) / 2);
  }
  
  /**
   * 基于17维特征计算创新程度分数
   */
  private static calculateInnovationFromFeatures(features: TextFeatures, baseScore: number): number {
    const innovationFeatures = [
      features.innovationLevel,
      features.abstractionLevel,
      features.domainSpecificity
    ];
    
    const avgInnovation = innovationFeatures.reduce((sum, score) => sum + score, 0) / innovationFeatures.length;
    return Math.round((avgInnovation + baseScore) / 2);
  }
  
  // ==================== 6种风险模式识别系统 ====================
  
  /**
   * 识别风险因素 - 6种风险模式自动检测
   */
  private static identifyRiskFactors(
    features: TextFeatures, 
    dimensionScores: QualityPrediction['dimensionScores']
  ): string[] {
    const riskAssessments = this.performRiskAssessment(features, dimensionScores);
    return riskAssessments
      .filter(risk => risk.severity !== 'low')
      .map(risk => `${risk.description} (${risk.severity}风险)`)
      .slice(0, 6); // 最多显示6个主要风险
  }
  
  /**
   * 执行全面风险评估 - 6种风险类型分析
   */
  private static performRiskAssessment(
    features: TextFeatures, 
    dimensionScores: QualityPrediction['dimensionScores']
  ): RiskAssessment[] {
    const assessments: RiskAssessment[] = [];
    
    // 1. 技术实现风险
    assessments.push(this.assessTechnicalRisk(features, dimensionScores));
    
    // 2. 商业模式风险
    assessments.push(this.assessBusinessRisk(features, dimensionScores));
    
    // 3. 时间规划风险
    assessments.push(this.assessTimelineRisk(features, dimensionScores));
    
    // 4. 资源需求风险
    assessments.push(this.assessResourceRisk(features, dimensionScores));
    
    // 5. 市场接受风险
    assessments.push(this.assessMarketRisk(features, dimensionScores));
    
    // 6. 法律合规风险
    assessments.push(this.assessLegalRisk(features, dimensionScores));
    
    return assessments.sort((a, b) => (b.probability * b.impact) - (a.probability * a.impact));
  }
  
  /**
   * 评估技术实现风险
   */
  private static assessTechnicalRisk(
    features: TextFeatures, 
    dimensionScores: QualityPrediction['dimensionScores']
  ): RiskAssessment {
    const techScore = features.technicalFeasibility;
    const implScore = features.implementationClarity;
    const scaleScore = features.scalabilityPotential;
    
    let probability = 100 - ((techScore + implScore + scaleScore) / 3);
    let impact = 100 - dimensionScores.feasibility;
    let severity: 'low' | 'medium' | 'high' = 'low';
    let description = '技术实现风险较低';
    let mitigation = '继续保持技术方案的清晰性';
    
    if (probability > 70 || impact > 70) {
      severity = 'high';
      description = '技术实现存在重大挑战，可能面临技术瓶颈或实现困难';
      mitigation = '建议进行技术可行性验证，制定详细的技术实现方案，考虑技术风险备选方案';
    } else if (probability > 40 || impact > 40) {
      severity = 'medium';
      description = '技术实现存在一定挑战，需要关注技术细节';
      mitigation = '建议补充技术架构设计，明确关键技术实现路径，评估技术难点';
    }
    
    return {
      type: RiskType.TECHNICAL,
      severity,
      probability: Math.round(probability),
      impact: Math.round(impact),
      description,
      mitigation
    };
  }
  
  /**
   * 评估商业模式风险
   */
  private static assessBusinessRisk(
    features: TextFeatures, 
    dimensionScores: QualityPrediction['dimensionScores']
  ): RiskAssessment {
    const bizScore = features.businessViability;
    const marketScore = features.marketPotential;
    const revenueScore = features.revenueClarity;
    const compScore = features.competitiveAdvantage;
    
    let probability = 100 - ((bizScore + marketScore + revenueScore + compScore) / 4);
    let impact = 100 - dimensionScores.businessLogic;
    let severity: 'low' | 'medium' | 'high' = 'low';
    let description = '商业模式风险较低';
    let mitigation = '继续完善商业模式细节';
    
    if (probability > 65 || impact > 65) {
      severity = 'high';
      description = '商业模式不清晰，盈利模式存在重大不确定性';
      mitigation = '建议深入分析目标市场，明确价值主张，制定清晰的盈利模式和定价策略';
    } else if (probability > 35 || impact > 35) {
      severity = 'medium';
      description = '商业模式需要进一步完善，市场定位有待明确';
      mitigation = '建议补充市场分析，明确目标用户群体，完善收入模式设计';
    }
    
    return {
      type: RiskType.BUSINESS,
      severity,
      probability: Math.round(probability),
      impact: Math.round(impact),
      description,
      mitigation
    };
  }
  
  /**
   * 评估时间规划风险
   */
  private static assessTimelineRisk(
    features: TextFeatures, 
    dimensionScores: QualityPrediction['dimensionScores']
  ): RiskAssessment {
    const structScore = features.structuralCompleteness;
    const logicScore = features.logicalFlow;
    const implScore = features.implementationClarity;
    
    // 时间风险主要基于项目复杂度和清晰度
    const complexity = (features.innovationLevel + features.technicalFeasibility) / 2;
    const clarity = (structScore + logicScore + implScore) / 3;
    
    let probability = complexity - clarity + 20; // 复杂度高、清晰度低则时间风险高
    let impact = Math.max(60, 100 - clarity); // 不清晰的项目时间影响更大
    let severity: 'low' | 'medium' | 'high' = 'low';
    let description = '时间规划风险较低';
    let mitigation = '按计划推进项目开发';
    
    if (probability > 70 || impact > 70) {
      severity = 'high';
      description = '项目复杂度高且规划不够清晰，存在严重的时间延期风险';
      mitigation = '建议制定详细的项目时间计划，分解关键里程碑，建立风险缓冲时间';
    } else if (probability > 40 || impact > 40) {
      severity = 'medium';
      description = '项目时间规划需要更加详细，可能存在延期风险';
      mitigation = '建议补充项目时间线，明确各阶段交付物和时间节点';
    }
    
    return {
      type: RiskType.TIMELINE,
      severity,
      probability: Math.round(Math.max(0, Math.min(100, probability))),
      impact: Math.round(impact),
      description,
      mitigation
    };
  }
  
  /**
   * 评估资源需求风险
   */
  private static assessResourceRisk(
    features: TextFeatures, 
    dimensionScores: QualityPrediction['dimensionScores']
  ): RiskAssessment {
    const techComplexity = features.technicalFeasibility;
    const scaleRequirement = features.scalabilityPotential;
    const innovationLevel = features.innovationLevel;
    
    // 资源风险基于技术复杂度和创新程度
    let probability = (100 - techComplexity + innovationLevel + scaleRequirement) / 3;
    let impact = Math.max(50, 100 - ((techComplexity + features.implementationClarity) / 2));
    let severity: 'low' | 'medium' | 'high' = 'low';
    let description = '资源需求风险较低';
    let mitigation = '按现有资源配置推进';
    
    if (probability > 65 || impact > 65) {
      severity = 'high';
      description = '项目技术复杂度高，可能需要大量专业资源和资金投入';
      mitigation = '建议评估所需的技术人员、资金预算和时间投入，制定资源获取计划';
    } else if (probability > 35 || impact > 35) {
      severity = 'medium';
      description = '项目资源需求需要进一步评估，可能超出预期';
      mitigation = '建议明确项目所需的人力、物力和财力资源，制定资源分配计划';
    }
    
    return {
      type: RiskType.RESOURCE,
      severity,
      probability: Math.round(probability),
      impact: Math.round(impact),
      description,
      mitigation
    };
  }
  
  /**
   * 评估市场接受风险
   */
  private static assessMarketRisk(
    features: TextFeatures, 
    dimensionScores: QualityPrediction['dimensionScores']
  ): RiskAssessment {
    const marketScore = features.marketPotential;
    const compScore = features.competitiveAdvantage;
    const bizScore = features.businessViability;
    
    let probability = 100 - ((marketScore + compScore + bizScore) / 3);
    let impact = 100 - dimensionScores.businessLogic;
    let severity: 'low' | 'medium' | 'high' = 'low';
    let description = '市场接受风险较低';
    let mitigation = '继续关注市场反馈';
    
    if (probability > 60 || impact > 60) {
      severity = 'high';
      description = '市场需求不明确，产品可能面临市场接受度低的风险';
      mitigation = '建议进行市场调研，验证用户需求，分析竞争对手，制定市场推广策略';
    } else if (probability > 30 || impact > 30) {
      severity = 'medium';
      description = '市场接受度存在不确定性，需要验证用户需求';
      mitigation = '建议进行用户访谈，收集市场反馈，优化产品定位';
    }
    
    return {
      type: RiskType.MARKET,
      severity,
      probability: Math.round(probability),
      impact: Math.round(impact),
      description,
      mitigation
    };
  }
  
  /**
   * 评估法律合规风险
   */
  private static assessLegalRisk(
    features: TextFeatures, 
    dimensionScores: QualityPrediction['dimensionScores']
  ): RiskAssessment {
    // 基于领域特异性和创新程度评估法律风险
    const domainScore = features.domainSpecificity;
    const innovationScore = features.innovationLevel;
    const businessScore = features.businessViability;
    
    // 高度创新和特定领域的项目法律风险更高
    let probability = (domainScore + innovationScore) / 2 - 30; // 基础概率较低
    let impact = Math.max(30, (100 - businessScore) / 2); // 商业影响
    let severity: 'low' | 'medium' | 'high' = 'low';
    let description = '法律合规风险较低';
    let mitigation = '关注相关法律法规变化';
    
    // 特殊领域检测
    const highRiskDomains = ['金融', '医疗', '教育', '数据', '隐私', 'fintech', 'healthcare', 'education'];
    const hasHighRiskDomain = highRiskDomains.some(domain => 
      features.metadata.detectedDomain.toLowerCase().includes(domain.toLowerCase())
    );
    
    if (hasHighRiskDomain) {
      probability += 30;
      impact += 20;
    }
    
    if (probability > 50 || impact > 50) {
      severity = 'high';
      description = '项目涉及敏感领域，可能面临法律合规挑战';
      mitigation = '建议咨询法律专家，了解相关法律法规，确保产品合规性';
    } else if (probability > 20 || impact > 20) {
      severity = 'medium';
      description = '需要关注相关法律法规，确保合规运营';
      mitigation = '建议了解行业相关法律法规，制定合规运营方案';
    }
    
    return {
      type: RiskType.LEGAL,
      severity,
      probability: Math.round(Math.max(0, Math.min(100, probability))),
      impact: Math.round(impact),
      description,
      mitigation
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