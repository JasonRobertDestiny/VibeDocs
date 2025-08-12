#!/usr/bin/env node

/**
 * 文本特征提取器 - 聚焦MCP Server核心组件
 * 专注于AI规划质量预测的关键特征提取
 */

/**
 * 17维文本特征接口 - 魔搭挑战赛创新版
 * 全面升级的特征提取系统，支持多维度质量预测
 */
export interface TextFeatures {
  // 语义特征 (5维) - 语义理解和内容质量
  semanticDensity: number;          // 语义密度 - 关键概念的密集程度 (0-100)
  conceptCoverage: number;          // 概念覆盖度 - 涉及概念的广度和深度 (0-100)
  domainSpecificity: number;        // 领域特异性 - 专业术语和领域知识 (0-100)
  abstractionLevel: number;         // 抽象层次 - 从具体到抽象的层次分布 (0-100)
  coherenceScore: number;           // 连贯性分数 - 逻辑连贯性和一致性 (0-100)
  
  // 结构特征 (4维) - 文本组织和结构质量
  structuralCompleteness: number;   // 结构完整性 - 是否包含完整的项目要素 (0-100)
  logicalFlow: number;              // 逻辑流畅性 - 内容组织的逻辑性 (0-100)
  informationDensity: number;       // 信息密度 - 有效信息与总内容的比例 (0-100)
  organizationClarity: number;      // 组织清晰度 - 结构层次的清晰程度 (0-100)
  
  // 商业特征 (4维) - 商业价值和市场潜力
  businessViability: number;        // 商业可行性 - 商业模式的可行性 (0-100)
  marketPotential: number;          // 市场潜力 - 目标市场的规模和机会 (0-100)
  revenueClarity: number;           // 收入模式清晰度 - 盈利模式的明确性 (0-100)
  competitiveAdvantage: number;     // 竞争优势 - 相对于竞争对手的优势 (0-100)
  
  // 技术特征 (4维) - 技术实现和创新水平
  technicalFeasibility: number;    // 技术可行性 - 技术实现的难度和可能性 (0-100)
  implementationClarity: number;   // 实现清晰度 - 技术实现路径的明确性 (0-100)
  scalabilityPotential: number;    // 可扩展性 - 系统扩展和增长的潜力 (0-100)
  innovationLevel: number;          // 创新水平 - 技术创新和突破程度 (0-100)
  
  // 辅助分析数据 (用于调试和优化)
  metadata: {
    textLength: number;             // 文本长度
    wordCount: number;              // 词汇数量
    sentenceCount: number;          // 句子数量
    detectedDomain: string;         // 检测到的领域
    processingTime: number;         // 处理时间(ms)
    confidence: number;             // 整体置信度
  };
}

export class TextAnalyzer {
  // 技术关键词库
  private static readonly TECH_KEYWORDS = [
    // 编程语言
    'javascript', 'typescript', 'python', 'java', 'go', 'rust', 'php', 'ruby',
    'react', 'vue', 'angular', 'nodejs', 'express', 'nextjs', 'nuxt',
    // 数据库
    'mysql', 'postgresql', 'mongodb', 'redis', 'sqlite', 'elasticsearch',
    // 云服务
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'serverless',
    // 架构
    '架构', '前端', '后端', '数据库', '服务器', 'api', '接口', '微服务',
    '系统', '平台', '框架', '组件', '模块'
  ];
  
  // 商业关键词库
  private static readonly BUSINESS_KEYWORDS = [
    '商业模式', '盈利', '收入', '成本', '投资', '融资', '估值', '市场',
    '竞争', '优势', '客户', '用户', '需求', '痛点', '价值', '定价',
    '营销', '推广', '渠道', '合作', '运营', 'saas', 'b2b', 'b2c',
    '订阅', '付费', '免费', '增值', '广告', '佣金'
  ];
  
  // 用户相关关键词库
  private static readonly USER_KEYWORDS = [
    '用户', '客户', '使用者', '目标用户', '用户群体', '用户体验', 'ux', 'ui',
    '界面', '交互', '操作', '使用', '体验', '满意度', '反馈',
    '场景', '需求', '习惯', '行为', '偏好', '痛点'
  ];
  
  // 问题描述关键词库
  private static readonly PROBLEM_KEYWORDS = [
    '问题', '痛点', '困难', '挑战', '瓶颈', '限制', '不足', '缺陷',
    '需要', '缺少', '没有', '无法', '难以', '复杂', '低效', '浪费',
    '解决', '改善', '优化', '提升', '改进'
  ];
  
  // 解决方案关键词库
  private static readonly SOLUTION_KEYWORDS = [
    '解决方案', '方案', '策略', '方法', '技术', '工具', '系统', '平台',
    '功能', '特性', '能力', '服务', '产品', '应用', '软件', '网站',
    '实现', '开发', '构建', '创建', '设计', '提供'
  ];
  
  // 逻辑连接词库
  private static readonly LOGICAL_CONNECTORS = [
    '因为', '所以', '但是', '然而', '并且', '以及', '首先', '其次', '最后',
    '同时', '另外', '此外', '因此', '由于', '虽然', '尽管', '不过',
    'because', 'therefore', 'however', 'moreover', 'furthermore', 'although'
  ];
  
  // 领域关键词映射
  private static readonly DOMAIN_KEYWORDS = {
    ecommerce: ['电商', '购物', '商城', '支付', '订单', '商品', '库存', '物流'],
    social: ['社交', '聊天', '交友', '分享', '评论', '点赞', '关注', '动态'],
    education: ['教育', '学习', '课程', '培训', '考试', '知识', '教学', '学生'],
    finance: ['金融', '支付', '银行', '投资', '理财', '贷款', '保险', '风控'],
    healthcare: ['医疗', '健康', '医院', '诊断', '药品', '病历', '患者', '治疗'],
    productivity: ['办公', '管理', '协作', '效率', '任务', '项目', '团队', '工作流'],
    entertainment: ['娱乐', '游戏', '视频', '音乐', '直播', '内容', '媒体', '创作']
  };
  
  /**
   * 提取文本的17维特征 - 魔搭挑战赛创新版
   */
  static extractFeatures(text: string): TextFeatures {
    const startTime = Date.now();
    const cleanText = text.trim();
    
    // 基础统计
    const wordCount = this.countWords(cleanText);
    const sentenceCount = this.countSentences(cleanText);
    const textLength = cleanText.length;
    
    // 关键词分析
    const keywordAnalysis = this.analyzeKeywords(cleanText);
    const domainAnalysis = this.analyzeDomainSpecificity(cleanText);
    
    return {
      // 语义特征 (5维)
      semanticDensity: this.calculateSemanticDensity(cleanText, keywordAnalysis),
      conceptCoverage: this.calculateConceptCoverage(cleanText, keywordAnalysis),
      domainSpecificity: domainAnalysis,
      abstractionLevel: this.calculateAbstractionLevel(cleanText),
      coherenceScore: this.calculateCoherenceScore(cleanText),
      
      // 结构特征 (4维)
      structuralCompleteness: this.calculateStructuralCompleteness(cleanText, keywordAnalysis),
      logicalFlow: this.calculateLogicalFlow(cleanText),
      informationDensity: this.calculateInformationDensity(cleanText, wordCount),
      organizationClarity: this.calculateOrganizationClarity(cleanText),
      
      // 商业特征 (4维)
      businessViability: this.calculateBusinessViability(cleanText, keywordAnalysis),
      marketPotential: this.calculateMarketPotential(cleanText, keywordAnalysis),
      revenueClarity: this.calculateRevenueClarity(cleanText, keywordAnalysis),
      competitiveAdvantage: this.calculateCompetitiveAdvantage(cleanText, keywordAnalysis),
      
      // 技术特征 (4维)
      technicalFeasibility: this.calculateTechnicalFeasibility(cleanText, keywordAnalysis),
      implementationClarity: this.calculateImplementationClarity(cleanText, keywordAnalysis),
      scalabilityPotential: this.calculateScalabilityPotential(cleanText, keywordAnalysis),
      innovationLevel: this.calculateInnovationLevel(cleanText, keywordAnalysis),
      
      // 辅助分析数据
      metadata: {
        textLength,
        wordCount,
        sentenceCount,
        detectedDomain: 'general', // 简化处理，后续可以改进
        processingTime: Date.now() - startTime,
        confidence: this.calculateOverallConfidence(cleanText, keywordAnalysis)
      }
    };
  }
  
  /**
   * 计算单词数量
   */
  private static countWords(text: string): number {
    // 支持中英文混合文本
    const words = text.match(/[\u4e00-\u9fa5]|[a-zA-Z]+/g);
    return words ? words.length : 0;
  }
  
  /**
   * 计算句子数量
   */
  private static countSentences(text: string): number {
    const sentences = text.split(/[。！？.!?]+/).filter(s => s.trim().length > 0);
    return sentences.length;
  }
  
  /**
   * 计算平均每句话的单词数
   */
  private static calculateAvgWordsPerSentence(text: string): number {
    const wordCount = this.countWords(text);
    const sentenceCount = this.countSentences(text);
    return sentenceCount > 0 ? Math.round((wordCount / sentenceCount) * 10) / 10 : 0;
  }
  
  /**
   * 计算关键词密度分数（基于17维特征）
   */
  private static calculateKeywordDensityScore(text: string): number {
    const lowerText = text.toLowerCase();
    const totalWords = this.countWords(text);
    
    if (totalWords === 0) {
      return 0;
    }
    
    const technicalDensity = this.calculateDensity(lowerText, this.TECH_KEYWORDS, totalWords);
    const businessDensity = this.calculateDensity(lowerText, this.BUSINESS_KEYWORDS, totalWords);
    const userDensity = this.calculateDensity(lowerText, this.USER_KEYWORDS, totalWords);
    const problemDensity = this.calculateDensity(lowerText, this.PROBLEM_KEYWORDS, totalWords);
    const solutionDensity = this.calculateDensity(lowerText, this.SOLUTION_KEYWORDS, totalWords);
    
    // 返回综合密度分数
    return Math.round((technicalDensity + businessDensity + userDensity + problemDensity + solutionDensity) / 5);
  }
  
  /**
   * 计算特定关键词集合的密度
   */
  private static calculateDensity(text: string, keywords: string[], totalWords: number): number {
    let matchCount = 0;
    
    keywords.forEach(keyword => {
      const regex = new RegExp(keyword, 'gi');
      const matches = text.match(regex);
      if (matches) {
        matchCount += matches.length;
      }
    });
    
    return Math.round((matchCount / totalWords) * 1000) / 10; // 返回百分比，保留1位小数
  }
  
  /**
   * 分析句子复杂度分数
   */
  private static analyzeComplexityScore(text: string): number {
    const sentences = text.split(/[。！？.!?]+/).filter(s => s.trim().length > 0);
    const totalSentences = sentences.length;
    
    if (totalSentences === 0) {
      return 50; // 默认中等复杂度
    }
    
    // 平均句子长度
    const totalLength = sentences.reduce((sum, sentence) => sum + sentence.length, 0);
    const avgSentenceLength = Math.round(totalLength / totalSentences);
    
    // 复杂句比例（长度超过平均值1.5倍的句子）
    const complexSentences = sentences.filter(s => s.length > avgSentenceLength * 1.5);
    const complexSentenceRatio = Math.round((complexSentences.length / totalSentences) * 100);
    
    // 逻辑连接词数量
    const logicalConnectorCount = this.countLogicalConnectors(text);
    
    // 综合复杂度分数
    const complexityScore = Math.min(50 + complexSentenceRatio + (logicalConnectorCount * 2), 100);
    
    return complexityScore;
  }
  
  /**
   * 计算逻辑连接词数量
   */
  private static countLogicalConnectors(text: string): number {
    let count = 0;
    this.LOGICAL_CONNECTORS.forEach(connector => {
      const regex = new RegExp(connector, 'gi');
      const matches = text.match(regex);
      if (matches) {
        count += matches.length;
      }
    });
    return count;
  }
  
  /**
   * 分析领域特异性
   */
  private static analyzeDomainSpecificity(text: string): TextFeatures['domainSpecificity'] {
    const lowerText = text.toLowerCase();
    const domainScores: Record<string, number> = {};
    
    // 计算每个领域的匹配分数
    Object.entries(this.DOMAIN_KEYWORDS).forEach(([domain, keywords]) => {
      let score = 0;
      keywords.forEach(keyword => {
        if (lowerText.includes(keyword)) {
          score += 1;
        }
      });
      domainScores[domain] = score;
    });
    
    // 找到最高分的领域
    const maxScore = Math.max(...Object.values(domainScores));
    const detectedDomain = Object.keys(domainScores).find(
      domain => domainScores[domain] === maxScore
    ) || 'general';
    
    // 计算置信度（基于最高分与总关键词数的比例）
    const totalKeywords = Object.values(this.DOMAIN_KEYWORDS).flat().length;
    const confidence = maxScore > 0 ? Math.round((maxScore / totalKeywords) * 100) : 0;
    
    return maxScore;
  }
  
  /**
   * 分析质量指标分数
   */
  private static analyzeQualityIndicatorsScore(text: string): number {
    const lowerText = text.toLowerCase();
    let score = 0;
    
    // 包含数字（+10分）
    if (/\d+/.test(text)) score += 10;
    
    // 包含示例（+15分）
    if (/例如|比如|举例|示例|如：|例：/.test(text)) score += 15;
    
    // 提及目标用户（+20分）
    if (this.USER_KEYWORDS.some(keyword => lowerText.includes(keyword))) score += 20;
    
    // 提及技术栈（+25分）
    if (this.TECH_KEYWORDS.some(keyword => lowerText.includes(keyword))) score += 25;
    
    // 提及商业模式（+30分）
    if (this.BUSINESS_KEYWORDS.some(keyword => lowerText.includes(keyword))) score += 30;
    
    return Math.min(score, 100);
  }
  
  // ==================== 17维特征计算方法 ====================
  
  /**
   * 分析关键词 - 统一的关键词分析方法
   */
  private static analyzeKeywords(text: string) {
    const lowerText = text.toLowerCase();
    const totalWords = this.countWords(text);
    
    return {
      technical: this.calculateDensity(lowerText, this.TECH_KEYWORDS, totalWords),
      business: this.calculateDensity(lowerText, this.BUSINESS_KEYWORDS, totalWords),
      user: this.calculateDensity(lowerText, this.USER_KEYWORDS, totalWords),
      problem: this.calculateDensity(lowerText, this.PROBLEM_KEYWORDS, totalWords),
      solution: this.calculateDensity(lowerText, this.SOLUTION_KEYWORDS, totalWords),
      totalWords
    };
  }
  
  // ========== 语义特征 (5维) ==========
  
  /**
   * 计算语义密度 - 关键概念的密集程度
   */
  private static calculateSemanticDensity(text: string, keywordAnalysis: any): number {
    const totalDensity = keywordAnalysis.technical + keywordAnalysis.business + 
                        keywordAnalysis.user + keywordAnalysis.problem + keywordAnalysis.solution;
    
    // 语义密度 = 总关键词密度 * 长度调节因子
    const lengthFactor = Math.min(text.length / 500, 1); // 500字符为基准
    return Math.min(Math.round(totalDensity * lengthFactor * 2), 100);
  }
  
  /**
   * 计算概念覆盖度 - 涉及概念的广度和深度
   */
  private static calculateConceptCoverage(text: string, keywordAnalysis: any): number {
    const conceptAreas = [
      keywordAnalysis.technical > 0,
      keywordAnalysis.business > 0,
      keywordAnalysis.user > 0,
      keywordAnalysis.problem > 0,
      keywordAnalysis.solution > 0
    ];
    
    const coverageCount = conceptAreas.filter(Boolean).length;
    const baseCoverage = (coverageCount / 5) * 100;
    
    // 深度调节：每个领域的密度越高，覆盖度越高
    const depthBonus = Math.min(
      (keywordAnalysis.technical + keywordAnalysis.business + keywordAnalysis.user) / 3,
      20
    );
    
    return Math.min(Math.round(baseCoverage + depthBonus), 100);
  }
  
  /**
   * 计算抽象层次 - 从具体到抽象的层次分布
   */
  private static calculateAbstractionLevel(text: string): number {
    const abstractWords = ['概念', '理念', '思想', '原理', '模式', '框架', '体系', '策略', '方法论'];
    const concreteWords = ['具体', '实现', '代码', '功能', '界面', '按钮', '页面', '数据库', '服务器'];
    
    const abstractCount = this.countKeywordMatches(text, abstractWords);
    const concreteCount = this.countKeywordMatches(text, concreteWords);
    const totalCount = abstractCount + concreteCount;
    
    if (totalCount === 0) return 50; // 中等抽象层次
    
    // 抽象词比例越高，抽象层次越高
    const abstractRatio = abstractCount / totalCount;
    return Math.round(abstractRatio * 100);
  }
  
  /**
   * 计算连贯性分数 - 逻辑连贯性和一致性
   */
  private static calculateCoherenceScore(text: string): number {
    const sentences = text.split(/[。！？.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length < 2) return 60;
    
    // 逻辑连接词数量
    const connectorCount = this.countLogicalConnectors(text);
    const connectorScore = Math.min((connectorCount / sentences.length) * 100, 40);
    
    // 重复关键词（表示主题一致性）
    const keywordConsistency = this.calculateKeywordConsistency(text);
    
    // 句子长度变化（过于单调会降低连贯性）
    const lengthVariation = this.calculateSentenceLengthVariation(sentences);
    
    return Math.round(connectorScore + keywordConsistency + lengthVariation);
  }
  
  // ========== 结构特征 (4维) ==========
  
  /**
   * 计算结构完整性 - 是否包含完整的项目要素
   */
  private static calculateStructuralCompleteness(text: string, keywordAnalysis: any): number {
    const requiredElements = [
      keywordAnalysis.problem > 0,     // 问题描述
      keywordAnalysis.solution > 0,    // 解决方案
      keywordAnalysis.technical > 0,   // 技术方案
      keywordAnalysis.user > 0,        // 用户相关
      keywordAnalysis.business > 0     // 商业考虑
    ];
    
    const completeness = requiredElements.filter(Boolean).length / 5;
    
    // 额外检查项目规划要素
    const hasGoals = /目标|目的|愿景/.test(text);
    const hasTimeline = /时间|周期|阶段|计划/.test(text);
    const hasResources = /资源|成本|预算|人员/.test(text);
    
    const extraElements = [hasGoals, hasTimeline, hasResources].filter(Boolean).length;
    const bonus = (extraElements / 3) * 20;
    
    return Math.min(Math.round(completeness * 80 + bonus), 100);
  }
  
  /**
   * 计算逻辑流畅性 - 内容组织的逻辑性
   */
  private static calculateLogicalFlow(text: string): number {
    const sentences = text.split(/[。！？.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length < 3) return 50;
    
    // 检查逻辑顺序词
    const sequenceWords = ['首先', '其次', '然后', '最后', '第一', '第二', '第三', 'first', 'second', 'finally'];
    const sequenceCount = this.countKeywordMatches(text, sequenceWords);
    const sequenceScore = Math.min((sequenceCount / sentences.length) * 200, 30);
    
    // 检查因果关系词
    const causalWords = ['因为', '所以', '因此', '由于', '导致', 'because', 'therefore', 'thus'];
    const causalCount = this.countKeywordMatches(text, causalWords);
    const causalScore = Math.min((causalCount / sentences.length) * 200, 30);
    
    // 段落结构（假设用换行分段）
    const paragraphs = text.split('\n').filter(p => p.trim().length > 0);
    const structureScore = paragraphs.length > 1 ? 40 : 20;
    
    return Math.round(sequenceScore + causalScore + structureScore);
  }
  
  /**
   * 计算信息密度 - 有效信息与总内容的比例
   */
  private static calculateInformationDensity(text: string, wordCount: number): number {
    if (wordCount === 0) return 0;
    
    // 计算信息词汇（非停用词）
    const stopWords = ['的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const words = text.match(/[\u4e00-\u9fa5]+|[a-zA-Z]+/g) || [];
    const informativeWords = words.filter(word => !stopWords.includes(word.toLowerCase()));
    
    const informationRatio = informativeWords.length / wordCount;
    
    // 数字和具体数据的加分
    const numberCount = (text.match(/\d+/g) || []).length;
    const numberBonus = Math.min(numberCount * 2, 20);
    
    return Math.min(Math.round(informationRatio * 80 + numberBonus), 100);
  }
  
  /**
   * 计算组织清晰度 - 结构层次的清晰程度
   */
  private static calculateOrganizationClarity(text: string): number {
    let score = 0;
    
    // 标题和分段
    const hasHeaders = /^#|^\d+\.|^[一二三四五六七八九十]+[、.]/.test(text);
    if (hasHeaders) score += 30;
    
    // 列表结构
    const hasList = /^[-*•]\s|^\d+\.\s/m.test(text);
    if (hasList) score += 25;
    
    // 段落分隔
    const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
    if (paragraphs.length > 1) score += 25;
    
    // 长度适中的段落
    const avgParagraphLength = text.length / Math.max(paragraphs.length, 1);
    if (avgParagraphLength > 50 && avgParagraphLength < 500) score += 20;
    
    return Math.min(score, 100);
  }
  
  // ========== 商业特征 (4维) ==========
  
  /**
   * 计算商业可行性 - 商业模式的可行性
   */
  private static calculateBusinessViability(text: string, keywordAnalysis: any): number {
    let score = keywordAnalysis.business * 2; // 基础商业关键词分数
    
    // 商业模式要素检查
    const hasRevenueModel = /收入|盈利|付费|订阅|广告|佣金/.test(text);
    const hasTargetMarket = /市场|客户|用户群体|目标/.test(text);
    const hasCompetition = /竞争|对手|优势|差异化/.test(text);
    const hasCostStructure = /成本|投入|资源|预算/.test(text);
    
    const businessElements = [hasRevenueModel, hasTargetMarket, hasCompetition, hasCostStructure];
    const elementScore = businessElements.filter(Boolean).length * 15;
    
    return Math.min(Math.round(score + elementScore), 100);
  }
  
  /**
   * 计算市场潜力 - 目标市场的规模和机会
   */
  private static calculateMarketPotential(text: string, keywordAnalysis: any): number {
    let score = 0;
    
    // 市场规模指标
    const hasMarketSize = /市场规模|用户数量|潜在客户|市场份额/.test(text);
    if (hasMarketSize) score += 25;
    
    // 增长趋势
    const hasGrowth = /增长|扩展|发展|趋势|机会/.test(text);
    if (hasGrowth) score += 20;
    
    // 用户需求强度
    const userScore = keywordAnalysis.user * 2;
    score += Math.min(userScore, 25);
    
    // 问题紧迫性
    const problemScore = keywordAnalysis.problem * 2;
    score += Math.min(problemScore, 30);
    
    return Math.min(Math.round(score), 100);
  }
  
  /**
   * 计算收入模式清晰度 - 盈利模式的明确性
   */
  private static calculateRevenueClarity(text: string, keywordAnalysis: any): number {
    const revenueKeywords = ['订阅', '付费', '广告', '佣金', '授权', '服务费', '会员', '增值服务'];
    const revenueCount = this.countKeywordMatches(text, revenueKeywords);
    
    let score = Math.min(revenueCount * 20, 60);
    
    // 具体数字和金额
    const hasNumbers = /\d+.*[元美金dollar$¥]|\d+.*万|million|billion/.test(text);
    if (hasNumbers) score += 25;
    
    // 定价策略
    const hasPricing = /定价|价格|免费|收费标准/.test(text);
    if (hasPricing) score += 15;
    
    return Math.min(Math.round(score), 100);
  }
  
  /**
   * 计算竞争优势 - 相对于竞争对手的优势
   */
  private static calculateCompetitiveAdvantage(text: string, keywordAnalysis: any): number {
    let score = 0;
    
    // 差异化要素
    const differentiationWords = ['独特', '创新', '首创', '领先', '优势', '特色', '差异化'];
    const diffCount = this.countKeywordMatches(text, differentiationWords);
    score += Math.min(diffCount * 15, 45);
    
    // 技术优势
    const techAdvantage = keywordAnalysis.technical > 5 ? 25 : keywordAnalysis.technical * 5;
    score += techAdvantage;
    
    // 竞争分析
    const hasCompetitorAnalysis = /竞争对手|竞品|对比|优于/.test(text);
    if (hasCompetitorAnalysis) score += 30;
    
    return Math.min(Math.round(score), 100);
  }
  
  // ========== 技术特征 (4维) ==========
  
  /**
   * 计算技术可行性 - 技术实现的难度和可能性
   */
  private static calculateTechnicalFeasibility(text: string, keywordAnalysis: any): number {
    let score = keywordAnalysis.technical * 3; // 基础技术关键词分数
    
    // 成熟技术栈
    const matureTech = ['react', 'vue', 'nodejs', 'python', 'java', 'mysql', 'mongodb'];
    const matureCount = this.countKeywordMatches(text, matureTech);
    score += Math.min(matureCount * 10, 30);
    
    // 实现复杂度评估（复杂度越高，可行性相对降低）
    const complexTech = ['ai', '人工智能', '机器学习', '区块链', '大数据', 'blockchain'];
    const complexCount = this.countKeywordMatches(text, complexTech);
    const complexityPenalty = Math.min(complexCount * 5, 20);
    
    // 具体实现描述
    const hasImplementation = /实现|开发|构建|搭建|部署/.test(text);
    if (hasImplementation) score += 15;
    
    return Math.min(Math.max(Math.round(score - complexityPenalty), 20), 100);
  }
  
  /**
   * 计算实现清晰度 - 技术实现路径的明确性
   */
  private static calculateImplementationClarity(text: string, keywordAnalysis: any): number {
    let score = 0;
    
    // 技术栈明确性
    const techStackScore = Math.min(keywordAnalysis.technical * 4, 40);
    score += techStackScore;
    
    // 架构描述
    const hasArchitecture = /架构|设计|模块|组件|接口|api/.test(text);
    if (hasArchitecture) score += 25;
    
    // 开发步骤
    const hasSteps = /步骤|阶段|流程|计划|roadmap/.test(text);
    if (hasSteps) score += 20;
    
    // 具体技术细节
    const hasDetails = /数据库|服务器|前端|后端|部署/.test(text);
    if (hasDetails) score += 15;
    
    return Math.min(Math.round(score), 100);
  }
  
  /**
   * 计算可扩展性 - 系统扩展和增长的潜力
   */
  private static calculateScalabilityPotential(text: string, keywordAnalysis: any): number {
    let score = 0;
    
    // 可扩展性关键词
    const scalabilityWords = ['扩展', '扩容', '伸缩', '集群', '分布式', '微服务', '云服务'];
    const scalabilityCount = this.countKeywordMatches(text, scalabilityWords);
    score += Math.min(scalabilityCount * 20, 60);
    
    // 云原生技术
    const cloudWords = ['docker', 'kubernetes', 'serverless', '容器', '云原生'];
    const cloudCount = this.countKeywordMatches(text, cloudWords);
    score += Math.min(cloudCount * 15, 30);
    
    // 模块化设计
    const modularWords = ['模块', '组件', '插件', '中间件', 'api'];
    const modularCount = this.countKeywordMatches(text, modularWords);
    score += Math.min(modularCount * 5, 10);
    
    return Math.min(Math.round(score), 100);
  }
  
  /**
   * 计算创新水平 - 技术创新和突破程度
   */
  private static calculateInnovationLevel(text: string, keywordAnalysis: any): number {
    let score = 0;
    
    // 创新关键词
    const innovationWords = ['创新', '突破', '首创', '原创', '新颖', '前沿', '领先'];
    const innovationCount = this.countKeywordMatches(text, innovationWords);
    score += Math.min(innovationCount * 15, 45);
    
    // 新兴技术
    const emergingTech = ['ai', '人工智能', '机器学习', '区块链', 'vr', 'ar', '物联网', 'iot'];
    const emergingCount = this.countKeywordMatches(text, emergingTech);
    score += Math.min(emergingCount * 12, 36);
    
    // 技术组合创新
    const techDiversity = keywordAnalysis.technical > 8 ? 19 : keywordAnalysis.technical * 2;
    score += techDiversity;
    
    return Math.min(Math.round(score), 100);
  }
  
  // ========== 辅助方法 ==========
  
  /**
   * 计算关键词匹配数量
   */
  private static countKeywordMatches(text: string, keywords: string[]): number {
    const lowerText = text.toLowerCase();
    let count = 0;
    keywords.forEach(keyword => {
      if (lowerText.includes(keyword.toLowerCase())) {
        count++;
      }
    });
    return count;
  }
  
  /**
   * 计算关键词一致性
   */
  private static calculateKeywordConsistency(text: string): number {
    const sentences = text.split(/[。！？.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length < 2) return 20;
    
    // 简化的一致性计算：检查重要词汇在多个句子中的出现
    const importantWords = text.match(/[\u4e00-\u9fa5]{2,}|[a-zA-Z]{4,}/g) || [];
    const wordFreq: Record<string, number> = {};
    
    importantWords.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });
    
    const repeatedWords = Object.values(wordFreq).filter(freq => freq > 1).length;
    return Math.min((repeatedWords / sentences.length) * 40, 30);
  }
  
  /**
   * 计算句子长度变化
   */
  private static calculateSentenceLengthVariation(sentences: string[]): number {
    if (sentences.length < 2) return 10;
    
    const lengths = sentences.map(s => s.length);
    const avgLength = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
    const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / lengths.length;
    const stdDev = Math.sqrt(variance);
    
    // 适度的变化是好的，过于单调或过于混乱都不好
    const variationScore = Math.min(stdDev / avgLength * 100, 30);
    return Math.round(variationScore);
  }
  
  /**
   * 计算整体置信度
   */
  private static calculateOverallConfidence(text: string, keywordAnalysis: any): number {
    const textLength = text.length;
    const wordCount = keywordAnalysis.totalWords;
    
    // 基于文本长度的置信度
    let confidence = 50;
    if (textLength > 100) confidence += 20;
    if (textLength > 300) confidence += 15;
    if (textLength > 500) confidence += 10;
    
    // 基于关键词覆盖的置信度
    const totalKeywordDensity = keywordAnalysis.technical + keywordAnalysis.business + 
                               keywordAnalysis.user + keywordAnalysis.problem + keywordAnalysis.solution;
    confidence += Math.min(totalKeywordDensity, 15);
    
    return Math.min(Math.round(confidence), 100);
  }

  /**
   * 生成特征摘要报告
   */
  static generateFeatureSummary(features: TextFeatures): string {
    let summary = `📊 文本特征分析报告\n\n`;
    
    // 基础信息
    summary += `**基础信息**\n`;
    summary += `- 文本长度: ${features.metadata.textLength} 字符\n`;
    summary += `- 单词数量: ${features.metadata.wordCount}\n`;
    summary += `- 句子数量: ${features.metadata.sentenceCount}\n`;
    summary += `- 检测领域: ${features.metadata.detectedDomain}\n\n`;
    
    // 语义特征
    summary += `**语义特征**\n`;
    summary += `- 语义密度: ${features.semanticDensity}/100\n`;
    summary += `- 概念覆盖度: ${features.conceptCoverage}/100\n`;
    summary += `- 领域特异性: ${features.domainSpecificity}/100\n`;
    summary += `- 抽象层次: ${features.abstractionLevel}/100\n`;
    summary += `- 连贯性分数: ${features.coherenceScore}/100\n\n`;
    
    // 结构特征
    summary += `**结构特征**\n`;
    summary += `- 结构完整性: ${features.structuralCompleteness}/100\n`;
    summary += `- 逻辑流畅性: ${features.logicalFlow}/100\n`;
    summary += `- 信息密度: ${features.informationDensity}/100\n`;
    summary += `- 组织清晰度: ${features.organizationClarity}/100\n\n`;
    
    // 商业特征
    summary += `**商业特征**\n`;
    summary += `- 商业可行性: ${features.businessViability}/100\n`;
    summary += `- 市场潜力: ${features.marketPotential}/100\n`;
    summary += `- 收入模式清晰度: ${features.revenueClarity}/100\n`;
    summary += `- 竞争优势: ${features.competitiveAdvantage}/100\n\n`;
    
    // 技术特征
    summary += `**技术特征**\n`;
    summary += `- 技术可行性: ${features.technicalFeasibility}/100\n`;
    summary += `- 实现清晰度: ${features.implementationClarity}/100\n`;
    summary += `- 可扩展性: ${features.scalabilityPotential}/100\n`;
    summary += `- 创新水平: ${features.innovationLevel}/100\n`;
    
    return summary;
  }
}

export default TextAnalyzer;