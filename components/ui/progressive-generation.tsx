'use client'

import React, { useState, useEffect } from 'react'
import { CheckCircle, Circle, Loader2, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface GenerationStep {
  id: string
  label: string
  description: string
  estimatedTime: number // in seconds
}

const generationSteps: GenerationStep[] = [
  {
    id: 'analyze',
    label: '分析想法',
    description: '理解您的产品想法和需求',
    estimatedTime: 5
  },
  {
    id: 'research',
    label: '研究市场',
    description: '分析相关技术和竞品',
    estimatedTime: 10
  },
  {
    id: 'design',
    label: '设计方案',
    description: '制定技术架构和实施计划',
    estimatedTime: 15
  },
  {
    id: 'optimize',
    label: '优化计划',
    description: '精化细节和推荐最佳实践',
    estimatedTime: 10
  },
  {
    id: 'finalize',
    label: '生成文档',
    description: '整理成完整的开发计划',
    estimatedTime: 5
  }
]

interface ProgressiveGenerationProps {
  isGenerating: boolean
  onComplete?: () => void
  totalEstimatedTime?: number
}

export function ProgressiveGeneration({ 
  isGenerating, 
  onComplete,
  totalEstimatedTime = 45 
}: ProgressiveGenerationProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)
  
  useEffect(() => {
    if (!isGenerating) {
      setCurrentStepIndex(0)
      setProgress(0)
      setElapsedTime(0)
      return
    }
    
    const startTime = Date.now()
    const interval = setInterval(() => {
      const now = Date.now()
      const elapsed = (now - startTime) / 1000
      setElapsedTime(elapsed)
      
      // Calculate progress based on elapsed time and estimated total time
      const progressPercentage = Math.min((elapsed / totalEstimatedTime) * 100, 95)
      setProgress(progressPercentage)
      
      // Determine current step based on elapsed time
      let accumulatedTime = 0
      let stepIndex = 0
      
      for (let i = 0; i < generationSteps.length; i++) {
        accumulatedTime += generationSteps[i].estimatedTime
        if (elapsed < accumulatedTime) {
          stepIndex = i
          break
        }
        stepIndex = generationSteps.length - 1
      }
      
      setCurrentStepIndex(stepIndex)
      
      // Auto-complete after reasonable time
      if (elapsed > totalEstimatedTime + 10) {
        setProgress(100)
        setCurrentStepIndex(generationSteps.length - 1)
        onComplete?.()
      }
    }, 500) // Update every 500ms for smooth animation
    
    return () => clearInterval(interval)
  }, [isGenerating, totalEstimatedTime, onComplete])
  
  if (!isGenerating) return null
  
  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50">
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center space-x-2">
              <Sparkles className="h-6 w-6 text-blue-500 animate-pulse" />
              <h3 className="text-lg font-semibold text-blue-900">
                AI 正在生成您的开发计划
              </h3>
            </div>
            <p className="text-sm text-blue-700">
              预计用时 {totalEstimatedTime} 秒 · 已耗时 {Math.round(elapsedTime)} 秒
            </p>
          </div>
          
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-700">进度</span>
              <span className="text-blue-600 font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2 bg-blue-100" />
          </div>
          
          {/* Steps */}
          <div className="space-y-3">
            {generationSteps.map((step, index) => {
              const isActive = index === currentStepIndex
              const isCompleted = index < currentStepIndex
              const isPending = index > currentStepIndex
              
              return (
                <div
                  key={step.id}
                  className={cn(
                    "flex items-start space-x-3 p-3 rounded-lg transition-all duration-300",
                    isActive && "bg-blue-100 border border-blue-200",
                    isCompleted && "bg-green-50 border border-green-200",
                    isPending && "bg-gray-50 opacity-60"
                  )}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {isCompleted && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                    {isActive && (
                      <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                    )}
                    {isPending && (
                      <Circle className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className={cn(
                      "text-sm font-medium",
                      isActive && "text-blue-900",
                      isCompleted && "text-green-900",
                      isPending && "text-gray-500"
                    )}>
                      {step.label}
                    </h4>
                    <p className={cn(
                      "text-xs mt-1",
                      isActive && "text-blue-700",
                      isCompleted && "text-green-700",
                      isPending && "text-gray-400"
                    )}>
                      {step.description}
                    </p>
                  </div>
                  
                  {isActive && (
                    <div className="flex-shrink-0">
                      <div className="flex items-center space-x-1">
                        {[0, 1, 2].map((i) => (
                          <div
                            key={i}
                            className="w-1 h-1 bg-blue-400 rounded-full animate-pulse"
                            style={{ animationDelay: `${i * 0.2}s` }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          
          {/* Tips */}
          <div className="bg-blue-100 rounded-lg p-3">
            <p className="text-xs text-blue-700 text-center">
              💡 小提示：生成过程中请保持页面打开，系统正在为您精心制作个性化方案
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}