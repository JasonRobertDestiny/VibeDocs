#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * 监控记录接口
 */
export interface MonitoringRecord {
  id: string;
  timestamp: string;
  originalInput: string;
  generatedResult: string;
  expectedQuality?: number;
  actualQuality: number;
  qualityGap?: number;
  processingTime: number;
  success: boolean;
  errorMessage?: string;
  metadata: {
    inputLength: number;
    outputLength: number;
    model?: string;
    retryCount?: number;
    [key: string]: any;
  };
}

/**
 * 质量趋势数据接口
 */
export interface QualityTrend {
  date: string;
  averageQuality: number;
  successRate: number;
  totalRecords: number;
  averageProcessingTime: number;
}

/**
 * 统计数据接口
 */
export interface MonitoringStats {
  totalRecords: number;
  successRate: number;
  averageQuality: number;
  averageProcessingTime: number;
  qualityTrend: QualityTrend[];
  topIssues: Array<{ issue: string; count: number }>;
  lastUpdated: string;
}

/**
 * 存储配置接口
 */
export interface StorageConfig {
  dataDir: string;
  maxRecords: number;
  retentionDays: number;
  autoCleanup: boolean;
  backupEnabled: boolean;
}

/**
 * 监控数据存储管理器 - 轻量级本地数据库
 */
export class MonitoringStorage {
  private static readonly DEFAULT_CONFIG: StorageConfig = {
    dataDir: path.join(os.homedir(), '.focused-mcp', 'monitoring'),
    maxRecords: 10000,
    retentionDays: 90,
    autoCleanup: true,
    backupEnabled: true
  };

  private static readonly RECORDS_FILE = 'monitoring-records.json';
  private static readonly STATS_FILE = 'monitoring-stats.json';
  private static readonly BACKUP_DIR = 'backups';

  private config: StorageConfig;
  private recordsCache: MonitoringRecord[] = [];
  private statsCache: MonitoringStats | null = null;
  private lastSaveTime: number = 0;

  constructor(config: Partial<StorageConfig> = {}) {
    this.config = { ...MonitoringStorage.DEFAULT_CONFIG, ...config };
    this.initializeStorage();
    this.loadData();
  }

  /**
   * 初始化存储目录
   */
  private initializeStorage(): void {
    try {
      // 创建主数据目录
      if (!fs.existsSync(this.config.dataDir)) {
        fs.mkdirSync(this.config.dataDir, { recursive: true });
        console.error(`📁 [MonitoringStorage] 创建数据目录: ${this.config.dataDir}`);
      }

      // 创建备份目录
      if (this.config.backupEnabled) {
        const backupDir = path.join(this.config.dataDir, MonitoringStorage.BACKUP_DIR);
        if (!fs.existsSync(backupDir)) {
          fs.mkdirSync(backupDir, { recursive: true });
        }
      }

    } catch (error) {
      console.error(`❌ [MonitoringStorage] 初始化存储失败: ${error.message}`);
      throw new Error(`存储初始化失败: ${error.message}`);
    }
  }

  /**
   * 加载数据到内存缓存
   */
  private loadData(): void {
    try {
      // 加载监控记录
      const recordsPath = path.join(this.config.dataDir, MonitoringStorage.RECORDS_FILE);
      if (fs.existsSync(recordsPath)) {
        const recordsData = fs.readFileSync(recordsPath, 'utf8');
        this.recordsCache = JSON.parse(recordsData);
        console.error(`📊 [MonitoringStorage] 加载${this.recordsCache.length}条监控记录`);
      }

      // 加载统计数据
      const statsPath = path.join(this.config.dataDir, MonitoringStorage.STATS_FILE);
      if (fs.existsSync(statsPath)) {
        const statsData = fs.readFileSync(statsPath, 'utf8');
        this.statsCache = JSON.parse(statsData);
      }

    } catch (error) {
      console.error(`⚠️ [MonitoringStorage] 数据加载失败: ${error.message}`);
      // 数据损坏时重置
      this.recordsCache = [];
      this.statsCache = null;
    }
  }

  /**
   * 保存数据到磁盘
   */
  private async saveData(): Promise<void> {
    const now = Date.now();
    
    // 防止频繁保存（最少间隔1秒）
    if (now - this.lastSaveTime < 1000) {
      return;
    }

    try {
      // 保存监控记录
      const recordsPath = path.join(this.config.dataDir, MonitoringStorage.RECORDS_FILE);
      await fs.promises.writeFile(recordsPath, JSON.stringify(this.recordsCache, null, 2));

      // 保存统计数据
      if (this.statsCache) {
        const statsPath = path.join(this.config.dataDir, MonitoringStorage.STATS_FILE);
        await fs.promises.writeFile(statsPath, JSON.stringify(this.statsCache, null, 2));
      }

      this.lastSaveTime = now;

    } catch (error) {
      console.error(`❌ [MonitoringStorage] 数据保存失败: ${error.message}`);
      throw new Error(`数据保存失败: ${error.message}`);
    }
  }

  /**
   * 添加监控记录
   */
  async addRecord(record: Omit<MonitoringRecord, 'id' | 'timestamp'>): Promise<string> {
    const id = this.generateId();
    const timestamp = new Date().toISOString();

    const fullRecord: MonitoringRecord = {
      id,
      timestamp,
      ...record
    };

    // 添加到缓存
    this.recordsCache.push(fullRecord);

    // 检查是否需要清理旧数据
    if (this.config.autoCleanup && this.recordsCache.length > this.config.maxRecords) {
      await this.cleanupOldRecords();
    }

    // 更新统计数据
    await this.updateStats();

    // 保存到磁盘
    await this.saveData();

    console.error(`📝 [MonitoringStorage] 添加监控记录: ${id}`);
    return id;
  }

  /**
   * 获取监控记录
   */
  getRecords(limit?: number, offset?: number): MonitoringRecord[] {
    const start = offset || 0;
    const end = limit ? start + limit : undefined;
    
    return this.recordsCache
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(start, end);
  }

  /**
   * 根据ID获取记录
   */
  getRecordById(id: string): MonitoringRecord | null {
    return this.recordsCache.find(record => record.id === id) || null;
  }

  /**
   * 获取质量趋势数据
   */
  getQualityTrend(days: number = 30): QualityTrend[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // 按日期分组
    const dailyData = new Map<string, MonitoringRecord[]>();
    
    this.recordsCache
      .filter(record => new Date(record.timestamp) >= cutoffDate)
      .forEach(record => {
        const date = record.timestamp.split('T')[0];
        if (!dailyData.has(date)) {
          dailyData.set(date, []);
        }
        dailyData.get(date)!.push(record);
      });

    // 计算每日统计
    const trends: QualityTrend[] = [];
    dailyData.forEach((records, date) => {
      const successfulRecords = records.filter(r => r.success);
      const averageQuality = successfulRecords.length > 0
        ? successfulRecords.reduce((sum, r) => sum + r.actualQuality, 0) / successfulRecords.length
        : 0;
      const successRate = records.length > 0 ? (successfulRecords.length / records.length) * 100 : 0;
      const averageProcessingTime = records.length > 0
        ? records.reduce((sum, r) => sum + r.processingTime, 0) / records.length
        : 0;

      trends.push({
        date,
        averageQuality: Math.round(averageQuality),
        successRate: Math.round(successRate),
        totalRecords: records.length,
        averageProcessingTime: Math.round(averageProcessingTime)
      });
    });

    return trends.sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * 获取统计数据
   */
  getStats(): MonitoringStats {
    if (!this.statsCache) {
      this.updateStatsSync();
    }
    return this.statsCache!;
  }

  /**
   * 搜索记录
   */
  searchRecords(query: {
    startDate?: string;
    endDate?: string;
    minQuality?: number;
    maxQuality?: number;
    success?: boolean;
    keyword?: string;
  }): MonitoringRecord[] {
    return this.recordsCache.filter(record => {
      // 日期过滤
      if (query.startDate && record.timestamp < query.startDate) return false;
      if (query.endDate && record.timestamp > query.endDate) return false;

      // 质量过滤
      if (query.minQuality && record.actualQuality < query.minQuality) return false;
      if (query.maxQuality && record.actualQuality > query.maxQuality) return false;

      // 成功状态过滤
      if (query.success !== undefined && record.success !== query.success) return false;

      // 关键词过滤
      if (query.keyword) {
        const keyword = query.keyword.toLowerCase();
        const searchText = `${record.originalInput} ${record.generatedResult}`.toLowerCase();
        if (!searchText.includes(keyword)) return false;
      }

      return true;
    });
  }

  /**
   * 更新统计数据
   */
  private async updateStats(): Promise<void> {
    this.updateStatsSync();
    // 异步保存统计数据
    setTimeout(() => this.saveData(), 100);
  }

  /**
   * 同步更新统计数据
   */
  private updateStatsSync(): void {
    const totalRecords = this.recordsCache.length;
    if (totalRecords === 0) {
      this.statsCache = {
        totalRecords: 0,
        successRate: 0,
        averageQuality: 0,
        averageProcessingTime: 0,
        qualityTrend: [],
        topIssues: [],
        lastUpdated: new Date().toISOString()
      };
      return;
    }

    const successfulRecords = this.recordsCache.filter(r => r.success);
    const successRate = (successfulRecords.length / totalRecords) * 100;
    
    const averageQuality = successfulRecords.length > 0
      ? successfulRecords.reduce((sum, r) => sum + r.actualQuality, 0) / successfulRecords.length
      : 0;

    const averageProcessingTime = this.recordsCache.reduce((sum, r) => sum + r.processingTime, 0) / totalRecords;

    // 获取最近7天的趋势
    const qualityTrend = this.getQualityTrend(7);

    // 统计常见问题
    const issueMap = new Map<string, number>();
    this.recordsCache
      .filter(r => !r.success && r.errorMessage)
      .forEach(r => {
        const issue = r.errorMessage!.split(':')[0]; // 取错误类型
        issueMap.set(issue, (issueMap.get(issue) || 0) + 1);
      });

    const topIssues = Array.from(issueMap.entries())
      .map(([issue, count]) => ({ issue, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    this.statsCache = {
      totalRecords,
      successRate: Math.round(successRate),
      averageQuality: Math.round(averageQuality),
      averageProcessingTime: Math.round(averageProcessingTime),
      qualityTrend,
      topIssues,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * 清理旧记录
   */
  private async cleanupOldRecords(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

    const beforeCount = this.recordsCache.length;
    
    // 按时间和数量双重清理
    this.recordsCache = this.recordsCache
      .filter(record => new Date(record.timestamp) >= cutoffDate)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, this.config.maxRecords);

    const afterCount = this.recordsCache.length;
    const cleanedCount = beforeCount - afterCount;

    if (cleanedCount > 0) {
      console.error(`🧹 [MonitoringStorage] 清理${cleanedCount}条旧记录`);
    }
  }

  /**
   * 创建备份
   */
  async createBackup(): Promise<string> {
    if (!this.config.backupEnabled) {
      throw new Error('备份功能未启用');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(this.config.dataDir, MonitoringStorage.BACKUP_DIR);
    const backupFile = path.join(backupDir, `backup-${timestamp}.json`);

    const backupData = {
      records: this.recordsCache,
      stats: this.statsCache,
      createdAt: new Date().toISOString(),
      version: '1.0.0'
    };

    await fs.promises.writeFile(backupFile, JSON.stringify(backupData, null, 2));
    console.error(`💾 [MonitoringStorage] 创建备份: ${backupFile}`);

    return backupFile;
  }

  /**
   * 恢复备份
   */
  async restoreBackup(backupFile: string): Promise<void> {
    try {
      const backupData = JSON.parse(await fs.promises.readFile(backupFile, 'utf8'));
      
      this.recordsCache = backupData.records || [];
      this.statsCache = backupData.stats || null;

      await this.saveData();
      console.error(`🔄 [MonitoringStorage] 恢复备份: ${backupFile}`);

    } catch (error) {
      throw new Error(`备份恢复失败: ${error.message}`);
    }
  }

  /**
   * 导出数据
   */
  async exportData(format: 'json' | 'csv' = 'json'): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const exportDir = path.join(this.config.dataDir, 'exports');
    
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    if (format === 'json') {
      const exportFile = path.join(exportDir, `export-${timestamp}.json`);
      const exportData = {
        records: this.recordsCache,
        stats: this.statsCache,
        exportedAt: new Date().toISOString()
      };
      
      await fs.promises.writeFile(exportFile, JSON.stringify(exportData, null, 2));
      return exportFile;
    } else {
      // CSV格式
      const exportFile = path.join(exportDir, `export-${timestamp}.csv`);
      const csvHeader = 'ID,Timestamp,OriginalInput,ActualQuality,Success,ProcessingTime,ErrorMessage\n';
      const csvRows = this.recordsCache.map(record => 
        `"${record.id}","${record.timestamp}","${record.originalInput.replace(/"/g, '""')}",${record.actualQuality},${record.success},${record.processingTime},"${record.errorMessage || ''}"`
      ).join('\n');
      
      await fs.promises.writeFile(exportFile, csvHeader + csvRows);
      return exportFile;
    }
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `mon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取存储信息
   */
  getStorageInfo(): {
    dataDir: string;
    recordsCount: number;
    storageSize: number;
    lastBackup?: string;
    config: StorageConfig;
  } {
    let storageSize = 0;
    let lastBackup: string | undefined;

    try {
      // 计算存储大小
      const recordsPath = path.join(this.config.dataDir, MonitoringStorage.RECORDS_FILE);
      if (fs.existsSync(recordsPath)) {
        storageSize += fs.statSync(recordsPath).size;
      }

      const statsPath = path.join(this.config.dataDir, MonitoringStorage.STATS_FILE);
      if (fs.existsSync(statsPath)) {
        storageSize += fs.statSync(statsPath).size;
      }

      // 查找最新备份
      const backupDir = path.join(this.config.dataDir, MonitoringStorage.BACKUP_DIR);
      if (fs.existsSync(backupDir)) {
        const backupFiles = fs.readdirSync(backupDir)
          .filter(file => file.startsWith('backup-'))
          .sort()
          .reverse();
        
        if (backupFiles.length > 0) {
          lastBackup = backupFiles[0];
        }
      }

    } catch (error) {
      console.error(`⚠️ [MonitoringStorage] 获取存储信息失败: ${error.message}`);
    }

    return {
      dataDir: this.config.dataDir,
      recordsCount: this.recordsCache.length,
      storageSize,
      lastBackup,
      config: this.config
    };
  }

  /**
   * 关闭存储（清理资源）
   */
  async close(): Promise<void> {
    await this.saveData();
    console.error(`📁 [MonitoringStorage] 存储已关闭`);
  }
}

export default MonitoringStorage;