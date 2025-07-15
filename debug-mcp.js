#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';

console.log('🔧 MCP Server Debug Script');
console.log('📍 Current Directory:', process.cwd());
console.log('🔑 API Key:', process.env.SILICONFLOW_API_KEY ? 'Set' : 'Not Set');

// Test MCP server startup
console.log('\n🚀 Starting MCP Server...');

const mcpProcess = spawn('npm', ['run', 'mcp'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    SILICONFLOW_API_KEY: process.env.SILICONFLOW_API_KEY || 'sk-eeqxcykxvmomeunmpbbgdsqgvrxqksyapauxzexphsiflgsy'
  }
});

mcpProcess.stdout.on('data', (data) => {
  console.log('✅ STDOUT:', data.toString());
});

mcpProcess.stderr.on('data', (data) => {
  console.log('❌ STDERR:', data.toString());
});

mcpProcess.on('close', (code) => {
  console.log(`🔚 MCP Server exited with code ${code}`);
});

// Test basic MCP protocol
setTimeout(() => {
  console.log('\n📨 Testing MCP Protocol...');
  
  const testMessage = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '1.15.1',
      capabilities: {},
      clientInfo: {
        name: 'debug-client',
        version: '1.0.0'
      }
    }
  };

  mcpProcess.stdin.write(JSON.stringify(testMessage) + '\n');
  
  setTimeout(() => {
    mcpProcess.kill();
  }, 2000);
}, 1000);