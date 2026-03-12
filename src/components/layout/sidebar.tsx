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
  FolderOpen
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  className?: string
  onCollapseChange?: (collapsed: boolean) => void
}

export function Sidebar({ className, onCollapseChange }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const toggleCollapse = () => {
    const newCollapsedState = !isCollapsed
    setIsCollapsed(newCollapsedState)
    onCollapseChange?.(newCollapsedState)
  }
  const [selectedProject, setSelectedProject] = useState('AgentFlow Pipeline')

  const navigationItems = [
    { icon: Home, label: 'Dashboard', href: '/', active: true },
    { icon: Layers, label: 'Projects', href: '/projects' },
    { icon: Users, label: 'Agents', href: '/agents' },
    { icon: BarChart3, label: 'Analytics', href: '/analytics' },
    { icon: Settings, label: 'Settings', href: '/settings' },
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
        'fixed left-0 top-0 h-full bg-slate-900/95 backdrop-blur-xl border-r border-slate-700/50 z-40 transition-all duration-300 ease-in-out',
        isCollapsed ? 'w-16' : 'w-[280px]',
        className
      )}
      animate={{ width: isCollapsed ? 64 : 280 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      <div className="flex h-full flex-col">
        {/* Header with collapse toggle */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-slate-700/50">
          {!isCollapsed && (
            <motion.h1 
              className="text-lg font-semibold text-white"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              AgentFlow
            </motion.h1>
          )}
          <button
            onClick={toggleCollapse}
            className="p-1.5 rounded-lg hover:bg-slate-800/50 transition-colors"
          >
            <ChevronLeft 
              className={cn(
                'h-4 w-4 text-slate-400 transition-transform duration-300',
                isCollapsed && 'rotate-180'
              )}
            />
          </button>
        </div>

        {/* Project Selector */}
        {!isCollapsed && (
          <motion.div 
            className="p-4 border-b border-slate-700/50"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="relative">
              <button className="w-full flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800/70 transition-colors group">
                <div className="flex items-center space-x-3">
                  <FolderOpen className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-medium text-white truncate">
                    {selectedProject}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 text-slate-400 group-hover:text-slate-300" />
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
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
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
          className="p-4 border-t border-slate-700/50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {!isCollapsed ? (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Agent Status
              </h3>
              {agents.map((agent) => (
                <div key={agent.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={cn('h-2 w-2 rounded-full', getStatusColor(agent.status))} />
                    <span className="text-sm text-slate-300">{agent.name}</span>
                  </div>
                  {agent.tasks > 0 && (
                    <span className="text-xs bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">
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