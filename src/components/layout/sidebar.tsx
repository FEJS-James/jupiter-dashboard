'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  ChevronLeft,
  Home,
  Layers,
  Users,
  BarChart3,
  Settings,
  ChevronDown,
  FolderOpen,
  CheckSquare,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/contexts/theme-context'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSidebarData } from '@/hooks/use-sidebar-data'
import { useProjectContext } from '@/contexts/project-context'
import { AnimatePresence } from 'framer-motion'

interface SidebarProps {
  className?: string
  onCollapseChange?: (collapsed: boolean) => void
}

export function Sidebar({ className, onCollapseChange }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const { actualTheme } = useTheme()
  const pathname = usePathname()
  const router = useRouter()
  const { projects, agents, loading } = useSidebarData()
  const { selectedProjectId, setSelectedProjectId } = useProjectContext()

  // Explicit navigation handler — bypasses Next.js <Link> internal click handling
  // to work around silent client-side navigation failures (React 19 startTransition
  // can swallow errors, and Framer Motion wrappers can interfere with event delegation).
  //
  // On pages with @hello-pangea/dnd (e.g. Tasks), the DnD library's global event
  // listeners and Redux store (via useSyncExternalStore) can interfere with React's
  // concurrent transitions, causing router.push() to silently fail.  We add a
  // native-navigation fallback to guarantee sidebar links always work.
  const handleNavClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    // Preserve modifier-key behaviour (open in new tab, etc.)
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return

    e.preventDefault()

    // Try client-side navigation first (fast, no full reload)
    router.push(href)

    // Fallback: if the pathname hasn't changed after 150 ms, force a full
    // navigation.  This catches cases where startTransition silently drops the
    // navigation (e.g. DnD or WebSocket re-renders pre-empting the transition).
    const before = window.location.pathname
    setTimeout(() => {
      if (window.location.pathname === before && before !== href) {
        window.location.href = href
      }
    }, 150)
  }, [router])

  // Prevent DnD library global event listeners (capture-phase on window) from
  // seeing pointer / mouse events that originate inside the sidebar.  This is a
  // defensive measure: even though the library *should* ignore events outside
  // draggable elements, stopping propagation here ensures the sidebar is fully
  // isolated from any drag-and-drop event processing.
  const stopDndInterference = useCallback((e: React.SyntheticEvent) => {
    e.stopPropagation()
  }, [])

  const toggleCollapse = () => {
    const newCollapsedState = !isCollapsed
    setIsCollapsed(newCollapsedState)
    onCollapseChange?.(newCollapsedState)
  }

  // Derive selected project name — null means "All Projects"
  const selectedProject = selectedProjectId !== null
    ? (projects.find(p => p.id === selectedProjectId) ?? null)
    : null

  // Click-outside handler for project dropdown
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showProjectDropdown) return
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowProjectDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showProjectDropdown])

  const navigationItems = [
    { icon: Home, label: 'Dashboard', href: '/' },
    { icon: CheckSquare, label: 'Tasks', href: '/tasks' },
    { icon: Layers, label: 'Projects', href: '/projects' },
    { icon: Users, label: 'Agents', href: '/agents' },
    { icon: BarChart3, label: 'Analytics', href: '/analytics' },
    { icon: Settings, label: 'Preferences', href: '/preferences' },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500'
      case 'busy': return 'bg-yellow-500'
      case 'offline': return 'bg-gray-500'
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
      onPointerDown={stopDndInterference}
      onMouseDown={stopDndInterference}
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
            <div className="relative" ref={dropdownRef}>
              {loading ? (
                <div className={cn(
                  'flex items-center space-x-3 p-3 rounded-lg',
                  actualTheme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-100/50'
                )}>
                  <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
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
                  <FolderOpen className="h-4 w-4 text-slate-400" />
                  <span className={cn(
                    'text-sm',
                    actualTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                  )}>No projects yet</span>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                    className={cn(
                      'w-full flex items-center justify-between p-3 rounded-lg transition-colors group',
                      actualTheme === 'dark'
                        ? 'bg-slate-800/50 hover:bg-slate-800/70'
                        : 'bg-slate-100/50 hover:bg-slate-100/70'
                    )}
                  >
                    <div className="flex items-center space-x-3">
                      <FolderOpen className="h-4 w-4 text-blue-400" />
                      <span className={cn(
                        'text-sm font-medium truncate',
                        actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
                      )}>
                        {selectedProject?.name ?? 'All Projects'}
                      </span>
                    </div>
                    <ChevronDown className={cn(
                      'h-4 w-4 transition-transform',
                      actualTheme === 'dark' 
                        ? 'text-slate-400 group-hover:text-slate-300' 
                        : 'text-slate-600 group-hover:text-slate-700',
                      showProjectDropdown && 'rotate-180'
                    )} />
                  </button>

                  {/* Project Dropdown List */}
                  <AnimatePresence>
                    {showProjectDropdown && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 space-y-1 overflow-hidden"
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
                            setShowProjectDropdown(false)
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
                              setShowProjectDropdown(false)
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
          </motion.div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navigationItems.map((item) => {
            const isActive = item.href === '/' 
              ? pathname === '/' 
              : pathname.startsWith(item.href)
            
            return (
              <div key={item.label}>
                <Link
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item.href)}
                  className={cn(
                    'w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                    isActive
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
                </Link>
              </div>
            )
          })}
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
                    <div className="flex items-center space-x-2">
                      <div className={cn('h-2 w-2 rounded-full', getStatusColor(agent.status))} />
                      <span className={cn(
                        'text-sm',
                        actualTheme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                      )}>{agent.name}</span>
                    </div>
                    {agent.taskCount > 0 && (
                      <span className={cn(
                        'text-xs px-1.5 py-0.5 rounded',
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
          ) : (
            <div className="space-y-2">
              {loading ? (
                <div className="flex justify-center">
                  <Loader2 className={cn('h-3 w-3 animate-spin', actualTheme === 'dark' ? 'text-slate-500' : 'text-slate-400')} />
                </div>
              ) : (
                agents.map((agent) => (
                  <div key={agent.id} className="flex justify-center">
                    <div className={cn('h-2 w-2 rounded-full', getStatusColor(agent.status))} />
                  </div>
                ))
              )}
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  )
}
