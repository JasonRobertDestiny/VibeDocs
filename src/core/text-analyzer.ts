#!/usr/bin/env node

/**
 * 文本特征提取器 - 聚焦MCP Server核心组件
 * 专注于AI规划质量预测的关键特征提取
 */

// 文本特征接口
export interface TextFeatures {
  // 基础特征
  length: number;
  wordCount: number;
  sentenceCount: number;
  avgWordsPerSentence: number;
  
  // 关键词密度
  keywordDensity: {
    technical: number;      // 技术关键词密度
    business: number;       // 商业关键词密度
    user: number;          // 用户相关关键词密度
    problem: number;       // 问题描述关键词密度
    solution: number;      // 解决方案关键词密度
  };
  
  // 句子复杂度
  complexity: {
    avgSentenceLength: number;
    complexSentenceRatio: number;  // 复杂句比例
    logicalConnectorCount: number; // 逻辑连接词数量
    questionRatio: number;         // 疑问句比例
  };
  
  // 领域特异性
  domainSpecificity: {
    score: number;           // 领域专业度评分
    detectedDomain: string;  // 检测到的领域
    confidence: number;      // 检测置信度
  };
  
  // 质量指标
  qualityIndicators: {
    hasNumbers: boolean;        // 包含数字
    hasExamples: boolean;       // 包含示例
    hasTargetUsers: boolean;    // 提及目标用户
    hasTechStack: boolean;      // 提及技术栈
    hasBusinessModel: boolean;  // 提及商业模式
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
   * 提取文本的所有特征
   */
  static extractFeatures(text: string): TextFeatures {
    const cleanText = text.trim();
    
    return {
      // 基础特征
      length: cleanText.length,
      wordCount: this.countWords(cleanText),
      sentenceCount: this.countSentences(cleanText),
      avgWordsPerSentence: this.calculateAvgWordsPerSentence(cleanText),
      
      // 关键词密度
      keywordDensity: this.calculateKeywordDensity(cleanText),
      
      // 句子复杂度
      complexity: this.analyzeComplexity(cleanText),
      
      // 领域特异性
      domainSpecificity: this.analyzeDomainSpecificity(cleanText),
      
      // 质量指标
      qualityIndicators: this.analyzeQualityIndicators(cleanText)
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
   * 计算关键词密度
   */
  private static calculateKeywordDensity(text: string): TextFeatures['keywordDensity'] {
    const lowerText = text.toLowerCase();
    const totalWords = this.countWords(text);
    
    if (totalWords === 0) {
      return { technical: 0, business: 0, user: 0, problem: 0, solution: 0 };
    }
    
    return {
      technical: this.calculateDensity(lowerText, this.TECH_KEYWORDS, totalWords),
      business: this.calculateDensity(lowerText, this.BUSINESS_KEYWORDS, totalWords),
      user: this.calculateDensity(lowerText, this.USER_KEYWORDS, totalWords),
      problem: this.calculateDensity(lowerText, this.PROBLEM_KEYWORDS, totalWords),
      solution: this.calculateDensity(lowerText, this.SOLUTION_KEYWORDS, totalWords)
    };
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
   * 分析句子复杂度
   */
  private static analyzeComplexity(text: string): TextFeatures['complexity'] {
    const sentences = text.split(/[。！？.!?]+/).filter(s => s.trim().length > 0);
    const totalSentences = sentences.length;
    
    if (totalSentences === 0) {
      return { avgSentenceLength: 0, complexSentenceRatio: 0, logicalConnectorCount: 0, questionRatio: 0 };
    }
    
    // 平均句子长度
    const totalLength = sentences.reduce((sum, sentence) => sum + sentence.length, 0);
    const avgSentenceLength = Math.round(totalLength / totalSentences);
    
    // 复杂句比例（长度超过平均值1.5倍的句子）
    const complexSentences = sentences.filter(s => s.length > avgSentenceLength * 1.5);
    const complexSentenceRatio = Math.round((complexSentences.length / totalSentences) * 100);
    
    // 逻辑连接词数量
    const logicalConnectorCount = this.countLogicalConnectors(text);
    
    // 疑问句比例
    const questionSentences = text.match(/[？?]/g);
    const questionRatio = questionSentences ? Math.round((questionSentences.length / totalSentences) * 100) : 0;
    
    return {
      avgSentenceLength,
      complexSentenceRatio,
      logicalConnectorCount,
      questionRatio
    };
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
    
    return {
      score: maxScore,
      detectedDomain,
      confidence
    };
  }
  
  /**
   * 分析质量指标
   */
  private static analyzeQualityIndicators(text: string): TextFeatures['qualityIndicators'] {
    const lowerText = text.toLowerCase();
    
    return {
      // 包含数字
      hasNumbers: /\d+/.test(text),
      
      // 包含示例（检测"例如"、"比如"、"如"等词）
      hasExamples: /例如|比如|举例|示例|如：|例：/.test(text),
      
      // 提及目标用户
      hasTargetUsers: this.USER_KEYWORDS.some(keyword => lowerText.includes(keyword)),
      
      // 提及技术栈
      hasTechStack: this.TECH_KEYWORDS.some(keyword => lowerText.includes(keyword)),
      
      // 提及商业模式
      hasBusinessModel: this.BUSINESS_KEYWORDS.some(keyword => lowerText.includes(keyword))
    };
  }
  
  /**
   * 生成特征摘要报告
   */
  static generateFeatureSummary(features: TextFeatures): string {
    const { keywordDensity, complexity, domainSpecificity, qualityIndicators } = features;
    
    let summary = `📊 文本特征分析报告\n\n`;
    
    // 基础信息
    summary += `**基础信息**\n`;
    summary += `- 文本长度: ${features.length} 字符\n`;
    summary += `- 单词数量: ${features.wordCount}\n`;
    summary += `- 句子数量: ${features.sentenceCount}\n`;
    summary += `- 平均句长: ${features.avgWordsPerSentence} 词/句\n\n`;
    
    // 关键词密度
    summary += `**关键词密度**\n`;
    summary += `- 技术相关: ${keywordDensity.technical}%\n`;
    summary += `- 商业相关: ${keywordDensity.business}%\n`;
    summary += `- 用户相关: ${keywordDensity.user}%\n`;
    summary += `- 问题描述: ${keywordDensity.problem}%\n`;
    summary += `- 解决方案: ${keywordDensity.solution}%\n\n`;
    
    // 复杂度分析
    summary += `**复杂度分析**\n`;
    summary += `- 平均句长: ${complexity.avgSentenceLength} 字符\n`;
    summary += `- 复杂句比例: ${complexity.complexSentenceRatio}%\n`;
    summary += `- 逻辑连接词: ${complexity.logicalConnectorCount} 个\n`;
    summary += `- 疑问句比例: ${complexity.questionRatio}%\n\n`;
    
    // 领域特异性
    summary += `**领域识别**\n`;
    summary += `- 检测领域: ${domainSpecificity.detectedDomain}\n`;
    summary += `- 专业度评分: ${domainSpecificity.score}\n`;
    summary += `- 置信度: ${domainSpecificity.confidence}%\n\n`;
    
    // 质量指标
    summary += `**质量指标**\n`;
    summary += `- 包含数字: ${qualityIndicators.hasNumbers ? '✅' : '❌'}\n`;
    summary += `- 包含示例: ${qualityIndicators.hasExamples ? '✅' : '❌'}\n`;
    summary += `- 提及目标用户: ${qualityIndicators.hasTargetUsers ? '✅' : '❌'}\n`;
    summary += `- 提及技术栈: ${qualityIndicators.hasTechStack ? '✅' : '❌'}\n`;
    summary += `- 提及商业模式: ${qualityIndicators.hasBusinessModel ? '✅' : '❌'}\n`;
    
    return summary;
  }
}

export default TextAnalyzer;