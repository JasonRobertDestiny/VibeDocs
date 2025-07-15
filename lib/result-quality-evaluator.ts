#!/usr/bin/env node

import { performanceMonitor } from './performance-monitor.js';

// 结果质量评估接口
export interface ResultQualityAssessment {
  overallScore: number; // 总体质量分数 (0-100)
  qualityLevel: 'excellent' | 'good' | 'satisfactory' | 'needs_improvement';
  isProducible: boolean; // 是否可付诸实施
  categories: {
    completeness: QualityMetric;
    practicality: QualityMetric;
    clarity: QualityMetric;
    technicalSoundness: QualityMetric;
    implementability: QualityMetric;
  };
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  productionReadiness: number; // 生产就绪度 (0-100)
  confidenceScore: number; // 评估置信度 (0-100)
}

// 质量指标
export interface QualityMetric {
  score: number; // 分数 (0-100)
  level: 'excellent' | 'good' | 'satisfactory' | 'needs_improvement';
  feedback: string;
  details: string[];
  criticalIssues: string[];
}

// 评估配置
export interface EvaluationConfig {
  strictMode: boolean; // 严格评估模式
  focusArea: 'general' | 'technical' | 'business' | 'implementation';
  requireMermaidValidation: boolean; // 要求Mermaid图表验证
  minimumPromptCount: number; // 最少提示词数量
  checkFeasibility: boolean; // 检查可行性
}

// 结果质量评估器 - 智能评估生成结果的质量和可行性
export class ResultQualityEvaluator {
  private static readonly DEFAULT_CONFIG: EvaluationConfig = {
    strictMode: false,
    focusArea: 'general',
    requireMermaidValidation: true,
    minimumPromptCount: 8,
    checkFeasibility: true
  };

  // 评估权重配置
  private static readonly CATEGORY_WEIGHTS = {
    completeness: 0.25,
    practicality: 0.20,
    clarity: 0.20,
    technicalSoundness: 0.20,
    implementability: 0.15
  };

  /**
   * 评估完整的开发计划质量
   */
  static async evaluateResult(
    analysisData: any,
    planningData: any,
    visualizations: any,
    aiPrompts: any,
    metadata: any,
    config: Partial<EvaluationConfig> = {}
  ): Promise<ResultQualityAssessment> {
    const timer = performanceMonitor.startTimer('result_quality_evaluation');
    
    try {
      const fullConfig = { ...this.DEFAULT_CONFIG, ...config };
      
      console.log('🔍 开始结果质量评估...');
      
      // 分类别评估
      const categories = {
        completeness: await this.evaluateCompleteness(analysisData, planningData, visualizations, aiPrompts, fullConfig),
        practicality: await this.evaluatePracticality(analysisData, planningData, aiPrompts, fullConfig),
        clarity: await this.evaluateClarity(planningData, visualizations, aiPrompts, fullConfig),
        technicalSoundness: await this.evaluateTechnicalSoundness(planningData, visualizations, aiPrompts, fullConfig),
        implementability: await this.evaluateImplementability(aiPrompts, planningData, fullConfig)
      };
      
      // 计算总体分数
      const overallScore = this.calculateOverallScore(categories);
      
      // 分析优缺点
      const strengths = this.identifyStrengths(categories, analysisData, planningData, visualizations, aiPrompts);
      const weaknesses = this.identifyWeaknesses(categories, analysisData, planningData, visualizations, aiPrompts);
      
      // 生成建议
      const recommendations = this.generateRecommendations(categories, weaknesses, fullConfig);
      
      // 评估生产就绪度
      const productionReadiness = this.assessProductionReadiness(categories, metadata);
      
      // 计算评估置信度
      const confidenceScore = this.calculateConfidenceScore(categories, metadata);
      
      const assessment: ResultQualityAssessment = {
        overallScore,
        qualityLevel: this.getQualityLevel(overallScore),
        isProducible: overallScore >= (fullConfig.strictMode ? 75 : 60),
        categories,
        strengths,
        weaknesses,
        recommendations,
        productionReadiness,
        confidenceScore
      };
      
      // 记录评估指标
      performanceMonitor.recordEvent('result_quality_assessment', 1, {
        overallScore,
        qualityLevel: assessment.qualityLevel,
        isProducible: assessment.isProducible,
        productionReadiness,
        confidenceScore
      });
      
      timer.stopWithResult(true, { score: overallScore });
      return assessment;
      
    } catch (error) {
      timer.stopWithResult(false, { error: error.message });
      throw new Error(`结果质量评估失败: ${error.message}`);
    }
  }
  
  /**
   * 评估完整性
   */
  private static async evaluateCompleteness(
    analysisData: any,
    planningData: any,
    visualizations: any,
    aiPrompts: any,
    config: EvaluationConfig
  ): Promise<QualityMetric> {
    let score = 0;
    const details: string[] = [];
    const criticalIssues: string[] = [];
    
    // 分析数据完整性 (25分)
    if (analysisData) {
      if (analysisData.coreProblems) score += 5;
      if (analysisData.targetUsers) score += 5;
      if (analysisData.marketPainPoints) score += 5;
      if (analysisData.technicalComplexity) score += 5;
      if (analysisData.businessViability) score += 5;
      
      if (score >= 20) {
        details.push('✅ 分析数据完整，包含核心要素');
      } else {
        criticalIssues.push('❌ 分析数据不完整，缺少关键要素');
      }
    } else {
      criticalIssues.push('❌ 缺少分析数据');
    }
    
    // 规划数据完整性 (25分)
    if (planningData) {
      const requiredFields = ['productName', 'techStack', 'deployment', 'database'];
      const presentFields = requiredFields.filter(field => planningData[field]);
      score += Math.round((presentFields.length / requiredFields.length) * 25);
      
      if (presentFields.length >= 3) {
        details.push('✅ 规划数据较完整');
      } else {
        criticalIssues.push('❌ 规划数据缺少关键字段');
      }
    } else {
      criticalIssues.push('❌ 缺少规划数据');
    }
    
    // 可视化完整性 (25分)
    if (visualizations) {
      const requiredCharts = ['systemArchitecture', 'dataFlow', 'deploymentArchitecture'];
      const presentCharts = requiredCharts.filter(chart => 
        visualizations[chart] && visualizations[chart].mermaidCode
      );
      score += Math.round((presentCharts.length / requiredCharts.length) * 25);
      
      if (presentCharts.length >= 2) {
        details.push('✅ 可视化图表齐全');
      } else {
        criticalIssues.push('❌ 缺少必要的架构图表');
      }
    } else {
      criticalIssues.push('❌ 缺少可视化图表');
    }
    
    // AI提示词完整性 (25分)
    if (aiPrompts && aiPrompts.prompts) {
      const promptCount = aiPrompts.prompts.length;
      if (promptCount >= config.minimumPromptCount) {
        score += 25;
        details.push(`✅ AI提示词数量充足 (${promptCount}个)`);
      } else {
        score += Math.round((promptCount / config.minimumPromptCount) * 25);
        criticalIssues.push(`❌ AI提示词数量不足 (${promptCount}/${config.minimumPromptCount})`);
      }
    } else {
      criticalIssues.push('❌ 缺少AI提示词');
    }
    
    const feedback = this.generateCategoryFeedback(score, '完整性');
    
    return {
      score: Math.max(0, Math.min(100, score)),
      level: this.getQualityLevel(score),
      feedback,
      details,
      criticalIssues
    };
  }
  
  /**
   * 评估实用性
   */
  private static async evaluatePracticality(
    analysisData: any,
    planningData: any,
    aiPrompts: any,
    config: EvaluationConfig
  ): Promise<QualityMetric> {
    let score = 50; // 基础分
    const details: string[] = [];
    const criticalIssues: string[] = [];
    
    // 问题解决针对性 (25分)
    if (analysisData?.coreProblems && analysisData.coreProblems.length > 20) {
      score += 15;
      details.push('✅ 问题分析深入具体');
    } else {
      score -= 5;
      criticalIssues.push('❌ 问题分析不够深入');
    }
    
    // 技术选型合理性 (25分)
    if (planningData?.techStack) {
      const popularTech = ['react', 'vue', 'nodejs', 'python', 'typescript', 'javascript'];
      const techStack = planningData.techStack.toLowerCase();
      const usesPopularTech = popularTech.some(tech => techStack.includes(tech));
      
      if (usesPopularTech) {
        score += 15;
        details.push('✅ 采用主流技术栈');
      } else {
        score += 5;
        details.push('ℹ️ 技术栈相对冷门，需考虑生态支持');
      }
    }
    
    // 任务可执行性 (25分)
    if (aiPrompts?.prompts) {
      const executablePrompts = aiPrompts.prompts.filter(prompt => 
        prompt.prompt && 
        prompt.prompt.length > 50 && 
        prompt.technicalRequirements
      );
      
      const executableRatio = executablePrompts.length / aiPrompts.prompts.length;
      score += Math.round(executableRatio * 25);
      
      if (executableRatio >= 0.8) {
        details.push('✅ 任务描述详细可执行');
      } else {
        criticalIssues.push('❌ 部分任务描述不够具体');
      }
    }
    
    // 时间估算合理性 (25分)
    if (aiPrompts?.totalEstimatedTime) {
      details.push('✅ 提供时间估算');
      score += 10;
    } else {
      criticalIssues.push('❌ 缺少时间估算');
    }
    
    const feedback = this.generateCategoryFeedback(score, '实用性');
    
    return {
      score: Math.max(0, Math.min(100, score)),
      level: this.getQualityLevel(score),
      feedback,
      details,
      criticalIssues
    };
  }
  
  /**
   * 评估清晰度
   */
  private static async evaluateClarity(
    planningData: any,
    visualizations: any,
    aiPrompts: any,
    config: EvaluationConfig
  ): Promise<QualityMetric> {
    let score = 40; // 基础分
    const details: string[] = [];
    const criticalIssues: string[] = [];
    
    // 规划描述清晰度 (30分)
    if (planningData) {
      const keyFields = ['productName', 'domainName', 'techStack'];
      const clearFields = keyFields.filter(field => 
        planningData[field] && planningData[field].length > 5
      );
      score += Math.round((clearFields.length / keyFields.length) * 30);
      
      if (clearFields.length >= 2) {
        details.push('✅ 项目信息清晰明确');
      } else {
        criticalIssues.push('❌ 项目信息不够清晰');
      }
    }
    
    // 图表清晰度 (35分)
    if (visualizations) {
      let validCharts = 0;
      let totalCharts = 0;
      
      Object.values(visualizations).forEach((chart: any) => {
        totalCharts++;
        if (chart.mermaidCode && 
            chart.title && 
            chart.description && 
            chart.mermaidCode.length > 50) {
          validCharts++;
        }
      });
      
      if (totalCharts > 0) {
        score += Math.round((validCharts / totalCharts) * 35);
        
        if (validCharts === totalCharts) {
          details.push('✅ 所有图表信息完整清晰');
        } else {
          criticalIssues.push('❌ 部分图表信息不完整');
        }
      }
    }
    
    // 任务描述清晰度 (35分)
    if (aiPrompts?.prompts) {
      const clearPrompts = aiPrompts.prompts.filter(prompt => 
        prompt.title && 
        prompt.category && 
        prompt.prompt && 
        prompt.prompt.length > 100
      );
      
      const clarityRatio = clearPrompts.length / aiPrompts.prompts.length;
      score += Math.round(clarityRatio * 35);
      
      if (clarityRatio >= 0.8) {
        details.push('✅ 任务描述清晰详细');
      } else {
        criticalIssues.push('❌ 部分任务描述不够清晰');
      }
    }
    
    const feedback = this.generateCategoryFeedback(score, '清晰度');
    
    return {
      score: Math.max(0, Math.min(100, score)),
      level: this.getQualityLevel(score),
      feedback,
      details,
      criticalIssues
    };
  }
  
  /**
   * 评估技术合理性
   */
  private static async evaluateTechnicalSoundness(
    planningData: any,
    visualizations: any,
    aiPrompts: any,
    config: EvaluationConfig
  ): Promise<QualityMetric> {
    let score = 50; // 基础分
    const details: string[] = [];
    const criticalIssues: string[] = [];
    
    // 技术栈一致性 (30分)
    if (planningData?.techStack) {
      const techStack = planningData.techStack.toLowerCase();
      
      // 检查前后端匹配
      const hasReactVue = techStack.includes('react') || techStack.includes('vue');
      const hasNodeExpress = techStack.includes('node') || techStack.includes('express');
      
      if (hasReactVue && hasNodeExpress) {
        score += 20;
        details.push('✅ 前后端技术栈匹配');
      } else if (hasReactVue || hasNodeExpress) {
        score += 10;
        details.push('ℹ️ 技术栈部分匹配');
      }
      
      // 检查数据库匹配
      if (planningData.database) {
        score += 10;
        details.push('✅ 数据库技术明确');
      }
    }
    
    // 架构图合理性 (40分)
    if (visualizations?.systemArchitecture?.mermaidCode) {
      const mermaidCode = visualizations.systemArchitecture.mermaidCode;
      
      // 基本语法检查
      if (mermaidCode.includes('graph') && mermaidCode.includes('-->')) {
        score += 20;
        details.push('✅ 架构图语法正确');
      } else {
        criticalIssues.push('❌ 架构图语法可能有误');
      }
      
      // 层次结构检查
      const hasLayers = ['前端', '后端', '数据'].some(layer => 
        mermaidCode.includes(layer) || mermaidCode.toLowerCase().includes(layer.toLowerCase())
      );
      
      if (hasLayers) {
        score += 20;
        details.push('✅ 架构分层清晰');
      } else {
        criticalIssues.push('❌ 架构分层不够清晰');
      }
    }
    
    // 技术任务合理性 (30分)
    if (aiPrompts?.prompts) {
      const techPrompts = aiPrompts.prompts.filter(prompt => 
        prompt.category && 
        ['技术架构', '后端开发', '前端开发', '数据库'].some(cat => 
          prompt.category.includes(cat)
        )
      );
      
      if (techPrompts.length >= 3) {
        score += 30;
        details.push('✅ 技术任务覆盖全面');
      } else {
        score += Math.round((techPrompts.length / 3) * 30);
        criticalIssues.push('❌ 技术任务覆盖不够全面');
      }
    }
    
    const feedback = this.generateCategoryFeedback(score, '技术合理性');
    
    return {
      score: Math.max(0, Math.min(100, score)),
      level: this.getQualityLevel(score),
      feedback,
      details,
      criticalIssues
    };
  }
  
  /**
   * 评估可实施性
   */
  private static async evaluateImplementability(
    aiPrompts: any,
    planningData: any,
    config: EvaluationConfig
  ): Promise<QualityMetric> {
    let score = 40; // 基础分
    const details: string[] = [];
    const criticalIssues: string[] = [];
    
    // 任务分解合理性 (40分)
    if (aiPrompts?.prompts) {
      const promptCount = aiPrompts.prompts.length;
      
      if (promptCount >= 8 && promptCount <= 15) {
        score += 30;
        details.push('✅ 任务分解粒度适中');
      } else if (promptCount >= 6) {
        score += 20;
        details.push('ℹ️ 任务分解基本合理');
      } else {
        score += 10;
        criticalIssues.push('❌ 任务分解过少，可能遗漏重要环节');
      }
      
      // 检查任务优先级
      const hasPriority = aiPrompts.prompts.some(prompt => prompt.priority);
      if (hasPriority) {
        score += 10;
        details.push('✅ 任务有优先级排序');
      }
    }
    
    // 依赖关系清晰度 (30分)
    if (aiPrompts?.prompts) {
      const withDependencies = aiPrompts.prompts.filter(prompt => 
        prompt.dependencies && prompt.dependencies !== '无'
      );
      
      if (withDependencies.length > 0) {
        score += 20;
        details.push('✅ 部分任务明确了依赖关系');
      }
      
      // 检查是否有执行顺序
      if (aiPrompts.executionOrder) {
        score += 10;
        details.push('✅ 有明确的执行顺序');
      }
    }
    
    // 资源需求明确性 (30分)
    if (planningData) {
      let resourceScore = 0;
      
      if (planningData.deployment) {
        resourceScore += 10;
        details.push('✅ 部署方案明确');
      }
      
      if (planningData.database) {
        resourceScore += 10;
        details.push('✅ 数据库方案明确');
      }
      
      if (planningData.authentication) {
        resourceScore += 10;
        details.push('✅ 认证方案明确');
      }
      
      score += resourceScore;
      
      if (resourceScore < 20) {
        criticalIssues.push('❌ 技术资源需求不够明确');
      }
    }
    
    const feedback = this.generateCategoryFeedback(score, '可实施性');
    
    return {
      score: Math.max(0, Math.min(100, score)),
      level: this.getQualityLevel(score),
      feedback,
      details,
      criticalIssues
    };
  }
  
  /**
   * 计算总体分数
   */
  private static calculateOverallScore(categories: ResultQualityAssessment['categories']): number {
    const weightedScore = 
      categories.completeness.score * this.CATEGORY_WEIGHTS.completeness +
      categories.practicality.score * this.CATEGORY_WEIGHTS.practicality +
      categories.clarity.score * this.CATEGORY_WEIGHTS.clarity +
      categories.technicalSoundness.score * this.CATEGORY_WEIGHTS.technicalSoundness +
      categories.implementability.score * this.CATEGORY_WEIGHTS.implementability;
    
    return Math.round(weightedScore);
  }
  
  /**
   * 识别优势
   */
  private static identifyStrengths(
    categories: ResultQualityAssessment['categories'],
    analysisData: any,
    planningData: any,
    visualizations: any,
    aiPrompts: any
  ): string[] {
    const strengths: string[] = [];
    
    // 基于分数识别优势
    Object.entries(categories).forEach(([key, category]) => {
      if (category.score >= 80) {
        strengths.push(`🌟 ${this.getCategoryName(key)}表现优秀 (${category.score}/100)`);
      }
    });
    
    // 特定优势检测
    if (aiPrompts?.prompts?.length >= 10) {
      strengths.push('📋 提供了丰富的实施任务，覆盖开发全流程');
    }
    
    if (visualizations && Object.keys(visualizations).length >= 3) {
      strengths.push('📊 架构可视化完整，有助于技术理解');
    }
    
    if (planningData?.techStack && planningData.techStack.length > 20) {
      strengths.push('💻 技术栈描述详细，技术选型明确');
    }
    
    if (analysisData?.businessViability?.monetizationModel) {
      strengths.push('💰 商业模式分析清晰，具备盈利可能');
    }
    
    return strengths.slice(0, 6); // 最多6个优势
  }
  
  /**
   * 识别弱点
   */
  private static identifyWeaknesses(
    categories: ResultQualityAssessment['categories'],
    analysisData: any,
    planningData: any,
    visualizations: any,
    aiPrompts: any
  ): string[] {
    const weaknesses: string[] = [];
    
    // 基于分数识别弱点
    Object.entries(categories).forEach(([key, category]) => {
      if (category.score < 60) {
        weaknesses.push(`⚠️ ${this.getCategoryName(key)}需要改进 (${category.score}/100)`);
      }
      
      // 添加关键问题
      category.criticalIssues.forEach(issue => {
        if (!weaknesses.includes(issue)) {
          weaknesses.push(issue);
        }
      });
    });
    
    // 特定弱点检测
    if (!analysisData?.targetUsers || analysisData.targetUsers.length < 20) {
      weaknesses.push('👥 目标用户分析不够深入');
    }
    
    if (!planningData?.deployment || planningData.deployment.includes('待定')) {
      weaknesses.push('🚀 部署方案不够具体');
    }
    
    if (aiPrompts?.prompts && aiPrompts.prompts.length < 6) {
      weaknesses.push('📝 实施任务数量不足，可能遗漏重要环节');
    }
    
    return weaknesses.slice(0, 8); // 最多8个弱点
  }
  
  /**
   * 生成改进建议
   */
  private static generateRecommendations(
    categories: ResultQualityAssessment['categories'],
    weaknesses: string[],
    config: EvaluationConfig
  ): string[] {
    const recommendations: string[] = [];
    
    // 基于类别分数生成建议
    if (categories.completeness.score < 70) {
      recommendations.push('📋 补充缺失的关键信息，确保规划的完整性');
    }
    
    if (categories.practicality.score < 70) {
      recommendations.push('🎯 增强方案的实用性，考虑实际应用场景');
    }
    
    if (categories.clarity.score < 70) {
      recommendations.push('🔍 提高描述的清晰度，减少歧义表达');
    }
    
    if (categories.technicalSoundness.score < 70) {
      recommendations.push('🔧 优化技术方案，确保架构的合理性');
    }
    
    if (categories.implementability.score < 70) {
      recommendations.push('⚡ 改进实施计划，提高项目的可执行性');
    }
    
    // 基于具体弱点的针对性建议
    if (weaknesses.some(w => w.includes('任务'))) {
      recommendations.push('📝 细化任务分解，增加实施步骤的详细说明');
    }
    
    if (weaknesses.some(w => w.includes('图表'))) {
      recommendations.push('📊 完善架构图表，确保技术设计的可视化');
    }
    
    if (weaknesses.some(w => w.includes('技术'))) {
      recommendations.push('💻 审查技术选型，确保技术栈的一致性和可行性');
    }
    
    // 通用建议
    if (config.strictMode) {
      recommendations.push('🎯 在严格模式下，建议所有维度达到75分以上');
    }
    
    recommendations.push('🔄 可以重新生成特定部分来改进整体质量');
    
    return [...new Set(recommendations)].slice(0, 6); // 去重并限制数量
  }
  
  /**
   * 评估生产就绪度
   */
  private static assessProductionReadiness(
    categories: ResultQualityAssessment['categories'],
    metadata: any
  ): number {
    let readiness = 0;
    
    // 基于各维度分数
    const avgScore = Object.values(categories).reduce((sum, cat) => sum + cat.score, 0) / 5;
    readiness += avgScore * 0.6; // 60%权重
    
    // 基于处理质量
    if (metadata?.qualityScore) {
      readiness += metadata.qualityScore * 0.2; // 20%权重
    }
    
    // 基于关键问题数量
    const totalIssues = Object.values(categories).reduce(
      (sum, cat) => sum + cat.criticalIssues.length, 0
    );
    const issuesPenalty = Math.min(totalIssues * 5, 20); // 每个问题扣5分，最多扣20分
    readiness -= issuesPenalty;
    
    // 基于完整性加分
    if (categories.completeness.score >= 80) {
      readiness += 10;
    }
    
    return Math.max(0, Math.min(100, Math.round(readiness)));
  }
  
  /**
   * 计算评估置信度
   */
  private static calculateConfidenceScore(
    categories: ResultQualityAssessment['categories'],
    metadata: any
  ): number {
    let confidence = 70; // 基础置信度
    
    // 基于数据完整性
    if (categories.completeness.score >= 80) {
      confidence += 15;
    } else if (categories.completeness.score < 50) {
      confidence -= 20;
    }
    
    // 基于处理时间（更长的处理时间通常意味着更好的结果）
    if (metadata?.processingTime) {
      const processingMinutes = metadata.processingTime / (1000 * 60);
      if (processingMinutes > 1) {
        confidence += 10;
      }
    }
    
    // 基于一致性（各维度分数差异）
    const scores = Object.values(categories).map(cat => cat.score);
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    const scoreDiff = maxScore - minScore;
    
    if (scoreDiff < 20) {
      confidence += 10; // 分数一致性高
    } else if (scoreDiff > 40) {
      confidence -= 10; // 分数差异大
    }
    
    return Math.max(30, Math.min(95, confidence));
  }
  
  /**
   * 生成质量报告
   */
  static generateQualityReport(assessment: ResultQualityAssessment): string {
    let report = `# 📊 开发计划质量评估报告\n\n`;
    
    // 总体评估
    report += `## 🎯 总体评估\n\n`;
    report += `| 评估项 | 评分 | 等级 |\n`;
    report += `|-------|------|------|\n`;
    report += `| 🏆 **总体质量** | ${assessment.overallScore}/100 | ${this.getQualityLevelEmoji(assessment.qualityLevel)} ${assessment.qualityLevel.toUpperCase()} |\n`;
    report += `| ✅ **可实施性** | ${assessment.isProducible ? '✅ 可以实施' : '❌ 需要改进'} | - |\n`;
    report += `| 🚀 **生产就绪** | ${assessment.productionReadiness}/100 | ${assessment.productionReadiness >= 75 ? '🌟 高' : assessment.productionReadiness >= 50 ? '📊 中' : '⚠️ 低'} |\n`;
    report += `| 🎪 **评估置信度** | ${assessment.confidenceScore}/100 | ${assessment.confidenceScore >= 80 ? '🔒 高置信' : '📊 中等置信'} |\n\n`;
    
    // 详细维度评估
    report += `## 📋 详细维度评估\n\n`;
    report += `| 评估维度 | 得分 | 等级 | 反馈 |\n`;
    report += `|---------|------|------|------|\n`;
    
    Object.entries(assessment.categories).forEach(([key, category]) => {
      const emoji = this.getCategoryEmoji(key);
      const levelEmoji = this.getQualityLevelEmoji(category.level);
      report += `| ${emoji} ${this.getCategoryName(key)} | ${category.score}/100 | ${levelEmoji} ${category.level} | ${category.feedback} |\n`;
    });
    
    report += `\n`;
    
    // 优势分析
    if (assessment.strengths.length > 0) {
      report += `## 🌟 方案优势\n\n`;
      assessment.strengths.forEach((strength, index) => {
        report += `${index + 1}. ${strength}\n`;
      });
      report += `\n`;
    }
    
    // 弱点分析
    if (assessment.weaknesses.length > 0) {
      report += `## ⚠️ 需要改进\n\n`;
      assessment.weaknesses.forEach((weakness, index) => {
        report += `${index + 1}. ${weakness}\n`;
      });
      report += `\n`;
    }
    
    // 改进建议
    if (assessment.recommendations.length > 0) {
      report += `## 💡 改进建议\n\n`;
      assessment.recommendations.forEach((recommendation, index) => {
        report += `${index + 1}. ${recommendation}\n`;
      });
      report += `\n`;
    }
    
    // 质量等级说明
    report += `## 📚 质量等级说明\n\n`;
    report += `- 🌟 **Excellent (85-100分)**: 方案完善，可直接投入开发\n`;
    report += `- ✅ **Good (70-84分)**: 方案良好，可在少量优化后实施\n`;
    report += `- 📊 **Satisfactory (55-69分)**: 方案基本可行，需要补充完善\n`;
    report += `- ⚠️ **Needs Improvement (0-54分)**: 方案需要重大改进\n\n`;
    
    // 下一步建议
    report += `## 🚀 下一步建议\n\n`;
    if (assessment.isProducible) {
      if (assessment.overallScore >= 85) {
        report += `🎉 **质量优秀**，可以直接开始开发实施！\n\n`;
      } else {
        report += `✅ **质量良好**，建议按照改进建议优化后开始实施\n\n`;
      }
      report += `📋 **实施步骤**：\n`;
      report += `1. 按优先级执行AI生成的开发任务\n`;
      report += `2. 定期回顾进度，调整实施计划\n`;
      report += `3. 关注弱点项目，持续改进\n\n`;
    } else {
      report += `⚠️ **需要改进**，建议优化后重新评估\n\n`;
      report += `🔧 **改进重点**：\n`;
      report += `1. 重点解决标识的关键问题\n`;
      report += `2. 补充缺失的重要信息\n`;
      report += `3. 优化技术方案的可行性\n\n`;
    }
    
    return report;
  }
  
  /**
   * 辅助方法
   */
  private static getQualityLevel(score: number): 'excellent' | 'good' | 'satisfactory' | 'needs_improvement' {
    if (score >= 85) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 55) return 'satisfactory';
    return 'needs_improvement';
  }
  
  private static getQualityLevelEmoji(level: string): string {
    const emojiMap = {
      excellent: '🌟',
      good: '✅',
      satisfactory: '📊',
      needs_improvement: '⚠️'
    };
    return emojiMap[level] || '❓';
  }
  
  private static getCategoryEmoji(category: string): string {
    const emojiMap = {
      completeness: '📋',
      practicality: '🎯',
      clarity: '🔍',
      technicalSoundness: '🔧',
      implementability: '⚡'
    };
    return emojiMap[category] || '📊';
  }
  
  private static getCategoryName(category: string): string {
    const nameMap = {
      completeness: '完整性',
      practicality: '实用性',
      clarity: '清晰度',
      technicalSoundness: '技术合理性',
      implementability: '可实施性'
    };
    return nameMap[category] || category;
  }
  
  private static generateCategoryFeedback(score: number, category: string): string {
    const level = this.getQualityLevel(score);
    const levelDescriptions = {
      excellent: '优秀',
      good: '良好',
      satisfactory: '基本满足',
      needs_improvement: '需要改进'
    };
    
    return `${category}${levelDescriptions[level]} (${score}分)`;
  }
}

export default ResultQualityEvaluator;