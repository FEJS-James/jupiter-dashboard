'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Archive, ArchiveRestore, ChevronDown, ChevronUp, Search, X } from 'lucide-react'
import { Task } from '@/types'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ArchivedTaskItem {
  id: number
  projectId: number
  title: string
  description: string | null
  status: string
  priority: string
  assignedAgent: string | null
  tags: string[] | null
  dueDate: unknown
  effort: number | null
  dependencies: number[] | null
  createdAt: unknown
  updatedAt: unknown
  project: { id: number; name: string; status: string } | null
  agent: { id: number; name: string; role: string; color: string; status: string } | null
}

interface ArchiveViewProps {
  onTasksChanged?: () => void
}

const priorityColors: Record<string, string> = {
  low: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  medium: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  urgent: 'bg-red-500/20 text-red-400 border-red-500/30',
}

export function ArchiveView({ onTasksChanged }: ArchiveViewProps) {
  const [expanded, setExpanded] = useState(false)
  const [archivedTasks, setArchivedTasks] = useState<ArchivedTaskItem[]>([])
  const [totalArchived, setTotalArchived] = useState(0)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [unarchivingIds, setUnarchivingIds] = useState<Set<number>>(new Set())

  const fetchArchivedTasks = useCallback(async (searchQuery?: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set('search', searchQuery)
      params.set('limit', '50')

      params.set('status', 'archived')
      const res = await fetch(`/api/tasks?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch archived tasks')

      const data = await res.json()
      if (data.success) {
        setArchivedTasks(Array.isArray(data.data?.tasks) ? data.data.tasks : [])
        setTotalArchived(data.data?.total ?? 0)
      }
    } catch (error) {
      console.error('Failed to fetch archived tasks:', error)
      toast.error('Failed to load archived tasks')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch count on mount (for badge), full data when expanded
  useEffect(() => {
    // Always fetch to get the count
    fetchArchivedTasks()
  }, [fetchArchivedTasks])

  useEffect(() => {
    if (expanded) {
      fetchArchivedTasks(search || undefined)
    }
  }, [expanded, fetchArchivedTasks, search])

  const handleUnarchive = async (taskId: number) => {
    setUnarchivingIds(prev => new Set(prev).add(taskId))
    try {
      const res = await fetch(`/api/tasks/${taskId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'done' }),
      })

      if (!res.ok) throw new Error('Failed to unarchive task')

      // Remove from local state
      setArchivedTasks(prev => prev.filter(t => t.id !== taskId))
      setTotalArchived(prev => Math.max(0, prev - 1))
      toast.success('Task restored to Done')
      onTasksChanged?.()
    } catch (error) {
      console.error('Failed to unarchive task:', error)
      toast.error('Failed to unarchive task')
    } finally {
      setUnarchivingIds(prev => {
        const next = new Set(prev)
        next.delete(taskId)
        return next
      })
    }
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
  }

  const clearSearch = () => {
    setSearch('')
  }

  return (
    <Card className="bg-slate-800/30 border-slate-700">
      {/* Collapsed header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700/20 transition-colors rounded-lg"
        aria-expanded={expanded}
        aria-controls="archive-panel"
      >
        <div className="flex items-center gap-2.5">
          <Archive className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-400">Archived Tasks</span>
          {totalArchived > 0 && (
            <Badge
              variant="secondary"
              className="bg-slate-700/50 text-slate-400 border-slate-600 text-xs"
            >
              {totalArchived}
            </Badge>
          )}
        </div>
        <div className="text-slate-500">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            id="archive-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-slate-700/50"
          >
            <CardContent className="p-4 space-y-4">
              {/* Search bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search archived tasks..."
                  className="pl-9 pr-9 bg-slate-900/50 border-slate-700 text-slate-200 placeholder:text-slate-500 h-9 text-sm"
                />
                {search && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Task list */}
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full bg-slate-800/50" />
                  ))}
                </div>
              ) : archivedTasks.length === 0 ? (
                <div className="text-center py-6 text-slate-500">
                  <Archive className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    {search ? 'No archived tasks match your search' : 'No archived tasks'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {archivedTasks.map((task) => (
                    <div
                      key={task.id}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-lg',
                        'bg-slate-900/40 border border-slate-800/50',
                        'hover:bg-slate-900/60 transition-colors'
                      )}
                    >
                      <div className="flex-1 min-w-0 mr-3">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-medium text-slate-300 truncate">
                            {task.title}
                          </h4>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-xs px-1.5 py-0 shrink-0',
                              priorityColors[task.priority] || priorityColors.medium
                            )}
                          >
                            {task.priority}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          {task.project && (
                            <span>{task.project.name}</span>
                          )}
                          {task.assignedAgent && (
                            <>
                              <span>·</span>
                              <span>{task.assignedAgent}</span>
                            </>
                          )}
                          {Array.isArray(task.tags) && task.tags.length > 0 && (
                            <>
                              <span>·</span>
                              <span>{task.tags.slice(0, 2).join(', ')}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnarchive(task.id)}
                        disabled={unarchivingIds.has(task.id)}
                        className="text-slate-400 hover:text-slate-200 hover:bg-slate-800 shrink-0 h-8 px-2"
                        title="Restore to Done"
                      >
                        <ArchiveRestore className="w-4 h-4 mr-1" />
                        <span className="text-xs">Unarchive</span>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}
