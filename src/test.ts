#!/usr/bin/env node

import { TextAnalyzer } from './core/text-analyzer.js';

/**
 * 测试文本特征提取算法
 */
async function testTextAnalyzer() {
  console.log('🧪 开始测试文本特征提取算法...\n');
  
  // 测试用例
  const testCases = [
    {
      name: '高质量项目描述',
      text: `我想开发一个面向中小企业的智能客户关系管理系统(CRM)。目标用户是50-200人规模的企业，主要解决客户信息分散、销售流程不规范、客户跟进效率低的问题。

核心功能包括：客户信息管理、销售机会跟踪、自动化营销、数据分析报表。技术栈计划使用React + Node.js + MongoDB，部署在阿里云上。

预期支持1000+企业用户，月收入目标50万元。项目分3个阶段实施：MVP版本(3个月)、功能完善版(6个月)、企业定制版(12个月)。`
    },
    {
      name: '中等质量项目描述',
      text: `想做一个在线教育平台，主要是视频课程。用户可以购买课程学习，老师可以上传课程。需要支付功能和用户管理。使用现代的技术栈开发，要求界面美观，性能好。`
    },
    {
      name: '低质量项目描述',
      text: `做一个网站，功能很多，用户很多，赚钱。`
    }
  ];
  
  // 测试每个用例
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`📋 测试用例 ${i + 1}: ${testCase.name}`);
    console.log(`📝 输入文本: ${testCase.text.substring(0, 100)}...`);
    console.log('');
    
    try {
      // 提取特征
      const features = TextAnalyzer.extractFeatures(testCase.text);
      
      // 生成摘要报告
      const summary = TextAnalyzer.generateFeatureSummary(features);
      console.log(summary);
      
      // 简单的质量评估
      const qualityScore = calculateSimpleQualityScore(features);
      console.log(`🎯 简单质量评分: ${qualityScore}/100\n`);
      
    } catch (error) {
      console.error(`❌ 测试失败: ${error.message}\n`);
    }
    
    console.log('─'.repeat(80) + '\n');
  }
  
  console.log('✅ 文本特征提取算法测试完成！');
}

/**
 * 简单的质量评分算法（用于验证特征提取效果）
 */
function calculateSimpleQualityScore(features: any): number {
  let score = 0;
  
  // 基础分数（文本长度合理性）
  if (features.length >= 50 && features.length <= 1000) {
    score += 20;
  } else if (features.length > 1000) {
    score += 15;
  } else {
    score += 5;
  }
  
  // 关键词密度评分
  const { keywordDensity } = features;
  score += Math.min(keywordDensity.technical * 2, 15);
  score += Math.min(keywordDensity.business * 2, 15);
  score += Math.min(keywordDensity.user * 2, 15);
  score += Math.min(keywordDensity.problem * 1.5, 10);
  score += Math.min(keywordDensity.solution * 1.5, 10);
  
  // 质量指标评分
  const { qualityIndicators } = features;
  if (qualityIndicators.hasNumbers) score += 5;
  if (qualityIndicators.hasExamples) score += 5;
  if (qualityIndicators.hasTargetUsers) score += 5;
  if (qualityIndicators.hasTechStack) score += 5;
  if (qualityIndicators.hasBusinessModel) score += 5;
  
  return Math.min(Math.round(score), 100);
}

// 运行测试
testTextAnalyzer().catch(console.error);