'use client'

import React from 'react'
import { HelpCircle, Target, Users, Wrench, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface InputGuideProps {
  currentText: string
  onSuggestionApply: (suggestion: string) => void
}

interface GuideTip {
  id: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  suggestions: string[]
  trigger: string[]
}

const guideTips: GuideTip[] = [
  {
    id: 'problem',
    icon: Target,
    title: '问题描述',
    description: '说明您要解决的问题或痛点',
    suggestions: [
      '目前市面上的解决方案存在...问题',
      '用户在...方面遇到困难',
      '现有工具不能满足...需求'
    ],
    trigger: ['问题', '痛点', '困难', '不便']
  },
  {
    id: 'target-users',
    icon: Users,
    title: '目标用户',
    description: '明确您的产品面向的用户群体',
    suggestions: [
      '主要面向...的个人用户',
      '为...行业的专业人士设计',
      '适用于...规模的企业团队'
    ],
    trigger: ['用户', '人群', '对象', '客户']
  },
  {
    id: 'features',
    icon: Wrench,
    title: '功能特性',
    description: '描述产品的核心功能和特性',
    suggestions: [
      '支持...功能，并提供...特性',
      '集成...技术，实现...体验',
      '具备...的智能分析能力'
    ],
    trigger: ['功能', '特性', '能力', '支持']
  },
  {
    id: 'innovation',
    icon: TrendingUp,
    title: '创新亮点',
    description: '突出您产品的独特之处',
    suggestions: [
      '与现有产品不同，我们...',
      '利用最新的...技术实现...',
      '首创的...模式，提供前所未有的...'
    ],
    trigger: ['创新', '独特', '首创', '不同']
  }
]

export function InputGuide({ currentText, onSuggestionApply }: InputGuideProps) {
  const text = currentText.toLowerCase()
  
  // 检查当前文本中缺少哪些内容
  const missingTips = guideTips.filter(tip => 
    !tip.trigger.some(trigger => text.includes(trigger))
  )
  
  const hasContent = currentText.length > 20
  const needsImprovement = currentText.length > 0 && currentText.length < 50
  
  if (!hasContent && missingTips.length === guideTips.length) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <HelpCircle className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-900 mb-2">
                如何描述您的想法？
              </h4>
              <p className="text-sm text-blue-700 mb-3">
                一个好的产品想法应该包含以下要素：
              </p>
              <div className="space-y-2">
                {guideTips.map((tip) => {
                  const Icon = tip.icon
                  return (
                    <div key={tip.id} className="flex items-center space-x-2">
                      <Icon className="h-4 w-4 text-blue-500" />
                      <span className="text-sm text-blue-700">{tip.title}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  if (needsImprovement || missingTips.length > 0) {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <HelpCircle className="h-5 w-5 text-orange-500 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-orange-900 mb-2">
                {needsImprovement ? '建议添加更多细节' : '可以补充的内容'}
              </h4>
              
              {missingTips.length > 0 && (
                <div className="space-y-3">
                  {missingTips.slice(0, 2).map((tip) => {
                    const Icon = tip.icon
                    return (
                      <div key={tip.id} className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Icon className="h-4 w-4 text-orange-500" />
                          <span className="text-sm font-medium text-orange-900">{tip.title}</span>
                          <Badge variant="outline" className="text-xs">
                            {tip.description}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1 ml-6">
                          {tip.suggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              onClick={() => {
                                const newText = currentText + (currentText.endsWith('。') || currentText.endsWith('、') || currentText === '' ? '' : '，') + suggestion
                                onSuggestionApply(newText)
                              }}
                              className="text-xs bg-white border border-orange-200 px-2 py-1 rounded hover:bg-orange-100 transition-colors"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  // 内容质量较好时的鼓励信息
  return (
    <Card className="border-green-200 bg-green-50">
      <CardContent className="p-3">
        <div className="flex items-center space-x-2">
          <div className="h-2 w-2 bg-green-500 rounded-full"></div>
          <span className="text-sm text-green-700">
            很好！您的想法描述很详细，点击“AI生成计划”开始吧
          </span>
        </div>
      </CardContent>
    </Card>
  )
}