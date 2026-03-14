'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useCallback } from 'react'
import { 
  Home,
  CheckSquare,
  Layers,
  Users,
  BarChart3,
  Settings,
  X,
  ChevronDown,
  FolderOpen,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/contexts/theme-context'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSidebarData } from '@/hooks/use-sidebar-data'
import { useProjectContext } from '@/contexts/project-context'

interface MobileSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const { actualTheme } = useTheme()
  const pathname = usePathname()
  const router = useRouter()
  const { projects, agents, loading } = useSidebarData()
  const { selectedProjectId, setSelectedProjectId } = useProjectContext()
  const [showProjects, setShowProjects] = useState(false)

  // Explicit navigation handler — bypasses <Link> internal click handling
  // to work around silent client-side navigation failures.
  const handleNavClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    e.preventDefault()
    onClose()
    router.push(href)
  }, [router, onClose])

  // Derive selected project — default to first project from API
  const selectedProject = projects.find(p => p.id === selectedProjectId) ?? projects[0] ?? null

  const navigationItems = [
    { icon: Home, label: 'Dashboard', href: '/', active: pathname === '/' },
    { icon: CheckSquare, label: 'Tasks', href: '/tasks', active: pathname === '/tasks' },
    { icon: Layers, label: 'Projects', href: '/projects', active: pathname.startsWith('/projects') },
    { icon: Users, label: 'Agents', href: '/agents', active: pathname.startsWith('/agents') },
    { icon: BarChart3, label: 'Analytics', href: '/analytics', active: pathname.startsWith('/analytics') },
    { icon: Settings, label: 'Preferences', href: '/preferences', active: pathname.startsWith('/preferences') },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500'
      case 'busy': return 'bg-yellow-500'
      case 'offline': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  // Lock body scroll when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ 
              type: 'spring',
              damping: 25,
              stiffness: 300,
              duration: 0.3 
            }}
            className={cn(
              'fixed left-0 top-0 h-full w-80 max-w-[85vw] z-50 backdrop-blur-xl border-r',
              actualTheme === 'dark' 
                ? 'bg-slate-900/95 border-slate-700/50' 
                : 'bg-white/95 border-slate-200/50'
            )}
            data-mobile-sidebar="true"
          >
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className={cn(
                'flex h-16 items-center justify-between px-6 border-b',
                actualTheme === 'dark' ? 'border-slate-700/50' : 'border-slate-200/50'
              )}>
                <h1 className={cn(
                  'text-xl font-bold',
                  actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
                )}>
                  AgentFlow
                </h1>
                <button
                  onClick={onClose}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    actualTheme === 'dark' 
                      ? 'hover:bg-slate-800/50 text-slate-400' 
                      : 'hover:bg-slate-100/50 text-slate-600'
                  )}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Project Selector */}
              <div className={cn(
                'p-4 border-b',
                actualTheme === 'dark' ? 'border-slate-700/50' : 'border-slate-200/50'
              )}>
                {loading ? (
                  <div className={cn(
                    'flex items-center space-x-3 p-3 rounded-lg',
                    actualTheme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-100/50'
                  )}>
                    <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
                    <span className={cn(
                      'text-sm',
                      actualTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                    )}>Loading projects…</span>
                  </div>
                ) : projects.length === 0 ? (
                  <div className={cn(
                    'flex items-center space-x-3 p-3 rounded-lg',
                    actualTheme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-100/50'
                  )}>
                    <FolderOpen className="h-5 w-5 text-slate-400" />
                    <span className={cn(
                      'text-sm',
                      actualTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                    )}>No projects yet</span>
                  </div>
                ) : (
                  <>
                    <button 
                      className={cn(
                        'w-full flex items-center justify-between p-3 rounded-lg transition-colors',
                        actualTheme === 'dark'
                          ? 'bg-slate-800/50 hover:bg-slate-800/70'
                          : 'bg-slate-100/50 hover:bg-slate-100/70'
                      )}
                      onClick={() => setShowProjects(!showProjects)}
                    >
                      <div className="flex items-center space-x-3">
                        <FolderOpen className="h-5 w-5 text-blue-400" />
                        <span className={cn(
                          'text-sm font-medium truncate',
                          actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
                        )}>
                          {selectedProject?.name ?? 'All Projects'}
                        </span>
                      </div>
                      <ChevronDown className={cn(
                        'h-4 w-4 transition-transform',
                        actualTheme === 'dark' ? 'text-slate-400' : 'text-slate-600',
                        showProjects && 'rotate-180'
                      )} />
                    </button>

                    {/* Project List */}
                    <AnimatePresence>
                      {showProjects && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-2 space-y-1"
                        >
                          {/* "All Projects" option */}
                          <button
                            className={cn(
                              'w-full text-left px-3 py-2 rounded text-sm transition-colors',
                              selectedProjectId === null
                                ? 'bg-blue-600/20 text-blue-400'
                                : actualTheme === 'dark'
                                  ? 'text-slate-300 hover:bg-slate-800/50'
                                  : 'text-slate-700 hover:bg-slate-100/50'
                            )}
                            onClick={() => {
                              setSelectedProjectId(null)
                              setShowProjects(false)
                            }}
                          >
                            All Projects
                          </button>
                          {projects.map((project) => (
                            <button
                              key={project.id}
                              className={cn(
                                'w-full text-left px-3 py-2 rounded text-sm transition-colors',
                                project.id === selectedProjectId
                                  ? 'bg-blue-600/20 text-blue-400'
                                  : actualTheme === 'dark'
                                    ? 'text-slate-300 hover:bg-slate-800/50'
                                    : 'text-slate-700 hover:bg-slate-100/50'
                              )}
                              onClick={() => {
                                setSelectedProjectId(project.id)
                                setShowProjects(false)
                              }}
                            >
                              {project.name}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </div>

              {/* Navigation */}
              <nav className="flex-1 p-4 space-y-2">
                {navigationItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={(e) => handleNavClick(e, item.href)}
                    className={cn(
                      'w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 text-base',
                      item.active
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                        : actualTheme === 'dark'
                          ? 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                          : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/50'
                    )}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                ))}
              </nav>

              {/* Agent Status */}
              <div className={cn(
                'p-4 border-t',
                actualTheme === 'dark' ? 'border-slate-700/50' : 'border-slate-200/50'
              )}>
                <h3 className={cn(
                  'text-xs font-semibold uppercase tracking-wider mb-3',
                  actualTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                )}>
                  Agent Status
                </h3>
                <div className="space-y-3">
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <Loader2 className={cn('h-3 w-3 animate-spin', actualTheme === 'dark' ? 'text-slate-500' : 'text-slate-400')} />
                      <span className={cn('text-xs', actualTheme === 'dark' ? 'text-slate-500' : 'text-slate-400')}>
                        Loading…
                      </span>
                    </div>
                  ) : agents.length === 0 ? (
                    <span className={cn('text-xs', actualTheme === 'dark' ? 'text-slate-500' : 'text-slate-400')}>
                      No agents configured
                    </span>
                  ) : (
                    agents.map((agent) => (
                      <div key={agent.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={cn('h-3 w-3 rounded-full', getStatusColor(agent.status))} />
                          <span className={cn(
                            'text-sm font-medium',
                            actualTheme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                          )}>{agent.name}</span>
                        </div>
                        {agent.taskCount > 0 && (
                          <span className={cn(
                            'text-xs px-2 py-1 rounded-full',
                            actualTheme === 'dark' 
                              ? 'bg-slate-700 text-slate-300' 
                              : 'bg-slate-200 text-slate-700'
                          )}>
                            {agent.taskCount}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
