'use client'

import React from 'react'
import { Loader2, Sparkles, Brain, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingStateProps {
  isLoading: boolean
  message?: string
  type?: 'generating' | 'processing' | 'thinking' | 'default'
  className?: string
}

const loadingConfigs = {
  generating: {
    icon: Sparkles,
    messages: [
      'AI正在分析您的想法...',
      '正在生成个性化方案...',
      '正在优化技术建议...',
      '几乎完成了...'
    ],
    gradient: 'from-blue-500 to-purple-600'
  },
  processing: {
    icon: Brain,
    messages: ['正在处理您的请求...'],
    gradient: 'from-green-500 to-blue-500'
  },
  thinking: {
    icon: Lightbulb,
    messages: ['正在思考最佳方案...'],
    gradient: 'from-yellow-500 to-orange-500'
  },
  default: {
    icon: Loader2,
    messages: ['加载中...'],
    gradient: 'from-gray-500 to-gray-600'
  }
}

export function LoadingState({ 
  isLoading, 
  message, 
  type = 'default', 
  className 
}: LoadingStateProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = React.useState(0)
  const config = loadingConfigs[type]
  const Icon = config.icon
  
  React.useEffect(() => {
    if (!isLoading || config.messages.length <= 1) return
    
    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % config.messages.length)
    }, 2000)
    
    return () => clearInterval(interval)
  }, [isLoading, config.messages.length])

  if (!isLoading) return null

  const displayMessage = message || config.messages[currentMessageIndex]

  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-8 space-y-4 text-center",
      className
    )}>
      <div className="relative">
        <div className={cn(
          "absolute inset-0 rounded-full blur-lg opacity-30 bg-gradient-to-r",
          config.gradient
        )} />
        <div className="relative bg-background rounded-full p-4 border border-border">
          {type === 'generating' ? (
            <Sparkles className="h-8 w-8 text-blue-500 animate-pulse" />
          ) : (
            <Icon className="h-8 w-8 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>
      
      <div className="space-y-2">
        <p className="text-lg font-medium text-foreground">
          {displayMessage}
        </p>
        <div className="flex items-center justify-center space-x-1">
          <div className="flex space-x-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn(
                  "w-2 h-2 rounded-full bg-muted-foreground/30 animate-pulse",
                  `animation-delay-${i * 200}`
                )}
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
      </div>
      
      <div className="text-sm text-muted-foreground">
        预计用时 30-60 秒
      </div>
    </div>
  )
}