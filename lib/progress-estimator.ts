#!/usr/bin/env node

import { performanceMonitor } from './performance-monitor.js';

// 进度估算器接口
export interface TimeEstimate {
  estimatedTotalTime: number; // 预计总时间（毫秒）
  estimatedRemainingTime: number; // 预计剩余时间（毫秒）
  confidence: number; // 估算置信度（0-1）
  completionTime: Date; // 预计完成时间
  isReliable: boolean; // 估算是否可靠
}

// 阶段时间统计
export interface StageTimeStats {
  stageName: string;
  averageTime: number;
  minTime: number;
  maxTime: number;
  sampleCount: number;
  standardDeviation: number;
}

// 智能进度估算器 - 基于历史数据和实时性能的时间预测
export class ProgressEstimator {
  private stageHistory: Map<string, number[]> = new Map();
  private readonly STAGE_NAMES = [
    '智能解析',
    '分层规划', 
    '可视化生成',
    'AI提示词工程',
    '质量验证与整合'
  ];
  
  // 基础时间估算（毫秒）- 作为fallback
  private readonly BASE_STAGE_TIMES = {
    '智能解析': 8000,
    '分层规划': 12000,
    '可视化生成': 10000,
    'AI提示词工程': 15000,
    '质量验证与整合': 5000
  } as const;
  
  constructor() {
    this.initializeStageHistory();
  }
  
  /**
   * 初始化阶段历史数据
   */
  private initializeStageHistory(): void {
    this.STAGE_NAMES.forEach(stageName => {
      this.stageHistory.set(stageName, []);
    });
  }
  
  /**
   * 记录阶段完成时间
   */
  recordStageCompletion(stageName: string, duration: number): void {
    const history = this.stageHistory.get(stageName) || [];
    history.push(duration);
    
    // 保持最近50次记录
    if (history.length > 50) {
      history.shift();
    }
    
    this.stageHistory.set(stageName, history);
    
    // 记录到性能监控器
    performanceMonitor.recordEvent('stage_completion_time', duration, {
      stageName,
      sampleCount: history.length
    });
  }
  
  /**
   * 安全获取基础阶段时间
   */
  private getBaseStageTime(stageName: string): number {
    return this.BASE_STAGE_TIMES[stageName as keyof typeof this.BASE_STAGE_TIMES] || 10000;
  }
  
  /**
   * 获取阶段时间统计
   */
  getStageStats(stageName: string): StageTimeStats {
    const history = this.stageHistory.get(stageName) || [];
    
    if (history.length === 0) {
      const baseTime = this.getBaseStageTime(stageName);
      return {
        stageName,
        averageTime: baseTime,
        minTime: baseTime,
        maxTime: baseTime,
        sampleCount: 0,
        standardDeviation: 0
      };
    }
    
    const average = history.reduce((sum, time) => sum + time, 0) / history.length;
    const min = Math.min(...history);
    const max = Math.max(...history);
    
    // 计算标准差
    const variance = history.reduce((sum, time) => sum + Math.pow(time - average, 2), 0) / history.length;
    const standardDeviation = Math.sqrt(variance);
    
    return {
      stageName,
      averageTime: average,
      minTime: min,
      maxTime: max,
      sampleCount: history.length,
      standardDeviation
    };
  }
  
  /**
   * 估算剩余时间
   */
  estimateRemainingTime(
    currentStage: number,
    currentStageProgress: number,
    currentStageStartTime?: number
  ): TimeEstimate {
    let totalEstimatedTime = 0;
    let remainingTime = 0;
    let confidence = 0.5; // 默认置信度
    
    // 计算每个阶段的预计时间
    for (let i = 0; i < this.STAGE_NAMES.length; i++) {
      const stageName = this.STAGE_NAMES[i];
      const stats = this.getStageStats(stageName);
      
      let stageEstimate = stats.averageTime;
      
      // 考虑样本数量影响置信度
      const sampleConfidence = Math.min(stats.sampleCount / 10, 1);
      confidence += sampleConfidence * 0.1;
      
      if (i < currentStage) {
        // 已完成的阶段
        totalEstimatedTime += stageEstimate;
      } else if (i === currentStage) {
        // 当前阶段
        totalEstimatedTime += stageEstimate;
        
        if (currentStageStartTime && currentStageProgress > 0) {
          // 基于当前阶段的实际进度调整估算
          const currentStageElapsed = Date.now() - currentStageStartTime;
          const currentStageEstimated = currentStageElapsed / (currentStageProgress / 100);
          
          // 如果当前阶段的实际速度与历史不同，调整估算
          if (currentStageProgress > 10) { // 至少10%进度才调整
            stageEstimate = currentStageEstimated;
            confidence += 0.2; // 提高置信度
          }
          
          remainingTime += currentStageEstimated * (1 - currentStageProgress / 100);
        } else {
          remainingTime += stageEstimate;
        }
      } else {
        // 未来阶段
        totalEstimatedTime += stageEstimate;
        remainingTime += stageEstimate;
      }
    }
    
    // 限制置信度范围
    confidence = Math.min(Math.max(confidence, 0.1), 0.95);
    
    // 考虑系统性能影响
    const performanceMultiplier = this.getPerformanceMultiplier();
    remainingTime *= performanceMultiplier;
    totalEstimatedTime *= performanceMultiplier;
    
    const completionTime = new Date(Date.now() + remainingTime);
    
    return {
      estimatedTotalTime: Math.round(totalEstimatedTime),
      estimatedRemainingTime: Math.round(remainingTime),
      confidence: Math.round(confidence * 100) / 100,
      completionTime,
      isReliable: confidence > 0.6 && remainingTime > 0
    };
  }
  
  /**
   * 获取性能乘数（基于系统负载）
   */
  private getPerformanceMultiplier(): number {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
    
    // 基于内存使用情况调整性能预期
    if (heapUsedMB > 200) {
      return 1.3; // 高内存使用，可能较慢
    } else if (heapUsedMB > 100) {
      return 1.1; // 中等内存使用
    } else {
      return 1.0; // 正常性能
    }
  }
  
  /**
   * 生成进度报告
   */
  generateProgressReport(
    currentStage: number,
    stages: any[],
    overallProgress: number
  ): string {
    const currentStageInfo = stages[currentStage];
    const estimate = this.estimateRemainingTime(
      currentStage,
      currentStageInfo?.progress || 0,
      currentStageInfo?.startTime
    );
    
    let report = `## ⏱️ 智能时间估算\n\n`;
    
    // 主要预测信息
    report += `| 时间预测 | 预估值 |\n`;
    report += `|---------|--------|\n`;
    report += `| 🕒 **剩余时间** | ${this.formatDuration(estimate.estimatedRemainingTime)} |\n`;
    report += `| ⏰ **预计完成** | ${estimate.completionTime.toLocaleTimeString()} |\n`;
    report += `| 📊 **总计时间** | ${this.formatDuration(estimate.estimatedTotalTime)} |\n`;
    report += `| 🎯 **预测置信度** | ${(estimate.confidence * 100).toFixed(0)}% |\n`;
    report += `| ✅ **预测可靠性** | ${estimate.isReliable ? '可靠' : '低可靠性'} |\n\n`;
    
    // 进度可视化
    const progressBar = this.generateProgressBar(overallProgress);
    report += `### 📊 实时进度可视化\n`;
    report += `\`\`\`\n${progressBar}\n\`\`\`\n\n`;
    
    // 各阶段详细时间预测
    report += `### 🏗️ 各阶段时间预测\n\n`;
    report += `| 阶段 | 状态 | 预计时间 | 历史平均 | 可靠度 |\n`;
    report += `|------|------|----------|----------|--------|\n`;
    
    this.STAGE_NAMES.forEach((stageName, index) => {
      const stats = this.getStageStats(stageName);
      const statusIcon = this.getStageStatusIcon(index, currentStage, stages[index]?.status);
      const predictedTime = this.formatDuration(stats.averageTime);
      const reliability = stats.sampleCount > 5 ? '📊 高' : stats.sampleCount > 0 ? '📈 中' : '🔮 预估';
      
      report += `| ${stageName} | ${statusIcon} | ${predictedTime} | ${this.formatDuration(stats.averageTime)} | ${reliability} |\n`;
    });
    
    report += `\n`;
    
    // 性能建议
    if (!estimate.isReliable) {
      report += `### ⚠️ 预测准确性提示\n`;
      report += `当前预测基于有限的历史数据，随着处理的进行，预测准确性将逐步提高。\n\n`;
    }
    
    // 性能优化建议
    const performanceMultiplier = this.getPerformanceMultiplier();
    if (performanceMultiplier > 1.1) {
      report += `### 🔧 性能优化建议\n`;
      report += `检测到系统负载较高，建议：\n`;
      report += `- 关闭不必要的应用程序\n`;
      report += `- 确保充足的内存可用\n`;
      report += `- 检查网络连接稳定性\n\n`;
    }
    
    return report;
  }
  
  /**
   * 生成进度条
   */
  private generateProgressBar(progress: number): string {
    const totalBars = 30;
    const filledBars = Math.floor((progress / 100) * totalBars);
    const emptyBars = totalBars - filledBars;
    
    const progressBar = '█'.repeat(filledBars) + '░'.repeat(emptyBars);
    return `${progressBar} ${progress}%`;
  }
  
  /**
   * 获取阶段状态图标
   */
  private getStageStatusIcon(stageIndex: number, currentStage: number, status?: string): string {
    if (stageIndex < currentStage) {
      return '✅';
    } else if (stageIndex === currentStage) {
      return status === 'processing' ? '🔄' : status === 'failed' ? '❌' : '🔄';
    } else {
      return '⏳';
    }
  }
  
  /**
   * 格式化时长显示
   */
  private formatDuration(milliseconds: number): string {
    const seconds = Math.ceil(milliseconds / 1000);
    
    if (seconds < 60) {
      return `${seconds}秒`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}分${remainingSeconds}秒`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}小时${minutes}分`;
    }
  }
  
  /**
   * 获取历史数据统计
   */
  getOverallStats(): {
    totalSamples: number;
    averageProcessingTime: number;
    fastestCompletion: number;
    slowestCompletion: number;
    stageStats: StageTimeStats[];
  } {
    let totalSamples = 0;
    let totalTime = 0;
    let minTime = Infinity;
    let maxTime = 0;
    
    const stageStats: StageTimeStats[] = [];
    
    this.STAGE_NAMES.forEach(stageName => {
      const stats = this.getStageStats(stageName);
      stageStats.push(stats);
      
      if (stats.sampleCount > 0) {
        totalSamples += stats.sampleCount;
        totalTime += stats.averageTime * stats.sampleCount;
        minTime = Math.min(minTime, stats.minTime);
        maxTime = Math.max(maxTime, stats.maxTime);
      }
    });
    
    return {
      totalSamples,
      averageProcessingTime: totalSamples > 0 ? totalTime / totalSamples : 0,
      fastestCompletion: minTime === Infinity ? 0 : minTime,
      slowestCompletion: maxTime,
      stageStats
    };
  }
  
  /**
   * 导出历史数据为JSON
   */
  exportHistoryData(): string {
    const data = {
      stageHistory: Object.fromEntries(this.stageHistory),
      overallStats: this.getOverallStats(),
      exportedAt: new Date().toISOString()
    };
    
    return JSON.stringify(data, null, 2);
  }
  
  /**
   * 从JSON导入历史数据
   */
  importHistoryData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.stageHistory) {
        Object.entries(data.stageHistory).forEach(([stageName, history]) => {
          if (Array.isArray(history)) {
            this.stageHistory.set(stageName, history as number[]);
          }
        });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('导入历史数据失败:', error);
      return false;
    }
  }
}

// 全局进度估算器实例
export const progressEstimator = new ProgressEstimator();

export default ProgressEstimator;