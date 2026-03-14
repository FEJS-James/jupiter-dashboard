'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Clock, TrendingUp, Users, FolderOpen, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/contexts/theme-context'

interface OverviewCardsProps {
  data: {
    totalTasks: number
    completedTasks: number
    inProgressTasks: number
    completionRate: number
    avgCompletionTime: number
    activeProjects: number
    activeAgents: number
  }
}

export function OverviewCards({ data }: OverviewCardsProps) {
  const { actualTheme } = useTheme()

  const cards = [
    {
      title: 'Total Tasks',
      value: data.totalTasks,
      icon: Activity,
      color: 'text-blue-500',
      bgColor: actualTheme === 'dark' ? 'bg-blue-500/10' : 'bg-blue-50',
      change: null
    },
    {
      title: 'Completed Tasks',
      value: data.completedTasks,
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: actualTheme === 'dark' ? 'bg-green-500/10' : 'bg-green-50',
      change: null
    },
    {
      title: 'In Progress',
      value: data.inProgressTasks,
      icon: Clock,
      color: 'text-yellow-500',
      bgColor: actualTheme === 'dark' ? 'bg-yellow-500/10' : 'bg-yellow-50',
      change: null
    },
    {
      title: 'Completion Rate',
      value: `${data.completionRate}%`,
      icon: TrendingUp,
      color: data.completionRate >= 70 ? 'text-green-500' : data.completionRate >= 50 ? 'text-yellow-500' : 'text-red-500',
      bgColor: data.completionRate >= 70 
        ? (actualTheme === 'dark' ? 'bg-green-500/10' : 'bg-green-50')
        : data.completionRate >= 50 
        ? (actualTheme === 'dark' ? 'bg-yellow-500/10' : 'bg-yellow-50')
        : (actualTheme === 'dark' ? 'bg-red-500/10' : 'bg-red-50'),
      change: null
    },
    {
      title: 'Avg Completion Time',
      value: `${data.avgCompletionTime} days`,
      icon: Clock,
      color: data.avgCompletionTime <= 3 ? 'text-green-500' : data.avgCompletionTime <= 7 ? 'text-yellow-500' : 'text-red-500',
      bgColor: data.avgCompletionTime <= 3
        ? (actualTheme === 'dark' ? 'bg-green-500/10' : 'bg-green-50')
        : data.avgCompletionTime <= 7
        ? (actualTheme === 'dark' ? 'bg-yellow-500/10' : 'bg-yellow-50')
        : (actualTheme === 'dark' ? 'bg-red-500/10' : 'bg-red-50'),
      change: null
    },
    {
      title: 'Active Projects',
      value: data.activeProjects,
      icon: FolderOpen,
      color: 'text-purple-500',
      bgColor: actualTheme === 'dark' ? 'bg-purple-500/10' : 'bg-purple-50',
      change: null
    },
    {
      title: 'Active Agents',
      value: data.activeAgents,
      icon: Users,
      color: 'text-indigo-500',
      bgColor: actualTheme === 'dark' ? 'bg-indigo-500/10' : 'bg-indigo-50',
      change: null
    }
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon
        
        return (
          <Card 
            key={card.title}
            className={cn(
              'transition-all duration-200 hover:shadow-md',
              actualTheme === 'dark' 
                ? 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800/70' 
                : 'bg-white border-slate-200 hover:bg-slate-50'
            )}
          >
            <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
              <div className="flex items-center justify-between">
                <div className={cn('p-1.5 sm:p-2 rounded-lg', card.bgColor)}>
                  <Icon className={cn('h-3.5 w-3.5 sm:h-4 sm:w-4', card.color)} />
                </div>
              </div>
              <CardTitle className={cn(
                'text-xs sm:text-sm font-medium truncate',
                actualTheme === 'dark' ? 'text-slate-300' : 'text-slate-600'
              )}>
                {card.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="flex items-baseline space-x-1 sm:space-x-2">
                <div className={cn(
                  'text-lg sm:text-2xl font-bold',
                  actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
                )}>
                  {card.value}
                </div>
                {card.change && (
                  <Badge variant="secondary" className="text-xs">
                    {card.change}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}