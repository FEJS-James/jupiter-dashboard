'use client'

import { motion } from 'framer-motion'
import { 
  Home,
  CheckSquare,
  Layers,
  Users,
  BarChart3,
  Plus
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/contexts/theme-context'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

export function MobileBottomNav() {
  const { actualTheme } = useTheme()
  const pathname = usePathname()
  const [showFAB, setShowFAB] = useState(false)

  const navigationItems = [
    { icon: Home, label: 'Home', href: '/', active: pathname === '/' },
    { icon: CheckSquare, label: 'Tasks', href: '/tasks', active: pathname === '/tasks' },
    { icon: Layers, label: 'Projects', href: '/projects', active: pathname.startsWith('/projects') },
    { icon: Users, label: 'Agents', href: '/agents', active: pathname.startsWith('/agents') },
    { icon: BarChart3, label: 'Analytics', href: '/analytics', active: pathname.startsWith('/analytics') },
  ]

  const quickActions = [
    { icon: CheckSquare, label: 'New Task', action: () => console.log('Create task') },
    { icon: Layers, label: 'New Project', action: () => console.log('Create project') },
    { icon: Users, label: 'New Agent', action: () => console.log('Create agent') },
  ]

  return (
    <>
      {/* Floating Action Button */}
      <motion.div
        className="fixed bottom-20 right-4 z-30"
        initial={false}
        animate={{
          scale: showFAB ? 1 : 0,
          opacity: showFAB ? 1 : 0,
        }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <div className="space-y-2">
          {quickActions.map((action, index) => (
            <motion.button
              key={action.label}
              className={cn(
                'flex items-center space-x-2 px-4 py-3 rounded-full shadow-lg backdrop-blur-md',
                actualTheme === 'dark'
                  ? 'bg-slate-800/90 border border-slate-700/50 text-slate-200'
                  : 'bg-white/90 border border-slate-200/50 text-slate-700'
              )}
              onClick={action.action}
              initial={{ scale: 0, x: 20 }}
              animate={{ scale: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <action.icon className="h-4 w-4" />
              <span className="text-sm font-medium">{action.label}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Bottom Navigation Bar */}
      <motion.div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-20 backdrop-blur-xl border-t',
          actualTheme === 'dark' 
            ? 'bg-slate-900/95 border-slate-700/50' 
            : 'bg-white/95 border-slate-200/50'
        )}
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <div className="flex items-center justify-between px-2 py-2">
          {/* Navigation Items */}
          <div className="flex flex-1 justify-around">
            {navigationItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 min-w-[60px]',
                  item.active
                    ? 'bg-blue-600/20 text-blue-400'
                    : actualTheme === 'dark'
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
                )}
              >
                <item.icon className={cn(
                  'h-5 w-5 mb-1 transition-transform',
                  item.active && 'scale-110'
                )} />
                <span className={cn(
                  'text-xs font-medium',
                  item.active ? 'text-blue-400' : ''
                )}>
                  {item.label}
                </span>
              </Link>
            ))}
          </div>

          {/* Floating Action Button */}
          <motion.button
            className={cn(
              'p-4 rounded-full ml-2 shadow-lg transition-colors',
              showFAB 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-blue-600 hover:bg-blue-700'
            )}
            onClick={() => setShowFAB(!showFAB)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            animate={{ rotate: showFAB ? 45 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <Plus className="h-6 w-6 text-white" />
          </motion.button>
        </div>

        {/* Safe area padding for devices with home indicator */}
        <div className="pb-safe" />
      </motion.div>
    </>
  )
}