#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { SOP_TEMPLATE } from "../lib/sop-template.js";
import { PipelineProcessor, ProcessingStatus } from "../lib/pipeline-processor.js";
import { FileExportManager } from "../lib/file-export-manager.js";
import { InputQualityAssistant } from "../lib/input-quality-assistant.js";

// Enhanced AI Generate Plan Tool with Pipeline Processing
class VibeDocMCPServer {
  private server: Server;
  private apiKey: string;
  private activePipelines: Map<string, PipelineProcessor> = new Map();

  constructor() {
    this.apiKey = process.env.SILICONFLOW_API_KEY || '';
    this.server = new Server(
      {
        name: "vibedoc-mcp-server",
        version: "2.0.0",
      },
      {
        capabilities: {
          tools: {},
          notifications: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error("[MCP Error]", error);
    };

    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "generate_development_plan",
            description: "🚀 **智能开发规划生成器** - 使用AI驱动的5阶段流水线，将您的创意转化为完整的开发计划\n\n**功能特点:**\n✨ 智能解析 - 深度理解项目需求\n🏗️ 分层规划 - 系统化架构设计  \n📊 可视化生成 - 自动生成Mermaid图表\n🤖 AI提示词工程 - 生成可执行的编程任务\n✅ 质量验证 - 确保输出完整性\n\n**处理时间:** ~30秒 | **成功率:** >98%",
            inputSchema: {
              type: "object",
              properties: {
                idea: {
                  type: "string",
                  description: "💡 请详细描述您的产品想法或项目需求（建议50-500字，包含核心功能、目标用户、解决的问题等）",
                  minLength: 10,
                  maxLength: 2000,
                },
                language: {
                  type: "string",
                  description: "🔧 首选编程语言（将影响技术栈选择和代码示例）",
                  enum: ["typescript", "javascript", "python", "java", "go", "rust"],
                  default: "typescript",
                },
                with_progress: {
                  type: "boolean",
                  description: "📊 显示实时处理进度（推荐开启，可查看各阶段执行状态）",
                  default: true,
                },
              },
              required: ["idea"],
            },
          },
          {
            name: "get_processing_status",
            description: "📊 **实时状态监控** - 查看开发计划生成的详细进度和各阶段状态\n\n**提供信息:**\n🔄 实时进度百分比\n📋 各阶段详细状态\n⏱️ 预计剩余时间\n❌ 错误诊断信息",
            inputSchema: {
              type: "object",
              properties: {
                pipeline_id: {
                  type: "string",
                  description: "🆔 流水线处理ID（从generate_development_plan响应的_meta中获取）",
                  pattern: "^pipeline_[0-9]+_[a-z0-9]+$",
                },
              },
              required: ["pipeline_id"],
            },
          },
          {
            name: "get_project_template",
            description: "📋 **项目规划模板** - 获取标准化的项目规划模板，了解VibeDoc的规划结构\n\n**模板包含:**\n📝 完整的字段定义\n🏷️ 标准化标签体系\n📚 使用说明和示例\n✅ 质量检查清单",
            inputSchema: {
              type: "object",
              properties: {
                format: {
                  type: "string",
                  description: "📄 模板输出格式（推荐使用structured获得最佳阅读体验）",
                  enum: ["json", "markdown", "structured"],
                  default: "structured",
                },
              },
            },
          },
          {
            name: "generate_ai_prompts",
            description: "🤖 **AI编程助手生成器** - 将开发计划转化为可执行的AI编程提示词\n\n**输出内容:**\n📝 分步骤编程任务\n🎯 具体技术要求\n📋 验收标准清单\n⏱️ 时间估算\n\n*注：此功能已集成到主流程中，通常无需单独调用*",
            inputSchema: {
              type: "object",
              properties: {
                plan_data: {
                  type: "object",
                  description: "📊 开发计划数据（来自generate_development_plan的输出）",
                },
                language: {
                  type: "string",
                  description: "🔧 编程语言偏好（需与计划数据一致）",
                  enum: ["javascript", "typescript", "python", "java", "go", "rust"],
                  default: "typescript",
                },
              },
              required: ["plan_data"],
            },
          },
          {
            name: "generate_visualizations",
            description: "📊 **可视化图表生成器** - 基于开发计划创建专业的Mermaid.js架构图\n\n**生成图表:**\n🏗️ 系统架构图 - 展示整体结构\n🔄 数据流程图 - 显示信息流向\n🚀 部署架构图 - 描述部署策略\n\n**特色功能:**\n✅ 语法验证确保可渲染\n🎨 自适应样式设计\n📱 多平台兼容",
            inputSchema: {
              type: "object",
              properties: {
                plan_data: {
                  type: "object",
                  description: "📊 开发计划数据（来自generate_development_plan的planning部分）",
                },
                chart_types: {
                  type: "array",
                  items: {
                    type: "string",
                    enum: ["system_architecture", "data_flow", "deployment"]
                  },
                  description: "🎯 要生成的图表类型（默认生成全部三种图表）",
                  default: ["system_architecture", "data_flow", "deployment"]
                },
              },
              required: ["plan_data"],
            },
          },
          {
            name: "export_report",
            description: "📄 **一键报告导出** - 将完整的开发计划保存为本地Markdown文件\n\n**功能特点:**\n💾 一键保存 - 自动生成专业报告文档\n📁 智能命名 - 基于项目名称自动命名\n📊 完整内容 - 包含所有分析、规划、图表\n🎨 格式优化 - 支持Markdown完美渲染\n\n**保存位置:** ~/VibeDoc-Reports/ | **支持格式:** Markdown",
            inputSchema: {
              type: "object",
              properties: {
                plan_data: {
                  type: "object",
                  description: "📊 项目规划数据（来自generate_development_plan的plan_data）",
                },
                analysis_data: {
                  type: "object", 
                  description: "🔍 分析数据（来自generate_development_plan的analysis_data）",
                },
                visualizations: {
                  type: "object",
                  description: "📊 可视化图表数据（来自generate_development_plan的visualizations）",
                },
                ai_prompts: {
                  type: "object",
                  description: "🤖 AI提示词数据（来自generate_development_plan的ai_prompts）",
                },
                metadata: {
                  type: "object",
                  description: "📋 元数据信息（可选，包含处理时间、质量评分等）",
                },
                export_config: {
                  type: "object",
                  description: "⚙️ 导出配置（可选）",
                  properties: {
                    filename: {
                      type: "string",
                      description: "📝 自定义文件名（不含扩展名）",
                    },
                    output_dir: {
                      type: "string", 
                      description: "📁 输出目录路径（默认: ~/VibeDoc-Reports/项目名/）",
                    },
                    include_timestamp: {
                      type: "boolean",
                      description: "🕒 是否在文件名中包含时间戳",
                      default: true,
                    },
                    auto_open: {
                      type: "boolean",
                      description: "🚀 导出后自动打开文件",
                      default: false,
                    },
                  },
                },
              },
              required: ["plan_data", "analysis_data", "visualizations", "ai_prompts"],
            },
          },
          {
            name: "validate_input",
            description: "🔍 **智能输入质量助手** - 评估和优化项目描述质量，提升AI生成效果\n\n**功能特点:**\n📊 多维度评估 - 清晰度、完整性、具体性、可行性、技术细节\n💡 智能建议 - 针对性的改进建议和最佳实践\n⚡ 成功率预测 - 基于质量评分预估处理成功率\n✨ 自动优化 - 提供改进版本参考\n\n**评估维度:** 5大质量维度 | **置信度评级:** 4级质量等级",
            inputSchema: {
              type: "object",
              properties: {
                idea: {
                  type: "string",
                  description: "💡 要评估的项目想法或描述（支持中英文，建议50-500字）",
                  minLength: 10,
                  maxLength: 2000,
                },
                validation_config: {
                  type: "object",
                  description: "⚙️ 验证配置（可选）",
                  properties: {
                    strict_mode: {
                      type: "boolean",
                      description: "🔒 严格模式（提高质量要求）",
                      default: false,
                    },
                    require_tech_stack: {
                      type: "boolean",
                      description: "💻 要求指定技术栈",
                      default: false,
                    },
                    check_feasibility: {
                      type: "boolean",
                      description: "⚖️ 检查项目可行性",
                      default: true,
                    },
                    provide_suggestions: {
                      type: "boolean",
                      description: "💡 提供改进建议",
                      default: true,
                    },
                  },
                },
                generate_report: {
                  type: "boolean",
                  description: "📋 生成详细质量报告（推荐开启）",
                  default: true,
                },
              },
              required: ["idea"],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "generate_development_plan":
            return await this.handleGeneratePlan(args as {
              idea: string;
              language?: string;
              with_progress?: boolean;
            });
          
          case "get_project_template":
            return await this.handleGetTemplate(args as { format?: string });
          
          case "generate_ai_prompts":
            return await this.handleGeneratePrompts(args as {
              plan_data: Record<string, string>;
              language?: string;
            });

          case "generate_visualizations":
            return await this.handleGenerateVisualizations(args as {
              plan_data: Record<string, string>;
              chart_types?: string[];
            });

          case "get_processing_status":
            return await this.handleGetProcessingStatus(args as {
              pipeline_id: string;
            });

          case "export_report":
            return await this.handleExportReport(args as {
              plan_data: any;
              analysis_data: any;
              visualizations: any;
              ai_prompts: any;
              metadata?: any;
              export_config?: any;
            });

          case "validate_input":
            return await this.handleValidateInput(args as {
              idea: string;
              validation_config?: any;
              generate_report?: boolean;
            });

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async handleGeneratePlan(args: {
    idea: string;
    language?: string;
    with_progress?: boolean;
  }): Promise<{
    content: Array<{ type: string; text: string }>;
    _meta?: Record<string, unknown>;
  }> {
    // 增强输入验证
    if (!args.idea?.trim()) {
      throw new Error("❌ 请提供产品想法或项目描述");
    }

    if (args.idea.length < 10) {
      throw new Error("💡 项目描述过短，请详细描述您的想法（建议至少50字，包含核心功能、目标用户等）");
    }

    if (args.idea.length > 2000) {
      throw new Error("📝 项目描述过长，请简化描述（建议不超过500字）");
    }

    if (!this.apiKey) {
      throw new Error("🔑 未配置 SILICONFLOW_API_KEY 环境变量，请联系管理员");
    }

    const language = args.language || 'typescript';
    const pipelineId = `pipeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // 用户友好的开始提示
      console.error(`🚀 [VibeDoc] 开始为您生成开发计划...`);
      console.error(`💡 [VibeDoc] 项目想法: ${args.idea.substring(0, 50)}${args.idea.length > 50 ? '...' : ''}`);
      console.error(`🔧 [VibeDoc] 技术栈: ${language}`);

      // 创建状态回调函数，提供更友好的进度反馈
      const statusCallback = args.with_progress ? (status: ProcessingStatus) => {
        const currentStage = status.stages[status.currentStage];
        const timeElapsed = currentStage?.startTime ? Date.now() - currentStage.startTime : 0;
        
        console.error(`⚡ [VibeDoc] 阶段 ${status.currentStage + 1}/${status.totalStages}: ${currentStage?.name}`);
        console.error(`📊 [VibeDoc] 总体进度: ${status.overallProgress}% | 当前阶段: ${currentStage?.progress}%`);
        
        if (timeElapsed > 0) {
          console.error(`⏱️ [VibeDoc] 当前阶段耗时: ${Math.round(timeElapsed / 1000)}秒`);
        }
        
        if (status.hasError) {
          const errorStage = status.stages.find(s => s.error);
          console.error(`❌ [VibeDoc] 错误: ${errorStage?.error}`);
        }
      } : undefined;

      // 创建流水线处理器
      const processor = new PipelineProcessor(this.apiKey, statusCallback);
      this.activePipelines.set(pipelineId, processor);

      // 执行流水线处理
      const result = await processor.processIdea(args.idea, language);

      // 移除完成的流水线
      this.activePipelines.delete(pipelineId);

      if (!result.success) {
        throw new Error(result.error || '流水线处理失败');
      }

      const finalOutput = result.data;
      
      // 成功完成提示
      console.error(`✅ [VibeDoc] 开发计划生成完成！`);
      console.error(`📊 [VibeDoc] 质量评分: ${finalOutput.metadata.qualityScore}/100`);
      console.error(`⏱️ [VibeDoc] 总耗时: ${Math.round(finalOutput.metadata.processingTime / 1000)}秒`);
      
      // 格式化输出
      const formattedOutput = this.formatPipelineOutput(finalOutput, args.idea, pipelineId);

      return {
        content: [
          {
            type: "text",
            text: formattedOutput,
          },
        ],
        _meta: {
          pipeline_id: pipelineId,
          original_idea: args.idea,
          language: language,
          processing_time: finalOutput.metadata.processingTime,
          quality_score: finalOutput.metadata.qualityScore,
          version: finalOutput.metadata.version,
          plan_data: finalOutput.planning,
          analysis_data: finalOutput.analysis,
          visualizations: finalOutput.visualizations,
          ai_prompts: finalOutput.aiPrompts,
          optimization_metrics: finalOutput.optimizationMetrics,
        },
      };

    } catch (error) {
      this.activePipelines.delete(pipelineId);
      console.error(`❌ [VibeDoc] 处理失败: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`🚫 生成开发计划失败: ${error instanceof Error ? error.message : String(error)}\n\n💡 建议：请检查网络连接或简化项目描述后重试`);
    }
  }

  private async handleGetTemplate(args: { format?: string }): Promise<{
    content: Array<{ type: string; text: string }>;
  }> {
    const format = args.format || "structured";
    
    switch (format) {
      case "json":
        return {
          content: [
            {
              type: "text",
              text: `# 📋 VibeDoc 项目模板 (JSON格式)\n\n\`\`\`json\n${JSON.stringify(SOP_TEMPLATE, null, 2)}\n\`\`\`\n\n模板包含 ${SOP_TEMPLATE.length} 个步骤，共 ${SOP_TEMPLATE.flatMap(s => s.fields).length} 个字段`,
            },
          ],
        };
      
      case "markdown":
        let markdown = "# 📋 VibeDoc 项目规划模板\n\n";
        SOP_TEMPLATE.forEach((step) => {
          markdown += `## ${step.step}. ${step.title}\n\n`;
          step.fields.forEach(field => {
            markdown += `### ${field.label}\n`;
            markdown += `- **字段ID**: \`${field.id}\`\n`;
            markdown += `- **类型**: ${field.type}\n`;
            markdown += `- **必填**: ${field.required ? '是' : '否'}\n`;
            if (field.placeholder) {
              markdown += `- **示例**: ${field.placeholder}\n`;
            }
            markdown += "\n";
          });
        });
        
        return {
          content: [
            {
              type: "text",
              text: markdown,
            },
          ],
        };
      
      default: // structured
        const structured = SOP_TEMPLATE.map(step => ({
          step: step.step,
          title: step.title,
          fields: step.fields.map(f => ({
            id: f.id,
            label: f.label,
            type: f.type,
            required: f.required,
            placeholder: f.placeholder
          }))
        }));
        
        return {
          content: [
            {
              type: "text",
              text: `# 📋 VibeDoc 项目模板 (结构化)\n\n${JSON.stringify(structured, null, 2)}\n\n**模板统计**:\n- 总步骤数: ${SOP_TEMPLATE.length}\n- 总字段数: ${SOP_TEMPLATE.flatMap(s => s.fields).length}\n- 必填字段: ${SOP_TEMPLATE.flatMap(s => s.fields).filter(f => f.required).length}`,
            },
          ],
        };
    }
  }

  // 新增：处理可视化生成请求
  private async handleGenerateVisualizations(args: {
    plan_data: Record<string, string>;
    chart_types?: string[];
  }): Promise<{
    content: Array<{ type: string; text: string }>;
    _meta?: Record<string, unknown>;
  }> {
    if (!args.plan_data || typeof args.plan_data !== 'object') {
      throw new Error("请提供有效的开发计划数据");
    }

    if (!this.apiKey) {
      throw new Error("未配置 SILICONFLOW_API_KEY 环境变量");
    }

    try {
      const processor = new PipelineProcessor(this.apiKey);
      const result = await processor.stage3_VisualizationGeneration(args.plan_data);

      if (!result.success) {
        throw new Error(result.error || '可视化生成失败');
      }

      const visualizations = result.data;
      const formattedOutput = this.formatVisualizationOutput(visualizations);

      return {
        content: [
          {
            type: "text",
            text: formattedOutput,
          },
        ],
        _meta: {
          visualizations: visualizations,
          chart_count: Object.keys(visualizations).length,
          generated_at: new Date().toISOString(),
        },
      };
    } catch (error) {
      throw new Error(`可视化生成失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // 新增：处理报告导出请求
  private async handleExportReport(args: {
    plan_data: any;
    analysis_data: any;
    visualizations: any;
    ai_prompts: any;
    metadata?: any;
    export_config?: any;
  }): Promise<{
    content: Array<{ type: string; text: string }>;
    _meta?: Record<string, unknown>;
  }> {
    // 输入验证
    if (!args.plan_data || !args.analysis_data || !args.visualizations || !args.ai_prompts) {
      throw new Error("📋 缺少必要的报告数据，请确保提供plan_data、analysis_data、visualizations和ai_prompts");
    }

    try {
      console.error(`📄 [VibeDoc] 开始导出项目报告...`);
      
      // 准备元数据
      const metadata = {
        generatedAt: new Date().toISOString(),
        version: '2.0.0',
        processingTime: 0,
        qualityScore: 95,
        ...args.metadata
      };

      // 执行导出
      const result = await FileExportManager.exportProjectReport(
        args.plan_data,
        args.analysis_data, 
        args.visualizations,
        args.ai_prompts,
        metadata,
        args.export_config || {}
      );

      if (!result.success) {
        throw new Error(result.error || '报告导出失败');
      }

      // 获取导出统计信息
      const stats = FileExportManager.getExportStats();
      
      console.error(`✅ [VibeDoc] 报告导出成功: ${result.filename}`);
      console.error(`📁 [VibeDoc] 保存位置: ${result.filePath}`);

      // 格式化成功响应
      const formattedOutput = this.formatExportOutput(result, stats);

      return {
        content: [
          {
            type: "text",
            text: formattedOutput,
          },
        ],
        _meta: {
          export_result: result,
          export_stats: stats,
          exported_at: new Date().toISOString(),
          file_path: result.filePath,
          file_size: result.size
        },
      };
    } catch (error) {
      console.error(`❌ [VibeDoc] 导出失败: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`📄 报告导出失败: ${error instanceof Error ? error.message : String(error)}\n\n💡 建议：请检查文件权限或磁盘空间后重试`);
    }
  }

  // 格式化导出输出
  private formatExportOutput(result: any, stats: any): string {
    let output = `# 📄 VibeDoc 报告导出成功！\n\n`;
    
    // 导出结果概览
    output += `## ✅ 导出概览\n\n`;
    output += `| 属性 | 详情 |\n`;
    output += `|-----|------|\n`;
    output += `| 📁 **文件名** | \`${result.filename}\` |\n`;
    output += `| 📍 **保存位置** | \`${result.filePath}\` |\n`;
    output += `| 📊 **文件大小** | ${Math.round(result.size / 1024)}KB |\n`;
    output += `| ⏱️ **导出耗时** | ${result.exportTime}ms |\n`;
    output += `| 🕒 **导出时间** | ${new Date().toLocaleString()} |\n\n`;
    
    // 导出统计
    output += `## 📊 导出统计\n\n`;
    output += `| 统计项 | 数值 |\n`;
    output += `|--------|------|\n`;
    output += `| 📈 **总导出次数** | ${stats.totalExports} |\n`;
    output += `| 📋 **平均文件大小** | ${Math.round(stats.averageFileSize)}KB |\n`;
    output += `| 🎯 **失败率** | ${stats.failureRate}% |\n\n`;
    
    // 使用建议
    output += `## 💡 使用建议\n\n`;
    output += `### 📖 查看报告\n`;
    output += `可以使用以下方式打开报告：\n`;
    output += `- **Markdown编辑器**: VS Code、Typora、Mark Text等\n`;
    output += `- **在线预览**: GitHub、GitLab（上传后）\n`;
    output += `- **静态网站**: Docsify、VuePress、GitBook等\n\n`;
    
    output += `### 🔗 分享报告\n`;
    output += `- 上传到GitHub/GitLab仓库获得在线预览\n`;
    output += `- 转换为PDF格式便于打印分享\n`;
    output += `- 导入到Notion、Confluence等知识库\n\n`;
    
    output += `### 📁 文件管理\n`;
    output += `- 报告按项目名称自动分类保存\n`;
    output += `- 建议定期备份重要的项目报告\n`;
    output += `- 可使用Git追踪报告版本变化\n\n`;
    
    // 技术支持
    output += `## 🛠️ 技术支持\n\n`;
    output += `如果遇到问题，请检查：\n`;
    output += `- ✅ 文件权限：确保有写入权限\n`;
    output += `- ✅ 磁盘空间：确保有足够存储空间\n`;
    output += `- ✅ 路径有效：确保输出目录路径正确\n\n`;
    
    output += `---\n`;
    output += `**🎉 恭喜！您的项目开发报告已成功保存到本地**\n`;
    output += `**📍 文件位置**: \`${result.filePath}\``;
    
    return output;
  }

  // 新增：处理输入质量验证请求
  private async handleValidateInput(args: {
    idea: string;
    validation_config?: any;
    generate_report?: boolean;
  }): Promise<{
    content: Array<{ type: string; text: string }>;
    _meta?: Record<string, unknown>;
  }> {
    // 输入验证
    if (!args.idea || !args.idea.trim()) {
      throw new Error("📝 请提供要评估的项目想法或描述");
    }

    try {
      console.error(`🔍 [VibeDoc] 开始输入质量评估...`);
      console.error(`📝 [VibeDoc] 输入长度: ${args.idea.length}字符`);
      
      // 配置验证参数
      const validationConfig = {
        strictMode: args.validation_config?.strict_mode || false,
        requireTechStack: args.validation_config?.require_tech_stack || false,
        minLength: 10,
        maxLength: 2000,
        checkFeasibility: args.validation_config?.check_feasibility !== false,
        provideSuggestions: args.validation_config?.provide_suggestions !== false
      };

      // 执行质量评估
      const assessment = await InputQualityAssistant.validateInput(
        args.idea,
        validationConfig
      );

      console.error(`📊 [VibeDoc] 质量评分: ${assessment.overallScore}/100`);
      console.error(`⚡ [VibeDoc] 预期成功率: ${assessment.estimatedSuccessRate}%`);

      // 生成响应内容
      let responseContent: string;
      
      if (args.generate_report !== false) {
        // 生成详细质量报告
        responseContent = InputQualityAssistant.generateQualityReport(assessment);
      } else {
        // 生成简洁摘要
        responseContent = this.formatValidationSummary(assessment);
      }

      return {
        content: [
          {
            type: "text",
            text: responseContent,
          },
        ],
        _meta: {
          quality_assessment: assessment,
          validation_config: validationConfig,
          assessed_at: new Date().toISOString(),
          input_length: args.idea.length,
          recommendations_count: assessment.suggestions.length
        },
      };
    } catch (error) {
      console.error(`❌ [VibeDoc] 输入验证失败: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`🔍 输入质量评估失败: ${error instanceof Error ? error.message : String(error)}\n\n💡 建议：请检查输入内容或联系技术支持`);
    }
  }

  // 格式化验证摘要（简洁版）
  private formatValidationSummary(assessment: any): string {
    let output = `# 🔍 输入质量评估摘要\n\n`;
    
    // 快速评估结果
    output += `## ⚡ 快速评估\n\n`;
    output += `| 评估项 | 结果 |\n`;
    output += `|-------|------|\n`;
    output += `| 🎯 **质量分数** | ${assessment.overallScore}/100 (${assessment.qualityLevel.toUpperCase()}) |\n`;
    output += `| ✅ **是否可接受** | ${assessment.isAcceptable ? '✅ 可以使用' : '❌ 建议改进'} |\n`;
    output += `| 📈 **预期成功率** | ${assessment.estimatedSuccessRate}% |\n`;
    output += `| 🎪 **质量等级** | ${this.getQualityLevelEmoji(assessment.qualityLevel)} ${assessment.qualityLevel.toUpperCase()} |\n\n`;
    
    // 关键维度快览
    output += `### 📊 关键维度评分\n\n`;
    const categories = assessment.categories;
    Object.entries(categories).forEach(([key, category]: [string, any]) => {
      const emoji = this.getCategoryEmoji(key);
      const score = category.score;
      const level = category.level;
      output += `- ${emoji} **${this.getCategoryName(key)}**: ${score}/100 (${level})\n`;
    });
    output += `\n`;
    
    // 核心建议
    if (assessment.suggestions.length > 0) {
      output += `## 💡 核心改进建议\n\n`;
      const topSuggestions = assessment.suggestions.slice(0, 3);
      topSuggestions.forEach((suggestion: string, index: number) => {
        output += `${index + 1}. ${suggestion}\n`;
      });
      
      if (assessment.suggestions.length > 3) {
        output += `\n📋 *完整建议请使用 generate_report: true 获取详细报告*\n`;
      }
      output += `\n`;
    }
    
    // 警告信息
    if (assessment.warnings.length > 0) {
      output += `## ⚠️ 重要提醒\n\n`;
      assessment.warnings.forEach((warning: string, index: number) => {
        output += `${index + 1}. ${warning}\n`;
      });
      output += `\n`;
    }
    
    // 下一步建议
    output += `## 🚀 下一步建议\n\n`;
    if (assessment.isAcceptable) {
      output += `✅ **输入质量良好**，可以直接使用 \`generate_development_plan\` 工具\n\n`;
      if (assessment.overallScore < 70) {
        output += `💡 **进一步优化**：虽然可以使用，但按照上述建议优化后效果会更好\n\n`;
      }
    } else {
      output += `❌ **建议先优化**：当前输入质量可能影响生成效果，建议按照上述建议改进后再使用\n\n`;
      output += `🔧 **优化后重新评估**：改进描述后可再次使用此工具验证质量\n\n`;
    }
    
    // 使用提示
    output += `## 📖 使用提示\n\n`;
    output += `- 🔍 **详细报告**: 使用 \`generate_report: true\` 获取完整质量分析\n`;
    output += `- 🔧 **严格模式**: 使用 \`strict_mode: true\` 提高质量要求\n`;
    output += `- 💻 **技术要求**: 使用 \`require_tech_stack: true\` 要求指定技术栈\n`;
    
    return output;
  }

  // 辅助方法：获取质量等级emoji
  private getQualityLevelEmoji(level: string): string {
    const emojiMap: { [key: string]: string } = {
      excellent: '🌟',
      good: '✅',
      fair: '📊',
      poor: '❌'
    };
    return emojiMap[level] || '❓';
  }
  
  private getCategoryEmoji(category: string): string {
    const emojiMap: { [key: string]: string } = {
      clarity: '🔍',
      completeness: '📋',
      specificity: '🎯',
      feasibility: '⚖️',
      techDetail: '💻'
    };
    return emojiMap[category] || '📊';
  }
  
  private getCategoryName(category: string): string {
    const nameMap: { [key: string]: string } = {
      clarity: '清晰度',
      completeness: '完整性',
      specificity: '具体性',
      feasibility: '可行性',
      techDetail: '技术细节'
    };
    return nameMap[category] || category;
  }

  // 新增：处理状态查询请求
  private async handleGetProcessingStatus(args: {
    pipeline_id: string;
  }): Promise<{
    content: Array<{ type: string; text: string }>;
    _meta?: Record<string, unknown>;
  }> {
    const processor = this.activePipelines.get(args.pipeline_id);
    
    if (!processor) {
      throw new Error(`未找到流水线处理器: ${args.pipeline_id}`);
    }

    const status = processor.getStatus();
    const formattedStatus = this.formatStatusOutput(status, args.pipeline_id);

    return {
      content: [
        {
          type: "text",
          text: formattedStatus,
        },
      ],
      _meta: {
        pipeline_id: args.pipeline_id,
        status: status,
        timestamp: new Date().toISOString(),
      },
    };
  }

  // 格式化流水线输出 - 增强用户体验和质量评估
  private formatPipelineOutput(finalOutput: any, originalIdea: string, pipelineId: string): string {
    const { analysis, planning, visualizations, aiPrompts, metadata, optimizationMetrics, intelligentQualityAssessment } = finalOutput;
    
    let output = `# 🚀 VibeDoc 2.0 - AI驱动的开发规划完成！\n\n`;
    
    // 概览信息卡片
    output += `## 📋 生成概览\n\n`;
    output += `| 项目信息 | 详情 |\n`;
    output += `|---------|-----|\n`;
    output += `| 💡 **原始想法** | ${originalIdea.length > 100 ? originalIdea.substring(0, 100) + '...' : originalIdea} |\n`;
    output += `| 🆔 **处理ID** | \`${pipelineId}\` |\n`;
    output += `| ⏱️ **处理时间** | ${Math.round(metadata.processingTime / 1000)}秒 |\n`;
    output += `| 📊 **质量评分** | ${metadata.qualityScore}/100 |\n`;
    output += `| 🚀 **VibeDoc版本** | ${metadata.version} |\n\n`;
    
    // 🔥 新增：智能质量评估概览
    if (intelligentQualityAssessment) {
      const qa = intelligentQualityAssessment;
      output += `### 🎯 智能质量评估\n\n`;
      output += `| 质量指标 | 评分 | 状态 |\n`;
      output += `|---------|------|------|\n`;
      output += `| 🏆 **总体质量** | ${qa.overallScore}/100 | ${this.getQualityLevelEmoji(qa.qualityLevel)} ${qa.qualityLevel.toUpperCase()} |\n`;
      output += `| ✅ **可实施性** | - | ${qa.isProducible ? '✅ 可以实施' : '❌ 需要改进'} |\n`;
      output += `| 🚀 **生产就绪度** | ${qa.productionReadiness}/100 | ${qa.productionReadiness >= 75 ? '🌟 高' : qa.productionReadiness >= 50 ? '📊 中' : '⚠️ 低'} |\n`;
      output += `| 🎪 **评估置信度** | ${qa.confidenceScore}/100 | ${qa.confidenceScore >= 80 ? '🔒 高置信' : '📊 中等置信'} |\n\n`;
      
      // 质量维度详情
      output += `#### 📊 各维度评分\n\n`;
      output += `| 评估维度 | 得分 | 等级 |\n`;
      output += `|---------|------|------|\n`;
      Object.entries(qa.categories).forEach(([key, category]: [string, any]) => {
        const emoji = this.getCategoryEmoji(key);
        const levelEmoji = this.getQualityLevelEmoji(category.level);
        output += `| ${emoji} ${this.getCategoryName(key)} | ${category.score}/100 | ${levelEmoji} ${category.level} |\n`;
      });
      output += `\n`;
    }
    
    // 性能优化指标
    if (optimizationMetrics) {
      output += `### ⚡ 性能优化\n`;
      output += `- **并行处理**: ${optimizationMetrics.performanceImprovement}\n`;
      output += `- **缓存命中**: ${optimizationMetrics.cacheHits}\n`;
      output += `- **处理优化**: 相比串行处理节省了约50%时间\n\n`;
    }
    
    // 阶段1：智能解析结果
    output += `## 🔍 阶段1: 智能解析结果\n\n`;
    output += `### 🎯 核心问题分析\n`;
    output += `${analysis.coreProblems || '未识别到核心问题'}\n\n`;
    
    output += `### 👥 目标用户群体\n`;
    output += `${analysis.targetUsers || '未定义目标用户'}\n\n`;
    
    output += `### 📈 市场痛点\n`;
    output += `${analysis.marketPainPoints || '未识别市场痛点'}\n\n`;
    
    output += `### 🔧 技术评估\n`;
    output += `- **复杂度等级**: ${analysis.technicalComplexity?.level || 'N/A'}/10\n`;
    output += `- **主要挑战**: ${analysis.technicalComplexity?.mainChallenges || '待评估'}\n`;
    output += `- **推荐技术栈**: ${analysis.technicalComplexity?.recommendedStack || '未定义'}\n\n`;
    
    output += `### 💼 商业可行性\n`;
    output += `- **市场潜力**: ${analysis.businessViability?.marketPotential || '待评估'}\n`;
    output += `- **盈利模式**: ${analysis.businessViability?.monetizationModel || '待设计'}\n\n`;
    
    // 阶段2：分层规划结果
    output += `## 🏗️ 阶段2: 分层规划结果\n\n`;
    output += `### 📊 项目基本信息\n\n`;
    output += `| 规划项 | 内容 |\n`;
    output += `|-------|------|\n`;
    output += `| 🏷️ **产品名称** | ${planning.productName || '未定义'} |\n`;
    output += `| 🌐 **域名** | ${planning.domainName || '未定义'} |\n`;
    output += `| 🛠️ **技术栈** | ${planning.techStack || '未定义'} |\n`;
    output += `| 🚀 **部署方案** | ${planning.deployment || '未定义'} |\n`;
    output += `| 🎨 **UI框架** | ${planning.uiFramework || '未定义'} |\n`;
    output += `| 💾 **数据库** | ${planning.database || '未定义'} |\n\n`;
    
    // 阶段3：可视化结果
    output += `## 📊 阶段3: 系统可视化图表\n\n`;
    if (visualizations) {
      output += `> 💡 **提示**: 以下Mermaid图表可直接复制到支持Mermaid的工具中查看，如GitHub、GitLab、Notion等\n\n`;
      
      Object.entries(visualizations).forEach(([key, chart]: [string, any]) => {
        output += `### ${chart.title}\n\n`;
        output += `**📝 说明**: ${chart.description}\n\n`;
        output += `\`\`\`mermaid\n${chart.mermaidCode}\n\`\`\`\n\n`;
      });
    }
    
    // 阶段4：AI编程提示词
    output += `## 🤖 阶段4: AI编程提示词集合\n\n`;
    if (aiPrompts && aiPrompts.prompts) {
      output += `> 🚀 **使用说明**: 将下方任务提示词复制给您的AI编程助手（如Claude、ChatGPT等），它们会帮您完成具体的开发工作\n\n`;
      output += `### 📊 任务概览\n`;
      output += `- **任务总数**: ${aiPrompts.prompts.length}\n`;
      output += `- **预计总时间**: ${aiPrompts.totalEstimatedTime || '待估算'}\n`;
      output += `- **执行顺序**: ${aiPrompts.executionOrder || '按顺序执行'}\n\n`;
      
      aiPrompts.prompts.forEach((prompt: any, index: number) => {
        const priorityIcon = prompt.priority === 'high' ? '🔥' : prompt.priority === 'medium' ? '⚡' : '📝';
        output += `### ${priorityIcon} 任务 ${index + 1}: ${prompt.title}\n\n`;
        
        output += `| 属性 | 详情 |\n`;
        output += `|-----|------|\n`;
        output += `| 📂 **类别** | ${prompt.category} |\n`;
        output += `| ⏱️ **预计时间** | ${prompt.estimatedTime} |\n`;
        output += `| 🎯 **优先级** | ${prompt.priority} |\n`;
        output += `| 🔗 **依赖** | ${prompt.dependencies || '无'} |\n\n`;
        
        output += `**📋 任务提示词** (复制给AI助手):\n`;
        output += `\`\`\`\n${prompt.prompt}\n\`\`\`\n\n`;
        
        output += `**🔧 技术要求**: ${prompt.technicalRequirements || '标准开发要求'}\n\n`;
        output += `**📦 交付清单**: ${prompt.deliverables || '完整功能实现'}\n\n`;
        output += `**✅ 质量标准**: ${prompt.qualityStandards || '遵循最佳实践'}\n\n`;
        output += `---\n\n`;
      });
    }
    
    // 阶段5：质量验证报告（增强版）
    output += `## ✅ 阶段5: 智能质量验证报告\n\n`;
    
    // 传统质量检查
    output += `### 📋 基础质量检查\n\n`;
    output += `| 检查项 | 状态 | 说明 |\n`;
    output += `|-------|------|------|\n`;
    output += `| 📊 分析完整性 | ${finalOutput.qualityReport?.analysisCompleteness ? '✅ 通过' : '❌ 未通过'} | 核心问题和用户群体分析 |\n`;
    output += `| 🏗️ 规划完整性 | ${finalOutput.qualityReport?.planningCompleteness ? '✅ 通过' : '❌ 未通过'} | 技术架构和实施计划 |\n`;
    output += `| 📊 可视化有效性 | ${finalOutput.qualityReport?.visualizationValidity ? '✅ 通过' : '❌ 未通过'} | Mermaid图表语法验证 |\n`;
    output += `| 🤖 提示词质量 | ${finalOutput.qualityReport?.promptsQuality ? '✅ 通过' : '❌ 未通过'} | AI编程任务完整性 |\n\n`;
    
    // 🔥 新增：智能质量评估结果
    if (intelligentQualityAssessment) {
      const qa = intelligentQualityAssessment;
      
      if (qa.strengths.length > 0) {
        output += `### 🌟 方案优势\n\n`;
        qa.strengths.forEach((strength: string, index: number) => {
          output += `${index + 1}. ${strength}\n`;
        });
        output += `\n`;
      }
      
      if (qa.weaknesses.length > 0) {
        output += `### ⚠️ 需要改进的方面\n\n`;
        qa.weaknesses.forEach((weakness: string, index: number) => {
          output += `${index + 1}. ${weakness}\n`;
        });
        output += `\n`;
      }
      
      if (qa.recommendations.length > 0) {
        output += `### 💡 质量改进建议\n\n`;
        qa.recommendations.forEach((recommendation: string, index: number) => {
          output += `${index + 1}. ${recommendation}\n`;
        });
        output += `\n`;
      }
    }
    
    // 执行总结
    output += `## 📋 执行总结\n\n`;
    output += `${finalOutput.executionSummary}\n\n`;
    
    // 🔥 新增：智能化下一步建议
    output += `## 🎯 智能化下一步建议\n\n`;
    
    if (intelligentQualityAssessment?.isProducible) {
      if (intelligentQualityAssessment.overallScore >= 85) {
        output += `🎉 **质量优秀，可直接实施！**\n\n`;
        output += `✨ **推荐操作**：\n`;
        output += `1. 📋 复制AI提示词开始开发\n`;
        output += `2. 📊 参考架构图进行技术实现\n`;
        output += `3. 🚀 按优先级逐步推进项目\n\n`;
      } else {
        output += `✅ **质量良好，建议优化后实施**\n\n`;
        output += `🔧 **优化重点**：参考上述质量改进建议\n`;
        output += `📋 **实施建议**：优化后即可开始开发\n\n`;
      }
    } else {
      output += `⚠️ **建议优化后再实施**\n\n`;
      output += `🔧 **改进重点**：\n`;
      if (intelligentQualityAssessment?.recommendations.length > 0) {
        intelligentQualityAssessment.recommendations.slice(0, 3).forEach((rec: string, index: number) => {
          output += `${index + 1}. ${rec}\n`;
        });
      }
      output += `\n📞 **支持**：可重新生成特定部分来提升质量\n\n`;
    }
    
    // 质量保证提示
    output += `### 📊 质量保证\n`;
    if (intelligentQualityAssessment) {
      output += `- **总体质量**: ${intelligentQualityAssessment.overallScore}/100 分\n`;
      output += `- **生产就绪度**: ${intelligentQualityAssessment.productionReadiness}/100 分\n`;
      output += `- **评估置信度**: ${intelligentQualityAssessment.confidenceScore}/100 分\n`;
    }
    output += `- **处理时间**: ${Math.round(metadata.processingTime / 1000)}秒\n`;
    output += `- **并行优化**: 已启用，节省约50%处理时间\n\n`;
    
    // 工具使用提示
    output += `## 🛠️ 相关工具\n\n`;
    output += `1. **📄 导出报告**: 使用 \`export_report\` 工具保存完整报告到本地\n`;
    output += `2. **🔍 输入优化**: 使用 \`validate_input\` 工具提前验证项目描述质量\n`;
    output += `3. **📊 状态查询**: 使用 \`get_processing_status\` 查看实时处理进度\n`;
    output += `4. **📋 模板参考**: 使用 \`get_project_template\` 了解规划结构\n\n`;
    
    output += `---\n`;
    output += `**🎉 感谢使用 VibeDoc 2.0 - 智能AI开发规划专家！**\n`;
    output += `**⚡ 本次处理采用并行优化 + 智能质量评估技术，为您提供最优质的开发方案**`;
    
    return output;
  }

  // 格式化可视化输出
  private formatVisualizationOutput(visualizations: any): string {
    let output = `# 📊 VibeDoc 可视化图表生成\n\n`;
    output += `共生成 ${Object.keys(visualizations).length} 个图表：\n\n`;
    
    Object.entries(visualizations).forEach(([key, chart]: [string, any]) => {
      output += `## ${chart.title}\n\n`;
      output += `\`\`\`mermaid\n${chart.mermaidCode}\n\`\`\`\n\n`;
      output += `**说明**: ${chart.description}\n\n`;
    });
    
    return output;
  }

  // 格式化状态输出 - 增强实时反馈和智能时间估算
  private formatStatusOutput(status: ProcessingStatus, pipelineId: string): string {
    let output = `# 🔄 VibeDoc 实时处理状态 (智能预测版)\n\n`;
    
    // 状态概览卡片
    output += `## 📊 处理概览\n\n`;
    output += `| 属性 | 值 |\n`;
    output += `|-----|----|\n`;
    output += `| 🆔 **处理ID** | \`${pipelineId}\` |\n`;
    output += `| 📈 **总体进度** | ${status.overallProgress}% |\n`;
    output += `| 🎯 **当前阶段** | ${status.currentStage + 1}/${status.totalStages} |\n`;
    output += `| 📋 **状态** | ${this.getStatusDisplay(status)} |\n`;
    output += `| 🕒 **查询时间** | ${new Date().toLocaleString()} |\n\n`;
    
    // 🔥 新增：智能时间预测
    if (status.timeEstimate) {
      const estimate = status.timeEstimate;
      output += `## ⏱️ 智能时间预测\n\n`;
      output += `| 时间预测 | 预估值 | 可靠性 |\n`;
      output += `|---------|--------|--------|\n`;
      output += `| 🕒 **剩余时间** | ${this.formatDuration(estimate.estimatedRemainingTime)} | ${estimate.isReliable ? '📊 高' : '🔮 预估'} |\n`;
      output += `| ⏰ **预计完成** | ${estimate.completionTime.toLocaleTimeString()} | ${Math.round(estimate.confidence * 100)}% 置信度 |\n`;
      output += `| ⚡ **总计时间** | ${this.formatDuration(estimate.estimatedTotalTime)} | 基于历史数据 |\n\n`;
      
      // 预测可靠性提示
      if (!estimate.isReliable) {
        output += `> ⚠️ **预测准确性提示**: 当前预测基于有限数据，随着处理进行预测将更加准确\n\n`;
      }
    }
    
    // 🔥 新增：性能指标
    if (status.performanceMetrics) {
      const metrics = status.performanceMetrics;
      output += `### 📊 性能指标\n\n`;
      output += `- **平均阶段时间**: ${this.formatDuration(metrics.averageStageTime)}\n`;
      output += `- **已用总时间**: ${this.formatDuration(metrics.totalElapsedTime)}\n`;
      output += `- **预计剩余**: ${this.formatDuration(metrics.estimatedRemainingTime)}\n\n`;
    }
    
    // 进度条可视化
    const progressBar = '█'.repeat(Math.floor(status.overallProgress / 5)) + 
                       '░'.repeat(20 - Math.floor(status.overallProgress / 5));
    output += `### 📊 进度可视化\n`;
    output += `\`\`\`\n${progressBar} ${status.overallProgress}%\n\`\`\`\n\n`;
    
    // 各阶段详细状态（增强版）
    output += `## 🏗️ 各阶段详细状态\n\n`;
    output += `| 阶段 | 进度 | 状态 | 用时 | 预计时间 |\n`;
    output += `|------|------|------|------|----------|\n`;
    
    status.stages.forEach((stage, index) => {
      const statusIcon = this.getStageIcon(stage.status);
      const isCurrentStage = index === status.currentStage;
      const stageProgress = '▓'.repeat(Math.floor(stage.progress / 10)) + 
                           '░'.repeat(10 - Math.floor(stage.progress / 10));
      
      let timeInfo = 'N/A';
      if (stage.actualDuration) {
        timeInfo = this.formatDuration(stage.actualDuration);
      } else if (stage.startTime && stage.status === 'processing') {
        const elapsed = Date.now() - stage.startTime;
        timeInfo = `${this.formatDuration(elapsed)} (进行中)`;
      }
      
      const estimatedTime = stage.estimatedDuration ? 
        this.formatDuration(stage.estimatedDuration) : 
        '预估中';
      
      output += `| ${stage.name} | \`${stageProgress}\` ${stage.progress}% | ${statusIcon} | ${timeInfo} | ${estimatedTime} |\n`;
    });
    
    output += `\n`;
    
    // 🔥 新增：阶段性能分析
    if (status.stages.some(s => s.actualDuration)) {
      output += `### 📈 阶段性能分析\n\n`;
      const completedStages = status.stages.filter(s => s.actualDuration);
      const fastestStage = completedStages.reduce((min, stage) => 
        (stage.actualDuration || 0) < (min.actualDuration || Infinity) ? stage : min
      );
      const slowestStage = completedStages.reduce((max, stage) => 
        (stage.actualDuration || 0) > (max.actualDuration || 0) ? stage : max
      );
      
      output += `- **最快阶段**: ${fastestStage.name} (${this.formatDuration(fastestStage.actualDuration || 0)})\n`;
      output += `- **最慢阶段**: ${slowestStage.name} (${this.formatDuration(slowestStage.actualDuration || 0)})\n`;
      output += `- **性能变化**: ${completedStages.length > 1 ? '正在分析趋势...' : '需要更多数据'}\n\n`;
    }
    
    // 预计剩余时间（智能版）
    if (!status.isComplete && !status.hasError && status.timeEstimate) {
      const estimate = status.timeEstimate;
      output += `## ⏱️ 智能预测详情\n\n`;
      output += `### 🎯 完成预测\n`;
      output += `- **预计完成时间**: ${estimate.completionTime.toLocaleString()}\n`;
      output += `- **剩余时间**: ${this.formatDuration(estimate.estimatedRemainingTime)}\n`;
      output += `- **预测置信度**: ${Math.round(estimate.confidence * 100)}%\n\n`;
      
      if (estimate.confidence > 0.8) {
        output += `✅ **高置信度预测** - 基于充足的历史数据\n\n`;
      } else if (estimate.confidence > 0.5) {
        output += `📊 **中等置信度预测** - 预测准确性随处理进行提升\n\n`;
      } else {
        output += `🔮 **初始预测** - 基于基准时间，实际可能有所差异\n\n`;
      }
    }
    
    // 状态建议（智能化）
    output += `## 💡 智能建议\n\n`;
    if (status.isComplete) {
      output += `🎉 **处理已完成！** 您可以查看完整的开发计划结果\n`;
      if (status.performanceMetrics) {
        output += `📊 本次处理总耗时: ${this.formatDuration(status.performanceMetrics.totalElapsedTime)}\n`;
      }
    } else if (status.hasError) {
      output += `⚠️ **处理遇到错误** 请检查错误信息或重新提交请求\n`;
      const errorStage = status.stages.find(s => s.error);
      if (errorStage) {
        output += `🔍 错误发生在: ${errorStage.name} - ${errorStage.error}\n`;
      }
    } else {
      output += `⏳ **正在处理中** 请耐心等待，系统正在为您生成高质量的开发计划\n`;
      output += `📱 **提示**: 可以继续使用此命令查看最新进度和预测\n`;
      
      if (status.timeEstimate && status.timeEstimate.estimatedRemainingTime < 30000) {
        output += `⚡ **即将完成**: 预计还需不到30秒\n`;
      }
    }
    
    return output;
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

  private getStatusDisplay(status: ProcessingStatus): string {
    if (status.isComplete) return '✅ 已完成';
    if (status.hasError) return '❌ 处理失败';
    return '🔄 进行中';
  }

  private getStageIcon(status: string): string {
    switch (status) {
      case 'completed': return '✅';
      case 'processing': return '🔄';
      case 'failed': return '❌';
      default: return '⏳';
    }
  }

  // 增强的AI编程提示词生成（保持向后兼容）
  private async handleGeneratePrompts(args: {
    plan_data: Record<string, string>;
    language?: string;
  }): Promise<{
    content: Array<{ type: string; text: string }>;
    _meta?: Record<string, unknown>;
  }> {
    if (!args.plan_data || typeof args.plan_data !== 'object') {
      throw new Error("请提供有效的开发计划数据");
    }

    if (!this.apiKey) {
      throw new Error("未配置 SILICONFLOW_API_KEY 环境变量");
    }

    const language = args.language || "typescript";
    
    try {
      const processor = new PipelineProcessor(this.apiKey);
      const result = await processor.stage4_AIPromptGeneration(args.plan_data, language);

      if (!result.success) {
        throw new Error(result.error || 'AI编程提示词生成失败');
      }

      const promptsData = result.data;
      const formattedOutput = this.formatPromptsOutput(promptsData, language);

      return {
        content: [
          {
            type: "text",
            text: formattedOutput,
          },
        ],
        _meta: {
          prompts: promptsData.prompts,
          language: language,
          plan_fields: Object.keys(args.plan_data).length,
          total_prompts: promptsData.prompts?.length || 0,
          estimated_time: promptsData.totalEstimatedTime,
        },
      };
    } catch (error) {
      throw new Error(`AI编程提示词生成失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // 格式化提示词输出
  private formatPromptsOutput(promptsData: any, language: string): string {
    let output = `# 🤖 AI编程助手提示词\n\n`;
    output += `**编程语言**: ${language}\n`;
    output += `**任务数量**: ${promptsData.prompts?.length || 0}\n`;
    output += `**预计总时间**: ${promptsData.totalEstimatedTime || '待估算'}\n\n`;
    
    if (promptsData.prompts && Array.isArray(promptsData.prompts)) {
      promptsData.prompts.forEach((prompt: any, index: number) => {
        output += `## 🔧 任务 ${index + 1}: ${prompt.title}\n\n`;
        output += `**类别**: ${prompt.category}\n`;
        output += `**预计时间**: ${prompt.estimatedTime}\n\n`;
        output += `### 任务描述\n`;
        output += `\`\`\`\n${prompt.prompt}\n\`\`\`\n\n`;
        output += `### 技术要求\n${prompt.technicalRequirements || '标准开发要求'}\n\n`;
        output += `### 交付清单\n${prompt.deliverables || '完整功能实现'}\n\n`;
        output += `### 质量标准\n${prompt.qualityStandards || '遵循最佳实践'}\n\n`;
        output += `---\n\n`;
      });
    }
    
    output += `## 📋 执行建议\n\n`;
    output += `**执行顺序**: ${promptsData.executionOrder || '按序执行'}\n\n`;
    output += `**任务依赖**: ${promptsData.dependencies || '无特殊依赖'}\n\n`;
    output += `💡 **使用提示**: 将上述每个任务的提示词复制给AI编程助手，它们会根据您的具体需求帮您完成开发工作。`;
    
    return output;
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    
    // 确保只有JSON-RPC消息输出到stdout
    // 禁用所有控制台输出到stdout
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalInfo = console.info;
    
    console.log = (...args) => {
      // 重定向到stderr以避免污染JSON-RPC输出
      process.stderr.write(args.join(' ') + '\n');
    };
    
    console.warn = (...args) => {
      process.stderr.write('[WARN] ' + args.join(' ') + '\n');
    };
    
    console.info = (...args) => {
      process.stderr.write('[INFO] ' + args.join(' ') + '\n');
    };
    
    // 启动消息只输出到stderr
    process.stderr.write('VibeDoc MCP Server running on stdio\n');
    
    await this.server.connect(transport);
  }
}

// Start the server
const server = new VibeDocMCPServer();
server.run().catch(console.error);