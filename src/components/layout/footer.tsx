'use client'

import { motion } from 'framer-motion'
import { 
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  Layers
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/contexts/theme-context'

interface FooterProps {
  className?: string
  sidebarCollapsed?: boolean
}

export function Footer({ className, sidebarCollapsed = false }: FooterProps) {
  const { actualTheme } = useTheme()
  const pipelineStats = {
    total: 24,
    inProgress: 8,
    completed: 14,
    failed: 2
  }

  const systemStats = {
    activeAgents: 3,
    totalAgents: 5,
    tasksInProgress: 8,
    uptime: '2d 14h 32m'
  }

  const getProgressPercentage = () => {
    return (pipelineStats.completed / pipelineStats.total) * 100
  }

  return (
    <motion.footer
      className={cn(
        'fixed bottom-0 right-0 h-12 backdrop-blur-xl border-t z-30 transition-all duration-300',
        actualTheme === 'dark' 
          ? 'bg-slate-900/95 border-slate-700/50' 
          : 'bg-white/95 border-slate-200/50',
        sidebarCollapsed ? 'left-16' : 'left-[280px]',
        className
      )}
      animate={{ 
        left: sidebarCollapsed ? 64 : 280 
      }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      <div className="flex h-full items-center justify-between px-6">
        {/* Pipeline Status */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
            <Activity className="h-4 w-4 text-blue-400" />
            <span className={cn(
              'text-xs font-medium',
              actualTheme === 'dark' ? 'text-slate-300' : 'text-slate-700'
            )}>Pipeline Status</span>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Progress Bar */}
            <div className="flex items-center space-x-2">
              <div className={cn(
                'w-20 h-1.5 rounded-full overflow-hidden',
                actualTheme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'
              )}>
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${getProgressPercentage()}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
              <span className={cn(
                'text-xs',
                actualTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'
              )}>
                {Math.round(getProgressPercentage())}%
              </span>
            </div>

            {/* Pipeline Stats */}
            <div className="flex items-center space-x-3 text-xs">
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3 text-yellow-400" />
                <span className={cn(
                  actualTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                )}>{pipelineStats.inProgress}</span>
              </div>
              <div className="flex items-center space-x-1">
                <CheckCircle className="h-3 w-3 text-green-400" />
                <span className={cn(
                  actualTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                )}>{pipelineStats.completed}</span>
              </div>
              <div className="flex items-center space-x-1">
                <AlertCircle className="h-3 w-3 text-red-400" />
                <span className={cn(
                  actualTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                )}>{pipelineStats.failed}</span>
              </div>
            </div>
          </div>
        </div>

        {/* System Stats */}
        <div className="flex items-center space-x-6">
          <div className={cn(
            'flex items-center space-x-4 text-xs',
            actualTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'
          )}>
            <div className="flex items-center space-x-1">
              <Users className="h-3 w-3 text-blue-400" />
              <span>
                {systemStats.activeAgents}/{systemStats.totalAgents} Agents
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <Layers className="h-3 w-3 text-green-400" />
              <span>{systemStats.tasksInProgress} Tasks</span>
            </div>
            <div className={cn(
              actualTheme === 'dark' ? 'text-slate-500' : 'text-slate-600'
            )}>
              Uptime: {systemStats.uptime}
            </div>
          </div>

          {/* System Status Indicator */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <motion.div
                className="h-2 w-2 bg-green-400 rounded-full"
                animate={{ 
                  opacity: [1, 0.3, 1],
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity,
                  ease: 'easeInOut' 
                }}
              />
              <span className={cn(
                'text-xs',
                actualTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'
              )}>System Operational</span>
            </div>
          </div>
        </div>
      </div>
    </motion.footer>
  )
}