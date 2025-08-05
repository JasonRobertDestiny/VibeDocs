#!/usr/bin/env node

import { InputOptimizer } from './core/input-optimizer.js';

/**
 * 测试输入优化器
 */
async function testInputOptimizer() {
  console.log('✨ 开始测试输入优化器...\n');
  
  // 测试用例
  const testCases = [
    {
      name: '简单项目描述',
      text: '做一个在线教育平台，用户可以看视频学习，老师可以上传课程。'
    },
    {
      name: '中等复杂度描述',
      text: '想开发一个客户管理系统，帮助企业管理客户信息，跟踪销售机会，提高销售效率。需要支持多用户使用，界面要简洁易用。'
    },
    {
      name: '较完整的描述',
      text: '我想开发一个面向中小企业的智能客户关系管理系统。主要解决客户信息分散、销售流程不规范的问题。核心功能包括客户管理、销售跟踪、数据分析。预计服务1000家企业，采用SaaS模式。'
    }
  ];
  
  // 测试每个用例
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`📋 测试用例 ${i + 1}: ${testCase.name}`);
    console.log(`📝 原始文本: ${testCase.text}`);
    console.log('');
    
    try {
      // 1. 智能策略选择测试
      console.log('🎯 智能策略推荐:');
      const recommendation = await InputOptimizer.selectBestStrategy(testCase.text);
      console.log(`   推荐策略: ${recommendation.recommendedFocus}`);
      console.log(`   推荐理由: ${recommendation.reason}`);
      console.log(`   预期提升: +${recommendation.expectedGain}分`);
      console.log('');
      
      // 2. 批量优化测试
      console.log('🚀 批量优化结果:');
      const startTime = Date.now();
      const results = await InputOptimizer.optimizeTextBatch(testCase.text);
      const processingTime = Date.now() - startTime;
      
      results.forEach((result, index) => {
        const focusName = {
          technical: '🔧 技术导向',
          business: '💼 商业导向',
          user: '👥 用户导向'
        }[result.focus];
        
        console.log(`   ${focusName}:`);
        console.log(`     质量提升: ${result.qualityBefore} → ${result.qualityAfter} (+${result.qualityGain}分)`);
        console.log(`     成功概率: ${result.prediction.successProbability}%`);
        console.log(`     应用改进: ${result.appliedTemplates.length}项`);
        
        if (result.appliedTemplates.length > 0) {
          console.log(`     改进内容: ${result.appliedTemplates.slice(0, 2).join(', ')}`);
        }
        console.log('');
      });
      
      // 3. 找出最佳优化版本
      const bestResult = results.reduce((best, current) => 
        current.qualityAfter > best.qualityAfter ? current : best
      );
      
      console.log(`🏆 最佳优化版本: ${bestResult.focus}导向 (${bestResult.qualityAfter}/100)`);
      console.log(`📈 总体提升: +${bestResult.qualityGain}分`);
      console.log(`⏱️ 处理时间: ${processingTime}ms`);
      
      // 4. 显示最佳版本的优化文本（截取前200字符）
      console.log(`\n📄 最佳优化版本预览:`);
      const preview = bestResult.optimizedText.length > 200 
        ? bestResult.optimizedText.substring(0, 200) + '...'
        : bestResult.optimizedText;
      console.log(`"${preview}"`);
      
    } catch (error) {
      console.error(`❌ 优化失败: ${error.message}`);
    }
    
    console.log('\n' + '─'.repeat(80) + '\n');
  }
  
  // 测试单个策略优化
  console.log('🔧 测试单个策略优化...');
  try {
    const singleResult = await InputOptimizer.optimizeText(
      testCases[0].text,
      'technical',
      85,
      true
    );
    
    console.log(`✅ 技术导向优化完成:`);
    console.log(`   质量提升: ${singleResult.qualityBefore} → ${singleResult.qualityAfter}`);
    console.log(`   应用模板: ${singleResult.appliedTemplates.length}个`);
    console.log(`   改进项目: ${singleResult.appliedTemplates.join(', ')}`);
    
  } catch (error) {
    console.error(`❌ 单个策略优化失败: ${error.message}`);
  }
  
  console.log('\n✅ 输入优化器测试完成！');
}

// 运行测试
testInputOptimizer().catch(console.error);