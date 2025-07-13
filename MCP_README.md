# 🏆 VibeDoc MCP Server - 魔塔AI Hackathon 2025参赛项目

## 📋 项目概述

**VibeDoc** 是专为魔塔AI Hackathon 2025 MCP赛道开发的智能开发计划生成器。它通过Model Context Protocol (MCP)提供三个核心工具，帮助开发者快速将创意转化为完整的技术实施方案。

## 🎯 MCP Server核心功能

### 1. 📝 generate_development_plan
**功能**: 根据用户想法生成完整的软件开发计划  
**输入**: 
- `idea` (必填): 产品想法或项目描述
- `detailed` (可选): 是否生成详细计划，默认true
- `focus_area` (可选): 重点关注领域，可选值：tech_stack, deployment, marketing, analytics, all

**输出**: 包含25+字段的结构化开发计划，涵盖：
- 产品定位与痛点分析
- 技术栈选择与架构设计
- 部署运维方案
- 营销推广策略
- 数据分析与优化

### 2. 🗂️ get_project_template
**功能**: 获取标准化项目规划模板  
**输入**:
- `format` (可选): 模板格式，可选值：json, markdown, structured

**输出**: 完整的项目规划模板，包含7个步骤、25+个标准化字段

### 3. 🤖 generate_ai_prompts
**功能**: 基于开发计划生成分步骤AI编程助手提示词  
**输入**:
- `plan_data` (必填): 开发计划数据（来自generate_development_plan）
- `language` (可选): 编程语言偏好，默认typescript

**输出**: 4个分步骤的编程提示词，可直接用于AI编程助手

## 🚀 快速开始

### 环境要求
- Node.js 18+
- npm 或 yarn
- Silicon Flow API Key

### 1. 安装依赖
```bash
npm install
```

### 2. 配置环境变量
```bash
export SILICONFLOW_API_KEY="your_api_key_here"
```

### 3. 启动MCP Server
```bash
npm run mcp
```

### 4. 配置Claude Desktop
将以下配置添加到Claude Desktop的配置文件中：

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "vibedoc": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "/path/to/VibeDocs_MCP",
      "env": {
        "SILICONFLOW_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

## 💡 使用示例

### 示例1: 生成开发计划
```
使用generate_development_plan工具：
{
  "idea": "我想做一个基于AI的代码生成工具，可以根据自然语言描述自动生成代码",
  "detailed": true,
  "focus_area": "tech_stack"
}
```

### 示例2: 获取项目模板
```
使用get_project_template工具：
{
  "format": "markdown"
}
```

### 示例3: 生成编程提示词
```
使用generate_ai_prompts工具：
{
  "plan_data": {上一步生成的计划数据},
  "language": "typescript"
}
```

## 🏗️ 系统架构

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Claude AI     │    │   VibeDoc MCP    │    │  Silicon Flow   │
│                 │◄───│     Server       │────►│   API (Qwen)    │
│  (MCP Client)   │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
        │                       │                       │
        │                       │                       │
        ▼                       ▼                       ▼
  用户交互界面            标准化工具接口           AI模型推理
```

## 🎖️ 赛道价值体现

### MCP协议实现
- ✅ 完整的MCP Server实现
- ✅ 标准化的工具注册和调用
- ✅ stdio通信协议支持
- ✅ 错误处理和异常管理

### 技术创新
- 🚀 首个专注于开发规划的MCP Server
- 🎯 智能化项目规划流程
- 📋 标准化的开发模板系统
- 🤖 AI编程助手提示词生成

### 实用价值
- 降低项目启动门槛
- 标准化开发流程
- 提升开发效率
- 推动AI辅助开发

## 🔧 开发与调试

### 本地测试
```bash
# 启动MCP Server（调试模式）
npm run mcp

# 构建生产版本
npm run mcp:build
npm run mcp:start
```

### 测试工具调用
使用Claude Desktop配置后，可以直接在对话中调用：
```
请帮我生成一个在线教育平台的开发计划
```

Claude会自动调用`generate_development_plan`工具。

### 日志查看
MCP Server运行时会在stderr输出日志信息，便于调试：
```bash
npm run mcp 2> debug.log
```

## 📊 技术指标

- **响应时间**: < 30秒（AI生成）
- **模板覆盖**: 25+标准化字段
- **支持语言**: 6种主流编程语言
- **部署平台**: 5+主流部署方案
- **文档质量**: 结构化、可执行

## 🏆 竞赛优势

1. **完整的MCP实现**: 严格遵循MCP协议标准
2. **实用的工具集**: 解决真实的开发者痛点
3. **创新的应用**: AI在项目规划领域的首次深度应用
4. **开放的生态**: 可扩展的工具和模板系统
5. **专业的文档**: 完整的使用指南和技术文档

## 📞 联系信息

- **GitHub**: https://github.com/JasonRobertDestiny/VibeDocs
- **技术交流**: 通过GitHub Issues
- **魔塔平台**: 即将部署到ModelScope

---

**🏅 为魔塔AI Hackathon 2025 MCP赛道而生！**  
让AI助力每一个开发想法的实现 🚀