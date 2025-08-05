# 🔧 Focused MCP Server - 跨平台配置指南

## 🎯 快速开始 (3分钟上手)

### 第一步: 环境准备
```bash
# 检查Node.js版本 (需要 >= 18.0.0)
node --version

# 检查npm版本 (需要 >= 8.0.0)  
npm --version
```

### 第二步: 项目安装
```bash
# 克隆项目
git clone https://github.com/your-repo/focused-mcp-server.git
cd focused-mcp-server

# 安装依赖
npm install

# 构建项目 (可选)
npm run build
```

### 第三步: 启动测试
```bash
# 启动MCP Server
npm run mcp

# 看到以下输出表示成功:
# 📁 [MonitoringStorage] 创建数据目录: ~/.focused-mcp/monitoring  
# 🎯 Focused MCP Server running on stdio
```

## 🖥️ Windows 配置

### Claude Desktop 配置
创建或编辑配置文件: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "focused-mcp": {
      "command": "cmd",
      "args": ["/c", "cd /d \"D:\\path\\to\\focused-mcp-server\" && npm run mcp"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### PowerShell 配置 (推荐)
```json
{
  "mcpServers": {
    "focused-mcp": {
      "command": "powershell",
      "args": ["-Command", "cd 'D:\\path\\to\\focused-mcp-server'; npm run mcp"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### 批处理脚本方式
创建 `start-focused-mcp.bat`:
```batch
@echo off
cd /d "D:\path\to\focused-mcp-server"
npm run mcp
```

配置文件:
```json
{
  "mcpServers": {
    "focused-mcp": {
      "command": "D:\\path\\to\\focused-mcp-server\\start-focused-mcp.bat"
    }
  }
}
```

## 🍎 macOS 配置

### Claude Desktop 配置
编辑配置文件: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "focused-mcp": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "/Users/username/focused-mcp-server",
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### 使用npx方式 (推荐)
```json
{
  "mcpServers": {
    "focused-mcp": {
      "command": "npx",
      "args": ["tsx", "src/index.ts"],
      "cwd": "/Users/username/focused-mcp-server",
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### Shell脚本方式
创建 `start-focused-mcp.sh`:
```bash
#!/bin/bash
cd "/Users/username/focused-mcp-server"
npm run mcp
```

设置执行权限:
```bash
chmod +x start-focused-mcp.sh
```

配置文件:
```json
{
  "mcpServers": {
    "focused-mcp": {
      "command": "/Users/username/focused-mcp-server/start-focused-mcp.sh"
    }
  }
}
```

## 🐧 Linux 配置

### Claude Desktop 配置
编辑配置文件: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "focused-mcp": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "/home/username/focused-mcp-server",
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### Docker 部署 (推荐)
创建 `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "mcp"]
```

构建和运行:
```bash
# 构建镜像
docker build -t focused-mcp-server .

# 运行容器
docker run -d --name focused-mcp -p 3000:3000 focused-mcp-server
```

配置文件:
```json
{
  "mcpServers": {
    "focused-mcp": {
      "command": "docker",
      "args": ["exec", "focused-mcp", "npm", "run", "mcp"]
    }
  }
}
```

### systemd 服务 (生产环境)
创建 `/etc/systemd/system/focused-mcp.service`:
```ini
[Unit]
Description=Focused MCP Server
After=network.target

[Service]
Type=simple
User=mcp
WorkingDirectory=/home/mcp/focused-mcp-server
ExecStart=/usr/bin/npm run mcp
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

启动服务:
```bash
sudo systemctl enable focused-mcp
sudo systemctl start focused-mcp
sudo systemctl status focused-mcp
```

## 🔧 高级配置

### 环境变量配置
```bash
# 设置数据目录
export FOCUSED_MCP_DATA_DIR="/custom/path/to/data"

# 设置日志级别
export FOCUSED_MCP_LOG_LEVEL="debug"

# 设置缓存大小
export FOCUSED_MCP_CACHE_SIZE="1000"

# 设置最大记录数
export FOCUSED_MCP_MAX_RECORDS="50000"
```

### 配置文件方式
创建 `config.json`:
```json
{
  "dataDir": "/custom/path/to/data",
  "logLevel": "info",
  "cache": {
    "maxSize": 1000,
    "ttl": 300000
  },
  "monitoring": {
    "maxRecords": 50000,
    "retentionDays": 90,
    "autoCleanup": true
  },
  "performance": {
    "timeout": 30000,
    "maxRetries": 3
  }
}
```

### 性能优化配置
```json
{
  "mcpServers": {
    "focused-mcp": {
      "command": "node",
      "args": ["--max-old-space-size=512", "dist/index.js"],
      "cwd": "/path/to/focused-mcp-server",
      "env": {
        "NODE_ENV": "production",
        "NODE_OPTIONS": "--enable-source-maps"
      }
    }
  }
}
```

## 🧪 验证安装

### 基础功能测试
```bash
# 运行内置测试
npm run test

# 运行MCP工具测试  
npm run test:mcp

# 预期输出:
# ✅ predict_quality: 2ms (目标<3000ms)
# ✅ optimize_input: 2ms (目标<5000ms)  
# ✅ monitor_results: 3ms (目标<3000ms)
# 🎉 综合测试结果: 🌟 优秀
```

### Claude Desktop 集成测试
1. 重启Claude Desktop
2. 在对话中输入: "使用predict_quality工具"
3. 应该看到工具可用并能正常调用

### 性能基准测试
```bash
# 运行性能测试
npm run benchmark

# 预期结果:
# � 响应C时间: <5ms
# 📊 内存使用: <50MB  
# 📊 并发支持: 50+用户
# 📊 预测准确率: >85%
```

## 🛠️ 故障排除

### 常见问题

#### 1. "command not found" 错误
**原因**: Node.js或npm未正确安装
**解决**: 
```bash
# 安装Node.js (推荐使用nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

#### 2. "Permission denied" 错误
**原因**: 文件权限问题
**解决**:
```bash
# Linux/macOS
chmod +x start-script.sh
sudo chown -R $USER:$USER /path/to/focused-mcp-server

# Windows (以管理员身份运行)
icacls "D:\path\to\focused-mcp-server" /grant Users:F /T
```

#### 3. "Port already in use" 错误
**原因**: 端口被占用
**解决**:
```bash
# 查找占用进程
lsof -i :3000  # Linux/macOS
netstat -ano | findstr :3000  # Windows

# 杀死进程
kill -9 <PID>  # Linux/macOS
taskkill /PID <PID> /F  # Windows
```

#### 4. Claude Desktop 无法识别MCP Server
**检查清单**:
- ✅ 配置文件路径正确
- ✅ JSON格式有效 (使用JSON验证器)
- ✅ 命令路径存在且可执行
- ✅ 重启Claude Desktop
- ✅ 查看Claude Desktop日志

### 日志调试
```bash
# 启用详细日志
DEBUG=focused-mcp:* npm run mcp

# 查看系统日志
# Linux
journalctl -u focused-mcp -f

# macOS  
log stream --predicate 'process == "Claude"'

# Windows
Get-WinEvent -LogName Application | Where-Object {$_.ProviderName -eq "Claude"}
```

## 📊 性能监控

### 内置监控
```bash
# 查看监控数据
curl http://localhost:3000/health

# 预期响应:
{
  "status": "healthy",
  "uptime": 3600,
  "memory": "45MB",
  "cache": "850/1000",
  "requests": 1250
}
```

### 外部监控集成
```yaml
# Prometheus配置
- job_name: 'focused-mcp'
  static_configs:
    - targets: ['localhost:3000']
  metrics_path: '/metrics'
```

## 🔒 安全配置

### 基础安全
```json
{
  "security": {
    "maxInputLength": 2000,
    "rateLimiting": {
      "windowMs": 60000,
      "maxRequests": 100
    },
    "sanitization": {
      "removeHtml": true,
      "escapeSpecialChars": true
    }
  }
}
```

### 网络安全
```bash
# 防火墙配置 (仅本地访问)
sudo ufw allow from 127.0.0.1 to any port 3000
sudo ufw deny 3000
```

## 🚀 生产部署

### 负载均衡配置
```nginx
upstream focused_mcp {
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
}

server {
    listen 80;
    server_name mcp.yourdomain.com;
    
    location / {
        proxy_pass http://focused_mcp;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 集群部署
```bash
# 使用PM2管理多进程
npm install -g pm2

# 启动集群
pm2 start ecosystem.config.js

# ecosystem.config.js
module.exports = {
  apps: [{
    name: 'focused-mcp',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
```

## 📈 扩展配置

### 插件系统
```json
{
  "plugins": {
    "quality-enhancer": {
      "enabled": true,
      "config": {
        "strictMode": false,
        "customRules": []
      }
    },
    "analytics": {
      "enabled": true,
      "config": {
        "trackingId": "GA-XXXXXXXXX"
      }
    }
  }
}
```

### API扩展
```typescript
// 自定义质量评估器
class CustomQualityPredictor extends QualityPredictor {
  static async predictQuality(text: string): Promise<QualityPrediction> {
    // 自定义逻辑
    return super.predictQuality(text);
  }
}
```

## 🎉 总结

Focused MCP Server 提供了完整的跨平台支持：

- ✅ **Windows**: 完整支持，多种配置方式
- ✅ **macOS**: 原生兼容，简单配置  
- ✅ **Linux**: 企业级部署，Docker支持
- ✅ **Docker**: 容器化部署，易于扩展
- ✅ **云平台**: 支持各大云服务商

**🏆 真正做到了"一次开发，处处运行"的跨平台兼容性！**