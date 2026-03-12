'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Search,
  Plus,
  Bell,
  User,
  ChevronRight,
  Command
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface HeaderProps {
  className?: string
  sidebarCollapsed?: boolean
}

export function Header({ className, sidebarCollapsed = false }: HeaderProps) {
  const [searchFocused, setSearchFocused] = useState(false)
  
  const breadcrumbs = [
    { label: 'Dashboard', href: '/' },
    { label: 'Projects', href: '/projects' },
    { label: 'AgentFlow Pipeline', href: '/projects/agentflow' }
  ]

  return (
    <motion.header
      className={cn(
        'fixed top-0 right-0 h-16 bg-slate-900/95 backdrop-blur-xl border-b border-slate-700/50 z-30 transition-all duration-300',
        sidebarCollapsed ? 'left-16' : 'left-[280px]',
        className
      )}
      animate={{ 
        left: sidebarCollapsed ? 64 : 280 
      }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      <div className="flex h-full items-center justify-between px-6">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center space-x-2">
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.label} className="flex items-center space-x-2">
              {index > 0 && (
                <ChevronRight className="h-4 w-4 text-slate-500" />
              )}
              <button
                className={cn(
                  'text-sm transition-colors',
                  index === breadcrumbs.length - 1
                    ? 'text-white font-medium'
                    : 'text-slate-400 hover:text-slate-300'
                )}
              >
                {crumb.label}
              </button>
            </div>
          ))}
        </div>

        {/* Center Section - Global Search */}
        <div className="flex-1 max-w-md mx-8">
          <div 
            className={cn(
              'relative transition-all duration-200',
              searchFocused && 'scale-105'
            )}
          >
            <div className="absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search projects, tasks, agents..."
              className="w-full pl-10 pr-16 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <kbd className="inline-flex items-center px-2 py-1 text-xs font-mono text-slate-400 bg-slate-700/50 rounded border border-slate-600">
                <Command className="h-3 w-3 mr-1" />
                K
              </kbd>
            </div>
          </div>
        </div>

        {/* Right Section - Actions & User */}
        <div className="flex items-center space-x-3">
          {/* Quick Actions */}
          <motion.button
            className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Plus className="h-4 w-4" />
          </motion.button>

          {/* Notifications */}
          <motion.button 
            className="relative p-2 rounded-lg hover:bg-slate-800/50 transition-colors group"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Bell className="h-5 w-5 text-slate-400 group-hover:text-slate-300" />
            {/* Notification dot */}
            <div className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full" />
          </motion.button>

          {/* Divider */}
          <div className="h-6 w-px bg-slate-700/50" />

          {/* User Menu */}
          <motion.button 
            className="flex items-center space-x-2 p-2 rounded-lg hover:bg-slate-800/50 transition-colors group"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-sm font-medium text-white">James</div>
              <div className="text-xs text-slate-400">Admin</div>
            </div>
          </motion.button>
        </div>
      </div>
    </motion.header>
  )
}