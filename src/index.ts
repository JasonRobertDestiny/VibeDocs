#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { SOP_TEMPLATE } from "../lib/sop-template.js";

// AI Generate Plan Tool
class VibeDocMCPServer {
  private server: Server;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.SILICONFLOW_API_KEY || '';
    this.server = new Server(
      {
        name: "vibedoc-mcp-server",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {},
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
            description: "根据用户想法生成完整的软件开发计划，包括技术栈、架构设计、部署方案等",
            inputSchema: {
              type: "object",
              properties: {
                idea: {
                  type: "string",
                  description: "用户的产品想法或项目描述",
                },
                detailed: {
                  type: "boolean",
                  description: "是否生成详细的开发计划（默认为true）",
                  default: true,
                },
                focus_area: {
                  type: "string",
                  description: "重点关注的领域（可选）：tech_stack, deployment, marketing, analytics",
                  enum: ["tech_stack", "deployment", "marketing", "analytics", "all"],
                  default: "all",
                },
              },
              required: ["idea"],
            },
          },
          {
            name: "get_project_template",
            description: "获取预定义的项目规划模板，包含所有标准化字段",
            inputSchema: {
              type: "object",
              properties: {
                format: {
                  type: "string",
                  description: "模板格式",
                  enum: ["json", "markdown", "structured"],
                  default: "structured",
                },
              },
            },
          },
          {
            name: "generate_ai_prompts",
            description: "基于开发计划生成分步骤的AI编程助手提示词",
            inputSchema: {
              type: "object",
              properties: {
                plan_data: {
                  type: "object",
                  description: "开发计划数据（generate_development_plan的输出）",
                },
                language: {
                  type: "string",
                  description: "编程语言偏好",
                  enum: ["javascript", "typescript", "python", "java", "go", "rust"],
                  default: "typescript",
                },
              },
              required: ["plan_data"],
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
              detailed?: boolean;
              focus_area?: string;
            });
          
          case "get_project_template":
            return await this.handleGetTemplate(args as { format?: string });
          
          case "generate_ai_prompts":
            return await this.handleGeneratePrompts(args as {
              plan_data: Record<string, string>;
              language?: string;
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
    detailed?: boolean;
    focus_area?: string;
  }): Promise<{
    content: Array<{ type: string; text: string }>;
    _meta?: Record<string, unknown>;
  }> {
    if (!args.idea?.trim()) {
      throw new Error("请提供产品想法或项目描述");
    }

    if (!this.apiKey) {
      throw new Error("未配置 SILICONFLOW_API_KEY 环境变量");
    }

    const allFieldIds = SOP_TEMPLATE.flatMap(step => 
      step.fields.map(field => field.id)
    );

    const masterPrompt = this.buildMasterPrompt(args.idea, allFieldIds, args.focus_area);

    try {
      const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'Qwen/Qwen2.5-72B-Instruct',
          messages: [{
            role: 'user',
            content: masterPrompt
          }],
          temperature: 0.7,
          max_tokens: 4000
        })
      });

      if (!response.ok) {
        throw new Error(`AI API调用失败: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const generatedContent = data.choices?.[0]?.message?.content;
      
      if (!generatedContent) {
        throw new Error("AI生成内容为空");
      }

      // Parse JSON response
      const cleanContent = generatedContent
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      
      const parsedPlan = JSON.parse(cleanContent);
      
      // Validate and fill missing fields
      const missingFields = allFieldIds.filter(fieldId => !(fieldId in parsedPlan));
      missingFields.forEach(fieldId => {
        parsedPlan[fieldId] = `请根据项目需求填写${fieldId}相关内容`;
      });

      return {
        content: [
          {
            type: "text",
            text: `# 🚀 VibeDoc 开发计划生成成功\n\n**原始想法**: ${args.idea}\n\n## 📋 生成的开发计划\n\n${JSON.stringify(parsedPlan, null, 2)}\n\n✅ 已成功生成包含 ${Object.keys(parsedPlan).length} 个字段的完整开发计划！\n\n💡 **提示**: 您可以使用 \`generate_ai_prompts\` 工具基于此计划生成编程提示词`,
          },
        ],
        _meta: {
          plan_data: parsedPlan,
          original_idea: args.idea,
          field_count: Object.keys(parsedPlan).length,
        },
      };

    } catch (error) {
      throw new Error(`生成开发计划失败: ${error instanceof Error ? error.message : String(error)}`);
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

    const language = args.language || "typescript";
    const plan = args.plan_data;

    const prompts = [
      {
        task: "项目初始化",
        prompt: `请帮我创建一个新的${language}项目：${plan.productName || '我的项目'}\n\n技术栈要求：${plan.techStack || 'Next.js + React + TypeScript'}\n\n项目描述：${plan.painPoints || '解决用户痛点的产品'}\n\n请设置好基础项目结构，包括必要的依赖和配置文件。`
      },
      {
        task: "核心功能开发",
        prompt: `请基于以下需求实现核心功能：\n\n主要功能点：${plan.newTerms || '核心功能特性'}\n\n技术实现：${plan.techStack || 'React组件 + API接口'}\n\n设计系统：${plan.designSystem || 'Tailwind CSS + 组件库'}\n\n请实现主要的用户界面和核心业务逻辑。`
      },
      {
        task: "API接口开发",
        prompt: `请为项目创建必要的API接口：\n\n后端需求：${plan.developmentPlan || '用户管理、数据处理、业务逻辑'}\n\n数据处理：根据业务需求设计数据模型和API端点\n\n请实现RESTful API，包括数据验证和错误处理。`
      },
      {
        task: "部署配置",
        prompt: `请帮我配置项目部署：\n\n部署平台：${plan.hostingPlatform || 'Vercel'}\n\n域名配置：${plan.domainName || 'example.com'}\n\n性能优化：${plan.performanceOptimization || 'CDN、压缩、缓存'}\n\n请创建部署脚本和CI/CD配置。`
      }
    ];

    const promptsText = prompts.map((item) => 
      `## 🔧 任务 ${prompts.indexOf(item) + 1}: ${item.task}\n\n\`\`\`\n${item.prompt}\n\`\`\`\n`
    ).join('\n');

    return {
      content: [
        {
          type: "text",
          text: `# 🤖 AI编程助手提示词\n\n基于您的开发计划，已生成 ${prompts.length} 个分步骤编程提示词：\n\n${promptsText}\n\n💡 **使用提示**: 将上述每个任务的提示词复制给AI编程助手，它们会根据您的具体需求帮您完成开发工作。`,
        },
      ],
      _meta: {
        prompts: prompts,
        language: language,
        plan_fields: Object.keys(plan).length,
      },
    };
  }

  private buildMasterPrompt(idea: string, fieldIds: string[], focusArea?: string): string {
    const focusInstruction = focusArea && focusArea !== 'all' 
      ? `特别关注 ${focusArea} 相关的内容。` 
      : '';

    return `You are an expert Product Manager and Technical Architect. Based on the user's idea, you must generate a comprehensive development plan.

CRITICAL REQUIREMENTS:
1. You MUST return ONLY a valid JSON object
2. The JSON object MUST have exactly these keys (field IDs): ${fieldIds.join(', ')}
3. Each field must be filled with relevant, detailed content in Chinese
4. Do not include any text before or after the JSON object
5. All values should be strings, not arrays or objects
${focusInstruction}

User's idea: "${idea}"

Generate a complete development plan based on this idea. Return ONLY the JSON object with no additional text.`;
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("VibeDoc MCP Server running on stdio");
  }
}

// Start the server
const server = new VibeDocMCPServer();
server.run().catch(console.error);