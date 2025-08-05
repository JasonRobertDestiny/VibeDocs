#!/usr/bin/env node

import { QualityPredictor, QualityPrediction } from './quality-predictor.js';
import { TextAnalyzer, TextFeatures } from './text-analyzer.js';

/**
 * 优化策略接口
 */
export interface OptimizationStrategy {
  name: string;
  focus: 'technical' | 'business' | 'user';
  description: string;
  templates: OptimizationTemplate[];
  expectedGain: number; // 预期质量提升分数
}

/**
 * 优化模板接口
 */
export interface OptimizationTemplate {
  trigger: string;           // 触发条件描述
  pattern: RegExp;           // 匹配模式
  improvement: string;       // 改进内容
  priority: number;          // 优先级 (1-10)
  expectedGain: number;      // 预期提升分数
}

/**
 * 优化结果接口
 */
export interface OptimizationResult {
  focus: 'technical' | 'business' | 'user';
  originalText: string;
  optimizedText: string;
  improvements: string[];
  qualityBefore: number;
  qualityAfter: number;
  qualityGain: number;
  prediction: QualityPrediction;
  appliedTemplates: string[];
}

/**
 * 输入优化器 - 自动生成3个优化版本的项目描述
 */
export class InputOptimizer {
  
  // 技术导向优化策略
  private static readonly TECHNICAL_STRATEGY: OptimizationStrategy = {
    name: '技术导向优化',
    focus: 'technical',
    description: '补充技术栈、架构设计、性能要求等技术细节',
    expectedGain: 25,
    templates: [
      {
        trigger: '缺少技术栈说明',
        pattern: /^(?!.*(?:react|vue|angular|node|python|java|go|rust|php|mysql|mongodb|redis)).*/i,
        improvement: '\n\n**技术架构**：\n- 前端：React 18 + TypeScript + Tailwind CSS\n- 后端：Node.js + Express + TypeScript\n- 数据库：MongoDB + Redis缓存\n- 部署：Docker + 云服务器',
        priority: 9,
        expectedGain: 15
      },
      {
        trigger: '缺少架构设计',
        pattern: /^(?!.*(?:架构|前端|后端|数据库|api|接口|微服务)).*/i,
        improvement: '\n\n**系统架构**：采用前后端分离架构，RESTful API设计，支持水平扩展和高并发访问。',
        priority: 8,
        expectedGain: 12
      },
      {
        trigger: '缺少性能要求',
        pattern: /^(?!.*(?:性能|响应时间|并发|负载|优化)).*/i,
        improvement: '\n\n**性能指标**：\n- 页面响应时间 < 2秒\n- 支持1000+并发用户\n- 99.9%系统可用性\n- 数据备份和容灾机制',
        priority: 7,
        expectedGain: 10
      },
      {
        trigger: '缺少安全考虑',
        pattern: /^(?!.*(?:安全|权限|认证|加密|防护)).*/i,
        improvement: '\n\n**安全设计**：用户认证授权、数据加密传输、SQL注入防护、XSS攻击防护等安全措施。',
        priority: 6,
        expectedGain: 8
      },
      {
        trigger: '缺少扩展性说明',
        pattern: /^(?!.*(?:扩展|模块|插件|升级|维护)).*/i,
        improvement: '\n\n**可扩展性**：模块化设计，支持功能插件扩展，便于后续功能迭代和系统升级。',
        priority: 5,
        expectedGain: 6
      }
    ]
  };

  // 商业导向优化策略
  private static readonly BUSINESS_STRATEGY: OptimizationStrategy = {
    name: '商业导向优化',
    focus: 'business',
    description: '强化商业模式、市场分析、盈利策略等商业逻辑',
    expectedGain: 30,
    templates: [
      {
        trigger: '缺少商业模式',
        pattern: /^(?!.*(?:商业模式|盈利|收入|付费|订阅|广告)).*/i,
        improvement: '\n\n**商业模式**：\n- 基础版：免费使用，功能限制\n- 专业版：月付费订阅，完整功能\n- 企业版：年付费，定制服务\n- 增值服务：培训、咨询、技术支持',
        priority: 10,
        expectedGain: 20
      },
      {
        trigger: '缺少市场分析',
        pattern: /^(?!.*(?:市场|竞争|用户规模|需求|痛点)).*/i,
        improvement: '\n\n**市场分析**：\n- 目标市场规模：预估100万潜在用户\n- 竞争对手分析：现有解决方案的不足\n- 市场需求验证：用户调研和痛点分析\n- 差异化优势：独特价值主张',
        priority: 9,
        expectedGain: 15
      },
      {
        trigger: '缺少盈利预期',
        pattern: /^(?!.*(?:收入|利润|ROI|投资回报|财务)).*/i,
        improvement: '\n\n**盈利预期**：\n- 第一年：月收入10-50万元\n- 用户获取成本：100-200元/用户\n- 用户生命周期价值：1000-3000元\n- 投资回报周期：12-18个月',
        priority: 8,
        expectedGain: 12
      },
      {
        trigger: '缺少营销策略',
        pattern: /^(?!.*(?:营销|推广|获客|渠道|品牌)).*/i,
        improvement: '\n\n**营销策略**：\n- 内容营销：技术博客、案例分享\n- 社交媒体：微信、知乎、技术社区\n- 合作伙伴：行业协会、技术服务商\n- 口碑传播：用户推荐奖励机制',
        priority: 7,
        expectedGain: 10
      },
      {
        trigger: '缺少风险评估',
        pattern: /^(?!.*(?:风险|挑战|困难|问题|应对)).*/i,
        improvement: '\n\n**风险评估**：\n- 技术风险：开发难度、技术选型\n- 市场风险：竞争加剧、需求变化\n- 资金风险：现金流、融资需求\n- 团队风险：人才招聘、团队稳定性',
        priority: 6,
        expectedGain: 8
      }
    ]
  };

  // 用户导向优化策略
  private static readonly USER_STRATEGY: OptimizationStrategy = {
    name: '用户导向优化',
    focus: 'user',
    description: '突出用户体验、使用场景、价值主张等用户相关内容',
    expectedGain: 25,
    templates: [
      {
        trigger: '缺少目标用户定义',
        pattern: /^(?!.*(?:目标用户|用户群体|客户|使用者)).*/i,
        improvement: '\n\n**目标用户**：\n- 主要用户：25-45岁职场人士\n- 使用场景：日常工作、学习提升\n- 用户特征：追求效率、重视体验\n- 用户规模：预计覆盖10万+活跃用户',
        priority: 10,
        expectedGain: 18
      },
      {
        trigger: '缺少用户体验设计',
        pattern: /^(?!.*(?:用户体验|界面|交互|操作|易用)).*/i,
        improvement: '\n\n**用户体验设计**：\n- 简洁直观的界面设计\n- 流畅的操作体验\n- 响应式设计，支持多设备\n- 个性化设置和智能推荐',
        priority: 9,
        expectedGain: 15
      },
      {
        trigger: '缺少使用场景',
        pattern: /^(?!.*(?:场景|情况|使用|应用|实际)).*/i,
        improvement: '\n\n**核心使用场景**：\n- 场景1：日常工作中的效率提升\n- 场景2：团队协作和信息共享\n- 场景3：数据分析和决策支持\n- 场景4：移动办公和远程协作',
        priority: 8,
        expectedGain: 12
      },
      {
        trigger: '缺少价值主张',
        pattern: /^(?!.*(?:价值|好处|优势|解决|帮助)).*/i,
        improvement: '\n\n**核心价值主张**：\n- 提升工作效率50%以上\n- 降低操作复杂度，零学习成本\n- 节省时间成本，专注核心业务\n- 提供数据洞察，辅助决策',
        priority: 7,
        expectedGain: 10
      },
      {
        trigger: '缺少用户反馈机制',
        pattern: /^(?!.*(?:反馈|建议|评价|改进|优化)).*/i,
        improvement: '\n\n**用户反馈机制**：\n- 应用内反馈系统\n- 用户调研和访谈\n- 数据分析和行为追踪\n- 持续迭代和功能优化',
        priority: 6,
        expectedGain: 8
      }
    ]
  };

  /**
   * 获取所有优化策略
   */
  static getAllStrategies(): OptimizationStrategy[] {
    return [
      this.TECHNICAL_STRATEGY,
      this.BUSINESS_STRATEGY,
      this.USER_STRATEGY
    ];
  }

  /**
   * 根据焦点获取优化策略
   */
  static getStrategyByFocus(focus: 'technical' | 'business' | 'user'): OptimizationStrategy {
    switch (focus) {
      case 'technical':
        return this.TECHNICAL_STRATEGY;
      case 'business':
        return this.BUSINESS_STRATEGY;
      case 'user':
        return this.USER_STRATEGY;
      default:
        throw new Error(`未知的优化焦点: ${focus}`);
    }
  }

  /**
   * 优化单个文本
   */
  static async optimizeText(
    text: string,
    focus: 'technical' | 'business' | 'user',
    targetQuality: number = 80,
    preserveStyle: boolean = true
  ): Promise<OptimizationResult> {
    // 获取原始质量评估
    const originalPrediction = await QualityPredictor.predictQuality(text);
    const originalFeatures = TextAnalyzer.extractFeatures(text);

    // 获取优化策略
    const strategy = this.getStrategyByFocus(focus);

    // 应用优化模板
    const { optimizedText, appliedTemplates, improvements } = this.applyOptimizationTemplates(
      text,
      strategy,
      originalFeatures,
      preserveStyle
    );

    // 评估优化后的质量
    const optimizedPrediction = await QualityPredictor.predictQuality(optimizedText);

    return {
      focus,
      originalText: text,
      optimizedText,
      improvements,
      qualityBefore: originalPrediction.overallScore,
      qualityAfter: optimizedPrediction.overallScore,
      qualityGain: optimizedPrediction.overallScore - originalPrediction.overallScore,
      prediction: optimizedPrediction,
      appliedTemplates
    };
  }

  /**
   * 批量优化文本（生成3个版本）
   */
  static async optimizeTextBatch(
    text: string,
    focusAreas: ('technical' | 'business' | 'user')[] = ['technical', 'business', 'user'],
    targetQuality: number = 80,
    preserveStyle: boolean = true
  ): Promise<OptimizationResult[]> {
    const results: OptimizationResult[] = [];

    for (const focus of focusAreas) {
      const result = await this.optimizeText(text, focus, targetQuality, preserveStyle);
      results.push(result);
    }

    return results;
  }

  /**
   * 应用优化模板
   */
  private static applyOptimizationTemplates(
    text: string,
    strategy: OptimizationStrategy,
    features: TextFeatures,
    preserveStyle: boolean
  ): {
    optimizedText: string;
    appliedTemplates: string[];
    improvements: string[];
  } {
    let optimizedText = text;
    const appliedTemplates: string[] = [];
    const improvements: string[] = [];

    // 按优先级排序模板
    const sortedTemplates = [...strategy.templates].sort((a, b) => b.priority - a.priority);

    // 应用匹配的模板
    for (const template of sortedTemplates) {
      if (template.pattern.test(text)) {
        // 检查是否应该应用此模板
        if (this.shouldApplyTemplate(template, features, strategy.focus)) {
          optimizedText += template.improvement;
          appliedTemplates.push(template.trigger);
          improvements.push(template.improvement.trim());
        }
      }
    }

    // 如果保持风格，进行风格调整
    if (preserveStyle) {
      optimizedText = this.adjustStyle(optimizedText, text);
    }

    return {
      optimizedText,
      appliedTemplates,
      improvements
    };
  }

  /**
   * 判断是否应该应用模板
   */
  private static shouldApplyTemplate(
    template: OptimizationTemplate,
    features: TextFeatures,
    focus: 'technical' | 'business' | 'user'
  ): boolean {
    // 基于文本特征和焦点决定是否应用模板
    switch (focus) {
      case 'technical':
        // 如果技术关键词密度已经很高，可能不需要添加更多技术内容
        return features.keywordDensity.technical < 5;
      
      case 'business':
        // 如果商业关键词密度已经很高，可能不需要添加更多商业内容
        return features.keywordDensity.business < 4;
      
      case 'user':
        // 如果用户关键词密度已经很高，可能不需要添加更多用户内容
        return features.keywordDensity.user < 4;
      
      default:
        return true;
    }
  }

  /**
   * 调整文本风格以保持一致性
   */
  private static adjustStyle(optimizedText: string, originalText: string): string {
    // 简单的风格调整逻辑
    let adjusted = optimizedText;

    // 检查原文的语调特征
    const isFirstPerson = /我想|我要|我们/.test(originalText);
    const isFormal = /系统|平台|解决方案/.test(originalText);
    const isCasual = /做一个|搞一个|弄一个/.test(originalText);

    // 根据原文风格调整新增内容
    if (isFirstPerson && !isFormal) {
      // 保持第一人称和相对随意的语调
      adjusted = adjusted.replace(/系统将/g, '我们将');
      adjusted = adjusted.replace(/该平台/g, '这个平台');
    }

    if (isCasual) {
      // 保持相对随意的表达
      adjusted = adjusted.replace(/解决方案/g, '解决办法');
      adjusted = adjusted.replace(/架构设计/g, '技术方案');
    }

    return adjusted;
  }

  /**
   * 智能选择最佳优化策略
   */
  static async selectBestStrategy(
    text: string,
    targetQuality: number = 80
  ): Promise<{
    recommendedFocus: 'technical' | 'business' | 'user';
    reason: string;
    expectedGain: number;
  }> {
    const features = TextAnalyzer.extractFeatures(text);
    const originalPrediction = await QualityPredictor.predictQuality(text);

    // 分析哪个维度最需要改进
    const dimensionScores = originalPrediction.dimensionScores;
    const weakestDimensions = Object.entries(dimensionScores)
      .sort(([,a], [,b]) => a - b)
      .slice(0, 2);

    // 根据最弱的维度推荐优化策略
    const weakestDimension = weakestDimensions[0][0];
    
    let recommendedFocus: 'technical' | 'business' | 'user';
    let reason: string;
    let expectedGain: number;

    if (weakestDimension === 'feasibility' || weakestDimension === 'innovation') {
      recommendedFocus = 'technical';
      reason = '技术可行性和创新程度需要加强，建议补充技术架构和实现方案';
      expectedGain = this.TECHNICAL_STRATEGY.expectedGain;
    } else if (weakestDimension === 'businessLogic') {
      recommendedFocus = 'business';
      reason = '商业逻辑需要完善，建议补充商业模式和市场分析';
      expectedGain = this.BUSINESS_STRATEGY.expectedGain;
    } else {
      recommendedFocus = 'user';
      reason = '用户相关内容需要丰富，建议补充用户体验和使用场景';
      expectedGain = this.USER_STRATEGY.expectedGain;
    }

    return {
      recommendedFocus,
      reason,
      expectedGain
    };
  }

  /**
   * 生成优化策略报告
   */
  static generateOptimizationReport(results: OptimizationResult[]): string {
    let report = `# ✨ 输入优化策略报告\n\n`;

    // 总体统计
    const totalGain = results.reduce((sum, r) => sum + r.qualityGain, 0);
    const avgGain = Math.round(totalGain / results.length);
    const bestResult = results.reduce((best, current) => 
      current.qualityAfter > best.qualityAfter ? current : best
    );

    report += `## 📊 优化效果总览\n\n`;
    report += `- **优化版本数**: ${results.length}个\n`;
    report += `- **平均质量提升**: +${avgGain}分\n`;
    report += `- **最佳优化效果**: ${bestResult.focus}导向 (+${bestResult.qualityGain}分)\n`;
    report += `- **推荐使用**: ${bestResult.focus}导向优化版本\n\n`;

    // 各版本详情
    report += `## 🚀 优化版本详情\n\n`;

    results.forEach((result, index) => {
      const focusName = {
        technical: '🔧 技术导向',
        business: '💼 商业导向',
        user: '👥 用户导向'
      }[result.focus];

      report += `### ${focusName}\n\n`;
      report += `**质量提升**: ${result.qualityBefore}/100 → ${result.qualityAfter}/100 (+${result.qualityGain}分)\n`;
      report += `**成功概率**: ${result.prediction.successProbability}%\n`;
      report += `**应用改进**: ${result.appliedTemplates.length}项\n\n`;

      if (result.appliedTemplates.length > 0) {
        report += `**具体改进**:\n`;
        result.appliedTemplates.forEach((template, i) => {
          report += `- ${template}\n`;
        });
        report += `\n`;
      }

      report += `---\n\n`;
    });

    // 使用建议
    report += `## 💡 使用建议\n\n`;
    report += `1. **首选方案**: 使用${bestResult.focus}导向优化版本，质量分数最高\n`;
    report += `2. **场景选择**: 根据项目特点选择对应的优化方向\n`;
    report += `3. **进一步优化**: 可以结合多个版本的优点进行手动调整\n`;
    report += `4. **质量验证**: 使用predict_quality工具验证最终版本质量\n`;

    return report;
  }
}

export default InputOptimizer;