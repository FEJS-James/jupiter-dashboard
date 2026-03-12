'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ActivityFeed } from '@/components/activity/activity-feed'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, Download, Settings, TrendingUp, Clock, Users, AlertCircle, FolderOpen } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { useWebSocket } from '@/contexts/websocket-context'

interface ActivityStats {
  totalActivities: number
  activitiesLast24Hours: number
  mostActiveProject: string
  mostActiveAgent: string
  topActivityTypes: Array<{
    type: string
    count: number
    percentage: number
  }>
}

export default function ActivityPage() {
  const [stats, setStats] = useState<ActivityStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { connectionStatus } = useWebSocket()

  // Fetch activity statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/activity/stats')
        
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setStats(data.data)
          } else {
            setError(data.error || 'Failed to load activity statistics')
          }
        } else {
          setError('Failed to load activity statistics')
        }
      } catch (err) {
        console.error('Error fetching activity stats:', err)
        setError('Failed to load activity statistics')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const handleExportActivities = async () => {
    try {
      const response = await fetch('/api/activity/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format: 'csv',
          dateRange: {
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
            end: new Date().toISOString()
          }
        })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `activity-export-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      } else {
        console.error('Export failed:', response.statusText)
        // TODO: Show toast notification
      }
    } catch (error) {
      console.error('Export error:', error)
      // TODO: Show toast notification
    }
  }

  return (
    <main className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <motion.div 
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Activity className="w-8 h-8" />
            Activity Feed
            {connectionStatus === 'connected' && (
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="ml-1 text-sm text-green-400">Live</span>
              </div>
            )}
          </h1>
          <p className="text-lg text-slate-400 mt-1">
            Monitor real-time activity across all projects and tasks
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleExportActivities}
            className="border-slate-600 text-slate-200 hover:bg-slate-800"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          
          <Link href="/settings/activity">
            <Button 
              variant="outline" 
              className="border-slate-600 text-slate-200 hover:bg-slate-800"
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Activity Statistics Cards */}
      <motion.section
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        {loading ? (
          // Loading skeletons
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50 animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="h-4 bg-slate-700 rounded w-24 mb-2"></div>
                    <div className="h-8 bg-slate-700 rounded w-16"></div>
                  </div>
                  <div className="h-12 w-12 bg-slate-700 rounded-lg"></div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : error ? (
          <Card className="col-span-full bg-red-900/20 border-red-500/20">
            <CardContent className="p-6 text-center">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-400" />
              <p className="text-red-200">{error}</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-400">Total Activities</p>
                    <p className="text-2xl font-bold text-white">
                      {stats?.totalActivities.toLocaleString() || '0'}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Activity className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-400">Last 24 Hours</p>
                    <p className="text-2xl font-bold text-white">
                      {stats?.activitiesLast24Hours.toLocaleString() || '0'}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-400">Most Active Project</p>
                    <p className="text-lg font-bold text-white truncate">
                      {stats?.mostActiveProject || 'None'}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-purple-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-400">Most Active Agent</p>
                    <p className="text-lg font-bold text-white truncate">
                      {stats?.mostActiveAgent || 'None'}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                    <Users className="h-6 w-6 text-yellow-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </motion.section>

      {/* Activity Type Breakdown */}
      {stats?.topActivityTypes && stats.topActivityTypes.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white">Activity Breakdown</CardTitle>
              <CardDescription>Most common activity types in the last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.topActivityTypes.map((activityType, index) => (
                  <div key={activityType.type} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant="secondary"
                        className="text-xs px-2 py-1"
                      >
                        {activityType.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-slate-400">
                        {activityType.count} ({activityType.percentage.toFixed(1)}%)
                      </span>
                      <div className="w-20 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                          style={{ width: `${activityType.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.section>
      )}

      {/* Main Activity Feed */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <ActivityFeed
          maxItems={100}
          showFilters={true}
          compact={false}
          realTime={true}
          className="min-h-screen"
        />
      </motion.section>
    </main>
  )
}