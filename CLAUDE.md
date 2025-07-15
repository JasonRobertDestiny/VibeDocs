# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is VibeDoc MCP Server - an AI-powered development planning MCP (Model Context Protocol) server that transforms product ideas into comprehensive development plans through a 5-stage pipeline. It's designed for the 魔搭MCP&Agent2025挑战赛 (ModelScope Hackathon 2025).

## Common Development Commands

### Building and Running
```bash
# Build the TypeScript code
npm run mcp:build

# Run the MCP server directly  
npm run mcp

# Run in development mode with auto-reload
npm run dev

# Start the built server
npm run start
```

### Testing
```bash
# Test the MCP server functionality
npm run test:mcp

# Full test including build
npm run test:full

# Test expert prompts
node test-expert-prompts.js

# Test pipeline processing
node test-pipeline.js
```

### MCP Configuration
```bash
# Test with environment variable
SILICONFLOW_API_KEY="your-key" npm run mcp

# Performance testing
node performance-test.js
```

## Architecture Overview

### Core Structure
- **src/index.ts**: Main MCP server implementation with 5 core tools
- **lib/**: Core processing libraries
  - `pipeline-processor.ts`: 5-stage pipeline orchestration
  - `expert-prompts.ts`: AI prompt engineering system
  - `sop-template.ts`: Standardized project planning template
  - `robust-utils.ts`: Error handling and retry mechanisms
  - `cache.ts`: Intelligent caching system
  - `utils.ts`: Shared utilities

### 5-Stage Pipeline Architecture
1. **🔍 Stage 1 - Intelligent Analysis**: Problem analysis and technical assessment
2. **🏗️ Stage 2 - Layered Planning**: Structured project planning with 26 fields
3. **📊 Stage 3 - Visualization Generation**: Mermaid.js architecture diagrams
4. **🤖 Stage 4 - AI Prompt Engineering**: Executable programming tasks
5. **✅ Stage 5 - Quality Validation**: Completeness and quality verification

### MCP Server Tools
- `generate_development_plan`: Complete AI development planning
- `get_project_template`: Standard planning template access
- `generate_ai_prompts`: Programming task generation  
- `generate_visualizations`: Mermaid chart creation
- `get_processing_status`: Real-time pipeline monitoring

### External Dependencies
- Silicon Flow AI gateway for Qwen2.5-72B model
- Environment variable: `SILICONFLOW_API_KEY`

## Development Guidelines

### TypeScript Configuration
- Strict mode enabled in tsconfig.json
- ES2022 target with ESNext modules
- Module resolution: bundler

### Error Handling
- Use RobustJSONParser for safe JSON parsing
- IntelligentRetryManager for API resilience
- Comprehensive error logging in pipeline stages

### Caching Strategy
- 5-minute intelligent cache with LRU eviction
- Cache key generation based on input hash
- Disabled for development/testing environments

### Testing Strategy
- No formal test framework - uses direct Node.js scripts
- test-expert-prompts.js: Tests prompt generation quality
- test-pipeline.js: Tests full pipeline processing
- performance-test.js: Benchmarks processing speed

### Code Patterns
- Class-based architecture with private methods
- Interface-driven TypeScript design
- Async/await for all AI operations
- Modular pipeline stage processing
- Status callback system for real-time updates

## MCP Protocol Specifics

### Tool Schema Design
- Rich input validation with enums and patterns
- Comprehensive documentation in tool descriptions
- Metadata return in `_meta` field for tool calls
- JSON-RPC error handling

### Client Integration
- Designed for Claude Desktop integration
- Windows/macOS/Linux configuration support
- Stdio transport protocol implementation

### Response Format
- Structured markdown output for readability
- Mermaid diagram embedding
- Progress tracking with visual indicators
- Quality metrics and processing statistics