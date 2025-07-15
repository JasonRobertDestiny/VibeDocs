#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { MarkdownReportGenerator } from './markdown-generator.js';
import { performanceMonitor } from './performance-monitor.js';

// 文件导出配置接口
export interface ExportConfig {
  outputDir?: string;
  filename?: string;
  format?: 'markdown' | 'html' | 'pdf';
  includeTimestamp?: boolean;
  autoOpen?: boolean;
  compression?: boolean;
}

// 导出结果接口
export interface ExportResult {
  success: boolean;
  filePath?: string;
  filename?: string;
  size?: number;
  error?: string;
  exportTime?: number;
}

// 文件导出管理器 - 一键保存Markdown报告
export class FileExportManager {
  private static readonly DEFAULT_OUTPUT_DIR = path.join(os.homedir(), 'VibeDoc-Reports');
  private static readonly MAX_FILENAME_LENGTH = 100;
  
  /**
   * 一键导出项目报告到本地文件
   */
  static async exportProjectReport(
    planData: any,
    analysisData: any,
    visualizations: any,
    aiPrompts: any,
    metadata: any,
    config: ExportConfig = {}
  ): Promise<ExportResult> {
    const timer = performanceMonitor.startTimer('export_report_duration');
    
    try {
      // 生成完整的Markdown报告
      const markdownContent = MarkdownReportGenerator.generateProjectReport(
        planData,
        analysisData,
        visualizations,
        aiPrompts,
        metadata
      );
      
      // 确定输出目录和文件名
      const exportPath = this.prepareExportPath(planData, config);
      const filename = this.generateFilename(planData, config);
      const fullPath = path.join(exportPath, filename);
      
      // 确保输出目录存在
      await this.ensureDirectoryExists(exportPath);
      
      // 写入文件
      await fs.promises.writeFile(fullPath, markdownContent, 'utf8');
      
      // 获取文件大小
      const stats = await fs.promises.stat(fullPath);
      const fileSizeKB = Math.round(stats.size / 1024);
      
      // 记录导出事件
      performanceMonitor.recordEvent('report_exports', 1, {
        filename,
        sizeKB: fileSizeKB,
        format: config.format || 'markdown'
      });
      
      const duration = timer.stopWithResult(true, { 
        fileSizeKB,
        outputPath: exportPath 
      });
      
      console.log(`📄 报告导出成功: ${filename} (${fileSizeKB}KB)`);
      console.log(`📁 保存位置: ${fullPath}`);
      
      // 自动打开文件（如果配置要求）
      if (config.autoOpen) {
        await this.openFile(fullPath);
      }
      
      return {
        success: true,
        filePath: fullPath,
        filename,
        size: stats.size,
        exportTime: duration
      };
      
    } catch (error) {
      timer.stopWithResult(false, { error: error.message });
      
      performanceMonitor.recordEvent('export_failures', 1, {
        error: error.message,
        format: config.format || 'markdown'
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * 批量导出多个项目报告
   */
  static async batchExportReports(
    reports: Array<{
      planData: any;
      analysisData: any;
      visualizations: any;
      aiPrompts: any;
      metadata: any;
      config?: ExportConfig;
    }>
  ): Promise<ExportResult[]> {
    console.log(`📦 开始批量导出 ${reports.length} 个报告...`);
    
    const results: ExportResult[] = [];
    const batchTimer = performanceMonitor.startTimer('batch_export_duration');
    
    for (let i = 0; i < reports.length; i++) {
      const report = reports[i];
      console.log(`📄 导出进度: ${i + 1}/${reports.length}`);
      
      const result = await this.exportProjectReport(
        report.planData,
        report.analysisData,
        report.visualizations,
        report.aiPrompts,
        report.metadata,
        report.config || {}
      );
      
      results.push(result);
      
      // 短暂延迟避免文件系统压力
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const batchDuration = batchTimer.stopWithResult(true, {
      totalReports: reports.length,
      successCount: results.filter(r => r.success).length
    });
    
    console.log(`📦 批量导出完成，耗时 ${batchDuration}ms`);
    
    return results;
  }
  
  /**
   * 生成文件名
   */
  private static generateFilename(planData: any, config: ExportConfig): string {
    let baseName = 'VibeDoc-Report';
    
    // 尝试从项目数据中提取有意义的名称
    if (planData.productName) {
      baseName = this.sanitizeFilename(planData.productName);
    } else if (planData.projectName) {
      baseName = this.sanitizeFilename(planData.projectName);
    } else if (planData.domainName) {
      baseName = this.sanitizeFilename(planData.domainName.replace(/\./g, '-'));
    }
    
    // 限制文件名长度
    if (baseName.length > this.MAX_FILENAME_LENGTH) {
      baseName = baseName.substring(0, this.MAX_FILENAME_LENGTH);
    }
    
    // 自定义文件名优先
    if (config.filename) {
      baseName = this.sanitizeFilename(config.filename);
    }
    
    // 添加时间戳（默认启用）
    if (config.includeTimestamp !== false) {
      const timestamp = new Date().toISOString()
        .replace(/[:.]/g, '-')
        .split('T')[0]; // 只保留日期部分
      baseName += `_${timestamp}`;
    }
    
    // 添加扩展名
    const extension = this.getFileExtension(config.format || 'markdown');
    return `${baseName}${extension}`;
  }
  
  /**
   * 准备导出路径
   */
  private static prepareExportPath(planData: any, config: ExportConfig): string {
    if (config.outputDir) {
      return path.resolve(config.outputDir);
    }
    
    // 创建基于项目的子目录
    let subDir = 'General';
    if (planData.productName) {
      subDir = this.sanitizeFilename(planData.productName);
    } else if (planData.projectName) {
      subDir = this.sanitizeFilename(planData.projectName);
    }
    
    return path.join(this.DEFAULT_OUTPUT_DIR, subDir);
  }
  
  /**
   * 清理文件名，移除不安全字符
   */
  private static sanitizeFilename(filename: string): string {
    return filename
      .trim()
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '-') // 移除不安全字符
      .replace(/\s+/g, '-') // 空格替换为横线
      .replace(/--+/g, '-') // 多个横线合并为一个
      .replace(/^-+|-+$/g, ''); // 移除开头和结尾的横线
  }
  
  /**
   * 根据格式获取文件扩展名
   */
  private static getFileExtension(format: string): string {
    switch (format.toLowerCase()) {
      case 'html':
        return '.html';
      case 'pdf':
        return '.pdf';
      case 'markdown':
      case 'md':
      default:
        return '.md';
    }
  }
  
  /**
   * 确保目录存在
   */
  private static async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.promises.access(dirPath);
    } catch (error) {
      await fs.promises.mkdir(dirPath, { recursive: true });
      console.log(`📁 创建输出目录: ${dirPath}`);
    }
  }
  
  /**
   * 打开文件（根据操作系统）
   */
  private static async openFile(filePath: string): Promise<void> {
    try {
      const { spawn } = await import('child_process');
      
      switch (process.platform) {
        case 'darwin': // macOS
          spawn('open', [filePath]);
          break;
        case 'win32': // Windows
          spawn('start', [filePath], { shell: true });
          break;
        case 'linux': // Linux
          spawn('xdg-open', [filePath]);
          break;
        default:
          console.log(`📄 文件已保存，请手动打开: ${filePath}`);
      }
    } catch (error) {
      console.log(`⚠️ 无法自动打开文件: ${error.message}`);
    }
  }
  
  /**
   * 导出模板配置文件
   */
  static async exportConfigTemplate(outputPath?: string): Promise<ExportResult> {
    const templateConfig = {
      default: {
        outputDir: "./reports",
        includeTimestamp: true,
        format: "markdown",
        autoOpen: false,
        compression: false
      },
      production: {
        outputDir: path.join(os.homedir(), 'VibeDoc-Production-Reports'),
        includeTimestamp: true,
        format: "markdown",
        autoOpen: false,
        compression: true
      },
      development: {
        outputDir: "./dev-reports",
        includeTimestamp: false,
        format: "markdown",
        autoOpen: true,
        compression: false
      }
    };
    
    const configPath = outputPath || path.join(process.cwd(), 'export-config.json');
    
    try {
      await fs.promises.writeFile(
        configPath, 
        JSON.stringify(templateConfig, null, 2), 
        'utf8'
      );
      
      return {
        success: true,
        filePath: configPath,
        filename: 'export-config.json'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * 获取导出统计信息
   */
  static getExportStats(): {
    totalExports: number;
    averageFileSize: number;
    lastExportTime: number | null;
    failureRate: number;
  } {
    const exports = performanceMonitor.getMetricStats('report_exports');
    const failures = performanceMonitor.getMetricStats('export_failures');
    
    const totalExports = exports?.count || 0;
    const totalFailures = failures?.count || 0;
    const total = totalExports + totalFailures;
    
    return {
      totalExports,
      averageFileSize: exports?.average || 0,
      lastExportTime: exports?.latest || null,
      failureRate: total > 0 ? Math.round((totalFailures / total) * 100) : 0
    };
  }
  
  /**
   * 清理旧的导出文件
   */
  static async cleanupOldExports(
    maxAgeDays: number = 30, 
    outputDir?: string
  ): Promise<{ removed: number; errors: string[] }> {
    const targetDir = outputDir || this.DEFAULT_OUTPUT_DIR;
    const cutoffTime = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
    
    let removed = 0;
    const errors: string[] = [];
    
    try {
      const files = await fs.promises.readdir(targetDir, { recursive: true });
      
      for (const file of files) {
        const filePath = path.join(targetDir, file);
        
        try {
          const stats = await fs.promises.stat(filePath);
          if (stats.isFile() && stats.mtime.getTime() < cutoffTime) {
            await fs.promises.unlink(filePath);
            removed++;
          }
        } catch (error) {
          errors.push(`${file}: ${error.message}`);
        }
      }
      
      console.log(`🧹 清理完成，删除了 ${removed} 个过期文件`);
    } catch (error) {
      errors.push(`目录访问失败: ${error.message}`);
    }
    
    return { removed, errors };
  }
}

export default FileExportManager;