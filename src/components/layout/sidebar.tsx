'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  ChevronLeft,
  Home,
  Layers,
  Users,
  BarChart3,
  Settings,
  ChevronDown,
  Circle,
  FolderOpen,
  CheckSquare
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/contexts/theme-context'

interface SidebarProps {
  className?: string
  onCollapseChange?: (collapsed: boolean) => void
}

export function Sidebar({ className, onCollapseChange }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { actualTheme } = useTheme()

  const toggleCollapse = () => {
    const newCollapsedState = !isCollapsed
    setIsCollapsed(newCollapsedState)
    onCollapseChange?.(newCollapsedState)
  }
  const [selectedProject, setSelectedProject] = useState('AgentFlow Pipeline')

  const navigationItems = [
    { icon: Home, label: 'Dashboard', href: '/', active: false },
    { icon: CheckSquare, label: 'Tasks', href: '/tasks', active: true },
    { icon: Layers, label: 'Projects', href: '/projects' },
    { icon: Users, label: 'Agents', href: '/agents' },
    { icon: BarChart3, label: 'Analytics', href: '/analytics' },
    { icon: Settings, label: 'Preferences', href: '/preferences' },
  ]

  const projects = [
    'AgentFlow Pipeline',
    'Web Scraper Pro', 
    'ChatBot Assistant',
    'Data Analytics Suite'
  ]

  const agents = [
    { name: 'Coder', status: 'active', tasks: 2 },
    { name: 'Reviewer', status: 'idle', tasks: 0 },
    { name: 'DevOps', status: 'busy', tasks: 1 },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500'
      case 'busy': return 'bg-yellow-500'
      case 'idle': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <motion.div
      className={cn(
        'fixed left-0 top-0 h-full backdrop-blur-xl border-r z-40 transition-all duration-300 ease-in-out',
        actualTheme === 'dark' 
          ? 'bg-slate-900/95 border-slate-700/50' 
          : 'bg-white/95 border-slate-200/50',
        isCollapsed ? 'w-16' : 'w-[280px]',
        className
      )}
      animate={{ width: isCollapsed ? 64 : 280 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      <div className="flex h-full flex-col">
        {/* Header with collapse toggle */}
        <div className={cn(
          'flex h-16 items-center justify-between px-4 border-b',
          actualTheme === 'dark' ? 'border-slate-700/50' : 'border-slate-200/50'
        )}>
          {!isCollapsed && (
            <motion.h1 
              className={cn(
                'text-lg font-semibold',
                actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
              )}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              AgentFlow
            </motion.h1>
          )}
          <button
            onClick={toggleCollapse}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              actualTheme === 'dark' 
                ? 'hover:bg-slate-800/50' 
                : 'hover:bg-slate-100/50'
            )}
          >
            <ChevronLeft 
              className={cn(
                'h-4 w-4 transition-transform duration-300',
                actualTheme === 'dark' ? 'text-slate-400' : 'text-slate-600',
                isCollapsed && 'rotate-180'
              )}
            />
          </button>
        </div>

        {/* Project Selector */}
        {!isCollapsed && (
          <motion.div 
            className={cn(
              'p-4 border-b',
              actualTheme === 'dark' ? 'border-slate-700/50' : 'border-slate-200/50'
            )}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="relative">
              <button className={cn(
                'w-full flex items-center justify-between p-3 rounded-lg transition-colors group',
                actualTheme === 'dark'
                  ? 'bg-slate-800/50 hover:bg-slate-800/70'
                  : 'bg-slate-100/50 hover:bg-slate-100/70'
              )}>
                <div className="flex items-center space-x-3">
                  <FolderOpen className="h-4 w-4 text-blue-400" />
                  <span className={cn(
                    'text-sm font-medium truncate',
                    actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
                  )}>
                    {selectedProject}
                  </span>
                </div>
                <ChevronDown className={cn(
                  'h-4 w-4 transition-colors',
                  actualTheme === 'dark' 
                    ? 'text-slate-400 group-hover:text-slate-300' 
                    : 'text-slate-600 group-hover:text-slate-700'
                )} />
              </button>
            </div>
          </motion.div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navigationItems.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * (index + 2) }}
            >
              <button
                className={cn(
                  'w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                  item.active
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : actualTheme === 'dark'
                      ? 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
                )}
              >
                <item.icon className={cn('h-5 w-5 flex-shrink-0', isCollapsed ? 'mx-auto' : '')} />
                {!isCollapsed && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
              </button>
            </motion.div>
          ))}
        </nav>

        {/* Agent Status */}
        <motion.div 
          className={cn(
            'p-4 border-t',
            actualTheme === 'dark' ? 'border-slate-700/50' : 'border-slate-200/50'
          )}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {!isCollapsed ? (
            <div className="space-y-3">
              <h3 className={cn(
                'text-xs font-semibold uppercase tracking-wider',
                actualTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'
              )}>
                Agent Status
              </h3>
              {agents.map((agent) => (
                <div key={agent.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={cn('h-2 w-2 rounded-full', getStatusColor(agent.status))} />
                    <span className={cn(
                      'text-sm',
                      actualTheme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    )}>{agent.name}</span>
                  </div>
                  {agent.tasks > 0 && (
                    <span className={cn(
                      'text-xs px-1.5 py-0.5 rounded',
                      actualTheme === 'dark' 
                        ? 'bg-slate-700 text-slate-300' 
                        : 'bg-slate-200 text-slate-700'
                    )}>
                      {agent.tasks}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {agents.map((agent) => (
                <div key={agent.name} className="flex justify-center">
                  <div className={cn('h-2 w-2 rounded-full', getStatusColor(agent.status))} />
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  )
}