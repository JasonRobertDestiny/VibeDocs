# VibeDoc - AI驱动的开发计划生成器

> 🏆 **参赛项目** - 魔搭AI Hackathon 2025 - 赛道一：MCP Server开发赛道

## 📖 项目简介

VibeDoc 是一个基于 AI 的智能开发计划生成工具，帮助开发者和产品经理快速将创意转化为完整的技术开发方案。通过集成大语言模型，自动生成包含技术栈选择、架构设计、部署方案等在内的全面开发计划。

### 🌟 核心特性

- **AI 智能生成**：基于用户输入的产品创意，自动生成完整的开发计划
- **多步骤向导**：支持手动填写模式，逐步完善项目细节
- **技术栈推荐**：智能推荐适合的技术栈和开发工具
- **部署方案**：提供完整的部署和运维建议
- **营销策略**：包含产品推广和用户增长建议
- **AI 编程提示词**：自动生成可直接使用的编程助手提示词

## 🏗️ 技术架构

### 前端技术栈
- **Next.js 15** - React 全栈框架
- **React 19** - 用户界面库
- **TypeScript** - 类型安全的 JavaScript
- **Tailwind CSS 4** - 原子化 CSS 框架
- **Shadcn/UI** - 现代化组件库

### AI 集成
- **Silicon Flow API** - 大语言模型服务
- **Qwen2.5-72B-Instruct** - 智能内容生成模型

### 开发工具
- **Turbopack** - 极速构建工具
- **ESLint** - 代码质量检查
- **PostCSS** - CSS 处理器

## 🚀 快速开始

### 环境要求
- Node.js 18+ 
- npm 或 yarn 或 pnpm

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/JasonRobertDestiny/VibeDocs.git
cd VibeDocs
```

2. **安装依赖**
```bash
npm install
# 或
yarn install
# 或
pnpm install
```

3. **配置环境变量**
```bash
cp .env.local.example .env.local
```

在 `.env.local` 文件中配置你的 Silicon Flow API Key：
```env
SILICONFLOW_API_KEY=your_api_key_here
```

4. **启动开发服务器**
```bash
npm run dev
# 或
yarn dev
# 或
pnpm dev
```

5. **访问应用**
打开 [http://localhost:3000](http://localhost:3000) 查看应用

## 💡 使用指南

### AI 生成模式
1. 在首页输入你的产品创意
2. 点击"AI 生成计划"按钮
3. 等待 AI 分析并生成完整的开发计划
4. 查看生成的文档和编程提示词

### 手动填写模式
1. 点击"手动填写"进入向导模式
2. 按步骤填写项目信息
3. 在任何时候都可以点击"返回 AI 生成"切换模式
4. 完成所有步骤后生成最终文档

## 📁 项目结构

```
VibeDocs/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   │   └── auto-generate-plan/  # AI 生成接口
│   ├── globals.css        # 全局样式
│   ├── layout.tsx         # 根布局
│   └── page.tsx          # 主页面
├── components/            # React 组件
│   └── ui/               # UI 组件库
├── lib/                   # 工具库
│   ├── sop-template.ts   # 开发计划模板
│   └── utils.ts          # 工具函数
├── public/               # 静态资源
└── 配置文件...
```

## 🔧 API 接口

### POST /api/auto-generate-plan

根据用户输入的创意生成完整的开发计划。

**请求体：**
```json
{
  "idea": "你的产品创意描述"
}
```

**响应：**
```json
{
  "success": true,
  "plan": {
    "productName": "产品名称",
    "techStack": "技术栈",
    "deploymentPlan": "部署方案",
    // ... 更多字段
  },
  "originalIdea": "原始创意",
  "fieldIds": ["字段ID列表"]
}
```

## 🎯 MCP Server 特性

作为 MCP (Model Context Protocol) Server 开发赛道的参赛项目，VibeDoc 展示了以下技术特点：

### AI 模型集成
- 集成 Silicon Flow API 提供的大语言模型服务
- 实现智能内容生成和结构化输出
- 支持多种 AI 模型的灵活切换

### 智能提示工程
- 精心设计的 Prompt 模板确保输出质量
- 结构化的 JSON 响应格式
- 错误处理和容错机制

### 开发者友好
- 完整的 TypeScript 类型定义
- 详细的错误日志和调试信息
- 可扩展的模块化架构

## 🌈 功能演示

### 主要功能流程

1. **创意输入** → 用户描述产品想法
2. **AI 分析** → 智能分析并生成方案
3. **结果展示** → 完整的开发计划文档
4. **编程助手** → 生成可用的编程提示词

### 生成内容包括

- 📋 **产品规划**：痛点分析、功能设计、商业模式
- 🛠️ **技术方案**：技术栈、架构设计、开发计划
- 🚀 **部署运维**：托管平台、域名配置、性能优化
- 📈 **营销策略**：推广方案、用户增长、数据分析
- 🤖 **AI 助手**：分步骤的编程提示词

## 🚢 部署指南

### Vercel 部署（推荐）

1. 将项目推送到 GitHub
2. 在 [Vercel](https://vercel.com) 中导入项目
3. 配置环境变量 `SILICONFLOW_API_KEY`
4. 自动部署完成

### 魔塔部署

1. 准备 Docker 配置
2. 配置模型服务
3. 设置环境变量
4. 部署到魔塔平台

## 🏆 赛道亮点

### 创新性
- **AI + 开发流程**：将 AI 能力深度融合到软件开发流程中
- **智能化工具**：自动化复杂的项目规划过程
- **开发者工具**：生成直接可用的编程助手提示词

### 技术价值
- **模型集成**：展示了大语言模型在垂直领域的应用
- **工程实践**：完整的前端 + AI 后端架构
- **用户体验**：直观的交互界面和流畅的使用流程

### 实用性
- **解决痛点**：帮助开发者快速启动项目
- **提高效率**：减少项目规划的时间成本
- **知识沉淀**：标准化的开发计划模板

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 开发流程
1. Fork 项目
2. 创建功能分支
3. 提交代码
4. 创建 Pull Request

### 代码规范
- 使用 TypeScript 进行类型检查
- 遵循 ESLint 代码规范
- 编写清晰的提交信息

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 📞 联系方式

- **GitHub**: [JasonRobertDestiny](https://github.com/JasonRobertDestiny)
- **项目地址**: [https://github.com/JasonRobertDestiny/VibeDocs](https://github.com/JasonRobertDestiny/VibeDocs)

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给个 Star ⭐**

Made with ❤️ for MCP Server Development Track

</div>
