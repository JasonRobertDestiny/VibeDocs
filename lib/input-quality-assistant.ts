#!/usr/bin/env node

import { performanceMonitor } from './performance-monitor.js';

// 输入质量评估结果接口
export interface InputQualityAssessment {
  overallScore: number; // 总体质量分数 (0-100)
  isAcceptable: boolean; // 是否可接受
  qualityLevel: 'excellent' | 'good' | 'fair' | 'poor';
  categories: {
    clarity: QualityCategory;
    completeness: QualityCategory;
    specificity: QualityCategory;
    feasibility: QualityCategory;
    techDetail: QualityCategory;
  };
  suggestions: string[];
  warnings: string[];
  improvedVersion?: string; // AI建议的改进版本
  estimatedSuccessRate: number; // 预期成功率
}

// 质量类别评估
export interface QualityCategory {
  score: number; // 分数 (0-100)
  level: 'excellent' | 'good' | 'fair' | 'poor';
  feedback: string;
  suggestions: string[];
  examples?: string[];
}

// 输入验证配置
export interface ValidationConfig {
  strictMode: boolean; // 严格模式
  requireTechStack: boolean; // 要求指定技术栈
  minLength: number; // 最小长度
  maxLength: number; // 最大长度
  checkFeasibility: boolean; // 检查可行性
  provideSuggestions: boolean; // 提供改进建议
}

// 智能输入质量助手 - 提升用户输入质量，获得更好的AI规划结果
export class InputQualityAssistant {
  private static readonly DEFAULT_CONFIG: ValidationConfig = {
    strictMode: false,
    requireTechStack: false,
    minLength: 20,
    maxLength: 2000,
    checkFeasibility: true,
    provideSuggestions: true
  };
  
  // 质量检查关键词库
  private static readonly QUALITY_KEYWORDS = {
    // 高质量指标
    excellent: [
      '目标用户', '解决痛点', '核心功能', '商业模式', '技术架构',
      '用户体验', '市场需求', '竞争优势', '可扩展性', '安全性'
    ],
    good: [
      '用户', '功能', '需求', '问题', '解决', '平台', '系统',
      '界面', '数据', '管理', '服务', '应用'
    ],
    poor: [
      '做一个', '开发', '创建', '制作', '建设', '搭建',
      '简单', '基本', '普通', '一般'
    ]
  };
  
  // 技术栈关键词
  private static readonly TECH_KEYWORDS = [
    'react', 'vue', 'angular', 'nodejs', 'python', 'java', 'typescript',
    'javascript', 'go', 'rust', 'php', 'ruby', 'swift', 'kotlin',
    'mysql', 'postgresql', 'mongodb', 'redis', 'docker', 'kubernetes',
    'aws', 'azure', 'gcp', 'firebase', 'nextjs', 'nuxt', 'express'
  ];
  
  // 领域关键词
  private static readonly DOMAIN_KEYWORDS = {
    ecommerce: ['电商', '购物', '商城', '支付', '订单', '商品'],
    social: ['社交', '聊天', '交友', '分享', '评论', '点赞'],
    education: ['教育', '学习', '课程', '培训', '考试', '知识'],
    finance: ['金融', '支付', '银行', '投资', '理财', '贷款'],
    healthcare: ['医疗', '健康', '医院', '诊断', '药品', '病历'],
    productivity: ['办公', '管理', '协作', '效率', '任务', '项目'],
    entertainment: ['娱乐', '游戏', '视频', '音乐', '直播', '内容']
  };
  
  /**
   * 验证和评估用户输入质量
   */
  static async validateInput(
    idea: string,
    config: Partial<ValidationConfig> = {}
  ): Promise<InputQualityAssessment> {
    const timer = performanceMonitor.startTimer('input_validation', {
      inputLength: idea.length,
      strictMode: config.strictMode || false
    });
    
    try {
      const fullConfig = { ...this.DEFAULT_CONFIG, ...config };
      
      // 基础验证
      const basicValidation = this.performBasicValidation(idea, fullConfig);
      if (!basicValidation.isValid) {
        timer.stopWithResult(false, { reason: 'basic_validation_failed' });
        return this.createFailedAssessment(basicValidation.errors);
      }
      
      // 详细质量评估
      const qualityCategories = this.assessQualityCategories(idea, fullConfig);
      
      // 计算总体分数
      const overallScore = this.calculateOverallScore(qualityCategories);
      
      // 生成建议和警告
      const suggestions = this.generateSuggestions(idea, qualityCategories, fullConfig);
      const warnings = this.generateWarnings(idea, qualityCategories);
      
      // 评估成功率
      const estimatedSuccessRate = this.estimateSuccessRate(overallScore, qualityCategories);
      
      // 生成改进版本（可选）
      let improvedVersion: string | undefined;
      if (fullConfig.provideSuggestions && overallScore < 70) {
        improvedVersion = this.generateImprovedVersion(idea, suggestions);
      }
      
      const assessment: InputQualityAssessment = {
        overallScore,
        isAcceptable: overallScore >= (fullConfig.strictMode ? 70 : 50),
        qualityLevel: this.getQualityLevel(overallScore),
        categories: qualityCategories,
        suggestions,
        warnings,
        improvedVersion,
        estimatedSuccessRate
      };
      
      // 记录质量指标
      performanceMonitor.recordEvent('input_quality_validation', 1, {
        score: overallScore,
        isAcceptable: assessment.isAcceptable,
        qualityLevel: assessment.qualityLevel,
        suggestionsCount: suggestions.length
      });
      
      timer.stopWithResult(true, { score: overallScore });
      return assessment;
      
    } catch (error) {
      timer.stopWithResult(false, { error: error.message });
      throw new Error(`输入质量评估失败: ${error.message}`);
    }
  }
  
  /**
   * 基础输入验证
   */
  private static performBasicValidation(
    idea: string,
    config: ValidationConfig
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // 长度检查
    if (!idea || idea.trim().length === 0) {
      errors.push('输入不能为空');
    } else if (idea.trim().length < config.minLength) {
      errors.push(`输入过短，至少需要${config.minLength}个字符（当前${idea.trim().length}个）`);
    } else if (idea.trim().length > config.maxLength) {
      errors.push(`输入过长，最多${config.maxLength}个字符（当前${idea.trim().length}个）`);
    }
    
    // 内容检查
    const cleanIdea = idea.trim().toLowerCase();
    if (cleanIdea.length < 10) {
      errors.push('描述过于简单，请提供更详细的信息');
    }
    
    // 特殊字符检查
    const suspiciousChars = /[<>{}[\]\\|`~]/g;
    if (suspiciousChars.test(idea)) {
      errors.push('输入包含可能影响处理的特殊字符');
    }
    
    // 重复内容检查
    const words = cleanIdea.split(/\s+/);
    const uniqueWords = new Set(words);
    if (words.length > 10 && uniqueWords.size / words.length < 0.5) {
      errors.push('输入包含过多重复内容，请提供更丰富的描述');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * 质量类别评估
   */
  private static assessQualityCategories(
    idea: string,
    config: ValidationConfig
  ): InputQualityAssessment['categories'] {
    return {
      clarity: this.assessClarity(idea),
      completeness: this.assessCompleteness(idea),
      specificity: this.assessSpecificity(idea),
      feasibility: this.assessFeasibility(idea),
      techDetail: this.assessTechDetail(idea)
    };
  }
  
  /**
   * 评估清晰度
   */
  private static assessClarity(idea: string): QualityCategory {
    let score = 50; // 基础分
    const suggestions: string[] = [];
    
    // 句子结构分析
    const sentences = idea.split(/[。！？.!?]/).filter(s => s.trim().length > 0);
    if (sentences.length >= 3) {
      score += 15;
    } else {
      suggestions.push('建议分段描述，提高可读性');
    }
    
    // 逻辑连接词检查
    const logicalWords = ['因为', '所以', '但是', '然而', '并且', '以及', '首先', '其次', '最后'];
    const logicalCount = logicalWords.filter(word => idea.includes(word)).length;
    score += Math.min(logicalCount * 5, 20);
    
    if (logicalCount === 0) {
      suggestions.push('使用逻辑连接词可以使描述更清晰');
    }
    
    // 专业术语与通俗语言平衡
    const professionalWords = ['系统', '平台', '架构', '模块', '接口', '数据库'];
    const professionalCount = professionalWords.filter(word => idea.includes(word)).length;
    const casualWords = ['东西', '搞', '弄', '随便', '差不多'];
    const casualCount = casualWords.filter(word => idea.includes(word)).length;
    
    if (professionalCount > casualCount) {
      score += 10;
    } else if (casualCount > 2) {
      score -= 10;
      suggestions.push('减少口语化表达，使用更专业的术语');
    }
    
    const feedback = this.generateCategoryFeedback(score, '清晰度');
    
    return {
      score: Math.max(0, Math.min(100, score)),
      level: this.getQualityLevel(score),
      feedback,
      suggestions,
      examples: score < 60 ? [
        '优化前：做一个网站',
        '优化后：开发一个基于Web的在线教育平台，支持视频课程播放和学习进度追踪'
      ] : undefined
    };
  }
  
  /**
   * 评估完整性
   */
  private static assessCompleteness(idea: string): QualityCategory {
    let score = 30; // 基础分
    const suggestions: string[] = [];
    
    const essentialElements = [
      { keywords: ['用户', '客户', '使用者'], name: '目标用户', weight: 20 },
      { keywords: ['功能', '特性', '能力'], name: '核心功能', weight: 20 },
      { keywords: ['问题', '痛点', '需求', '挑战'], name: '解决问题', weight: 15 },
      { keywords: ['平台', '系统', '应用', '网站'], name: '产品形态', weight: 10 },
      { keywords: ['数据', '信息', '内容'], name: '数据处理', weight: 10 },
      { keywords: ['界面', 'UI', '交互', '体验'], name: '用户体验', weight: 10 },
      { keywords: ['管理', '运营', '维护'], name: '管理需求', weight: 8 },
      { keywords: ['安全', '权限', '认证'], name: '安全考虑', weight: 7 }
    ];
    
    const mentionedElements: string[] = [];
    const missingElements: string[] = [];
    
    essentialElements.forEach(element => {
      const mentioned = element.keywords.some(keyword => 
        idea.toLowerCase().includes(keyword)
      );
      
      if (mentioned) {
        score += element.weight;
        mentionedElements.push(element.name);
      } else {
        missingElements.push(element.name);
      }
    });
    
    // 生成建议
    if (missingElements.length > 0) {
      const priorityMissing = missingElements.slice(0, 3);
      suggestions.push(`建议补充以下关键信息：${priorityMissing.join('、')}`);
    }
    
    if (!idea.includes('为什么') && !idea.includes('原因')) {
      suggestions.push('说明项目的必要性和价值');
    }
    
    const feedback = this.generateCategoryFeedback(score, '完整性');
    
    return {
      score: Math.max(0, Math.min(100, score)),
      level: this.getQualityLevel(score),
      feedback,
      suggestions,
      examples: score < 60 ? [
        '完整描述应包含：目标用户、核心功能、解决的问题、预期价值'
      ] : undefined
    };
  }
  
  /**
   * 评估具体性
   */
  private static assessSpecificity(idea: string): QualityCategory {
    let score = 40; // 基础分
    const suggestions: string[] = [];
    
    // 检查具体数字和指标
    const numberPattern = /\d+/g;
    const numbers = idea.match(numberPattern);
    if (numbers && numbers.length > 0) {
      score += Math.min(numbers.length * 5, 20);
    } else {
      suggestions.push('提供具体的数字或指标（如用户量、功能数量等）');
    }
    
    // 检查具体场景描述
    const scenarioWords = ['场景', '情况', '例如', '比如', '当', '如果'];
    const scenarioCount = scenarioWords.filter(word => idea.includes(word)).length;
    score += Math.min(scenarioCount * 8, 25);
    
    if (scenarioCount === 0) {
      suggestions.push('描述具体的使用场景或示例');
    }
    
    // 检查模糊词汇
    const vagueWords = ['很多', '一些', '大量', '比较', '相对', '基本', '简单', '复杂'];
    const vagueCount = vagueWords.filter(word => idea.includes(word)).length;
    score -= vagueCount * 3;
    
    if (vagueCount > 2) {
      suggestions.push('减少模糊表达，使用更具体的描述');
    }
    
    // 检查行业术语
    const industryTerms = ['B2B', 'B2C', 'SaaS', 'API', 'SDK', 'CRM', 'ERP'];
    const industryCount = industryTerms.filter(term => 
      idea.toUpperCase().includes(term)
    ).length;
    score += Math.min(industryCount * 5, 15);
    
    const feedback = this.generateCategoryFeedback(score, '具体性');
    
    return {
      score: Math.max(0, Math.min(100, score)),
      level: this.getQualityLevel(score),
      feedback,
      suggestions,
      examples: score < 60 ? [
        '模糊描述：一个管理系统',
        '具体描述：一个支持1000+用户的在线项目管理系统，包含任务分配、进度跟踪、文件共享功能'
      ] : undefined
    };
  }
  
  /**
   * 评估可行性
   */
  private static assessFeasibility(idea: string): QualityCategory {
    let score = 70; // 默认较高，遇到问题才减分
    const suggestions: string[] = [];
    const warnings: string[] = [];
    
    // 检查过于复杂的需求
    const complexWords = ['AI', '人工智能', '机器学习', '区块链', 'VR', 'AR', '物联网'];
    const complexCount = complexWords.filter(word => 
      idea.includes(word) || idea.toUpperCase().includes(word)
    ).length;
    
    if (complexCount > 2) {
      score -= 20;
      suggestions.push('项目涉及多项前沿技术，建议分阶段实施');
      warnings.push('技术复杂度较高，开发周期可能较长');
    }
    
    // 检查规模估计
    const scaleIndicators = ['全球', '全国', '百万', '千万', '大型', '海量'];
    const scaleCount = scaleIndicators.filter(word => idea.includes(word)).length;
    
    if (scaleCount > 0) {
      score -= 15;
      suggestions.push('建议从MVP版本开始，逐步扩展规模');
    }
    
    // 检查资源需求
    const resourceWords = ['团队', '资金', '服务器', '云服务'];
    const resourceCount = resourceWords.filter(word => idea.includes(word)).length;
    
    if (resourceCount === 0) {
      suggestions.push('考虑项目所需的技术资源和人力配置');
    }
    
    // 检查时间要求
    const timeWords = ['立即', '马上', '紧急', '一周', '几天'];
    const hasUrgentTime = timeWords.some(word => idea.includes(word));
    
    if (hasUrgentTime) {
      score -= 25;
      warnings.push('时间要求过于紧迫，可能影响项目质量');
    }
    
    const feedback = this.generateCategoryFeedback(score, '可行性');
    
    return {
      score: Math.max(0, Math.min(100, score)),
      level: this.getQualityLevel(score),
      feedback,
      suggestions,
      examples: score < 60 ? [
        '过于复杂：基于AI的全球区块链社交平台',
        '更可行：本地社区的活动分享平台，支持基础社交功能'
      ] : undefined
    };
  }
  
  /**
   * 评估技术细节
   */
  private static assessTechDetail(idea: string): QualityCategory {
    let score = 30; // 基础分
    const suggestions: string[] = [];
    
    // 检查技术栈提及
    const techStackMentioned = this.TECH_KEYWORDS.some(tech => 
      idea.toLowerCase().includes(tech)
    );
    
    if (techStackMentioned) {
      score += 25;
    } else {
      suggestions.push('考虑指定偏好的技术栈（如React、Python等）');
    }
    
    // 检查架构相关词汇
    const archWords = ['架构', '前端', '后端', '数据库', '服务器', 'API', '接口'];
    const archCount = archWords.filter(word => idea.includes(word)).length;
    score += Math.min(archCount * 8, 30);
    
    if (archCount === 0) {
      suggestions.push('描述技术架构的基本考虑');
    }
    
    // 检查部署相关
    const deployWords = ['部署', '云服务', '服务器', '域名', '上线'];
    const deployCount = deployWords.filter(word => idea.includes(word)).length;
    score += Math.min(deployCount * 5, 15);
    
    if (deployCount === 0) {
      suggestions.push('考虑项目的部署和运行环境');
    }
    
    const feedback = this.generateCategoryFeedback(score, '技术细节');
    
    return {
      score: Math.max(0, Math.min(100, score)),
      level: this.getQualityLevel(score),
      feedback,
      suggestions,
      examples: score < 50 ? [
        '技术说明示例：使用React前端 + Node.js后端，部署在云服务器'
      ] : undefined
    };
  }
  
  /**
   * 计算总体分数
   */
  private static calculateOverallScore(categories: InputQualityAssessment['categories']): number {
    const weights = {
      clarity: 0.25,
      completeness: 0.30,
      specificity: 0.20,
      feasibility: 0.15,
      techDetail: 0.10
    };
    
    const weightedScore = 
      categories.clarity.score * weights.clarity +
      categories.completeness.score * weights.completeness +
      categories.specificity.score * weights.specificity +
      categories.feasibility.score * weights.feasibility +
      categories.techDetail.score * weights.techDetail;
    
    return Math.round(weightedScore);
  }
  
  /**
   * 生成改进建议
   */
  private static generateSuggestions(
    idea: string,
    categories: InputQualityAssessment['categories'],
    config: ValidationConfig
  ): string[] {
    const suggestions: string[] = [];
    
    // 收集各类别建议
    Object.values(categories).forEach(category => {
      suggestions.push(...category.suggestions);
    });
    
    // 添加通用建议
    if (categories.completeness.score < 60) {
      suggestions.push('🎯 建议添加：目标用户群体、核心价值、解决的具体问题');
    }
    
    if (categories.specificity.score < 60) {
      suggestions.push('📊 提供具体数据：用户规模、功能数量、预期目标');
    }
    
    if (categories.techDetail.score < 50) {
      suggestions.push('💻 说明技术偏好：编程语言、框架选择、部署方式');
    }
    
    // 去重并排序
    return [...new Set(suggestions)].slice(0, 8);
  }
  
  /**
   * 生成警告信息
   */
  private static generateWarnings(
    idea: string,
    categories: InputQualityAssessment['categories']
  ): string[] {
    const warnings: string[] = [];
    
    if (categories.feasibility.score < 50) {
      warnings.push('⚠️ 项目复杂度较高，建议分阶段实施');
    }
    
    if (categories.clarity.score < 40) {
      warnings.push('⚠️ 描述不够清晰，可能影响AI理解准确性');
    }
    
    if (categories.completeness.score < 40) {
      warnings.push('⚠️ 信息不完整，生成的计划可能缺乏针对性');
    }
    
    // 特殊情况检测
    if (idea.length < 50) {
      warnings.push('⚠️ 描述过于简短，建议提供更多细节');
    }
    
    const questionMarks = (idea.match(/[？?]/g) || []).length;
    if (questionMarks > 3) {
      warnings.push('⚠️ 疑问过多，建议先明确需求再提交');
    }
    
    return warnings;
  }
  
  /**
   * 估算成功率
   */
  private static estimateSuccessRate(
    overallScore: number,
    categories: InputQualityAssessment['categories']
  ): number {
    let successRate = overallScore;
    
    // 关键因素调整
    if (categories.completeness.score < 40) {
      successRate -= 15;
    }
    
    if (categories.feasibility.score < 30) {
      successRate -= 20;
    }
    
    if (categories.clarity.score < 30) {
      successRate -= 10;
    }
    
    return Math.max(20, Math.min(95, successRate));
  }
  
  /**
   * 生成改进版本
   */
  private static generateImprovedVersion(idea: string, suggestions: string[]): string {
    // 简单的改进版本生成逻辑
    let improved = idea;
    
    // 添加结构化提示
    if (!idea.includes('目标用户')) {
      improved += '\n\n目标用户：[请描述主要使用人群]';
    }
    
    if (!idea.includes('核心功能')) {
      improved += '\n核心功能：[请列出3-5个主要功能]';
    }
    
    if (!idea.includes('解决') && !idea.includes('问题')) {
      improved += '\n解决问题：[请说明要解决的具体痛点]';
    }
    
    return improved;
  }
  
  /**
   * 辅助方法
   */
  private static getQualityLevel(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (score >= 85) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
  }
  
  private static generateCategoryFeedback(score: number, category: string): string {
    const level = this.getQualityLevel(score);
    const levelDescriptions = {
      excellent: '优秀',
      good: '良好',
      fair: '一般',
      poor: '待改进'
    };
    
    return `${category}${levelDescriptions[level]} (${score}分)`;
  }
  
  private static createFailedAssessment(errors: string[]): InputQualityAssessment {
    return {
      overallScore: 0,
      isAcceptable: false,
      qualityLevel: 'poor',
      categories: {
        clarity: { score: 0, level: 'poor', feedback: '基础验证失败', suggestions: [] },
        completeness: { score: 0, level: 'poor', feedback: '基础验证失败', suggestions: [] },
        specificity: { score: 0, level: 'poor', feedback: '基础验证失败', suggestions: [] },
        feasibility: { score: 0, level: 'poor', feedback: '基础验证失败', suggestions: [] },
        techDetail: { score: 0, level: 'poor', feedback: '基础验证失败', suggestions: [] }
      },
      suggestions: [],
      warnings: errors,
      estimatedSuccessRate: 0
    };
  }
  
  /**
   * 批量验证多个输入
   */
  static async validateBatch(
    ideas: string[],
    config: Partial<ValidationConfig> = {}
  ): Promise<InputQualityAssessment[]> {
    const results: InputQualityAssessment[] = [];
    
    for (const idea of ideas) {
      const assessment = await this.validateInput(idea, config);
      results.push(assessment);
    }
    
    // 记录批量验证统计
    const averageScore = results.reduce((sum, r) => sum + r.overallScore, 0) / results.length;
    performanceMonitor.recordEvent('batch_input_validation', 1, {
      batchSize: ideas.length,
      averageScore: Math.round(averageScore),
      acceptableCount: results.filter(r => r.isAcceptable).length
    });
    
    return results;
  }
  
  /**
   * 生成质量报告
   */
  static generateQualityReport(assessment: InputQualityAssessment): string {
    let report = `# 📊 输入质量评估报告\n\n`;
    
    // 总体评分
    report += `## 🎯 总体评分\n\n`;
    report += `**质量分数**: ${assessment.overallScore}/100\n`;
    report += `**质量等级**: ${this.getQualityLevelEmoji(assessment.qualityLevel)} ${assessment.qualityLevel.toUpperCase()}\n`;
    report += `**是否可接受**: ${assessment.isAcceptable ? '✅ 是' : '❌ 否'}\n`;
    report += `**预期成功率**: ${assessment.estimatedSuccessRate}%\n\n`;
    
    // 详细分类评估
    report += `## 📋 详细评估\n\n`;
    report += `| 评估维度 | 分数 | 等级 | 反馈 |\n`;
    report += `|---------|------|------|------|\n`;
    
    Object.entries(assessment.categories).forEach(([key, category]) => {
      const emoji = this.getCategoryEmoji(key);
      const levelEmoji = this.getQualityLevelEmoji(category.level);
      report += `| ${emoji} ${this.getCategoryName(key)} | ${category.score}/100 | ${levelEmoji} ${category.level} | ${category.feedback} |\n`;
    });
    
    report += `\n`;
    
    // 改进建议
    if (assessment.suggestions.length > 0) {
      report += `## 💡 改进建议\n\n`;
      assessment.suggestions.forEach((suggestion, index) => {
        report += `${index + 1}. ${suggestion}\n`;
      });
      report += `\n`;
    }
    
    // 警告信息
    if (assessment.warnings.length > 0) {
      report += `## ⚠️ 注意事项\n\n`;
      assessment.warnings.forEach((warning, index) => {
        report += `${index + 1}. ${warning}\n`;
      });
      report += `\n`;
    }
    
    // 改进版本
    if (assessment.improvedVersion) {
      report += `## ✨ 建议改进版本\n\n`;
      report += `\`\`\`\n${assessment.improvedVersion}\n\`\`\`\n\n`;
    }
    
    // 质量提升建议
    report += `## 🚀 质量提升建议\n\n`;
    if (assessment.overallScore < 50) {
      report += `- 📝 **补充关键信息**: 目标用户、核心功能、解决的问题\n`;
      report += `- 🎯 **提高具体性**: 使用数字、例子、具体场景\n`;
      report += `- 💻 **说明技术需求**: 偏好的技术栈、部署要求\n`;
    } else if (assessment.overallScore < 70) {
      report += `- 🔍 **增加细节**: 提供更多具体的功能描述\n`;
      report += `- 📊 **量化指标**: 添加具体的数字和目标\n`;
      report += `- 🏗️ **架构考虑**: 说明技术架构偏好\n`;
    } else {
      report += `- 🎉 **质量良好**: 继续保持详细和准确的描述\n`;
      report += `- 🚀 **进一步优化**: 可以增加更多技术细节和场景描述\n`;
    }
    
    return report;
  }
  
  private static getQualityLevelEmoji(level: string): string {
    const emojiMap = {
      excellent: '🌟',
      good: '✅',
      fair: '📊',
      poor: '❌'
    };
    return emojiMap[level] || '❓';
  }
  
  private static getCategoryEmoji(category: string): string {
    const emojiMap = {
      clarity: '🔍',
      completeness: '📋',
      specificity: '🎯',
      feasibility: '⚖️',
      techDetail: '💻'
    };
    return emojiMap[category] || '📊';
  }
  
  private static getCategoryName(category: string): string {
    const nameMap = {
      clarity: '清晰度',
      completeness: '完整性',
      specificity: '具体性',
      feasibility: '可行性',
      techDetail: '技术细节'
    };
    return nameMap[category] || category;
  }
}

export default InputQualityAssistant;