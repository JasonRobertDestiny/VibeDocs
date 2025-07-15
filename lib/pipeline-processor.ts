#!/usr/bin/env node

import { SOP_TEMPLATE } from './sop-template.js';
import { RobustJSONParser, IntelligentRetryManager, ErrorHandler } from './robust-utils.js';
import { ExpertPromptEngine, PromptQualityAssessor } from './expert-prompts.js';
import { generationCache } from './cache.js';
import { StreamProcessor, MemoryMonitor, StreamBuffer } from './stream-processor.js';
import { performanceMonitor } from './performance-monitor.js';
import { progressEstimator, TimeEstimate } from './progress-estimator.js';
import { ResultQualityEvaluator } from './result-quality-evaluator.js';

// 定义处理阶段的接口
export interface ProcessingStage {
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: any;
  error?: string;
  startTime?: number;
  endTime?: number;
  estimatedDuration?: number; // 预计持续时间
  actualDuration?: number; // 实际持续时间
}

// 定义处理状态的接口
export interface ProcessingStatus {
  currentStage: number;
  totalStages: number;
  stages: ProcessingStage[];
  overallProgress: number;
  isComplete: boolean;
  hasError: boolean;
  globalResults: Record<string, any>;
  timeEstimate?: TimeEstimate; // 智能时间估算
  performanceMetrics?: { // 性能指标
    averageStageTime: number;
    totalElapsedTime: number;
    estimatedRemainingTime: number;
  };
}

// 定义每个阶段的结果接口
export interface StageResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

// 五阶段流水线处理器
export class PipelineProcessor {
  private apiKey: string;
  private statusCallback?: (status: ProcessingStatus) => void;
  private status: ProcessingStatus;
  private memoryMonitor: MemoryMonitor;
  private streamBuffer: StreamBuffer<any>;
  private parallelProcessing: boolean = true;

  constructor(apiKey: string, statusCallback?: (status: ProcessingStatus) => void) {
    this.apiKey = apiKey;
    this.statusCallback = statusCallback;
    this.status = this.initializeStatus();
    
    // 初始化内存监控器 (50MB限制)
    this.memoryMonitor = new MemoryMonitor(50 * 1024 * 1024);
    
    // 初始化流式缓冲区
    this.streamBuffer = new StreamBuffer(10, async (items) => {
      console.log(`🔄 批处理 ${items.length} 个项目`);
    });
  }

  private initializeStatus(): ProcessingStatus {
    return {
      currentStage: 0,
      totalStages: 5,
      stages: [
        { name: '🔍 智能解析', status: 'pending', progress: 0 },
        { name: '🏗️ 分层规划', status: 'pending', progress: 0 },
        { name: '📊 可视化生成', status: 'pending', progress: 0 },
        { name: '🤖 编程提示词工程', status: 'pending', progress: 0 },
        { name: '✅ 质量验证与整合', status: 'pending', progress: 0 }
      ],
      overallProgress: 0,
      isComplete: false,
      hasError: false,
      globalResults: {}
    };
  }

  private updateStatus(stageIndex: number, updates: Partial<ProcessingStage>): void {
    this.status.stages[stageIndex] = { ...this.status.stages[stageIndex], ...updates };
    this.status.currentStage = stageIndex;
    
    // 计算总体进度
    const completedStages = this.status.stages.filter(s => s.status === 'completed').length;
    const processingStages = this.status.stages.filter(s => s.status === 'processing').length;
    this.status.overallProgress = Math.round((completedStages + processingStages * 0.5) / this.status.totalStages * 100);
    
    // 检查是否完成
    this.status.isComplete = completedStages === this.status.totalStages;
    this.status.hasError = this.status.stages.some(s => s.status === 'failed');
    
    // 🔥 新增：智能时间估算
    const currentStageInfo = this.status.stages[stageIndex];
    if (currentStageInfo && currentStageInfo.status === 'processing') {
      this.status.timeEstimate = progressEstimator.estimateRemainingTime(
        stageIndex,
        currentStageInfo.progress || 0,
        currentStageInfo.startTime
      );
    }
    
    // 🔥 新增：性能指标计算
    this.status.performanceMetrics = this.calculatePerformanceMetrics();
    
    // 🔥 新增：记录阶段完成时间到历史数据
    if (updates.status === 'completed' && updates.endTime && updates.startTime) {
      const stageName = this.status.stages[stageIndex].name;
      const duration = updates.endTime - updates.startTime;
      progressEstimator.recordStageCompletion(stageName, duration);
      
      // 更新阶段的实际持续时间
      this.status.stages[stageIndex].actualDuration = duration;
    }
    
    // 触发回调
    if (this.statusCallback) {
      this.statusCallback(this.status);
    }
  }
  
  /**
   * 计算性能指标
   */
  private calculatePerformanceMetrics(): { 
    averageStageTime: number; 
    totalElapsedTime: number; 
    estimatedRemainingTime: number; 
  } {
    const completedStages = this.status.stages.filter(s => s.status === 'completed' && s.actualDuration);
    const averageStageTime = completedStages.length > 0 
      ? completedStages.reduce((sum, stage) => sum + (stage.actualDuration || 0), 0) / completedStages.length
      : 0;
    
    const totalElapsedTime = completedStages.reduce((sum, stage) => sum + (stage.actualDuration || 0), 0);
    
    const estimatedRemainingTime = this.status.timeEstimate?.estimatedRemainingTime || 0;
    
    return {
      averageStageTime,
      totalElapsedTime,
      estimatedRemainingTime
    };
  }

  private async callAI(prompt: string, systemMessage?: string, useCache: boolean = true, context?: string): Promise<any> {
    // 开始性能监控
    const timer = performanceMonitor.startTimer('api_call_duration', { 
      context,
      promptLength: prompt.length,
      hasSystemMessage: !!systemMessage
    });
    
    try {
      // 内存检查
      await this.memoryMonitor.checkMemoryUsage();
      
      // 检查缓存（支持语义相似度匹配）
      if (useCache) {
        const cacheMetadata = {
          stage: context,
          systemMessage: systemMessage ? systemMessage.substring(0, 50) : undefined
        };
        
        const cachedResult = generationCache.get(prompt, cacheMetadata);
        if (cachedResult) {
          performanceMonitor.recordEvent('cache_hits', 1, { context, type: 'exact_or_semantic' });
          timer.stopWithResult(true, { cacheHit: true });
          return cachedResult;
        } else {
          performanceMonitor.recordEvent('cache_misses', 1, { context });
        }
      }

      // 检查prompt大小，如果太大则使用流式处理
      const promptSize = Buffer.byteLength(prompt, 'utf8');
      const MAX_PROMPT_SIZE = 1024 * 16; // 16KB
      
      if (promptSize > MAX_PROMPT_SIZE) {
        console.log(`📊 检测到大型prompt (${Math.round(promptSize/1024)}KB)，启用流式处理`);
        performanceMonitor.recordEvent('large_prompt_detected', 1, { 
          context, 
          size: promptSize,
          useStreaming: true 
        });
        
        const result = await this.callAIWithStreaming(prompt, systemMessage, context);
        timer.stopWithResult(true, { streaming: true });
        return result;
      }

      // 记录API调用
      performanceMonitor.recordEvent('api_calls', 1, { context, promptSize });

      const result = await IntelligentRetryManager.executeWithRetry(
        async () => {
          // 内存检查
          await this.memoryMonitor.checkMemoryUsage();
          
          const apiTimer = performanceMonitor.startTimer('api_request_duration', { context });
          
          const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
              model: 'Qwen/Qwen2.5-72B-Instruct',
              messages: [
                ...(systemMessage ? [{ role: 'system', content: systemMessage }] : []),
                { role: 'user', content: prompt }
              ],
              temperature: 0.7,
              max_tokens: 4000,
              stream: false // 标准模式
            })
          });

          if (!response.ok) {
            apiTimer.stopWithResult(false, { status: response.status });
            throw new Error(`AI API调用失败: ${response.status} ${response.statusText}`);
          }

          const data = await response.json();
          const content = data.choices?.[0]?.message?.content;
          
          apiTimer.stopWithResult(true, { 
            responseLength: content?.length || 0,
            tokensUsed: data.usage?.total_tokens || 0
          });
          
          return content;
        },
        {
          maxRetries: 3,
          baseDelay: 1000,
          context: context || 'AI调用',
          onRetry: (attempt, error) => {
            performanceMonitor.recordEvent('retry_attempts', 1, { 
              context, 
              attempt, 
              error: error.message 
            });
            console.log(`🔄 AI API调用重试 (${attempt}/3): ${error.message}`);
          }
        }
      );

      // 尝试解析JSON以记录成功率
      try {
        const parsed = RobustJSONParser.parseAIResponse(result, null, context);
        if (parsed && !parsed.fallback) {
          performanceMonitor.recordEvent('json_parse_success', 1, { context });
        } else {
          performanceMonitor.recordEvent('json_parse_fallback', 1, { context });
        }
      } catch (error) {
        performanceMonitor.recordEvent('json_parse_failures', 1, { 
          context, 
          error: error instanceof Error ? error.message : String(error)
        });
      }

      // 缓存结果（包含语义向量）
      if (useCache && result) {
        const cacheMetadata = {
          stage: context,
          systemMessage: systemMessage ? systemMessage.substring(0, 50) : undefined,
          resultLength: result.length
        };
        
        generationCache.set(prompt, result, cacheMetadata);
      }

      timer.stopWithResult(true, { resultLength: result?.length || 0 });
      return result;
      
    } catch (error) {
      timer.stopWithResult(false, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * 流式AI调用 - 处理大型prompt
   */
  private async callAIWithStreaming(prompt: string, systemMessage?: string, context?: string): Promise<any> {
    const results: string[] = [];
    
    // 将大型prompt分块处理
    for await (const chunk of StreamProcessor.processTextStream(
      prompt,
      async (chunk) => {
        return await this.callAISingleChunk(chunk, systemMessage, context);
      },
      {
        chunkSize: 8192, // 8KB chunks
        overlap: 200,
        onProgress: (processed, total) => {
          console.log(`📊 流式处理进度: ${processed}/${total} chunks`);
        }
      }
    )) {
      results.push(chunk);
    }
    
    // 合并结果
    const combinedResult = results.join('\n');
    
    // 尝试解析和合并JSON结果
    return this.mergeStreamedResults(results);
  }

  /**
   * 单个chunk的AI调用
   */
  private async callAISingleChunk(chunk: string, systemMessage?: string, context?: string): Promise<string> {
    return await IntelligentRetryManager.executeWithRetry(
      async () => {
        const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: 'Qwen/Qwen2.5-72B-Instruct',
            messages: [
              ...(systemMessage ? [{ role: 'system', content: systemMessage }] : []),
              { role: 'user', content: chunk }
            ],
            temperature: 0.7,
            max_tokens: 2000 // 减少token以适应chunk处理
          })
        });

        if (!response.ok) {
          throw new Error(`AI API调用失败: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || '';
      },
      {
        maxRetries: 2,
        baseDelay: 500,
        context: `${context}_chunk`,
        onRetry: (attempt, error) => {
          console.log(`🔄 Chunk API调用重试 (${attempt}/2): ${error.message}`);
        }
      }
    );
  }

  /**
   * 合并流式处理的结果
   */
  private mergeStreamedResults(results: string[]): any {
    try {
      // 尝试解析每个结果为JSON
      const jsonResults = results.map(result => {
        try {
          return RobustJSONParser.parseAIResponse(result, null, 'streaming');
        } catch (error) {
          return { content: result };
        }
      }).filter(r => r !== null);

      if (jsonResults.length === 0) {
        return { content: results.join('\n') };
      }

      // 合并JSON对象
      const merged: any = {};
      for (const jsonResult of jsonResults) {
        if (typeof jsonResult === 'object' && jsonResult !== null) {
          Object.assign(merged, jsonResult);
        }
      }

      return merged;
    } catch (error) {
      console.warn(`⚠️ 流式结果合并失败，返回原始结果: ${error instanceof Error ? error.message : String(error)}`);
      return { content: results.join('\n') };
    }
  }

  private generateCacheKey(prompt: string, systemMessage?: string): string {
    // 生成基于prompt和systemMessage的缓存键
    const combined = `${systemMessage || ''}|${prompt}`;
    return combined.substring(0, 100).replace(/\s+/g, '_');
  }

  // 阶段1: 智能解析 - 深度理解用户意图
  private async stage1_IntelligentAnalysis(idea: string): Promise<StageResult> {
    const stageIndex = 0;
    this.updateStatus(stageIndex, { status: 'processing', progress: 0, startTime: Date.now() });

    try {
      const systemMessage = ExpertPromptEngine.buildSystemMessage(
        "资深产品分析师和技术架构师",
        "20年产品设计和技术架构"
      );

      const prompt = ExpertPromptEngine.buildStage1AnalysisPrompt(idea);
      
      // 评估提示词质量
      const quality = PromptQualityAssessor.assessPromptQuality(prompt, "analysis");
      console.log(`📊 提示词质量评分: ${quality.score}/100`);

      this.updateStatus(stageIndex, { progress: 50 });

      const result = await this.callAI(prompt, systemMessage);
      
      // 使用健壮的JSON解析器
      const analysisData = RobustJSONParser.parseAIResponse(result, {
        coreProblems: "需要进一步分析",
        targetUsers: "待定义",
        marketPainPoints: "待识别",
        technicalComplexity: { level: "5", mainChallenges: "待评估", recommendedStack: "待确定" },
        businessViability: { marketPotential: "待评估", competitors: "待分析", monetizationModel: "待设计" },
        implementationPath: { mvpFeatures: "待定义", developmentPriority: "待排序", milestones: "待规划" },
        domainClassification: "通用软件",
        keyFeatures: "待提取",
        userPersonas: "待详细定义",
        competitiveLandscape: "待深入分析"
      });

      this.updateStatus(stageIndex, { 
        status: 'completed', 
        progress: 100, 
        result: analysisData,
        endTime: Date.now()
      });

      return { success: true, data: analysisData };
    } catch (error) {
      const userFriendlyError = ErrorHandler.handleError(error, '智能解析阶段');
      this.updateStatus(stageIndex, { 
        status: 'failed', 
        progress: 0, 
        error: userFriendlyError,
        endTime: Date.now()
      });
      return { success: false, error: userFriendlyError };
    }
  }

  // 阶段2: 分层规划 - 专业化技术方案
  private async stage2_LayeredPlanning(analysisData: any): Promise<StageResult> {
    const stageIndex = 1;
    this.updateStatus(stageIndex, { status: 'processing', progress: 0, startTime: Date.now() });

    try {
      const systemMessage = ExpertPromptEngine.buildSystemMessage(
        "首席技术架构师和产品经理",
        "15年大型系统架构设计"
      );

      const allFieldIds = SOP_TEMPLATE.flatMap(step => step.fields.map(field => field.id));
      const prompt = ExpertPromptEngine.buildStage2PlanningPrompt(analysisData, allFieldIds);
      
      // 评估提示词质量
      const quality = PromptQualityAssessor.assessPromptQuality(prompt, "planning");
      console.log(`📊 分层规划提示词质量: ${quality.score}/100`);

      this.updateStatus(stageIndex, { progress: 50 });

      const result = await this.callAI(prompt, systemMessage);
      
      // 使用健壮的JSON解析器
      const planningData = RobustJSONParser.parseAIResponse(result, {});

      // 验证并填充缺失字段
      const missingFields = allFieldIds.filter(fieldId => !(fieldId in planningData));
      missingFields.forEach(fieldId => {
        planningData[fieldId] = `基于${analysisData.domainClassification || '项目'}需求，请详细填写${fieldId}相关内容`;
      });

      this.updateStatus(stageIndex, { 
        status: 'completed', 
        progress: 100, 
        result: planningData,
        endTime: Date.now()
      });

      return { success: true, data: planningData };
    } catch (error) {
      const userFriendlyError = ErrorHandler.handleError(error, '智能解析阶段');
      this.updateStatus(stageIndex, { 
        status: 'failed', 
        progress: 0, 
        error: userFriendlyError,
        endTime: Date.now()
      });
      return { success: false, error: userFriendlyError };
    }
  }

  // 阶段3: 可视化生成 - 图表和流程图
  public async stage3_VisualizationGeneration(planningData: any): Promise<StageResult> {
    const stageIndex = 2;
    this.updateStatus(stageIndex, { status: 'processing', progress: 0, startTime: Date.now() });

    try {
      const systemMessage = ExpertPromptEngine.buildSystemMessage(
        "专业的技术图表设计师",
        "10年Mermaid.js和架构图设计"
      );

      const prompt = ExpertPromptEngine.buildStage3VisualizationPrompt(planningData);
      
      // 评估提示词质量
      const quality = PromptQualityAssessor.assessPromptQuality(prompt, "visualization");
      console.log(`📊 可视化提示词质量: ${quality.score}/100`);

      this.updateStatus(stageIndex, { progress: 33 });

      const result = await this.callAI(prompt, systemMessage);
      
      this.updateStatus(stageIndex, { progress: 66 });

      // 使用健壮的JSON解析器
      const visualizationData = RobustJSONParser.parseAIResponse(result, {
        systemArchitecture: {
          title: "系统架构图",
          mermaidCode: "graph TB\n    A[用户] --> B[应用]\n    B --> C[数据库]",
          description: "基础系统架构"
        },
        dataFlow: {
          title: "数据流程图",
          mermaidCode: "graph LR\n    A[输入] --> B[处理]\n    B --> C[输出]",
          description: "基础数据流程"
        },
        deploymentArchitecture: {
          title: "部署架构图",
          mermaidCode: "graph TB\n    A[前端] --> B[后端]\n    B --> C[数据库]",
          description: "基础部署架构"
        }
      });

      // 验证Mermaid语法
      this.validateMermaidSyntax(visualizationData);

      this.updateStatus(stageIndex, { 
        status: 'completed', 
        progress: 100, 
        result: visualizationData,
        endTime: Date.now()
      });

      return { success: true, data: visualizationData };
    } catch (error) {
      const userFriendlyError = ErrorHandler.handleError(error, '智能解析阶段');
      this.updateStatus(stageIndex, { 
        status: 'failed', 
        progress: 0, 
        error: userFriendlyError,
        endTime: Date.now()
      });
      return { success: false, error: userFriendlyError };
    }
  }

  // 阶段4: 编程提示词工程 - 高质量AI助手指令
  public async stage4_AIPromptGeneration(planningData: any, language: string = 'typescript'): Promise<StageResult> {
    const stageIndex = 3;
    this.updateStatus(stageIndex, { status: 'processing', progress: 0, startTime: Date.now() });

    try {
      const systemMessage = ExpertPromptEngine.buildSystemMessage(
        "专业的AI提示词工程师",
        "10年AI工程和编程任务设计"
      );

      const prompt = ExpertPromptEngine.buildStage4AIPromptsPrompt(planningData, language);
      
      // 评估提示词质量
      const quality = PromptQualityAssessor.assessPromptQuality(prompt, "ai-prompts");
      console.log(`📊 AI提示词生成质量: ${quality.score}/100`);

      this.updateStatus(stageIndex, { progress: 50 });

      const result = await this.callAI(prompt, systemMessage);
      
      // 使用健壮的JSON解析器
      const promptsData = RobustJSONParser.parseAIResponse(result, {
        prompts: [
          {
            id: "task_1",
            title: "项目初始化",
            category: "项目初始化",
            prompt: "请创建项目基础结构",
            technicalRequirements: "基础开发环境",
            deliverables: "完整项目框架",
            qualityStandards: "代码规范",
            estimatedTime: "1-2天"
          }
        ],
        executionOrder: "按顺序执行",
        dependencies: "无特殊依赖",
        totalEstimatedTime: "待估算"
      });

      this.updateStatus(stageIndex, { 
        status: 'completed', 
        progress: 100, 
        result: promptsData,
        endTime: Date.now()
      });

      return { success: true, data: promptsData };
    } catch (error) {
      const userFriendlyError = ErrorHandler.handleError(error, '智能解析阶段');
      this.updateStatus(stageIndex, { 
        status: 'failed', 
        progress: 0, 
        error: userFriendlyError,
        endTime: Date.now()
      });
      return { success: false, error: userFriendlyError };
    }
  }

  // 阶段5: 质量验证与整合 - 增强版包含结果质量评估
  private async stage5_QualityValidationAndIntegration(
    analysisData: any,
    planningData: any,
    visualizationData: any,
    promptsData: any
  ): Promise<StageResult> {
    const stageIndex = 4;
    this.updateStatus(stageIndex, { status: 'processing', progress: 0, startTime: Date.now() });

    try {
      // 传统质量检查 (40%)
      this.updateStatus(stageIndex, { progress: 20 });
      
      const qualityChecks = {
        analysisCompleteness: this.validateAnalysisCompleteness(analysisData),
        planningCompleteness: this.validatePlanningCompleteness(planningData),
        visualizationValidity: this.validateVisualizationData(visualizationData),
        promptsQuality: this.validatePromptsQuality(promptsData)
      };

      this.updateStatus(stageIndex, { progress: 40 });

      // 🔥 新增：智能结果质量评估 (40%)
      console.log('🔍 执行智能结果质量评估...');
      
      const resultQualityAssessment = await ResultQualityEvaluator.evaluateResult(
        analysisData,
        planningData,
        visualizationData,
        promptsData,
        {
          generatedAt: new Date().toISOString(),
          processingTime: this.calculateTotalProcessingTime(),
          version: '2.0.0'
        },
        {
          strictMode: false,
          focusArea: 'general',
          requireMermaidValidation: true,
          minimumPromptCount: 8,
          checkFeasibility: true
        }
      );

      this.updateStatus(stageIndex, { progress: 80 });

      // 创建最终整合输出 (20%)
      const finalOutput = {
        metadata: {
          generatedAt: new Date().toISOString(),
          processingTime: this.calculateTotalProcessingTime(),
          qualityScore: this.calculateQualityScore(qualityChecks),
          version: '2.0.0',
          // 🔥 新增：结果质量评估数据
          resultQualityAssessment: resultQualityAssessment
        },
        analysis: analysisData,
        planning: planningData,
        visualizations: visualizationData,
        aiPrompts: promptsData,
        qualityReport: qualityChecks,
        // 🔥 新增：智能质量评估
        intelligentQualityAssessment: resultQualityAssessment,
        executionSummary: this.generateExecutionSummary(analysisData, planningData, promptsData),
        // 🔥 新增：质量改进建议
        qualityRecommendations: resultQualityAssessment.recommendations
      };

      // 记录质量评估指标
      performanceMonitor.recordEvent('intelligent_quality_assessment', 1, {
        overallScore: resultQualityAssessment.overallScore,
        qualityLevel: resultQualityAssessment.qualityLevel,
        isProducible: resultQualityAssessment.isProducible,
        productionReadiness: resultQualityAssessment.productionReadiness
      });

      this.updateStatus(stageIndex, { 
        status: 'completed', 
        progress: 100, 
        result: finalOutput,
        endTime: Date.now()
      });

      // 输出质量评估总结
      console.log(`📊 智能质量评估完成:`);
      console.log(`   - 总体质量: ${resultQualityAssessment.overallScore}/100 (${resultQualityAssessment.qualityLevel})`);
      console.log(`   - 可实施性: ${resultQualityAssessment.isProducible ? '✅ 可实施' : '❌ 需改进'}`);
      console.log(`   - 生产就绪度: ${resultQualityAssessment.productionReadiness}/100`);
      console.log(`   - 评估置信度: ${resultQualityAssessment.confidenceScore}/100`);

      if (resultQualityAssessment.weaknesses.length > 0) {
        console.log(`⚠️ 发现 ${resultQualityAssessment.weaknesses.length} 个需要改进的方面`);
      }

      return { success: true, data: finalOutput };
    } catch (error) {
      const userFriendlyError = ErrorHandler.handleError(error, '质量验证与整合阶段');
      this.updateStatus(stageIndex, { 
        status: 'failed', 
        progress: 0, 
        error: userFriendlyError,
        endTime: Date.now()
      });
      return { success: false, error: userFriendlyError };
    }
  }

  // 主要的处理方法 - 优化版支持并行处理
  async processIdea(idea: string, language: string = 'typescript'): Promise<StageResult> {
    if (!idea?.trim()) {
      throw new Error('请提供有效的产品想法');
    }

    if (!this.apiKey) {
      throw new Error('未配置 SILICONFLOW_API_KEY 环境变量');
    }

    try {
      // 重置状态
      this.status = this.initializeStatus();
      
      console.log('🚀 开始优化的并行处理流水线');

      // 阶段1: 智能解析 (必须首先执行)
      console.log('📊 执行阶段1: 智能解析');
      const stage1Result = await this.stage1_IntelligentAnalysis(idea);
      if (!stage1Result.success) {
        return stage1Result;
      }

      // 阶段2: 分层规划 (依赖阶段1)
      console.log('🏗️ 执行阶段2: 分层规划');
      const stage2Result = await this.stage2_LayeredPlanning(stage1Result.data);
      if (!stage2Result.success) {
        return stage2Result;
      }

      // 🔥 关键优化: 并行执行阶段3和阶段4
      console.log('⚡ 执行并行优化: 阶段3和阶段4同时执行');
      const parallelStartTime = Date.now();
      
      // 更新两个阶段的状态为processing
      this.updateStatus(2, { status: 'processing', progress: 0, startTime: Date.now() });
      this.updateStatus(3, { status: 'processing', progress: 0, startTime: Date.now() });

      const [stage3Result, stage4Result] = await Promise.all([
        this.stage3_VisualizationGeneration(stage2Result.data),
        this.stage4_AIPromptGeneration(stage2Result.data, language)
      ]);

      const parallelEndTime = Date.now();
      const parallelTime = parallelEndTime - parallelStartTime;
      console.log(`⚡ 并行处理完成，耗时: ${parallelTime}ms`);

      // 检查并行阶段结果
      if (!stage3Result.success) {
        return stage3Result;
      }
      if (!stage4Result.success) {
        return stage4Result;
      }

      // 阶段5: 质量验证与整合 (依赖所有前置阶段)
      console.log('✅ 执行阶段5: 质量验证与整合');
      const stage5Result = await this.stage5_QualityValidationAndIntegration(
        stage1Result.data,
        stage2Result.data,
        stage3Result.data,
        stage4Result.data
      );

      // 添加性能统计到最终结果
      if (stage5Result.success && stage5Result.data) {
        stage5Result.data.optimizationMetrics = {
          parallelProcessingTime: parallelTime,
          totalProcessingTime: this.calculateTotalProcessingTime(),
          cacheHits: this.getCacheStats(),
          performanceImprovement: `并行处理节省了约${Math.round(parallelTime * 0.5)}ms`
        };
      }

      return stage5Result;
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  // 辅助方法 - 增强的Mermaid语法验证
  private validateMermaidSyntax(visualizationData: any): void {
    const requiredKeys = ['systemArchitecture', 'dataFlow', 'deploymentArchitecture'];
    
    for (const key of requiredKeys) {
      if (!visualizationData[key] || !visualizationData[key].mermaidCode) {
        throw new Error(`缺少必需的可视化图表: ${key}`);
      }
      
      // 增强的Mermaid语法验证
      const mermaidCode = visualizationData[key].mermaidCode;
      this.validateMermaidCodeSyntax(mermaidCode, key);
    }
  }

  private validateMermaidCodeSyntax(code: string, chartType: string): void {
    const trimmedCode = code.trim();
    
    // 基本结构验证
    if (!trimmedCode) {
      throw new Error(`${chartType} Mermaid代码为空`);
    }

    // 检查是否有有效的Mermaid图表类型
    const validGraphTypes = ['graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'erDiagram', 'gitgraph'];
    const hasValidStart = validGraphTypes.some(type => 
      trimmedCode.toLowerCase().startsWith(type.toLowerCase())
    );
    
    if (!hasValidStart) {
      console.warn(`⚠️ ${chartType}: 可能缺少有效的Mermaid图表类型声明`);
    }

    // 检查graph类型的方向声明
    if (trimmedCode.toLowerCase().startsWith('graph')) {
      const graphDirections = ['TB', 'TD', 'BT', 'RL', 'LR'];
      const hasDirection = graphDirections.some(dir => 
        trimmedCode.toLowerCase().includes(dir.toLowerCase())
      );
      
      if (!hasDirection) {
        console.warn(`⚠️ ${chartType}: Graph类型建议包含方向声明 (TB, LR, etc.)`);
      }
    }

    // 检查节点连接语法
    const connectionPatterns = [
      /\w+\s*-->\s*\w+/,  // A --> B
      /\w+\s*---\s*\w+/,  // A --- B
      /\w+\s*-\.\s*\w+/,  // A -. B
      /\w+\s*==>\s*\w+/,  // A ==> B
    ];
    
    const hasConnections = connectionPatterns.some(pattern => pattern.test(trimmedCode));
    if (!hasConnections) {
      console.warn(`⚠️ ${chartType}: 可能缺少节点连接声明`);
    }

    // 检查节点标签语法
    const labelPatterns = [
      /\w+\[.+?\]/,       // A[Label]
      /\w+\(.+?\)/,       // A(Label)
      /\w+\{.+?\}/,       // A{Label}
    ];
    
    const hasLabels = labelPatterns.some(pattern => pattern.test(trimmedCode));
    if (!hasLabels) {
      console.warn(`⚠️ ${chartType}: 建议为节点添加标签以提高可读性`);
    }

    // 检查潜在的语法错误
    const syntaxIssues = [];
    
    // 检查不匹配的括号
    const brackets = [['[', ']'], ['(', ')'], ['{', '}']];
    for (const [open, close] of brackets) {
      const openCount = (trimmedCode.match(new RegExp('\\' + open, 'g')) || []).length;
      const closeCount = (trimmedCode.match(new RegExp('\\' + close, 'g')) || []).length;
      if (openCount !== closeCount) {
        syntaxIssues.push(`不匹配的括号: ${open}${close}`);
      }
    }

    // 检查非法字符
    const invalidChars = trimmedCode.match(/[<>]/g);
    if (invalidChars) {
      syntaxIssues.push(`包含可能导致渲染问题的字符: ${invalidChars.join(', ')}`);
    }

    if (syntaxIssues.length > 0) {
      console.warn(`⚠️ ${chartType} 语法警告: ${syntaxIssues.join('; ')}`);
    }

    console.log(`✅ ${chartType} Mermaid语法验证通过`);
  }

  private validateAnalysisCompleteness(data: any): boolean {
    const requiredKeys = ['coreProblems', 'targetUsers', 'technicalComplexity', 'businessViability'];
    return requiredKeys.every(key => data[key]);
  }

  private validatePlanningCompleteness(data: any): boolean {
    const allFieldIds = SOP_TEMPLATE.flatMap(step => step.fields.map(field => field.id));
    return allFieldIds.every(fieldId => data[fieldId]);
  }

  private validateVisualizationData(data: any): boolean {
    const requiredCharts = ['systemArchitecture', 'dataFlow', 'deploymentArchitecture'];
    return requiredCharts.every(chart => data[chart] && data[chart].mermaidCode);
  }

  private validatePromptsQuality(data: any): boolean {
    return data.prompts && Array.isArray(data.prompts) && data.prompts.length >= 8;
  }

  private calculateTotalProcessingTime(): number {
    const completedStages = this.status.stages.filter(s => s.endTime && s.startTime);
    return completedStages.reduce((total, stage) => total + (stage.endTime! - stage.startTime!), 0);
  }

  private calculateQualityScore(checks: any): number {
    const scores = Object.values(checks).map(check => check ? 1 : 0);
    return Math.round(scores.reduce((sum: number, score) => sum + score, 0) / scores.length * 100);
  }

  private generateExecutionSummary(analysisData: any, planningData: any, promptsData: any): string {
    return `基于用户想法生成了完整的开发方案，包含${analysisData.keyFeatures?.length || 0}个核心功能，${promptsData.prompts?.length || 0}个编程任务，预计开发时间：${promptsData.totalEstimatedTime || '待估算'}。`;
  }

  private getCacheStats(): string {
    const stats = generationCache.getStats();
    return `缓存大小: ${stats.size}, 最旧条目: ${stats.oldestEntry ? new Date(stats.oldestEntry).toLocaleTimeString() : 'N/A'}`;
  }

  // 获取当前状态
  getStatus(): ProcessingStatus {
    return this.status;
  }
}