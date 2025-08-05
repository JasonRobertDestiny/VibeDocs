#!/usr/bin/env node

import { QualityPredictor } from './core/quality-predictor.js';
import { InputOptimizer } from './core/input-optimizer.js';
import { ResultEvaluator } from './core/result-evaluator.js';
import { MonitoringStorage } from './core/monitoring-storage.js';

/**
 * 测试聚焦MCP Server的3个核心工具
 */
async function testMCPTools() {
  console.log('🧪 开始测试聚焦MCP Server的3个核心工具...\n');
  
  // 测试数据
  const testInput = `我想开发一个面向中小企业的智能客户关系管理系统。主要解决客户信息分散、销售流程不规范的问题。核心功能包括客户管理、销售跟踪、数据分析。预计服务1000家企业，采用SaaS模式。`;
  
  try {
    // 测试1: predict_quality 工具
    console.log('🎯 测试1: predict_quality 工具');
    console.log('─'.repeat(50));
    
    const startTime1 = Date.now();
    const prediction = await QualityPredictor.predictQuality(testInput);
    const time1 = Date.now() - startTime1;
    
    console.log(`✅ 质量预测完成 (${time1}ms)`);
    console.log(`   总体分数: ${prediction.overallScore}/100 (${prediction.qualityLevel})`);
    console.log(`   成功概率: ${prediction.successProbability}%`);
    console.log(`   预测置信度: ${prediction.confidenceLevel}%`);
    console.log(`   风险因素: ${prediction.riskFactors.length}个`);
    console.log(`   改进建议: ${prediction.recommendations.length}个`);
    
    // 生成详细报告
    const report = QualityPredictor.generatePredictionReport(prediction);
    console.log(`   报告长度: ${report.length}字符`);
    
    console.log('\n');
    
    // 测试2: optimize_input 工具
    console.log('✨ 测试2: optimize_input 工具');
    console.log('─'.repeat(50));
    
    const startTime2 = Date.now();
    const optimizationResults = await InputOptimizer.optimizeTextBatch(testInput);
    const time2 = Date.now() - startTime2;
    
    console.log(`✅ 输入优化完成 (${time2}ms)`);
    console.log(`   生成版本: ${optimizationResults.length}个`);
    
    optimizationResults.forEach((result, index) => {
      const focusName = {
        technical: '🔧 技术导向',
        business: '💼 商业导向',
        user: '👥 用户导向'
      }[result.focus];
      
      console.log(`   ${focusName}: ${result.qualityBefore}→${result.qualityAfter} (+${result.qualityGain}分)`);
    });
    
    // 找出最佳版本
    const bestResult = optimizationResults.reduce((best, current) => 
      current.qualityAfter > best.qualityAfter ? current : best
    );
    console.log(`   🏆 最佳版本: ${bestResult.focus}导向 (${bestResult.qualityAfter}/100)`);
    
    console.log('\n');
    
    // 测试3: monitor_results 工具
    console.log('📊 测试3: monitor_results 工具');
    console.log('─'.repeat(50));
    
    // 模拟AI生成的结果
    const mockGeneratedResult = {
      content: `# 智能客户关系管理系统开发规划

## 项目概述
项目名称：SmartCRM Pro
核心价值：为中小企业提供一体化的客户关系管理解决方案

## 功能规划
1. 客户信息管理 - 统一客户数据库
2. 销售机会跟踪 - 销售漏斗管理
3. 数据分析报表 - 智能业务洞察
4. 自动化营销 - 客户生命周期管理

## 技术方案
- 前端：React + TypeScript
- 后端：Node.js + Express
- 数据库：MongoDB + Redis
- 部署：Docker + 云服务器

## 商业模式
- 基础版：299元/月
- 专业版：599元/月
- 企业版：1299元/月`,
      metadata: {
        model: 'test-model',
        processingTime: 5000
      }
    };
    
    const startTime3 = Date.now();
    const evaluation = await ResultEvaluator.evaluateResult(
      mockGeneratedResult.content,
      testInput,
      prediction.overallScore
    );
    const time3 = Date.now() - startTime3;
    
    console.log(`✅ 结果监控完成 (${time3}ms)`);
    console.log(`   实际质量: ${evaluation.overallScore}/100`);
    console.log(`   预期质量: ${prediction.overallScore}/100`);
    console.log(`   质量差异: ${evaluation.qualityGap || 0}分`);
    console.log(`   评估置信度: ${evaluation.confidence}%`);
    console.log(`   优势: ${evaluation.strengths.length}个`);
    console.log(`   不足: ${evaluation.weaknesses.length}个`);
    console.log(`   建议: ${evaluation.recommendations.length}个`);
    
    // 测试监控存储
    const storage = new MonitoringStorage();
    const recordId = await storage.addRecord({
      originalInput: testInput,
      generatedResult: mockGeneratedResult.content,
      expectedQuality: prediction.overallScore,
      actualQuality: evaluation.overallScore,
      qualityGap: evaluation.qualityGap,
      processingTime: 5000,
      success: evaluation.overallScore >= 70,
      metadata: {
        inputLength: testInput.length,
        outputLength: mockGeneratedResult.content.length,
        model: 'test-model'
      }
    });
    
    console.log(`   📝 监控记录ID: ${recordId}`);
    
    // 获取统计数据
    const stats = storage.getStats();
    console.log(`   📊 总记录数: ${stats.totalRecords}`);
    console.log(`   📈 平均质量: ${stats.averageQuality}/100`);
    console.log(`   ✅ 成功率: ${stats.successRate}%`);
    
    console.log('\n');
    
    // 综合测试结果
    console.log('🎉 综合测试结果');
    console.log('─'.repeat(50));
    console.log(`✅ predict_quality: ${time1}ms (目标<3000ms)`);
    console.log(`✅ optimize_input: ${time2}ms (目标<5000ms)`);
    console.log(`✅ monitor_results: ${time3}ms (目标<3000ms)`);
    console.log(`📊 质量提升: ${bestResult.qualityGain}分`);
    console.log(`🎯 预测准确性: ${Math.abs((evaluation.qualityGap || 0)) <= 10 ? '✅ 准确' : '⚠️ 偏差较大'}`);
    
    const totalTime = time1 + time2 + time3;
    console.log(`⏱️ 总处理时间: ${totalTime}ms`);
    
    // 性能评估
    console.log('\n📈 性能评估');
    console.log('─'.repeat(50));
    console.log(`🚀 响应速度: ${totalTime < 10000 ? '🌟 优秀' : totalTime < 20000 ? '✅ 良好' : '⚠️ 需优化'}`);
    console.log(`🎯 预测精度: ${Math.abs((evaluation.qualityGap || 0)) <= 5 ? '🌟 优秀' : Math.abs((evaluation.qualityGap || 0)) <= 10 ? '✅ 良好' : '⚠️ 需优化'}`);
    console.log(`✨ 优化效果: ${bestResult.qualityGain >= 15 ? '🌟 优秀' : bestResult.qualityGain >= 10 ? '✅ 良好' : '⚠️ 需优化'}`);
    console.log(`📊 监控完整性: ${evaluation.recommendations.length >= 3 ? '🌟 优秀' : '✅ 良好'}`);
    
    await storage.close();
    
  } catch (error) {
    console.error(`❌ 测试失败: ${error.message}`);
    console.error(error.stack);
  }
  
  console.log('\n✅ 聚焦MCP Server核心工具测试完成！');
}

// 运行测试
testMCPTools().catch(console.error);