#!/usr/bin/env node

import { QualityPredictor } from './core/quality-predictor.js';

/**
 * 测试质量预测模型
 */
async function testQualityPredictor() {
  console.log('🎯 开始测试AI规划质量预测模型...\n');
  
  // 测试用例
  const testCases = [
    {
      name: '优秀质量项目描述',
      text: `我想开发一个面向中小企业的智能客户关系管理系统(CRM)。

目标用户：50-200人规模的企业，主要是销售团队和管理层。

核心问题：客户信息分散在Excel、微信、邮件中，销售流程不规范，客户跟进效率低，业绩难以预测。

解决方案：
1. 统一客户信息管理 - 360度客户视图
2. 销售流程自动化 - 从线索到成交的全流程管理  
3. 智能销售助手 - AI分析客户意向，推荐最佳跟进策略
4. 数据分析报表 - 销售漏斗、业绩预测、团队效率分析

技术架构：React + Node.js + MongoDB + Redis，部署在阿里云ECS
商业模式：SaaS订阅制，基础版299元/月，专业版599元/月
市场规模：中国中小企业CRM市场约200亿元，年增长率15%

项目计划：MVP版本3个月，完整版本6个月，预计第一年获得1000家企业客户。`
    },
    {
      name: '良好质量项目描述',
      text: `想做一个在线教育平台，主要功能是视频课程学习。

用户可以购买课程观看视频，老师可以上传课程内容。需要支付功能、用户管理、课程管理等基础功能。

技术栈使用React前端，Node.js后端，MySQL数据库。界面要求简洁美观，支持手机和电脑访问。

预计开发时间6个月，初期投入50万元，目标是第一年获得10000名付费用户。`
    },
    {
      name: '一般质量项目描述',
      text: `做一个电商网站，卖各种商品。用户可以注册登录，浏览商品，加入购物车，下单支付。管理员可以管理商品和订单。使用现代技术开发，要求性能好，界面美观。`
    },
    {
      name: '较差质量项目描述',
      text: `做一个网站，功能很多，用户很多，很赚钱。马上就要，简单一点就行。`
    }
  ];
  
  // 测试每个用例
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`📋 测试用例 ${i + 1}: ${testCase.name}`);
    console.log(`📝 输入文本: ${testCase.text.substring(0, 100)}...`);
    console.log('');
    
    try {
      // 执行质量预测
      const startTime = Date.now();
      const prediction = await QualityPredictor.predictQuality(testCase.text);
      const actualTime = Date.now() - startTime;
      
      // 显示预测结果
      console.log(`🎯 质量预测结果:`);
      console.log(`   总体分数: ${prediction.overallScore}/100 (${prediction.qualityLevel})`);
      console.log(`   预测置信度: ${prediction.confidenceLevel}%`);
      console.log(`   成功概率: ${prediction.successProbability}%`);
      console.log(`   预计处理时间: ${prediction.estimatedTime}秒`);
      console.log(`   实际预测耗时: ${actualTime}ms`);
      
      // 显示维度分数
      console.log(`\n📊 维度分析:`);
      console.log(`   清晰度: ${prediction.dimensionScores.clarity}/100`);
      console.log(`   完整性: ${prediction.dimensionScores.completeness}/100`);
      console.log(`   可行性: ${prediction.dimensionScores.feasibility}/100`);
      console.log(`   商业逻辑: ${prediction.dimensionScores.businessLogic}/100`);
      console.log(`   创新程度: ${prediction.dimensionScores.innovation}/100`);
      
      // 显示风险因素
      if (prediction.riskFactors.length > 0) {
        console.log(`\n⚠️ 风险因素:`);
        prediction.riskFactors.forEach((risk, index) => {
          console.log(`   ${index + 1}. ${risk}`);
        });
      }
      
      // 显示改进建议
      if (prediction.recommendations.length > 0) {
        console.log(`\n💡 改进建议:`);
        prediction.recommendations.slice(0, 3).forEach((rec, index) => {
          console.log(`   ${index + 1}. ${rec}`);
        });
      }
      
      // 验证预测时间准确性
      const timeAccuracy = actualTime <= 3000 ? '✅' : '❌';
      console.log(`\n⏱️ 时间性能: ${timeAccuracy} (目标<3秒, 实际${actualTime}ms)`);
      
    } catch (error) {
      console.error(`❌ 预测失败: ${error.message}`);
    }
    
    console.log('\n' + '─'.repeat(80) + '\n');
  }
  
  // 批量预测测试
  console.log('📦 测试批量预测功能...');
  try {
    const batchTexts = testCases.map(tc => tc.text);
    const batchStartTime = Date.now();
    const batchResults = await QualityPredictor.batchPredict(batchTexts);
    const batchTime = Date.now() - batchStartTime;
    
    console.log(`✅ 批量预测完成: ${batchResults.length}个项目, 耗时${batchTime}ms`);
    console.log(`📊 平均分数: ${Math.round(batchResults.reduce((sum, r) => sum + r.overallScore, 0) / batchResults.length)}/100`);
    
  } catch (error) {
    console.error(`❌ 批量预测失败: ${error.message}`);
  }
  
  console.log('\n✅ 质量预测模型测试完成！');
}

// 运行测试
testQualityPredictor().catch(console.error);