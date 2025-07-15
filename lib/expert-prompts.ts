#!/usr/bin/env node

// 专家级Chain-of-Thought提示词工程
export class ExpertPromptEngine {
  
  // 阶段1: 智能解析 - 深度CoT提示词
  static buildStage1AnalysisPrompt(idea: string): string {
    return `你是一位拥有20年经验的资深产品分析师和技术架构师。你将使用Chain-of-Thought方法深度分析用户的产品想法。

## 分析目标
用户想法："${idea}"

## 思考过程 (Chain-of-Thought)

### 第一步：问题本质识别
让我首先理解这个想法的核心本质：
1. 这个想法真正要解决什么问题？
2. 为什么现有解决方案不够好？
3. 用户的痛点在哪里？

### 第二步：用户群体分析
基于问题本质，我需要分析：
1. 谁会使用这个产品？
2. 他们的使用场景是什么？
3. 他们愿意为此付费吗？

### 第三步：技术可行性评估
从技术角度思考：
1. 这个想法的技术复杂度如何？
2. 需要哪些核心技术？
3. 有什么技术风险？

### 第四步：商业价值判断
从商业角度考虑：
1. 市场规模有多大？
2. 竞争对手情况如何？
3. 盈利模式是什么？

### 第五步：实施路径规划
制定具体的实施计划：
1. MVP应该包含什么功能？
2. 开发的优先级如何排序？
3. 关键里程碑是什么？

## 输出要求

基于上述思考过程，返回以下JSON格式的深度分析：

{
  "coreProblems": "详细描述核心问题，包括问题的严重程度和普遍性",
  "targetUsers": "具体的用户群体描述，包括用户特征、使用场景、付费意愿",
  "marketPainPoints": "市场痛点的深度分析，包括现有解决方案的不足",
  "technicalComplexity": {
    "level": "1-10的技术难度评分",
    "mainChallenges": "主要技术挑战的详细描述",
    "recommendedStack": "推荐的技术栈，包括具体的技术选择理由"
  },
  "businessViability": {
    "marketPotential": "市场潜力评估，包括市场规模和增长趋势",
    "competitors": "竞争对手分析，包括优势和劣势对比",
    "monetizationModel": "详细的盈利模式设计，包括收入来源和定价策略"
  },
  "implementationPath": {
    "mvpFeatures": "MVP最小可行产品的核心功能清单",
    "developmentPriority": "开发优先级排序，包括优先级理由",
    "milestones": "关键里程碑规划，包括时间节点和交付物"
  },
  "domainClassification": "产品所属的行业领域分类",
  "keyFeatures": "5-7个核心功能特性，按重要性排序",
  "userPersonas": "详细的用户画像，包括用户需求、使用习惯、技术水平",
  "competitiveLandscape": "竞争环境的深度分析，包括市场定位建议"
}

请确保你的分析深入、专业，并基于实际的市场调研和技术评估。`;
  }

  // 阶段2: 分层规划 - 专家级架构设计
  static buildStage2PlanningPrompt(analysisData: any, allFieldIds: string[]): string {
    return `你是一位拥有15年经验的首席技术架构师和产品经理。你将使用分层架构思维设计详细的技术规划。

## 已完成的产品分析
${JSON.stringify(analysisData, null, 2)}

## 架构设计思维过程

### 第一层：系统架构设计
让我从系统整体架构开始思考：
1. 基于产品特性，应该选择什么架构模式？
2. 如何设计可扩展的系统架构？
3. 数据流和接口如何设计？

### 第二层：技术栈选择
基于架构设计，选择最适合的技术栈：
1. 前端技术：考虑用户体验和开发效率
2. 后端技术：考虑性能、可扩展性和维护性
3. 数据存储：考虑数据特性和访问模式
4. 基础设施：考虑部署、监控和成本

### 第三层：开发计划
制定详细的开发计划：
1. 如何分阶段开发？
2. 每个阶段的具体任务是什么？
3. 资源如何分配？
4. 风险如何控制？

### 第四层：质量保证
设计质量保证体系：
1. 如何确保代码质量？
2. 测试策略是什么？
3. 如何优化性能？
4. 安全性如何保证？

## 输出要求

基于上述分层思维，返回包含以下所有字段的JSON格式规划：
字段列表：${allFieldIds.join(', ')}

请确保：
1. 每个字段都有详细、具体的中文内容
2. 技术选择有充分的理由
3. 计划可执行且具有操作性
4. 考虑了实际的开发约束和资源限制

返回标准JSON格式，每个字段都必须包含具体的技术选择、实施步骤、时间估算和风险评估。`;
  }

  // 阶段3: 可视化生成 - 专业图表设计
  static buildStage3VisualizationPrompt(planningData: any): string {
    return `你是一位专业的技术图表设计师，专精于使用Mermaid.js创建清晰、准确的技术架构图。

## 技术规划信息
${JSON.stringify(planningData, null, 2)}

## 图表设计思维过程

### 第一步：系统架构图设计
基于技术栈和架构设计，我需要：
1. 识别系统的主要组件
2. 确定组件之间的关系
3. 设计清晰的层次结构
4. 选择合适的图表样式

### 第二步：数据流图设计
根据业务逻辑和数据处理流程：
1. 识别数据的入口和出口
2. 跟踪数据的流动路径
3. 标识关键的处理节点
4. 展示数据的转换过程

### 第三步：部署架构图设计
基于部署方案和基础设施：
1. 展示部署环境的层次
2. 标识关键的服务组件
3. 显示负载均衡和扩展策略
4. 包含监控和备份机制

## 输出要求

返回以下JSON格式的图表代码：

{
  "systemArchitecture": {
    "title": "系统架构图",
    "mermaidCode": "完整的mermaid代码，使用graph TB格式",
    "description": "详细的架构图说明"
  },
  "dataFlow": {
    "title": "数据流程图",
    "mermaidCode": "完整的mermaid代码，展示数据流动",
    "description": "数据流程的详细说明"
  },
  "deploymentArchitecture": {
    "title": "部署架构图",
    "mermaidCode": "完整的mermaid代码，展示部署结构",
    "description": "部署架构的详细说明"
  }
}

请确保：
1. 使用正确的Mermaid语法
2. 包含所有主要组件和服务
3. 使用适当的颜色和样式
4. 确保图表清晰易读
5. 每个节点都有意义的标签

请确保生成的Mermaid代码能够正确渲染，并且能够清晰地传达系统的架构信息。`;
  }

  // 阶段4: AI编程提示词 - 专业级任务分解
  static buildStage4AIPromptsPrompt(planningData: any, language: string): string {
    return `你是一位专业的AI提示词工程师，专精于创建高质量的编程任务指令。你将使用任务分解方法论创建专业级的编程提示词。

## 项目规划信息
${JSON.stringify(planningData, null, 2)}

## 编程语言偏好
${language}

## 任务分解方法论

### 第一步：项目全局分析
让我分析整个项目的结构：
1. 项目的核心功能是什么？
2. 需要哪些技术组件？
3. 如何合理分解任务？
4. 任务之间的依赖关系是什么？

### 第二步：任务优先级排序
基于项目需求和技术依赖：
1. 哪些任务是基础设施？
2. 哪些任务是核心功能？
3. 哪些任务是增强功能？
4. 如何安排开发顺序？

### 第三步：任务详细设计
为每个任务设计详细的规格：
1. 任务的具体目标是什么？
2. 需要什么技术要求？
3. 如何验证任务完成？
4. 有什么质量标准？

### 第四步：提示词优化
针对AI编程助手优化提示词：
1. 如何提供充分的上下文？
2. 如何确保指令清晰明确？
3. 如何包含最佳实践？
4. 如何便于AI理解和执行？

## 输出要求

返回以下JSON格式的编程提示词集合：

{
  "prompts": [
    {
      "id": "task_1",
      "title": "任务标题",
      "category": "项目初始化|核心功能|数据层|API开发|前端界面|测试验证|部署优化",
      "priority": "high|medium|low",
      "prompt": "详细的任务指令，包含背景、目标、技术要求、实现步骤和验证要求",
      "technicalRequirements": "具体的技术要求和约束",
      "deliverables": "明确的交付物清单",
      "qualityStandards": "代码质量和性能标准",
      "estimatedTime": "预计完成时间",
      "dependencies": "任务依赖关系",
      "resources": "所需资源和工具"
    }
  ],
  "executionOrder": "详细的执行顺序说明",
  "dependencies": "任务依赖关系图",
  "totalEstimatedTime": "总预计开发时间",
  "riskAssessment": "风险评估和应对策略",
  "qualityGates": "质量门控检查点"
}

请生成8-12个高质量的编程提示词，每个提示词都应该是自包含的，包含充分的上下文信息，并适合AI编程助手理解和执行。`;
  }

  // 构建系统消息
  static buildSystemMessage(role: string, expertise: string): string {
    return `你是一位${role}，拥有${expertise}的专业经验。你精通Chain-of-Thought推理方法，能够进行深入的分析和专业的决策。

你的工作方式：
1. 使用结构化的思维过程
2. 基于事实和数据进行分析
3. 考虑多个角度和可能性
4. 提供具体可执行的建议
5. 确保输出的专业性和实用性

请始终保持专业水准，提供高质量的分析和建议。`;
  }
}

// 提示词质量评估器
export class PromptQualityAssessor {
  static assessPromptQuality(prompt: string, category: string): {
    score: number;
    feedback: string[];
    improvements: string[];
  } {
    let score = 0;
    const feedback: string[] = [];
    const improvements: string[] = [];

    // 评估提示词长度
    if (prompt.length > 500) {
      score += 20;
      feedback.push("✅ 提示词长度适中，包含充分信息");
    } else {
      improvements.push("增加更多上下文信息和具体要求");
    }

    // 评估结构化程度
    if (prompt.includes("第一步") || prompt.includes("1.") || prompt.includes("###")) {
      score += 20;
      feedback.push("✅ 提示词结构清晰，逻辑性强");
    } else {
      improvements.push("添加结构化的步骤和清晰的逻辑组织");
    }

    // 评估专业性
    if (prompt.includes("专业") || prompt.includes("经验") || prompt.includes("架构师")) {
      score += 20;
      feedback.push("✅ 提示词专业性强，角色定位明确");
    } else {
      improvements.push("强化专业角色定位和专业术语使用");
    }

    // 评估可执行性
    if (prompt.includes("具体") || prompt.includes("详细") || prompt.includes("示例")) {
      score += 20;
      feedback.push("✅ 提示词具有良好的可执行性");
    } else {
      improvements.push("增加具体的执行指导和示例");
    }

    // 评估输出要求
    if (prompt.includes("JSON") || prompt.includes("格式") || prompt.includes("返回")) {
      score += 20;
      feedback.push("✅ 输出要求明确，格式规范");
    } else {
      improvements.push("明确输出格式和具体要求");
    }

    return {
      score,
      feedback,
      improvements
    };
  }
}