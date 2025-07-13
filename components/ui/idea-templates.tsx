'use client'

import React, { useState } from 'react'
import { Lightbulb, Code, ShoppingCart, Users, MessageSquare, Calendar, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ExampleTemplate {
  id: string
  category: string
  title: string
  description: string
  example: string
  icon: React.ComponentType<{ className?: string }>
  tags: string[]
}

const exampleTemplates: ExampleTemplate[] = [
  {
    id: 'dev-tool',
    category: '开发工具',
    title: 'AI编程助手',
    description: '帮助开发者提高编程效率的工具',
    example: '我想做一个基于AI的代码生成工具，可以根据自然语言描述自动生成代码，支持多种编程语言，并提供代码解释和优化建议。目标是让初学者和有经验的开发者都能受益。',
    icon: Code,
    tags: ['AI', '开发工具', '代码生成']
  },
  {
    id: 'ecommerce',
    category: '电商平台',
    title: '智能购物助手',
    description: '为用户提供个性化购物体验',
    example: '我想开发一个智能电商平台，能够根据用户的购买历史和偏好推荐产品，集成AR试穿功能，并提供实时客服和AI购物顾问。希望创建一个新一代的购物体验。',
    icon: ShoppingCart,
    tags: ['电商', 'AI推荐', 'AR技术']
  },
  {
    id: 'social',
    category: '社交应用',
    title: '专业交流平台',
    description: '连接同领域专业人士',
    example: '我想打造一个面向技术人员的专业社交平台，类似于技术版的LinkedIn。用户可以分享技术文章、参与开源项目、组织技术讲座，并通过AI匹配找到合适的合作伙伴和工作机会。',
    icon: Users,
    tags: ['社交网络', '技术交流', 'AI匹配']
  },
  {
    id: 'productivity',
    category: '效率工具',
    title: '智能日程管理',
    description: '提高个人和团队效率',
    example: '我计划开发一个智能日程管理应用，结合AI来智能分析用户的工作习惯，自动优化时间安排，提供个性化的效率建议。包括番茄钟技术、专注模式和团队协作功能。',
    icon: Calendar,
    tags: ['效率管理', 'AI优化', '团队协作']
  },
  {
    id: 'health',
    category: '健康科技',
    title: 'AI健康助手',
    description: '个性化健康管理和建议',
    example: '我希望建立一个基于AI的个人健康管理平台，能够跟踪用户的运动、饮食、睡眠等数据，提供个性化的健康建议和警报。同时能在用户授权下与医生共享数据。',
    icon: Zap,
    tags: ['健康管理', 'AI分析', '智能硬件']
  },
  {
    id: 'content',
    category: '内容创作',
    title: 'AI内容创作平台',
    description: '帮助创作者提高创作效率',
    example: '我想做一个面向内容创作者的AI辅助平台，支持文章写作、视频脚本生成、图片设计等多种内容形式。提供内容灵感、SEO优化、多平台发布等功能，让创作者专注于创意本身。',
    icon: MessageSquare,
    tags: ['内容创作', 'AI写作', 'SEO优化']
  }
]

interface IdeaTemplatesProps {
  onTemplateSelect: (template: string) => void
  onClose: () => void
}

export function IdeaTemplates({ onTemplateSelect, onClose }: IdeaTemplatesProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const categories = [...new Set(exampleTemplates.map(t => t.category))]
  const filteredTemplates = selectedCategory 
    ? exampleTemplates.filter(t => t.category === selectedCategory)
    : exampleTemplates

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          <h3 className="text-lg font-semibold">创意灵感</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          关闭
        </Button>
      </div>
      
      <p className="text-sm text-muted-foreground">
        选择一个示例模板，快速开始您的项目规划
      </p>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedCategory === null ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedCategory(null)}
        >
          全部
        </Button>
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </Button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid gap-3 max-h-64 overflow-y-auto">
        {filteredTemplates.map((template) => {
          const Icon = template.icon
          return (
            <Card 
              key={template.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => {
                onTemplateSelect(template.example)
                onClose()
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <Icon className="h-6 w-6 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-medium text-gray-900">
                        {template.title}
                      </h4>
                      <Badge variant="secondary" className="text-xs">
                        {template.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">
                      {template.description}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {template.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}