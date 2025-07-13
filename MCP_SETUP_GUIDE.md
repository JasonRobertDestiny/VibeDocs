# 🔧 VibeDoc MCP Server 配置指南

> 🏆 **魔搭MCP&Agent2025挑战赛MCP赛道一** - 跨平台完整配置指南

## 📋 目录

- [🚀 快速开始](#-快速开始)
- [🖥️ Windows配置](#️-windows配置)
- [🍎 macOS配置](#-macos配置)  
- [🐧 Linux配置](#-linux配置)
- [🔧 Claude Desktop集成](#-claude-desktop集成)
- [🧪 测试验证](#-测试验证)
- [🛠️ 故障排除](#️-故障排除)

## 🚀 快速开始

### 📋 系统要求

- **Node.js**: 18.0.0 或更高版本
- **npm**: 8.0.0 或更高版本
- **Claude Desktop**: 最新版本
- **Silicon Flow API Key**: [获取地址](https://siliconflow.cn)

### 📦 项目安装

1. **克隆项目**
```bash
git clone https://github.com/JasonRobertDestiny/VibeDocs.git
cd VibeDocs
```

2. **安装依赖**
```bash
npm install
```

3. **构建MCP Server**
```bash
npm run mcp:build
```

4. **验证安装**
```bash
npm run mcp
```

如果看到 `VibeDoc MCP Server running on stdio` 消息，说明安装成功！

## 🖥️ Windows配置

### 🔧 Claude Desktop配置文件位置

Windows上Claude Desktop配置文件位于：
```
%APPDATA%\Claude\claude_desktop_config.json
```

### 📝 Windows专用MCP配置

创建或编辑配置文件，添加以下内容：

```json
{
  "mcpServers": {
    "vibedoc": {
      "command": "cmd",
      "args": [
        "/c",
        "cd /d \"C:\\path\\to\\your\\VibeDocs\" && npm run mcp"
      ],
      "env": {
        "SILICONFLOW_API_KEY": "sk-your-api-key-here"
      },
      "description": "VibeDoc MCP Server - AI开发计划生成器"
    }
  }
}
```

### 🔑 环境变量设置 (Windows)

**方法1：命令行设置**
```cmd
set SILICONFLOW_API_KEY=sk-your-api-key-here
```

**方法2：系统环境变量**
1. 右键"此电脑" → "属性"
2. 点击"高级系统设置"
3. 点击"环境变量"
4. 在"用户变量"中添加：
   - 变量名：`SILICONFLOW_API_KEY`
   - 变量值：`sk-your-api-key-here`

### 🛠️ Windows故障排除

**问题1：找不到npm命令**
```cmd
# 确保Node.js已添加到PATH
where npm
# 如果无输出，重新安装Node.js
```

**问题2：路径包含空格**
```json
{
  "command": "cmd",
  "args": ["/c", "cd /d \"C:\\Program Files\\My Projects\\VibeDocs\" && npm run mcp"]
}
```

**问题3：权限不足**
- 以管理员身份运行Claude Desktop
- 确保项目目录有读写权限

## 🍎 macOS配置

### 🔧 Claude Desktop配置文件位置

```bash
~/Library/Application Support/Claude/claude_desktop_config.json
```

### 📝 macOS专用MCP配置

```json
{
  "mcpServers": {
    "vibedoc": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "/Users/yourname/path/to/VibeDocs",
      "env": {
        "SILICONFLOW_API_KEY": "sk-your-api-key-here"
      },
      "description": "VibeDoc MCP Server - AI开发计划生成器"
    }
  }
}
```

### 🔑 环境变量设置 (macOS)

**临时设置**
```bash
export SILICONFLOW_API_KEY=sk-your-api-key-here
```

**永久设置**
```bash
# 编辑 ~/.zshrc 或 ~/.bash_profile
echo 'export SILICONFLOW_API_KEY=sk-your-api-key-here' >> ~/.zshrc
source ~/.zshrc
```

### 🛠️ macOS故障排除

**问题1：权限被拒绝**
```bash
# 给予执行权限
chmod +x node_modules/.bin/*
```

**问题2：找不到配置文件**
```bash
# 创建配置目录
mkdir -p ~/Library/Application\ Support/Claude
touch ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

## 🐧 Linux配置

### 🔧 Claude Desktop配置文件位置

```bash
~/.config/Claude/claude_desktop_config.json
```

### 📝 Linux专用MCP配置

```json
{
  "mcpServers": {
    "vibedoc": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "/home/username/path/to/VibeDocs",
      "env": {
        "SILICONFLOW_API_KEY": "sk-your-api-key-here"
      },
      "description": "VibeDoc MCP Server - AI开发计划生成器"
    }
  }
}
```

### 🔑 环境变量设置 (Linux)

```bash
# 添加到 ~/.bashrc 或 ~/.zshrc
echo 'export SILICONFLOW_API_KEY=sk-your-api-key-here' >> ~/.bashrc
source ~/.bashrc
```

### 🛠️ Linux故障排除

**问题1：缺少依赖**
```bash
# Ubuntu/Debian
sudo apt update && sudo apt install nodejs npm

# CentOS/RHEL
sudo yum install nodejs npm
```

## 🔧 Claude Desktop集成

### 📱 配置步骤

1. **找到配置文件**（根据你的操作系统）
2. **编辑JSON配置**（使用上面对应的配置）
3. **重启Claude Desktop**
4. **验证集成**

### 🎯 配置模板

根据你的操作系统选择对应的配置：

<details>
<summary>🖥️ Windows完整配置</summary>

```json
{
  "mcpServers": {
    "vibedoc": {
      "command": "cmd",
      "args": ["/c", "cd /d \"项目完整路径\" && npm run mcp"],
      "env": {
        "SILICONFLOW_API_KEY": "你的API密钥",
        "NODE_ENV": "production"
      },
      "description": "VibeDoc MCP Server - 魔搭挑战赛MCP赛道一"
    }
  },
  "globalShortcuts": {
    "toggleVibeDoc": "Ctrl+Shift+V"
  }
}
```
</details>

<details>
<summary>🍎 macOS完整配置</summary>

```json
{
  "mcpServers": {
    "vibedoc": {
      "command": "/usr/local/bin/npm",
      "args": ["run", "mcp"],
      "cwd": "/Users/yourname/VibeDocs",
      "env": {
        "SILICONFLOW_API_KEY": "你的API密钥",
        "NODE_ENV": "production"
      },
      "description": "VibeDoc MCP Server - 魔搭挑战赛MCP赛道一"
    }
  }
}
```
</details>

<details>
<summary>🐧 Linux完整配置</summary>

```json
{
  "mcpServers": {
    "vibedoc": {
      "command": "/usr/bin/npm",
      "args": ["run", "mcp"],
      "cwd": "/home/username/VibeDocs", 
      "env": {
        "SILICONFLOW_API_KEY": "你的API密钥",
        "NODE_ENV": "production"
      },
      "description": "VibeDoc MCP Server - 魔搭挑战赛MCP赛道一"
    }
  }
}
```
</details>

## 🧪 测试验证

### 🚀 本地测试

**运行测试脚本**
```bash
# 设置API密钥
export SILICONFLOW_API_KEY=sk-your-key  # Linux/macOS
set SILICONFLOW_API_KEY=sk-your-key     # Windows

# 运行测试
node test-mcp-usage.js
```

**预期输出**
```
🚀 启动VibeDoc MCP Server测试...
✅ MCP Server启动成功!
📋 测试1: 获取可用工具
📝 测试2: 获取项目模板
🧠 测试3: AI生成开发计划
✅ 测试完成！
```

### 🔍 Claude Desktop验证

1. **重启Claude Desktop**
2. **检查MCP连接状态**
3. **测试工具调用**

在Claude Desktop中输入：
```
请使用VibeDoc工具帮我生成一个AI聊天机器人的开发计划
```

如果看到AI开始调用工具并返回开发计划，说明配置成功！

## 🛠️ 故障排除

### ❌ 常见错误及解决方案

#### 1. **MCP Server连接失败**

**错误信息**: `Failed to connect to MCP server`

**解决方案**:
- 检查项目路径是否正确
- 确保已运行 `npm install` 和 `npm run mcp:build`
- 验证Node.js版本 ≥ 18.0.0

#### 2. **API密钥无效**

**错误信息**: `未配置 SILICONFLOW_API_KEY 环境变量`

**解决方案**:
- 检查API密钥格式（应以`sk-`开头）
- 确认环境变量名称拼写正确
- 验证API密钥在Silicon Flow平台有效

#### 3. **权限被拒绝**

**错误信息**: `Permission denied` 或 `EACCES`

**解决方案**:
```bash
# macOS/Linux
sudo chown -R $(whoami) /path/to/VibeDocs
chmod +x node_modules/.bin/*

# Windows: 以管理员身份运行
```

#### 4. **端口占用**

**错误信息**: `Port already in use`

**解决方案**:
```bash
# 查找占用进程
netstat -ano | findstr :3000  # Windows
lsof -i :3000                 # macOS/Linux

# 终止进程
taskkill /PID <PID> /F        # Windows
kill -9 <PID>                 # macOS/Linux
```

### 🔧 调试技巧

#### 1. **启用详细日志**

```json
{
  "mcpServers": {
    "vibedoc": {
      "command": "npm",
      "args": ["run", "mcp"],
      "env": {
        "DEBUG": "mcp:*",
        "SILICONFLOW_API_KEY": "sk-your-key"
      }
    }
  }
}
```

#### 2. **检查MCP Server状态**

```bash
# 单独运行MCP Server
npm run mcp

# 应该看到：VibeDoc MCP Server running on stdio
```

#### 3. **验证工具可用性**

```bash
# 使用测试脚本验证
node test-mcp-usage.js
```

### 📞 获取帮助

如果遇到无法解决的问题：

1. **查看项目Issues**: [GitHub Issues](https://github.com/JasonRobertDestiny/VibeDocs/issues)
2. **提交新Issue**: 包含详细的错误信息和系统环境
3. **检查官方文档**: [MCP协议文档](https://modelcontextprotocol.io/)

---

## 🏆 配置成功！

一旦配置完成，你就可以在Claude Desktop中使用VibeDoc的三个强大工具：

- 🧠 **generate_development_plan** - AI生成开发计划
- 📋 **get_project_template** - 获取项目模板
- 🤖 **generate_ai_prompts** - 生成编程提示词

**立即开始使用VibeDoc，让AI成为你的开发规划专家！** 🚀