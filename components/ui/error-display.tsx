'use client'

import React from 'react'
import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

interface ErrorDisplayProps {
  error: string | null
  onRetry?: () => void
  isRetrying?: boolean
  showRetry?: boolean
  type?: 'network' | 'api' | 'validation' | 'general'
}

const errorMessages = {
  network: {
    title: '网络连接问题',
    description: '请检查您的网络连接，然后重试',
    icon: WifiOff
  },
  api: {
    title: 'AI服务暂时不可用',
    description: 'AI生成服务遇到问题，请稍后重试',
    icon: AlertTriangle
  },
  validation: {
    title: '输入验证失败',
    description: '请检查您的输入内容，确保格式正确',
    icon: AlertTriangle
  },
  general: {
    title: '生成计划时出错',
    description: '系统遇到未知错误，请重试或联系支持',
    icon: AlertTriangle
  }
}

export function ErrorDisplay({ 
  error, 
  onRetry, 
  isRetrying = false, 
  showRetry = true,
  type = 'general' 
}: ErrorDisplayProps) {
  if (!error) return null

  const config = errorMessages[type]
  const Icon = config.icon

  return (
    <Alert variant="destructive" className="my-4">
      <Icon className="h-4 w-4" />
      <AlertTitle>{config.title}</AlertTitle>
      <AlertDescription className="mt-2">
        <div className="space-y-2">
          <p>{config.description}</p>
          {error && (
            <details className="text-xs opacity-70">
              <summary className="cursor-pointer hover:opacity-100">查看详细错误信息</summary>
              <pre className="mt-1 p-2 bg-black/5 rounded text-xs overflow-auto">
                {error}
              </pre>
            </details>
          )}
          {showRetry && onRetry && (
            <div className="flex gap-2 mt-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onRetry}
                disabled={isRetrying}
                className="h-8"
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    重试中...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    重试
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  )
}