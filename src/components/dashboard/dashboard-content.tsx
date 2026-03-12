'use client'

import { motion } from 'framer-motion'

export function DashboardContent() {
  return (
    <div className="p-6 space-y-8">
      {/* Welcome Header */}
      <motion.div 
        className="space-y-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold text-white">
          Welcome to AgentFlow
        </h1>
        <p className="text-lg text-slate-400">
          Your autonomous development pipeline is ready for action.
        </p>
      </motion.div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: 'Active Projects', value: '4', color: 'blue' },
          { title: 'Running Agents', value: '3', color: 'green' },
          { title: 'Tasks Complete', value: '24', color: 'purple' },
          { title: 'System Uptime', value: '99.9%', color: 'yellow' },
        ].map((card, index) => (
          <motion.div
            key={card.title}
            className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">{card.title}</p>
                <p className="text-2xl font-bold text-white">{card.value}</p>
              </div>
              <div className={`h-12 w-12 rounded-lg bg-${card.color}-500/20 flex items-center justify-center`}>
                <div className={`h-6 w-6 rounded bg-${card.color}-500`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recent Activity */}
      <motion.div 
        className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <h2 className="text-xl font-semibold text-white mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {[
            { action: 'Task completed', project: 'AgentFlow Pipeline', time: '2 minutes ago', status: 'success' },
            { action: 'Code review started', project: 'Web Scraper Pro', time: '5 minutes ago', status: 'pending' },
            { action: 'Deployment successful', project: 'ChatBot Assistant', time: '1 hour ago', status: 'success' },
            { action: 'Build failed', project: 'Data Analytics Suite', time: '2 hours ago', status: 'error' },
          ].map((activity, index) => (
            <motion.div 
              key={index} 
              className="flex items-center justify-between py-3 border-b border-slate-700/50 last:border-b-0"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.6 + index * 0.1 }}
            >
              <div className="flex items-center space-x-3">
                <div className={`h-2 w-2 rounded-full ${
                  activity.status === 'success' ? 'bg-green-500' :
                  activity.status === 'pending' ? 'bg-yellow-500' :
                  'bg-red-500'
                }`} />
                <div>
                  <p className="text-sm font-medium text-white">{activity.action}</p>
                  <p className="text-xs text-slate-400">{activity.project}</p>
                </div>
              </div>
              <span className="text-xs text-slate-500">{activity.time}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}